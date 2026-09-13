import Link from "next/link";
import path from "node:path";
import { FormularioDeAberturaNova } from "@/components/editor-repertorio/FormularioDeAberturaNova";
import { exigirEditor } from "@/lib/editor/acesso";
import { compilarRepertorio } from "@/lib/repertorio/compilar";
import { lerFontesDoRepertorio } from "@/lib/repertorio/compilar-em-disco";
import { notas } from "@/lib/repertorio/conteudo";
import { recuperarTransacaoRepertorio } from "@/lib/repertorio/editor/aplicar";
import { arquivosComRascunho } from "@/lib/repertorio/editor/rascunho";

/**
 * O repertório no editor — §21. Uma linha por `.pgn` de `content/repertorio/`, com as
 * contagens que a compilação de agora produz, e as aberturas novas que ainda só existem
 * como rascunho.
 *
 * As contagens saem de compilar os onze em memória (~70 ms, medido na 8C), e não do
 * `index.json`: o índice é o que o aluno vê, e esta lista é o que a fonte diz. Os dois só
 * divergem se alguém esquecer de recompilar — e aí o `--check` acusa.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Editor · Repertório" };

export default async function IndiceDoRepertorio() {
  await exigirEditor();
  recuperarTransacaoRepertorio();
  const fontes = lerFontesDoRepertorio(path.join(process.cwd(), "content", "repertorio"));
  const compilacao = compilarRepertorio(fontes, notas());
  const rascunhos = new Set(arquivosComRascunho());
  const comFonte = new Set(fontes.map((f) => f.nome.slice(0, -4)));
  const soRascunho = [...rascunhos].filter((a) => !comFonte.has(a));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <Link href="/editor" className="foco w-fit text-xs text-tinta-fraca hover:text-tinta">← Editor</Link>
        <h1 className="titulo">Repertório</h1>
        <p className="text-sm text-tinta-media">
          As {fontes.length} aberturas do treinador. A fonte é o PGN; editar grava um rascunho, e o aluno
          só vê a mudança depois de <strong>Aplicar</strong>.
        </p>
        {compilacao.problemas.length > 0 ? (
          <p role="alert" className="text-sm text-erro-texto">
            O repertório em disco não compila hoje ({compilacao.problemas.length} problema(s)): {compilacao.problemas[0]}
          </p>
        ) : null}
      </header>

      <ul className="flex flex-col gap-2" aria-label="Aberturas do repertório">
        {compilacao.porArquivo.map((a) => {
          const arquivo = a.nome.slice(0, -4);
          return (
            <li key={a.nome} className="cartao-vazio p-1">
              <Link href={`/editor/repertorio/${arquivo}`} className="foco flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-carta-toque">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-tinta">{arquivo}</span>
                  <span className="text-xs text-tinta-fraca tabular-nums">
                    {a.linhas} {a.linhas === 1 ? "linha" : "linhas"} · {a.base} Base · {a.avancado} Avançado
                    {rascunhos.has(arquivo) ? " · com rascunho" : ""}
                  </span>
                </span>
                <span aria-hidden className="text-tinta-fraca">✎</span>
              </Link>
            </li>
          );
        })}
        {soRascunho.map((arquivo) => (
          <li key={arquivo} className="cartao-vazio p-1">
            <Link href={`/editor/repertorio/${arquivo}`} className="foco flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-carta-toque">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium text-tinta">{arquivo}</span>
                <span className="text-xs text-tinta-fraca">abertura nova · só rascunho, ainda fora do repertório</span>
              </span>
              <span aria-hidden className="text-tinta-fraca">✎</span>
            </Link>
          </li>
        ))}
      </ul>

      <FormularioDeAberturaNova />
    </main>
  );
}
