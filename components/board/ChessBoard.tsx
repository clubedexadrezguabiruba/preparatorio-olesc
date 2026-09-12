"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PINCEL_POR_COR } from "@/lib/chess/annotations";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { DrawBrush, DrawBrushes, DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Dests, Key, MouchEvent, Piece } from "@lichess-org/chessground/types";

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
  // O selo de "alternativa" do treinador de repertório. Mesma espessura de
  // `defendida`: os três selos do repertório são o mesmo aro, e o que os separa
  // é a cor — quem precisa da espessura é o par vermelho/verde da tática.
  { nome: "yellow", token: "--color-pincel-alternativa", opacity: 1, lineWidth: 9 },
  // O sexto entra por um nome que o chessground não conhece — a interface
  // `DrawBrushes` tem os quatro fixos e assinatura de índice para o resto, e é
  // por ela que um pincel próprio é legítimo em vez de sequestrar um dos
  // outros. Traço mais fino que os selos: a seta do plano fala do que vem
  // DEPOIS do fim da linha, e não pode competir com o veredito do lance.
  { nome: "plano", token: "--color-pincel-plano", opacity: 1, lineWidth: 8 },
] as const;

/**
 * Os pincéis lidos da folha, **uma vez, na montagem**.
 *
 * Isso seria dívida se o site tivesse botão de tema: trocar de tema com o
 * tabuleiro montado deixaria as setas com as cores do tema anterior até a
 * próxima navegação. Não tem — o site é só escuro, por decisão registrada em
 * 2026-09-09 —, então a leitura única deixa de ser dívida e passa a ser a
 * escolha barata: nenhum observador, nenhum `useEffect` de tema, nenhuma
 * releitura por render.
 *
 * Se um botão de tema voltar, o conserto é aqui e é conhecido: reexecutar isto
 * quando o atributo de tema do `<html>` mudar.
 */
