"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chess, type Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { BotaoPrincipal, BotaoSecundario } from "@/components/lesson/BotoesDaAula";
import { CartaoDeComando } from "@/components/lesson/CartaoDeComando";
import { Comentario, useComentarioPaginado } from "@/components/lesson/Comentario";
import { ProfessorSeApresenta } from "@/components/lesson/ProfessorSeApresenta";
import { TrilhaDeEtapas, type EtapaDaTrilha } from "@/components/lesson/TrilhaDeEtapas";
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
import {
  aulaDoTema,
  cartaoDaFase,
  dicaDoTema,
  falaDaFase,
  REPOUSO_DA_TATICA,
  type Fase,
} from "@/lib/tatica/fala";
import type { PuzzleServido } from "@/lib/tatica/puzzles";
import { NOME_DO_MODO, type Etapa, type Modo } from "@/lib/tatica/serie";
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
 * ## O palco, e o que ele trocou
 *
 * Até 8/9/2026 esta tela era uma coluna de 576 px que rolava: tabuleiro
 * dimensionado pela **largura** (travado em ~536 px por mais larga que fosse a
 * janela), e todo o feedback do professor espremido numa tira de 44 px sob ele.
 * Agora ela usa o mesmo `AulaShell` da aula de abertura — tabuleiro dimensionado
 * pela **altura** que sobra, e o painel ao lado com o cartão de comando, a
 * trilha das etapas e a voz do professor. A geometria inteira mora no bloco "O
 * palco da aula" de `app/globals.css`, e não aqui.
 *
 * **O avanço continua automático.** O palco veio de uma tela em que o aluno
 * clica "Continuar" a cada lance; aqui não há botão de próximo puzzle, e o
 * ritmo da série é o mesmo de antes. Os botões do rodapé só mexem no **texto**:
 * viram a página do professor e abrem os dois degraus da dica.
 *
 * ## O painel é MAGRO, e a tática é a razão de ele existir
 *
 * 416 px contra os 522 da aula de abertura, retrato de 80 contra 112. Lá o
 * professor comenta um lance a cada lance e o painel existe para caber a prosa;
 * aqui o aluno não vem ler, vem procurar. O que ele ouve de graça é **uma
 * linha** — a ordem de busca: xeques, capturas, ameaças —, e a aula do tema
 * fica atrás do botão de dica, em dois degraus. Ver `.aula-palco-magro` em
 * `app/globals.css` para os três números e a conta de cada um.
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
 *
 * É também por isso que o `AulaShell` é montado **dentro** do `NoTabuleiro`, e
 * não aqui: metade do painel (o cartão, a fala do professor) é estado de um
 * puzzle só. O que é da rodada — o cabeçalho, a trilha, os botões — desce
 * pronto, por prop.
 */

/**
 * As três etapas de um tema: `aquecimento · série · prova`.
 *
 * São as mesmas de `lib/tatica/serie.ts`, e o `diz` de cada uma é o que o
 * leitor de tela ouve — por isso ele explica a etapa em vez de repetir o nome
 * dela. Os dois modos largos não entram — a revisão do dia e a prova de nível
 * não são etapa de tema nenhum, e uma trilha de três com as três apagadas
 * prometeria um caminho que ali não existe.
 */
const ETAPAS_DA_SERIE = [
  { nome: "aquecimento", diz: "os mais fáceis, para o olho pegar o padrão" },
  { nome: "série", diz: "o tema em dificuldade crescente" },
  { nome: "prova", diz: "o tema misturado com os que você já viu" },
] as const satisfies readonly EtapaDaTrilha[];

