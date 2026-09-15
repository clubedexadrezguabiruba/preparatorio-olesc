/**
 * Excluir uma aula, com lixeira — pedido do Doug no teste humano de 14/9/2026 ("não gostei da aula,
 * não tem opção deletar?"). A especificação não previa; ficou decidido assim:
 *
 * - **Nada some de verdade.** O rascunho, o registro da conferência e as posições que só esta aula
 *   usava vão para `.editor/v2/lixeira/<AULA>--<carimbo>/`, com um `manifesto.json` que diz de onde
 *   cada arquivo saiu. **Restaurar** devolve cada um ao lugar, byte a byte.
 * - **Só aula extra (`EX-`).** Aula do curso (série N) não se exclui pela tela: são as 49 do curso e o
 *   rascunho da N1-KPK, que é trabalho do Doug fora do Git — apagar por engano não teria volta.
 * - **Posição do acervo** sai junto só se estiver em `content/positions/EX/` e nenhuma outra aula a
 *   usar (outro rascunho, aula v1 ou pacote publicado). Aula que já foi publicada guarda as posições:
 *   as publicações antigas continuam guardadas, e o rejulgamento de tentativas antigas pode precisar.
 * - **Aula publicada** é desativada (o aluno deixa de recebê-la); as publicações ficam guardadas em
 *   `content/aulas-v2/`. Restaurar devolve o rascunho, e reativar é passo à parte, em Mais opções.
 *
 * No servidor: lê e move arquivos.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { aulaIdV2Schema } from "./modelo.ts";
import { idsDePosicoesDaAulaV2 } from "./pacote.ts";
import { desativarV2 } from "./publicar.ts";
import { caminhoDoPonteiroV2 } from "./publicacoes.ts";
import { idsDeDocumentosV2, lerDocumentoV2 } from "./rascunhos.ts";

const PASTA_LIXEIRA = path.join(".editor", "v2", "lixeira");
const NOME_NA_LIXEIRA = /^EX-[A-Z0-9-]+--\d{8}T\d{6}Z$/;

export type ImpactoDaExclusaoV2 = {
  id: string;
  titulo: string;
  capitulos: number;
  treinos: number;
  praticas: number;
  quadros: number;
  /** A aula tem publicação ativa: o aluno deixa de recebê-la. */
  publicada: boolean;
  /** Posições do acervo que vão junto para a lixeira. */
  posicoesQueSaem: string[];
  /** Posições que ficam, e quem mais as usa (ou por que ficam). */
  posicoesQueFicam: Array<{ id: string; motivo: string }>;
};

export type ItemDaLixeiraV2 = { nome: string; id: string; titulo: string; excluidaEm: string; desativouPublicacao: boolean; arquivos: number };

type Manifesto = {
  id: string;
  titulo: string;
  excluidaEm: string;
  desativouPublicacao: boolean;
  /** Caminhos relativos à raiz do projeto: `de` é o lugar original, `para` o nome dentro da lixeira. */
  arquivos: Array<{ de: string; para: string }>;
};

const relativo = (raiz: string, absoluto: string) => path.relative(raiz, absoluto).split(path.sep).join("/");

function recusarId(id: string): string | null {
  if (!aulaIdV2Schema.safeParse(id).success) return "identificador de aula inválido";
  if (!id.startsWith("EX-")) return "aulas do curso (série N) não se excluem pela tela — só aulas extras";
  return null;
}

/** Todos os arquivos `.json` debaixo de uma pasta, se ela existir. */
function jsonsDebaixo(pasta: string): string[] {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const absoluto = path.join(pasta, nome);
    return statSync(absoluto).isDirectory() ? jsonsDebaixo(absoluto) : nome.endsWith(".json") ? [absoluto] : [];
  });
}

