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
import { aplicarUci, isPraise, judgeMove, throwsWinAway, toUci } from "@/lib/lesson/tree";
import { restingMessage, useLessonStore, type PanelMessage, type TreeKey } from "@/lib/lesson/store";
import { REPLY_DELAY_MS } from "@/lib/lesson/timing";
import { playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { Celebracao, useCelebracao } from "@/components/Celebracao";
import { setaQueEnsina, simboloNaCasa, type SimboloDoDesenho } from "@/lib/chess/desenhos-do-tabuleiro";
import { ajudaNoErro } from "@/lib/lesson/ajuda-no-erro";
import { useAtalho } from "@/components/atalhos/Atalhos";
import { focoEmControle } from "@/lib/atalhos/foco";
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
  semConfete = false,
  lesson,
  tree,
  treeKey,
  trilha,
  position,
  orientation,
  allowHelp,
  marcasAutomaticas = true,
  showBox = false,
  moveLimit,
  intro,
  marcacao,
  onFinish,
  finishLabel,
  v2,
  aoRever,
}: {
  /** Curso de abertura: o botão "Rever o capítulo" do último degrau da escada de ajuda. */
  aoRever?: () => void;
  lesson: Lesson;
  tree: MoveTree;
  treeKey: TreeKey;
  /** A trilha das etapas, montada pelo `LessonPlayer` e servida no painel. */
  trilha?: ReactNode;
  position: Position;
  orientation: Color;
  allowHelp: boolean;
  /**
   * O corte roxo e o aro da peça atacada, deduzidos da posição (`teachingShapes`), quando há ajuda.
   * **Desligado em todo treino do formato novo** — decisão do Doug de 14/9/2026: lá o professor
   * desenha o próprio corte, e a marca automática aparecia no player sem nunca aparecer no editor.
   */
  marcasAutomaticas?: boolean;
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
  /** A parada do curso de abertura (§18.1): o aluno joga o lance e a aula segue — sem confete. */
  semConfete?: boolean;
  finishLabel?: string;
  /**
   * Só o treino do Editor v2 (§16.4). A aula v1 não passa nada disto, e o caminho dela
   * não muda uma linha:
   *
   * - `aberturaDoDefensor`: a linha começa na vez do defensor. O tabuleiro mostra a
   *   posição de antes, o defensor joga, e só então a primeira pergunta abre. Acontece
   *   de novo a cada tentativa;
   * - `defesaFinal`: a linha termina na vez dele. O lance terminal do aluno recebe a
   *   última resposta antes da conclusão;
   * - `desenhoDoNo`: o desenho da pergunta, com a cor que o professor escolheu;
   * - `aberturaDoDefensor.texto` e `falaDepoisDaDefesa`: o que o painel diz quando o
   *   defensor joga um lance que tem texto próprio. Sem texto, o painel fica com o
   *   feedback da resposta, como sempre.
   */
  v2?: {
    aberturaDoDefensor?: { fen: string; uci: string; texto?: string };
    defesaFinal?: (nodeId: string, uci: string) => string | undefined;
    desenhoDoNo?: (nodeId: string) => DrawShape[];
    falaDepoisDaDefesa?: (nodeId: string, uciDoAluno: string, uciDoDefensor: string) => string | undefined;
    /**
     * A árvore na conta da rotação do defensor. Na aula do aluno a `treeKey` é o id da etapa;
     * a rotação usa esta, a mesma da prévia e do rejulgamento no servidor.
     */
    arvoreDoDefensor?: string;
    /**
     * Curso de abertura (feedback do aluno, 17/9/2026): o símbolo (`?`, `!?`…) do lance que o
     * adversário joga sozinho e do lance certo do aluno, na casa de chegada, com a cor e a animação
     * do move trainer.
     */
    simboloDoLance?: (fenAntes: string, uci: string) => SimboloDoDesenho | null;
    /** Curso de abertura: a escada de ajuda no erro repetido (`lib/lesson/ajuda-no-erro.ts`). */
    ajudaNoErro?: boolean;
  };
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
    /** O símbolo do lance do adversário que acabou de entrar (curso de abertura). */
    simbolo?: SimboloDoDesenho | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [promotion, setPromotion] = useState<{ orig: Key; dest: Key } | null>(null);
  /** O confete e o som de conclusão, juntos (`components/Celebracao.tsx`). */
  const { seq: celebration, celebrar } = useCelebracao();
  /**
   * Os erros no mesmo lance, para a escada de ajuda: a chave é a tentativa e o nó, e por isso
   * acertar (o nó muda) ou recomeçar (a tentativa muda) zera sem efeito nenhum.
   */
  const [erros, setErros] = useState<{ chave: string; n: number }>({ chave: "", n: 0 });
  /** A tentativa cuja abertura do defensor já foi jogada. Só o treino v2 a usa. */
  const [abertura, setAbertura] = useState(0);
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
  /**
   * O defensor que abre a linha (só v2). Enquanto ele não jogou nesta tentativa, o
   * tabuleiro fica na posição de antes e fechado para lances. Derivado da tentativa, e
   * não de um efeito que limpa: recomeçar sobe a tentativa e a abertura volta sozinha.
   */
  const aberturaDoDefensor = v2?.aberturaDoDefensor;
  const naRaiz = Boolean(state && state.nodeId === state.rootId && state.studentMoves === 0);
  const abrindo = Boolean(aberturaDoDefensor && abertura !== attempt && status === "playing" && naRaiz);
  const lanceDaAbertura = aberturaDoDefensor && !abrindo && naRaiz
    ? [aberturaDoDefensor.uci.slice(0, 2), aberturaDoDefensor.uci.slice(2, 4)]
    : null;
  const simboloDaAbertura = lanceDaAbertura && aberturaDoDefensor ? v2?.simboloDoLance?.(aberturaDoDefensor.fen, aberturaDoDefensor.uci) ?? null : null;
  const chaveDosErros = state ? `${attempt}|${state.nodeId}` : "";
  const errosNoLance = erros.chave === chaveDosErros ? erros.n : 0;
  const ajuda = v2?.ajudaNoErro && node && status === "playing" ? ajudaNoErro(node, errosNoLance, node.hint) : null;
  const boardFen = abrindo ? aberturaDoDefensor!.fen : overlay?.fen ?? end?.fen ?? node?.fen ?? position.fen;
  const lastMove = (abrindo ? null : overlay?.lastMove ?? end?.lastMove ?? lanceDaAbertura ?? null) as [Key, Key] | null;
  /**
   * O desfecho sobrevive à navegação entre etapas: `goToStage` apaga a mensagem
   * viva, e o texto — conclusão ou tentativa encerrada — volta da árvore.
   * Derivado, e não reescrito na store ao montar: sem efeito, sem risco de laço.
   */
  const panel: PanelMessage | null = message ?? restingMessage(state);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  /**
   * A dica apareceu na tela (fatia 7): ela é o `placeholder` do painel, visível enquanto não
   * há mensagem viva. A store registra a pergunta uma vez por tentativa; quem lê isso é a
   * tentativa gravada — plano §8, "ajuda utilizada registrada separadamente de domínio".
   */
  const treeHelp = useLessonStore((s) => s.treeHelp);
  const dicaNaTela = Boolean(allowHelp && node?.hint && !panel && status === "playing" && state);
  useEffect(() => {
    if (dicaNaTela && state) treeHelp(treeKey, state.nodeId);
  }, [dicaNaTela, state, treeHelp, treeKey]);

  // O defensor abre a linha no mesmo compasso em que responde a um lance do aluno.
  useEffect(() => {
    if (!abrindo || !aberturaDoDefensor) return;
    const handle = setTimeout(() => {
      const lance = aplicarUci(aberturaDoDefensor.fen, aberturaDoDefensor.uci);
      playForMove({ capture: lance.captura, check: lance.xeque });
      setAbertura(attempt);
      if (aberturaDoDefensor.texto) say("neutral", aberturaDoDefensor.texto);
    }, REPLY_DELAY_MS);
    return () => clearTimeout(handle);
  }, [abrindo, aberturaDoDefensor, attempt, say]);

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

  const interactive = status === "playing" && !busy && !abrindo && board.turn === orientation;

  const shapes: DrawShape[] = useMemo(() => {
    // Os destaques automáticos (corte e peça pendurada) saem da posição que
    // está na tela, então continuam certos mesmo durante a animação do lance.
    const list: DrawShape[] = allowHelp && marcasAutomaticas ? teachingShapes(boardFen, lastMove) : [];
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
    if (allowHelp && !marcacao && !overlay && !abrindo && status === "playing" && node && state) {
      list.push(...(v2?.desenhoDoNo ? v2.desenhoDoNo(state.nodeId) : desenhoDaAutoria(node)));
    }
    if (message?.square) list.push({ orig: message.square as Key, brush: "red" });
    // O símbolo do lance do adversário: o que acabou de entrar, ou o que abriu a linha.
    const simbolo = overlay?.simbolo ?? (overlay ? null : simboloDaAbertura);
    if (simbolo && lastMove) list.push(simboloNaCasa(lastMove[1], simbolo));
    // A escada de ajuda: a casa de saída acesa (2º erro) e a seta com o lance (3º).
    if (ajuda && !overlay && !busy) {
      if (ajuda.casa) list.push({ orig: ajuda.casa as Key, brush: "green" });
      if (ajuda.seta) list.push(setaQueEnsina(ajuda.seta[0] as Key, ajuda.seta[1] as Key, orientation));
    }
    return list;
  }, [allowHelp, marcasAutomaticas, boardFen, lastMove, marcacao, overlay, abrindo, status, node, state, v2, message, simboloDaAbertura, ajuda, busy, orientation]);

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
          // A escada de ajuda (curso de abertura): o erro sobe um degrau no mesmo lance.
          const degrau = v2?.ajudaNoErro ? ajudaNoErro(node, errosNoLance + 1, node.hint) : null;
          if (v2?.ajudaNoErro) setErros({ chave: `${attempt}|${state.nodeId}`, n: errosNoLance + 1 });
          if (degrau?.contaComoAjuda) treeHelp(treeKey, state.nodeId);
          // A parada já diz "Ainda não. Dica: …" no próprio erro; a escada não repete a dica.
          const extra = degrau?.texto && !(degrau.degrau === 1 && verdict.text.includes("Dica:")) ? ` ${degrau.texto}` : "";
          say(verdict.preservesWin ? "warn" : "bad", `${verdict.text}${extra}`, dest);
        }
        return;
      }

      const game = new Chess(node.fen);
      const played = game.move({ from: orig, to: dest, promotion: promoted });
      const afterFen = game.fen();
      // O símbolo que o estudo deu ao lance certo (3.Bd3!, 6.Be4!): o acerto do aluno ganha o
      // "Ótimo!" na casa, como no move trainer.
      setDrawn({ fen: afterFen, lastMove: [orig, dest], attempt, simbolo: v2?.simboloDoLance?.(node.fen, uci) ?? null });

      // Nó terminal: o lance deu mate (o gate provou que dá) — a etapa acaba.
      // A posição do mate vai junto para a store: é a única cópia dela, porque
      // lance terminal não tem nó de destino.
      if (verdict.respostas.length === 0) {
        // Treino v2 que termina na vez do defensor: ele responde, e a conclusão vem
        // sobre a posição final — a única cópia dela vai para a store, como no mate.
        const final = v2?.defesaFinal?.(state.nodeId, uci);
        if (final) {
          const conclusao = v2?.falaDepoisDaDefesa?.(state.nodeId, uci, final) ?? verdict.feedback;
          playForMove({ capture: Boolean(played.captured), check: game.isCheck() });
          say("good", verdict.feedback);
          setBusy(true);
          timer.current = setTimeout(() => {
            const fecho = aplicarUci(afterFen, final);
            const ultimo = fecho.lastMove as [Key, Key];
            playForMove({ capture: fecho.captura, check: fecho.xeque });
            setDrawn({ fen: fecho.fen, lastMove: ultimo, attempt, simbolo: v2?.simboloDoLance?.(afterFen, final) ?? null });
            if (semConfete) playSuccess();
            else celebrar();
            treeAdvance(treeKey, null, { fen: fecho.fen, lastMove: ultimo, text: conclusao });
            celebrate(conclusao);
            setBusy(false);
          }, REPLY_DELAY_MS);
          return;
        }
        // A parada não festeja (§18.1): o som de acerto marca o lance, e a aula segue.
        if (semConfete) playSuccess();
        else celebrar();
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
        chaveDoDefensor(v2?.arvoreDoDefensor ?? treeKey, state.nodeId),
        attempt,
      );
      timer.current = setTimeout(() => {
        const resposta = aplicarUci(afterFen, reply);
        playForMove({ capture: resposta.captura, check: resposta.xeque });
        setDrawn({
          fen: resposta.fen,
          lastMove: resposta.lastMove as [Key, Key],
          attempt,
          simbolo: v2?.simboloDoLance?.(afterFen, reply) ?? null,
        });
        treeAdvance(treeKey, next);
        setBusy(false);
        // Só o treino v2: o texto desta defesa entra depois do feedback, e só agora,
        // quando se sabe qual defesa o defensor jogou nesta tentativa.
        const fala = v2?.falaDepoisDaDefesa?.(state.nodeId, uci, reply);
        if (fala) say("good", fala);
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
      celebrar,
      errosNoLance,
      semConfete,
      treeHelp,
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
      v2,
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

  // Espaço segue no fim do treino, como no capítulo (feedback do aluno, 17/9/2026).
  useAtalho(
    "aluno-continuar",
    () => {
      if (focoEmControle(typeof document !== "undefined" ? document.activeElement : null)) return false;
      onFinish?.();
    },
    { ativo: status === "done" && Boolean(onFinish) && !marcacao },
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
              {ajuda?.rever && aoRever ? (
                <LessonButton onClick={aoRever}>Rever o capítulo</LessonButton>
              ) : null}
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
      {semConfete ? null : <Celebracao seq={celebration} originRef={boardColumn} />}
    </div>
  );
}
