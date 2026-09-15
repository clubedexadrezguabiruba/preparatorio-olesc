import type { Puzzle } from "./puzzles.ts";

/**
 * O vocabulário do modo "tática com rating", num lugar só e sem `server-only`.
 *
 * Quem lê: o script que recorta o CSV (`scripts/base-rating.ts`), o banco de
 * puzzles do servidor (`lib/tatica/banco.ts`), a escolha
 * (`lib/tatica/rating-escolher.ts`) e as telas, inclusive as de cliente — por
 * isso este arquivo só importa tipos.
 */

/**
 * A origem dos problemas de 600 a 700, que não pertencem a tema nenhum.
 * (O plano dizia 400; o Lichess não tem puzzle bom abaixo de 600 — ver
 * `scripts/base-rating.ts`.)
 *
 * É gravada em `tentativas_puzzle.tema` e `.origem` como qualquer tag, e
 * `puzzlePorId(ORIGEM_BASE, id)` a acha em `public/puzzles/rating-base/`. Com
 * isso a revisão do dia e a conferência funcionam sem caminho especial.
 */
export const ORIGEM_BASE = "rating-base";

/** O nome que o aluno lê onde uma tela mostraria o tema: a revisão do dia. */
export const NOME_DA_BASE = "Tática rating";

/**
 * Uma linha de `public/puzzles/rating-indice.json`: o id, o arquivo de onde ele
 * é lido (uma tag de tema ou `ORIGEM_BASE`) e o rating.
 *
 * Tupla e não objeto porque são ~120 mil linhas: repetir `"id":`, `"origem":`
 * e `"rating":` em cada uma quase dobraria o arquivo.
 */
export type LinhaDoIndice = readonly [id: string, origem: string, rating: number];

/**
 * O que as telas mostram do rating de um aluno. O rating vai cru, com as casas
 * decimais do banco; quem arredonda é a tela.
 *
 * Os tipos do modo moram aqui, e não em `gravar-rating.ts`, porque aquele é
 * `server-only` e a tela de jogo roda no navegador — a fronteira de
 * `lib/tatica/puzzles.ts`, pelo mesmo motivo.
 */
export type EstadoDoRating = {
  readonly rating: number;
  readonly sequencia: number;
  readonly melhorSequencia: number;
  readonly ratingMaximo: number;
  readonly resolvidos: number;
  /** O rating com que ele começou o modo (600 para todos desde 15/9). */
  readonly ratingInicial: number;
};

/** O veredito de uma resposta do modo rating. */
export type VereditoDoRating = {
  readonly acertou: boolean;
  /** O "+8 / −12" da tela. */
  readonly delta: number;
  readonly rating: number;
  readonly sequencia: number;
  readonly melhorSequencia: number;
  /** A linha inteira do problema, para o tabuleiro mostrá-la depois do erro. */
  readonly solucao: readonly string[];
  /** O próximo problema, já gravado como pendente — ou `null` se não há. */
  readonly proximo: (Puzzle & { readonly origem: string }) | null;
  /** A resposta valeu, mas algo menor falhou (a linha do histórico). */
  readonly aviso: string | null;
};

export type RecusaDoRating = {
  readonly erro: string;
  /**
   * O servidor falhou (banco fora, exceção), e não recusou: a resposta não foi
   * julgada e reenviar é seguro. A tela oferece "Tentar de novo" em vez de
   * "Recarregar" — e não diz "Sem conexão", que seria mentira.
   */
  readonly falhaDoServidor?: true;
};

export type RespostaDoRating = VereditoDoRating | RecusaDoRating;

/**
 * Quantos problemas por dia a tela sugere, **depois** da revisão e da série do
 * tema (revisão de 15/9, item 7). O modo é o mais divertido da tática, e sem um
 * número ele toma o lugar do que a rotina manda fazer primeiro.
 *
 * **70, por decisão do Doug (15/9).** A proposta era 15; ele subiu o teto. O
 * bloco de tática tem 45 min por dia e a turma resolve de 100 a 150 problemas
 * por semana (`docs/00-PLANO-MESTRE.md`), então 70 num dia é muito treino, e
 * não um dia normal. É sugestão: nada trava no 71º.
 */
export const PROBLEMAS_POR_DIA = 70;

/**
 * A resposta do servidor, com toda exceção virada `falhaDoServidor`.
 *
 * Sem isto, uma exceção dentro da server action chegava ao navegador como a
 * promessa rejeitada — a mesma de uma queda de rede —, e a tela dizia "Sem
 * conexão" ao aluno cuja internet estava boa (revisão de 15/9, defeito 4).
 * Com isto, promessa rejeitada volta a significar só uma coisa: a resposta não
 * chegou.
 */
export async function respostaProtegida(
  responder: () => Promise<RespostaDoRating>,
  aoFalhar: (erro: unknown) => void = () => {},
): Promise<RespostaDoRating> {
  try {
    return await responder();
  } catch (erro) {
    aoFalhar(erro);
    return { erro: "o servidor não conseguiu conferir", falhaDoServidor: true };
  }
}

/** "+8", "−12" (com o sinal de menos tipográfico), "±0" — o delta como a tela o escreve. */
export function formatarDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}