function pinceis(host: HTMLElement, espessuraUniforme = false): Partial<DrawBrushes> {
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
    // O editor é uma superfície de autoria livre, equivalente ao desenho do
    // Lichess: ali a cor é a única diferença e todos os traços medem 10. A
    // espessura semântica acima continua valendo nas marcações pedagógicas da
    // aula, onde vermelho/verde também precisam se separar sem depender da cor.
    tabela[nome] = { key: nome, color: cor, opacity, lineWidth: espessuraUniforme ? 10 : lineWidth };
  }
  // A mesma regra do token ausente, um degrau acima: se a paleta de cores do autor
  // apontar para um pincel que esta tabela não tem, o chessground **não reclama** —
  // ele desenha com o padrão dele, ou nada. Uma seta que some sem erro é o pior tipo
  // de defeito, porque parece que o professor não desenhou.
  for (const pincel of Object.values(PINCEL_POR_COR)) {
    if (!tabela[pincel]) console.error(`ChessBoard: a paleta do autor pede o pincel "${pincel}", que não existe nesta tabela`);
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
  /** No desenho livre de autoria, todas as cores usam a largura padrão 10. */
  espessuraDeDesenhoUniforme?: boolean;
  /**
   * A paleta de desenho está com uma ferramenta ligada: **ninguém move peça**, mas o
   * toque na casa continua chegando ao `onSelect`.
   *
   * Sem isto, o mesmo clique faria as duas coisas — o chessground selecionaria a peça
   * para arrastar *e* a paleta marcaria a origem da seta. É trocado pelo efeito de
   * sincronização, e não na criação, porque é um modo que liga e desliga o tempo todo;
   * o que se lê uma vez na criação (`desenhavel`, `montagem`) exigiria `key`.
   *
   * `movable.color = undefined` é o desligamento certo: `isMovable` passa a ser falso
   * para toda casa (`board.js`), nenhuma peça arrasta e nenhuma fica selecionada — e
   * o `events.select`, que é chamado no **topo** do `selectSquare`, continua falando.
   * `viewOnly` não serviria: ele barra o `drag.start` inteiro, e o toque na casa nunca
   * chegaria.
   */
  desenhando?: boolean;
  /**
   * Quanto dura a animação da peça, em ms. Padrão 180 — o número da aula.
   *
   * Existe para a prévia do editor (§15.2): *"velocidade altera movimentos e
   * intervalos"*, e o movimento é exatamente isto. Passa pelo `set`, que chama
   * `applyAnimation` antes de animar (`config.js`), então a troca vale já no lance
   * seguinte. `enabled: true` vai junto porque o pacote **desliga** a animação abaixo
   * de 70 ms e nunca mais a religa sozinho.
   */
  animacaoMs?: number;
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
  montagem?: {
    onChange: (fenDePecas: string) => void;
    /**
     * Entrega ao montador o punho para **arrastar uma peça nova** da paleta para
     * o tabuleiro, e `null` quando o tabuleiro é destruído.
     *
     * ## Por que a paleta precisa disto, e não de um segundo tabuleiro
     *
     * Arrastar da paleta não é um lance nem um movimento de peça existente: a
     * peça ainda não está no tabuleiro quando o gesto começa. Quem sabe fazer
     * isso é o próprio chessground (`api.dragNewPiece`), que põe a peça numa
     * casa de espera fora do tabuleiro e conduz o arrasto até a casa de destino.
     * Sem este atalho, uma paleta teria de inventar o arrasto por fora — com
     * HTML5 drag-and-drop, coordenadas próprias e um fantasma que não é o mesmo
     * do tabuleiro. Duas mecânicas de arrasto na mesma tela é o caminho curto
     * para duas maneiras diferentes de errar.
     *
     * A força fica ligada: na montagem, soltar sobre uma casa ocupada **troca** a
     * peça, que é o que o professor espera de um editor de posição.
     */
    aoLigar?: (controles: ControlesDeMontagem | null) => void;
  };
  onMove?: (orig: Key, dest: Key) => void;
  /**
   * O toque numa casa — **inclusive casa vazia**, e é para isso que ele existe.
   *
   * `onMove` só fala quando um lance acontece, e num treino de apontar não há
   * lance: o aluno aponta a casa do peão isolado, a coluna sem peão, o buraco
   * onde o cavalo fica. Metade dessas respostas é casa sem peça nenhuma.
   *
   * Quem dispara é o `events.select` do chessground, chamado no topo de
   * `selectSquare` (`dist/board.js:179-180`), antes de qualquer decisão sobre
   * seleção ou lance — por isso ele fala da casa vazia, e por isso fala mesmo
   * quando nada é movível.
   *
   * **Um tabuleiro que ouve isto não pode ser `viewOnly`.** O `viewOnly` da
   * criação nem chega a escutar o ponteiro (`events.js:12`), e o de depois
   * ainda barra o `drag.start` que chamaria o `selectSquare` (`events.js:57`).
   * Para um tabuleiro só de apontar, o jeito é deixar `viewOnly` desligado e
   * não dar movimento nenhum: sem `turnColor` e sem `dests`, `isMovable` é
   * falso, nenhuma peça arrasta e nenhuma casa fica selecionada — mas o toque
   * continua chegando aqui.
   */
  onSelect?: (casa: Key) => void;
};

