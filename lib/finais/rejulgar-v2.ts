/**
 * O rejulgamento das etapas jogadas de uma aula v2, no servidor — especificação §20.2, plano
 * final §10.
 *
 * Mesmo princípio de `rejulgar.ts`: o navegador manda os lances, nunca um "acertei", e o
 * servidor joga tudo de novo com o **mesmo juiz** da tela. Puro: entra o pacote da publicação
 * que o aluno jogou (nunca o ativo), saem o veredito e o motivo.
 *
 * ## O treino, lance a lance, como o `TreeStage` o jogou
 *
 * A ordem de `TreeStage.play` é reproduzida sem atalho: o lance é tentado; se não é o do
 * método, elogio devolve a peça, recusa devolve a peça, e só a recusa que joga o resultado
 * fora **com teto de lances** encerra a tentativa. Se é o do método, termina ou o defensor
 * responde com `escolherResposta(chaveDoDefensor("guided", pergunta), tentativa)` — a mesma
 * conta, a mesma árvore e o mesmo número de tentativa que a tela usou. É por isso que o
 * número da tentativa sobe junto: sem ele, duas defesas seriam indistinguíveis.
 */
import { Chess } from "chess.js";
import { ARVORE_DO_DEFENSOR_V2 } from "../editor-v2/ganchos-do-treino.ts";
import type { PacoteV2 } from "../editor-v2/pacote.ts";
import { posicoesDoPacoteV2 } from "../editor-v2/pacote.ts";
import { treinoJogavel } from "../editor-v2/treino-jogavel.ts";
import { chaveDoDefensor, escolherResposta } from "../lesson/defensor.ts";
import { isPraise, judgeMove, throwsWinAway } from "../lesson/tree.ts";
import { rejulgarPartidaDe, type Rejulgamento } from "./rejulgar.ts";

/** O teto de lances de uma lista vinda da rede, como em `rejulgar.ts`. */
const LANCES_MAXIMOS = 400;

export function rejulgarPraticaV2(pacote: PacoteV2, praticaId: string, lances: string[]): Rejulgamento {
  const pratica = pacote.aula.praticas.find((item) => item.id === praticaId);
  if (!pratica) return { erro: "a aula não tem essa prática" };
  const posicao = posicoesDoPacoteV2(pacote)[pratica.positionId];
  if (!posicao) return { erro: "a posição da prática não está no pacote" };
  return rejulgarPartidaDe({ fen: posicao.fen, goal: pratica.objetivo, lado: pratica.ladoAluno }, lances);
}

function legal(fen: string, uci: string): boolean {
  try {
    return Boolean(new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined }));
  } catch {
    return false;
  }
}

export function rejulgarTreinoV2(pacote: PacoteV2, treinoId: string, lances: string[], tentativaNumero: number): Rejulgamento {
  if (!pacote.aula.treinos.some((item) => item.id === treinoId)) return { erro: "a aula não tem esse treino" };
  if (!Number.isInteger(tentativaNumero) || tentativaNumero < 1) return { erro: "número de tentativa inválido" };
  if (lances.length === 0) return { erro: "treino sem lance nenhum" };
  if (lances.length > LANCES_MAXIMOS) return { erro: "lances demais para um treino" };

  const jogavel = treinoJogavel(pacote.aula, treinoId, posicoesDoPacoteV2(pacote));
  const { tree, lesson, moveLimit } = jogavel;
  let nodeId = tree.root;
  let usados = 0;
  let desfecho: Rejulgamento | null = null;

  for (const [i, uci] of lances.entries()) {
    if (desfecho) return { erro: "a lista tem lances depois do fim do treino" };
    const node = tree.nodes[nodeId];
    if (!node) return { erro: "a árvore do treino não tem a pergunta alcançada" };
    if (!legal(node.fen, uci)) return { erro: `lance ilegal no lance ${i + 1}: ${uci}` };

    const veredito = judgeMove(lesson, node, uci);
    if (veredito.kind !== "method") {
      if (isPraise(veredito)) continue;
      if (moveLimit !== undefined && throwsWinAway(veredito)) desfecho = { sucesso: false, motivo: "o lance jogou o objetivo fora" };
      continue;
    }
    if (veredito.respostas.length === 0) {
      desfecho = { sucesso: true, motivo: "a linha chegou ao fim" };
      continue;
    }
    usados += 1;
    const { next } = escolherResposta(veredito.respostas, chaveDoDefensor(ARVORE_DO_DEFENSOR_V2, nodeId), tentativaNumero);
    nodeId = next;
    if (moveLimit !== undefined && usados >= moveLimit) desfecho = { sucesso: false, motivo: "acabaram os lances" };
  }
  return desfecho ?? { erro: "o treino não terminou" };
}
