import Link from "next/link";
import { exigirEditor } from "@/lib/editor/acesso";
import { indiceDeAulas } from "@/lib/finais/conteudo";
import { aulaDaTrilha } from "@/lib/finais/trilha";

/**
 * A porta do modo editor: as aulas que existem em disco, para abrir e editar.
 *
 * **Isto é o mínimo que faz a porta existir**, e não a tela que o plano
 * descreve. O menu "+ Nova aula" — começar do zero, importar FEN, importar
 * PGN, importar estudo do Lichess, escolher capítulo do livro — é do Bloco 3,
 * junto com o molde e a aula extra. Uma lista sem porta de entrada seria uma
 * tela que só se alcança digitando a URL, e o repositório já teve uma dessas
 * (a `/partidas`, com zero links apontando para ela).
 *
 * A lista traz **rascunho e publicada juntos**, como a bancada de `/finais`: no
 * editor a diferença entre as duas não é o que se pode fazer, é o que já
 * chegou ao aluno.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Editor" };

export default async function IndiceDoEditor() {
  await exigirEditor();
  const aulas = indiceDeAulas();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="titulo">Editor</h1>
        <p className="text-sm text-tinta-media">
          As {aulas.length} aulas que existem em disco. Abrir uma cria o rascunho dela; o
          aluno continua vendo a versão publicada até você clicar em “Publicar no curso”.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {aulas.map((aula) => {
          const naTrilha = aulaDaTrilha(aula.id);
          return (
            <li key={aula.id}>
              <Link
                href={`/editor/finais/${aula.id}`}
                className="foco cartao-vazio flex items-center gap-3 px-4 py-3 transition-colors hover:bg-carta-toque"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-tinta">{aula.titulo}</span>
                  <span className="text-xs text-tinta-fraca tabular-nums">
                    {aula.id} · {aula.etapas} {aula.etapas === 1 ? "etapa" : "etapas"}
                    {aula.status === "draft" ? " · rascunho" : " · publicada"}
                    {naTrilha ? ` · nível ${naTrilha.nivel}` : " · fora da trilha"}
                  </span>
                </span>
                <span aria-hidden className="text-tinta-fraca">
                  ✎
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-tinta-fraca">
        Esta tela só existe na sua máquina, em <code>npm run dev</code>. O site publicado não
        tem editor — o disco dele é somente leitura.
      </p>
    </main>
  );
}
