"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { DrawBrush, DrawBrushes, DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Dests, Key } from "@lichess-org/chessground/types";

/**
 * Os quatro pincéis pedagógicos, lidos dos tokens de `app/globals.css`.
 *
 * **Por que uma ponte em JavaScript e não em CSS.** A tabela de pincéis do
 * chessground é um objeto literal (`state.js`), e o `svg.js` grava a cor como
 * **atributo de apresentação** — `stroke="#882020"` —, onde `var()` não é
 * sintaxe válida. Não existe seletor que alcance aquilo. A única porta é
 * `drawable.brushes`, e é por ela que a identidade visual chega ao desenho.
 *
 * A leitura é uma só, na montagem: `getComputedStyle` força o cálculo de
 * estilo, e chamá-lo a cada desenho custaria caro à toa — os tokens não mudam
 * durante a vida de um tabuleiro. Quem trocar de direção no B6.3 remonta o
 * componente por `key`, e a leitura acontece de novo.
 *
 * **O alfa mora aqui, e não mais num multiplicador escondido.** O
 * `.cg-shapes { opacity: .6 }` do pacote multiplicava todos os pincéis de uma
 * vez: dois com o mesmo número nesta tabela saíam com transparências
 * diferentes do que ela dizia, e não havia como ajustar um sem mexer no outro.
 * Ele foi a 1 em `globals.css`, e os números abaixo passaram a ser os de
 * verdade.
 *
 * Três são opacos porque são traço fino — um aro em volta de uma casa. O corte
 * é o único translúcido: ele pinta a parede inteira, seis a oito casas de uma
 * vez, e opaco viraria um bloco. A 0,55 ele mede 3,67:1 contra a casa clara e
 * 3,11:1 contra a escura, acima do piso de 3:1 de componente de interface.
 */
const PINCEIS = [
  // A espessura é o segundo canal do par que se confunde: `pendurada` e
  // `defendida` são o mesmo aro com sentidos opostos, e 14 contra 9 os separa
  // mesmo em escala de cinza, onde a cor não separa.
  { nome: "green", token: "--color-pincel-defendida", opacity: 1, lineWidth: 9 },
  { nome: "red", token: "--color-pincel-pendurada", opacity: 1, lineWidth: 14 },
  { nome: "blue", token: "--color-pincel-seta", opacity: 1, lineWidth: 10 },
  { nome: "paleRed", token: "--color-pincel-corte", opacity: 0.55, lineWidth: 15 },
] as const;

function pinceis(host: HTMLElement): Partial<DrawBrushes> {
  const estilo = getComputedStyle(host);
  const tabela: Record<string, DrawBrush> = {};
  for (const { nome, token, opacity, lineWidth } of PINCEIS) {
    const cor = estilo.getPropertyValue(token).trim();
    // Token ausente daria um pincel invisível e um bug mudo. Melhor gritar no
    // console e deixar o padrão do pacote de pé.
    if (!cor) {
      console.error(`ChessBoard: o token ${token} não existe na folha de estilo`);
      continue;
    }
    tabela[nome] = { key: nome, color: cor, opacity, lineWidth };
  }
  return tabela;
}


