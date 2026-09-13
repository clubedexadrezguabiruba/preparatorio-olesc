/**
 * Publicar uma aula v2 — especificação §20.1, plano final §13.
 *
 * ## A transação, fase por fase
 *
 * ```
 * candidato  → o pacote compilado em .editor/v2/publicacao/<AULA>/candidato.json
 * validado   → o candidato relido do disco passou por problemasDoPacoteV2 e pelas regras
 * instalado  → content/aulas-v2/<AULA>/publicacoes/<id>.json existe, com esses bytes
 * ativado    → content/aulas-v2/<AULA>/ativa.json aponta para <id>
 * ```
 *
 * Cada fase é gravada em `transacao.json` **depois** de feita. Interrompida em qualquer
 * ponto, a próxima conferência, publicação ou abertura chama `recuperarTransacaoV2`, que:
 *
 * - até **instalado**: descarta o candidato e apaga o pacote que esta transação instalou e
 *   ninguém ativou (o órfão). Um pacote que já existia antes, com os mesmos bytes, fica — ele
 *   pode ser o ativo ou o de uma aba antiga;
 * - em **ativado**: só termina a limpeza. O aluno já está na publicação nova.
 *
 * O ponteiro nunca aponta para um pacote que não está inteiro no disco: ele só é trocado
 * depois da instalação, e trocado por `rename`.
 *
 * ## Imutável de verdade
 *
 * O id é o hash do conteúdo, então o mesmo conteúdo cai no mesmo arquivo. Reescrever um id
 * que já existe só é aceito com **bytes idênticos**; bytes diferentes sob o mesmo nome são
 * recusados e a transação é descartada — seria reescrever o que uma aba antiga está jogando.
 *
 * ## O que publicar não faz
 *
 * Commit, push e deploy (§20.1). O pacote fica em `content/`, e chega ao aluno do site
 * quando o Doug fizer o deploy.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { destravarConferencia, travarConferencia } from "../editor/gate.ts";
import { editorLigado } from "../editor/local.ts";
import { caminhoDeAula, escreverAtomico, serializar, trocarArquivo } from "../editor/rascunhos.ts";
import { revisoesDaAulaV2 } from "./avaliacao.ts";
import { problemasParaPublicarV2 } from "./conferencia.ts";
import { lerPosicoesDoConteudoV2, podePublicarV2 } from "./gate.ts";
import { hashCanonico } from "./hash.ts";
import { impactoDaPublicacaoV2, type ImpactoDaPublicacaoV2 } from "./impacto-publicacao.ts";
import { aulaIdV2Schema } from "./modelo.ts";
import { montarPacoteV2, posicoesDoPacoteV2, problemasDoPacoteV2, type PacoteV2 } from "./pacote.ts";
import {
  caminhoDaPublicacaoV2,
  caminhoDoPonteiroV2,
  idsDePublicacoesV2,
  lerPonteiroV2,
  lerPublicacaoCruaV2,
  type PonteiroV2,
} from "./publicacoes.ts";
import { lerDocumentoV2 } from "./rascunhos.ts";

export type FaseDaPublicacaoV2 = "candidato" | "validado" | "instalado" | "ativado";

type TransacaoV2 = {
  aula: string;
  publicationId: string;
  fase: FaseDaPublicacaoV2;
  /** O pacote já existia em `publicacoes/` antes desta transação (mesmos bytes). */
  pacoteJaExistia: boolean;
  /** O ponteiro que estava ativo quando a transação começou. */
  ponteiroAnterior: PonteiroV2 | null;
  iniciadaEm: string;
};

const contentDe = (raiz: string) => path.join(raiz, "content");

function pastaDaTransacao(id: string, raiz: string): string {
  // Reusa as duas guardas de caminho do documento antes de formar a subpasta.
  caminhoDeAula(id, path.join(".editor", "v2", "publicacao"), raiz, aulaIdV2Schema);
  return path.join(raiz, ".editor", "v2", "publicacao", id);
}

const caminhoDaTransacao = (id: string, raiz: string) => path.join(pastaDaTransacao(id, raiz), "transacao.json");
const caminhoDoCandidato = (id: string, raiz: string) => path.join(pastaDaTransacao(id, raiz), "candidato.json");

function lerTransacao(id: string, raiz: string): TransacaoV2 | null {
  const arquivo = caminhoDaTransacao(id, raiz);
  if (!existsSync(arquivo)) return null;
  try {
    return JSON.parse(readFileSync(arquivo, "utf8")) as TransacaoV2;
  } catch {
    return null;
  }
}

