/**
 * Importar o curso de abertura pela tela — especificação §13.3.8 e §21 (decisões do Doug, 16/9/2026).
 *
 * O planejador (`planejar-curso.ts`) é puro; aqui fica o que toca o disco:
 *
 * 1. **o diff** de cada aula planejada contra o rascunho que já existe em `.editor/v2/`;
 * 2. **gravar as aulas**, com cópia de segurança de cada rascunho que vai ser substituído
 *    (decisão 2: "reimportar substitui, com cópia de segurança e diff antes");
 * 3. **o PGN do repertório**: o impacto (ids que morrem e nascem) e a aplicação pelo mesmo
 *    caminho transacional do editor do repertório, com o export cru do estudo guardado como
 *    rascunho da fonte (decisão 11).
 *
 * Nada aqui publica: publicar continua sendo, aula por aula, o Conferir e o Publicar do editor.
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { escreverAtomico, serializar } from "../editor/rascunhos.ts";
import { aplicarRepertorio, prepararAplicacao, type PreparoDaAplicacao, type ResultadoDaAplicacao } from "../repertorio/editor/aplicar.ts";
import { aulaV2Schema, type AulaV2 } from "./modelo.ts";
import type { CursoPlanejado } from "./planejar-curso.ts";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";

export type SituacaoDaAula = "nova" | "igual" | "muda";

export type DiffDaAula = {
  id: string;
  titulo: string;
  situacao: SituacaoDaAula;
  antes: { etapas: number; capitulos: number; treinos: number } | null;
  depois: { etapas: number; capitulos: number; treinos: number };
};

const contagem = (aula: AulaV2) => ({ etapas: aula.fluxo.length, capitulos: aula.capitulos.length, treinos: aula.treinos.length });

/** Cada aula planejada contra o rascunho em disco. Rascunho ilegível conta como "muda". */
export function diffDoCurso(curso: CursoPlanejado, raiz = process.cwd()): DiffDaAula[] {
  return curso.aulas.map(({ aula }) => {
    let existente: AulaV2 | null = null;
    let ilegivel = false;
    try {
      existente = lerDocumentoV2(aula.id, raiz)?.aula ?? null;
    } catch {
      ilegivel = true;
    }
    const situacao: SituacaoDaAula = !existente && !ilegivel ? "nova"
      // Pelo schema dos dois lados: o rascunho relido do disco volta com as chaves na ordem do schema.
      : existente && serializar(aulaV2Schema.parse(existente)) === serializar(aulaV2Schema.parse(aula)) ? "igual"
        : "muda";
    return { id: aula.id, titulo: aula.titulo, situacao, antes: existente ? contagem(existente) : null, depois: contagem(aula) };
  });
}

/**
 * A cópia durável do rascunho que a reimportação vai substituir — a mesma pasta e o mesmo teto de
 * 20 cópias de `guardarSnapshotAntesDeRefazerV2`.
 */
export function guardarSnapshotAntesDeReimportarV2(aula: AulaV2, raiz = process.cwd()): string {
  const pasta = path.join(raiz, ".editor", "v2", "snapshots", aula.id);
  mkdirSync(pasta, { recursive: true });
  const destino = path.join(pasta, `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`);
  escreverAtomico(destino, serializar({ tipo: "antes-de-reimportar-curso", criadoEm: new Date().toISOString(), aula }));
  const arquivos = readdirSync(pasta).filter((item) => item.endsWith(".json")).sort();
  for (const antigo of arquivos.slice(0, Math.max(0, arquivos.length - 20))) rmSync(path.join(pasta, antigo), { force: true });
  return destino;
}

export type GravacaoDoCurso = Array<{ id: string; situacao: SituacaoDaAula; ok: boolean; erro?: string; copia?: string }>;

/** Grava as aulas planejadas. Aula igual não é regravada; aula que muda ganha cópia antes. */
export function gravarAulasDoCurso(curso: CursoPlanejado, raiz = process.cwd(), env: NodeJS.ProcessEnv = process.env): GravacaoDoCurso {
  const diff = new Map(diffDoCurso(curso, raiz).map((item) => [item.id, item]));
  return curso.aulas.map(({ aula }) => {
    const situacao = diff.get(aula.id)!.situacao;
    if (situacao === "igual") return { id: aula.id, situacao, ok: true };
    let baseHash: string | null = null;
    let copia: string | undefined;
    if (situacao === "muda") {
      let existente;
      try {
        existente = lerDocumentoV2(aula.id, raiz);
      } catch {
        return { id: aula.id, situacao, ok: false, erro: "o rascunho atual está ilegível — ele não foi substituído; abra a aula no editor para ver o defeito" };
      }
      if (existente) {
        copia = guardarSnapshotAntesDeReimportarV2(existente.aula, raiz);
        baseHash = existente.hash;
      }
    }
    const gravado = gravarDocumentoV2(aula.id, aula, baseHash, raiz, env);
    return gravado.ok
      ? { id: aula.id, situacao, ok: true, ...(copia ? { copia } : {}) }
      : { id: aula.id, situacao, ok: false, erro: [gravado.erro, ...(gravado.problemas ?? [])].join("; ") };
  });
}

/** O nome do arquivo do repertório e do rascunho da fonte, pela cor e abertura do curso. */
export const arquivoDoRepertorio = (curso: CursoPlanejado, abertura: string) => `${curso.leitura.cor}-${abertura}`;
export const caminhoDoEstudoCru = (raiz: string, curso: CursoPlanejado, abertura: string) =>
  path.join(raiz, "content", "repertorio", "rascunhos", `estudo-${arquivoDoRepertorio(curso, abertura)}.pgn`);

/** O que aplicar o PGN gerado faria: compila com as outras dez aberturas e mede o impacto. */
export function prepararRepertorioDoCurso(curso: CursoPlanejado, abertura: string, raiz = process.cwd()): PreparoDaAplicacao {
  return prepararAplicacao(arquivoDoRepertorio(curso, abertura), curso.pgn.texto, raiz);
}

/**
 * Aplica o PGN gerado (fonte + compilado, numa transação) e guarda o export cru do estudo como
 * rascunho da fonte — é contra ele que `marcas-das-fontes` confere os símbolos. O rascunho só é
 * escrito depois de a aplicação dar certo: sem o PGN novo, ele reprovaria a trava contra o antigo.
 */
export function aplicarRepertorioDoCurso(
  curso: CursoPlanejado,
  textoDoEstudo: string,
  abertura: string,
  impactoHash: string,
  raiz = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): ResultadoDaAplicacao {
  const resultado = aplicarRepertorio(arquivoDoRepertorio(curso, abertura), curso.pgn.texto, { raiz, env, impactoHash });
  if (!resultado.ok) return resultado;
  const destino = caminhoDoEstudoCru(raiz, curso, abertura);
  if (!existsSync(path.dirname(destino))) mkdirSync(path.dirname(destino), { recursive: true });
  escreverAtomico(destino, textoDoEstudo.endsWith("\n") ? textoDoEstudo : `${textoDoEstudo}\n`);
  return resultado;
}
