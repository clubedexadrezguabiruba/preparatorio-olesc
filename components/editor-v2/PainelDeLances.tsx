"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MenuDoLance } from "@/components/editor-v2/MenuDoLance";
import { acoesDoLance, type AcaoDoLanceV2 } from "@/lib/editor-v2/acoes-do-lance";
import type { AnaliseV2 } from "@/lib/editor-v2/modelo";
import { entradasVerticais } from "@/lib/editor-v2/painel";

const NAG: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

/** As funções de agora que as linhas chamam. Ficam numa ref para as linhas não redesenharem por elas. */
type EventosDoPainel = {
  selecionar: (nodeId: string) => void;
  promover: (parentId: string, nodeId: string) => void;
  escolher: (acao: AcaoDoLanceV2["id"], nodeId: string) => void;
};

const SEM_ACOES: AcaoDoLanceV2[] = [];

/**
 * O lance selecionado, fora do render da lista. Cada linha pergunta "sou eu?", e só as duas cuja
 * resposta mudou redesenham — a lista de 1.000 elementos não é recriada a cada seta.
 */
type LojaDaSelecao = { ler: () => string; definir: (nodeId: string) => void; inscrever: (aviso: () => void) => () => void };

function criarLojaDaSelecao(inicial: string): LojaDaSelecao {
  let atual = inicial;
  const avisos = new Set<() => void>();
  return {
    ler: () => atual,
    definir: (nodeId) => {
      if (nodeId === atual) return;
      atual = nodeId;
      avisos.forEach((aviso) => aviso());
    },
    inscrever: (aviso) => {
      avisos.add(aviso);
      return () => { avisos.delete(aviso); };
    },
  };
}

