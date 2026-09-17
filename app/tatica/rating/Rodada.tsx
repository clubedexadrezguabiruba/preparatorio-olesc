"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { useAtalho } from "@/components/atalhos/Atalhos";
import { BotaoDeSom } from "@/components/BotaoDeSom";
import { Celebracao, useCelebracao } from "@/components/Celebracao";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { BotaoPrincipal } from "@/components/lesson/BotoesDaAula";
import { CartaoDeComando, type TomDoCartao } from "@/components/lesson/CartaoDeComando";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { applyUci, type Applied } from "@/lib/chess/fen";
import { armAudioOnFirstGesture, playComplete, playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { temaPorTag } from "@/lib/tatica/blocos";
import { lanceCerto, posicaoInicial } from "@/lib/tatica/conferir";
import type { PuzzleServido } from "@/lib/tatica/puzzles";
import {
  formatarDelta,
  PROBLEMAS_POR_DIA,
  type EstadoDoRating,
  type RespostaDoRating,
  type VereditoDoRating,
} from "@/lib/tatica/rating";
import { armazemDoNavegador, esquecerResposta, guardarResposta, respostaGuardada } from "@/lib/tatica/rating-guardada";
import { temasDoProblema } from "@/lib/tatica/rating-historico";
import { quadrosDaSolucao, type Quadro } from "@/lib/tatica/solucao";
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
 *   primeiro lance errado vai ao servidor na hora — e fica guardado no aparelho
 *   até o servidor julgar, para um F5 sem internet não virar segunda chance
 *   (`lib/tatica/rating-guardada.ts`).
 * - **Acerto:** "Correto! +8" e a sequência com 🔥; o próximo entra sozinho em
 *   1,5 s (`FIM_DO_ACERTO_MS`).
 * - **Erro:** "Incorreto −12", e o nome da tática que o problema era (sem link:
 *   a tela é de jogo, não de estudo). O tabuleiro joga a linha certa, lance a
 *   lance, a partir da seta vermelha no lance que o aluno jogou; ◀ ▶ (ou as
 *   setas do teclado) voltam e avançam, e o "Próximo" (ou Enter) só libera
 *   depois que a linha foi vista até o fim.
 * - **O tempo não aparece.** Nem relógio, nem "você levou 12 s": o servidor mede
 *   e grava, e o tempo não mexe no rating.
 * - **Um teto por dia, depois da revisão e da série** (`PROBLEMAS_POR_DIA`): a
 *   tela conta os de hoje e sugere parar; não trava.
 * - **Falha de rede:** a tela não avança e oferece "Tentar de novo". Reenviar é
 *   seguro — o servidor aceita cada problema uma vez, e o reenvio de uma
 *   resposta já aceita devolve o mesmo resultado. Falha do **servidor** diz que
 *   foi o servidor, e não "Sem conexão".
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
  /** O servidor falhou ao julgar (banco fora): nada avança até o reenvio. */
  | "falha"
  /** O servidor recusou (o problema mudou embaixo da aba, por exemplo). */
  | "recusado";

type Estado = Pick<EstadoDoRating, "rating" | "sequencia" | "melhorSequencia">;

type OndeErrou = { fen: string; indice: number };

const casasDe = (uci: string): [Key, Key] => [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key];

export function Rodada({
  aluno,
  inicial,
  feitosHoje: feitosAoAbrir,
}: {
  aluno: string;
  inicial: { puzzle: PuzzleServido; estado: EstadoDoRating };
  /** Quantos problemas do modo ele respondeu hoje, quando a página abriu. */
  feitosHoje: number;
}) {
  const router = useRouter();
  useEffect(() => armAudioOnFirstGesture(), []);

  const [puzzle, setPuzzle] = useState(inicial.puzzle);
  const [estado, setEstado] = useState<Estado>(inicial.estado);
  /** O "+8 / −12" do último problema respondido, enquanto ele está na tela. */
  const [delta, setDelta] = useState<number | null>(null);
  const [feitosHoje, setFeitosHoje] = useState(feitosAoAbrir);
  const [acabou, setAcabou] = useState(false);
  const { seq, celebrar } = useCelebracao();

  /*
   * O fim da "série" do modo rating é a conta do dia (17/9/2026): o problema que leva a
   * `PROBLEMAS_POR_DIA` solta o confete, uma vez. **Sem som**: o próprio problema já tocou o dele
   * (acerto ou mate) no lance final, e o veredito chega do servidor logo depois — dois sons de
   * vitória em meio segundo eram barulho. O mate de cada problema continua com o `playComplete` de
   * sempre: é o fim de um problema, e não da série.
   */
  const aoVeredito = useCallback((r: VereditoDoRating) => {
    setEstado({ rating: r.rating, sequencia: r.sequencia, melhorSequencia: r.melhorSequencia });
    setDelta(r.delta);
    setFeitosHoje((n) => n + 1);
  }, []);
  // Só quando a conta **chega** ao teto nesta sessão — abrir a página já com 70 feitos não celebra.
  useEffect(() => {
    if (feitosHoje === PROBLEMAS_POR_DIA && feitosAoAbrir < PROBLEMAS_POR_DIA) celebrar({ som: false });
  }, [celebrar, feitosAoAbrir, feitosHoje]);

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
    <>
    <Celebracao seq={seq} tela />
    <Problema
      key={puzzle.id}
      aluno={aluno}
      puzzle={puzzle}
      estado={estado}
      delta={delta}
      feitosHoje={feitosHoje}
      aoVeredito={aoVeredito}
      aoProximo={aoProximo}
    />
    </>
  );
}

