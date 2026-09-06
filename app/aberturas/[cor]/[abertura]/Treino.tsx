"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { applyUci, type Applied } from "@/lib/chess/fen";
import type { Cor, Linha } from "@/lib/repertorio/linhas";
import {
  semQuebras,
  vereditoDoLance,
  type ProgressoDaLinha,
} from "@/lib/repertorio/treino";
import {
  armAudioOnFirstGesture,
  isSoundOn,
  playComplete,
  playForMove,
  playRefusal,
  playSuccess,
  setSoundOn,
  subscribeSound,
} from "@/lib/sound";
import { ABERTURA_MS, RESPOSTA_MS, VOLTA_MS } from "@/lib/tatica/tempos";
import { Bolinhas } from "../../Bolinhas";
import { registrarTreino } from "../../acoes";

/**
 * O treinador de uma linha do repertório: mostrar, cobrar e gravar.
 *
 * ## A regra que decide o desenho inteiro
 *
 * **Uma passada pela linha é uma tentativa, e o primeiro erro já a decide.**
 * Errou: grava errado na hora, os acertos seguidos voltam a zero, e a linha
 * **continua na tela** com dicas — dois erros acendem a casa, três desenham a
 * seta. Acertou do começo ao fim: grava certo, e três dessas seguidas fazem a
 * linha virar "aprendida".
 *
 * O aluno tem 10 a 15 anos e faz isto sozinho, no celular. Uma linha travada
 * sem saída vira aba fechada; como a tentativa já foi decidida no primeiro
 * erro, a dica não compra acerto nenhum.
 *
 * ## Mostrar antes de cobrar
 *
 * Na primeira vez em cada linha o site entra em **modo ver**: o tabuleiro anda
 * sozinho no primeiro lance, o botão "Próximo" (ou a tecla →) anda no resto, e
 * o comentário do professor aparece onde existe. Cobrar de cara uma linha que o
 * aluno nunca viu não é treino, é adivinhação — e decorar sem entender o porquê
 * é exatamente o que a aula não quer.
 *
 * O modo ver **não grava nada**, e o botão continua disponível depois.
 *
 * ## O que é mandado ao servidor
 *
 * Os **lances jogados**, nunca um "acertei". Quem julga é a server action,
 * reconferindo com a mesma função que este componente usa para dizer "certo" na
 * tela (`lib/repertorio/treino.ts`). Um juiz só, dois lugares.
 *
 * ## Por que são dois componentes
 *
 * `Treino` conta a rodada e guarda o que o servidor respondeu; `Vendo` e
 * `Treinando` resolvem **uma passada**, e são remontados por `key`. A separação
 * não é arrumação: todo o estado de uma passada — posição, fase, erros — tem de
 * voltar ao zero quando a próxima começa, e a maneira do React de zerar estado
 * é desmontar o componente.
 *
 * A `rodada` é local, e não vem do servidor, por um caso concreto: a tela de
 * fim aparece no mesmo instante em que a gravação dispara. No 4G a resposta
 * demora, e um "Próxima linha" clicado antes dela faria o `router.refresh()`
 * ler o `tentativas` velho — a `key` do servidor não mudaria, e o aluno ficaria
 * preso na mesma tela. Aqui o botão espera a resposta, e "Jogar de novo"
 * remonta por conta própria de qualquer jeito.
 */

/** A partir de quantos erros a dica aparece. Dois: a casa; três: a seta. */
const DICA_APOS = 2;

type Modo = "ver" | "treinar";

export type TreinoProps = {
  cor: Cor;
  abertura: string;
  linha: Linha;
  progresso: ProgressoDaLinha;
  modoInicial: Modo;
  posicao: { indice: number; total: number };
};

