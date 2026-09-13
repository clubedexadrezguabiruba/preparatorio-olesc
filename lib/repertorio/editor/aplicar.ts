import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { destravarConferencia, travarConferencia } from "../../editor/gate.ts";
import { editorLigado } from "../../editor/local.ts";
import { escreverAtomico, hashDoTexto, lerConteudo, serializar, trocarArquivo } from "../../editor/rascunhos.ts";
import { hashCanonico } from "../../editor-v2/hash.ts";
import { compilarRepertorio, diferencasDoCompilado, type Compilacao, type FonteDoRepertorio } from "../compilar.ts";
import { lerCompilado, lerFontesDoRepertorio } from "../compilar-em-disco.ts";
import { notas } from "../conteudo.ts";
import type { Linha } from "../linhas.ts";
import { lerPgns } from "../pgn.ts";
import { impactoDoRepertorio, type ImpactoDoRepertorio } from "./impacto.ts";
import { caminhoDaFonte, ehArquivoDoRepertorio } from "./rascunho.ts";

/**
 * Aplicar uma edição do repertório — §21: "fonte e compilado são promovidos como
 * conjunto coerente; interrupção é recuperável".
 *
 * ## A transação, fase por fase
 *
 * ```
 * candidato      .editor/repertorio/transacao/candidato.pgn gravado
 * validado       os onze, com o candidato relido do disco no lugar, compilam sem problema
 * fonte-trocada  content/repertorio/<arquivo>.pgn tem os bytes do candidato (rename)
 * compilado      public/repertorio/ é a compilação das fontes relidas do disco
 * ```
 *
 * Cada fase é registrada em `transacao.json` **depois** de feita. `recuperarTransacaoRepertorio`
 * roda antes de abrir, preparar e aplicar:
 *
 * - **até "validado"** a fonte publicada não foi tocada, e a transação é descartada. Com uma
 *   exceção conferida pelo hash: se o `rename` da fonte aconteceu e o processo morreu antes de
 *   registrar "fonte-trocada", a fonte em disco **já é** o candidato validado — e aí a
 *   recuperação termina em vez de descartar;
 * - **depois**, termina: recompila das fontes em disco (já validadas) e grava o compilado. A
 *   compilação depende só das fontes, então terminar duas vezes dá o mesmo resultado.
 *
 * `content/repertorio/` nunca recebe um PGN que não compila: a troca da fonte só acontece
 * depois da fase "validado". A trava é a única do repositório (`lib/editor/gate.ts`), a mesma
 * da conferência e da publicação de aulas.
 */

export type FaseDoRepertorio = "candidato" | "validado" | "fonte-trocada" | "compilado";

type Transacao = {
  arquivo: string;
  fase: FaseDoRepertorio;
  hashDoCandidato: string;
  /** O hash da fonte antes de começar; `null` quando é abertura nova. */
  hashDaFonteAnterior: string | null;
  iniciadaEm: string;
};

const pastaDaTransacao = (raiz: string) => path.join(raiz, ".editor", "repertorio", "transacao");
const caminhoDaTransacao = (raiz: string) => path.join(pastaDaTransacao(raiz), "transacao.json");
const caminhoDoCandidato = (raiz: string) => path.join(pastaDaTransacao(raiz), "candidato.pgn");
const pastaDasFontes = (raiz: string) => path.join(raiz, "content", "repertorio");
const pastaDoCompilado = (raiz: string) => path.join(raiz, "public", "repertorio");

function lerTransacao(raiz: string): Transacao | null {
  const arquivo = caminhoDaTransacao(raiz);
  if (!existsSync(arquivo)) return null;
  try {
    const lida = JSON.parse(readFileSync(arquivo, "utf8")) as Transacao;
    return ehArquivoDoRepertorio(lida.arquivo) ? lida : null;
  } catch {
    return null;
  }
}

/** Grava a compilação das fontes em disco, arquivo por arquivo, e apaga o que sobrou. */
function gravarCompilado(raiz: string, compilacao: Compilacao): void {
  const pasta = pastaDoCompilado(raiz);
  const emDisco = lerCompilado(pasta);
  // O índice por último: enquanto ele não muda, o servidor lê as aberturas que conhece.
  const ordem = [...compilacao.saida.keys()].sort((a, b) => (a === "index.json" ? 1 : b === "index.json" ? -1 : a.localeCompare(b)));
  for (const relativo of ordem) {
    const texto = compilacao.saida.get(relativo)!;
    if (emDisco.get(relativo) === texto) continue;
    trocarArquivo(path.join(pasta, ...relativo.split("/")), texto);
  }
  for (const relativo of emDisco.keys()) {
    if (!compilacao.saida.has(relativo)) rmSync(path.join(pasta, ...relativo.split("/")), { force: true });
  }
}

export type RecuperacaoDoRepertorio = { acao: "nada" | "descartada" | "terminada"; fase?: FaseDoRepertorio; arquivo?: string };

