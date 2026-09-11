import { notFound } from "next/navigation";
import { EditorV2 } from "@/components/editor-v2/EditorV2";
import { exigirEditor } from "@/lib/editor/acesso";
import { abrirRascunhoDeAula } from "@/lib/editor/rascunhos";
import { adaptarLessonV1 } from "@/lib/editor-v2/adaptar-v1";
import { hashDaPosicao } from "@/lib/editor-v2/hash";
import { problemasDaAulaV2 } from "@/lib/editor-v2/modelo";
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
  /*
   * A conferência de proveniência é feita **aqui**, e não na tela, porque ela compara
   * hashes e o hash vem do `node:crypto`, que não existe no navegador.
   *
   * Mandá-la pronta não é gambiarra: ela responde "o arquivo da posição mudou desde
   * que a revisão foi registrada", e isso não muda enquanto o professor escreve. O que
   * muda a cada tecla — forma, referências, legalidade dos lances — continua sendo
   * recalculado na tela. Cada conferência roda onde ela pode rodar, e no ritmo dela.
   */
  const daProveniencia = problemasDaAulaV2(documento.aula, positions, hashDaPosicao)
    .filter((problema) => problema.codigo.startsWith("PROVENIENCIA_") || problema.codigo === "CERTIFICACAO_SEM_APROVACAO");
  return (
    <EditorV2
      aulaId={aula}
      documentoInicial={documento.aula}
      hashInicial={documento.hash}
      positions={positions}
      problemasDaOrigem={daProveniencia}
    />
  );
}
