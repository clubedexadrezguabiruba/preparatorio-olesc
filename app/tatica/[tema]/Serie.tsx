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
import {
  armAudioOnFirstGesture,
  isSoundOn,
  playComplete,
  playForMove,
  playMate,
  playRefusal,
  playSuccess,
  setSoundOn,
  subscribeSound,
} from "@/lib/sound";
import { temaPorTag } from "@/lib/tatica/blocos";
import { lanceCerto } from "@/lib/tatica/conferir";
import type { PuzzleServido } from "@/lib/tatica/puzzles";
import { NOME_DO_MODO, type Modo } from "@/lib/tatica/serie";
import {
  ABERTURA_MS,
  FIM_COM_MATE_MS,
  FIM_MS,
  RESPOSTA_MS,
  VOLTA_MS,
} from "@/lib/tatica/tempos";
import { registrarTentativa } from "../acoes";

/**
 * A série de puzzles: o tabuleiro, o juiz e a gravação.
 *
 * ## A regra que decide o desenho inteiro
 *
 * **Só a primeira tentativa de cada puzzle vira linha no banco.** Errou o
 * primeiro lance: grava errado, na hora, e a partir daí o puzzle continua na
 * tela só para ele aprender — pode tentar quantas vezes quiser, não conta mais
 * nada. Acertou de primeira: grava certo quando a linha termina.
 *
 * Sem essa regra, "acerto" seria "acabou tentando", que é verdade para todo
 * mundo e não mede nada. É este número que o professor vai usar no Sábado 4
 * para propor a escalação — ele precisa querer dizer alguma coisa.
 *
 * ## O que é mandado ao servidor
 *
 * Os **lances jogados**, nunca um "acertei". Quem decide se acertou é a server
 * action, reconferindo com a mesma função que este componente usa para dizer
 * "certo" na tela (`lib/tatica/conferir.ts`). Um juiz só, dois lugares: o
 * tabuleiro não tem como dizer verde e o relatório contar vermelho.
 *
 * ## O som
 *
 * Os seis efeitos vêm do laboratório de finais, sintetizados em WebAudio — não
 * há arquivo de áudio nenhum no projeto. Quem toca o quê está em uma frase por
 * efeito no `lib/sound-catalog.ts`; a regra que não é óbvia é **mate não toca
 * xeque**: o lance que dá mate toca o som de mate no lugar do som de lance,
 * senão o fim do puzzle soaria igual a um lance qualquer.
 *
 * O mate tem som próprio — duas batidas, a segunda mais grave. Antes ele tocava
 * o acorde da `conclusao`, que agora fica reservado para o fim da **rodada**: o
 * aluno ouve o acorde uma vez, na tela do placar, e não a cada puzzle.
 *
 * **O primeiro lance da abertura pode sair mudo, e isso é do navegador.** Nenhum
 * áudio toca antes de um gesto na página, e o erro do adversário acontece 600 ms
 * depois da montagem, sem que o aluno tenha tocado em nada *aqui* — o clique que
 * abriu a série ficou na página anterior. Do segundo puzzle em diante já houve
 * gesto, e todos soam.
 *
 * ## Por que são dois componentes
 *
 * `Serie` conta a rodada; `NoTabuleiro` resolve **um** puzzle. A separação não
 * é arrumação: todo o estado de um puzzle — posição, fase, erros, promoção
 * pendente — tem de voltar ao zero quando o próximo entra, e a maneira do
 * React de zerar estado é **desmontar o componente**. Com `key={puzzle.id}`,
 * isso sai de graça. Um componente só precisaria de um efeito que chama sete
 * `setState` em cascata a cada troca de puzzle, que é justamente o que a regra
 * `set-state-in-effect` do projeto proíbe — e proíbe por um bom motivo: um
 * render a mais por lance, no celular do aluno.
 */

type Fase =
  /** O adversário ainda vai errar: o tabuleiro está parado, mostrando a posição. */
  | "abrindo"
  /** A vez do aluno. */
  | "jogando"
  /** O aluno acertou e o adversário está respondendo. */
  | "respondendo"
  /** Lance errado: a peça volta e o recado aparece. */
  | "errado"
  /** A linha acabou. */
  | "resolvido";

