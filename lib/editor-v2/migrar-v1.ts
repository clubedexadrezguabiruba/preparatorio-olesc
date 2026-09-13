/**
 * A conversão explícita de uma aula v1 — plano final §14, especificação §20.3.
 *
 * ## O que "converter" quer dizer aqui
 *
 * Até a conversão, o Editor v2 lê a aula v1 por um adaptador **somente leitura**: os ids são
 * derivados do arquivo e o documento é uma tradução. Converter é o professor dizer, depois de
 * ver o diff, "a partir daqui a aula é esta" — os ids passam a ser os permanentes e o documento
 * v2 é a fonte do que será publicado.
 *
 * Três garantias, e cada uma tem prova:
 *
 * 1. **o arquivo v1 não muda um byte** — a conversão escreve em `.editor/`, nunca em
 *    `content/lessons/` (o SHA-256 é conferido antes e depois);
 * 2. **o diff é pedagógico**, pela mesma comparação que a 7A zerou (`equivalencia-v1.ts`);
 * 3. **dá para voltar**: um snapshot `antes-de-migrar` guarda o arquivo v1 inteiro e o
 *    documento anterior, e na sessão o Desfazer desmarca a conversão.
 */
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { caminhoDeAula, escreverAtomico, hashDoTexto, serializar } from "../editor/rascunhos.ts";
import type { Lesson, Position } from "../lesson/schema.ts";
import { divergenciasDaMigracaoV1, type DivergenciaV1 } from "./equivalencia-v1.ts";
import { aulaIdV2Schema, type AulaV2 } from "./modelo.ts";

export type PreparoDaMigracaoV1 = {
  /** SHA-256 dos bytes do arquivo v1, para conferir depois que ele não mudou. */
  hashV1: string;
  divergencias: DivergenciaV1[];
  /** Quantos ids o documento materializa — são eles que ficam permanentes. */
  ids: { analises: number; nos: number; capitulos: number; narracoes: number; treinos: number; questoes: number; praticas: number; etapas: number };
  jaConvertida: boolean;
  podeConverter: boolean;
  motivo: string | null;
};

export function prepararMigracaoV1(lesson: Lesson, textoV1: string, positions: Record<string, Position>, aula: AulaV2): PreparoDaMigracaoV1 {
  const jaConvertida = Boolean(aula.origem?.convertidaEm);
  const deV1 = aula.origem?.formato === "lesson-v1";
  let divergencias: DivergenciaV1[] = [];
  let motivo: string | null = null;
  try {
    divergencias = divergenciasDaMigracaoV1(lesson, positions, aula);
  } catch (erro) {
    motivo = `não foi possível comparar com a aula antiga: ${(erro as Error).message}`;
  }
  if (!deV1) motivo = "esta aula não veio do formato antigo";
  else if (jaConvertida) motivo = "esta aula já foi convertida";
  return {
    hashV1: hashDoTexto(textoV1),
    divergencias,
    ids: {
      analises: aula.analises.length,
      nos: aula.analises.reduce((soma, analise) => soma + Object.keys(analise.nos).length, 0),
      capitulos: aula.capitulos.length,
      narracoes: aula.capitulos.reduce((soma, capitulo) => soma + capitulo.narracoes.length, 0),
      treinos: aula.treinos.length,
      questoes: aula.treinos.reduce((soma, treino) => soma + treino.questoes.length, 0),
      praticas: aula.praticas.length,
      etapas: aula.fluxo.length,
    },
    jaConvertida,
    podeConverter: motivo === null,
    motivo,
  };
}

/**
 * O snapshot `antes-de-migrar`: o arquivo v1 **em texto**, byte a byte, e o documento v2 como
 * estava. Retenção de 20 por aula, como os outros snapshots. Não escreve o documento: a
 * conversão entra pela tela como comando, e é o autosave que a grava — assim ela cabe no
 * Desfazer da sessão.
 */
export function guardarSnapshotAntesDeMigrarV1(id: string, textoV1: string, aula: AulaV2, raiz = process.cwd(), agora = new Date()): { ok: true; arquivo: string } | { ok: false; erro: string } {
  caminhoDeAula(id, path.join(".editor", "v2"), raiz, aulaIdV2Schema);
  const pasta = path.join(raiz, ".editor", "v2", "snapshots", id);
  try {
    mkdirSync(pasta, { recursive: true });
    const arquivo = path.join(pasta, `${agora.toISOString().replaceAll(":", "-")}-antes-de-migrar-${randomUUID()}.json`);
    escreverAtomico(arquivo, serializar({ tipo: "antes-de-migrar", criadoEm: agora.toISOString(), hashV1: hashDoTexto(textoV1), textoV1, aula }));
    const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith(".json")).sort();
    for (const antigo of arquivos.slice(0, Math.max(0, arquivos.length - 20))) rmSync(path.join(pasta, antigo), { force: true });
    return { ok: true, arquivo };
  } catch {
    return { ok: false, erro: "não foi possível guardar a cópia anterior; a aula não foi convertida" };
  }
}
