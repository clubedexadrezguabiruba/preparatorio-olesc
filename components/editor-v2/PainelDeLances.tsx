"use client";

import { useEffect, useRef, useState } from "react";
import { MenuDoLance } from "@/components/editor-v2/MenuDoLance";
import { acoesDoLance, type AcaoDoLanceV2 } from "@/lib/editor-v2/acoes-do-lance";
import type { AnaliseV2 } from "@/lib/editor-v2/modelo";
import { entradasVerticais } from "@/lib/editor-v2/painel";

const NAG: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };
export function PainelDeLances({ analise, sans, rotulos, selecionado, focar = 0, treinoNoNode, onSelecionar, onPromover, onAcao }: {
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
  onSelecionar: (nodeId: string) => void;
  onPromover: (parentId: string, nodeId: string) => void;
  /** §11.3: o que o botão direito e o `•••` fazem. O painel só escolhe o alvo. */
  onAcao: (acao: AcaoDoLanceV2["id"], nodeId: string) => void;
}) {
  const raiz = analise.nos[analise.raizId];
  const entradas = entradasVerticais(analise);
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});
  /**
   * Qual menu está aberto. **Um só de cada vez**, e por isso o estado é do
   * painel e não de cada linha: dois menus abertos ao mesmo tempo é um jeito
   * seguro de o professor clicar no lance errado.
   */
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

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

  /**
   * O botão direito num lance: seleciona e abre o mesmo menu do `•••`.
   *
   * Selecionar antes de abrir não é detalhe: as ações do menu agem sobre o lance
   * selecionado, e abrir um menu que age sobre outro lance que não está no
   * tabuleiro é como o professor perde trabalho sem entender por quê.
   */
  const aoBotaoDireito = (evento: React.MouseEvent, nodeId: string) => {
    evento.preventDefault();
    onSelecionar(nodeId);
    setMenuAberto(nodeId);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={(el) => { botoes.current[raiz.id] = el; }}
          aria-current={selecionado === raiz.id ? "true" : undefined}
          onClick={() => onSelecionar(raiz.id)}
          onContextMenu={(evento) => aoBotaoDireito(evento, raiz.id)}
          className={`foco w-fit rounded-md px-2 py-1 text-xs ${selecionado === raiz.id ? "bg-metodo-superficie text-metodo-tinta-alta" : "text-tinta-fraca hover:bg-carta-toque"}`}
        >
          Posição inicial
        </button>
        <MenuDoLance
          acoes={acoesDoLance(analise, raiz.id, treinoNoNode?.(raiz.id))}
          aberto={menuAberto === raiz.id}
          rotulo="posição inicial"
          aoAbrir={() => { onSelecionar(raiz.id); setMenuAberto(raiz.id); }}
          aoFechar={() => setMenuAberto(null)}
          aoEscolher={(acao) => onAcao(acao, raiz.id)}
        />
      </div>
      {entradas.length ? (
        <ol className="flex min-h-0 flex-col gap-0.5 overflow-auto pr-1" aria-label="Lances da análise">
          {entradas.map(({ nodeId, parentId, nivel, principal }) => {
            const no = analise.nos[nodeId];
            const nome = sans[nodeId] ?? no.uci ?? "?";
            return (
              <li key={nodeId} className={`grid grid-cols-[3rem_minmax(0,1fr)_auto_auto] items-center gap-1 rounded-md ${nivel ? "border-l border-borda bg-papel" : ""}`} style={{ marginLeft: `${Math.min(nivel, 2) * 0.75}rem` }}>
                <span className="px-1 text-right text-xs tabular-nums text-tinta-fraca">{rotulos[nodeId]}</span>
                <button
                  type="button"
                  ref={(el) => { botoes.current[nodeId] = el; }}
                  aria-current={selecionado === nodeId ? "true" : undefined}
                  onClick={() => onSelecionar(nodeId)}
                  onContextMenu={(evento) => aoBotaoDireito(evento, nodeId)}
                  className={`foco min-w-0 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${selecionado === nodeId ? "bg-metodo-superficie text-metodo-tinta-alta" : "text-tinta hover:bg-carta-toque"}`}
                >
                  <span className="font-medium">{nome}</span>
                  {no.nags?.map((nag) => <span key={nag} className="ml-0.5 text-aviso-tinta">{NAG[nag] ?? `$${nag}`}</span>)}
                  {no.revisao ? <span title="Marcado para revisão" aria-label="marcado para revisão" className="ml-1 text-aviso-tinta">⚑</span> : null}
                  {no.comentario ? <span className="ml-2 text-xs text-tinta-fraca">{no.comentario}</span> : null}
                </button>
                {!principal ? <button type="button" className="foco rounded px-1.5 py-1 text-xs text-tinta-fraca hover:bg-carta-toque hover:text-tinta" onClick={() => onPromover(parentId, nodeId)} title="Tornar esta variante a linha principal">principal</button> : <span />}
                <MenuDoLance
                  acoes={acoesDoLance(analise, nodeId, treinoNoNode?.(nodeId))}
                  aberto={menuAberto === nodeId}
                  rotulo={`${rotulos[nodeId] ?? ""} ${nome}`.trim()}
                  aoAbrir={() => { onSelecionar(nodeId); setMenuAberto(nodeId); }}
                  aoFechar={() => setMenuAberto(null)}
                  aoEscolher={(acao) => onAcao(acao, nodeId)}
                />
              </li>
            );
          })}
        </ol>
      ) : <p className="text-sm text-tinta-fraca">Arraste uma peça no tabuleiro para criar o primeiro lance.</p>}
    </div>
  );
}
