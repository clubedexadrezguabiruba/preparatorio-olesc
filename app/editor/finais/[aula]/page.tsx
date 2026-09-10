import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { exigirEditor } from "@/lib/editor/acesso";
import { podePublicar, ultimaConferencia } from "@/lib/editor/gate";
import { abrirRascunhoDeAula } from "@/lib/editor/rascunhos";
import { pacoteDaAula } from "@/lib/finais/conteudo";
import { lessonIdSchema, lessonSchema } from "@/lib/lesson/schema";
import { lerRegua } from "@/lib/lesson/voz";

/**
 * O palco do modo editor: a aula de finais, editável no lugar.
 *
 * ## Por que é dinâmica
 *
 * Ela lê o disco a cada pedido — o rascunho muda a cada salvamento, e a
 * conferência muda a cada clique em "Conferir". Uma rota estática serviria a
 * versão do momento da build, que no editor é sempre a versão errada.
 *
 * ## Por que não existe em produção
 *
 * `exigirEditor()` chama `notFound()` quando a porta está fechada, e a porta só
 * abre em `next dev`, fora da Vercel, com `EDITOR_LOCAL=1`. Numa build de
 * produção esta rota responde 404 para todo mundo, inclusive para o professor
 * logado: o editor escreve arquivos do repositório, e o disco da Vercel é
 * somente leitura.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ aula: string }> }) {
  const { aula } = await params;
  return { title: `Editando ${aula}` };
}

export default async function PaginaDoEditor({ params }: { params: Promise<{ aula: string }> }) {
  await exigirEditor();

  const { aula } = await params;
  // O id vem da URL, e URL é entrada de fora. A camada de disco confere de
  // novo; conferir aqui é o que troca uma exceção por um 404 honesto.
  if (!lessonIdSchema.safeParse(aula).success) notFound();

  // Abrir cria o rascunho a partir da publicada, por cópia de bytes, na
  // primeira vez. Da segunda em diante, devolve o rascunho como está.
  const aberto = abrirRascunhoDeAula(aula);
  if (!aberto) notFound();

  const lesson = lessonSchema.parse(JSON.parse(aberto.texto));
  const { positions } = pacoteDaAula(lesson);

  return (
    <Editor
      aula={aula}
      textoInicial={aberto.texto}
      hashInicial={aberto.hash}
      positions={positions}
      falaMaxCaracteres={lerRegua().falaMaxCaracteres}
      conferenciaInicial={ultimaConferencia(aula)}
      podePublicarInicial={podePublicar(aula)}
    />
  );
}
