import path from "node:path";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { caminhoDeAula, conflito, escreverAtomico, hashDoTexto, lerConteudo, serializar } from "../editor/rascunhos.ts";
import { editorLigado } from "../editor/local.ts";
import { aulaIdV2Schema, aulaV2Schema, completarAulaV2Legada, formatarProblemaV2, validarAulaV2, type AulaV2, type ProblemaV2 } from "./modelo.ts";

const PASTA_V2 = path.join(".editor", "v2");

export type DocumentoV2 = { aula: AulaV2; texto: string; hash: string };

/**
 * As pendências editoriais que o rascunho **guarda** e a publicação cobra.
 *
 * "Erro impede publicar, não salvar" (`limites.ts`; plano §7: "o rascunho versionado exige
 * estrutura íntegra, mas pode conter pendências editoriais identificadas"). Até a fatia 7
 * o salvamento recusava qualquer erro — um teto estourado prendia o professor num arquivo
 * grande demais para ele conseguir encolher.
 *
 * A lista é do que **pode** passar, e não do que é barrado, de propósito: um código novo
 * nasce recusado ao salvar até alguém decidir que ele é pendência, e não o contrário.
 * Fica de fora tudo o que impede montar o documento — forma do schema, árvore quebrada,
 * referência a entidade que não existe.
 */
const PENDENCIAS_QUE_O_RASCUNHO_GUARDA = new Set([
  // tetos (§17)
  "LIMITE_NOS_ANALISE", "LIMITE_PROFUNDIDADE", "LIMITE_NOS_AULA", "LIMITE_BYTES", "LIMITE_COMENTARIOS", "LIMITE_DESENHOS",
  // legalidade (só com as posições em mãos)
  "LANCE_ILEGAL", "POSICAO_INEXISTENTE",
  // proveniência e certificação (§12)
  "POSICAO_SEM_PROVENIENCIA", "PRATICA_SEM_PROVENIENCIA", "CERTIFICACAO_SEM_PROVENIENCIA", "PROVENIENCIA_DUPLICADA",
  "CERTIFICACAO_SEM_APROVACAO",
  // receita de treino derivado com fonte ausente (§5: bloqueia a publicação até ser reparada)
  "FONTE_TREINO_AUSENTE",
]);

/** Os erros que impedem guardar ou reabrir o rascunho — os de forma. */
export function errosDeFormaV2(diagnosticos: ProblemaV2[]): ProblemaV2[] {
  return diagnosticos.filter((problema) => problema.severidade === "erro" && !PENDENCIAS_QUE_O_RASCUNHO_GUARDA.has(problema.codigo));
}

/** Valida para o rascunho: forma fechada, pendências editoriais aceitas. */
function validarRascunhoV2(cru: unknown): { ok: true; aula: AulaV2 } | { ok: false; problemas: string[] } {
  const validado = validarAulaV2(cru);
  if (validado.ok) return { ok: true, aula: validado.aula };
  const impedem = errosDeFormaV2(validado.diagnosticos);
  if (impedem.length) return { ok: false, problemas: impedem.map(formatarProblemaV2) };
  // Só pendências: a forma passou no schema (SCHEMA_V2 nunca é pendência).
  return { ok: true, aula: aulaV2Schema.parse(cru) };
}

/**
 * O arquivo desta aula na pasta do v2.
 *
 * O schema é o do v2, e não o das aulas do curso: desde "Nova aula" (§5.2) esta
 * pasta guarda também aulas extras, cujo id começa com `EX-`. As duas travas de
 * `caminhoDeAula` continuam valendo — regex sem barra nem ponto, e conferência
 * do caminho resolvido.
 */
function caminho(id: string, raiz = process.cwd()): string {
  return caminhoDeAula(id, PASTA_V2, raiz, aulaIdV2Schema);
}

