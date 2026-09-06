import { Chess } from "chess.js";
import { posicaoInicial } from "../tatica/conferir.ts";
import type { Puzzle } from "../tatica/puzzles.ts";

/**
 * A solução de um puzzle escrita como o aluno escreve na planilha.
 *
 * ## Por que traduzir a notação
 *
 * O `chess.js` escreve em inglês: `Nf3`, `Qxh7`, `Rd1`, `Kg1`. O caderno ensina
 * a notação **portuguesa** — `Cf3`, `Dxh7`, `Td1`, `Rg1` — e é essa que o aluno
 * vai usar na planilha do torneio. Um gabarito em inglês ensinaria a ler uma
 * coisa e a escrever outra.
 *
 * ## A troca tem de ser de uma vez só
 *
 * As duas linguagens compartilham letras com sentidos diferentes, e isso é uma
 * armadilha real:
 *
 * | inglês | peça | português |
 * |---|---|---|
 * | K | rei | **R** |
 * | Q | dama | **D** |
 * | R | torre | **T** |
 * | B | bispo | B |
 * | N | cavalo | **C** |
 *
 * Repare no `R`: em inglês é torre, em português é rei. Trocar em duas passadas
 * — primeiro `K`→`R`, depois `R`→`T` — transformaria todos os reis recém-
 * traduzidos em torres. Por isso a troca percorre a linha **uma vez**, letra a
 * letra, e nunca reexamina o que já escreveu.
 *
 * E só a **primeira** letra do lance é peça. Num lance como `Rb1` (torre para
 * b1, em inglês) o `b` é coluna, não bispo; num `exd5` o `e` é coluna. Traduzir
 * o resto da linha estragaria a casa de destino.
 */

/** Inglês → português, letra a letra. A ordem não importa: a troca é simultânea. */
const PECAS_PT: Record<string, string> = {
  K: "R",
  Q: "D",
  R: "T",
  B: "B",
  N: "C",
};

/**
 * Um lance em SAN inglês vira SAN português.
 *
 * O que muda é só a letra da peça, que é o primeiro caractere quando é
 * maiúscula. O resto — coluna, casa, `x`, `+`, `#`, `=`, o roque — é igual nas
 * duas línguas.
 */
export function lanceEmPortugues(san: string): string {
  const inicial = san[0];
  if (inicial === undefined || !(inicial in PECAS_PT)) return san;
  return PECAS_PT[inicial] + san.slice(1);
}

/**
 * A linha inteira da solução, numerada como numa planilha:
 * `1.Dxh7+ Rxh7 2.Th3#`
 *
 * A numeração começa em 1 mesmo quando a posição do puzzle é do lance 30 da
 * partida original — o aluno está resolvendo um exercício, não continuando uma
 * partida, e um "30..." no gabarito só levantaria uma pergunta que não tem
 * resposta na folha.
 *
 * Quando quem resolve são as **pretas**, a linha abre com `1...`, que é a
 * convenção que o próprio caderno ensina na seção de anotação.
 */
export function solucaoEmPortugues(p: Pick<Puzzle, "fen" | "lances">): string {
  const jogo = posicaoInicial(p);
  const pretasResolvem = jogo.turn() === "b";

  // `lances[0]` é o erro do adversário, que `posicaoInicial` já aplicou. A
  // solução começa no 1.
  const sans: string[] = [];
  for (const uci of p.lances.slice(1)) {
    const lance = jogo.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
    sans.push(lanceEmPortugues(lance.san));
  }

  if (sans.length === 0) throw new Error("puzzle sem solução depois do erro do adversário");

  const partes: string[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    const numero = Math.floor(i / 2) + 1;
    const abertura = pretasResolvem ? `${numero}...` : `${numero}.`;
    partes.push(sans[i + 1] === undefined ? abertura + sans[i] : `${abertura}${sans[i]} ${sans[i + 1]}`);
  }
  return partes.join(" ");
}

/**
 * A posição de um puzzle é mate no fim da linha?
 *
 * Usado só para a nota do gabarito: um puzzle de "ganha a dama" e um de "mate
 * em 2" merecem frases diferentes na resposta.
 */
export function terminaEmMate(p: Pick<Puzzle, "fen" | "lances">): boolean {
  const jogo = new Chess(p.fen);
  for (const uci of p.lances) {
    jogo.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
  }
  return jogo.isCheckmate();
}
