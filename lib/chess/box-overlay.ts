import type { Color } from "@lichess-org/chessground/types";
import type { BoxBounds } from "./technique.ts";

/**
 * De limites de casa para retângulo na tela.
 *
 * O tabuleiro é uma grade 8×8, então cada casa vale 12,5% — e a conta toda é
 * feita em porcentagem, nunca em pixel: o tabuleiro do projeto é fluido, e foi
 * exatamente por medir em pixel que o CSS do chessground quebrou as coordenadas
 * (a armadilha registrada no `CLAUDE.md`).
 *
 * A orientação inverte os dois eixos porque girar o tabuleiro é girar a grade:
 * com as pretas embaixo, a coluna `a` passa a ser a última à direita e a
 * fileira 1 a de cima.
 */
export type BoxRect = {
  /** Distância da borda esquerda, em % da largura do tabuleiro. */
  left: number;
  /** Distância do topo, em % da altura. */
  top: number;
  width: number;
  height: number;
};

const CASA = 100 / 8;

export function boxRect(bounds: BoxBounds, orientation: Color): BoxRect {
  const { fileLo, fileHi, rankLo, rankHi } = bounds;
  const colunas = fileHi - fileLo + 1;
  const fileiras = rankHi - rankLo + 1;

  const left = orientation === "white" ? fileLo : 7 - fileHi;
  const top = orientation === "white" ? 7 - rankHi : rankLo;

  return {
    left: left * CASA,
    top: top * CASA,
    width: colunas * CASA,
    height: fileiras * CASA,
  };
}