/** Quem mais usa a posição: outro rascunho v2, uma aula v1 ou um pacote publicado de outra aula. */
function outrosUsos(positionId: string, id: string, raiz: string): string | null {
  for (const outro of idsDeDocumentosV2(raiz)) {
    if (outro === id) continue;
    try {
      const documento = lerDocumentoV2(outro, raiz);
      if (documento && idsDePosicoesDaAulaV2(documento.aula).includes(positionId)) return `usada também pela aula ${outro}`;
    } catch { /* rascunho quebrado: não decide nada aqui */ }
  }
  const aspas = `"${positionId}"`;
  for (const arquivo of jsonsDebaixo(path.join(raiz, "content", "lessons"))) {
    if (readFileSync(arquivo, "utf8").includes(aspas)) return `usada também pela aula ${path.basename(arquivo, ".json")}`;
  }
  const publicadas = path.join(raiz, "content", "aulas-v2");
  if (existsSync(publicadas)) {
    for (const aula of readdirSync(publicadas)) {
      if (aula === id) continue;
      if (jsonsDebaixo(path.join(publicadas, aula)).some((arquivo) => readFileSync(arquivo, "utf8").includes(aspas))) return `usada também pela aula publicada ${aula}`;
    }
  }
  return null;
}

export function impactoDaExclusaoV2(id: string, raiz = process.cwd()): { ok: true; impacto: ImpactoDaExclusaoV2 } | { ok: false; motivo: string } {
  const recusa = recusarId(id);
  if (recusa) return { ok: false, motivo: recusa };
  const documento = lerDocumentoV2(id, raiz);
  if (!documento) return { ok: false, motivo: "esta aula não tem rascunho no editor" };
  const { aula } = documento;
  const publicada = existsSync(caminhoDoPonteiroV2(path.join(raiz, "content"), id));
  const jaPublicada = publicada || existsSync(path.join(raiz, "content", "aulas-v2", id));

  const posicoesQueSaem: string[] = [];
  const posicoesQueFicam: ImpactoDaExclusaoV2["posicoesQueFicam"] = [];
  for (const positionId of idsDePosicoesDaAulaV2(aula)) {
    if (!existsSync(path.join(raiz, "content", "positions", "EX", `${positionId}.json`))) continue; // acervo do curso: nunca sai
    const uso = outrosUsos(positionId, id, raiz);
    if (uso) posicoesQueFicam.push({ id: positionId, motivo: uso });
    else if (jaPublicada) posicoesQueFicam.push({ id: positionId, motivo: "a aula já foi publicada, e as publicações guardadas dependem dela" });
    else posicoesQueSaem.push(positionId);
  }

  return {
    ok: true,
    impacto: {
      id,
      titulo: aula.titulo,
      capitulos: aula.capitulos.length,
      treinos: aula.treinos.length,
      praticas: aula.praticas.length,
      quadros: aula.introducoes.reduce((soma, introducao) => soma + introducao.quadros.length, 0),
      publicada,
      posicoesQueSaem,
      posicoesQueFicam,
    },
  };
}

