import { notFound } from "next/navigation";
import { EditorV2 } from "@/components/editor-v2/EditorV2";
import { exigirEditor } from "@/lib/editor/acesso";
import { abrirRascunhoDeAula } from "@/lib/editor/rascunhos";
import { adaptarLessonV1 } from "@/lib/editor-v2/adaptar-v1";
import { documentoInicialV2 } from "@/lib/editor-v2/rascunhos";
import { pacoteDaAula } from "@/lib/finais/conteudo";
import { lessonIdSchema, lessonSchema } from "@/lib/lesson/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ aula: string }> }) {
  const { aula } = await params;
  return { title: `Editor v2 · ${aula}` };
}

export default async function PaginaDoEditorV2({ params }: { params: Promise<{ aula: string }> }) {
  await exigirEditor();
  const { aula } = await params;
  if (!lessonIdSchema.safeParse(aula).success) notFound();
  const aberto = abrirRascunhoDeAula(aula);
  if (!aberto) notFound();
  const lesson = lessonSchema.parse(JSON.parse(aberto.texto));
  const { positions } = pacoteDaAula(lesson);
  const documento = documentoInicialV2(aula, adaptarLessonV1(lesson, positions));
  return <EditorV2 aulaId={aula} documentoInicial={documento.aula} hashInicial={documento.hash} positions={positions} />;
}
