"use client";

import { Chess } from "chess.js";
import type { Color } from "@lichess-org/chessground/types";
import { boxRect } from "@/lib/chess/box-overlay";
import { boxBounds, boxSize, OutOfScopeError } from "@/lib/chess/technique";

export type BoxOverlayProps = {
  /** A posição, em FEN — a mesma que vai ao tabuleiro. */
  fen: string;
  /** De que lado o tabuleiro é visto, para girar o retângulo junto. */
  orientation?: Color;
};

/**
 * A caixa do rei, desenhada por cima do tabuleiro.
 *
 * É o retângulo que o livro-base do Müller chama de "prisão retangular" e o do
 * Silman de "the Box": as casas de onde o rei defensor não consegue sair. O
 * aluno iniciante não enxerga isso sozinho — ele vê uma torre num canto e um
 * rei no outro, e nada que ligue os dois. Desenhar a parede é o que transforma
 * "mexa a torre para a quarta fileira" em "olhe a prisão encolher".
 *
 * **Este componente é irmão do host do chessground, nunca filho.** O
 * chessground toma conta dos filhos do próprio host, e o React não mexe lá
 * dentro (ver `ChessBoard.tsx`). Quem alinha o retângulo com as casas de
 * verdade é a camada `.tabuleiro-camada`, que o `ChessBoard` desenha em volta
 * do que vier na prop `overlay`.
 *
 * **Some sozinho quando não há caixa.** Área 64 é o tabuleiro inteiro — não é
 * uma prisão, é a ausência de uma —, e posição fora de escopo (mais de três
 * peças, ou sem torre/dama) não tem caixa definida. Nos dois casos não desenha
 * nada, em vez de desenhar uma moldura em volta do tabuleiro que não quer
 * dizer coisa nenhuma.
 */
export function BoxOverlay({ fen, orientation = "white" }: BoxOverlayProps) {
  // No mate não há prisão, há fim. E a geometria discorda: o retângulo de
  // paredes seladas continua existindo — no mate do Müller ele mede 16 casas,
  // porque a torre que dá o xeque deixa de selar a coluna onde estava. Desenhar
  // uma caixa grande justo no lance que a aula inteira persegue diria o
  // contrário do que aconteceu.
  if (new Chess(fen).isCheckmate()) return null;

  let rect;
  try {
    const bounds = boxBounds(fen);
    if (boxSize(bounds) === 64) return null;
    rect = boxRect(bounds, orientation);
  } catch (erro) {
    // Fora de escopo é caso normal, não defeito: a etapa pode pedir a caixa e
    // a cena passar por uma posição que não é KRK/KQK. Qualquer outro erro
    // continua subindo.
    if (erro instanceof OutOfScopeError) return null;
    throw erro;
  }

  return (
    <div
      data-caixa
      aria-hidden
      className="caixa-rei"
      style={{
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      }}
    />
  );
}
