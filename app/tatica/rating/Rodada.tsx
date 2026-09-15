"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chess, type Square } from "chess.js";
import type { Color, Key } from "@lichess-org/chessground/types";
import { useAtalho } from "@/components/atalhos/Atalhos";
import { BotaoDeSom } from "@/components/BotaoDeSom";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { BotaoPrincipal } from "@/components/lesson/BotoesDaAula";
import { CartaoDeComando, type TomDoCartao } from "@/components/lesson/CartaoDeComando";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { applyUci, type Applied } from "@/lib/chess/fen";
import { armAudioOnFirstGesture, playComplete, playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { lanceCerto, posicaoInicial } from "@/lib/tatica/conferir";
import type { PuzzleServido } from "@/lib/tatica/puzzles";
import type { EstadoDoRating, RespostaDoRating, VereditoDoRating } from "@/lib/tatica/rating";
import { ABERTURA_MS, RESPOSTA_MS } from "@/lib/tatica/tempos";
import { responder } from "./acoes";

/**
 * A tela de jogo da tática com rating: um problema de cada vez, e o rating
 * sobe ou desce a cada um.
 *
 * ## Por que não é a `Serie`
 *
 * `app/tatica/[tema]/Serie.tsx` tem ~790 linhas acopladas a dica em degraus, voz
 * do professor e trilha de etapas, e conta uma rodada de N puzzles escolhidos
 * de antemão. Aqui não há rodada: o **servidor** diz qual é o próximo depois de
 * cada resposta (`lib/tatica/gravar-rating.ts`), e o que muda na tela é outro —
 * o número do rating, o "+8 / −12", a sequência. Extrair um núcleo comum
 * mexeria na série que os alunos já usam para ganhar um componente que ninguém
 * pediu; ela fica intocada, e o que as duas compartilham já é código de outros
 * lugares (o tabuleiro, o juiz `lanceCerto`, os sons, os tempos, o `BotaoDeSom`).
 *
 * ## As regras do Doug (15/9), e onde cada uma mora
 *
 * - **Um lance errado encerra o problema como falha.** Não há segunda chance: o
 *   primeiro lance errado vai ao servidor na hora.
 * - **Acerto:** "Correto! +8" e a sequência com 🔥; o próximo entra sozinho em
 *   1,5 s (`FIM_DO_ACERTO_MS`).
 * - **Erro:** "Incorreto −12"; o tabuleiro joga a linha certa, lance a lance, e
 *   espera o botão "Próximo" (ou Enter) — errar tem de dar tempo de ver.
 * - **O tempo não aparece.** Nem relógio, nem "você levou 12 s": o servidor mede
 *   e grava, e o tempo não mexe no rating.
 * - **Falha de rede:** a tela não avança e oferece "Tentar de novo". Reenviar é
 *   seguro — o servidor aceita cada problema uma vez, e o reenvio de uma
 *   resposta já aceita devolve o mesmo resultado.
 *
 * ## O navegador não decide nada
 *
 * `lanceCerto` diz "certo" na tela no instante do lance, como na série. Mas o
 * que vai ao servidor são os **lances jogados**, e o veredito que a tela mostra
 * — o "Correto!" com o número, ou o "Incorreto" — é o que o servidor devolveu.
 */

/** Do acerto até o próximo problema entrar sozinho. */
const FIM_DO_ACERTO_MS = 1500;

/**
 * O intervalo entre dois lances da solução, depois de um erro. O dobro da
 * resposta do adversário na série: ali o aluno já sabe o que jogou, aqui ele
 * precisa acompanhar um lance que não viu.
 */
const PASSO_DA_SOLUCAO_MS = 2 * RESPOSTA_MS;

type Fase =
  /** A posição parada, antes do erro do adversário. */
  | "abrindo"
  | "jogando"
  /** Lance certo no meio da linha: o adversário vai responder. */
  | "respondendo"
  /** A resposta foi ao servidor, e a tela espera o veredito. */
  | "conferindo"
  | "acertou"
  | "errou"
  /** A rede caiu no meio: nada avança até o reenvio. */
  | "sem-rede"
  /** O servidor recusou (o problema mudou embaixo da aba, por exemplo). */
  | "recusado";

type Estado = Pick<EstadoDoRating, "rating" | "sequencia" | "melhorSequencia">;

export function Rodada({ inicial }: { inicial: { puzzle: PuzzleServido; estado: EstadoDoRating } }) {
  const router = useRouter();
  useEffect(() => armAudioOnFirstGesture(), []);

  const [puzzle, setPuzzle] = useState(inicial.puzzle);
  const [estado, setEstado] = useState<Estado>(inicial.estado);
  /** O "+8 / −12" do último problema respondido, enquanto ele está na tela. */
  const [delta, setDelta] = useState<number | null>(null);
  const [acabou, setAcabou] = useState(false);

  const aoVeredito = useCallback((r: VereditoDoRating) => {
    setEstado({ rating: r.rating, sequencia: r.sequencia, melhorSequencia: r.melhorSequencia });
    setDelta(r.delta);
  }, []);

  const aoProximo = useCallback(
    (proximo: PuzzleServido | null) => {
      setDelta(null);
      if (proximo) setPuzzle(proximo);
      else setAcabou(true);
    },
    [],
  );

  if (acabou) {
    return (
      <div className="flex flex-col gap-3 cartao-vazio px-4 py-6 text-center">
        <p className="text-sm font-medium text-tinta">Não há problema novo agora.</p>
        <p className="text-sm text-tinta-media">
          Recarregue a página; se continuar assim, avise o professor.
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="foco mx-auto rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
        >
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <Problema
      key={puzzle.id}
      puzzle={puzzle}
      estado={estado}
      delta={delta}
      aoVeredito={aoVeredito}
      aoProximo={aoProximo}
    />
  );
}

/** O som de um lance que acabou de ser aplicado — a mesma regra da série. */
function somDoLance({ game }: Applied): void {
  const lance = game.history({ verbose: true }).at(-1);
  playForMove({ capture: Boolean(lance?.captured), check: game.inCheck() });
}

/**
 * Um problema. Mora num componente próprio pelo motivo da `NoTabuleiro` da
 * série: todo o estado dele — posição, fase, promoção — volta ao zero quando o
 * próximo entra, e `key={puzzle.id}` faz isso desmontando.
 */
function Problema({
  puzzle,
  estado,
  delta,
  aoVeredito,
  aoProximo,
}: {
  puzzle: PuzzleServido;
  estado: Estado;
  delta: number | null;
  aoVeredito: (r: VereditoDoRating) => void;
  aoProximo: (proximo: PuzzleServido | null) => void;
}) {
  const router = useRouter();
  const [fen, setFen] = useState(puzzle.fen);
  const [passo, setPasso] = useState(1);
  const [fase, setFase] = useState<Fase>("abrindo");
  const [ultimoLance, setUltimoLance] = useState<[Key, Key] | null>(null);
  const [reiMatado, setReiMatado] = useState<Color | null>(null);
  const [revisao, setRevisao] = useState(0);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);
  const [recusa, setRecusa] = useState<string | null>(null);

  const jogadosRef = useRef<string[]>([]);
  /** O que foi (ou vai) ao servidor — o reenvio manda o mesmo. */
  const enviadoRef = useRef<{ lances: string[]; ondeErrou: { fen: string; indice: number } | null } | null>(null);
  const proximoRef = useRef<PuzzleServido | null>(null);
  const relogiosRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const agendar = useCallback((fazer: () => void, ms: number) => {
    relogiosRef.current.push(setTimeout(fazer, ms));
  }, []);

  // A abertura: a posição parada, e o erro do adversário meio segundo depois.
  // A limpeza mata todo relógio pendente — o do adversário, o da solução e o
  // do avanço —, senão um lance do problema desmontado cai no seguinte.
  useEffect(() => {
    const relogios = relogiosRef;
    relogios.current.push(
      setTimeout(() => {
        const depois = applyUci(puzzle.fen, puzzle.lances[0]);
        if (!depois) return;
        somDoLance(depois);
        setFen(depois.fen);
        setUltimoLance([puzzle.lances[0].slice(0, 2) as Key, puzzle.lances[0].slice(2, 4) as Key]);
        setFase("jogando");
      }, ABERTURA_MS),
    );
    return () => {
      for (const id of relogios.current) clearTimeout(id);
      relogios.current = [];
    };
  }, [puzzle]);

  /**
   * Joga a linha certa no tabuleiro, lance a lance, a partir de `de` (a posição
   * e o índice em que o aluno errou). Se o servidor discordou da tela — ela
   * achou certo e ele não —, a linha recomeça do lance do adversário.
   */
  const mostrarSolucao = useCallback(
    (solucao: readonly string[], de: { fen: string; indice: number }) => {
      let atual = de.fen;
      solucao.slice(de.indice).forEach((uci, k) => {
        agendar(() => {
          const depois = applyUci(atual, uci);
          if (!depois) return;
          atual = depois.fen;
          somDoLance(depois);
          setFen(depois.fen);
          setUltimoLance([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
          if (depois.game.isCheckmate()) setReiMatado(toBoardColor(depois.game.turn()));
        }, (k + 1) * PASSO_DA_SOLUCAO_MS);
      });
    },
    [agendar],
  );

  const enviar = useCallback(
    async (lances: string[], ondeErrou: { fen: string; indice: number } | null) => {
      enviadoRef.current = { lances, ondeErrou };
      setFase("conferindo");
      setRecusa(null);
      let resposta: RespostaDoRating;
      try {
        resposta = await responder(puzzle.id, lances);
      } catch {
        setFase("sem-rede");
        return;
      }
      if ("erro" in resposta) {
        setRecusa(resposta.erro);
        setFase("recusado");
        return;
      }

      aoVeredito(resposta);
      proximoRef.current = resposta.proximo;

      if (resposta.acertou) {
        setFase("acertou");
        agendar(() => aoProximo(resposta.proximo), FIM_DO_ACERTO_MS);
        return;
      }

      setFase("errou");
      setRevisao((r) => r + 1);
      const de = ondeErrou ?? { fen: posicaoInicial(puzzle).fen(), indice: 1 };
      setFen(de.fen);
      mostrarSolucao(resposta.solucao, de);
    },
    [agendar, aoProximo, aoVeredito, mostrarSolucao, puzzle],
  );

  const jogar = useCallback(
    (uci: string) => {
      const esperado = puzzle.lances[passo];

      if (!lanceCerto(fen, uci, esperado)) {
        // Um lance errado encerra o problema: a peça volta, e a resposta vai já.
        setRevisao((r) => r + 1);
        playRefusal();
        void enviar([...jogadosRef.current, uci], { fen, indice: passo });
        return;
      }

      const depois = applyUci(fen, uci);
      if (!depois) return;
      jogadosRef.current.push(uci);
      setFen(depois.fen);
      setUltimoLance([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);

      const matou = depois.game.isCheckmate();
      if (matou || passo + 1 >= puzzle.lances.length) {
        if (matou) {
          setReiMatado(toBoardColor(depois.game.turn()));
          playComplete();
        } else {
          playSuccess();
        }
        void enviar([...jogadosRef.current], null);
        return;
      }

      somDoLance(depois);
      setFase("respondendo");
      agendar(() => {
        const resposta = applyUci(depois.fen, puzzle.lances[passo + 1]);
        if (!resposta) return;
        somDoLance(resposta);
        setFen(resposta.fen);
        setUltimoLance([
          puzzle.lances[passo + 1].slice(0, 2) as Key,
          puzzle.lances[passo + 1].slice(2, 4) as Key,
        ]);
        setPasso(passo + 2);
        setFase("jogando");
      }, RESPOSTA_MS);
    },
    [agendar, enviar, fen, passo, puzzle],
  );

  const reenviar = useCallback(() => {
    if (enviadoRef.current) void enviar(enviadoRef.current.lances, enviadoRef.current.ondeErrou);
  }, [enviar]);

  const proximo = useCallback(() => {
    if (fase !== "errou") return false;
    aoProximo(proximoRef.current);
  }, [aoProximo, fase]);

  useAtalho("rating-proximo", proximo, { ativo: fase === "errou" });

  const jogo = useMemo(() => new Chess(fen), [fen]);
  const podeMover = fase === "jogando";
  const meuLado: Color = puzzle.fen.split(" ")[1] === "w" ? "black" : "white";

  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      if (!podeMover) {
        setRevisao((r) => r + 1);
        return;
      }
      const peca = jogo.get(orig as Square);
      if (peca?.type === "p" && (dest[1] === "8" || dest[1] === "1")) {
        setPromocao({ orig, dest });
        return;
      }
      jogar(`${orig}${dest}`);
    },
    [jogar, jogo, podeMover],
  );

  const cartao = cartaoDaFase(fase, { meuLado, delta, sequencia: estado.sequencia, recusa });

  return (
    <AulaShell
      magro
      tabuleiro={
        <div className="relative">
          <ChessBoard
            fen={fen}
            orientation={meuLado}
            turnColor={toBoardColor(jogo.turn())}
            dests={podeMover ? legalDests(jogo) : new Map()}
            lastMove={ultimoLance}
            check={jogo.inCheck()}
            viewOnly={!podeMover}
            revision={revisao}
            matedKing={reiMatado}
            onMove={aoMover}
          />
          {promocao ? (
            <PromotionPicker
              color={meuLado}
              onChoose={(peca: PromotionChoice) => {
                const { orig, dest } = promocao;
                setPromocao(null);
                jogar(`${orig}${dest}${peca}`);
              }}
              onCancel={() => {
                setPromocao(null);
                setRevisao((r) => r + 1);
              }}
            />
          ) : null}
        </div>
      }
      painel={
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="rotulo text-metodo-tinta">Tática rating</p>
            <BotaoDeSom />
          </div>

          <div className="flex items-end justify-between gap-3" aria-live="polite">
            <p className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-tinta tabular-nums">{Math.round(estado.rating)}</span>
              {delta !== null ? (
                <span
                  className={`text-lg font-semibold tabular-nums ${delta >= 0 ? "text-metodo-tinta" : "text-erro-texto"}`}
                >
                  {formatarDelta(delta)}
                </span>
              ) : null}
              <span className="sr-only">de rating</span>
            </p>
            <p className="flex flex-col items-end text-xs text-tinta-fraca tabular-nums">
              <span className={estado.sequencia > 0 ? "text-sm font-semibold text-tinta" : ""}>
                {estado.sequencia > 0 ? `🔥 ${estado.sequencia} seguidos` : "Sem sequência"}
              </span>
              <span>Melhor: {estado.melhorSequencia}</span>
            </p>
          </div>

          <CartaoDeComando {...cartao} />

          <AulaRodape>
            {fase === "errou" ? <BotaoPrincipal onClick={() => aoProximo(proximoRef.current)}>Próximo →</BotaoPrincipal> : null}
            {fase === "sem-rede" ? <BotaoPrincipal onClick={reenviar}>Tentar de novo</BotaoPrincipal> : null}
            {fase === "recusado" ? <BotaoPrincipal onClick={() => router.refresh()}>Recarregar</BotaoPrincipal> : null}
            <Link href="/tatica/rating/evolucao" className="foco rounded-lg px-2 py-2.5 text-sm font-medium text-metodo-tinta underline">
              Ver evolução
            </Link>
          </AulaRodape>
        </>
      }
    />
  );
}

/** "+8", "−12" (com o sinal de menos tipográfico), "±0". */
export function formatarDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

function cartaoDaFase(
  fase: Fase,
  { meuLado, delta, sequencia, recusa }: { meuLado: Color; delta: number | null; sequencia: number; recusa: string | null },
): { comando: string; estado?: string; tom: TomDoCartao } {
  const lado = meuLado === "white" ? "brancas" : "pretas";
  switch (fase) {
    case "abrindo":
      return { comando: "Olhe a posição", estado: "O adversário vai jogar.", tom: "calma" };
    case "jogando":
      return { comando: "Encontre o melhor lance", estado: `Você joga com as ${lado}.`, tom: "calma" };
    case "respondendo":
      return { comando: "Certo — continue", estado: "O adversário responde.", tom: "bom" };
    case "conferindo":
      return { comando: "Conferindo…", tom: "calma" };
    case "acertou":
      return {
        comando: `Correto! ${delta === null ? "" : formatarDelta(delta)}`.trim(),
        estado: sequencia > 1 ? `🔥 ${sequencia} seguidos` : "O próximo já vem.",
        tom: "bom",
      };
    case "errou":
      return {
        comando: `Incorreto ${delta === null ? "" : formatarDelta(delta)}`.trim(),
        estado: "Veja a solução no tabuleiro. Enter ou Próximo para seguir.",
        tom: "ruim",
      };
    case "sem-rede":
      return { comando: "Sem conexão", estado: "Sua resposta não se perdeu: tente de novo.", tom: "aviso" };
    case "recusado":
      return { comando: "Não deu para conferir", estado: recusa ?? "Recarregue a página.", tom: "aviso" };
  }
}