export type ChessBoardProps = {
  /** A posição, em FEN. */
  fen: string;
  /** De que lado o tabuleiro é visto. */
  orientation?: Color;
  /** De quem é a vez. */
  turnColor?: Color;
  /** Destinos legais por casa de origem; ausente = ninguém move. */
  dests?: Dests;
  /** Último lance, para destacar as duas casas. */
  lastMove?: [Key, Key] | null;
  /** Rei em xeque? */
  check?: boolean;
  /** Só olhar, sem mover. */
  viewOnly?: boolean;
  /**
   * Contador que sobe a cada atualização de estado. Existe para forçar a
   * ressincronização mesmo quando a FEN não mudou — por exemplo quando o aluno
   * arrasta uma peça, o chessground já a moveu na tela, e o lance é desfeito.
   */
  revision?: number;
  /**
   * Setas e casas destacadas desenhadas *pelo motor* (etapas 2 a 4): seta é
   * `{ orig, dest }`, destaque de casa é `{ orig }` sozinho. Vão pelo canal
   * `setAutoShapes` do chessground — a camada dos desenhos automáticos, que o
   * motor troca inteira a cada estado. O canal de desenho do usuário (`enabled`)
   * continua desligado; o que liga aqui é só a *exibição* (`visible`).
   */
  shapes?: DrawShape[];
  /**
   * Lado que acabou de ser matado — o rei dele pulsa três vezes. Sai como
   * `data-mate` no host, e **não** como classe: o chessground escreve `cg-wrap`,
   * `orientation-*` e `manipulable` no mesmo elemento cujo `className` o React
   * controla, e só as reescreve na criação e no giro do tabuleiro. Se o React
   * reatribuísse `class`, elas sumiriam. Atributo `data-*` é escrito isolado.
   *
   * Qual rei vem explícito, e não derivado da orientação: assim continua certo
   * se uma aula futura ensinar o lado da defesa.
   */
  matedKing?: Color | null;
  /**
   * Camada desenhada **por cima** do tabuleiro, alinhada com as casas de
   * verdade — hoje só a `BoxOverlay`, a caixa do rei das etapas 2 e 3.
   *
   * Entra como *irmão* do host, dentro de um invólucro `relative`, e nunca
   * como filho: o chessground toma conta dos filhos do host, e o que o React
   * pusesse ali dentro sumiria no primeiro redesenho dele.
   *
   * O alinhamento é o detalhe caro. O chessground arredonda o tabuleiro para
   * um múltiplo de 8px e o centraliza, deixando até 7px de sobra — desenhar
   * sobre o invólucro daria um retângulo até meia casa fora do lugar. A
   * `.tabuleiro-camada` repete a receita do `.cg-wrap cg-container`
   * (`---cg-width`/`---cg-height` e `round(50%,1px)`), e é por isso que o
   * `addDimensionsCssVarsTo` aponta para o invólucro: a propriedade
   * personalizada precisa ser herdada pelos dois lados.
   */
  overlay?: ReactNode;
  /**
   * Liga o canal de desenho **do usuário** (botão direito arrasta seta, clique
   * com o direito destaca a casa). Desligado por padrão: o aluno não desenha.
   *
   * É **controlado**, e isso não é estilo: o `configure` do chessground faz
   * `state.drawable.shapes = config.drawable?.shapes || []` sempre que o
   * `config` traz `fen` ([config.js:19-21]). Como o efeito de sincronização
   * manda a FEN a cada atualização, um desenho não re-passado ali é apagado no
   * lance seguinte. Por isso as formas vêm de fora, e cada traço volta por
   * `onChange` para quem as guarda.
   *
   * O canal do motor (`shapes`, via `setAutoShapes`) continua separado: um é o
   * que a aula desenha, o outro é o que a pessoa desenha.
   */
  desenhavel?: {
    shapes: DrawShape[];
    onChange: (shapes: DrawShape[]) => void;
  };
  /**
   * Modo montagem (B8.4): as peças andam livres, soltar fora do tabuleiro
   * apaga, e cada mudança devolve a FEN nova. Desligado por padrão — nada do
   * caminho do aluno passa por aqui.
   *
   * Tudo isto já existe no chessground e o projeto simplesmente não ligava:
   * `movable.free`, `draggable.deleteOnDropOff` e `events.change`. O que o
   * componente acrescenta é traduzir "mudou" em "esta é a FEN agora".
   *
   * A FEN que sai tem só o campo das peças (`api.getFen()` é assim); quem
   * completa os outros cinco é o montador, porque de quem é a vez é decisão
   * dele, não do tabuleiro.
   */
  montagem?: { onChange: (fenDePecas: string) => void };
  onMove?: (orig: Key, dest: Key) => void;
};

/**
 * Casca fina em volta do chessground. O chessground é código imperativo que
 * toma conta do próprio DOM: o React só cria a <div> vazia e nunca mexe no que
 * está dentro dela. As mudanças chegam por `api.set()`, não por re-render.
 */
