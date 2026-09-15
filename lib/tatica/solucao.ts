import { applyUci } from "../chess/fen.ts";

/**
 * A solução de um problema errado, quadro a quadro — o que a tela do modo
 * rating percorre com ◀ ▶ depois do erro (revisão de 15/9, item 6).
 *
 * Antes a tela só jogava a linha sozinha, e o "Próximo" já funcionava enquanto
 * ela corria: o aluno podia seguir sem ter visto o lance que resolvia, e não
 * havia como voltar a um lance que passou rápido. Com os quadros prontos de
 * antemão, ir e voltar é trocar de índice — nenhum lance é recalculado, e um
 * quadro nunca discorda do anterior.
 */

export type Quadro = {
  readonly fen: string;
  /** O lance que chegou a esta posição, em casas (`["e2", "e4"]`), para o destaque. */
  readonly lance: readonly [string, string] | null;
  /** A cor do rei que levou mate aqui (`"w"` / `"b"`), ou `null`. */
  readonly mateDe: "w" | "b" | null;
  readonly captura: boolean;
  readonly xeque: boolean;
};

const casas = (uci: string): [string, string] => [uci.slice(0, 2), uci.slice(2, 4)];

/**
 * O quadro 0 é a posição em que o aluno tinha de jogar, com o lance do
 * adversário que levou a ela em destaque. Os seguintes são a linha certa, a
 * partir de `de.indice` — o lance que ele errou —, até o fim.
 *
 * Um lance que não se aplica (recorte corrompido) corta a lista ali: a tela
 * mostra até onde a linha é jogável, e não quebra.
 */
export function quadrosDaSolucao(solucao: readonly string[], de: { readonly fen: string; readonly indice: number }): Quadro[] {
  const anterior = solucao[de.indice - 1];
  const quadros: Quadro[] = [{ fen: de.fen, lance: anterior ? casas(anterior) : null, mateDe: null, captura: false, xeque: false }];
  let atual = de.fen;
  for (const uci of solucao.slice(de.indice)) {
    const depois = applyUci(atual, uci);
    if (!depois) break;
    atual = depois.fen;
    const jogado = depois.game.history({ verbose: true }).at(-1);
    quadros.push({
      fen: depois.fen,
      lance: casas(uci),
      mateDe: depois.game.isCheckmate() ? depois.game.turn() : null,
      captura: Boolean(jogado?.captured),
      xeque: depois.game.inCheck(),
    });
  }
  return quadros;
}
