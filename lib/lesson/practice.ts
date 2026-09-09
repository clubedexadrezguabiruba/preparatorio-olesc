import type { GameOutcome } from "../chess/status.ts";
import { CONSELHO_DO_EMPATE, VEREDITO } from "./falas.ts";

/**
 * O juiz da etapa 5 (plano da F1, §5).
 *
 * A etapa 5 é a única em que **lance nenhum é julgado**. Não há árvore, não há
 * `expects`, não há `winningMoves`: o aluno joga a partida inteira contra o
 * Stockfish e quem decide é o resultado. É a diferença entre saber a técnica e
 * conseguir executá-la contra alguém que resiste.
 *
 * Puro de propósito — sem DOM, sem chess.js, sem chessground. Recebe o desfecho
 * já lido por `readOutcome` e devolve o veredito com o texto pronto.
 */

export type PracticeGoal = "win" | "draw";
export type PracticeSide = "white" | "black";

export type PracticeVerdict =
  | { kind: "playing" }
  | { kind: "passed"; text: string }
  /**
   * `warn` (âmbar) para o empate, `bad` (rubro) para a derrota — a mesma
   * convenção que a etapa 4 já usa: estourar o teto de lances é âmbar, jogar a
   * vitória fora é rubro.
   */
  | { kind: "failed"; tone: "bad" | "warn"; text: string };

/**
 * O conselho que acompanha cada tipo de empate. Ter um texto só para "empatou"
 * seria desperdiçar a informação mais útil que a partida produziu: *como* o
 * aluno deixou a vitória escapar. Afogar o rei e andar em círculos são erros
 * diferentes, e a correção de cada um é diferente.
 *
 * O casamento é pelo texto que `readOutcome` produz, que é a única
 * classificação de empate que existe no projeto — duplicar a detecção aqui
 * criaria duas verdades.
 */
function conselhoDoEmpate(reason: string): string {
  if (reason.startsWith("Rei afogado")) return CONSELHO_DO_EMPATE.afogamento;
  if (reason.startsWith("Material insuficiente")) return CONSELHO_DO_EMPATE.materialInsuficiente;
  if (reason.startsWith("50 lances")) return CONSELHO_DO_EMPATE.cinquentaLances;
  if (reason.startsWith("A posição repetiu")) return CONSELHO_DO_EMPATE.repeticao;
  return CONSELHO_DO_EMPATE.outro;
}

/**
 * `outcome` vem de `readOutcome`; `side` é o lado do aluno (a `orientation` da
 * aula); `goal` é o campo `practice.goal` do arquivo.
 */
export function judgePractice(
  outcome: GameOutcome,
  goal: PracticeGoal,
  side: PracticeSide,
): PracticeVerdict {
  if (!outcome.over) return { kind: "playing" };

  const vitoriaDoAluno = outcome.result === (side === "white" ? "win-white" : "win-black");

  if (vitoriaDoAluno) {
    return {
      kind: "passed",
      text: `${outcome.reason} ${VEREDITO.venceu(goal)}`,
    };
  }

  if (outcome.result === "draw") {
    if (goal === "draw") {
      return {
        kind: "passed",
        text: `${outcome.reason} ${VEREDITO.empatouQuandoBastava}`,
      };
    }
    return { kind: "failed", tone: "warn", text: `${outcome.reason} ${conselhoDoEmpate(outcome.reason)}` };
  }

  // Sobrou a derrota: o computador venceu.
  return {
    kind: "failed",
    tone: "bad",
    text: `${outcome.reason} ${VEREDITO.perdeu}`,
  };
}
