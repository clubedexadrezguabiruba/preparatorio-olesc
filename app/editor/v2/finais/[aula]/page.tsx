import { notFound } from "next/navigation";
import { EditorV2 } from "@/components/editor-v2/EditorV2";
import { exigirEditor } from "@/lib/editor/acesso";
import { lerPosicoesDoConteudoV2 } from "@/lib/editor-v2/gate";
import { hashDaPosicao } from "@/lib/editor-v2/hash";
import { aulaIdV2Schema, problemasDaAulaV2 } from "@/lib/editor-v2/modelo";
import { recuperarTransacaoV2 } from "@/lib/editor-v2/publicar";
import { lerRegua } from "@/lib/lesson/voz";
import type { PosicaoDoAcervoV2 } from "@/lib/editor-v2/acervo";
import { obrasDoRegistro } from "@/lib/editor-v2/acervo-em-disco";
import { documentoDoEditorV2 } from "../../documento-do-editor";

/** O acervo inteiro, com o hash que a proveniência registra — calculado aqui, no servidor. */
function acervoDoEditor(): PosicaoDoAcervoV2[] {
  return Object.values(lerPosicoesDoConteudoV2())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((position) => ({ position, conteudoHash: hashDaPosicao(position) }));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ aula: string }> }) {
  const { aula } = await params;
  return { title: `Editor v2 · ${aula}` };
}

export default async function PaginaDoEditorV2({ params }: { params: Promise<{ aula: string }> }) {
  const perfil = await exigirEditor();
  const { aula } = await params;
  /*
   * O id é conferido pelo schema do v2, e não pelo das aulas do curso: desde
   * "Nova aula" (§5.2) existe o namespace `EX-` das aulas extras, e ele não casa
   * com `^N[0-9]+-…`. Continua sendo este regex — sem barra e sem ponto — que
   * impede um `../` de sair da pasta de rascunhos.
   */
  if (!aulaIdV2Schema.safeParse(aula).success) notFound();
  // §20.1: uma publicação interrompida é terminada ou desfeita antes de a aula abrir.
  recuperarTransacaoV2(aula);

  // A leitura mora em `documento-do-editor.ts`, compartilhada com "Assistir como aluno".
  const documento = documentoDoEditorV2(aula);
  if (!documento) notFound();

  /*
   * A conferência de proveniência é feita **aqui**, e não na tela, porque ela compara
   * hashes e o hash vem do `node:crypto`, que não existe no navegador.
   *
   * Mandá-la pronta não é gambiarra: ela responde "o arquivo da posição mudou desde
   * que a revisão foi registrada", e isso não muda enquanto o professor escreve. O que
   * muda a cada tecla — forma, referências, legalidade dos lances — continua sendo
   * recalculado na tela. Cada conferência roda onde ela pode rodar, e no ritmo dela.
   */
  const daProveniencia = problemasDaAulaV2(documento.aula, documento.positions, hashDaPosicao)
    .filter((problema) => problema.codigo.startsWith("PROVENIENCIA_"));
  return (
    <EditorV2
      aulaId={aula}
      documentoInicial={documento.aula}
      hashInicial={documento.hash}
      positions={documento.positions}
      problemasDaOrigem={daProveniencia}
      regua={lerRegua()}
      professor={perfil.nome || perfil.usuario}
      acervo={acervoDoEditor()}
      obras={obrasDoRegistro()}
    />
  );
}
