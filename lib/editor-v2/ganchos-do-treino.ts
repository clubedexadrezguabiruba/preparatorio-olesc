/**
 * As entradas `v2` do `TreeStage` para um treino traduzido — as mesmas na prévia do editor e
 * na aula do aluno (fatia 7). Moravam dentro de `PreviaDoTreino.tsx`; saíram para cá quando
 * o aluno passou a jogar o mesmo treino, porque duas cópias do montador divergiriam na
 * primeira correção.
 */
import type { DrawShape } from "@lichess-org/chessground/draw";
import { desenhoDaAutoriaV2 } from "../chess/annotations.ts";
import { chaveDaDefesaFinal, chaveDaFalaDoDefensor, type TreinoJogavel } from "./treino-jogavel.ts";

/**
 * A árvore do defensor na conta da rotação (`chaveDoDefensor(árvore, pergunta)`).
 *
 * É a mesma em toda parte — prévia, aluno e rejulgamento no servidor —, e é `guided` porque
 * foi com ela que a rotação da prévia foi aprovada na 6C (tentativas 1, 2, 3 → d2, d3, d2).
 * Os ids de pergunta são únicos na aula (o validador cobra), então a chave não colide entre
 * dois treinos.
 */
export const ARVORE_DO_DEFENSOR_V2 = "guided";

export type GanchosDoTreinoV2 = {
  aberturaDoDefensor?: { fen: string; uci: string; texto?: string };
  defesaFinal: (nodeId: string, uci: string) => string | undefined;
  desenhoDoNo: (nodeId: string) => DrawShape[];
  falaDepoisDaDefesa: (nodeId: string, uciDoAluno: string, uciDoDefensor: string) => string | undefined;
  arvoreDoDefensor: string;
};

export function ganchosDoTreinoV2(jogavel: TreinoJogavel): GanchosDoTreinoV2 {
  return {
    ...(jogavel.defesaInicial
      ? { aberturaDoDefensor: { fen: jogavel.fenInicial, uci: jogavel.defesaInicial, ...(jogavel.textoDaDefesaInicial ? { texto: jogavel.textoDaDefesaInicial } : {}) } }
      : {}),
    defesaFinal: (nodeId, uci) => jogavel.defesasFinais[chaveDaDefesaFinal(nodeId, uci)],
    desenhoDoNo: (nodeId) => desenhoDaAutoriaV2(jogavel.desenhos[nodeId]),
    falaDepoisDaDefesa: (nodeId, uciDoAluno, uciDoDefensor) => jogavel.falasDoDefensor[chaveDaFalaDoDefensor(nodeId, uciDoAluno, uciDoDefensor)],
    arvoreDoDefensor: ARVORE_DO_DEFENSOR_V2,
  };
}
