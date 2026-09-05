"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color } from "@lichess-org/chessground/types";
import { BoxOverlay } from "@/components/board/BoxOverlay";
import { ChessBoard } from "@/components/board/ChessBoard";
import { teachingShapes } from "@/lib/chess/annotations";
import { authoredShapes, buildFrames, pausesBefore, phaseAt } from "@/lib/lesson/example";
import type { ExampleStage as ExampleStageData, Position } from "@/lib/lesson/schema";
import { useLessonStore } from "@/lib/lesson/store";
import { playComplete, playForMove } from "@/lib/sound";
import { LessonButton } from "./LessonButton";

/**
 * Etapa 2 — exemplo: a técnica rodando sozinha, em **cenas**.
 *
 * A etapa nasceu com uma cena só e vinte e cinco meios-lances corridos, e é
 * exatamente esse o formato que reprovou pedagogicamente: o iniciante absoluto
 * via um filme longo sem saber o que estava olhando. Três coisas mudam isso, e
 * as três vêm dos livros-base (Müller, Silman, Pandolfini), que convergem:
 *
 * 1. **Cenas.** Uma curta primeiro, mostrando *como termina* — Silman ensina de
 *    trás para frente —, e a linha inteira depois. Cada cena é um tabuleiro
 *    próprio, com `key` própria: sem isso as peças da segunda cena deslizariam
 *    das casas da primeira, animando um lance que não existe.
 * 2. **Fases nomeadas.** "Aproximar o rei", "encolher a caixa". O autoplay
 *    **para** na fronteira de cada uma: é o respiro que separa uma ideia da
 *    seguinte, em vez de derramar trinta lances no aluno.
 * 3. **A caixa desenhada** (`scene.showBox`), que é o que torna visível a
 *    própria técnica — ver `BoxOverlay`.
 *
 * Nada é calculado sobre xadrez aqui: os lances vêm do arquivo, e o gate já
 * provou que a linha inteira é jogável. A aritmética de quadros e fases mora em
 * `lib/lesson/example.ts`, testada e reusada pelo gate.
 */

/** As três velocidades, em milissegundos por lance. */
const SPEEDS = [
  { key: "slow", label: "Lento", ms: 4000 },
  { key: "normal", label: "Normal", ms: 2500 },
  { key: "fast", label: "Rápido", ms: 1500 },
] as const;

type SpeedKey = (typeof SPEEDS)[number]["key"];

