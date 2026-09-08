"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Color, Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { buildFrames } from "@/lib/lesson/example";
import type { ExerciseItem, ExercisesStage as ExercisesStageData, Lesson, Position } from "@/lib/lesson/schema";
import { exerciseKey, useLessonStore, type PanelMessage } from "@/lib/lesson/store";
import { REPLY_DELAY_MS } from "@/lib/lesson/timing";
import { judgeMove, toUci } from "@/lib/lesson/tree";
import { playComplete, playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { Confetti } from "./Confetti";
import { FeedbackPanel } from "./FeedbackPanel";
import { LessonButton } from "./LessonButton";
import { PulseRing } from "./PulseRing";

/**
 * A etapa de exercícios — a etapa que o meio-jogo trouxe (2026-09-08).
 *
 * O que ela **não** é: nem a etapa 3/4, onde o aluno conduz uma técnica lance a
 * lance até o mate, nem a etapa 5, onde ele joga uma partida. Aqui ele responde
 * **uma pergunta por posição** — "qual é o lance?" —, o livro diz se acertou, e
 * passa-se ao próximo. São os exercícios impressos de um capítulo do Yusupov,
 * na ordem dele, com os pontos dele.
 *
 * Nenhum lance é avaliado neste arquivo. `judgeMove` compara o UCI com as
 * listas do nó, exatamente como nas etapas de final: `expects` é o lance do
 * livro, `authorAlternatives` são os lances que o livro credita com pontos
 * menores, `mistakes` são os que ele nomeia como ruins, e tudo o mais cai no
 * `fallbacks.losesWin` da aula — que numa aula M é escrito com vocabulário de
 * meio-jogo, não de final. Reusar o julgador foi a escolha que fez a etapa
 * caber no motor sem uma segunda opinião sobre o que é um lance certo.
 *
 * O que o servidor faz depois: `onAttempt` é chamado a **cada** lance tentado,
 * certo ou errado, e a gravação rejulga o UCI contra a aula em disco. O que
 * está nesta tela é a resposta imediata ao aluno; o que conta ponto é lá.
 */
export function ExerciseStage({
  lesson,
  stage,
  positions,
  onAttempt,
}: {
  lesson: Lesson;
  stage: ExercisesStageData;
  positions: Record<string, Position>;
  /**
   * Um lance tentado. Chamada em toda tentativa, e não só no acerto: um item
   * errado três vezes e acertado na quarta é um dado diferente de um item
   * acertado de primeira, e é essa diferença que a régua do capítulo mede.
   */
  onAttempt?: (dados: {
    item: string;
    lance: string;
    acertou: boolean;
    apoio: boolean;
    tentativa: number;
    tries: number;
    tempo_ms: number;
  }) => void;
}) {
  const items = stage.items;
  const indice = useLessonStore((s) => s.exercise.item);
  const exercises = useLessonStore((s) => s.exercises);
  const message = useLessonStore((s) => s.message);
  const say = useLessonStore((s) => s.say);
  const celebrate = useLessonStore((s) => s.celebrate);
  const fadeFlash = useLessonStore((s) => s.fadeFlash);
  const openExercise = useLessonStore((s) => s.openExercise);
  const exerciseTry = useLessonStore((s) => s.exerciseTry);
  const exerciseDone = useLessonStore((s) => s.exerciseDone);
  const exerciseGiveUp = useLessonStore((s) => s.exerciseGiveUp);
  const exerciseRestart = useLessonStore((s) => s.exerciseRestart);
  const exerciseHint = useLessonStore((s) => s.exerciseHint);
  const exerciseReveal = useLessonStore((s) => s.exerciseReveal);

  const item: ExerciseItem | undefined = items[Math.min(indice, items.length - 1)];
  const state = item ? exercises[exerciseKey(item.id)] : undefined;
  const status = state?.status ?? "idle";

  /**
   * A posição desenhada durante o lance que o aluno acabou de acertar.
   *
   * Carrega o id do item a que pertence, como o `drawn` do `TreeStage` carrega
   * a tentativa: trocar de exercício aposenta o que estava desenhado sem
   * precisar de um efeito para limpar — e efeito que chama `setState` é
   * cascata de render, que o lint recusa com razão.
   */
  const [drawn, setDrawn] = useState<{
    itemId: string;
    fen: string;
    lastMove: [Key, Key];
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const [promotion, setPromotion] = useState<{ itemId: string; orig: Key; dest: Key } | null>(
    null,
  );
  const [celebration, setCelebration] = useState(0);
  const boardColumn = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O primeiro item é aberto ao montar: sem isto não haveria `ExerciseState`, e
  // o primeiro lance do aluno cairia num item que a store não conhece.
  useEffect(() => {
    if (item && !exercises[exerciseKey(item.id)]) openExercise(item.id, indice);
  }, [item, exercises, openExercise, indice]);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  useEffect(() => {
    if (!message?.square) return;
    const handle = setTimeout(fadeFlash, 1400);
    return () => clearTimeout(handle);
  }, [message?.seq, message?.square, fadeFlash]);

  const posicao = item ? positions[item.positionId] : undefined;
  const fenInicial = posicao?.fen ?? item?.node.fen ?? "";

  /**
   * Os quadros da solução do livro. Existem sempre, mas só são mostrados depois
   * que o item fecha — antes disso a solução impressa embaixo da pergunta é
   * exatamente o defeito dos livros de exposição que este módulo não copiou.
   */
  const frames = useMemo(
    () => (item && fenInicial ? buildFrames(fenInicial, item.reveal) : []),
    [item, fenInicial],
  );
  const mostrandoSolucao = status !== "idle";
  const revealIndex = Math.min(state?.revealIndex ?? 0, Math.max(frames.length - 1, 0));
  const quadro = mostrandoSolucao ? frames[revealIndex] : undefined;

  /** O desenho só vale para o item que o produziu; ver o comentário no `useState`. */
  const desenho = drawn?.itemId === item?.id ? drawn : null;
  const boardFen = quadro?.fen ?? desenho?.fen ?? fenInicial;
  const lastMove = (quadro?.lastMove ?? desenho?.lastMove ?? null) as [Key, Key] | null;

  const board = useMemo(() => {
    if (!boardFen) return null;
    const game = new Chess(boardFen);
    return {
      turn: toBoardColor(game.turn()),
      check: game.isCheck(),
      mate: game.isCheckmate(),
      dests: legalDests(game),
    };
  }, [boardFen]);

  /**
   * De que lado o aluno vê o tabuleiro. Varia por exercício, e não por aula: na
   * mesma página o Yusupov põe seis diagramas, uns com as brancas jogando e
   * outros com as pretas. Sem o campo, é o lado a jogar da FEN — que é o caso
   * normal, e o que o glifo do diagrama diz.
   */
  const orientation: Color = useMemo(() => {
    if (item?.orientation) return item.orientation;
    if (!fenInicial) return "white";
    return toBoardColor(new Chess(fenInicial).turn());
  }, [item, fenInicial]);

  const interactive = status === "idle" && board !== null && board.turn === orientation;

  const panel: PanelMessage | null = message;

  const play = useCallback(
    (orig: Key, dest: Key, promoted?: PromotionChoice) => {
      if (!item || !state || status !== "idle") return;

      const uci = toUci(orig, dest, promoted);
      const apoio = state.hintOpen;
      const tries = state.tries + 1;
      exerciseTry(item.id, uci);

      const verdict = judgeMove(lesson, item.node, uci);
      // `method` é o lance do livro; `author-alternative` é o segundo lance que
      // o livro também credita. Os dois **resolvem** o exercício — a diferença
      // está nos pontos, não em estar certo. Todo o resto é erro.
      const acertou = verdict.kind === "method" || verdict.kind === "author-alternative";

      onAttempt?.({
        item: item.id,
        lance: uci,
        acertou,
        apoio,
        tentativa: state.attempt,
        tries,
        tempo_ms: Date.now() - state.startedAt,
      });

      if (!acertou) {
        // A peça já foi solta na casa errada; `revision` a traz de volta. O
        // exercício **não** fecha: o aluno tenta de novo quantas vezes quiser,
        // e o que a régua do capítulo mede é ter acertado de primeira.
        setRevision((r) => r + 1);
        playRefusal();
        say(verdict.preservesWin ? "warn" : "bad", verdict.text, dest);
        return;
      }

      const game = new Chess(item.node.fen);
      const played = game.move({ from: orig, to: dest, promotion: promoted });
      setDrawn({ itemId: item.id, fen: game.fen(), lastMove: [orig, dest] });

      // Os pontos do livro: os do item pelo lance principal, os menores da
      // alternativa quando o livro credita um segundo lance, e **zero** quando
      // o acerto não veio de primeira — que é a regra do Yusupov, e é ela que
      // faz a régua do capítulo significar alguma coisa.
      const cheio =
        verdict.kind === "method"
          ? item.pontos
          : (item.node.authorAlternatives?.find((a) => a.moves.includes(uci))?.pontos ?? 0);
      const ganhos = tries === 1 ? cheio : 0;

      playForMove({ capture: Boolean(played.captured), check: game.isCheck() });
      if (ganhos > 0) {
        playComplete();
        setCelebration((c) => c + 1);
      } else {
        playSuccess();
      }
      exerciseDone(item.id, ganhos);

      const nota =
        ganhos > 0
          ? `${ganhos} ponto${ganhos > 1 ? "s" : ""}.`
          : "Sem ponto desta vez — o livro conta a primeira tentativa.";
      celebrate(`${verdict.kind === "method" ? verdict.feedback : verdict.text} ${nota}`);

      // A solução do livro começa a rodar sozinha, um lance de cada vez, com o
      // mesmo respiro das outras etapas.
      timer.current = setTimeout(() => exerciseReveal(item.id, 1), REPLY_DELAY_MS);
    },
    [item, state, status, lesson, exerciseTry, exerciseDone, exerciseReveal, onAttempt, say, celebrate],
  );

  const handleMove = useCallback(
    (orig: Key, dest: Key) => {
      if (!item) return;
      const game = new Chess(item.node.fen);
      const peca = game.get(orig as never);
      const promove =
        peca?.type === "p" && (dest[1] === "8" || dest[1] === "1");
      if (promove) {
        setPromotion({ itemId: item.id, orig, dest });
        return;
      }
      play(orig, dest);
    },
    [item, play],
  );

  const desistir = useCallback(() => {
    if (!item || !state) return;
    exerciseGiveUp(item.id);
    say("warn", "Sem problema. Veja o lance do livro e o porquê dele.");
    timer.current = setTimeout(() => exerciseReveal(item.id, 1), REPLY_DELAY_MS);
  }, [item, state, exerciseGiveUp, exerciseReveal, say]);

  /* ---------------------------------------------------------------- *
   * A conta do capítulo, para a tela
   * ---------------------------------------------------------------- */

  const pontos = items.reduce((t, i) => t + (exercises[exerciseKey(i.id)]?.earned ?? 0), 0);
  const respondidos = items.filter((i) => exercises[exerciseKey(i.id)]?.status !== undefined
    && exercises[exerciseKey(i.id)]?.status !== "idle").length;
  const aprovado = pontos >= stage.aprovacao.minimo;

  if (!item || !posicao || !board) {
    return (
      <p className="rounded-lg border border-borda bg-carta px-4 py-6 text-sm leading-relaxed text-tinta-fraca">
        Esta aula ainda não tem exercícios escritos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {stage.intro && (
        <p className="text-sm leading-relaxed text-tinta-media">{stage.intro}</p>
      )}

      {/* O placar do capítulo. É a régua do livro, e ela é dita por extenso
          porque "aprovado com 15 de 31" só não parece frouxo para quem sabe que
          o número é do autor e que ele já conta com o aluno errando parte. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong
            className={`text-lg font-semibold ${aprovado ? "text-metodo-tinta" : "text-tinta"}`}
          >
            {pontos} de {stage.aprovacao.maximo} pontos
          </strong>
          <span className="rotulo text-tinta-fraca">
            {aprovado
              ? `aprovado — o livro pede ${stage.aprovacao.minimo}`
              : `faltam ${stage.aprovacao.minimo - pontos} para a nota de corte do livro (${stage.aprovacao.minimo})`}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-borda"
          role="progressbar"
          aria-valuenow={pontos}
          aria-valuemin={0}
          aria-valuemax={stage.aprovacao.maximo}
          aria-label="Pontos do capítulo"
        >
          <div
            className={`h-full rounded-full transition-[width] ${aprovado ? "bg-metodo-cheio" : "bg-tinta-fraca"}`}
            style={{ width: `${Math.min(100, (pontos / stage.aprovacao.maximo) * 100)}%` }}
          />
        </div>
      </div>

      <nav aria-label="Exercícios do capítulo" className="flex flex-wrap gap-2">
        {items.map((i, n) => {
          const est = exercises[exerciseKey(i.id)];
          const ativo = n === Math.min(indice, items.length - 1);
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => openExercise(i.id, n)}
              aria-current={ativo ? "true" : undefined}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium ring-1 transition foco ${
                ativo
                  ? "bg-metodo-cheio text-tinta-inversa ring-metodo/30"
                  : "bg-carta text-tinta-media ring-borda hover:bg-carta-alta"
              }`}
            >
              {n + 1}
              {est?.status === "done" && <span aria-label=", acertado"> ✓</span>}
              {est?.status === "failed" && <span aria-label=", visto sem acertar"> ✗</span>}
            </button>
          );
        })}
      </nav>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start">
        <div
          ref={boardColumn}
          className="relative mx-auto w-full max-w-[min(88vw,26rem)] lg:mx-0 lg:w-[26rem] lg:shrink-0"
        >
          <ChessBoard
            fen={boardFen}
            orientation={orientation}
            turnColor={board.turn}
            dests={interactive ? board.dests : new Map()}
            lastMove={lastMove}
            check={board.check}
            viewOnly={!interactive}
            revision={revision}
            shapes={message?.square ? [{ orig: message.square as Key, brush: "red" }] : []}
            matedKing={board.mate ? board.turn : null}
            onMove={handleMove}
          />
          <PulseRing tone={message && !message.done ? message.tone : null} seq={message?.seq ?? 0} />
          {promotion?.itemId === item.id && (
            <PromotionPicker
              color={board.turn}
              onChoose={(piece) => {
                const move = promotion;
                setPromotion(null);
                play(move.orig, move.dest, piece);
              }}
              onCancel={() => {
                setPromotion(null);
                setRevision((r) => r + 1);
              }}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <p className="rotulo text-tinta-fraca">
            Exercício {Math.min(indice, items.length - 1) + 1} de {items.length} ·{" "}
            {item.pontos} ponto{item.pontos > 1 ? "s" : ""} ·{" "}
            {orientation === "white" ? "brancas jogam" : "pretas jogam"}
            {(state?.attempt ?? 1) > 1 && ` · tentativa ${state?.attempt}`}
          </p>

          <FeedbackPanel
            message={panel}
            placeholder="Ache o lance e jogue-o no tabuleiro. Errar não fecha o exercício — só a primeira tentativa vale ponto."
          />

          {/* O texto do lance que está sendo mostrado na solução. */}
          {mostrandoSolucao && revealIndex > 0 && item.reveal[revealIndex - 1] && (
            <p className="rounded-lg border border-borda bg-carta px-4 py-3 text-sm leading-relaxed text-tinta-media">
              {item.reveal[revealIndex - 1].text}
            </p>
          )}

          {item.node.hint && status === "idle" && (
            <div className="flex flex-col gap-2">
              <div>
                <LessonButton onClick={() => exerciseHint(item.id)}>
                  {state?.hintOpen ? "Esconder a dica" : "Ver a dica"}
                </LessonButton>
              </div>
              {state?.hintOpen && (
                <p className="rounded-lg border border-dica-superficie/30 bg-dica-superficie/5 px-4 py-3 text-sm leading-relaxed text-dica-tinta">
                  {item.node.hint}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {status === "idle" && (
              <LessonButton onClick={desistir}>Ver o lance do livro</LessonButton>
            )}
            {mostrandoSolucao && revealIndex < frames.length - 1 && (
              <LessonButton
                variant="primary"
                onClick={() => exerciseReveal(item.id, revealIndex + 1)}
              >
                Próximo lance da solução
              </LessonButton>
            )}
            {mostrandoSolucao && indice < items.length - 1 && (
              <LessonButton
                variant={revealIndex >= frames.length - 1 ? "primary" : undefined}
                onClick={() => openExercise(items[indice + 1].id, indice + 1)}
              >
                Próximo exercício
              </LessonButton>
            )}
            {status !== "idle" && (
              <LessonButton onClick={() => exerciseRestart(item.id)}>
                Refazer este
              </LessonButton>
            )}
          </div>

          <p className="rotulo text-tinta-fraca">
            {respondidos} de {items.length} respondido(s)
          </p>
        </div>

        <Confetti seq={celebration} originRef={boardColumn} />
      </div>
    </div>
  );
}
