import type { Chess } from "chess.js";

export type GameOutcome =
  | { over: false }
  | { over: true; result: "win-white" | "win-black" | "draw"; reason: string };

/**
 * As peças de cada lado, sem os reis, agrupadas por tipo. `"rr"` = duas torres.
 */
function forcaDe(game: Chess, cor: "w" | "b"): string {
  return game
    .board()
    .flat()
    .filter((casa) => casa !== null && casa.color === cor && casa.type !== "k")
    .map((casa) => (casa as { type: string }).type)
    .sort()
    .join("");
}

/**
 * Os dois lados têm a mesma peça, uma só, e não há peão nenhum no tabuleiro?
 *
 * É a família T vs T, B vs B, C vs C — o que sobra quando um final de torre com
 * peão termina com o peão caindo. A **dama fica de fora** de propósito: D vs D
 * é cheia de espeto e enfiada, e chamar isso de empate seria aprovar o aluno
 * antes de a partida ter acabado.
 *
 * A trava do lance de captura é o que fecha o buraco mais comum: se a peça do
 * aluno está pendurada agora, a posição não é empate nenhum — é uma peça a
 * menos daqui a um lance.
 */
function forcasIguaisSemPeoes(game: Chess): boolean {
  const brancas = forcaDe(game, "w");
  const pretas = forcaDe(game, "b");
  if (brancas.length !== 1 || brancas !== pretas) return false;
  if (!"rbn".includes(brancas)) return false;
  return !game.moves({ verbose: true }).some((lance) => lance.captured);
}

export type OutcomeOptions = {
  /**
   * Encerrar como empate a posição de forças iguais e sem peões (T vs T, B vs
   * B, C vs C), mesmo com a chess.js dizendo que a partida continua.
   *
   * **Ligada só na prática de objetivo empate** (§7 do plano da FN1). O motivo
   * é que a chess.js não tem esta noção: `isInsufficientMaterial()` é `false`
   * em torre contra torre, e com razão — em tese uma torre se ganha. Na prática
   * de uma aula de Filidor, o peão cai, sobra T vs T, e sem isto a partida
   * arrastaria até os 50 lances antes de dizer ao aluno o que ele já tinha
   * conseguido.
   *
   * **O que esta trava não faz:** ela não calcula. Não enxerga espeto em dois
   * lances nem posição em que a peça se perde à força. O que ela cobre é o caso
   * comum — forças iguais, nada pendurado — e por isso só é ligada onde um
   * empate declarado cedo demais favorece quem já estava defendendo. Numa
   * prática de vitória ela **nunca** entra: lá ela roubaria do aluno a partida
   * que ele ainda podia ganhar.
   */
  balancedPawnlessIsDraw?: boolean;
};

/**
 * Lê o fim de partida da chess.js e devolve o motivo já em português.
 * Ordem importa: mate antes de afogamento, material insuficiente antes de
 * "empate" genérico — é o que o aluno precisa ver num final de rei e peão.
 *
 * ## Uma armadilha que decide o desenho de quem chama
 *
 * As duas razões de empate por regra **não são simétricas**:
 *
 * - `isDrawByFiftyMoves()` lê o relógio de meio-lance, que é o quinto campo da
 *   FEN. Sobrevive a `new Chess(fen)`.
 * - `isThreefoldRepetition()` **não**. Ela conta posições no histórico da
 *   instância, e uma FEN não carrega histórico nenhum.
 *
 * Consequência prática: quem reconstrói a partida a cada lance com
 * `new Chess(fenAtual)` **nunca** detecta repetição, e toda partida arrasta até
 * os 50 lances. É por isso que a etapa 5 guarda `(fen inicial, lances)` e
 * reconstrói a partida inteira, em vez de guardar a posição corrente.
 */
export function readOutcome(game: Chess, options: OutcomeOptions = {}): GameOutcome {
  if (!game.isGameOver()) {
    // Antes do `{ over: false }`, e só aqui: a chess.js não conhece este fim, e
    // por isso ele não pode vir depois de `isGameOver()`.
    if (options.balancedPawnlessIsDraw && forcasIguaisSemPeoes(game)) {
      return {
        over: true,
        result: "draw",
        reason: "Forças iguais e sem peões — não há mais o que ganhar: empate.",
      };
    }
    return { over: false };
  }

  if (game.isCheckmate()) {
    // Quem levou o mate é quem está na vez de jogar.
    const loser = game.turn();
    return {
      over: true,
      result: loser === "w" ? "win-black" : "win-white",
      reason: "Xeque-mate.",
    };
  }
  if (game.isStalemate()) {
    return { over: true, result: "draw", reason: "Rei afogado — empate." };
  }
  // Antes das regras de contagem, de propósito: num final de torre, entregar a
  // peça acaba em material insuficiente, e é isso que o aluno precisa ouvir —
  // não "50 lances sem progresso", que seria verdade e não explicaria nada.
  if (game.isInsufficientMaterial()) {
    return {
      over: true,
      result: "draw",
      reason: "Material insuficiente para dar mate — empate.",
    };
  }
  // Os dois modos de fracasso mais comuns em final elementar: o aluno sabe dar
  // o mate mas demora, ou anda em círculos. Sem razão própria os dois caíam no
  // "Empate." genérico, e a aula não dizia o que houve.
  if (game.isDrawByFiftyMoves()) {
    return { over: true, result: "draw", reason: "50 lances sem progresso — empate." };
  }
  if (game.isThreefoldRepetition()) {
    return { over: true, result: "draw", reason: "A posição repetiu três vezes — empate." };
  }
  return { over: true, result: "draw", reason: "Empate." };
}

/**
 * Quantos lances ainda restam antes do empate por falta de progresso.
 *
 * O quinto campo da FEN conta **meios-lances** (um de cada cor); a regra fecha
 * em 100 deles, que é o que se chama de "50 lances". A etapa 5 mostra isso na
 * tela para o empate não cair do céu no lance 100.
 */
export function fiftyMoveProgress(game: Chess): { used: number; limit: number } {
  const halfmoves = Number(game.fen().split(" ")[4] ?? 0);
  return { used: Math.floor(halfmoves / 2), limit: 50 };
}
