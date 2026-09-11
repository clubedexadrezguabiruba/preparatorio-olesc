"use client";

import type { AnaliseV2 } from "@/lib/editor-v2/modelo";
import { entradasVerticais } from "@/lib/editor-v2/painel";

const NAG: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };
export function PainelDeLances({ analise, sans, rotulos, selecionado, onSelecionar, onPromover }: {
  analise: AnaliseV2;
  sans: Record<string, string>;
  rotulos: Record<string, string>;
  selecionado: string;
  onSelecionar: (nodeId: string) => void;
  onPromover: (parentId: string, nodeId: string) => void;
}) {
  const raiz = analise.nos[analise.raizId];
  const entradas = entradasVerticais(analise);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <button type="button" aria-current={selecionado === raiz.id ? "true" : undefined} onClick={() => onSelecionar(raiz.id)} className={`foco w-fit rounded-md px-2 py-1 text-xs ${selecionado === raiz.id ? "bg-metodo-superficie text-metodo-tinta-alta" : "text-tinta-fraca hover:bg-carta-toque"}`}>Posição inicial</button>
      {entradas.length ? (
        <ol className="flex min-h-0 flex-col gap-0.5 overflow-auto pr-1" aria-label="Lances da análise">
          {entradas.map(({ nodeId, parentId, nivel, principal }) => {
            const no = analise.nos[nodeId];
            return (
              <li key={nodeId} className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-1 rounded-md ${nivel ? "border-l border-borda bg-papel" : ""}`} style={{ marginLeft: `${Math.min(nivel, 2) * 0.75}rem` }}>
                <span className="px-1 text-right text-xs tabular-nums text-tinta-fraca">{rotulos[nodeId]}</span>
                <button type="button" aria-current={selecionado === nodeId ? "true" : undefined} onClick={() => onSelecionar(nodeId)} className={`foco min-w-0 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${selecionado === nodeId ? "bg-metodo-superficie text-metodo-tinta-alta" : "text-tinta hover:bg-carta-toque"}`}>
                  <span className="font-medium">{sans[nodeId] ?? no.uci ?? "?"}</span>
                  {no.nags?.map((nag) => <span key={nag} className="ml-0.5 text-aviso-tinta">{NAG[nag] ?? `$${nag}`}</span>)}
                  {no.comentario ? <span className="ml-2 text-xs text-tinta-fraca">{no.comentario}</span> : null}
                </button>
                {!principal ? <button type="button" className="foco rounded px-1.5 py-1 text-xs text-tinta-fraca hover:bg-carta-toque hover:text-tinta" onClick={() => onPromover(parentId, nodeId)} title="Tornar esta variante a linha principal">principal</button> : null}
              </li>
            );
          })}
        </ol>
      ) : <p className="text-sm text-tinta-fraca">Arraste uma peça no tabuleiro para criar o primeiro lance.</p>}
    </div>
  );
}
