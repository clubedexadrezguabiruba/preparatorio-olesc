"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chess } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { ProfessorSeApresenta } from "@/components/lesson/ProfessorSeApresenta";
import { BoxOverlay } from "@/components/board/BoxOverlay";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { desenhoDaAutoria, teachingShapes } from "@/lib/chess/annotations";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { chaveDoDefensor, escolherResposta } from "@/lib/lesson/defensor";
import { AVANCO, TREINO } from "@/lib/lesson/falas";
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
  trilha,
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
  /** A trilha das etapas, montada pelo `LessonPlayer` e servida no painel. */
  trilha?: ReactNode;
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
  const state = useLessonStore((s) => s.trees[treeKey]);
  const message = useLessonStore((s) => s.message);
  const say = useLessonStore((s) => s.say);
  const celebrate = useLessonStore((s) => s.celebrate);
  const fadeFlash = useLessonStore((s) => s.fadeFlash);
  const treeTry = useLessonStore((s) => s.treeTry);
  const treeAdvance = useLessonStore((s) => s.treeAdvance);
  const treeFail = useLessonStore((s) => s.treeFail);
  const treeRestart = useLessonStore((s) => s.treeRestart);

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
    const list: DrawShape[] = allowHelp ? teachingShapes(boardFen, lastMove) : [];
    /*
     * **O desenho da autoria fica na tela SEMPRE, e não atrás de um botão.**
     *
     * Ele já esteve dos dois jeitos. Até 2026-09-08 as casas acesas ficavam
     * ligadas o tempo todo; naquele dia foram para trás de "Ver a dica", pela
     * §A4 do `REFERENCIA-MOVE-TRAINER.md` — "a dica é pedida, não concedida",
     * medida no chess.com.
     *
     * O que aquela medição não carregava é para **quem** o chess.com dá a dica
     * sob demanda: um adulto que escolheu treinar. Esta etapa é aquecimento
     * declarado — não grava, não conta na escada —, o aluno tem 11 anos e 600
     * pontos, e aquecimento em que a criança trava não aquece nada. Quem afere
     * é a etapa 3, e ela continua nua. O precedente revogado está reescrito na
     * §6.2 de `docs/VOZ-DO-CURSO.md`, porque precedente revogado em silêncio
     * volta sozinho.
     *
     * **A flecha aponta o alvo, nunca o lance** — a casa que importa, a
     * intenção do rei inimigo. Ligar a origem ao destino do lance certo seria
     * responder pelo aluno; quem cobra a flecha em todo nó é a `lessonSchema`.
     *
     * Ele vale para o nó parado; enquanto o lance está sendo desenhado sairia
     * do lugar, então some. No modo autor migra para o canal editável, senão
     * sairia desenhado duas vezes.
     */
    if (allowHelp && !marcacao && !overlay && status === "playing" && node) {
      list.push(...desenhoDaAutoria(node));
    }
    if (message?.square) list.push({ orig: message.square as Key, brush: "red" });
    return list;
  }, [allowHelp, boardFen, lastMove, marcacao, overlay, status, node, message]);

  /** O desenho que o arquivo guarda para este nó, no formato do tabuleiro. */
  const daAutoria: DrawShape[] = useMemo(() => desenhoDaAutoria(node), [node]);

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
          const text = `${verdict.text} ${TREINO.perdeuOAlvo(tree.goal)}`;
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
          const text = TREINO.acabaramOsLances(moveLimit, tree.goal);
          treeFail(treeKey, { tone: "warn", text });
          say("warn", text);
        }
      }, REPLY_DELAY_MS);
    },
    [
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
      tree.goal,
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
        say("bad", TREINO.ilegal, dest);
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

  // A raiz é `relative` **sem `z-index`**, de propósito: assim não cria
  // contexto de empilhamento novo e as camadas de hoje (canvas `z-10`, promoção
  // `z-20`) continuam valendo. Também não leva `overflow-hidden` — cortaria o
  // `box-shadow` do anel de pulso.
  return (
    // A raiz é `relative` para o confete, que é `absolute inset-0` e cobre a
    // etapa inteira — tabuleiro e painel. Ela é PAI do `.aula-palco`, e não
    // irmão: o palco tem altura fechada, e um irmão dele somaria altura à
    // página, devolvendo a rolagem. Um pai sem altura própria não soma nada.
    <div className="relative">
      <AulaShell
        tabuleiro={
          <div ref={boardColumn} className="relative">
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
            {/* Na conclusão o anel é suprimido: confete, pulso do rei, som e
                painel enfatizado já disparam juntos — o confete é o anel, mil
                vezes maior. */}
            <PulseRing tone={message && !message.done ? message.tone : null} seq={message?.seq ?? 0} />
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
        }
        painel={
          <>
            {trilha}

            {intro && status === "playing" && (
              <p className="text-sm leading-relaxed text-tinta-media">{intro}</p>
            )}

            {moveLimit !== undefined && (
              <p className="rotulo text-tinta-fraca">
                {TREINO.lance(state.studentMoves, moveLimit)}
                {state.attempt > 1 && ` · ${TREINO.vez(state.attempt)}`}
              </p>
            )}

            {/*
             * **A dica do nó é o que o professor diz enquanto o aluno pensa.**
             *
             * Ela era uma caixa atrás de "Ver a dica", e o botão saiu com o
             * bloco inteiro — e com ele o único `overflow-y-auto` desta tela.
             * Como `placeholder` ela chega pelo mesmo lugar por onde chega o
             * feedback do lance, ao lado do retrato: uma voz só, e não um aviso
             * de sistema numa caixa de outra cor.
             *
             * O `placeholder` só aparece enquanto não há mensagem viva, que é
             * exatamente o momento em que a dica serve: antes do lance.
             */}
            <FeedbackPanel
              message={panel}
              placeholder={
                allowHelp
                  ? node.hint ?? TREINO.esperando
                  : TREINO.semAjuda(tree.goal)
              }
              retrato={<ProfessorSeApresenta />}
            />

            <AulaRodape>
              {status === "done" && onFinish && (
                <LessonButton variant="primary" onClick={onFinish}>
                  {finishLabel ?? AVANCO.padrao}
                </LessonButton>
              )}
              {/*
               * **Um botão só, e ele é o mesmo em todos os estados.**
               *
               * Eram dois — "Recomeçar do zero", que aparecia no fracasso, e
               * "Recomeçar a posição", que aparecia no resto. Os dois chamavam
               * `restart` e faziam exatamente a mesma coisa; a diferença de
               * nome era só o estado da tela, que o aluno já está vendo. Dois
               * botões para um movimento são duas maneiras de fazer a mesma
               * coisa numa tela cuja regra é ter um caminho só
               * (`docs/VOZ-DO-CURSO.md` §5.5).
               *
               * Ele fica em `primary` no fracasso porque ali é a única saída, e
               * neutro no resto, onde a saída é o avanço.
               */}
              {(status !== "playing" || state.studentMoves > 0) && (
                <LessonButton
                  variant={status === "failed" ? "primary" : "default"}
                  onClick={restart}
                >
                  {TREINO.recomecar}
                </LessonButton>
              )}
            </AulaRodape>
          </>
        }
      />

      {/* Último filho da raiz, e não da coluna do tabuleiro: o confete cobre a
          etapa inteira. As partículas continuam nascendo do tabuleiro. */}
      <Confetti seq={celebration} originRef={boardColumn} />
    </div>
  );
}
