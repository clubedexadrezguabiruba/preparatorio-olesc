import Link from "next/link";
import { exigirEditor } from "@/lib/editor/acesso";
import { idsDeDocumentosV2, lerDocumentoV2 } from "@/lib/editor-v2/rascunhos";
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

  /*
   * ## As aulas que só existem no v2
   *
   * "Nova aula" (§5.2) cria um documento em `.editor/v2/` sem arquivo v1 por
   * trás — ela ainda não é conteúdo do curso, e por isso não aparece em
   * `indiceDeAulas()`. Sem esta lista, a aula recém-criada existiria em disco e
   * seria alcançável só por URL digitada, que é o defeito que esta tela nasceu
   * para não ter (ver o comentário do topo).
   */
  const doCurso = new Set(aulas.map((aula) => aula.id));
  const soNoV2 = idsDeDocumentosV2()
    .filter((id) => !doCurso.has(id))
    .flatMap((id) => {
      try {
        const documento = lerDocumentoV2(id);
        return documento ? [{ id, titulo: documento.aula.titulo, capitulos: documento.aula.capitulos.length }] : [];
      } catch {
        // Rascunho quebrado não pode derrubar o índice inteiro: ele some da
        // lista e continua no disco, para o professor recuperar pela URL.
        return [];
      }
    });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="titulo">Editor</h1>
          <Link
            href="/editor/v2/nova"
            className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta"
          >
            + Nova aula
          </Link>
        </div>
        <p className="text-sm text-tinta-media">
          As {aulas.length} aulas que existem em disco. Abrir uma cria o rascunho dela; o
          aluno continua vendo a versão publicada até você clicar em “Publicar no curso”.
        </p>
      </header>

      {soNoV2.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-tinta">Rascunhos novos, só no Editor v2</h2>
          <ul className="flex flex-col gap-2">
            {soNoV2.map((aula) => (
              <li key={aula.id} className="cartao-vazio flex items-stretch gap-1 p-1">
                <Link
                  href={`/editor/v2/finais/${aula.id}`}
                  className="foco flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-carta-toque"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-tinta">{aula.titulo}</span>
                    <span className="text-xs text-tinta-fraca tabular-nums">
                      {aula.id} · {aula.capitulos === 0 ? "sem capítulo ainda" : `${aula.capitulos} ${aula.capitulos === 1 ? "capítulo" : "capítulos"}`} · fora da trilha
                    </span>
                  </span>
                  <span aria-hidden className="text-tinta-fraca">✎</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="flex flex-col gap-2">
        {aulas.map((aula) => {
          const naTrilha = aulaDaTrilha(aula.id);
          return (
            <li key={aula.id} className="cartao-vazio flex items-stretch gap-1 p-1">
              <Link
                href={`/editor/finais/${aula.id}`}
                className="foco flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-carta-toque"
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
              <Link
                href={`/editor/v2/finais/${aula.id}`}
                className="foco flex shrink-0 items-center rounded-md border border-metodo-superficie px-3 py-2 text-xs font-medium text-metodo-tinta transition-colors hover:bg-metodo-superficie/10"
              >
                Abrir v2
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
