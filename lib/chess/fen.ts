import { Chess, validateFen } from "chess.js";

/**
 * As operações de FEN que o gate, o gerador de ramos e o modo autor usam nos
 * dois lados.
 * Moram aqui porque duplicá-las já custou uma divergência sutil uma vez: se a
 * identidade de posição do gerador não for **exatamente** a do validador, uma
 * transposição funde num lugar e não funde no outro.
 */

/**
 * Identidade da posição: peças, vez, roque e en passant — sem os contadores.
 * É o critério de "mesma posição" que funde transposições no mesmo nó.
 */
export function samePosition(a: string, b: string): boolean {
  const key = (fen: string) => fen.trim().split(/\s+/).slice(0, 4).join(" ");
  return key(a) === key(b);
}

export type Applied = { fen: string; game: Chess };

/** Aplica um lance em UCI. `null` quando o lance não é legal ali. */
export function applyUci(fen: string, uci: string): Applied | null {
  const game = new Chess(fen);
  try {
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
  } catch {
    return null;
  }
  return { fen: game.fen(), game };
}

/* ------------------------------------------------------------------ *
 * A posição é possível?
 * ------------------------------------------------------------------ */

function squareDistance(a: string, b: string): number {
  return Math.max(
    Math.abs(a.charCodeAt(0) - b.charCodeAt(0)),
    Math.abs(a.charCodeAt(1) - b.charCodeAt(1)),
  );
}

/**
 * O problema da FEN em português, ou `null` se ela é jogável.
 *
 * **Mora aqui, e não no gate, porque tem de haver um juiz só.** O montador de
 * posição do modo autor (B8.4) precisa recusar reis colados *antes* de salvar,
 * e o gate precisa recusar a mesma coisa na hora de aplicar. Duas cópias desta
 * função seriam duas opiniões sobre o que é uma posição possível — e a
 * divergência apareceria no pior momento: com a posição já montada e salva.
 *
 * Os dois erros abaixo do `validateFen` são exatamente os que uma posição
 * montada à mão comete o tempo todo: reis adjacentes, e o lado que não está na
 * vez em xeque (o que significaria que o lance anterior deixou o próprio rei
 * atacado — ilegal).
 */
/**
 * As mensagens da chess.js que o montador faz aparecer o tempo todo, em
 * português. O resto passa como veio: traduzir tudo seria manter um dicionário
 * inteiro do pacote, e o que interessa é o punhado que uma posição em
 * construção produz a cada peça posta.
 */
const EM_PORTUGUES: Array<[RegExp, string]> = [
  [/missing white king/i, "falta o rei branco"],
  [/missing black king/i, "falta o rei preto"],
  [/too many white kings/i, "há mais de um rei branco"],
  [/too many black kings/i, "há mais de um rei preto"],
  [/must contain 6 space[- ]delimited fields/i, "a FEN precisa dos 6 campos"],
  [/piece data does not contain 8 '\/'-delimited rows/i, "a FEN não tem as 8 fileiras"],
  [/invalid piece/i, "há um caractere que não é peça"],
  [/consecutive numbers/i, "há dois números seguidos numa fileira"],
  [/side-to-move is invalid/i, "o campo de quem joga não é `w` nem `b`"],
  [/castling availability is invalid/i, "o campo de roque é inválido"],
  [/en-passant square is invalid/i, "a casa de en passant é inválida"],
  [/half moves must be/i, "o contador de meios-lances é inválido"],
  [/move number must be/i, "o número do lance é inválido"],
];

function emPortugues(mensagem: string): string {
  for (const [padrao, traducao] of EM_PORTUGUES) {
    if (padrao.test(mensagem)) return traducao;
  }
  return mensagem;
}

export function fenProblem(fen: string): string | null {
  const basic = validateFen(fen);
  if (!basic.ok) return emPortugues(basic.error ?? "FEN recusada pela chess.js");

  let game: Chess;
  try {
    game = new Chess(fen);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  const whiteKing = game.findPiece({ type: "k", color: "w" })[0];
  const blackKing = game.findPiece({ type: "k", color: "b" })[0];
  if (!whiteKing || !blackKing) return "falta um dos reis";
  if (squareDistance(whiteKing, blackKing) <= 1) {
    return `reis adjacentes (${whiteKing} e ${blackKing})`;
  }

  const waiting = game.turn() === "w" ? blackKing : whiteKing;
  if (game.isAttacked(waiting, game.turn())) {
    return "o lado que não está na vez está em xeque";
  }
  return null;
}

/** Quantas peças a FEN tem. A tablebase Syzygy vai até 7. */
export function pieceCount(fen: string): number {
  return (fen.split(" ")[0].match(/[pnbrqkPNBRQK]/g) ?? []).length;
}
