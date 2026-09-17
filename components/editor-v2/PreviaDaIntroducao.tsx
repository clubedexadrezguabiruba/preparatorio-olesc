"use client";

import { useMemo, useRef } from "react";
import { useTeclasDoTabuleiro } from "@/components/atalhos/Atalhos";
import { IntroStage } from "@/components/lesson/IntroStage";
import { passosDaIntroducao } from "@/lib/editor-v2/fluxo-do-aluno";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { IntroStage as IntroStageData, Position } from "@/lib/lesson/schema";
import { usePrisaoDeFoco } from "./foco";

/**
 * A introdução isolada, como o aluno a vê — §7.1 e §15.1, fatia 10.
 *
 * Os passos saem de `passosDaIntroducao`, a mesma função da aula publicada, e tocam no `IntroStage`
 * do aluno. É um retrato do documento no clique; nada é gravado.
 */
export function PreviaDaIntroducao({ aula, introducaoId, positions, aoFechar }: {
  aula: AulaV2;
  introducaoId: string;
  positions: Record<string, Position>;
  aoFechar: () => void;
}) {
  const camada = useRef<HTMLDivElement>(null);
  const camadaDeAtalhos = usePrisaoDeFoco(camada, aoFechar);
  // x vira a vista e ? mostra os atalhos também por cima do editor (fatia 10).
  useTeclasDoTabuleiro(camadaDeAtalhos);
  const introducao = aula.introducoes.find((item) => item.id === introducaoId);
  const passos = useMemo(() => {
    if (!introducao) return null;
    try { return passosDaIntroducao(aula, introducao, positions); } catch { return null; }
  }, [aula, introducao, positions]);

  return (
    <div ref={camada} role="dialog" aria-modal="true" aria-label={`Prévia da introdução: ${introducao?.titulo ?? ""}`} className="fixed inset-0 z-[60] flex flex-col bg-papel">
      <header className="flex items-center justify-between gap-2 border-b border-borda-fraca px-4 py-2">
        <p className="text-sm font-semibold text-tinta">Prévia da introdução — {introducao?.titulo}</p>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar prévia</button>
      </header>
      <div className="min-h-0 flex-1 p-4">
        {passos?.length ? (
          <IntroStage
            stage={{ passos } as unknown as IntroStageData}
            position={{ fen: passos[0].fen } as unknown as Position}
            orientation={aula.metadados?.orientacaoPadrao ?? "white"}
            quebrasDeLinha
          />
        ) : <p className="text-sm text-tinta-media">A introdução não pode ser mostrada: um quadro aponta para uma posição que não existe mais.</p>}
      </div>
    </div>
  );
}
