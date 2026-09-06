"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import type { Linha } from "@/lib/repertorio/linhas";
import {
  acuracia,
  inicio,
  reduzir,
  type Efeito,
  type Evento,
  type Modo,
  type Selo,
} from "@/lib/repertorio/passada";
import { playForMove, playRefusal, playSuccess } from "@/lib/sound";
import { ABERTURA_MS } from "@/lib/tatica/tempos";
import { Cartao } from "./Cartao";
import { FaixaDeSans, FitaDoBoletim } from "./FitaDeLances";

/**
 * A casca da passada: relógios, tabuleiro e teclado.
 *
 * **Tudo o que decide alguma coisa está em `lib/repertorio/passada.ts`**, que é
 * puro e testado. Este arquivo não sabe o que é uma alternativa nem quando a
 * dica custa: ele despacha eventos, aplica os efeitos que voltam, e desenha o
 * estado. É a divisão que permitiu a máquina de estado do treinador ter teste
 * pela primeira vez.
 *
 * O componente inteiro é remontado por `key` a cada rodada — é assim que o
 * estado de uma passada volta ao zero, e é por isso que não há nenhum
 * `useEffect` aqui tentando ressincronizar coisa alguma quando a linha muda.
 */

/** Quanto o disco do veredito fica na casa de destino. */
const SELO_MS = 800;

/**
 * O pincel de cada selo. Os três reaproveitam a paleta pedagógica de
 * `app/globals.css` — o aro verde e o aro vermelho são literalmente o mesmo
 * desenho de `defendida` e `pendurada` na tática, e o âmbar entrou com este
 * bloco porque aqui os vereditos são três, e não dois.
 */
const PINCEL: Record<Selo, string> = {
  acerto: "green",
  alternativa: "yellow",
  falha: "red",
};

export type PassadaProps = {
  linha: Linha;
  modo: Modo;
  /** Manda os lances ao servidor. Chamada **uma vez** por passada, ou nenhuma. */
  aoDecidir: (lances: string[], porQue: "erro" | "dica" | "fim") => void;
  /** O placar da passada sobe junto: é o que o painel de fim precisa dizer. */
  aoTerminar: (placar: { acertos: number; total: number; acertou: boolean }) => void;
  /** A emenda: o fim da assistida chama o quiz sem trocar de rota. */
  aoComecarQuiz: () => void;
};

