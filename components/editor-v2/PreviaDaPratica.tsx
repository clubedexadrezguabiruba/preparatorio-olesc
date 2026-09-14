"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTeclasDoTabuleiro } from "@/components/atalhos/Atalhos";
import { PracticeStage } from "@/components/lesson/PracticeStage";
import type { PraticaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";
import { useLessonStore } from "@/lib/lesson/store";
import { usePrisaoDeFoco } from "./foco";

/**
 * Jogar a prática na prévia — §17.1 e §15.1, fatia 10.
 *
 * O mesmo `PracticeStage` do aluno, com o mesmo Stockfish do aluno, sob um id de store próprio que
 * é esvaziado ao fechar. Nada é gravado: não há `LessonPlayer` nem `onEtapaFeita`. O motor do
 * professor fica pausado atrás (a janela conta como aberta no `EditorV2`).
 */
export function PreviaDaPratica({ pratica, posicao, aoFechar }: { pratica: PraticaV2; posicao: Position; aoFechar: () => void }) {
  const camada = useRef<HTMLDivElement>(null);
  const camadaDeAtalhos = usePrisaoDeFoco(camada, aoFechar);
  // x vira a vista e ? mostra os atalhos também por cima do editor (fatia 10).
  useTeclasDoTabuleiro(camadaDeAtalhos);
  const idDaPrevia = `previa-pratica:${pratica.id}`;
  const chave = "previa-pratica";
  const lessonId = useLessonStore((s) => s.lessonId);

  useEffect(() => {
    useLessonStore.getState().open(idDaPrevia, chave, {}, [{ key: chave, positionId: posicao.id, startFen: posicao.fen }]);
    return () => useLessonStore.setState({ lessonId: null, trees: {}, practices: {}, message: null });
  }, [idDaPrevia, posicao.fen, posicao.id]);

  const position = useMemo(() => posicao, [posicao]);

  return (
    <div ref={camada} role="dialog" aria-modal="true" aria-label={`Jogar a prática: ${pratica.titulo}`} className="fixed inset-0 z-50 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borda-fraca px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-tinta">Jogar a prática — {pratica.titulo}</p>
          <p className="text-xs text-tinta-fraca">
            {pratica.objetivo === "win" ? "Objetivo: vencer." : "Objetivo: segurar o empate."} Computador com força {pratica.engine.skill} e {pratica.engine.moveTimeMs} ms por lance.
            Nada aqui é gravado no progresso.
          </p>
        </div>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar prévia</button>
      </header>
      <div className="min-h-0 flex-1 p-4">
        {lessonId === idDaPrevia ? (
          <PracticeStage practiceKey={chave} position={position} orientation={pratica.ladoAluno} goal={pratica.objetivo} engine={pratica.engine} />
        ) : null}
      </div>
    </div>
  );
}
