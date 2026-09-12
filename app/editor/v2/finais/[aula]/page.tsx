import { notFound } from "next/navigation";
import { EditorV2 } from "@/components/editor-v2/EditorV2";
import { exigirEditor } from "@/lib/editor/acesso";
import { abrirRascunhoDeAula } from "@/lib/editor/rascunhos";
import { adaptarLessonV1 } from "@/lib/editor-v2/adaptar-v1";
import { hashDaPosicao } from "@/lib/editor-v2/hash";
import { aulaIdV2Schema, problemasDaAulaV2 } from "@/lib/editor-v2/modelo";
import { documentoInicialV2, lerDocumentoV2 } from "@/lib/editor-v2/rascunhos";
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
  /*
   * O id é conferido pelo schema do v2, e não pelo das aulas do curso: desde
   * "Nova aula" (§5.2) existe o namespace `EX-` das aulas extras, e ele não casa
   * com `^N[0-9]+-…`. Continua sendo este regex — sem barra e sem ponto — que
   * impede um `../` de sair da pasta de rascunhos.
   */
  if (!aulaIdV2Schema.safeParse(aula).success) notFound();

  /*
   * Uma aula extra (`EX-…`) não tem — e não pode ter — arquivo v1: as pastas do
   * v1 só aceitam o id do curso, e pedir o rascunho v1 de uma extra estouraria
   * dentro do guardião de caminho. A pergunta "existe v1?" só faz sentido para
   * quem podia ter um.
   */
  const aberto = lessonIdSchema.safeParse(aula).success ? abrirRascunhoDeAula(aula) : null;

  /*
   * ## As aulas que só existem no v2
   *
   * Uma aula criada por "Nova aula" não tem arquivo v1 por trás — não há o que
   * adaptar, e `pacoteDaAula` não tem lesson para ler. Ela é aberta direto do
   * documento v2, com o pacote de posições vazio: uma aula nova não referencia
   * nenhuma posição revisada, porque ainda não tem capítulo. Quando passar a
   * ter, as posições dela nascerão como FEN crua, que é o caminho de §12 e não
   * depende deste pacote.
   */
  if (!aberto) {
    const documento = lerDocumentoV2(aula);
    if (!documento) notFound();
    return (
      <EditorV2
        aulaId={aula}
        documentoInicial={documento.aula}
        hashInicial={documento.hash}
        positions={{}}
      />
    );
  }

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