export function PainelDeLances({ analise, sans, rotulos, selecionado, focar = 0, treinoNoNode, filtrarAcoes = (acoes) => acoes, onSelecionar, onPromover, onAcao }: {
  analise: AnaliseV2;
  sans: Record<string, string>;
  rotulos: Record<string, string>;
  selecionado: string;
  /**
   * Um contador que só cresce quando a seleção veio **do teclado** (§16).
   *
   * Serve para o foco seguir a seta sem seguir o mouse: se o foco pulasse a cada
   * mudança de seleção, clicar num problema da lista acima arrancaria o foco de lá.
   * Zero é o valor de partida e não mexe em nada — abrir a página não rouba o foco.
   */
  focar?: number;
  treinoNoNode?: (nodeId: string) => { disponivel: boolean; motivo?: string };
  /**
   * Quais ações o menu oferece neste editor. O repertório (fatia 8) usa o mesmo painel sem
   * capítulos nem treinos, e ação que não existe ali some — em vez de ficar apagada com um
   * motivo que não se aplica a nada.
   */
  filtrarAcoes?: (acoes: AcaoDoLanceV2[]) => AcaoDoLanceV2[];
  onSelecionar: (nodeId: string) => void;
  onPromover: (parentId: string, nodeId: string) => void;
  /** §11.3: o que o botão direito e o `•••` fazem. O painel só escolhe o alvo. */
  onAcao: (acao: AcaoDoLanceV2["id"], nodeId: string) => void;
}) {
  const raiz = analise.nos[analise.raizId];
  const entradas = useMemo(() => entradasVerticais(analise), [analise]);
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});
  /**
   * Qual menu está aberto. **Um só de cada vez**, e por isso o estado é do
   * painel e não de cada linha: dois menus abertos ao mesmo tempo é um jeito
   * seguro de o professor clicar no lance errado.
   */
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  /*
   * ## Desempenho (fatia 10, parada 10G)
   *
   * Medido na árvore de 1.000 nós: calcular `acoesDoLance` de todas as linhas custava 100 ms em
   * Node **a cada render** — inclusive a cada seta do teclado —, e as 1.000 linhas redesenhavam
   * junto. Agora as ações só são calculadas para o menu aberto, e cada linha é memorizada: trocar de
   * lance redesenha as duas linhas cuja seleção mudou. As funções que as linhas recebem não mudam de
   * identidade: elas chamam, pela ref, as funções de agora do editor.
   */
  const eventos = useRef<EventosDoPainel | null>(null);
  useLayoutEffect(() => {
    eventos.current = { selecionar: onSelecionar, promover: onPromover, escolher: onAcao };
  });
  const selecionar = useCallback((nodeId: string) => eventos.current?.selecionar(nodeId), []);
  const promover = useCallback((parentId: string, nodeId: string) => eventos.current?.promover(parentId, nodeId), []);
  const escolher = useCallback((acao: AcaoDoLanceV2["id"], nodeId: string) => eventos.current?.escolher(acao, nodeId), []);
  const abrirMenu = useCallback((nodeId: string) => { eventos.current?.selecionar(nodeId); setMenuAberto(nodeId); }, []);
  const fecharMenu = useCallback(() => setMenuAberto(null), []);
  const registrarBotao = useCallback((nodeId: string, el: HTMLButtonElement | null) => { botoes.current[nodeId] = el; }, []);
  const acoesDoMenu = menuAberto ? filtrarAcoes(acoesDoLance(analise, menuAberto, treinoNoNode?.(menuAberto))) : SEM_ACOES;
  const [loja] = useState(() => criarLojaDaSelecao(selecionado));
  useLayoutEffect(() => {
    loja.definir(selecionado);
  }, [loja, selecionado]);

  /**
   * Foco visível e rolagem até o lance escolhido.
   *
   * `block: "nearest"` rola o mínimo necessário: a lista não dá um pulo a cada seta
   * quando o lance já estava à vista.
   */
  useEffect(() => {
    if (!focar) return;
    const alvo = botoes.current[selecionado];
    alvo?.focus();
    alvo?.scrollIntoView({ block: "nearest" });
  }, [focar, selecionado]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={(el) => { botoes.current[raiz.id] = el; }}
          aria-current={selecionado === raiz.id ? "true" : undefined}
          onClick={() => onSelecionar(raiz.id)}
          onContextMenu={(evento) => { evento.preventDefault(); abrirMenu(raiz.id); }}
          className={`foco w-fit rounded-md px-2 py-1 text-xs ${selecionado === raiz.id ? "bg-metodo-superficie/25 font-semibold text-metodo-tinta-alta ring-1 ring-foco" : "text-tinta-fraca hover:bg-carta-toque"}`}
        >
          Posição inicial
        </button>
        <MenuDoLance
          acoes={menuAberto === raiz.id ? acoesDoMenu : SEM_ACOES}
          aberto={menuAberto === raiz.id}
          rotulo="posição inicial"
          aoAbrir={() => abrirMenu(raiz.id)}
          aoFechar={fecharMenu}
          aoEscolher={(acao) => onAcao(acao, raiz.id)}
        />
      </div>
      <ListaDosLances
        entradas={entradas}
        nos={analise.nos}
        sans={sans}
        rotulos={rotulos}
        menuAberto={menuAberto}
        acoesDoMenu={acoesDoMenu}
        loja={loja}
        registrarBotao={registrarBotao}
        aoSelecionar={selecionar}
        aoPromover={promover}
        aoAbrirMenu={abrirMenu}
        aoFecharMenu={fecharMenu}
        aoEscolher={escolher}
      />
    </div>
  );
}

/** A lista inteira, memorizada: não depende do lance selecionado (ver `LojaDaSelecao`). */
const ListaDosLances = memo(function ListaDosLances({ entradas, nos, sans, rotulos, menuAberto, acoesDoMenu, loja, registrarBotao, aoSelecionar, aoPromover, aoAbrirMenu, aoFecharMenu, aoEscolher }: {
  entradas: ReturnType<typeof entradasVerticais>;
  nos: AnaliseV2["nos"];
  sans: Record<string, string>;
  rotulos: Record<string, string>;
  menuAberto: string | null;
  acoesDoMenu: AcaoDoLanceV2[];
  loja: LojaDaSelecao;
  registrarBotao: (nodeId: string, el: HTMLButtonElement | null) => void;
  aoSelecionar: (nodeId: string) => void;
  aoPromover: (parentId: string, nodeId: string) => void;
  aoAbrirMenu: (nodeId: string) => void;
  aoFecharMenu: () => void;
  aoEscolher: (acao: AcaoDoLanceV2["id"], nodeId: string) => void;
}) {
  return entradas.length ? (
        <ol className="flex min-h-0 flex-col gap-0.5 overflow-auto pr-1" aria-label="Lances da análise">
          {entradas.map(({ nodeId, parentId, nivel, principal }) => {
            const no = nos[nodeId];
            const aberto = menuAberto === nodeId;
            return (
              <LinhaDoLance
                key={nodeId}
                nodeId={nodeId}
                parentId={parentId}
                nivel={nivel}
                principal={principal}
                nome={sans[nodeId] ?? no.uci ?? "?"}
                rotulo={rotulos[nodeId]}
                nags={no.nags?.join(",") ?? ""}
                revisao={Boolean(no.revisao)}
                comentario={no.comentario}
                loja={loja}
                aberto={aberto}
                acoes={aberto ? acoesDoMenu : SEM_ACOES}
                registrarBotao={registrarBotao}
                aoSelecionar={aoSelecionar}
                aoPromover={aoPromover}
                aoAbrirMenu={aoAbrirMenu}
                aoFecharMenu={aoFecharMenu}
                aoEscolher={aoEscolher}
              />
            );
          })}
        </ol>
      ) : <p className="text-sm text-tinta-fraca">Arraste uma peça no tabuleiro para criar o primeiro lance.</p>;
});

