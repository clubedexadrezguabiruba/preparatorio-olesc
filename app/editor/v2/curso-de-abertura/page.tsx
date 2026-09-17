import Link from "next/link";
import { ImportarCursoDeAbertura } from "@/components/editor-v2/ImportarCursoDeAbertura";
import { exigirEditor } from "@/lib/editor/acesso";
import { lerIndice } from "@/lib/repertorio/banco";

/**
 * Importar um curso de abertura — especificação §13.3 (decisões do Doug, 16/9/2026).
 *
 * Um estudo do Lichess na Estrutura Didática vira as aulas `AB-` (uma por bloco) e o PGN do
 * repertório daquela abertura. Servidor magro, como "Nova aula": confere quem entrou e passa as
 * aberturas do repertório para o formulário, que é cliente.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Curso de abertura · Editor v2" };

export default async function PaginaDoCursoDeAbertura() {
  await exigirEditor();
  const aberturas = (await lerIndice()).map((entrada) => ({ cor: entrada.cor, abertura: entrada.abertura, nome: entrada.nome }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <Link href="/editor" className="foco w-fit text-xs text-tinta-fraca hover:text-tinta">← Editor</Link>
        <h1 className="titulo">Importar curso de abertura</h1>
        <p className="text-sm text-tinta-media">
          O estudo do Lichess vira uma aula por bloco e o PGN do repertório da abertura. Nada é publicado daqui.
        </p>
      </header>
      <ImportarCursoDeAbertura aberturas={aberturas} />
    </main>
  );
}
