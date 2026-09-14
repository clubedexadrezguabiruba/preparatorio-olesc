"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTeclasDoTabuleiro } from "@/components/atalhos/Atalhos";
import { TreeStage } from "@/components/lesson/TreeStage";
import { ganchosDoTreinoV2 } from "@/lib/editor-v2/ganchos-do-treino";
import type { TreinoJogavel } from "@/lib/editor-v2/treino-jogavel";
import type { Position } from "@/lib/lesson/schema";
import { useLessonStore } from "@/lib/lesson/store";
import { usePrisaoDeFoco } from "./foco";

/**
 * Jogar um treino na prévia — §16.4, §15.1 e §20.2.
 *
 * ## O que este arquivo **não** faz
 *
 * Ele não julga lance nem escolhe defesa. Quem joga é o `TreeStage`, o mesmo em que o
 * aluno treina; quem julga é o `judgeMove`; quem escolhe a defesa é
 * `lib/lesson/defensor.ts`. Este arquivo é a **moldura**: abre a árvore traduzida na
 * store, diz qual tentativa está correndo e fecha.
 *
 * ## Isolada, e sem gravar nada
 *
 * - **do progresso**: não há `onStageDone`, não há `LessonPlayer`, e o `TreeStage` não
 *   grava sozinho. Um teste lê os imports deste arquivo para isso não mudar calado;
 * - **da autoria**: recebe o treino já traduzido e não tem comando para aplicar;
 * - **da store do aluno**: abre sob um id próprio e a esvazia ao fechar.
 */
export function PreviaDoTreino({ treinoId, titulo, perfil, jogavel, aoFechar }: {
  treinoId: string;
  titulo: string;
  perfil: "final-certificado" | "linha-autoral";
  jogavel: TreinoJogavel;
  aoFechar: () => void;
}) {
  const camada = useRef<HTMLDivElement>(null);
  const camadaDeAtalhos = usePrisaoDeFoco(camada, aoFechar);
  // x vira a vista e ? mostra os atalhos também por cima do editor (fatia 10).
  useTeclasDoTabuleiro(camadaDeAtalhos);

  const idDaPrevia = `previa-treino:${treinoId}`;
  const lessonId = useLessonStore((s) => s.lessonId);
  const tentativa = useLessonStore((s) => s.trees.guided?.attempt ?? 1);

  useEffect(() => {
    useLessonStore.getState().open(idDaPrevia, "guided", { guided: jogavel.tree.root });
    return () => useLessonStore.setState({ lessonId: null, trees: {}, practices: {}, message: null });
  }, [idDaPrevia, jogavel.tree.root]);

  const position = useMemo(() => ({ fen: jogavel.fenInicial }) as unknown as Position, [jogavel.fenInicial]);
  // O mesmo montador da aula do aluno: duas cópias divergiriam na primeira correção.
  const v2 = useMemo(() => ganchosDoTreinoV2(jogavel), [jogavel]);

  return (
    <div ref={camada} role="dialog" aria-modal="true" aria-label={`Jogar o treino: ${titulo}`} className="fixed inset-0 z-50 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borda-fraca px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-tinta">Jogar o treino — {titulo}</p>
          <p className="text-xs text-tinta-fraca" aria-live="polite">
            Tentativa {tentativa}.{" "}
            {jogavel.politica === "fixa"
              ? "O defensor joga sempre a defesa escolhida."
              : "Com mais de uma defesa, o defensor troca a cada tentativa; recomece para ver a outra."}{" "}
            Nada aqui é gravado no progresso, e a aula atrás não muda.
          </p>
          {/* Fatia 7: com a evidência da tablebase guardada no treino, a prévia julga como o
              aluno julga. A frase antiga ("não consulta a tablebase") ficou falsa nesse caso. */}
          {perfil === "final-certificado" ? (
            <p className="text-xs text-tinta-fraca">
              {jogavel.certificado
                ? "Final certificado: lances fora da linha são julgados pela evidência da tablebase guardada no treino, como o aluno vê."
                : "Final certificado sem evidência para todas as perguntas: lances fora da linha recebem a frase da linha treinada. Conferir renova a evidência."}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">
          Fechar prévia
        </button>
      </header>

      <div className="min-h-0 flex-1 p-4">
        {lessonId === idDaPrevia ? (
          <TreeStage
            // A tentativa é da store; o `key` só troca o treino.
            key={idDaPrevia}
            lesson={jogavel.lesson}
            tree={jogavel.tree}
            treeKey="guided"
            position={position}
            orientation={jogavel.orientacao}
            allowHelp
            moveLimit={jogavel.moveLimit}
            intro={jogavel.intro}
            v2={v2}
          />
        ) : null}
      </div>
    </div>
  );
}
