import { notFound } from "next/navigation";
import { AssistirVersaoDoEditor } from "@/components/editor-v2/AssistirAula";
import { exigirEditor } from "@/lib/editor/acesso";
import { aulaIdV2Schema } from "@/lib/editor-v2/modelo";
import { comparacaoComAPublicada, documentoDoEditorV2 } from "../../documento-do-editor";

/**
 * "Assistir como aluno" a versão do editor, aberto da lista de aulas (16/9/2026). Só lê: não abre a
 * aula para edição, não termina publicação interrompida e não grava progresso.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ aula: string }> }) {
  const { aula } = await params;
  return { title: `Assistir · ${aula}` };
}

export default async function AssistirComoAluno({ params }: { params: Promise<{ aula: string }> }) {
  await exigirEditor();
  const { aula } = await params;
  if (!aulaIdV2Schema.safeParse(aula).success) notFound();
  const documento = documentoDoEditorV2(aula, { soLer: true });
  if (!documento) notFound();
  const comparacao = comparacaoComAPublicada(aula, documento.aula);
  return (
    <AssistirVersaoDoEditor
      aulaId={aula}
      documento={documento.aula}
      mudou={comparacao === "mudou"}
      publicada={comparacao !== "nunca-publicada"}
    />
  );
}