export type RecuperacaoV2 = { acao: "nada" | "descartada" | "finalizada"; fase?: FaseDaPublicacaoV2 };

/**
 * Termina ou desfaz uma publicação interrompida. Roda antes de conferir, publicar e abrir.
 * Nunca troca o ponteiro: ou ele já aponta para o pacote novo (ativado), ou nunca apontou.
 */
export function recuperarTransacaoV2(id: string, raiz = process.cwd()): RecuperacaoV2 {
  const transacao = lerTransacao(id, raiz);
  const candidato = caminhoDoCandidato(id, raiz);
  if (!transacao) {
    // Candidato sem transação é resto de uma escrita que nem chegou a registrar a fase.
    if (existsSync(candidato)) {
      rmSync(candidato, { force: true });
      return { acao: "descartada" };
    }
    return { acao: "nada" };
  }
  if (transacao.fase === "ativado") {
    rmSync(candidato, { force: true });
    rmSync(caminhoDaTransacao(id, raiz), { force: true });
    return { acao: "finalizada", fase: transacao.fase };
  }
  // Até "instalado": o aluno nunca viu este pacote. Se esta transação o instalou, ele sai.
  let ponteiro: PonteiroV2 | null = null;
  try {
    ponteiro = lerPonteiroV2(contentDe(raiz), id);
  } catch {
    ponteiro = transacao.ponteiroAnterior;
  }
  const referenciado = ponteiro?.publicationId === transacao.publicationId || ponteiro?.anterior === transacao.publicationId;
  if (!transacao.pacoteJaExistia && !referenciado) {
    rmSync(caminhoDaPublicacaoV2(contentDe(raiz), id, transacao.publicationId), { force: true });
  }
  rmSync(candidato, { force: true });
  rmSync(caminhoDaTransacao(id, raiz), { force: true });
  return { acao: "descartada", fase: transacao.fase };
}

/** O pacote ativo de uma aula, ou `null` se ela ainda não tem publicação v2. */
export function pacoteAtivoV2(id: string, raiz = process.cwd()): PacoteV2 | null {
  const ponteiro = lerPonteiroV2(contentDe(raiz), id);
  if (!ponteiro) return null;
  const cru = lerPublicacaoCruaV2(contentDe(raiz), id, ponteiro.publicationId);
  return cru && !problemasDoPacoteV2(cru).length ? (cru as PacoteV2) : null;
}

export type PreparoDaPublicacaoV2 =
  | { ok: false; motivo: string }
  | { ok: true; impacto: ImpactoDaPublicacaoV2; impactoHash: string; publicationId: string };

/**
 * O que a publicação vai fazer, antes de fazer. A tela mostra o impacto, e o hash dele volta
 * no clique de publicar: se a aula ou o ativo mudarem entre um e outro, a publicação recusa.
 */
export async function prepararPublicacaoV2(id: string, raiz = process.cwd()): Promise<PreparoDaPublicacaoV2> {
  recuperarTransacaoV2(id, raiz);
  const permissao = await podePublicarV2(id, raiz);
  if (!permissao.pode) return { ok: false, motivo: permissao.motivo ?? "a aula não pode ser publicada agora" };
  const documento = lerDocumentoV2(id, raiz);
  if (!documento) return { ok: false, motivo: "a aula não tem documento v2 em disco" };
  const pacote = montarPacoteV2(documento.aula, lerPosicoesDoConteudoV2(raiz));
  const impacto = impactoDaPublicacaoV2(pacoteAtivoV2(id, raiz), pacote);
  return { ok: true, impacto, impactoHash: hashCanonico(impacto), publicationId: pacote.publicationId };
}

export type ResultadoDaPublicacaoV2 =
  | { ok: true; publicationId: string; anterior: string | null; mesmoConteudo: boolean }
  | { ok: false; motivo: string; interrompidaEm?: FaseDaPublicacaoV2 };

export type OpcoesDaPublicacaoV2 = {
  raiz?: string;
  env?: NodeJS.ProcessEnv;
  /** O hash do impacto que o professor viu. Sem ele (testes), não há confirmação a conferir. */
  impactoHash?: string;
  /** Só para os testes: para depois desta fase, como se o processo tivesse morrido. */
  pararDepoisDe?: FaseDaPublicacaoV2;
  agora?: () => Date;
};