export function ExampleStage({
  stage,
  positions,
  orientation,
  marcacao,
}: {
  stage: ExampleStageData;
  positions: Record<string, Position>;
  orientation: Color;
  /**
   * Só o modo autor (B8.3). Quando vem, a marcação da autoria sai do canal
   * automático e passa para o do usuário, onde pode ser redesenhada com o
   * botão direito. `shapes: null` quer dizer "use as do arquivo".
   */
  marcacao?: { shapes: DrawShape[] | null; onChange: (shapes: DrawShape[]) => void };
}) {
  const example = useLessonStore((s) => s.example);
  const setExample = useLessonStore((s) => s.setExample);

  /**
   * O autoplay é efêmero: vive aqui, não na store. Sair da etapa e voltar
   * recomeça a reprodução; o passo em si continua sendo estado da aula.
   */
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<SpeedKey>("normal");
  const speedMs = SPEEDS.find((s) => s.key === speed)?.ms ?? 2500;

  const sceneIndex = Math.min(example.scene, stage.scenes.length - 1);
  const scene = stage.scenes[sceneIndex];
  const lastScene = sceneIndex === stage.scenes.length - 1;

  const frames = useMemo(
    () => buildFrames(positions[scene.positionId].fen, scene.steps),
    [positions, scene],
  );

  const total = scene.steps.length;
  const index = Math.min(example.step, total);
  const frame = frames[index];
  const current = index > 0 ? scene.steps[index - 1] : null;
  const finished = index === total;

  const phase = phaseAt(scene, index);
  /**
   * A fase que começa no lance seguinte, quando há uma. Enquanto ela existir o
   * relógio fica parado — e o botão primário vira o convite para entrar nela.
   */
  const proximaFase = finished ? null : pausesBefore(scene, index);
  const running = playing && !finished && !proximaFase;

  // O som acompanha o lance que apareceu na tela — venha ele do relógio do
  // autoplay ou do botão. A ref evita tocar de novo quando o componente
  // re-renderiza sem mudar de passo (trocar a velocidade, por exemplo), e a
  // chave leva a cena junto: lance 3 da cena 1 e lance 3 da cena 2 são sons
  // diferentes.
  const sounded = useRef<string | null>(null);
  useEffect(() => {
    const chave = `${sceneIndex}:${index}`;
    if (sounded.current === chave) return;
    sounded.current = chave;
    const shown = frames[index];
    if (!shown.lastMove) return;
    if (shown.mate) playComplete();
    else playForMove({ capture: shown.capture, check: shown.check });
  }, [sceneIndex, index, frames]);

  // O relógio do autoplay. Um `setTimeout` por lance, refeito a cada passo:
  // trocar a velocidade no meio vale já no lance seguinte, sem gambiarra.
  useEffect(() => {
    if (!running) return;
    const handle = setTimeout(() => setExample(sceneIndex, index + 1), speedMs);
    return () => clearTimeout(handle);
  }, [running, sceneIndex, index, speedMs, setExample]);

  /** Avançar e voltar na mão pausam: quem assumiu o controle não quer briga. */
  const goTo = (next: number) => {
    setPlaying(false);
    if (next < 0 && sceneIndex > 0) {
      // Voltar do primeiro quadro de uma cena cai no último da anterior, e não
      // num beco: a etapa é uma sequência só, mesmo dividida em cenas.
      const anterior = stage.scenes[sceneIndex - 1];
      setExample(sceneIndex - 1, anterior.steps.length);
      return;
    }
    setExample(sceneIndex, Math.max(0, next));
  };

  const daAutoria = useMemo(() => authoredShapes(current), [current]);
  const shapes: DrawShape[] = useMemo(
    // A geometria vai por baixo; o que a autoria escreveu fica por cima. No
    // modo autor a segunda metade migra para o canal editável, senão o mesmo
    // destaque seria desenhado duas vezes.
    () => [...teachingShapes(frame.fen, frame.lastMove), ...(marcacao ? [] : daAutoria)],
    [daAutoria, frame, marcacao],
  );

  /** O botão primário muda de papel quatro vezes ao longo da etapa. */
  const primario = running
    ? { rotulo: "Pausar", acao: () => setPlaying(false) }
    : proximaFase
      ? {
          rotulo: `Continuar: ${proximaFase.title}`,
          acao: () => {
            setPlaying(true);
            setExample(sceneIndex, index + 1);
          },
        }
      : finished && !lastScene
        ? {
            rotulo: `Próxima cena: ${stage.scenes[sceneIndex + 1].title}`,
            acao: () => {
              setPlaying(true);
              setExample(sceneIndex + 1, 0);
            },
          }
        : finished
          ? {
              rotulo: "Assistir de novo",
              acao: () => {
                setPlaying(true);
                setExample(0, 0);
              },
            }
          : { rotulo: "Assistir", acao: () => setPlaying(true) };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="mx-auto w-full max-w-[min(88vw,26rem)] lg:mx-0 lg:w-[26rem] lg:shrink-0">
        <ChessBoard
          // Sem `key` por cena as peças da cena seguinte deslizam das casas da
          // anterior: o chessground anima a diferença entre duas FENs, e entre
          // duas cenas essa diferença não é um lance.
          key={scene.id}
          fen={frame.fen}
          orientation={orientation}
          lastMove={frame.lastMove}
          check={frame.check}
          shapes={shapes}
          // A etapa 2 recebe o pulso também: é onde o aluno vê a técnica pela
          // primeira vez, e ela termina em mate na tela.
          matedKing={frame.matedColor}
          overlay={scene.showBox ? <BoxOverlay fen={frame.fen} orientation={orientation} /> : undefined}
          desenhavel={
            marcacao
              ? { shapes: marcacao.shapes ?? daAutoria, onChange: marcacao.onChange }
              : undefined
          }
          viewOnly
        />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {/* Fora da região viva: um contador que muda a cada lance viraria
            tagarelice no leitor de tela, e o número já está na tela. */}
        <p className="rotulo text-tinta-fraca">
          {stage.scenes.length > 1
            ? `Cena ${sceneIndex + 1} de ${stage.scenes.length} · ${scene.title} · lance ${index} de ${total}`
            : `Lance ${index} de ${total}`}
        </p>

        <div
          aria-live="polite"
          className="min-h-20 rounded-lg border border-borda bg-carta px-4 py-3 text-sm leading-relaxed text-tinta-media"
        >
          {/* O nome da fase entra na **mesma** região viva que o texto do
              lance: quem não vê a tela precisa ouvir a virada de fase junto com
              o lance que a abre, não como um anúncio solto. */}
          <div key={`${sceneIndex}:${index}`}>
            {phase && (
              <p className="rotulo mb-1 text-metodo">
                Fase {phase.number} de {phase.total} — {phase.phase.title}
              </p>
            )}
            <span>{current ? current.text : scene.intro}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <LessonButton variant="primary" onClick={primario.acao}>
            {primario.rotulo}
          </LessonButton>
          <LessonButton onClick={() => goTo(index - 1)} disabled={index === 0 && sceneIndex === 0}>
            Voltar
          </LessonButton>
          <LessonButton onClick={() => goTo(index + 1)} disabled={finished}>
            Avançar
          </LessonButton>
          <LessonButton
            onClick={() => {
              setExample(sceneIndex, 0);
              setPlaying(false);
            }}
            disabled={index === 0}
          >
            Repetir a cena
          </LessonButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            id="rotulo-velocidade"
            className="rotulo text-tinta-fraca"
          >
            Velocidade
          </span>
          <div role="group" aria-labelledby="rotulo-velocidade" className="flex gap-1">
            {SPEEDS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={speed === option.key}
                onClick={() => setSpeed(option.key)}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium ring-1 transition foco ${
                  speed === option.key
                    ? // `tinta` e não `tinta-inversa`: a aba ativa aqui é uma
                      // superfície neutra, não uma cor cheia. Tinta invertida
                      // sobre superfície neutra só funciona por acaso no tema
                      // escuro, e some no claro.
                      "bg-carta-toque text-tinta ring-borda-forte"
                    : "bg-carta text-tinta-fraca ring-borda hover:bg-carta-alta"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
