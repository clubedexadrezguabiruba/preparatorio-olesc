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

export type RespostaDoRating = VereditoDoRating | { readonly erro: string };

/** "+8", "−12" (com o sinal de menos tipográfico), "±0" — o delta como a tela o escreve. */
export function formatarDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}