/** O carimbo da exclusão, que também separa duas exclusões da mesma aula na lixeira. */
function carimbo(agora: Date): string {
  return agora.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function excluirAulaV2(
  id: string,
  opcoes: { raiz?: string; env?: NodeJS.ProcessEnv; agora?: Date } = {},
): { ok: true; nome: string; impacto: ImpactoDaExclusaoV2 } | { ok: false; motivo: string } {
  const { raiz = process.cwd(), env = process.env, agora = new Date() } = opcoes;
  const lido = impactoDaExclusaoV2(id, raiz);
  if (!lido.ok) return lido;
  const { impacto } = lido;

  if (impacto.publicada) {
    const desativada = desativarV2(id, { raiz, env });
    if (!desativada.ok) return { ok: false, motivo: `a aula não foi desativada, e nada foi excluído: ${desativada.motivo}` };
  }

  const nome = `${id}--${carimbo(agora)}`;
  const pasta = path.join(raiz, PASTA_LIXEIRA, nome);
  if (existsSync(pasta)) return { ok: false, motivo: "já existe um item da lixeira com este carimbo — tente de novo" };
  mkdirSync(pasta, { recursive: true });

  const candidatos = [
    { de: path.join(raiz, ".editor", "v2", `${id}.json`), para: "aula.json" },
    { de: path.join(raiz, ".editor", "gate", "v2", `${id}.json`), para: "conferencia.json" },
    ...impacto.posicoesQueSaem.map((positionId) => ({ de: path.join(raiz, "content", "positions", "EX", `${positionId}.json`), para: `posicao-${positionId}.json` })),
  ];
  const arquivos: Manifesto["arquivos"] = [];
  // O manifesto é escrito antes de mover: se o processo cair no meio, a lixeira já diz de onde veio o
  // que chegou, e o que não chegou continua no lugar original.
  const manifesto: Manifesto = { id, titulo: impacto.titulo, excluidaEm: agora.toISOString(), desativouPublicacao: impacto.publicada, arquivos };
  const gravarManifesto = () => writeFileSync(path.join(pasta, "manifesto.json"), `${JSON.stringify(manifesto, null, 2)}\n`);
  gravarManifesto();
  for (const { de, para } of candidatos) {
    if (!existsSync(de)) continue;
    renameSync(de, path.join(pasta, para));
    arquivos.push({ de: relativo(raiz, de), para });
    gravarManifesto();
  }
  return { ok: true, nome, impacto };
}

export function lixeiraV2(raiz = process.cwd()): ItemDaLixeiraV2[] {
  const base = path.join(raiz, PASTA_LIXEIRA);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((nome) => NOME_NA_LIXEIRA.test(nome))
    .flatMap((nome) => {
      try {
        const manifesto = JSON.parse(readFileSync(path.join(base, nome, "manifesto.json"), "utf8")) as Manifesto;
        return [{ nome, id: manifesto.id, titulo: manifesto.titulo, excluidaEm: manifesto.excluidaEm, desativouPublicacao: manifesto.desativouPublicacao, arquivos: manifesto.arquivos.length }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.excluidaEm.localeCompare(a.excluidaEm));
}

export function restaurarAulaV2(nome: string, raiz = process.cwd()): { ok: true; id: string; desativouPublicacao: boolean } | { ok: false; motivo: string } {
  if (!NOME_NA_LIXEIRA.test(nome)) return { ok: false, motivo: "item da lixeira inválido" };
  const pasta = path.join(raiz, PASTA_LIXEIRA, nome);
  let manifesto: Manifesto;
  try { manifesto = JSON.parse(readFileSync(path.join(pasta, "manifesto.json"), "utf8")) as Manifesto; } catch { return { ok: false, motivo: "este item da lixeira não tem manifesto legível" }; }
  const recusa = recusarId(manifesto.id);
  if (recusa) return { ok: false, motivo: recusa };

  // Os destinos só podem ser os lugares que a exclusão usa — um manifesto adulterado não escreve fora deles.
  const permitidos = [`.editor/v2/${manifesto.id}.json`, `.editor/gate/v2/${manifesto.id}.json`];
  for (const { de, para } of manifesto.arquivos) {
    const valido = permitidos.includes(de) || /^content\/positions\/EX\/pos-ex-[a-z0-9-]+\.json$/.test(de);
    if (!valido || para.includes("/") || para.includes("\\")) return { ok: false, motivo: `o manifesto aponta para um lugar que a lixeira não usa: ${de}` };
    if (existsSync(path.join(raiz, de))) {
      return { ok: false, motivo: de.startsWith(".editor/v2/") ? `já existe outra aula com o identificador ${manifesto.id} — exclua ou renomeie aquela antes de restaurar` : `o arquivo ${de} já existe de novo — nada foi restaurado` };
    }
  }
  for (const { de, para } of manifesto.arquivos) {
    const destino = path.join(raiz, de);
    mkdirSync(path.dirname(destino), { recursive: true });
    renameSync(path.join(pasta, para), destino);
  }
  rmSync(pasta, { recursive: true, force: true });
  return { ok: true, id: manifesto.id, desativouPublicacao: manifesto.desativouPublicacao };
}