export function recuperarTransacaoRepertorio(raiz = process.cwd()): RecuperacaoDoRepertorio {
  const transacao = lerTransacao(raiz);
  const limpar = () => {
    rmSync(caminhoDoCandidato(raiz), { force: true });
    rmSync(caminhoDaTransacao(raiz), { force: true });
  };
  if (!transacao) {
    if (existsSync(caminhoDoCandidato(raiz)) || existsSync(caminhoDaTransacao(raiz))) {
      limpar();
      return { acao: "descartada" };
    }
    return { acao: "nada" };
  }

  const fonte = lerConteudo(caminhoDaFonte(transacao.arquivo, raiz));
  const fonteJaTrocada = fonte?.hash === transacao.hashDoCandidato;
  const antesDaTroca = transacao.fase === "candidato" || transacao.fase === "validado";
  if (antesDaTroca && !(transacao.fase === "validado" && fonteJaTrocada)) {
    limpar();
    return { acao: "descartada", fase: transacao.fase, arquivo: transacao.arquivo };
  }

  // Depois da troca: a fonte em disco é a validada. Terminar é recompilar dela.
  const compilacao = compilarRepertorio(lerFontesDoRepertorio(pastaDasFontes(raiz)), notas());
  if (compilacao.problemas.length > 0) {
    // Só acontece se alguém mexeu em outro .pgn no meio. A transação fica, para ninguém
    // apagar a pista; o `--check` e a conferência acusam.
    throw new Error(`a aplicação interrompida de ${transacao.arquivo} não pôde terminar: ${compilacao.problemas[0]}`);
  }
  gravarCompilado(raiz, compilacao);
  limpar();
  return { acao: "terminada", fase: transacao.fase, arquivo: transacao.arquivo };
}

/* ------------------------------------------------------------------ *
 * Preparar: compilar o candidato em memória e medir o impacto
 * ------------------------------------------------------------------ */

/** As fontes de hoje, com `arquivo` trocado por `texto` (ou acrescentado). */
function fontesComCandidato(raiz: string, arquivo: string, texto: string): FonteDoRepertorio[] {
  const nome = `${arquivo}.pgn`;
  const fontes = lerFontesDoRepertorio(pastaDasFontes(raiz)).filter((f) => f.nome !== nome);
  return [...fontes, { nome, texto }];
}

/** As linhas que saem de um texto de arquivo, na compilação inteira. */
function linhasDoArquivo(compilacao: Compilacao, texto: string): Linha[] {
  const aberturas = new Set(lerPgns(texto).map((p) => `${p.tags.Cor}/${p.tags.Abertura}`));
  return compilacao.linhas.filter((l) => aberturas.has(`${l.cor}/${l.abertura}`));
}

export type PreparoDaAplicacao =
  | { ok: false; motivo: string; problemas: string[] }
  | {
      ok: true;
      impacto: ImpactoDoRepertorio;
      impactoHash: string;
      /** Os ids que deixam de existir — a action conta o progresso neles. */
      idsQueMorrem: string[];
      /** Milissegundos para compilar os onze em memória. */
      ms: number;
    };

/** Um arquivo sem nenhuma linha não entra no repertório: não haveria o que treinar. */
function semLinhas(compilacao: Compilacao, arquivo: string): boolean {
  return compilacao.porArquivo.find((a) => a.nome === `${arquivo}.pgn`)?.linhas === 0;
}

export function prepararAplicacao(arquivo: string, texto: string, raiz = process.cwd(), agora: () => number = () => performance.now()): PreparoDaAplicacao {
  if (!ehArquivoDoRepertorio(arquivo)) return { ok: false, motivo: "arquivo do repertório inválido", problemas: [] };
  recuperarTransacaoRepertorio(raiz);

  const inicio = agora();
  const depois = compilarRepertorio(fontesComCandidato(raiz, arquivo, texto), notas());
  const ms = agora() - inicio;
  if (depois.problemas.length > 0) {
    return { ok: false, motivo: `o repertório com esta edição não compila (${depois.problemas.length} problema(s))`, problemas: depois.problemas };
  }
  if (semLinhas(depois, arquivo)) {
    return { ok: false, motivo: "o arquivo ainda não tem nenhuma linha completa — ele só entra no repertório quando tiver", problemas: [] };
  }

  const fonte = lerConteudo(caminhoDaFonte(arquivo, raiz));
  const hoje = compilarRepertorio(lerFontesDoRepertorio(pastaDasFontes(raiz)), notas());
  const linhasAntes = fonte ? linhasDoArquivo(hoje, fonte.texto) : [];
  const linhasDepois = linhasDoArquivo(depois, texto);
  const impacto = impactoDoRepertorio(linhasAntes, linhasDepois);
  return {
    ok: true,
    impacto,
    impactoHash: hashCanonico({ impacto, fonte: fonte?.hash ?? null, candidato: hashDoTexto(texto) }),
    idsQueMorrem: impacto.morrem.map((l) => l.id),
    ms,
  };
}