export function Treino({
  cor,
  abertura,
  linha,
  progresso,
  modoInicial,
  posicao,
}: TreinoProps) {
  const router = useRouter();

  // Destrava o `AudioContext` no primeiro toque ou tecla desta página — sem
  // isso o navegador emudece tudo. Devolve o removedor dos ouvintes.
  useEffect(() => armAudioOnFirstGesture(), []);

  const [modo, setModo] = useState<Modo>(modoInicial);
  const [rodada, setRodada] = useState(0);
  const [terminou, setTerminou] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [resultado, setResultado] = useState<{
    acertou: boolean;
    progresso: ProgressoDaLinha;
  } | null>(null);
  const [falhaAoGravar, setFalhaAoGravar] = useState<string | null>(null);

  /**
   * A passada terminou: manda os lances e guarda o que voltou.
   *
   * O `progresso` que a tela mostra depois é o do **servidor**, não uma conta
   * feita aqui. Nas duas ele seria igual — é a mesma `depoisDoTreino` —, e é
   * justamente por isso que vale usar o do servidor: as bolinhas passam a
   * mostrar, literalmente, o que ficou gravado.
   */
  const decidir = useCallback(
    async (lances: string[]) => {
      setGravando(true);
      const resposta = await registrarTreino({ cor, abertura, linhaId: linha.id, lances });
      setGravando(false);
      if ("erro" in resposta) {
        // Falar em vez de fingir: o aluno tem de saber que aquela passada não
        // entrou na conta, senão fecha a tarefa achando que aprendeu a linha.
        setFalhaAoGravar(resposta.erro);
        return;
      }
      setResultado(resposta);
    },
    [abertura, cor, linha.id],
  );

  const atual = resultado?.progresso ?? progresso;

  // A linha acabou de virar "aprendida": o prêmio toca uma vez. Não é
  // `setState` num efeito — é um efeito colateral disparado por uma transição
  // que já aconteceu, que é para isso que o `useEffect` serve.
  const virouAprendida = resultado !== null
    && resultado.progresso.aprendidaEm !== null
    && progresso.aprendidaEm === null;
  useEffect(() => {
    if (virouAprendida) playComplete();
  }, [virouAprendida]);

  const dNovo = useCallback(() => {
    setTerminou(false);
    setResultado(null);
    setFalhaAoGravar(null);
    setModo("treinar");
    setRodada((r) => r + 1);
  }, []);

  const verDeNovo = useCallback(() => {
    setTerminou(false);
    setResultado(null);
    setModo("ver");
    setRodada((r) => r + 1);
  }, []);

  /**
   * A próxima linha vem do servidor, e não daqui: `proximaLinha` sabe a ordem,
   * e a tela não precisa saber. O `replace` tira o `?linha=` da URL — sem isso
   * um link velho prenderia o aluno na mesma linha para sempre.
   */
  const proxima = useCallback(() => {
    router.replace(`/aberturas/${cor}/${abertura}`);
    router.refresh();
  }, [abertura, cor, router]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-sm font-medium text-tinta">{linha.nome}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-tinta-fraca tabular-nums">
              linha {posicao.indice} de {posicao.total}
            </span>
            <span className="text-tinta-muda" aria-hidden>
              ·
            </span>
            <Bolinhas progresso={atual} />
          </div>
        </div>
        <BotaoDeSom />
      </div>

      {modo === "ver" ? (
        <Vendo
          key={`ver:${linha.id}:${rodada}`}
          linha={linha}
          aoTreinar={dNovo}
        />
      ) : (
        <Treinando
          key={`treinar:${linha.id}:${rodada}`}
          linha={linha}
          aoDecidir={decidir}
          aoTerminar={() => setTerminou(true)}
        />
      )}

      {falhaAoGravar ? <Falha erro={falhaAoGravar} /> : null}

      {terminou ? (
        <div className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-4">
          {virouAprendida ? (
            <p className="titulo text-metodo-tinta-alta">Linha aprendida!</p>
          ) : resultado && !resultado.acertou ? (
            <p className="text-sm font-semibold text-tinta">
              Você chegou ao fim — mas houve um erro no caminho, e os acertos seguidos
              voltaram a zero.
            </p>
          ) : (
            <p className="text-sm font-semibold text-tinta">Linha inteira, sem erro.</p>
          )}

          <Comentario texto={linha.comentarios[String(linha.lances.length - 1)]} tom="bom" />

          <div className="flex flex-wrap gap-2">
            {resultado?.acertou === false ? (
              <>
                <Principal onClick={dNovo} esperando={gravando}>
                  Jogar de novo
                </Principal>
                <Secundario onClick={proxima} esperando={gravando}>
                  Próxima linha
                </Secundario>
              </>
            ) : (
              <>
                <Principal onClick={proxima} esperando={gravando}>
                  Próxima linha
                </Principal>
                <Secundario onClick={dNovo} esperando={gravando}>
                  Jogar de novo
                </Secundario>
              </>
            )}
            <Secundario onClick={verDeNovo} esperando={false}>
              Ver a linha
            </Secundario>
          </div>
        </div>
      ) : modo === "treinar" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={verDeNovo}
            className="foco rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media hover:bg-carta-toque"
          >
            Ver a linha
          </button>
          <Link
            href="/aberturas"
            className="foco text-xs font-medium text-metodo-tinta hover:underline"
          >
            Escolher outra abertura →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Modo ver: o site mostra a linha
 * ------------------------------------------------------------------ */

function Vendo({ linha, aoTreinar }: { linha: Linha; aoTreinar: () => void }) {
  const [fen, setFen] = useState(linha.fenInicial);
  const [feitos, setFeitos] = useState(0);
  const [ultimoLance, setUltimoLance] = useState<[Key, Key] | null>(null);

  const acabou = feitos >= linha.lances.length;

  const proximo = useCallback(() => {
    setFeitos((quantos) => {
      if (quantos >= linha.lances.length) return quantos;
      const uci = linha.lances[quantos];
      const depois = applyUci(fen, uci);
      if (!depois) return quantos;
      somDoLance(depois);
      setFen(depois.fen);
      setUltimoLance([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
      return quantos + 1;
    });
  }, [fen, linha.lances]);

  /**
   * O primeiro lance entra sozinho, meio segundo depois. A pausa não é enfeite:
   * o aluno precisa ver a posição inicial parada para entender que o tabuleiro
   * é dele, e não uma figura.
   *
   * **A guarda é o próprio `feitos`, e não um `ref`.** Em desenvolvimento o
   * React monta, desmonta e remonta cada componente de propósito, para achar
   * efeito sem limpeza; um `ref` de "já abri" sobrevive a isso e o segundo
   * agendamento nunca acontece — o tabuleiro fica parado na posição inicial
   * para sempre. Com o estado na dependência, o efeito é idempotente: ele
   * reagenda enquanto `feitos` for zero, e para sozinho quando o lance entra.
   */
  useEffect(() => {
    if (feitos !== 0) return;
    const relogio = setTimeout(() => {
      const uci = linha.lances[0];
      const depois = applyUci(linha.fenInicial, uci);
      if (!depois) return;
      somDoLance(depois);
      setFen(depois.fen);
      setUltimoLance([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
      setFeitos(1);
    }, ABERTURA_MS);
    return () => clearTimeout(relogio);
  }, [feitos, linha]);

  // A tecla → anda um lance. É o mesmo gesto de todo visualizador de partida, e
  // no computador da escola ela é mais rápida que o mouse.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        proximo();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [proximo]);

  const jogo = useMemo(() => new Chess(fen), [fen]);

  return (
    <>
      <ChessBoard
        fen={fen}
        orientation={toBoardColor(linha.cor === "brancas" ? "w" : "b")}
        turnColor={toBoardColor(jogo.turn())}
        lastMove={ultimoLance}
        check={jogo.inCheck()}
        viewOnly
      />

      <FaixaDeSans linha={linha} ate={feitos} atual={feitos - 1} />

      <Comentario texto={linha.comentarios[String(feitos - 1)]} tom={acabou ? "bom" : "calma"} />

      <div className="flex flex-wrap items-center gap-2">
        {acabou ? (
          <Principal onClick={aoTreinar} esperando={false}>
            Agora você
          </Principal>
        ) : (
          <Principal onClick={proximo} esperando={false}>
            Próximo →
          </Principal>
        )}
        <button
          type="button"
          onClick={aoTreinar}
          className="foco rounded-lg border border-borda px-3 py-2.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
        >
          {acabou ? "Ver de novo depois" : "Pular e jogar"}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Modo treinar: o aluno joga
 * ------------------------------------------------------------------ */

type Fase =
  /** A vez do aluno, ou a espera do lance do adversário. */
  | "jogando"
  /** O tabuleiro está mostrando alguma coisa: alternativa, ou volta de erro. */
  | "mostrando"
  /** A linha acabou. */
  | "resolvido";

type Aviso = { texto: string; tom: "calma" | "bom" | "ruim" | "aviso" } | null;

function Treinando({
  linha,
  aoDecidir,
  aoTerminar,
}: {
  linha: Linha;
  aoDecidir: (lances: string[]) => void;
  aoTerminar: () => void;
}) {
  const [fen, setFen] = useState(linha.fenInicial);
  const [passo, setPasso] = useState(0);
  const [fase, setFase] = useState<Fase>("jogando");
  const [erros, setErros] = useState(0);
  const [ultimoLance, setUltimoLance] = useState<[Key, Key] | null>(null);
  const [revisao, setRevisao] = useState(0);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);

  /** Os lances do aluno nesta passada. É o que vai ao servidor. */
  const jogadosRef = useRef<string[]>([]);
  /** Uma gravação por passada: o segundo pedido é ignorado. */
  const decididoRef = useRef(false);
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

  const meuLado: Color = linha.cor === "brancas" ? "white" : "black";
  const minhaVez = linha.meus.includes(passo);

  /**
   * Aplica um lance e segue a linha. O tabuleiro pode receber um lance
   * diferente do que o aluno jogou — é o caso da alternativa, em que a peça
   * volta e a linha do clube entra no lugar.
   */
  const aplicar = useCallback(
    (uciNoTabuleiro: string, uciDoAluno: string) => {
      const depois = applyUci(fen, uciNoTabuleiro);
      if (!depois) return;

      jogadosRef.current.push(uciDoAluno);
      setFen(depois.fen);
      setUltimoLance([
        uciNoTabuleiro.slice(0, 2) as Key,
        uciNoTabuleiro.slice(2, 4) as Key,
      ]);

      const comentario = linha.comentarios[String(passo)];
      const acabou = passo + 1 >= linha.lances.length;

      if (acabou) {
        // Prêmio **no lugar** do som do lance: o fim da linha não pode soar
        // igual a um lance qualquer.
        playSuccess();
        setFase("resolvido");
        setAviso(null);
        // O `passo` anda também aqui, e não só no meio da linha: é ele que diz
        // à faixa quantos lances mostrar, e sem isto o lance que fechou a linha
        // ficava no tabuleiro e **fora** da faixa.
        setPasso(passo + 1);
        if (!decididoRef.current) {
          decididoRef.current = true;
          aoDecidir([...jogadosRef.current]);
        }
        aoTerminar();
        return;
      }

      somDoLance(depois);
      setAviso(comentario ? { texto: semQuebras(comentario), tom: "calma" } : null);
      setPasso(passo + 1);
      setFase("jogando");
    },
    [aoDecidir, aoTerminar, fen, linha.comentarios, linha.lances.length, passo],
  );

  /**
   * **Uma regra só para o adversário: enquanto o meio-lance não é nosso, ele
   * joga sozinho.** Cobre o `1.d4` que abre as linhas das pretas e as respostas
   * do meio com o mesmo código — e a linha sempre termina num lance nosso, pela
   * regra de `lib/repertorio/linhas.ts`, então isto nunca fica esperando.
   *
   * O primeiro lance espera mais: o aluno precisa ver a posição parada antes de
   * a primeira peça andar.
   */
  useEffect(() => {
    if (fase !== "jogando" || minhaVez || passo >= linha.lances.length) return;
    const uci = linha.lances[passo];
    const relogio = setTimeout(
      () => {
        const depois = applyUci(fen, uci);
        if (!depois) return;
        somDoLance(depois);
        setFen(depois.fen);
        setUltimoLance([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
        const comentario = linha.comentarios[String(passo)];
        setAviso(comentario ? { texto: semQuebras(comentario), tom: "calma" } : null);
        setPasso(passo + 1);
      },
      passo === 0 ? ABERTURA_MS : RESPOSTA_MS,
    );
    return () => clearTimeout(relogio);
  }, [fase, fen, linha.comentarios, linha.lances, minhaVez, passo]);

  /** O SAN de um lance qualquer nesta posição — para nomear o que o aluno fez. */
  const sanDe = useCallback(
    (uci: string): string => applyUci(fen, uci)?.game.history().at(-1) ?? uci,
    [fen],
  );

  const jogar = useCallback(
    (uci: string) => {
      const veredito = vereditoDoLance(linha, passo, uci);

      if (veredito === "certo") {
        aplicar(uci, uci);
        return;
      }

      if (veredito === "alternativa") {
        /*
         * A alternativa conta como acerto — o autor a marcou como boa, e o
         * servidor a aceita. Mas a peça **volta**, e a linha do clube entra no
         * lugar: o que se está decorando é a linha, e deixar duas posições
         * diferentes conviverem faria o aluno chegar ao lance seguinte com o
         * tabuleiro que ele inventou.
         */
        const principal = linha.lances[passo];
        const ultimoPly = passo + 1 >= linha.lances.length;
        setRevisao((r) => r + 1);
        setFase("mostrando");
        setAviso({
          texto: ultimoPly
            ? `Também vale. A linha do clube termina com ${linha.sans[passo]}.`
            : `Também vale. A linha do clube joga ${linha.sans[passo]}.`,
          tom: "aviso",
        });
        agendar(() => aplicar(principal, uci), VOLTA_MS);
        return;
      }

      // Recusa. A peça volta: `revisao` força a ressincronização mesmo com a
      // FEN igual — o chessground já a moveu na tela por conta própria.
      setRevisao((r) => r + 1);
      playRefusal();
      setFase("mostrando");
      setErros((n) => n + 1);

      /*
       * O recado do erro **carrega a dica**, em vez de a dica ter um recado
       * próprio. Eram dois textos disputando a mesma caixa, e o do erro ganhava
       * sempre: a casa acendia no tabuleiro e nada na tela dizia o que ela era.
       * Um aluno de 10 anos não deduz isso sozinho.
       */
      const qualErro = erros + 1;
      const dica =
        qualErro > DICA_APOS
          ? " A seta mostra o lance — jogue-o para ver por quê."
          : qualErro === DICA_APOS
            ? " A casa acesa é a peça que resolve."
            : "";
      setAviso({
        texto:
          (veredito === "erro-nomeado"
            ? `${sanDe(uci)} é o lance que a fonte mostra de propósito como errado. Olhe de novo.`
            : "Não é esse. Olhe de novo — esta tentativa já contou.") + dica,
        tom: "ruim",
      });

      if (!decididoRef.current) {
        decididoRef.current = true;
        // O servidor julga: a sequência com o lance errado dentro não fecha a
        // linha, e é ele quem diz isso.
        aoDecidir([...jogadosRef.current, uci]);
      }
      agendar(() => setFase("jogando"), VOLTA_MS);
    },
    [agendar, aoDecidir, aplicar, erros, linha, passo, sanDe],
  );

  const jogo = useMemo(() => new Chess(fen), [fen]);
  const podeMover = fase === "jogando" && minhaVez;

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

  /**
   * As dicas. Dois erros acendem a casa da peça que resolve; três desenham a
   * seta inteira.
   *
   * Aqui é memória, e não cálculo: o aluno que esqueceu a linha não vai
   * *descobri-la* olhando o tabuleiro, porque não há nada a descobrir. Como a
   * tentativa já foi decidida no primeiro erro, a dica não compra nada — ela só
   * evita que a aba feche.
   */
  const dicas: DrawShape[] = useMemo(() => {
    if (fase === "resolvido" || erros < DICA_APOS || !minhaVez) return [];
    const esperado = linha.lances[passo];
    if (!esperado) return [];
    const orig = esperado.slice(0, 2) as Key;
    return erros > DICA_APOS
      ? [{ orig, dest: esperado.slice(2, 4) as Key, brush: "blue" }]
      : [{ orig, brush: "blue" }];
  }, [erros, fase, linha.lances, minhaVez, passo]);

  return (
    <>
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
          shapes={dicas}
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

      {/*
       * Só os lances já jogados. A faixa inteira daria a resposta de graça — e
       * é justamente ela que serve para o aluno ver **onde** errou depois.
       */}
      <FaixaDeSans linha={linha} ate={passo} atual={passo - 1} />

      <Recado
        aviso={aviso}
        fase={fase}
        minhaVez={minhaVez}
        cor={linha.cor}
        comecou={passo > 0}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * A faixa de lances
 * ------------------------------------------------------------------ */

/**
 * Os lances em SAN, com os nossos em negrito e o último em destaque.
 *
 * Ela é o centro do modo ver — e não o comentário. Medido: são 56 comentários
 * em 42 linhas, e 42 deles são o do lance final; sobram 14 no meio inteiro do
 * repertório. Uma tela construída em volta do comentário mostraria uma caixa
 * vazia quase sempre.
 */
function FaixaDeSans({ linha, ate, atual }: { linha: Linha; ate: number; atual: number }) {
  if (ate <= 0) {
    return (
      <p className="min-h-8 text-sm text-tinta-muda">A posição inicial.</p>
    );
  }

  return (
    <p className="flex min-h-8 flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm text-tinta-media tabular-nums">
      {linha.sans.slice(0, ate).map((san, i) => (
        <span key={`${i}-${san}`} className="flex items-baseline gap-1">
          {i % 2 === 0 ? (
            <span className="text-tinta-muda">{i / 2 + 1}.</span>
          ) : null}
          <span
            className={`${linha.meus.includes(i) ? "font-semibold text-tinta" : ""} ${
              i === atual ? "rounded bg-metodo-superficie/20 px-1 text-metodo-tinta-alta" : ""
            }`}
          >
            {san}
          </span>
        </span>
      ))}
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * O recado sob o tabuleiro
 *
 * Altura mínima fixa: sem ela a página pula meia linha a cada lance, e no
 * celular o tabuleiro sai do lugar debaixo do dedo.
 * ------------------------------------------------------------------ */

function Recado({
  aviso,
  fase,
  minhaVez,
  cor,
  comecou,
}: {
  aviso: Aviso;
  fase: Fase;
  minhaVez: boolean;
  cor: Cor;
  comecou: boolean;
}) {
  if (aviso) return <Balao tom={aviso.tom}>{aviso.texto}</Balao>;

  // No fim o painel de baixo já diz o que aconteceu, com o comentário do
  // professor junto. Um balão aqui seria a mesma frase duas vezes.
  if (fase === "resolvido") return null;

  if (!minhaVez) {
    return <Balao tom="calma">{comecou ? "Veja a resposta dele." : "Ele começa. Olhe."}</Balao>;
  }

  return (
    <Balao tom="calma">
      Sua vez. Você joga de {cor}
      {comecou ? "" : " e abre a linha"}.
    </Balao>
  );
}

function Balao({
  tom,
  children,
}: {
  tom: "calma" | "bom" | "ruim" | "aviso";
  children: React.ReactNode;
}) {
  const cor =
    tom === "bom"
      ? "bg-metodo-superficie/15 text-metodo-tinta-alta"
      : tom === "ruim"
        ? "bg-erro-superficie/12 text-erro-texto"
        : tom === "aviso"
          ? "bg-aviso-superficie/15 text-aviso-tinta"
          : "bg-carta text-tinta-media";
  return (
    <p aria-live="polite" className={`min-h-11 rounded-lg px-3 py-2.5 text-sm ${cor}`}>
      {children}
    </p>
  );
}

/** O texto do professor. Some quando não existe: caixa vazia não é informação. */
function Comentario({ texto, tom }: { texto: string | undefined; tom: "calma" | "bom" }) {
  if (!texto?.trim()) return null;
  return (
    <p
      className={`rounded-lg px-3 py-2.5 text-sm ${
        tom === "bom"
          ? "bg-metodo-superficie/15 text-metodo-tinta-alta"
          : "bg-carta-alta text-tinta-media"
      }`}
    >
      {semQuebras(texto)}
    </p>
  );
}

function Falha({ erro }: { erro: string }) {
  return (
    <p
      role="alert"
      className="min-h-11 rounded-lg bg-erro-superficie/15 px-3 py-2.5 text-sm text-erro-texto"
    >
      Não deu para gravar esta passada ({erro}). Avise o professor — o que você treinar
      depois disso pode não estar contando.
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * Botões e som
 * ------------------------------------------------------------------ */

function Principal({
  onClick,
  esperando,
  children,
}: {
  onClick: () => void;
  esperando: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={esperando}
      className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Secundario({
  onClick,
  esperando,
  children,
}: {
  onClick: () => void;
  esperando: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={esperando}
      className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/**
 * Liga e desliga o som. A preferência mora no `localStorage`, fora do React —
 * por isso `useSyncExternalStore`: no servidor o som é "ligado", e a leitura
 * real do armazenamento entra na hidratação sem acusar divergência.
 */
function BotaoDeSom() {
  const ligado = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!ligado)}
      aria-pressed={ligado}
      className="foco min-h-11 shrink-0 rounded-lg px-2 text-lg leading-none transition-colors hover:bg-carta-toque"
    >
      <span aria-hidden>{ligado ? "🔊" : "🔇"}</span>
      <span className="sr-only">{ligado ? "Desligar o som" : "Ligar o som"}</span>
    </button>
  );
}

/**
 * O som de um lance que acabou de ser aplicado.
 *
 * A captura sai do **histórico da partida**, e não de comparar duas FENs: a
 * `Move` que a `applyUci` guarda é o único lugar onde "este lance comeu alguma
 * coisa" existe escrito. Um en passant tira uma peça de uma casa em que
 * ninguém pousou.
 */
function somDoLance({ game }: Applied): void {
  const lance = game.history({ verbose: true }).at(-1);
  playForMove({ capture: Boolean(lance?.captured), check: game.inCheck() });
}