export async function publicarAulaV2(id: string, opcoes: OpcoesDaPublicacaoV2 = {}): Promise<ResultadoDaPublicacaoV2> {
  const { raiz = process.cwd(), env = process.env, impactoHash, pararDepoisDe, agora = () => new Date() } = opcoes;
  if (!editorLigado(env)) return { ok: false, motivo: "o editor local está desligado — nenhuma publicação daqui" };
  if (!aulaIdV2Schema.safeParse(id).success) return { ok: false, motivo: "id de aula inválido" };
  const trava = travarConferencia(raiz);
  if (!trava.ok) return { ok: false, motivo: trava.motivo };
  try {
    recuperarTransacaoV2(id, raiz);
    const permissao = await podePublicarV2(id, raiz);
    if (!permissao.pode) return { ok: false, motivo: permissao.motivo ?? "a aula não pode ser publicada agora" };
    const documento = lerDocumentoV2(id, raiz);
    if (!documento) return { ok: false, motivo: "a aula não tem documento v2 em disco" };
    const positions = lerPosicoesDoConteudoV2(raiz);
    const pacote = montarPacoteV2(documento.aula, positions);
    const ponteiroAnterior = lerPonteiroV2(contentDe(raiz), id);
    const ativo = pacoteAtivoV2(id, raiz);
    if (impactoHash !== undefined && hashCanonico(impactoDaPublicacaoV2(ativo, pacote)) !== impactoHash) {
      return { ok: false, motivo: "o que a publicação faria mudou desde que o impacto foi mostrado — veja o impacto de novo" };
    }

    const texto = serializar(pacote);
    const destino = caminhoDaPublicacaoV2(contentDe(raiz), id, pacote.publicationId);
    const pacoteJaExistia = existsSync(destino);
    if (pacoteJaExistia && readFileSync(destino, "utf8") !== texto) {
      return { ok: false, motivo: `já existe uma publicação ${pacote.publicationId} com bytes diferentes — ela não é reescrita` };
    }
    const transacao: TransacaoV2 = { aula: id, publicationId: pacote.publicationId, fase: "candidato", pacoteJaExistia, ponteiroAnterior, iniciadaEm: agora().toISOString() };
    const registrar = (fase: FaseDaPublicacaoV2) => {
      transacao.fase = fase;
      escreverAtomico(caminhoDaTransacao(id, raiz), serializar(transacao));
    };

    // ---- candidato ------------------------------------------------------------------
    mkdirSync(pastaDaTransacao(id, raiz), { recursive: true });
    escreverAtomico(caminhoDoCandidato(id, raiz), texto);
    registrar("candidato");
    if (pararDepoisDe === "candidato") return { ok: false, motivo: "interrompida para teste", interrompidaEm: "candidato" };

    // ---- validado: o candidato relido do disco, e não o objeto em memória ------------
    const relido = JSON.parse(readFileSync(caminhoDoCandidato(id, raiz), "utf8")) as PacoteV2;
    const doPacote = problemasDoPacoteV2(relido);
    const posicoes = posicoesDoPacoteV2(relido);
    const impedem = doPacote.length ? [] : problemasParaPublicarV2(relido.aula, {
      positions: posicoes,
      revisoes: { gravadas: relido.revisoes, recalculadas: revisoesDaAulaV2(relido.aula, posicoes) },
    }).filter((problema) => problema.severidade === "erro");
    if (doPacote.length || impedem.length) {
      recuperarTransacaoV2(id, raiz);
      return { ok: false, motivo: `o pacote compilado não passou: ${[...doPacote, ...impedem.map((p) => p.mensagem)].slice(0, 3).join("; ")}` };
    }
    registrar("validado");
    if (pararDepoisDe === "validado") return { ok: false, motivo: "interrompida para teste", interrompidaEm: "validado" };

    // ---- instalado ------------------------------------------------------------------
    if (!pacoteJaExistia) trocarArquivo(destino, texto);
    registrar("instalado");
    if (pararDepoisDe === "instalado") return { ok: false, motivo: "interrompida para teste", interrompidaEm: "instalado" };

    // ---- ativado --------------------------------------------------------------------
    const mesmoConteudo = ponteiroAnterior?.publicationId === pacote.publicationId;
    const ponteiro: PonteiroV2 = mesmoConteudo
      ? ponteiroAnterior!
      : { publicationId: pacote.publicationId, anterior: ponteiroAnterior?.publicationId ?? null, ativadaEm: agora().toISOString() };
    if (!mesmoConteudo) trocarArquivo(caminhoDoPonteiroV2(contentDe(raiz), id), serializar(ponteiro));
    registrar("ativado");
    if (pararDepoisDe === "ativado") return { ok: false, motivo: "interrompida para teste", interrompidaEm: "ativado" };

    // Snapshot pré-publicação (§6.3): o documento exato que virou pacote.
    guardarSnapshotDePublicacao(id, raiz, documento.texto, pacote.publicationId, agora());
    recuperarTransacaoV2(id, raiz);
    return { ok: true, publicationId: pacote.publicationId, anterior: ponteiro.anterior, mesmoConteudo };
  } finally {
    destravarConferencia(raiz);
  }
}

