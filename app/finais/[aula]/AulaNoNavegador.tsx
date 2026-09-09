"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { PacoteDeAula } from "@/lib/finais/conteudo";
import type { StageKey } from "@/lib/lesson/store";
import { registrarEtapa } from "../acoes";

/**
 * A casca de cliente que lê `?revisao=1` e abre a aula na etapa certa.
 *
 * ## Por que uma casca, e não `searchParams` na página
 *
 * `/finais/[aula]` é **estática** (`dynamicParams = false`, HTML pronto para as
 * 49): ler `searchParams` no servidor a tornaria dinâmica, e as 49 aulas
 * passariam a ser renderizadas sob demanda para servir a um parâmetro que só
 * muda o passo inicial. Lendo no navegador, a página continua estática e o
 * custo é zero para quem entra pela trilha.
 *
 * O `<Suspense>` em volta (na página) não é enfeite: `useSearchParams` numa
 * rota estática exige um limite de suspense, ou a build falha.
 *
 * ## O que o parâmetro muda
 *
 * Só onde a aula abre — direto na etapa sem ajuda —, e o `revisao` que o motor
 * usa para gravar a linha certa. O aluno pode navegar para qualquer etapa
 * depois, como sempre.
 *
 * A escolha era entre a etapa 6 e a prática, e deixou de ser: a etapa 6 saiu
 * do formato em 2026-09-08, e quem revisa agora é a escada — mesma aula, mesma
 * posição, noutro dia. Quem volta para revisar já sabe a técnica; o que ele
 * vem fazer é a passada, e ela é a partida.
 */
export function AulaNoNavegador({
  pacote,
  leitura,
}: {
  pacote: PacoteDeAula;
  leitura?: ReactNode;
}) {
  const revisao = useSearchParams().get("revisao") === "1";

  const etapa: StageKey | undefined = revisao ? "practice" : undefined;

  return (
    <LessonPlayer
      bundle={pacote}
      startAt={etapa ? { stage: etapa } : undefined}
      revisao={revisao}
      onStageDone={registrarEtapa}
      leitura={leitura}
    />
  );
}
