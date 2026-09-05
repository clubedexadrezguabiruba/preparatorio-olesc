"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import Link from "next/link";
import type { PacoteDeAula } from "@/lib/finais/conteudo";
import { masteryReport } from "@/lib/lesson/mastery";
import {
  reviewKey,
  STAGE_LABEL,
  STAGE_ORDER,
  useLessonStore,
  type PracticeKey,
  type StageKey,
  type TreeKey,
} from "@/lib/lesson/store";
import { armAudioOnFirstGesture, isSoundOn, setSoundOn, subscribeSound } from "@/lib/sound";
import { ExampleStage } from "./ExampleStage";
import { MasterySeal } from "./MasterySeal";
import { ObjectiveStage } from "./ObjectiveStage";
import { PracticeStage } from "./PracticeStage";
import { ReviewStage } from "./ReviewStage";
import { TreeStage } from "./TreeStage";

/**
 * Orquestra a aula: qual etapa está aberta, o avanço entre elas e a montagem
 * do componente de cada uma. Toda a leitura de xadrez vem do arquivo da aula —
 * este componente não sabe as regras do jogo, só a ordem das etapas.
 */
export function LessonPlayer({
  bundle,
  startAt,
  marcacao,
}: {
  bundle: PacoteDeAula;
  /**
   * Onde a aula deve abrir. O aluno nunca passa isto — ele começa na etapa 1.
   *
   * Quem passa é o modo autor (B8): o painel remonta o motor por `key` a cada
   * salvamento, e sem isto o autor voltaria à etapa 1 a cada frase escrita.
   * Entra **na carga**, e não como restauração depois dela, porque restaurar
   * depois é uma corrida: o React em modo estrito reexecuta os efeitos da
   * subárvore recém-montada **depois** dos efeitos do pai, e o segundo `open()`
   * apagava a devolução. Medido em 2026-08-24, três vezes, 122 ms depois do
   * clique — e em silêncio, que é o que o tornava caro.
   */
  startAt?: {
    stage: StageKey;
    scene: number;
    step: number;
    /** Onde cada árvore parou. Sem isto, salvar desfaz o lance recém-jogado. */
    trees?: Partial<Record<TreeKey, { nodeId: string; studentMoves: number }>>;
  };
  /**
   * Só o modo autor (B8.3): liga o desenho com o botão direito nas etapas 2 e
   * 3 e diz o que desenhar. O aluno nunca recebe isto, e sem isto nada muda.
   */
  marcacao?: { shapes: DrawShape[] | null; onChange: (shapes: DrawShape[]) => void };
}) {
  const { lesson, positions } = bundle;
  const stage = useLessonStore((s) => s.stage);
  const lessonId = useLessonStore((s) => s.lessonId);
  const open = useLessonStore((s) => s.open);
  const goToStage = useLessonStore((s) => s.goToStage);
  const setExample = useLessonStore((s) => s.setExample);
  const treeSeek = useLessonStore((s) => s.treeSeek);
  const cleared = useLessonStore((s) => s.cleared);

  const available = STAGE_ORDER.filter((key) => lesson.stages[key] !== undefined);

  // Navegador nenhum toca áudio antes de um gesto. O primeiro toque na página
  // destrava o som — inclusive o clique que abre a etapa 2, que roda sozinha.
  useEffect(() => armAudioOnFirstGesture(), []);

  useEffect(() => {
    // As partidas das etapas 5 e 6 são registradas aqui, junto das raízes das
    // árvores: quem inicializa é a store, não a etapa — e assim trocar de aula
    // zera prática e revisão pelo mesmo caminho que zera as árvores.
    const practices: Array<{ key: PracticeKey; positionId: string; startFen: string }> = [];
    const practice = lesson.stages.practice;
    if (practice) {
      practices.push({
        key: "practice",
        positionId: practice.positionId,
        startFen: positions[practice.positionId].fen,
      });
    }
    for (const id of lesson.stages.review?.reviewPositionIds ?? []) {
      practices.push({ key: reviewKey(id), positionId: id, startFen: positions[id].fen });
    }

    // A etapa pedida só vale se ela existe nesta aula; senão, a primeira.
    const inicial =
      startAt && available.includes(startAt.stage) ? startAt.stage : available[0] ?? "objective";

    open(
      lesson.id,
      inicial,
      { guided: lesson.stages.guided?.root, solo: lesson.stages.solo?.root },
      practices,
    );
    // `open` zera a cena e o passo; devolvê-los aqui dentro mantém tudo numa
    // execução só, e por isso continua certo quando o efeito roda duas vezes.
    if (startAt && inicial === startAt.stage) setExample(startAt.scene, startAt.step);
    for (const [key, onde] of Object.entries(startAt?.trees ?? {})) {
      if (onde) treeSeek(key as TreeKey, onde.nodeId, onde.studentMoves);
    }
    // Reabrir a aula é o que zera o estado; o resto vem da store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  // Enquanto o efeito acima não rodou, a store ainda fala da aula anterior.
  if (lessonId !== lesson.id) return null;

  const nextStage = (from: StageKey): StageKey | null =>
    available[available.indexOf(from) + 1] ?? null;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        {/* No laboratório este link ia para `/`, que era o índice de aulas.
            Aqui `/` é a porta do site e o índice é `/finais` — apontar para a
            raiz mandaria o aluno para fora do curso no meio da aula. */}
        <Link
          href="/finais"
          className="text-xs font-medium text-tinta-fraca transition hover:text-tinta-media"
        >
          ← todas as aulas de finais
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="titulo">{lesson.title}</h1>
          <SoundToggle />
        </div>
      </header>

      <nav aria-label="Etapas da aula" className="flex flex-wrap gap-2">
        {available.map((key, index) => {
          const active = key === stage;
          return (
            <button
              key={key}
              type="button"
              onClick={() => goToStage(key)}
              aria-current={active ? "step" : undefined}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium ring-1 transition foco ${
                active
                  ? "bg-metodo-cheio text-tinta-inversa ring-metodo/30"
                  : "bg-carta text-tinta-media ring-borda hover:bg-carta-alta"
              }`}
            >
              {/* O numeral recua **só** na aba inativa. Na ativa ele herda a
                  tinta do botão: a aba cheia já é a barulhenta da fila, e um
                  cinza de fundo claro sobre o verde cheio media 1,39:1 — a pior
                  reprovação que a régua achou no B6.1. */}
              <span className={`tabular-nums ${active ? "" : "text-tinta-fraca"}`}>
                {index + 1}.
              </span>{" "}
              {STAGE_LABEL[key]}
            </button>
          );
        })}
      </nav>

      <section>
        {/* O objetivo depende do exemplo: os diagramas dele são quadros das
            cenas da etapa 2. O gate cobra a mesma dependência
            (`lessonSchema.superRefine`), e por isso a condição aqui pede as
            duas etapas em vez de só a primeira. */}
        {stage === "objective" && lesson.stages.objective && lesson.stages.example && (
          <div className="flex flex-col gap-6">
            <ObjectiveStage
              stage={lesson.stages.objective}
              example={lesson.stages.example}
              positions={positions}
              orientation={lesson.orientation}
            />
            <StageFooter
              next={nextStage("objective")}
              onGo={goToStage}
              label="Ver a técnica lance a lance"
            />
          </div>
        )}

        {stage === "example" && lesson.stages.example && (
          <div className="flex flex-col gap-6">
            <ExampleStage
              stage={lesson.stages.example}
              positions={positions}
              orientation={lesson.orientation}
              marcacao={marcacao}
            />
            <StageFooter next={nextStage("example")} onGo={goToStage} label="Agora é a sua vez" />
          </div>
        )}

        {stage === "guided" && lesson.stages.guided && (
          <TreeStage
            lesson={lesson}
            tree={lesson.stages.guided}
            treeKey="guided"
            position={positions[lesson.stages.guided.positionId]}
            orientation={lesson.orientation}
            allowHelp
            showBox={lesson.stages.guided.showBox}
            intro={lesson.stages.guided.intro}
            marcacao={marcacao}
            onFinish={() => {
              const next = nextStage("guided");
              if (next) goToStage(next);
            }}
            finishLabel="Ir para a etapa sem ajuda"
          />
        )}

        {stage === "solo" && lesson.stages.solo && (
          <TreeStage
            lesson={lesson}
            tree={lesson.stages.solo}
            treeKey="solo"
            position={positions[lesson.stages.solo.positionId]}
            orientation={lesson.orientation}
            allowHelp={false}
            moveLimit={lesson.stages.solo.moveLimit}
            intro="Posição nova, sem dica e sem destaque. É aqui que o domínio é aferido."
            onFinish={() => {
              const next = nextStage("solo");
              if (next) goToStage(next);
            }}
            finishLabel="Continuar"
          />
        )}

        {stage === "practice" && lesson.stages.practice && (
          <PracticeStage
            practiceKey="practice"
            position={positions[lesson.stages.practice.positionId]}
            orientation={lesson.orientation}
            goal={lesson.stages.practice.goal}
            engine={lesson.stages.practice.engine}
            intro="Agora é partida de verdade: o computador defende com tudo o que sabe, e nenhum lance é corrigido no caminho. Quem decide é o resultado."
            seal={
              <MasterySeal
                report={masteryReport({ soloCleared: cleared.solo, practiceWon: cleared.practice })}
                onGoToSolo={
                  lesson.stages.solo ? () => goToStage("solo") : undefined
                }
              />
            }
            onFinish={() => {
              const next = nextStage("practice");
              if (next) goToStage(next);
            }}
            finishLabel="Ir para a revisão"
          />
        )}

        {stage === "review" && lesson.stages.review && (
          <ReviewStage
            stage={lesson.stages.review}
            practice={lesson.stages.practice}
            positions={positions}
            orientation={lesson.orientation}
          />
        )}
      </section>
    </div>
  );
}

/**
 * Liga e desliga o som. A preferência mora no `localStorage`, fora do React —
 * por isso `useSyncExternalStore`: no servidor o som é "ligado", e a leitura
 * real do armazenamento entra na hidratação sem acusar divergência.
 */
function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!on)}
      aria-pressed={on}
      className="min-h-11 shrink-0 rounded-md bg-carta px-3 py-2 text-lg leading-none ring-1 ring-borda transition hover:bg-carta-alta foco"
    >
      <span aria-hidden>{on ? "🔊" : "🔇"}</span>
      <span className="sr-only">{on ? "Desligar o som" : "Ligar o som"}</span>
    </button>
  );
}

function StageFooter({
  next,
  onGo,
  label,
}: {
  next: StageKey | null;
  onGo: (stage: StageKey) => void;
  label: string;
}) {
  if (!next) return null;
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => onGo(next)}
        className="min-h-11 rounded-md bg-metodo-cheio px-4 py-2 text-sm font-medium text-tinta-inversa ring-1 ring-metodo/30 transition hover:bg-metodo-cheio-toque foco"
      >
        {label} →
      </button>
    </div>
  );
}
