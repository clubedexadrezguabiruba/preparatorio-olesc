"use client";

import { useCallback } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { AulaDoAlunoV2 } from "@/lib/editor-v2/fluxo-do-aluno";
import type { ProgressoDaLinha } from "@/lib/repertorio/treino";
import { registrarEtapaV2 } from "@/app/finais/acoes";
import { registrarTreino } from "@/app/aberturas/acoes";
import { marcarEtapaDaAula } from "@/app/aberturas/aulas/acoes";

/**
 * A casca de cliente da aula de curso de abertura (spec §13.3 e §18.1). O player é o mesmo das aulas
 * de finais; o que muda é o que ele recebe: a rodada (a vez e as etapas feitas), as linhas do move
 * trainer e as três server actions — a tentativa da parada e do treino guiado, a passada da linha e
 * a etapa feita.
 */
export function AulaDeAberturaNoNavegador({ aula, vez, feitas, progressoDasLinhas, voltar }: {
  aula: AulaDoAlunoV2;
  vez: number;
  feitas: string[];
  progressoDasLinhas: Record<string, ProgressoDaLinha>;
  voltar: { href: string; rotulo: string };
}) {
  const marcarEtapa = useCallback(async (etapaId: string) => {
    const resposta = await marcarEtapaDaAula({ aula: aula.id, publicationId: aula.publicationId, etapaId });
    return resposta.ok ? { ok: true as const, concluida: resposta.concluida } : { ok: false as const, erro: resposta.erro };
  }, [aula.id, aula.publicationId]);
  return (
    <LessonPlayer
      aulaV2={aula}
      onEtapaFeita={registrarEtapaV2}
      voltar={voltar}
      progressao={{ vez, feitas, progressoDasLinhas, gravarTreino: registrarTreino, marcarEtapa }}
    />
  );
}
