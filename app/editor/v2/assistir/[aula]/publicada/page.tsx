import { notFound } from "next/navigation";
import { AssistirVersaoPublicada } from "@/components/editor-v2/AssistirAula";
import { exigirEditor } from "@/lib/editor/acesso";
import { aulaIdV2Schema } from "@/lib/editor-v2/modelo";
import { comLinhasDosTreinadores } from "@/lib/aberturas/linhas-da-aula";
import { dominioDaAulaV2 } from "@/lib/editor-v2/dominio";
import { aulaDoAlunoV2 } from "@/lib/editor-v2/fluxo-do-aluno";
import { pacoteAtivoDoAluno } from "@/lib/finais/conteudo-v2";
import { lerPacoteDoAluno } from "@/lib/finais/conteudo";

/**
 * A versão publicada, do jeito que o aluno a recebe em `/finais/<aula>` — o mesmo `lerPacoteDoAluno`,
 * a v2 ativa vencendo a v1 —, mas sem gravar progresso na conta do professor (16/9/2026).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ aula: string }> }) {
  const { aula } = await params;
  return { title: `Assistir a publicada · ${aula}` };
}

export default async function AssistirPublicada({ params }: { params: Promise<{ aula: string }> }) {
  await exigirEditor();
  const { aula } = await params;
  if (!aulaIdV2Schema.safeParse(aula).success) notFound();
  // A aula de abertura não é de /finais (§13.3.3): ela vem do pacote ativo, com as linhas do move trainer.
  if (dominioDaAulaV2(aula) === "abertura") {
    const pacote = pacoteAtivoDoAluno(aula);
    if (!pacote) notFound();
    return <AssistirVersaoPublicada aulaId={aula} aulaV2={await comLinhasDosTreinadores(aulaDoAlunoV2(pacote))} />;
  }
  const doAluno = lerPacoteDoAluno(aula);
  if (!doAluno) notFound();
  return doAluno.versao === 2
    ? <AssistirVersaoPublicada aulaId={aula} aulaV2={doAluno.aula} />
    : <AssistirVersaoPublicada aulaId={aula} pacote={doAluno.pacote} />;
}