/** Em que barra da trilha cada etapa acende. */
const BARRA_DA_ETAPA: Record<Etapa, number> = { aquecimento: 0, serie: 1, prova: 2 };

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
  /**
   * O que fica no lugar dos botões, na tela do placar.
   *
   * Existe para a **prova de nível**: lá o fim da rodada não é "continuar" —
   * é o servidor corrigir as 12 linhas e conceder (ou não) o degrau. Um
   * `ReactNode` em vez de um `boolean` porque quem sabe o que fazer no fim é
   * quem montou a rodada, e não esta série, que serve três telas diferentes.
   */
  noFim?: ReactNode;
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
  noFim,
}: SerieProps) {
  const router = useRouter();

  // Destrava o `AudioContext` no primeiro toque ou tecla desta página — sem
  // isso o navegador emudece tudo. Devolve o removedor dos ouvintes.
  useEffect(() => armAudioOnFirstGesture(), []);

  const [indice, setIndice] = useState(0);
  const [placar, setPlacar] = useState({ certos: 0, total: 0 });
  const [falhaAoGravar, setFalhaAoGravar] = useState<string | null>(null);
  const [fim, setFim] = useState(false);

  /**
   * Os dois degraus da ajuda pedida, e o `cuidado` no fim do segundo.
   *
   * `null` na revisão do dia, que mistura temas: lá não há um "o que procurar"
   * possível, e o botão de dica não aparece.
   */
  const degraus = useMemo(
    () => [dicaDoTema(procure), aulaDoTema(cuidado ? [...explicacao, `Cuidado: ${cuidado}`] : explicacao)],
    [cuidado, explicacao, procure],
  );

  /**
   * Em que degrau da dica o aluno está: 0 nenhum, 1 o "procure", 2 a aula.
   *
   * **Começa sempre em zero, inclusive na primeira vez no tema.** Antes a aula
   * abria sozinha na primeira entrada, herdando a gavetinha `<details>` que
   * existia antes do palco. Ela deixou de abrir porque esta tela não é de
   * leitura: o aluno vem procurar táticas, e o que ele precisa ver de graça é a
   * ordem de busca — que é o texto de repouso, e cabe numa linha.
   *
   * A escada é a mesma que o tabuleiro já faz com as setas: dois erros acendem
   * a casa, três desenham o lance. Ajuda existe, custa um pedido, e vem em
   * pedaços.
   *
   * Mora aqui, e não no `NoTabuleiro`, porque `key={puzzle.id}` zeraria o
   * estado a cada puzzle — e aí não haveria como decidir se a dica sobrevive à
   * troca. Quem decide é o `avancar`, logo abaixo: ela **não** sobrevive.
   */
  const [degrau, setDegrau] = useState(0);

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
    /*
     * A dica não atravessa o puzzle. Ela foi pedida para **aquela** posição, e
     * mantê-la aberta na seguinte tiraria da tela a ordem de busca — que é o
     * que o aluno tem de estar olhando quando uma posição nova aparece.
     * Pedir de novo é um clique; ler o tema quando não se quer ler é a rodada
     * inteira.
     */
    setDegrau(0);
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
                : etapa === "prova-de-nivel"
                  ? "Nenhum erro. Conferindo o resultado…"
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
                  : etapa === "prova-de-nivel"
                    ? "Os que você errou entraram na fila de revisão. Conferindo o resultado…"
                    : "Os que você errou voltam misturados na prova deste tema."}
        </p>
        {falhaAoGravar ? <Falha erro={falhaAoGravar} /> : null}
        {noFim ?? (
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
        )}
      </div>
    );
  }

  return (
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
      nomeDoPadrao={etapa === "serie" || etapa === "aquecimento" ? null : nomeDoPadrao(puzzle)}
      degraus={degraus}
      degrau={degrau}
      aoPedirDica={() => setDegrau((d) => d + 1)}
      rotuloDaDica={`Dica: o que procurar em ${nomeDoTema}`}
      cabecalho={
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
      }
      trilha={
        etapa === "revisao" || etapa === "prova-de-nivel" ? null : (

          /*
           * A trilha só a partir de `lg`, e a conta é de altura.
           *
           * Medido num 360×740 com o palco magro: o painel tem 304 px, e a
           * trilha come 38 deles (26 dela mais o vão de 12). Com ela, o balão
           * do professor ficava com **74 px** — e a frase de repouso, que tem
           * de estar sempre à vista, **paginava**: o aluno teria de clicar
           * "Ler mais" para ler a ordem de busca. Sem ela, o balão fica com
           * 116, e a frase cabe inteira.
           *
           * É o corte certo porque a trilha é a única coisa ali que a tela já
           * diz de outro jeito: o cabeçalho do painel traz "SÉRIE" e
           * "10 de 24 · tema 15/39" — o nome da etapa e a posição nela, que é
           * exatamente o que as três barras desenham. É a mesma regra que tira
           * a `FaixaDeSans` do celular na aula de abertura.
           */
          <div className="hidden lg:block">
            <TrilhaDeEtapas etapas={ETAPAS_DA_SERIE} atual={BARRA_DA_ETAPA[etapa as Etapa]} />
          </div>
        )
      }
    />
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
  degraus,
  degrau,
  aoPedirDica,
  rotuloDaDica,
  cabecalho,
  trilha,
}: {
  puzzle: PuzzleServido;
  aoDecidir: (p: PuzzleServido, lances: string[], tempoMs: number) => void;
  aoTerminar: () => void;
  falhaAoGravar: string | null;
  /** O tema a revelar depois de resolver, ou `null` para nao revelar. */
  nomeDoPadrao: string | null;
  /**
   * Os dois degraus da ajuda pedida, em ordem: o "procure" do tema e a aula.
   * Cada um pode ser `null` — na revisão do dia os dois são.
   */
  degraus: readonly (string | null)[];
  /** Quantos degraus o aluno já pediu: 0, 1 ou 2. */
  degrau: number;
  aoPedirDica: () => void;
  /** O rótulo do botão de dica para o leitor de tela. */
  rotuloDaDica: string;
  cabecalho: ReactNode;
  trilha: ReactNode;
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

  const situacao = { fase, erros, meuLado, rating: puzzle.rating, nomeDoPadrao } as const;

  /**
   * O que o professor diz agora, e a ordem tem um porquê em cada degrau.
   *
   * **A dica pedida ganha da reação.** É o contrário do que parece natural, e é
   * de propósito: se o aluno pediu a dica e depois errou, trocar a dica pelo
   * recado de erro tiraria da tela justamente o texto que ele acabou de pedir —
   * e ele teria de pedir de novo para reler. Quem dá o recado do erro é o
   * **cartão**, que está logo acima e é o canal do veredito. Balão e cartão são
   * duas vozes; é isto que a divisão serve para permitir.
   *
   * Sem dica pedida, a reação ganha do repouso: nos 850 ms depois de um erro,
   * "por que este não serve" vale mais que a ordem de busca.
   *
   * E no fim o repouso, que **nunca é nulo** — o balão ao lado do retrato não
   * fica vazio em nenhum estado da tela, nem na revisão do dia.
   */
  const dicaAberta = degrau > 0 ? (degraus[degrau - 1] ?? null) : null;
  const reacao = falaDaFase(situacao);
  const comentario = useComentarioPaginado(dicaAberta ?? reacao ?? REPOUSO_DA_TATICA);

  /**
   * Vira a página do professor, ou completa a digitação.
   *
   * A ordem importa e é a mesma da aula de abertura: um toque no meio da
   * digitação **completa** em vez de avançar, senão o aluno perde metade do
   * texto num clique que ele deu para ler mais depressa.
   */
  const lerMais = useCallback(() => {
    if (comentario.digitando) {
      comentario.completar();
      return;
    }
    if (!comentario.naUltima) comentario.virar();
  }, [comentario]);

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
      }
      painel={
        <>
          {cabecalho}

          {/*
           * A falha de gravação toma o lugar do cartão, e não um lugar a mais:
           * ela é `role="alert"`, é a coisa mais importante da tela naquele
           * momento, e o painel tem altura fechada — empilhá-la sobre o cartão
           * roubaria 64 px do professor para dizer duas coisas ao mesmo tempo.
           */}
          {falhaAoGravar ? <Falha erro={falhaAoGravar} /> : <CartaoDeComando {...cartaoDaFase(situacao)} />}

          {trilha}

          {/*
           * O retrato de 80 px, e não os 112 da aula de abertura. Lá ele é a
           * emissora de um bloco grande de prosa e é proporcional a ele; aqui,
           * ao lado de uma linha, 112 px de figura falariam mais alto que a
           * fala. Ver `.aula-palco-magro` em `app/globals.css`.
           */}
          <Comentario
            paginacao={comentario}
            retrato={<ProfessorSeApresenta largura={80} />}
            compacto
          />

          <AulaRodape>
            {/*
             * "Ler mais", e não "Continuar": aqui o botão vira a página do
             * texto, e nunca o puzzle. O avanço da série é automático, e um
             * botão que parecesse avançá-la faria o aluno clicar esperando o
             * próximo exercício.
             */}
            {!comentario.naUltima ? (
              <BotaoPrincipal onClick={lerMais}>Ler mais →</BotaoPrincipal>
            ) : null}

            {/*
             * A dica em dois degraus, e o rótulo diz qual vem.
             *
             * "Dica" abre o que procurar **neste tema**; "Por que funciona"
             * abre a aula. Nomear o segundo em vez de repetir "mais uma dica" é
             * o que deixa o aluno decidir se quer aquilo — ele já teve a ajuda
             * prática, e o segundo degrau é estudo, não socorro.
             *
             * O botão some no último degrau em vez de ficar desabilitado: um
             * alvo apagado no rodapé de um painel de altura fechada é ruído que
             * ocupa a linha mais disputada da coluna.
             */}
            {degrau < degraus.length && degraus[degrau] ? (
              <BotaoSecundario
                onClick={aoPedirDica}
                rotulo={degrau === 0 ? rotuloDaDica : undefined}
              >
                {degrau === 0 ? "Dica" : "Por que funciona"}
              </BotaoSecundario>
            ) : null}
          </AulaRodape>
        </>
      }
    />
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