export type SerieProps = {
  /**
   * O tema em que o aluno está, ou `null` na **revisao do dia**, que mistura
   * temas: ali cada tentativa e gravada no tema de origem do proprio puzzle.
   */
  tema: string | null;
  nomeDoTema: string;
  etapa: Modo;
  puzzles: PuzzleServido[];
  jaFeitosNaEtapa: number;
  metaDaEtapa: number;
  /** `null` fora de um tema (revisao): nao ha "tema 12/39" a mostrar. */
  feitosNoTema: number | null;
  totalNoTema: number | null;
  explicacao: string[];
  procure: string[];
  cuidado: string | null;
};

export function Serie({
  tema,
  nomeDoTema,
  etapa,
  puzzles,
  jaFeitosNaEtapa,
  metaDaEtapa,
  feitosNoTema,
  totalNoTema,
  explicacao,
  procure,
  cuidado,
}: SerieProps) {
  const router = useRouter();

  // Destrava o `AudioContext` no primeiro toque ou tecla desta página — sem
  // isso o navegador emudece tudo. Devolve o removedor dos ouvintes.
  useEffect(() => armAudioOnFirstGesture(), []);

  const [indice, setIndice] = useState(0);
  const [placar, setPlacar] = useState({ certos: 0, total: 0 });
  const [falhaAoGravar, setFalhaAoGravar] = useState<string | null>(null);
  const [fim, setFim] = useState(false);

  const puzzle = puzzles[indice];

  /**
   * A decisão daquele puzzle chegou: manda ao servidor e soma no placar.
   *
   * O `acertou` que volta é o do **servidor**, não o da tela. Nas duas ele
   * será igual — é a mesma função —, e é justamente por isso que o placar usa
   * o do servidor: o número que o aluno lê no fim da rodada passa a ser,
   * literalmente, o que ficou gravado.
   */
  const decidir = useCallback(
    async (p: PuzzleServido, lances: string[], tempoMs: number) => {
      const resposta = await registrarTentativa({
        puzzleId: p.id,
        // Na revisao nao ha tema: a linha e gravada no tema de origem do
        // puzzle, que e onde ele conta desde a primeira vez.
        tema: tema ?? p.origem,
        origem: p.origem,
        modo: etapa,
        lances,
        tempoMs,
      });

      if ("erro" in resposta) {
        // Falar em vez de fingir: o aluno tem de saber que aquele puzzle não
        // entrou na conta, senão fecha a tarefa achando que fez 20 e o
        // relatório mostra 14.
        setFalhaAoGravar(resposta.erro);
        return;
      }
      setPlacar((a) => ({ certos: a.certos + (resposta.acertou ? 1 : 0), total: a.total + 1 }));
    },
    [etapa, tema],
  );

  // O prêmio da rodada inteira, na tela do placar. Não é `setState` num efeito:
  // é um efeito colateral disparado por uma transição de estado que já
  // aconteceu, que é para isso que o `useEffect` serve.
  useEffect(() => {
    if (fim) playComplete();
  }, [fim]);

  const avancar = useCallback(() => {
    setIndice((i) => {
      if (i + 1 >= puzzles.length) {
        setFim(true);
        return i;
      }
      return i + 1;
    });
  }, [puzzles.length]);

  if (fim || !puzzle) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-borda-fraca bg-carta px-5 py-6">
        <p className="rotulo text-metodo-tinta">{NOME_DO_MODO[etapa]} — fim</p>
        <p className="titulo text-tinta tabular-nums">
          {placar.certos} de {placar.total} de primeira
        </p>
        <p className="text-sm text-tinta-media">
          {placar.total === 0
            ? "Nenhum puzzle entrou na conta."
            : placar.certos === placar.total
              ? etapa === "revisao"
                ? "Nenhum erro. Os certos voltam daqui a uma semana, para provar que ficaram."
                : "Nenhum erro. Pode seguir."
              : /*
                 * Cada modo diz para onde o erro vai — e diz a verdade. Ate a
                 * F2 a frase da serie prometia "voltam na prova" enquanto o
                 * sorteio excluia todo puzzle ja visto. Agora a prova puxa os
                 * errados (`lib/tatica/escolher.ts`) e os da prova entram na
                 * fila espacada (`lib/tatica/revisao.ts`).
                 */
                etapa === "revisao"
                ? "Os que você errou voltam em 2 dias; os certos, em uma semana."
                : etapa === "prova"
                  ? "Os que você errou voltam na revisão do dia, daqui a 2 dias."
                  : "Os que você errou voltam misturados na prova deste tema."}
        </p>
        {falhaAoGravar ? <Falha erro={falhaAoGravar} /> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
          >
            Continuar
          </button>
          <Link
            href={etapa === "revisao" ? "/painel" : "/tatica"}
            className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
          >
            {etapa === "revisao" ? "Voltar ao painel" : "Escolher outro tema"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="rotulo text-metodo-tinta">{NOME_DO_MODO[etapa]}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-tinta-fraca tabular-nums">
            {Math.min(jaFeitosNaEtapa + indice + 1, metaDaEtapa)} de {metaDaEtapa}
            {feitosNoTema !== null && totalNoTema !== null
              ? ` · tema ${feitosNoTema + indice + 1}/${totalNoTema}`
              : ""}
          </p>
          <BotaoDeSom />
        </div>
      </div>

      <NoTabuleiro
        key={puzzle.id}
        puzzle={puzzle}
        aoDecidir={decidir}
        aoTerminar={avancar}
        falhaAoGravar={falhaAoGravar}
        /*
         * Na prova e na revisao o tema e revelado **depois** de resolver: o
         * aluno reconhece o padrao sem o nome (que e o que acontece na
         * partida), e o nome chega para fixar o que ele acabou de ver. Na
         * serie ele ja esta dentro do tema, e dize-lo de novo e ruido.
         */
        nomeDoPadrao={etapa === "prova" || etapa === "revisao" ? nomeDoPadrao(puzzle) : null}
      />

      {explicacao.length > 0 ? (
        /*
         * Aberto no primeiro aquecimento: quem chega ao tema pela primeira vez
         * le o que procurar **antes** do primeiro puzzle, e nao escondido num
         * bloco fechado embaixo do tabuleiro. Depois disso, dobrado — ele ja
         * leu, e o tabuleiro e o que importa.
         */
        <details
          open={etapa === "aquecimento" && jaFeitosNaEtapa === 0}
          className="rounded-xl border border-borda-fraca bg-carta px-4 py-3"
        >
          <summary className="foco cursor-pointer text-sm font-medium text-tinta">
            {nomeDoTema}: o que procurar
          </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm text-tinta-media">
          {explicacao.map((paragrafo) => (
            <p key={paragrafo.slice(0, 24)}>{paragrafo}</p>
          ))}
          <ul className="flex flex-col gap-1.5 pl-4">
            {procure.map((linha) => (
              <li key={linha.slice(0, 24)} className="list-disc text-tinta">
                {linha}
              </li>
            ))}
          </ul>
          {cuidado ? (
            <p className="rounded-lg bg-aviso-superficie/15 px-3 py-2 text-aviso-tinta">
              <span className="font-semibold">Cuidado: </span>
              {cuidado}
            </p>
          ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** O nome em portugues do tema de que o puzzle veio — o que a prova revela. */
function nomeDoPadrao(p: PuzzleServido): string {
  return temaPorTag(p.origem)?.nome ?? p.origem;
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

/* ------------------------------------------------------------------ *
 * Um puzzle
 * ------------------------------------------------------------------ */

/**
 * O som de um lance que acabou de ser aplicado.
 *
 * A captura sai do **histórico da partida**, e não de comparar duas FENs: a
 * `applyUci` devolve a `Chess` com o lance já dentro, e a `Move` que ela guarda
 * é o único lugar onde "este lance comeu alguma coisa" existe escrito. Um en
 * passant, por exemplo, tira uma peça de uma casa em que ninguém pousou —
 * comparar posições acertaria isso por acidente, e erraria a promoção.
 */
function somDoLance({ game }: Applied): void {
  const lance = game.history({ verbose: true }).at(-1);
  playForMove({ capture: Boolean(lance?.captured), check: game.inCheck() });
}

function NoTabuleiro({
  puzzle,
  aoDecidir,
  aoTerminar,
  falhaAoGravar,
  nomeDoPadrao,
}: {
  puzzle: PuzzleServido;
  aoDecidir: (p: PuzzleServido, lances: string[], tempoMs: number) => void;
  aoTerminar: () => void;
  falhaAoGravar: string | null;
  /** O tema a revelar depois de resolver, ou `null` para nao revelar. */
  nomeDoPadrao: string | null;
}) {
  const [fen, setFen] = useState(puzzle.fen);
  const [passo, setPasso] = useState(1);
  const [fase, setFase] = useState<Fase>("abrindo");
  const [erros, setErros] = useState(0);
  const [ultimoLance, setUltimoLance] = useState<[Key, Key] | null>(null);
  const [reiMatado, setReiMatado] = useState<Color | null>(null);
  const [revisao, setRevisao] = useState(0);
  const [promocao, setPromocao] = useState<{ orig: Key; dest: Key } | null>(null);

  /** Os lances do aluno nesta primeira tentativa. É o que vai ao servidor. */
  const jogadosRef = useRef<string[]>([]);
  const inicioRef = useRef(0);
  /** Uma linha por puzzle: o segundo pedido de gravação é ignorado. */
  const decididoRef = useRef(false);
  const relogiosRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const agendar = useCallback((quefazer: () => void, ms: number) => {
    relogiosRef.current.push(setTimeout(quefazer, ms));
  }, []);

  /**
   * A abertura: a posição parada, e o erro do adversário meio segundo depois.
   *
   * A pausa não é enfeite. O aluno precisa ver a posição **antes** do erro
   * para entender que o lance do adversário foi um erro; sem ela, o puzzle já
   * começa com a peça no lugar novo e ninguém sabe o que mudou.
   *
   * A limpeza mata todo relógio pendente — o do adversário e o do avanço. Sem
   * ela, o lance de um puzzle desmontado chega no meio do próximo.
   */
  useEffect(() => {
    const relogios = relogiosRef;
    relogios.current.push(
      setTimeout(() => {
        const depois = applyUci(puzzle.fen, puzzle.lances[0]);
        if (!depois) return;
        somDoLance(depois);
        setFen(depois.fen);
        setUltimoLance([
          puzzle.lances[0].slice(0, 2) as Key,
          puzzle.lances[0].slice(2, 4) as Key,
        ]);
        setFase("jogando");
        inicioRef.current = Date.now();
      }, ABERTURA_MS),
    );

    return () => {
      for (const id of relogios.current) clearTimeout(id);
      relogios.current = [];
    };
  }, [puzzle]);

  const jogar = useCallback(
    (uci: string) => {
      const esperado = puzzle.lances[passo];

      if (!lanceCerto(fen, uci, esperado)) {
        // A peça volta: `revisao` força a ressincronização mesmo com a FEN
        // igual — o chessground já a moveu na tela por conta própria.
        setRevisao((r) => r + 1);
        playRefusal();
        setFase("errado");
        setErros((n) => n + 1);
        if (!decididoRef.current) {
          decididoRef.current = true;
          aoDecidir(puzzle, [...jogadosRef.current, uci], Date.now() - inicioRef.current);
        }
        agendar(() => setFase("jogando"), VOLTA_MS);
        return;
      }

      const depois = applyUci(fen, uci);
      if (!depois) return;
      jogadosRef.current.push(uci);
      setFen(depois.fen);
      setUltimoLance([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);

      const matou = depois.game.isCheckmate();
      if (matou || passo + 1 >= puzzle.lances.length) {
        // Prêmio **no lugar** do som do lance, não junto: o fim do puzzle não
        // pode soar igual a um lance qualquer. É a mesma regra do laboratório.
        if (matou) {
          setReiMatado(toBoardColor(depois.game.turn()));
          playMate();
        } else {
          playSuccess();
        }
        setFase("resolvido");
        if (!decididoRef.current) {
          decididoRef.current = true;
          aoDecidir(puzzle, [...jogadosRef.current], Date.now() - inicioRef.current);
        }
        agendar(aoTerminar, matou ? FIM_COM_MATE_MS : FIM_MS);
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
    [agendar, aoDecidir, aoTerminar, fen, passo, puzzle],
  );

  const jogo = useMemo(() => new Chess(fen), [fen]);
  const podeMover = fase === "jogando";

  // De que lado o aluno joga: o oposto de quem está na vez na FEN do arquivo,
  // porque `lances[0]` é o erro do adversário.
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

  /**
   * As dicas. Dois erros acendem a casa da peça que resolve; três desenham a
   * seta inteira.
   *
   * O aluno tem 8 a 15 anos e faz isto sozinho em casa, no celular, sem
   * ninguém para perguntar. Puzzle travado sem saída vira aba fechada, e a
   * tarefa da semana não acontece. Como a tentativa já foi gravada no primeiro
   * erro, a dica não compra acerto nenhum.
   */
  const dicas: DrawShape[] = useMemo(() => {
    if (fase === "resolvido" || fase === "abrindo" || erros < 2) return [];
    const esperado = puzzle.lances[passo];
    const orig = esperado.slice(0, 2) as Key;
    return erros >= 3
      ? [{ orig, dest: esperado.slice(2, 4) as Key, brush: "blue" }]
      : [{ orig, brush: "blue" }];
  }, [erros, fase, passo, puzzle.lances]);

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

      {falhaAoGravar ? (
        <Falha erro={falhaAoGravar} />
      ) : (
        <Recado
          fase={fase}
          erros={erros}
          meuLado={meuLado}
          rating={puzzle.rating}
          nomeDoPadrao={nomeDoPadrao}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * O recado sob o tabuleiro
 *
 * Altura mínima fixa: sem ela a página pula meia linha a cada lance, e no
 * celular o tabuleiro sai do lugar debaixo do dedo.
 * ------------------------------------------------------------------ */

function Recado({
  fase,
  erros,
  meuLado,
  rating,
  nomeDoPadrao,
}: {
  fase: Fase;
  erros: number;
  meuLado: Color;
  rating: number;
  nomeDoPadrao: string | null;
}) {
  if (fase === "abrindo") {
    return <Linha tom="calma">Olhe a posição. O adversário vai jogar.</Linha>;
  }
  if (fase === "errado") {
    return (
      <Linha tom="ruim">
        {erros >= 3
          ? "A seta mostra o lance. Jogue-o para ver por quê."
          : erros >= 2
            ? "A casa acesa é a peça que resolve."
            : "Não é esse. Olhe de novo — este puzzle já contou como erro."}
      </Linha>
    );
  }
  if (fase === "resolvido") {
    return <Linha tom="bom">Certo.{nomeDoPadrao ? ` Era: ${nomeDoPadrao}.` : ""}</Linha>;
  }
  if (fase === "respondendo") return <Linha tom="calma">Certo. Veja a resposta dele.</Linha>;

  return (
    <Linha tom="calma">
      Você joga de {meuLado === "white" ? "brancas" : "pretas"}.{" "}
      <span className="text-tinta-fraca tabular-nums">({rating})</span>
    </Linha>
  );
}

function Linha({ tom, children }: { tom: "calma" | "bom" | "ruim"; children: React.ReactNode }) {
  const cor =
    tom === "bom"
      ? "bg-metodo-superficie/15 text-metodo-tinta-alta"
      : tom === "ruim"
        ? "bg-erro-superficie/12 text-erro-texto"
        : "bg-carta text-tinta-media";
  return (
    <p aria-live="polite" className={`min-h-11 rounded-lg px-3 py-2.5 text-sm ${cor}`}>
      {children}
    </p>
  );
}

function Falha({ erro }: { erro: string }) {
  return (
    <p
      role="alert"
      className="min-h-11 rounded-lg bg-erro-superficie/15 px-3 py-2.5 text-sm text-erro-texto"
    >
      Não deu para gravar esta tentativa ({erro}). Avise o professor — o que você resolveu
      depois disso pode não estar contando.
    </p>
  );
}
