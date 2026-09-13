import { notFound } from "next/navigation";
import { EditorDeRepertorio } from "@/components/editor-repertorio/EditorDeRepertorio";
import { exigirEditor } from "@/lib/editor/acesso";
import { recuperarTransacaoRepertorio } from "@/lib/repertorio/editor/aplicar";
import { abrirArquivoDoRepertorio, ehArquivoDoRepertorio } from "@/lib/repertorio/editor/rascunho";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  return { title: `Editor · ${arquivo}` };
}

export default async function PaginaDoArquivoDoRepertorio({ params }: { params: Promise<{ arquivo: string }> }) {
  await exigirEditor();
  const { arquivo } = await params;
  // A cor e o slug, conferidos **antes** de o id virar caminho de arquivo.
  if (!ehArquivoDoRepertorio(arquivo)) notFound();
  // §21: uma aplicação interrompida é terminada ou desfeita antes de o arquivo abrir.
  recuperarTransacaoRepertorio();
  const aberto = abrirArquivoDoRepertorio(arquivo);
  if (!aberto) notFound();
  return (
    <EditorDeRepertorio
      arquivo={arquivo}
      textoInicial={aberto.texto}
      hashInicial={aberto.hash}
      origem={aberto.origem}
      temFonte={aberto.fonte !== null}
    />
  );
}