export function Passada({ linha, modo, aoDecidir, aoTerminar, aoComecarQuiz }: PassadaProps) {
  const [estado, setEstado] = useState(() => inicio(linha, modo));
  /**
   * O estado autoritativo, fora do React.
   *
   * O redutor **não** pode rodar dentro do atualizador do `setState`: em
   * desenvolvimento o React o chama duas vezes de propósito, e os efeitos —
   * som, e sobretudo a gravação no servidor — sairiam em dobro. Com o `ref`,
   * `reduzir` roda uma vez por evento, fora de qualquer render.
   */
  const estadoRef = useRef(estado);

  const [marca, setMarca] = useState<{ casa: string; qual: Selo } | null>(null);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);
  /**
   * O chessground move a peça na tela por conta própria antes de perguntar.
   * Quando o lance é recusado sem mudar a FEN, é este número que o faz
   * redesenhar a posição de verdade.
   */
  const [ressincronizar, setRessincronizar] = useState(0);

  const relogiosRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const agendar = useCallback((quefazer: () => void, ms: number) => {
    relogiosRef.current.push(setTimeout(quefazer, ms));
  }, []);

  // A limpeza mata todo relógio pendente. Sem ela, o lance de uma passada
  // desmontada chega no meio da próxima.
  useEffect(() => {
    const relogios = relogiosRef;
    return () => {
      for (const id of relogios.current) clearTimeout(id);
      relogios.current = [];
    };
  }, []);

  // O efeito `agendar` precisa despachar, e despachar precisa rodar efeitos:
  // as duas funções se chamam. O `ref` é o que quebra o ciclo sem congelar
  // nenhuma das duas numa versão velha.
  const despacharRef = useRef<(evento: Evento) => void>(() => {});

  const rodar = useCallback(
    (efeito: Efeito) => {
      switch (efeito.tipo) {
        case "som-lance":
          playForMove({ capture: efeito.captura, check: efeito.xeque });
          break;
        case "som-recusa":
          playRefusal();
          break;
        case "som-premio":
          playSuccess();
          break;
        case "selo":
          setMarca({ casa: efeito.casa, qual: efeito.qual });
          agendar(() => setMarca(null), SELO_MS);
          break;
        case "decidir":
          aoDecidir([...efeito.lances], efeito.porQue);
          break;
        case "agendar":
          agendar(() => despacharRef.current(efeito.evento), efeito.ms);
          break;
        case "terminou":
          aoTerminar(acuracia(estadoRef.current));
          break;
      }
    },
    [agendar, aoDecidir, aoTerminar],
  );

  const despachar = useCallback(
    (evento: Evento) => {
      const { estado: novo, efeitos } = reduzir(linha, estadoRef.current, evento);
      estadoRef.current = novo;
      setEstado(novo);
      for (const efeito of efeitos) rodar(efeito);
    },
    [linha, rodar],
  );

  useEffect(() => {
    despacharRef.current = despachar;
  }, [despachar]);

  /**
   * O **primeiro** lance do adversário, nas linhas de pretas.
   *
   * É o único que a casca dispara: não existe evento anterior de onde emiti-lo.
   * Todos os outros saem do próprio redutor, no instante em que a vez passa a
   * ser dele. A espera é maior aqui de propósito — o aluno precisa ver a
   * posição parada para entender que o tabuleiro é dele, e não uma figura.
   *
   * Dependências vazias: este efeito é de montagem, e a limpeza cobre o
   * monta-desmonta-remonta que o React faz em desenvolvimento.
   */
  useEffect(() => {
    if (linha.meus.includes(0)) return;
    const relogio = setTimeout(() => despacharRef.current({ tipo: "adversarioJogou" }), ABERTURA_MS);
    return () => clearTimeout(relogio);
  }, [linha.meus]);

  /**
   * A tecla →: solta a leitura de um comentário, e emenda o quiz no fim da
   * assistida. É o mesmo gesto de todo visualizador de partida, e no computador
   * da escola ela é mais rápida que o mouse.
   *
   * **Não é a barra de espaço**, que é o que o chess.com usa: no navegador ela
   * rola a página e dispara o botão que estiver com o foco, e as duas coisas
   * acontecem *além* do que a gente pedir.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "ArrowRight") return;
      if (estado.fase === "lendo") {
        evento.preventDefault();
        despachar({ tipo: "continuar" });
      } else if (estado.fase === "resolvido" && modo === "assistido") {
        evento.preventDefault();
        aoComecarQuiz();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoComecarQuiz, despachar, estado.fase, modo]);

  /* ---------------------------------------------------------------- *
   * O tabuleiro
   * ---------------------------------------------------------------- */

  const jogo = useMemo(() => new Chess(estado.fen), [estado.fen]);
  const meuLado: Color = linha.cor === "brancas" ? "white" : "black";
  const minhaVez = linha.meus.includes(estado.passo);
  const podeMover = estado.fase === "jogando" && minhaVez;

  const aoMover = useCallback(
    (orig: Key, dest: Key) => {
      if (!podeMover) {
        setRessincronizar((n) => n + 1);
        return;
      }
      const peca = jogo.get(orig as Square);
      if (peca?.type === "p" && (dest[1] === "8" || dest[1] === "1")) {
        setPromocao({ orig, dest });
        return;
      }
      despachar({ tipo: "jogou", uci: `${orig}${dest}` });
    },
    [despachar, jogo, podeMover],
  );

  /**
   * Três camadas no mesmo canal (`setAutoShapes`): a seta da fase assistida, a
   * casa acesa da dica, e o selo do veredito.
   *
   * A seta e a dica nunca aparecem juntas — a assistida não tem dica, porque a
   * seta já está lá. O selo convive com as duas: ele dura menos de um segundo e
   * é o que permite ao cartão ser quase monocromático.
   */
  const shapes: DrawShape[] = useMemo(() => {
    const lista: DrawShape[] = [];
    const esperado = linha.lances[estado.passo];

    // Na assistida a seta fica **também** durante a recusa: o cartão daquele
    // instante diz "siga a seta", e uma seta que some enquanto o texto manda
    // segui-la é a tela contradizendo a si mesma. Medido no navegador em 6/9.
    const recusando = modo === "assistido" && estado.fase === "mostrando";

    if (esperado && (estado.fase === "jogando" || recusando) && minhaVez) {
      const orig = esperado.slice(0, 2) as Key;
      if (modo === "assistido") {
        lista.push({ orig, dest: esperado.slice(2, 4) as Key, brush: "blue" });
      } else if (estado.dicaNoPasso === estado.passo) {
        // Um nível só: a casa de origem, que é a pergunta "qual peça?". A seta
        // inteira daria o lance, e a dica deixaria de custar alguma coisa.
        lista.push({ orig, brush: "blue" });
      }
    }

    if (marca) lista.push({ orig: marca.casa as Key, brush: PINCEL[marca.qual] });
    return lista;
  }, [estado.dicaNoPasso, estado.fase, estado.passo, linha.lances, marca, minhaVez, modo]);

  const fim = estado.fase === "resolvido";
  const placar = acuracia(estado);

  return (
    <>
      <div className="relative">
        <ChessBoard
          fen={estado.fen}
          orientation={meuLado}
          turnColor={toBoardColor(jogo.turn())}
          dests={podeMover ? legalDests(jogo) : new Map()}
          lastMove={estado.ultimoLance ? [estado.ultimoLance[0] as Key, estado.ultimoLance[1] as Key] : null}
          check={jogo.inCheck()}
          viewOnly={!podeMover}
          revision={estado.revisao + ressincronizar}
          shapes={shapes}
          onMove={aoMover}
        />
        {promocao ? (
          <PromotionPicker
            color={meuLado}
            onChoose={(peca: PromotionChoice) => {
              const { orig, dest } = promocao;
              setPromocao(null);
              despachar({ tipo: "jogou", uci: `${orig}${dest}${peca}` });
            }}
            onCancel={() => {
              setPromocao(null);
              setRessincronizar((n) => n + 1);
            }}
          />
        ) : null}
      </div>

      {/*
       * No fim do quiz o cartão sai e a fita entra no lugar dele: o painel de
       * resultado do `Treino` já diz o que aconteceu, e um cartão repetindo
       * "linha completa" logo acima seria a mesma frase duas vezes.
       */}
      {fim && modo === "quiz" ? (
        <FitaDoBoletim boletim={estado.boletim} acertos={placar.acertos} />
      ) : (
        <Cartao conteudo={estado.cartao} />
      )}

      <Comentario texto={estado.comentario} />

      <FaixaDeSans linha={linha} ate={estado.passo} atual={estado.passo - 1} />

      <div className="flex flex-wrap items-center gap-2">
        {estado.fase === "lendo" ? (
          <Principal onClick={() => despachar({ tipo: "continuar" })}>Continuar →</Principal>
        ) : null}

        {modo === "assistido" && fim ? (
          <Principal onClick={aoComecarQuiz}>Começar o quiz →</Principal>
        ) : null}

        {modo === "assistido" && !fim ? (
          <Secundario onClick={aoComecarQuiz}>Pular e jogar</Secundario>
        ) : null}

        {modo === "quiz" && podeMover ? (
          <Secundario onClick={() => despachar({ tipo: "pediuDica" })}>Dica</Secundario>
        ) : null}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * As peças de tela que só a passada usa
 * ------------------------------------------------------------------ */

/** O texto do professor. Some quando não existe: caixa vazia não é informação. */
function Comentario({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <p className="rounded-lg bg-carta-alta px-3 py-2.5 text-sm text-tinta-media">{texto}</p>;
}

function Principal({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
    >
      {children}
    </button>
  );
}

function Secundario({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="foco rounded-lg border border-borda px-3 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
    >
      {children}
    </button>
  );
}
