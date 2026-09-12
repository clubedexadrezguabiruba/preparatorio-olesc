import Link from "next/link";
import { FormularioDeNovaAula } from "@/components/editor-v2/FormularioDeNovaAula";
import { exigirEditor } from "@/lib/editor/acesso";

/**
 * A porta de "Nova aula" — §5.2.
 *
 * A página é um servidor magro de propósito: ela confere quem entrou e desenha o
 * formulário, que é cliente porque o identificador precisa aparecer enquanto o
 * professor digita. A escrita em disco fica na Server Action, que confere
 * `exigirEditor()` de novo — um POST direto não passa por esta página.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Nova aula · Editor v2" };

export default async function PaginaDeNovaAula() {
  await exigirEditor();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <Link href="/editor" className="foco w-fit text-xs text-tinta-fraca hover:text-tinta">← Editor</Link>
        <h1 className="titulo">Nova aula</h1>
        <p className="text-sm text-tinta-media">
          Cria o rascunho v2 de uma aula nova. A aula publicada e o editor atual não são alterados.
        </p>
      </header>

      <FormularioDeNovaAula />
    </main>
  );
}