function guardarSnapshotDePublicacao(id: string, raiz: string, texto: string, publicationId: string, em: Date): void {
  const pasta = path.join(raiz, ".editor", "v2", "snapshots", id);
  mkdirSync(pasta, { recursive: true });
  escreverAtomico(path.join(pasta, `${em.toISOString().replaceAll(":", "-")}-antes-de-publicar-${publicationId}.json`), texto);
  // A mesma retenção dos snapshots de refazer: os 20 mais recentes por aula.
  const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith(".json")).sort();
  for (const antigo of arquivos.slice(0, Math.max(0, arquivos.length - 20))) rmSync(path.join(pasta, antigo), { force: true });
}

/** As publicações guardadas de uma aula, da mais recente para a mais antiga, com a ativa marcada. */
export function publicacoesDaAulaV2(id: string, raiz = process.cwd()): Array<{ publicationId: string; ativa: boolean; integra: boolean; titulo: string | null }> {
  const content = contentDe(raiz);
  let ponteiro: PonteiroV2 | null = null;
  try { ponteiro = lerPonteiroV2(content, id); } catch { ponteiro = null; }
  return idsDePublicacoesV2(content, id).map((publicationId) => {
    let cru: unknown = null;
    try { cru = lerPublicacaoCruaV2(content, id, publicationId); } catch { cru = null; }
    const integra = cru !== null && problemasDoPacoteV2(cru).length === 0;
    return { publicationId, ativa: ponteiro?.publicationId === publicationId, integra, titulo: integra ? (cru as PacoteV2).aula.titulo : null };
  });
}

/** Volta o aluno a uma publicação guardada (rollback). Não apaga nenhuma. */
export function reativarPublicacaoV2(id: string, publicationId: string, opcoes: { raiz?: string; env?: NodeJS.ProcessEnv; agora?: () => Date } = {}): { ok: true } | { ok: false; motivo: string } {
  const { raiz = process.cwd(), env = process.env, agora = () => new Date() } = opcoes;
  if (!editorLigado(env)) return { ok: false, motivo: "o editor local está desligado" };
  const trava = travarConferencia(raiz);
  if (!trava.ok) return { ok: false, motivo: trava.motivo };
  try {
    recuperarTransacaoV2(id, raiz);
    const cru = lerPublicacaoCruaV2(contentDe(raiz), id, publicationId);
    if (!cru) return { ok: false, motivo: "essa publicação não está guardada" };
    const problemas = problemasDoPacoteV2(cru);
    if (problemas.length) return { ok: false, motivo: `essa publicação não está íntegra: ${problemas[0]}` };
    const atual = lerPonteiroV2(contentDe(raiz), id);
    if (atual?.publicationId === publicationId) return { ok: true };
    trocarArquivo(caminhoDoPonteiroV2(contentDe(raiz), id), serializar({ publicationId, anterior: atual?.publicationId ?? null, ativadaEm: agora().toISOString() }));
    return { ok: true };
  } finally {
    destravarConferencia(raiz);
  }
}

/**
 * Tira a aula do v2: o aluno volta a receber a aula v1. As publicações ficam guardadas —
 * tentativas antigas ainda podem precisar delas para rejulgar.
 */
export function desativarV2(id: string, opcoes: { raiz?: string; env?: NodeJS.ProcessEnv } = {}): { ok: true } | { ok: false; motivo: string } {
  const { raiz = process.cwd(), env = process.env } = opcoes;
  if (!editorLigado(env)) return { ok: false, motivo: "o editor local está desligado" };
  const trava = travarConferencia(raiz);
  if (!trava.ok) return { ok: false, motivo: trava.motivo };
  try {
    recuperarTransacaoV2(id, raiz);
    rmSync(caminhoDoPonteiroV2(contentDe(raiz), id), { force: true });
    return { ok: true };
  } finally {
    destravarConferencia(raiz);
  }
}