/** O som de um lance que acabou de ser aplicado — a mesma regra da série. */
function somDoLance({ game }: Applied): void {
  const lance = game.history({ verbose: true }).at(-1);
  playForMove({ capture: Boolean(lance?.captured), check: game.inCheck() });
}

function somDoQuadro(quadro: Quadro): void {
  playForMove({ capture: quadro.captura, check: quadro.xeque });
}

/**
 * Um problema. Mora num componente próprio pelo motivo da `NoTabuleiro` da
 * série: todo o estado dele — posição, fase, promoção, solução — volta ao zero
 * quando o próximo entra, e `key={puzzle.id}` faz isso desmontando.
 */
function Problema({
  aluno,
  puzzle,
  estado,
  delta,
  feitosHoje,
  aoVeredito,
  aoProximo,
}: {
  aluno: string;
  puzzle: PuzzleServido;
  estado: Estado;
  delta: number | null;
  feitosHoje: number;
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
  /** A solução depois do erro, quadro a quadro, e o lance que o aluno jogou. */
  const [solucao, setSolucao] = useState<{ quadros: Quadro[]; lanceErrado: [Key, Key] | null } | null>(null);
  const [quadro, setQuadro] = useState(0);
  /** O "Próximo" só libera depois que o último quadro da solução apareceu. */
  const [viuAteOFim, setViuAteOFim] = useState(false);

  const jogadosRef = useRef<string[]>([]);
  /** O que foi (ou vai) ao servidor — o reenvio manda o mesmo. */
  const enviadoRef = useRef<{ lances: string[]; ondeErrou: OndeErrou | null } | null>(null);
  /** Uma resposta no ar: um segundo envio (clique duplo, efeito dobrado do modo estrito) não sai. */
  const enviandoRef = useRef(false);
  const proximoRef = useRef<PuzzleServido | null>(null);
  const relogiosRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const agendar = useCallback((fazer: () => void, ms: number) => {
    relogiosRef.current.push(setTimeout(fazer, ms));
  }, []);

  const pararRelogios = useCallback(() => {
    for (const id of relogiosRef.current) clearTimeout(id);
    relogiosRef.current = [];
  }, []);

  /**
   * Monta a linha certa em quadros a partir de `de` (a posição e o índice em que
   * o aluno errou) e a joga sozinha, um quadro por passo. Se o servidor
   * discordou da tela — ela achou certo e ele não —, a linha recomeça do lance
   * do adversário, e não há lance errado para marcar.
   */
  const mostrarSolucao = useCallback(
    (lista: readonly string[], de: OndeErrou, lanceErrado: [Key, Key] | null) => {
      const quadros = quadrosDaSolucao(lista, de);
      setSolucao({ quadros, lanceErrado });
      setQuadro(0);
      setViuAteOFim(quadros.length <= 1);
      quadros.slice(1).forEach((q, k) => {
        agendar(() => {
          somDoQuadro(q);
          setQuadro(k + 1);
          if (k + 2 === quadros.length) setViuAteOFim(true);
        }, (k + 1) * PASSO_DA_SOLUCAO_MS);
      });
    },
    [agendar],
  );

  const enviar = useCallback(
    async (lances: string[], ondeErrou: OndeErrou | null) => {
      if (enviandoRef.current) return;
      enviandoRef.current = true;
      enviadoRef.current = { lances, ondeErrou };
      // Guardada ANTES de sair: é o que impede a segunda chance do F5 sem internet.
      guardarResposta(armazemDoNavegador(), aluno, { puzzleId: puzzle.id, lances, ondeErrou });
      setFase("conferindo");
      setRecusa(null);
      let resposta: RespostaDoRating;
      try {
        resposta = await responder(puzzle.id, lances);
      } catch {
        setFase("sem-rede");
        return;
      } finally {
        enviandoRef.current = false;
      }

      if ("erro" in resposta) {
        setRecusa(resposta.erro);
        if (resposta.falhaDoServidor) {
          setFase("falha");
          return;
        }
        // Recusa de vez (o pendente é outro): a guardada não serve mais.
        esquecerResposta(armazemDoNavegador(), aluno);
        setFase("recusado");
        return;
      }

      esquecerResposta(armazemDoNavegador(), aluno);
      aoVeredito(resposta);
      proximoRef.current = resposta.proximo;

      if (resposta.acertou) {
        setFase("acertou");
        agendar(() => aoProximo(resposta.proximo), FIM_DO_ACERTO_MS);
        return;
      }

      setFase("errou");
      setRevisao((r) => r + 1);
      const errado = ondeErrou ? lances.at(-1) : undefined;
      mostrarSolucao(
        resposta.solucao,
        ondeErrou ?? { fen: posicaoInicial(puzzle).fen(), indice: 1 },
        errado ? casasDe(errado) : null,
      );
    },
    [agendar, aluno, aoProximo, aoVeredito, mostrarSolucao, puzzle],
  );

  const enviarRef = useRef(enviar);
  useEffect(() => {
    enviarRef.current = enviar;
  });

  // A abertura: a posição parada, e o erro do adversário meio segundo depois.
  //
  // Com uma resposta guardada para este problema (o F5 depois de a internet
  // cair), não há abertura nem tabuleiro livre: a posição vai direto para a do
  // aluno e a resposta guardada sai. Pelo relógio, e não direto no efeito: o
  // modo estrito monta, desmonta e monta de novo, e a limpeza mata o primeiro
  // relógio antes de ele disparar — sai um envio só.
  //
  // A limpeza mata todo relógio pendente — o do adversário, o da solução e o
  // do avanço —, senão um lance do problema desmontado cai no seguinte.
  useEffect(() => {
    const relogios = relogiosRef;
    const guardada = respostaGuardada(armazemDoNavegador(), aluno, puzzle.id);
    relogios.current.push(
      setTimeout(
        () => {
          const depois = applyUci(puzzle.fen, puzzle.lances[0]);
          if (!depois) return;
          setFen(depois.fen);
          setUltimoLance(casasDe(puzzle.lances[0]));
          if (guardada) {
            void enviarRef.current([...guardada.lances], guardada.ondeErrou);
            return;
          }
          somDoLance(depois);
          setFase("jogando");
        },
        guardada ? 0 : ABERTURA_MS,
      ),
    );
    return () => {
      for (const id of relogios.current) clearTimeout(id);
      relogios.current = [];
    };
  }, [aluno, puzzle]);

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
      setUltimoLance(casasDe(uci));

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
        setUltimoLance(casasDe(puzzle.lances[passo + 1]));
        setPasso(passo + 2);
        setFase("jogando");
      }, RESPOSTA_MS);
    },
    [agendar, enviar, fen, passo, puzzle],
  );

  const reenviar = useCallback(() => {
    if (enviadoRef.current) void enviar(enviadoRef.current.lances, enviadoRef.current.ondeErrou);
  }, [enviar]);

  /**
   * Vai a um quadro da solução. Mexer à mão para a solução automática: o aluno
   * que voltou um lance para olhar não quer o tabuleiro andando sozinho por
   * cima.
   */
  const irParaQuadro = useCallback(
    (alvo: number) => {
      if (fase !== "errou" || !solucao) return false;
      const n = Math.max(0, Math.min(solucao.quadros.length - 1, alvo));
      if (n === quadro) return false;
      pararRelogios();
      if (n > quadro) somDoQuadro(solucao.quadros[n]);
      setQuadro(n);
      if (n === solucao.quadros.length - 1) setViuAteOFim(true);
    },
    [fase, pararRelogios, quadro, solucao],
  );

  const podeSeguir = fase === "errou" && viuAteOFim;
  const seguir = useCallback(() => {
    if (!podeSeguir) return false;
    aoProximo(proximoRef.current);
  }, [aoProximo, podeSeguir]);

  useAtalho("rating-proximo", seguir, { ativo: podeSeguir });
  useAtalho("rating-lance-anterior", () => irParaQuadro(quadro - 1), { ativo: fase === "errou" });
  useAtalho("rating-lance-seguinte", () => irParaQuadro(quadro + 1), { ativo: fase === "errou" });

  // Depois do erro, o tabuleiro mostra o quadro da solução; antes, o jogo.
  const naSolucao = fase === "errou" && solucao ? solucao.quadros[quadro] : null;
  const fenNaTela = naSolucao?.fen ?? fen;
  const jogo = useMemo(() => new Chess(fenNaTela), [fenNaTela]);
  const podeMover = fase === "jogando";
  const meuLado: Color = puzzle.fen.split(" ")[1] === "w" ? "black" : "white";
  const setaDoErro: DrawShape[] | undefined =
    naSolucao && quadro === 0 && solucao?.lanceErrado
      ? [{ orig: solucao.lanceErrado[0], dest: solucao.lanceErrado[1], brush: "red" }]
      : undefined;

  /** "Garfo · Cravada" e o resumo do primeiro — o que o problema era. */
  const tatica = useMemo(() => {
    const temas = temasDoProblema(puzzle.origem, puzzle.temas).flatMap((tag) => temaPorTag(tag) ?? []);
    return temas.length ? { nomes: temas.slice(0, 2).map((t) => t.nome).join(" · "), resumo: temas[0].resumo } : null;
  }, [puzzle]);

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

  const cartao = cartaoDaFase(fase, { meuLado, delta, sequencia: estado.sequencia, recusa, tatica, feitosHoje });

  return (
    <AulaShell
      magro
      tabuleiro={
        <div className="relative">
          <ChessBoard
            fen={fenNaTela}
            orientation={meuLado}
            turnColor={toBoardColor(jogo.turn())}
            dests={podeMover ? legalDests(jogo) : new Map()}
            lastMove={naSolucao ? (naSolucao.lance as [Key, Key] | null) : ultimoLance}
            check={jogo.inCheck()}
            viewOnly={!podeMover}
            revision={revisao}
            shapes={setaDoErro}
            matedKing={naSolucao ? (naSolucao.mateDe ? toBoardColor(naSolucao.mateDe) : null) : reiMatado}
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
            <div className="flex items-center gap-2">
              <ContagemDoDia feitos={feitosHoje} />
              <BotaoDeSom />
            </div>
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
            {fase === "errou" && solucao && solucao.quadros.length > 1 ? (
              <div className="flex items-center gap-1" role="group" aria-label="Rever a solução">
                <BotaoDeLance
                  rotulo="Lance anterior da solução"
                  desligado={quadro === 0}
                  onClick={() => irParaQuadro(quadro - 1)}
                >
                  ◀
                </BotaoDeLance>
                <BotaoDeLance
                  rotulo="Lance seguinte da solução"
                  desligado={quadro === solucao.quadros.length - 1}
                  onClick={() => irParaQuadro(quadro + 1)}
                >
                  ▶
                </BotaoDeLance>
              </div>
            ) : null}
            {fase === "errou" ? (
              <BotaoPrincipal onClick={seguir} esperando={!viuAteOFim}>
                Próximo →
              </BotaoPrincipal>
            ) : null}
            {fase === "sem-rede" || fase === "falha" ? <BotaoPrincipal onClick={reenviar}>Tentar de novo</BotaoPrincipal> : null}
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

/**
 * "hoje 7 de 70", e ao chegar ao teto, o convite a parar. Uma linha no cabeçalho
 * do painel, onde não empurra o tabuleiro: a 360 px o palco não tem pixel
 * sobrando.
 */
function ContagemDoDia({ feitos }: { feitos: number }) {
  if (feitos >= PROBLEMAS_POR_DIA) {
    return (
      <span className="rounded-md bg-aviso-superficie/15 px-2 py-1 text-xs font-medium text-aviso-tinta tabular-nums">
        {feitos} hoje · já pode parar
      </span>
    );
  }
  return (
    <span className="text-xs text-tinta-fraca tabular-nums">
      hoje {feitos} de {PROBLEMAS_POR_DIA}
    </span>
  );
}

function BotaoDeLance({
  rotulo,
  desligado,
  onClick,
  children,
}: {
  rotulo: string;
  desligado: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desligado}
      onClick={onClick}
      className="foco flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-borda text-sm text-tinta-media transition-colors hover:bg-carta-toque disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function cartaoDaFase(
  fase: Fase,
  {
    meuLado,
    delta,
    sequencia,
    recusa,
    tatica,
    feitosHoje,
  }: {
    meuLado: Color;
    delta: number | null;
    sequencia: number;
    recusa: string | null;
    tatica: { nomes: string; resumo: string } | null;
    feitosHoje: number;
  },
): { comando: string; estado?: string; tom: TomDoCartao } {
  const lado = meuLado === "white" ? "brancas" : "pretas";
  // O problema que acabou de fechar a conta do dia diz isso uma vez, no veredito.
  const fechouODia = feitosHoje === PROBLEMAS_POR_DIA ? `${PROBLEMAS_POR_DIA} hoje: bom lugar para parar.` : null;
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
        estado: fechouODia ?? (sequencia > 1 ? `🔥 ${sequencia} seguidos` : "O próximo já vem."),
        tom: "bom",
      };
    case "errou":
      return {
        comando: `Incorreto ${delta === null ? "" : formatarDelta(delta)}`.trim(),
        estado: [tatica ? `A tática: ${tatica.nomes}. ${tatica.resumo}` : "Veja a solução no tabuleiro.", fechouODia]
          .filter(Boolean)
          .join(" "),
        tom: "ruim",
      };
    case "sem-rede":
      return { comando: "Sem conexão", estado: "Sua resposta não se perdeu: tente de novo.", tom: "aviso" };
    case "falha":
      return { comando: "O servidor não conferiu", estado: "Sua resposta está guardada: tente de novo.", tom: "aviso" };
    case "recusado":
      return { comando: "Não deu para conferir", estado: recusa ?? "Recarregue a página.", tom: "aviso" };
  }
}