/* ------------------------------------------------------------------ *
 * Aplicar
 * ------------------------------------------------------------------ */

export type ResultadoDaAplicacao =
  | { ok: true; semMudanca: boolean }
  | { ok: false; motivo: string; problemas?: string[]; interrompidaEm?: FaseDoRepertorio };

export type OpcoesDaAplicacao = {
  raiz?: string;
  env?: NodeJS.ProcessEnv;
  /** O hash do impacto que o professor viu. Sem ele (testes), não há confirmação a conferir. */
  impactoHash?: string;
  /** Só para os testes: para depois desta fase, como se o processo tivesse morrido. */
  pararDepoisDe?: FaseDoRepertorio;
  agora?: () => Date;
};

export function aplicarRepertorio(arquivo: string, texto: string, opcoes: OpcoesDaAplicacao = {}): ResultadoDaAplicacao {
  const { raiz = process.cwd(), env = process.env, impactoHash, pararDepoisDe, agora = () => new Date() } = opcoes;
  if (!editorLigado(env)) return { ok: false, motivo: "o editor local está desligado — nada é aplicado daqui" };
  if (!ehArquivoDoRepertorio(arquivo)) return { ok: false, motivo: "arquivo do repertório inválido" };
  const trava = travarConferencia(raiz);
  if (!trava.ok) return { ok: false, motivo: trava.motivo };
  try {
    const preparo = prepararAplicacao(arquivo, texto, raiz);
    if (!preparo.ok) return { ok: false, motivo: preparo.motivo, problemas: preparo.problemas };
    if (impactoHash !== undefined && preparo.impactoHash !== impactoHash) {
      return { ok: false, motivo: "o que a aplicação faria mudou desde que o impacto foi mostrado — veja o impacto de novo" };
    }

    const fonte = lerConteudo(caminhoDaFonte(arquivo, raiz));
    const transacao: Transacao = {
      arquivo,
      fase: "candidato",
      hashDoCandidato: hashDoTexto(texto),
      hashDaFonteAnterior: fonte?.hash ?? null,
      iniciadaEm: agora().toISOString(),
    };
    const registrar = (fase: FaseDoRepertorio) => {
      transacao.fase = fase;
      escreverAtomico(caminhoDaTransacao(raiz), serializar(transacao));
    };
    const parou = (fase: FaseDoRepertorio): ResultadoDaAplicacao => ({ ok: false, motivo: "interrompida para teste", interrompidaEm: fase });

    // ---- candidato ------------------------------------------------------------------
    mkdirSync(pastaDaTransacao(raiz), { recursive: true });
    escreverAtomico(caminhoDoCandidato(raiz), texto);
    registrar("candidato");
    if (pararDepoisDe === "candidato") return parou("candidato");

    // ---- validado: o candidato relido do disco, com as outras fontes também do disco --
    const relido = readFileSync(caminhoDoCandidato(raiz), "utf8");
    const validacao = compilarRepertorio(fontesComCandidato(raiz, arquivo, relido), notas());
    if (hashDoTexto(relido) !== transacao.hashDoCandidato || validacao.problemas.length > 0 || semLinhas(validacao, arquivo)) {
      recuperarTransacaoRepertorio(raiz);
      return { ok: false, motivo: "o candidato relido do disco não compilou — nada foi aplicado", problemas: validacao.problemas };
    }
    registrar("validado");
    if (pararDepoisDe === "validado") return parou("validado");

    // ---- fonte-trocada --------------------------------------------------------------
    if (fonte?.texto !== relido) trocarArquivo(caminhoDaFonte(arquivo, raiz), relido);
    registrar("fonte-trocada");
    if (pararDepoisDe === "fonte-trocada") return parou("fonte-trocada");

    // ---- compilado: das fontes relidas do disco ----------------------------------------
    const final = compilarRepertorio(lerFontesDoRepertorio(pastaDasFontes(raiz)), notas());
    if (final.problemas.length > 0) throw new Error(`as fontes em disco não compilam depois da troca: ${final.problemas[0]}`);
    gravarCompilado(raiz, final);
    registrar("compilado");
    if (pararDepoisDe === "compilado") return parou("compilado");

    recuperarTransacaoRepertorio(raiz);
    return { ok: true, semMudanca: preparo.impacto.semMudanca };
  } finally {
    destravarConferencia(raiz);
  }
}

/** O compilado em disco bate com as fontes? A mesma pergunta do `--check`. */
export function compiladoCoerente(raiz = process.cwd()): string[] {
  const compilacao = compilarRepertorio(lerFontesDoRepertorio(pastaDasFontes(raiz)), notas());
  if (compilacao.problemas.length > 0) return compilacao.problemas;
  return diferencasDoCompilado(compilacao.saida, lerCompilado(pastaDoCompilado(raiz)));
}
