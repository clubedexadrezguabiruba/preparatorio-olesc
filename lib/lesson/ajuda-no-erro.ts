import { Chess } from "chess.js";
import type { TreeNode } from "./schema.ts";

/**
 * A escada de ajuda quando o aluno erra o mesmo lance — feedback do aluno de 17/9/2026: no treino
 * guiado da aula B ele ouviu "tente de novo" sem fim, sem dica, sem ver o lance e sem caminho de
 * volta ao capítulo.
 *
 * Contada **no mesmo lance** (o nó da árvore, dentro da tentativa); acertar ou recomeçar zera.
 *
 * 1. primeiro erro: a dica — a do professor (`[DICA]`) ou a primeira frase do comentário do lance certo;
 * 2. segundo: a casa de onde sai a peça certa acende;
 * 3. terceiro em diante: a seta com o lance e o botão "Rever o capítulo".
 *
 * Do segundo degrau em diante a tentativa registra **ajuda** (é o lance mostrado, não pensado) — o
 * mesmo campo que o treino de finais já grava (§20.2). A dica do primeiro degrau é a mesma que a
 * parada sempre deu no erro, e não conta.
 *
 * Puro, sem React: o `TreeStage` só desenha o que sai daqui.
 */
export type AjudaNoErro = {
  degrau: 1 | 2 | 3;
  /** O que o painel acrescenta ao texto do erro. */
  texto: string | null;
  /** A casa de saída do lance certo (degrau 2 e 3). */
  casa: string | null;
  /** O lance certo, de onde para onde (degrau 3). */
  seta: [string, string] | null;
  /** Mostra "Rever o capítulo" (degrau 3). */
  rever: boolean;
  /** A tentativa passa a contar como ajudada. */
  contaComoAjuda: boolean;
};

/** A primeira frase, com o ponto — curta o bastante para caber depois do texto do erro. */
export function primeiraFrase(texto: string | undefined | null): string | null {
  const limpo = texto?.trim();
  if (!limpo) return null;
  const corte = /[.!?…](\s|$)/.exec(limpo);
  return corte ? limpo.slice(0, corte.index + 1) : limpo;
}

function sanDoLance(fen: string, uci: string): string | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san;
  } catch {
    return null;
  }
}

export function ajudaNoErro(node: Pick<TreeNode, "fen" | "expects">, erros: number, dica?: string | null): AjudaNoErro | null {
  if (erros < 1) return null;
  const certo = node.expects[0];
  const uci = certo?.moves[0];
  const degrau = (erros >= 3 ? 3 : erros) as 1 | 2 | 3;
  const pista = dica?.trim() || primeiraFrase(certo?.feedback);
  if (degrau === 1) {
    return { degrau, texto: pista ? `Dica: ${pista}` : null, casa: null, seta: null, rever: false, contaComoAjuda: false };
  }
  if (!uci) return { degrau, texto: pista ? `Dica: ${pista}` : null, casa: null, seta: null, rever: degrau === 3, contaComoAjuda: false };
  const origem = uci.slice(0, 2);
  const destino = uci.slice(2, 4);
  if (degrau === 2) {
    return { degrau, texto: "Olhe a peça da casa acesa.", casa: origem, seta: null, rever: false, contaComoAjuda: true };
  }
  const san = sanDoLance(node.fen, uci);
  return {
    degrau,
    texto: san ? `O lance é ${san}. Siga a seta.` : "Siga a seta.",
    casa: origem,
    seta: [origem, destino],
    rever: true,
    contaComoAjuda: true,
  };
}
