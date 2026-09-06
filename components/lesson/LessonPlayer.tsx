"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import Link from "next/link";
import type { PacoteDeAula } from "@/lib/finais/conteudo";
import type { TentativaDeAula } from "@/lib/finais/gravar";
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
  onStageDone,
  leitura,
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
  /**
   * O que fazer quando uma etapa jogada termina — a server action que grava
   * (`app/finais/acoes.ts`), passada de fora.
   *
   * De fora, e não importada aqui, porque este componente é o motor de aula e
   * não sabe o que é Supabase: quem sabe é a rota. A mesma divisão do
   * `seal={<MasterySeal …/>}` logo abaixo — o motor diz *onde* e *quando*, o
   * site diz *o quê*.
   *
   * O que sobe são **os lances**, nunca um "dominei": quem decide se a etapa
   * saiu é `lib/finais/rejulgar.ts`, no servidor. Sem esta prop nada quebra —
   * é assim que a aula roda no modo autor, sem gravar linha nenhuma.
   */
  onStageDone?: (tentativa: TentativaDeAula) => void | Promise<unknown>;
  /**
   * O que a aula de **leitura** oferece no fim do exemplo: o controle de "eu li
   * até o fim".
   *
   * Vem pronto de fora pelo mesmo motivo que o `onStageDone`, e como elemento e
   * não como par de callbacks porque ele tem estado próprio (o que o banco já
   * sabe, e o toque otimista) que não é da aula. Aula que não é de leitura não
   * recebe nada, e nada aparece.
   */
  leitura?: ReactNode;
}) {
  const { lesson, positions } = bundle;
  const stage = useLessonStore((s) => s.stage);
  const lessonId = useLessonStore((s) => s.lessonId);
  const open = useLessonStore((s) => s.open);
  const goToStage = useLessonStore((s) => s.goToStage);
  const setExample = useLessonStore((s) => s.setExample);
  const treeSeek = useLessonStore((s) => s.treeSeek);
  const cleared = useLessonStore((s) => s.cleared);
  const solo = useLessonStore((s) => s.trees.solo);
  const practice = useLessonStore((s) => s.practices.practice);

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

  /**
   * A tentativa já mandada, para não mandá-la duas vezes.
   *
   * O `useEffect` roda de novo a cada mudança da fatia observada, e em modo
   * estrito roda duas vezes na montagem. A chave é `etapa:aula:tentativa`:
   * recomeçar a etapa vira uma tentativa nova (o `attempt` sobe) e volta a
   * gravar, que é o comportamento certo — o professor vê a evolução na
   * sequência de linhas, e é para isso que `tentativas_aula` não tem `update`.
   */
  const enviadas = useRef(new Set<string>());

  useEffect(() => {
    // `lessonId` é a trava contra o quadro em que a store ainda fala da aula
    // anterior e o `lesson.id` já é o da nova: sem ela, trocar de aula gravaria
    // os lances de uma no nome da outra.
    if (!onStageDone || lessonId !== lesson.id) return;

    const fim = (
      etapa: TentativaDeAula["etapa"],
      attempt: number,
      lances: string[],
      startedAt: number,
    ) => {
      const chave = `${etapa}:${lesson.id}:${attempt}`;
      if (enviadas.current.has(chave)) return;
      enviadas.current.add(chave);
      // Sem `await` e sem tela de espera: a gravação é o registro do que
      // aconteceu, não um passo da aula. O aluno já viu o selo, e uma falha de
      // rede aqui não pode travar o tabuleiro dele.
      void onStageDone({ aula: lesson.id, etapa, lances, tempoMs: Date.now() - startedAt });
    };

    // Fracasso grava tanto quanto acerto: é a tentativa que o professor precisa
    // ver. Quem decide o veredito é o servidor; daqui sobem só os lances.
    if (solo && solo.status !== "playing") {
      fim("solo", solo.attempt, solo.moves, solo.startedAt);
    }
    if (practice && practice.status !== "playing") {
      fim("pratica", practice.attempt, practice.moves, practice.startedAt);
    }
  }, [lesson.id, lessonId, onStageDone, practice, solo]);

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
            {/* Na aula de leitura não há etapa seguinte, e o rodapé acima não
                desenha nada: o fim do exemplo é o fim da aula, e é aqui que ela
                pergunta se foi lida. */}
            {leitura}
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
                report={masteryReport({
                  // O critério é o das etapas que **esta** aula tem: das 49 da
                  // trilha, 8 são completas (etapa 4 + etapa 5) e ~39 são curtas
                  // (só a etapa 5). Cobrar de uma aula curta a etapa sem ajuda
                  // seria mandar o aluno a uma aba que não existe.
                  hasSolo: lesson.stages.solo !== undefined,
                  hasPractice: true,
                  soloCleared: cleared.solo,
                  practiceWon: cleared.practice,
                  soloGoal: lesson.stages.solo?.goal,
                  practiceGoal: lesson.stages.practice.goal,
                })}
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
