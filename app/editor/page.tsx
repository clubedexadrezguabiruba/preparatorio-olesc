import Link from "next/link";
import { exigirEditor } from "@/lib/editor/acesso";
import { MenuAssistirAula } from "@/components/editor-v2/AssistirAula";
import { BotaoExcluirAula, LixeiraDoEditor } from "@/components/editor-v2/ExcluirAula";
import { lixeiraV2 } from "@/lib/editor-v2/excluir-aula";
import { idsDeDocumentosV2, lerDocumentoV2 } from "@/lib/editor-v2/rascunhos";
import { aulasExtras, indiceDeAulas } from "@/lib/finais/conteudo";
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
  const extras = aulasExtras();

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
        return documento ? [{ id, titulo: documento.aula.titulo, capitulos: documento.aula.capitulos.length, nivel: documento.aula.metadados?.nivel, classe: documento.aula.metadados?.classe }] : [];
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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/editor/repertorio"
              className="foco rounded-md border border-borda px-3 py-2 text-sm font-medium text-tinta hover:bg-carta-toque"
            >
              Repertório de aberturas
            </Link>
            <Link
              href="/editor/v2/nova"
              className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta"
            >
              + Nova aula
            </Link>
          </div>
        </div>
        <p className="text-sm text-tinta-media">
          Suas aulas. O aluno só vê uma mudança depois que você publica.
        </p>
      </header>

      {soNoV2.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-tinta">Aulas novas</h2>
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
                      {aula.capitulos === 0 ? "sem capítulo ainda" : `${aula.capitulos} ${aula.capitulos === 1 ? "capítulo" : "capítulos"}`}
                      {/* §5.1: distinguir aula do curso, aula extra e repertório. */}
                      {aula.id.startsWith("EX-")
                        ? aula.nivel && aula.classe
                          ? ` · aula extra · nível ${aula.nivel}, classe ${aula.classe}`
                          : " · aula extra sem nível — não entra no curso"
                        : " · fora da trilha"}
                    </span>
                  </span>
                  <span aria-hidden className="text-tinta-fraca">✎</span>
                </Link>
                {/* Aula que só existe no v2 nunca foi publicada: não está em `idsDeAula()`. */}
                <MenuAssistirAula aulaId={aula.id} titulo={aula.titulo} publicada={false} />
                {aula.id.startsWith("EX-") ? <BotaoExcluirAula aulaId={aula.id} titulo={aula.titulo} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="flex flex-col gap-2">
        {aulas.map((aula) => {
          const naTrilha = aulaDaTrilha(aula.id, extras);
          // Aula extra só existe no Editor v2 (D9): o editor v1 responderia 404.
          const soNoEditorV2 = aula.id.startsWith("EX-");
          return (
            <li key={aula.id} className="cartao-vazio flex items-stretch gap-1 p-1">
              <Link
                href={soNoEditorV2 ? `/editor/v2/finais/${aula.id}` : `/editor/finais/${aula.id}`}
                className="foco flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-carta-toque"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-tinta">{aula.titulo}</span>
                  <span className="text-xs text-tinta-fraca tabular-nums">
                    {aula.id} · {aula.etapas} {aula.etapas === 1 ? "etapa" : "etapas"}
                    {aula.status === "draft" ? " · rascunho" : " · publicada"}
                    {naTrilha ? ` · ${naTrilha.extra ? "aula extra · " : ""}nível ${naTrilha.nivel}` : soNoEditorV2 ? " · aula extra fora da trilha" : " · fora da trilha"}
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
                Abrir
              </Link>
              {/* Assistir como aluno (16/9/2026): as duas versões moram no ⋯, para a lista não encher de botões. */}
              <MenuAssistirAula aulaId={aula.id} titulo={aula.titulo} publicada />
              {/* Só extra se exclui pela tela; aula do curso nunca (excluir-aula.ts). */}
              {soNoEditorV2 ? <BotaoExcluirAula aulaId={aula.id} titulo={aula.titulo} /> : null}
            </li>
          );
        })}
      </ul>

      <LixeiraDoEditor itens={lixeiraV2()} />

      <p className="text-xs text-tinta-fraca">
        O editor só abre neste computador. O site dos alunos não tem editor.
      </p>
    </main>
  );
}
