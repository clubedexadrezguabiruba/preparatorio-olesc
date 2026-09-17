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

const SIMBOLO_DE_QUALIDADE: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

/**
 * O que vai no círculo da casa de destino: o primeiro dos seis símbolos de qualidade do lance.
 * `$14`, `$36` e os outros NAGs não têm círculo — aparecem na lista de lances, como no Lichess.
 */
export function simboloDoCirculo(nags: readonly number[] | undefined): string | null {
  const nag = nags?.find((item) => SIMBOLO_DE_QUALIDADE[item]);
  return nag === undefined ? null : SIMBOLO_DE_QUALIDADE[nag];
}
