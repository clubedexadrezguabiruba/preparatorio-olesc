"use client";

import { useMemo, useRef, useState } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { BoxOverlay } from "@/components/board/BoxOverlay";
import { ChessBoard } from "@/components/board/ChessBoard";
import { teachingShapes } from "@/lib/chess/annotations";
import { authoredShapes, buildFrames, defaultFrame, sceneById } from "@/lib/lesson/example";
import type {
  ExampleStage as ExampleStageData,
  FrameRef,
  ObjectiveStage as ObjectiveStageData,
  Position,
} from "@/lib/lesson/schema";

/**
 * Etapa 1 — objetivo: o que se vai aprender, e o critério de domínio por
 * extenso (§6 do plano: o aluno precisa saber de antemão o que conta como
 * "dominado").
 *
 * **O diagrama não é mais uma posição parada.** A etapa mostra *quadros* das
 * cenas da etapa 2 — a posição depois de N lances —, e cada regra da técnica
 * aponta o seu. Clicar numa regra move o tabuleiro para o momento em que ela
 * acontece; a regra que fala da caixa acende a caixa. Isso resolve o defeito
 * que reprovou a etapa: um iniciante lia "corte o rei" ao lado de um diagrama
 * onde nada estava cortado, e a frase não tinha onde grudar.
 *
 * Os quadros **não gastam teto de citação**: não são posições novas, são
 * momentos das posições que a etapa 2 já cita.
 */
export function ObjectiveStage({
  stage,
  example,
  positions,
  orientation,
}: {
  stage: ObjectiveStageData;
  /**
   * A etapa 2 inteira, porque é dela que saem os quadros. O gate garante que
   * uma aula com objetivo tem exemplo — daí não ser opcional aqui.
   */
  example: ExampleStageData;
  positions: Record<string, Position>;
  orientation: Color;
}) {
  /** Índice da regra escolhida; `null` = nenhuma, e vale o quadro de abertura. */
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const tabuleiroRef = useRef<HTMLDivElement>(null);

  const regra = escolhida === null ? null : stage.rules[escolhida];
  const ref: FrameRef = regra?.frame ?? stage.frame ?? defaultFrame(example);

  const quadro = useMemo(() => {
    // O gate já provou que a cena existe (`QUADRO_INVALIDO`); o `??` é só para
    // o TypeScript, e cair na primeira cena é o pior que pode acontecer.
    const cena = sceneById(example, ref.scene) ?? example.scenes[0];
    const frames = buildFrames(positions[cena.positionId].fen, cena.steps);
    const passo = Math.min(ref.step, cena.steps.length);
    return {
      frame: frames[passo],
      step: passo > 0 ? cena.steps[passo - 1] : null,
    };
  }, [example, positions, ref.scene, ref.step]);

  const shapes = useMemo(
    () => [
      ...teachingShapes(quadro.frame.fen, quadro.frame.lastMove),
      ...authoredShapes(quadro.step),
    ],
    [quadro],
  );

  const escolher = (indice: number) => {
    setEscolhida((atual) => (atual === indice ? null : indice));
    // No celular a lista fica **abaixo** do tabuleiro: clicar numa regra
    // mudaria um diagrama fora da tela, e o aluno não veria nada acontecer.
    // `block: "nearest"` não mexe em nada quando o tabuleiro já está visível,
    // que é o caso no desktop.
    tabuleiroRef.current?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div
        ref={tabuleiroRef}
        className="mx-auto flex w-full max-w-[min(88vw,26rem)] flex-col gap-2 lg:mx-0 lg:w-[26rem] lg:shrink-0"
      >
        <ChessBoard
          fen={quadro.frame.fen}
          orientation={orientation}
          lastMove={quadro.frame.lastMove}
          check={quadro.frame.check}
          shapes={shapes}
          overlay={regra?.box ? <BoxOverlay fen={quadro.frame.fen} orientation={orientation} /> : undefined}
          viewOnly
        />
        {/* A legenda é a única pista de que o diagrama mudou para quem clicou
            numa regra e rolou a tela. Fica viva pelo mesmo motivo. */}
        <p aria-live="polite" className="text-xs text-tinta-fraca">
          {regra ? `Mostrando: ${regra.title}` : "O que você vai conseguir fazer no fim da aula."}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tinta">{stage.technique.name}</h2>
          <p className="mt-1 text-sm leading-relaxed text-tinta-media">{stage.technique.summary}</p>
        </div>

        <p className="text-sm leading-relaxed text-tinta-media">{stage.why}</p>

        <div>
          <h3 className="rotulo text-tinta-fraca">A técnica, em {stage.rules.length} passos</h3>
          {/* `<ol>` e não `<ul>`: a ordem é a técnica. Cada item é um botão
              porque clicar nele muda o tabuleiro — e `aria-pressed` porque é
              um estado que fica ligado, não uma navegação. */}
          <ol className="mt-2 flex flex-col gap-2">
            {stage.rules.map((r, i) => {
              const ativa = escolhida === i;
              return (
                <li key={r.title}>
                  <button
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => escolher(i)}
                    className={`flex w-full gap-3 rounded-lg px-4 py-3 text-left ring-1 transition foco ${
                      ativa
                        ? "bg-carta-toque text-tinta ring-borda-forte"
                        : "bg-carta text-tinta-media ring-borda hover:bg-carta-alta"
                    }`}
                  >
                    <span className="rotulo shrink-0 tabular-nums text-metodo">{i + 1}</span>
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-tinta">{r.title}</span>
                      <span className="text-sm leading-relaxed">{r.text}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-lg border border-metodo-superficie/30 bg-metodo-superficie/5 px-4 py-3">
          <h3 className="rotulo text-metodo">
            O que conta como dominado
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-tinta-media">{stage.mastery}</p>
        </div>
      </div>
    </div>
  );
}
