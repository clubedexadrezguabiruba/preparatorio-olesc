import { Chess } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { toBoardColor } from "../chess/dests.ts";
import type { ExamplePhase, ExampleScene, ExampleStage, ExampleStep, FrameRef } from "./schema.ts";

/**
 * A aritmética da etapa 2, fora do componente.
 *
 * Estava toda dentro do `ExampleStage.tsx`, o que a tornava intestável e
 * inacessível ao gate. Agora o gate usa as mesmas funções para conferir o que
 * o aluno vai ver — que os quadros citados pela etapa 1 existem, e que a cena
 * termina onde diz terminar.
 *
 * Nada aqui avalia lance. A chess.js só aplica o que está escrito no arquivo,
 * para saber desenhar cada posição; quem julga xadrez é a tablebase, na
 * autoria (§3 do plano da F1).
 */

/** Uma posição da cena, pronta para o tabuleiro. */
export type Frame = {
  fen: string;
  lastMove: [Key, Key] | null;
  check: boolean;
  capture: boolean;
  mate: boolean;
  /** Lado matado, para o pulso do rei. `null` fora do mate. */
  matedColor: Color | null;
};

/**
 * Todos os quadros da cena, do inicial ao último lance.
 * `frames[0]` é a posição de partida — daí `frames.length === steps.length + 1`.
 */
export function buildFrames(startFen: string, steps: ExampleStep[]): Frame[] {
  const game = new Chess(startFen);
  const built: Frame[] = [
    { fen: game.fen(), lastMove: null, check: false, capture: false, mate: false, matedColor: null },
  ];
  for (const item of steps) {
    const played = game.move({
      from: item.move.slice(0, 2),
      to: item.move.slice(2, 4),
      promotion: item.move.length > 4 ? item.move.slice(4) : undefined,
    });
    const mate = game.isCheckmate();
    built.push({
      fen: game.fen(),
      lastMove: [item.move.slice(0, 2) as Key, item.move.slice(2, 4) as Key],
      check: game.isCheck(),
      capture: Boolean(played.captured),
      mate,
      // Quem está para jogar num mate é o lado matado.
      matedColor: mate ? toBoardColor(game.turn()) : null,
    });
  }
  return built;
}

/** A cena com aquele id, ou `undefined`. */
export function sceneById(stage: ExampleStage, id: string): ExampleScene | undefined {
  return stage.scenes.find((scene) => scene.id === id);
}

/**
 * O quadro que a etapa 1 mostra quando o autor não escolhe nenhum: o último
 * da primeira cena. Como a primeira cena é a do "como termina", o diagrama de
 * abertura da aula é o **mate** — que é como Silman ensina, mostrando o fim
 * antes do caminho.
 */
export function defaultFrame(stage: ExampleStage): FrameRef {
  const first = stage.scenes[0];
  return { scene: first.id, step: first.steps.length };
}

/**
 * A fase que vale no lance `index` (0 = posição inicial), com a posição dela na
 * lista. `null` quando a cena não declara fases.
 */
export function phaseAt(
  scene: ExampleScene,
  index: number,
): { phase: ExamplePhase; number: number; total: number } | null {
  const phases = scene.phases;
  if (!phases || phases.length === 0) return null;
  // Antes do primeiro lance vale a primeira fase: é ela que o aluno vai ver.
  const lance = Math.max(1, index);
  let escolhida = 0;
  for (const [i, phase] of phases.entries()) {
    if (phase.fromStep <= lance) escolhida = i;
  }
  return { phase: phases[escolhida], number: escolhida + 1, total: phases.length };
}

/**
 * O autoplay deve parar antes de mostrar o lance `index + 1`?
 *
 * Para na fronteira de fase: é o respiro que separa "cortar" de "aproximar",
 * em vez de derramar trinta lances seguidos no aluno. O fim da cena para
 * sozinho, sem precisar de regra.
 */
export function pausesBefore(scene: ExampleScene, index: number): ExamplePhase | null {
  const proximo = index + 1;
  const phase = (scene.phases ?? []).find((p) => p.fromStep === proximo);
  // A primeira fase começa junto com a cena: parar ali seria parar antes de
  // qualquer coisa acontecer.
  return phase && proximo > 1 ? phase : null;
}

/**
 * Os desenhos que a **autoria** pediu para o lance: setas em azul, casas
 * destacadas em verde. Vêm por cima da geometria automática (`teachingShapes`),
 * que é o que a posição diz sozinha.
 */
export function authoredShapes(step: ExampleStep | null): DrawShape[] {
  if (!step) return [];
  return [
    ...(step.arrows ?? []).map(([from, to]) => ({
      orig: from as Key,
      dest: to as Key,
      brush: "blue",
    })),
    ...(step.highlights ?? []).map((square) => ({ orig: square as Key, brush: "green" })),
  ];
}
