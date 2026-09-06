import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { nota, notas } from "@/lib/repertorio/conteudo";

export async function generateMetadata({
  params,
}: PageProps<"/aberturas/notas/[abertura]">): Promise<Metadata> {
  const { abertura } = await params;
  return { title: `${nota(abertura)?.nome ?? "Princípios"} — Preparatório OLESC` };
}

/**
 * Uma abertura que não virou linha: os princípios, em texto.
 *
 * **Não há tabuleiro nesta página, e é uma decisão.** A §2.10 do
 * `docs/REPERTORIO.md` tirou estas quatro do repertório porque cada uma aparece
 * menos de uma vez por torneio — decorar oito meios-lances de algo tão raro é o
 * pior negócio de memória que existe. O que sobrevive até a partida é a ideia.
 *
 * Um diagrama também custaria uma superfície nova: o `lib/diagrama` que a
 * apostila usa é paleta **de papel**, por decisão escrita lá; trazê-lo para a
 * tela traria as cores erradas. Os lances em SAN no alto dizem que posição é
 * essa, que é o que um livro de princípios faz.
 */
export default async function NotaDaAbertura({
  params,
}: PageProps<"/aberturas/notas/[abertura]">) {
  const { abertura } = await params;
  const texto = nota(abertura);
  if (!texto) notFound();

  await perfilAtual();
  const outras = notas().filter((n) => n.slug !== texto.slug);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-2">
        <Link href="/aberturas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Aberturas
        </Link>
        <h1 className="titulo text-tinta">{texto.nome}</h1>
        <p className="text-sm font-medium text-tinta-media tabular-nums">{texto.lances}</p>
        <p className="text-xs text-tinta-fraca">{texto.frequencia}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">O que ele quer</h2>
        {texto.explicacao.map((paragrafo) => (
          <p key={paragrafo.slice(0, 24)} className="text-sm text-tinta-media">
            {paragrafo}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rotulo text-tinta-fraca">O que você faz</h2>
        <ol className="flex flex-col gap-2">
          {texto.faca.map((passo, i) => (
            <li
              key={passo.slice(0, 24)}
              className="flex gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3"
            >
              <span className="text-sm font-semibold text-metodo-tinta tabular-nums">{i + 1}.</span>
              <span className="text-sm text-tinta">{passo}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="rounded-lg bg-aviso-superficie/15 px-3 py-2.5 text-sm text-aviso-tinta">
        <span className="font-semibold">Cuidado: </span>
        {texto.cuidado}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="rotulo text-tinta-fraca">As outras raras</h2>
        <ul className="flex flex-col gap-1.5">
          {outras.map((n) => (
            <li key={n.slug}>
              <Link
                href={`/aberturas/notas/${n.slug}`}
                className="foco flex items-baseline justify-between gap-3 rounded-lg border border-borda-fraca bg-carta px-3 py-2.5 transition-colors hover:bg-carta-toque"
              >
                <span className="text-sm text-tinta">{n.nome}</span>
                <span className="shrink-0 text-xs text-tinta-fraca tabular-nums">{n.lances}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-tinta-muda">
        Estas quatro não têm linha no treinador de propósito: juntas somam menos de 8% das
        partidas, e as vagas do repertório foram para o que você encontra toda semana.
      </p>
    </main>
  );
}
