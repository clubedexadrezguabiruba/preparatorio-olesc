"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { BoxOverlay } from "@/components/board/BoxOverlay";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { teachingShapes } from "@/lib/chess/annotations";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { chaveDoDefensor, escolherResposta } from "@/lib/lesson/defensor";
import type { Lesson, MoveTree, Position } from "@/lib/lesson/schema";
import { isPraise, judgeMove, throwsWinAway, toUci } from "@/lib/lesson/tree";
import { restingMessage, useLessonStore, type PanelMessage, type TreeKey } from "@/lib/lesson/store";
import { REPLY_DELAY_MS } from "@/lib/lesson/timing";
import { playComplete, playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { Confetti } from "./Confetti";
import { FeedbackPanel } from "./FeedbackPanel";
import { LessonButton } from "./LessonButton";
import { PulseRing } from "./PulseRing";

/**
 * As palavras que mudam com o objetivo da árvore (FN1/B2).
 *
 * Metade dos 49 finais da trilha se ganha e a outra metade se segura. Os textos
 * fixos desta tela — "sem a vitória não há o que treinar", "o mate não saiu" —
 * foram escritos quando só existiam os dois mates da N0, e ditos a quem só
 * precisava empatar viram a aula cobrando o que ela mesma não pediu.
 *
 * Só o vocabulário muda. A mecânica é a mesma: quem decide se o lance preserva
 * o objetivo continua sendo a lista `winningMoves` do arquivo, gerada pela
 * tablebase na autoria.
 */
const ALVOS = {
  win: {
    /** "Sem ___ não há o que treinar." */
    oQue: "a vitória",
    /** "O teto de N lances acabou e ___." */
    oFim: "o mate não saiu",
  },
  draw: {
    oQue: "o empate",
    oFim: "o empate não veio",
  },
} as const;

/**
 * Etapas 3 e 4 — a árvore de lances (plano da F1, §3). A mesma mecânica serve
 * às duas; o que muda é a configuração: a etapa 3 tem dica, destaques e
 * retentativa ilimitada, a etapa 4 tira a ajuda, conta os lances e encerra a
 * tentativa no primeiro lance que joga o objetivo fora (§3.3).
 *
 * Nenhum lance é avaliado aqui: `judgeMove` compara com as listas do arquivo.
 * A chess.js entra só para dizer o que é legal e para mover as peças.
 */
export function TreeStage({
  lesson,
  tree,
  treeKey,
  position,
  orientation,
  allowHelp,
  showBox = false,
  moveLimit,
  intro,
  marcacao,
  onFinish,
  finishLabel,
}: {
  lesson: Lesson;
  tree: MoveTree;
  treeKey: TreeKey;
  position: Position;
  orientation: Color;
  allowHelp: boolean;
  /**
   * Desenha a caixa do rei por cima do tabuleiro. A etapa 3 liga (é a prática
   * *com* a zona visível, a ponte entre ver e fazer); a 4 nunca — o currículo
   * pede "caixa visual → prática com zona → mate limpo sem zona", e é na 4 que
   * o domínio é aferido.
   */
  showBox?: boolean;
  moveLimit?: number;
  intro?: string;
  /**
   * Só o modo autor (B8.3). Quando vem, os `highlights` do nó saem do canal
   * automático e passam para o do usuário, onde o botão direito os redesenha.
   * `shapes: null` quer dizer "use os do arquivo".
   */
  marcacao?: { shapes: DrawShape[] | null; onChange: (shapes: DrawShape[]) => void };
  onFinish?: () => void;
  finishLabel?: string;
}) {
  /** Ganhar ou segurar: vem da árvore, escrito no arquivo da aula. */
  const alvo = ALVOS[tree.goal];

  const state = useLessonStore((s) => s.trees[treeKey]);
  const message = useLessonStore((s) => s.message);
  const say = useLessonStore((s) => s.say);
  const celebrate = useLessonStore((s) => s.celebrate);
  const fadeFlash = useLessonStore((s) => s.fadeFlash);
  const treeTry = useLessonStore((s) => s.treeTry);
  const treeAdvance = useLessonStore((s) => s.treeAdvance);
  const treeFail = useLessonStore((s) => s.treeFail);
  const treeRestart = useLessonStore((s) => s.treeRestart);
  const toggleHint = useLessonStore((s) => s.toggleHint);

  /**
   * A posição desenhada enquanto o lance acontece; `null` = a do nó atual.
   * Carrega a tentativa a que pertence: recomeçar a etapa aposenta o que
   * estava desenhado sem precisar de um efeito para limpar.
   */
  const [drawn, setDrawn] = useState<{
    fen: string;
    lastMove: [Key, Key];
    attempt: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [promotion, setPromotion] = useState<{ orig: Key; dest: Key } | null>(null);
  /** Sobe uma vez a cada mate: é o que dispara o confete. */
  const [celebration, setCelebration] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** De onde o confete explode: o tabuleiro, não o centro da etapa. */
  const boardColumn = useRef<HTMLDivElement>(null);

  const node = state ? tree.nodes[state.nodeId] : undefined;
  const status = state?.status ?? "playing";
  const attempt = state?.attempt ?? 1;
  const overlay = drawn?.attempt === attempt ? drawn : null;
  /**
   * A etapa já concluída. Sair para outra etapa desmonta este componente e leva
   * junto o `drawn`; sem esta foto guardada na store, o tabuleiro voltaria ao
   * nó parado — que é o **anterior** ao mate — com a etapa fechada para lances.
   */
  const end = state?.end ?? null;
  const boardFen = overlay?.fen ?? end?.fen ?? node?.fen ?? position.fen;
  const lastMove = (overlay?.lastMove ?? end?.lastMove ?? null) as [Key, Key] | null;
  /**
   * O desfecho sobrevive à navegação entre etapas: `goToStage` apaga a mensagem
   * viva, e o texto — conclusão ou tentativa encerrada — volta da árvore.
   * Derivado, e não reescrito na store ao montar: sem efeito, sem risco de laço.
   */
  const panel: PanelMessage | null = message ?? restingMessage(state);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  /** Volta ao nó raiz. Cancela a resposta do defensor que estava a caminho. */
  const restart = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setPromotion(null);
    treeRestart(treeKey);
  }, [treeRestart, treeKey]);

  // O reforço visual na casa é breve de propósito: some sozinho, o texto fica.
  useEffect(() => {
    if (!message?.square) return;
    const handle = setTimeout(fadeFlash, 1400);
    return () => clearTimeout(handle);
  }, [message?.seq, message?.square, fadeFlash]);

  const board = useMemo(() => {
    const game = new Chess(boardFen);
    return {
      turn: toBoardColor(game.turn()),
      check: game.isCheck(),
      // Quem está para jogar num mate é o lado matado. Derivado da posição na
      // tela, então não precisa de estado novo nem de efeito: fica certo até se
      // uma aula futura ensinar o lado da defesa.
      mate: game.isCheckmate(),
      dests: legalDests(game),
    };
  }, [boardFen]);

  const interactive = status === "playing" && !busy && board.turn === orientation;

  const shapes: DrawShape[] = useMemo(() => {
    // Os destaques automáticos (corte e peça pendurada) saem da posição que
    // está na tela, então continuam certos mesmo durante a animação do lance.
    // A etapa 4 não recebe nenhum: é lá que o domínio é aferido.
    const list: DrawShape[] = allowHelp ? teachingShapes(boardFen, lastMove) : [];
    // Os destaques da autoria valem para o nó parado; enquanto o lance está
    // sendo desenhado eles sairiam do lugar, então somem. No modo autor eles
    // migram para o canal editável, senão sairiam desenhados duas vezes.
    if (allowHelp && !marcacao && !overlay && status === "playing" && node) {
      for (const square of node.highlights ?? []) list.push({ orig: square as Key, brush: "green" });
    }
    if (message?.square) list.push({ orig: message.square as Key, brush: "red" });
    return list;
  }, [allowHelp, boardFen, lastMove, marcacao, overlay, status, node, message]);

  /** Os destaques que o arquivo guarda para este nó, no formato do tabuleiro. */
  const daAutoria: DrawShape[] = useMemo(
    () => (node?.highlights ?? []).map((square) => ({ orig: square as Key, brush: "green" })),
    [node],
  );

  const play = useCallback(
    (orig: Key, dest: Key, promoted?: PromotionChoice) => {
      if (!node || !state || status !== "playing" || busy) return;

      const uci = toUci(orig, dest, promoted);
      // Antes de julgar: o histórico guarda o que a mão do aluno fez, e o
      // recusado também é lance jogado. É esta lista que a FN1/B4 manda ao
      // servidor no fim da etapa, para ele reconferir em vez de acreditar.
      treeTry(treeKey, uci);
      const verdict = judgeMove(lesson, node, uci);

      if (verdict.kind !== "method") {
        // A peça já foi solta na casa errada; `revision` a traz de volta.
        setRevision((r) => r + 1);

        // Elogio, não recusa: a mesma técnica por outro caminho (a máquina, só
        // na etapa 3) ou o lance que a autoria declarou válido (B8.2, nas duas
        // etapas). Sem reforço vermelho na casa, sem `playRefusal`, e sem
        // gastar lance do teto — a peça volta só para a linha escrita
        // continuar. Quem sabe quais vereditos são elogio é o `tree.ts`.
        if (isPraise(verdict)) {
          playSuccess();
          say("good", verdict.text);
          return;
        }

        playRefusal();
        const fatal = moveLimit !== undefined && throwsWinAway(verdict);
        if (fatal) {
          const text = `${verdict.text} Sem ${alvo.oQue} não há o que treinar: a tentativa acabou.`;
          treeFail(treeKey, { tone: "bad", text });
          say("bad", text, dest);
        } else {
          say(verdict.preservesWin ? "warn" : "bad", verdict.text, dest);
        }
        return;
      }

      const game = new Chess(node.fen);
      const played = game.move({ from: orig, to: dest, promotion: promoted });
      const afterFen = game.fen();
      setDrawn({ fen: afterFen, lastMove: [orig, dest], attempt });

      // Nó terminal: o lance deu mate (o gate provou que dá) — a etapa acaba.
      // A posição do mate vai junto para a store: é a única cópia dela, porque
      // lance terminal não tem nó de destino.
      if (verdict.respostas.length === 0) {
        playComplete();
        setCelebration((c) => c + 1);
        treeAdvance(treeKey, null, {
          fen: afterFen,
          lastMove: [orig, dest],
          text: verdict.feedback,
        });
        celebrate(verdict.feedback);
        return;
      }

      playForMove({ capture: Boolean(played.captured), check: game.isCheck() });

      const used = state.studentMoves + 1;
      const outOfMoves = moveLimit !== undefined && used >= moveLimit;
      say("good", verdict.feedback);

      setBusy(true);
      // Qual variante o defensor joga nesta tentativa (B9/E6). Determinístico:
      // estável dentro da tentativa, diferente na seguinte. Com uma variante
      // só — 100% do corpus de hoje — a conta devolve sempre a mesma, e o
      // comportamento da aula publicada não muda.
      const { reply, next } = escolherResposta(
        verdict.respostas,
        chaveDoDefensor(treeKey, state.nodeId),
        attempt,
      );
      timer.current = setTimeout(() => {
        const after = new Chess(afterFen);
        const answered = after.move({
          from: reply.slice(0, 2),
          to: reply.slice(2, 4),
          promotion: reply.length > 4 ? reply.slice(4) : undefined,
        });
        playForMove({ capture: Boolean(answered.captured), check: after.isCheck() });
        setDrawn({
          fen: after.fen(),
          lastMove: [reply.slice(0, 2) as Key, reply.slice(2, 4) as Key],
          attempt,
        });
        treeAdvance(treeKey, next);
        setBusy(false);
        if (outOfMoves) {
          const text = `O teto de ${moveLimit} lances acabou e ${alvo.oFim}. Recomece: o método precisa caber no limite.`;
          treeFail(treeKey, { tone: "warn", text });
          say("warn", text);
        }
      }, REPLY_DELAY_MS);
    },
    [
      alvo,
      attempt,
      busy,
      celebrate,
      lesson,
      moveLimit,
      node,
      say,
      state,
      status,
      treeAdvance,
      treeFail,
      treeKey,
      treeTry,
    ],
  );

  const handleMove = useCallback(
    (orig: Key, dest: Key) => {
      if (!interactive) {
        setRevision((r) => r + 1);
        return;
      }
      const candidates = new Chess(boardFen)
        .moves({ verbose: true })
        .filter((move) => move.from === orig && move.to === dest);
      if (candidates.length === 0) {
        setRevision((r) => r + 1);
        // Era a única recusa muda do arquivo. Com o anel de pulso ficaria cor
        // sem som, o que soa como bug.
        playRefusal();
        say("bad", "Esse lance não é legal nesta posição.", dest);
        return;
      }
      if (candidates.some((move) => move.promotion)) {
        setPromotion({ orig, dest });
        return;
      }
      play(orig, dest);
    },
    [boardFen, interactive, play, say],
  );

  if (!state || !node) return null;

  const hintAvailable = allowHelp && Boolean(node.hint);

  // A raiz é `relative` **sem `z-index`**, de propósito: assim não cria
  // contexto de empilhamento novo e as camadas de hoje (canvas `z-10`, promoção
  // `z-20`) continuam valendo. Também não leva `overflow-hidden` — cortaria o
  // `box-shadow` do anel de pulso.
  return (
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
          shapes={shapes}
          matedKing={board.mate ? board.turn : null}
          overlay={showBox ? <BoxOverlay fen={boardFen} orientation={orientation} /> : undefined}
          desenhavel={
            marcacao
              ? { shapes: marcacao.shapes ?? daAutoria, onChange: marcacao.onChange }
              : undefined
          }
          onMove={handleMove}
        />
        {/* Na conclusão o anel é suprimido: confete, pulso do rei, som e painel
            enfatizado já disparam juntos — o confete é o anel, mil vezes maior. */}
        <PulseRing
          tone={message && !message.done ? message.tone : null}
          seq={message?.seq ?? 0}
        />
        {promotion && (
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
        {intro && status === "playing" && (
          <p className="text-sm leading-relaxed text-tinta-media">{intro}</p>
        )}

        {moveLimit !== undefined && (
          <p className="rotulo text-tinta-fraca">
            Lance {state.studentMoves} de {moveLimit}
            {state.attempt > 1 && ` · tentativa ${state.attempt}`}
          </p>
        )}

        <FeedbackPanel
          message={panel}
          placeholder={
            allowHelp
              ? "Faça o lance no tabuleiro. Errar aqui não custa nada — a resposta vem escrita."
              : `Sem dica e sem destaque. Um lance que jogue ${alvo.oQue} fora encerra a tentativa.`
          }
        />

        {hintAvailable && status === "playing" && (
          <div className="flex flex-col gap-2">
            <div>
              <LessonButton onClick={() => toggleHint(treeKey)}>
                {state.hintOpen ? "Esconder a dica" : "Ver a dica"}
              </LessonButton>
            </div>
            {state.hintOpen && (
              <p className="rounded-lg border border-dica-superficie/30 bg-dica-superficie/5 px-4 py-3 text-sm leading-relaxed text-dica-tinta">
                {node.hint}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {status === "failed" && (
            <LessonButton variant="primary" onClick={restart}>
              Recomeçar do zero
            </LessonButton>
          )}
          {status === "done" && onFinish && (
            <LessonButton variant="primary" onClick={onFinish}>
              {finishLabel ?? "Continuar"}
            </LessonButton>
          )}
          {/* Também na etapa concluída: é o caminho para refazer a linha — e
              para rever a comemoração, que não se repete só por voltar aqui. */}
          {(status === "done" || (status === "playing" && state.studentMoves > 0)) && (
            <LessonButton onClick={restart}>Recomeçar a posição</LessonButton>
          )}
        </div>
      </div>

      {/* Último filho da raiz, e não da coluna do tabuleiro: o confete cobre a
          etapa inteira. As partículas continuam nascendo do tabuleiro. */}
      <Confetti seq={celebration} originRef={boardColumn} />
    </div>
  );
}