export function ChessBoard({
  fen,
  orientation = "white",
  turnColor,
  dests,
  lastMove,
  check = false,
  viewOnly = false,
  revision = 0,
  shapes,
  matedKing = null,
  overlay,
  desenhavel,
  montagem,
  onMove,
}: ChessBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  // O callback vive numa ref para que o chessground não precise ser
  // reconfigurado só porque a função mudou de identidade entre renders.
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);
  const desenhoRef = useRef(desenhavel);
  useEffect(() => {
    desenhoRef.current = desenhavel;
  }, [desenhavel]);
  const montagemRef = useRef(montagem);
  useEffect(() => {
    montagemRef.current = montagem;
  }, [montagem]);
  // Ligar ou desligar o desenho é decisão de **montagem**: o chessground lê
  // `drawable.enabled` na criação (e é lá que decide se engole o menu de
  // contexto do navegador). Quem quiser trocar isso em vida remonta por `key`.
  // O primeiro valor é o que vale, e por isso o estado nunca é atualizado.
  const [desenhaAqui] = useState(() => Boolean(desenhavel));
  /** Montagem é decisão de montagem pelo mesmo motivo que o desenho. */
  const [monta] = useState(() => Boolean(montagem));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // **`viewOnly` não entra aqui, e isso é deliberado.** O `bindBoard` do
    // pacote lê `state.viewOnly` na criação e, se ele for verdadeiro, **sai
    // antes de escutar `mousedown`** (events.js:12). Um tabuleiro criado com
    // `viewOnly: true` fica surdo para sempre — nem lance depois de destravar,
    // nem desenho com o botão direito. Ele entra pelo efeito de sincronização
    // logo abaixo, que roda com o tabuleiro já escutando.
    const api = Chessground(host, {
      fen,
      orientation,
      coordinates: true,
      // No invólucro, e não no host: a camada de overlay é irmã do host, e só
      // enxerga `---cg-width`/`---cg-height` se elas forem escritas num
      // ancestral comum. As `coords`, que também as leem, são descendentes do
      // invólucro e continuam herdando.
      addDimensionsCssVarsTo: frameRef.current ?? host,
      // Rolagem da página fica bloqueada durante o arraste no celular.
      blockTouchScroll: true,
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 180 },
      movable: {
        // Em montagem a peça vai para qualquer casa: não há partida, há
        // posição sendo composta.
        free: monta,
        showDests: !monta,
        events: {
          after: (orig, dest) => onMoveRef.current?.(orig, dest),
        },
      },
      // `deleteOnDropOff`: arrastar a peça para fora do tabuleiro a apaga. É
      // como se tira uma peça da posição sem precisar de botão nenhum.
      draggable: { showGhost: true, deleteOnDropOff: monta },
      // Espalhado, e **nunca** `events: undefined`: o `configure` do pacote faz
      // `deepMerge(state, config)`, e a chave presente com valor `undefined`
      // apaga o `state.events` inteiro. O `redrawAll` termina em
      // `state.events.insert?.(elements)` (chessground.js:46) e estoura —
      // derrubando **todo** tabuleiro do site, inclusive o da aula, onde não há
      // barreira de erro para segurar. Custou uma medição inteira em
      // 2026-08-24.
      ...(monta
        ? {
            events: {
              change: () => montagemRef.current?.onChange(apiRef.current?.getFen() ?? ""),
            },
          }
        : {}),
      drawable: {
        enabled: desenhaAqui,
        visible: true,
        shapes: desenhavel?.shapes ?? [],
        // A ref e não a prop: reconfigurar o chessground só porque a função
        // mudou de identidade custaria um redesenho por render.
        onChange: (formas) => desenhoRef.current?.onChange(formas),
        // O tipo do pacote exige a tabela inteira — os doze pincéis —, mas o
        // `configure()` dele faz `deepMerge`: o que não vier aqui continua
        // valendo o padrão. Trocamos os quatro que a aula usa e mais nada.
        brushes: pinceis(host) as DrawBrushes,
      },
    });
    apiRef.current = api;

    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // Roda uma vez só: o resto entra pelo efeito de sincronização abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.set({
      fen,
      orientation,
      turnColor,
      check,
      viewOnly,
      lastMove: lastMove ?? undefined,
      movable: monta
        ? { free: true, color: "both" as const, dests: undefined }
        : {
            free: false,
            color: viewOnly ? undefined : turnColor,
            dests: viewOnly ? new Map() : dests,
          },
      // Re-passado junto da FEN de propósito — ver a prop `desenhavel`.
      ...(desenhaAqui ? { drawable: { shapes: desenhavel?.shapes ?? [] } } : {}),
    });
    // `desenhavel` fora da lista: a identidade do objeto muda a cada render do
    // pai, e o efeito abaixo já cuida de quando as **formas** mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, orientation, turnColor, dests, lastMove, check, viewOnly, revision]);

  // Formas trocadas sem a FEN mudar — o autor desenhando, ou o painel
  // devolvendo o que estava no arquivo.
  useEffect(() => {
    if (!desenhaAqui) return;
    apiRef.current?.setShapes(desenhavel?.shapes ?? []);
  }, [desenhaAqui, desenhavel?.shapes]);

  // Depois do `set` acima: `setAutoShapes` redesenha a camada inteira, então
  // uma lista vazia é o jeito de apagar o que havia.
  useEffect(() => {
    apiRef.current?.setAutoShapes(shapes ?? []);
  }, [shapes, fen, revision]);

  return (
    <div ref={frameRef} className="relative w-full">
      <div
        ref={hostRef}
        data-mate={matedKing ?? undefined}
        className="cg-wrap aspect-square w-full touch-none select-none"
      />
      {overlay ? <div className="tabuleiro-camada">{overlay}</div> : null}
    </div>
  );
}