function processoVivo(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/** O compare-and-swap inteiro acontece dentro deste lock, não só o rename final. */
function comExclusao<T>(id: string, raiz: string, executar: () => T): T | null {
  const destino = caminho(id, raiz);
  mkdirSync(path.dirname(destino), { recursive: true });
  const lock = `${destino}.lock`;
  const adquirir = (): number | null => {
    try { return openSync(lock, "wx"); } catch {
      try {
        const dono = JSON.parse(readFileSync(lock, "utf8")) as { pid?: number };
        if (typeof dono.pid === "number" && processoVivo(dono.pid)) return null;
      } catch { /* lock truncado ou ilegível é abandonado */ }
      rmSync(lock, { force: true });
      try { return openSync(lock, "wx"); } catch { return null; }
    }
  };
  const descritor = adquirir();
  if (descritor === null) return null;
  try {
    writeFileSync(descritor, serializar({ pid: process.pid, em: new Date().toISOString() }));
    return executar();
  } finally {
    closeSync(descritor);
    rmSync(lock, { force: true });
  }
}

export function lerDocumentoV2(id: string, raiz = process.cwd()): DocumentoV2 | null {
  const conteudo = lerConteudo(caminho(id, raiz));
  if (!conteudo) return null;
  let cru: unknown;
  try { cru = JSON.parse(conteudo.texto); } catch { throw new Error("o rascunho v2 contém JSON inválido"); }
  const validado = validarRascunhoV2(cru);
  if (!validado.ok) throw new Error(`o rascunho v2 é inválido: ${validado.problemas.join("; ")}`);
  return { aula: validado.aula, texto: conteudo.texto, hash: conteudo.hash };
}

export function documentoInicialV2(id: string, adaptado: AulaV2, raiz = process.cwd()): DocumentoV2 {
  const existente = lerDocumentoV2(id, raiz);
  if (existente) return { ...existente, aula: completarAulaV2Legada(existente.aula, adaptado) };
  const texto = serializar(adaptado);
  return { aula: adaptado, texto, hash: hashDoTexto(texto) };
}

export function gravarDocumentoV2(id: string, cru: unknown, baseHash: string | null, raiz = process.cwd(), env: NodeJS.ProcessEnv = process.env):
  | { ok: true; hash: string }
  | { ok: false; erro: string; conflito?: { textoAtual: string | null; hashAtual: string | null }; problemas?: string[] } {
  if (!editorLigado(env)) return { ok: false, erro: "o editor local está desligado" };
  const validado = validarRascunhoV2(cru);
  if (!validado.ok) return { ok: false, erro: "o documento v2 ainda não é válido", problemas: validado.problemas };
  if (validado.aula.id !== id) return { ok: false, erro: "o documento pertence a outra aula" };
  const resultado = comExclusao(id, raiz, () => {
    const destino = caminho(id, raiz);
    const atual = lerConteudo(destino);
    // No primeiro save, o hash é o documento adaptado ainda não materializado.
    const briga = atual ? conflito(atual, baseHash) : null;
    if (briga) return { ok: false as const, erro: "o documento mudou em outra aba", conflito: briga };
    const texto = serializar(validado.aula);
    escreverAtomico(destino, texto);
    return { ok: true as const, hash: hashDoTexto(texto) };
  });
  return resultado ?? { ok: false, erro: "outra gravação desta aula está em andamento" };
}

export function documentoV2Existe(id: string, raiz = process.cwd()): boolean {
  return existsSync(caminho(id, raiz));
}

/**
 * Os ids que já têm documento v2 em disco.
 *
 * Serve a duas telas: o índice do editor, que precisa listar a aula criada por
 * "Nova aula" mesmo antes de ela ter um arquivo v1 por trás; e a própria criação,
 * que confere se o id novo já está ocupado. Sem isto, uma aula recém-criada
 * existiria em disco e sumiria da lista — alcançável só por URL digitada.
 */
export function idsDeDocumentosV2(raiz = process.cwd()): string[] {
  const pasta = path.join(raiz, PASTA_V2);
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith(".json"))
    .map((nome) => nome.slice(0, -".json".length))
    .sort();
}

/**
 * Snapshot durável imediatamente anterior a «Refazer a partir da aula».
 * O documento inteiro entra porque o catálogo de erros pode participar da autoria.
 * Mantemos os 20 mais recentes por aula; o Undo da sessão continua sendo a volta rápida.
 */
export function guardarSnapshotAntesDeRefazerV2(
  id: string,
  cru: unknown,
  treinoId: string,
  raiz = process.cwd(),
): { ok: true; arquivo: string } | { ok: false; erro: string } {
  const validado = validarAulaV2(cru);
  if (!validado.ok || validado.aula.id !== id || !validado.aula.treinos.some((treino) => treino.id === treinoId)) {
    return { ok: false, erro: "não foi possível validar a cópia anterior do treino" };
  }
  // Reusa as duas guardas de caminho do documento antes de formar a subpasta.
  caminho(id, raiz);
  const pasta = path.join(raiz, PASTA_V2, "snapshots", id);
  mkdirSync(pasta, { recursive: true });
  const nome = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`;
  const destino = path.join(pasta, nome);
  try {
    escreverAtomico(destino, serializar({ tipo: "antes-de-refazer-treino", treinoId, criadoEm: new Date().toISOString(), aula: validado.aula }));
    const arquivos = readdirSync(pasta).filter((item) => item.endsWith(".json")).sort();
    for (const antigo of arquivos.slice(0, Math.max(0, arquivos.length - 20))) rmSync(path.join(pasta, antigo), { force: true });
    return { ok: true, arquivo: destino };
  } catch {
    return { ok: false, erro: "não foi possível guardar a cópia anterior; o treino não foi substituído" };
  }
}
