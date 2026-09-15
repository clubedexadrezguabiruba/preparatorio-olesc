"use client";

import { useId, useState } from "react";
import { ChessBoard } from "@/components/board/ChessBoard";
import { filtrarAcervo, pecasDaFen, ROTULO_DO_ESTADO, ROTULO_DO_RESULTADO, type PosicaoDoAcervoV2 } from "@/lib/editor-v2/acervo";

/**
 * A lista das posições do acervo, com miniatura, estado e resultado esperado — fatia 10.
 *
 * É um grupo de rádio: setas mudam a escolha, Tab sai do grupo. A escolha fica marcada por borda,
 * fundo **e** "✓" — nunca só por cor (§25).
 */
export function SeletorDoAcervo({ acervo, escolhida, aoEscolher }: {
  acervo: PosicaoDoAcervoV2[];
  escolhida: string | null;
  aoEscolher: (item: PosicaoDoAcervoV2) => void;
}) {
  const [busca, setBusca] = useState("");
  const nome = useId();
  const visiveis = filtrarAcervo(acervo, busca);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Procurar no acervo
        <input type="search" value={busca} onChange={(e) => setBusca(e.currentTarget.value)} placeholder="ex.: KQK, dama, Capablanca, empate" className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta" />
      </label>
      <p className="text-xs text-tinta-fraca" aria-live="polite">{visiveis.length} de {acervo.length} posições</p>
      <div role="radiogroup" aria-label="Posições do acervo" className="grid max-h-[22rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {visiveis.map((item) => {
          const { position } = item;
          const marcada = escolhida === position.id;
          const pecas = pecasDaFen(position.fen);
          return (
            <label
              key={position.id}
              className={`flex cursor-pointer gap-2 rounded-md border p-2 text-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foco ${marcada ? "border-foco bg-metodo-superficie/15 ring-1 ring-foco" : "border-borda-fraca hover:bg-carta-toque"}`}
            >
              <input type="radio" name={nome} value={position.id} checked={marcada} onChange={() => aoEscolher(item)} className="foco sr-only" />
              <span className="w-20 shrink-0" aria-hidden>
                <ChessBoard fen={position.fen} orientation="white" viewOnly />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="break-all font-medium text-tinta">{marcada ? "✓ " : ""}{position.id}</span>
                <span className="text-tinta-media">{ROTULO_DO_RESULTADO[position.expectedResult]} · {pecas} peças</span>
                <span className={position.status === "approved" ? "text-tinta-fraca" : "text-aviso-tinta"}>{ROTULO_DO_ESTADO[position.status]}</span>
                <span className="text-tinta-fraca">{position.tags.join(", ")}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
