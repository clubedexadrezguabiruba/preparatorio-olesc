import type { Color, Key } from "@lichess-org/chessground/types";

/** Centro do selo, junto ao canto superior direito da casa de destino. */
export function posicaoDoNag(casa: Key, orientation: Color): { left: number; top: number } {
  const file = casa.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(casa[1]) - 1;
  const coluna = orientation === "white" ? file : 7 - file;
  const linha = orientation === "white" ? 7 - rank : rank;
  return {
    left: (coluna + 0.92) * 12.5,
    top: (linha + 0.08) * 12.5,
  };
}