const LinhaDoLance = memo(function LinhaDoLance({ nodeId, parentId, nivel, principal, nome, rotulo, nags, revisao, comentario, loja, aberto, acoes, registrarBotao, aoSelecionar, aoPromover, aoAbrirMenu, aoFecharMenu, aoEscolher }: {
  nodeId: string;
  parentId: string;
  nivel: number;
  principal: boolean;
  nome: string;
  rotulo: string | undefined;
  /** Os NAGs como texto, para a comparação da memorização ser por valor. */
  nags: string;
  revisao: boolean;
  comentario: string | undefined;
  loja: LojaDaSelecao;
  aberto: boolean;
  /** As ações do menu, só na linha do menu aberto; nas outras, a mesma lista vazia. */
  acoes: AcaoDoLanceV2[];
  registrarBotao: (nodeId: string, el: HTMLButtonElement | null) => void;
  aoSelecionar: (nodeId: string) => void;
  aoPromover: (parentId: string, nodeId: string) => void;
  aoAbrirMenu: (nodeId: string) => void;
  aoFecharMenu: () => void;
  aoEscolher: (acao: AcaoDoLanceV2["id"], nodeId: string) => void;
}) {
  const selecionado = useSyncExternalStore(loja.inscrever, () => loja.ler() === nodeId, () => loja.ler() === nodeId);
  return (
    <li className={`grid grid-cols-[3rem_minmax(0,1fr)_auto_auto] items-center gap-1 rounded-md ${nivel ? "border-l border-borda bg-papel" : ""}`} style={{ marginLeft: `${Math.min(nivel, 2) * 0.75}rem` }}>
      <span className="px-1 text-right text-xs tabular-nums text-tinta-fraca">{rotulo}</span>
      <button
        type="button"
        ref={(el) => registrarBotao(nodeId, el)}
        aria-current={selecionado ? "true" : undefined}
        onClick={() => aoSelecionar(nodeId)}
        /*
         * O botão direito num lance: seleciona e abre o mesmo menu do `•••`.
         *
         * Selecionar antes de abrir não é detalhe: as ações do menu agem sobre o lance
         * selecionado, e abrir um menu que age sobre outro lance que não está no
         * tabuleiro é como o professor perde trabalho sem entender por quê.
         */
        onContextMenu={(evento) => { evento.preventDefault(); aoAbrirMenu(nodeId); }}
        className={`foco min-w-0 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${selecionado ? "bg-metodo-superficie/25 font-semibold text-metodo-tinta-alta ring-1 ring-foco" : "text-tinta hover:bg-carta-toque"}`}
      >
        <span className="font-medium">{nome}</span>
        {nags ? nags.split(",").map(Number).map((nag) => <span key={nag} className="ml-0.5 text-aviso-tinta">{NAG[nag] ?? `$${nag}`}</span>) : null}
        {revisao ? <span title="Marcado para revisão" aria-label="marcado para revisão" className="ml-1 text-aviso-tinta">⚑</span> : null}
        {comentario ? <span className="ml-2 text-xs text-tinta-fraca">{comentario}</span> : null}
      </button>
      {!principal ? <button type="button" className="foco rounded px-1.5 py-1 text-xs text-tinta-fraca hover:bg-carta-toque hover:text-tinta" onClick={() => aoPromover(parentId, nodeId)} title="Tornar esta variante a linha principal">principal</button> : <span />}
      <MenuDoLance
        acoes={acoes}
        aberto={aberto}
        rotulo={`${rotulo ?? ""} ${nome}`.trim()}
        aoAbrir={() => aoAbrirMenu(nodeId)}
        aoFechar={aoFecharMenu}
        aoEscolher={(acao) => aoEscolher(acao, nodeId)}
      />
    </li>
  );
});