/** O que a paleta do montador pode pedir ao tabuleiro. */
export type ControlesDeMontagem = {
  arrastarNovaPeca: (peca: Piece, evento: MouchEvent) => void;
  /**
   * Põe (ou apaga, com `null`) uma peça numa casa, sem arrastar.
   *
   * É o **equivalente sem arrasto** que §25 exige: quem não puder ou não quiser
   * arrastar escolhe a peça na paleta e clica na casa. Sem isto, montar uma
   * posição seria a única operação do editor que só existe no mouse.
   */
  porPeca: (peca: Piece | null, casa: Key) => void;
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
  espessuraDeDesenhoUniforme = false,
  desenhando = false,
  animacaoMs = 180,
  montagem,
  onMove,
  onSelect,
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
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
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
      animation: { enabled: true, duration: animacaoMs },
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
      // Sempre um objeto, e **nunca** `events: undefined`: o `configure` do
      // pacote faz `deepMerge(state, config)`, e a chave presente com valor
      // `undefined` apaga o `state.events` inteiro. O `redrawAll` termina em
      // `state.events.insert?.(elements)` (chessground.js:46) e estoura —
      // derrubando **todo** tabuleiro do site, inclusive o da aula, onde não há
      // barreira de erro para segurar. Custou uma medição inteira em
      // 2026-08-24.
      //
      // O `select` entra pela ref e não pela prop, e por isso pode ser
      // registrado aqui mesmo quando ninguém escuta: um tabuleiro sem
      // `onSelect` chama uma função que não faz nada, que é mais barato que
      // reconfigurar o chessground a cada render do pai.
      events: {
        select: (casa) => onSelectRef.current?.(casa),
        ...(monta
          ? { change: () => montagemRef.current?.onChange(apiRef.current?.getFen() ?? "") }
          : {}),
      },
      drawable: {
        enabled: desenhaAqui,
        visible: true,
        shapes: desenhavel?.shapes ?? [],
        // A ref e não a prop: reconfigurar o chessground só porque a função
        // mudou de identidade custaria um redesenho por render.
        onChange: (formas) => {
          // **O clique esquerdo apagava o desenho inteiro da posição.** O
          // `drag.start` do pacote começa por `drawClear(s)` sempre que não há
          // casa selecionada e o clique não cai numa peça movível
          // (`drag.js:17-20`), e o `clear` avisa o `onChange` com a lista vazia
          // (`draw.js:65-71`). Num tabuleiro do Lichess isso é o certo — a seta
          // é rabisco de análise. Num editor de autoria é perda de trabalho: o
          // desenho é conteúdo do arquivo, e um clique numa casa vazia o
          // apagava sem o professor pedir.
          //
          // Ignorar toda lista vazia quebraria o gesto legítimo de apagar o
          // último traço. O que separa os dois é o `drawable.current`: o traço
          // apagado pelo botão direito chega aqui com o gesto **ainda de pé**
          // (o `end` chama `addShape` antes de `cancel`), e a limpeza do clique
          // chega sem gesto nenhum.
          const api = apiRef.current;
          if (formas.length === 0 && api && !api.state.drawable.current) {
            api.setShapes([...(desenhoRef.current?.shapes ?? [])]);
            return;
          }
          desenhoRef.current?.onChange(formas);
        },
        // O tipo do pacote exige a tabela inteira — os doze pincéis —, mas o
        // `configure()` dele faz `deepMerge`: o que não vier aqui continua
        // valendo o padrão. Trocamos os quatro que a aula usa e mais nada.
        brushes: pinceis(host, espessuraDeDesenhoUniforme) as DrawBrushes,
      },
    });
    apiRef.current = api;
    // O punho da paleta só existe depois que o chessground existe — e some com
    // ele. Passar `null` na limpeza evita que o montador segure um tabuleiro
    // destruído e arraste uma peça para lugar nenhum.
    montagemRef.current?.aoLigar?.({
      arrastarNovaPeca: (peca, evento) => api.dragNewPiece(peca, evento, true),
      porPeca: (peca, casa) => {
        // `newPiece` avisa o `events.change` sozinho; `setPieces` **não** avisa
        // (board.js:17 não chama `callUserFunction`). Por isso só o apagar
        // precisa contar ao montador que a posição mudou — e sem este aviso a
        // peça sumiria da tela e continuaria na FEN.
        if (peca) api.newPiece(peca, casa);
        else {
          api.setPieces(new Map([[casa, undefined]]));
          montagemRef.current?.onChange(api.getFen());
        }
      },
    });

    return () => {
      montagemRef.current?.aoLigar?.(null);
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
      animation: { enabled: true, duration: animacaoMs },
      movable: monta
        ? { free: true, color: "both" as const, dests: undefined }
        : {
            free: false,
            color: viewOnly || desenhando ? undefined : turnColor,
            dests: viewOnly || desenhando ? new Map() : dests,
          },
      // Re-passado junto da FEN de propósito — ver a prop `desenhavel`.
      ...(desenhaAqui ? { drawable: { shapes: desenhavel?.shapes ?? [] } } : {}),
    });
    // `desenhavel` fora da lista: a identidade do objeto muda a cada render do
    // pai, e o efeito abaixo já cuida de quando as **formas** mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, orientation, turnColor, dests, lastMove, check, viewOnly, revision, desenhando, animacaoMs]);

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
