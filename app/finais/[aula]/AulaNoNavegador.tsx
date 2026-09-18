"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { LessonPlayer, type NavegacaoEntreAulas } from "@/components/lesson/LessonPlayer";
import type { AulaDoAlunoV2 } from "@/lib/editor-v2/fluxo-do-aluno";
import type { PacoteDeAula } from "@/lib/finais/conteudo";
import type { StageKey } from "@/lib/lesson/store";
import { registrarEtapa, registrarEtapaV2 } from "../acoes";

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
 *
 * ## A aula v2 (fatia 7)
 *
 * Recebe as etapas do fluxo já traduzidas no servidor e grava por `registrarEtapaV2`, que
 * rejulga contra a publicação que o aluno jogou.
 */
export function AulaNoNavegador(props: ({ pacote: PacoteDeAula; leitura?: ReactNode } | { aulaV2: AulaDoAlunoV2; leitura?: ReactNode }) & { navegacaoEntreAulas?: NavegacaoEntreAulas }) {
  const parametros = useSearchParams();
  const revisao = parametros.get("revisao") === "1";

  if ("aulaV2" in props) {
    // `pratica`: com várias práticas, o cartão de revisão diz qual venceu (trava 9, 15/9/2026).
    return <LessonPlayer aulaV2={props.aulaV2} revisao={revisao} praticaDaRevisao={parametros.get("pratica") ?? undefined} onEtapaFeita={registrarEtapaV2} leitura={props.leitura} navegacaoEntreAulas={props.navegacaoEntreAulas} />;
  }

  const etapa: StageKey | undefined = revisao ? "practice" : undefined;

  return (
    <LessonPlayer
      bundle={props.pacote}
      startAt={etapa ? { stage: etapa } : undefined}
      revisao={revisao}
      onStageDone={registrarEtapa}
      leitura={props.leitura}
    />
  );
}
