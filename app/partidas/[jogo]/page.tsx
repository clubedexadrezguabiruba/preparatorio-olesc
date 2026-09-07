import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregar } from "@/lib/partidas/carregar";
import { Sessao } from "./Sessao";

/**
 * **TESTE.** Uma partida instrutiva no treinador de lances do repertório.
 *
 * A página é fina de propósito: lê o PGN, monta a `Linha` na memória e entrega
 * ao mesmo componente `Passada` que as aberturas usam. Não há `perfilAtual`,
 * não há progresso e não há server action — o guarda de `proxy.ts` já exige
 * login para chegar aqui, e mais que isso o teste não precisa.
 */
export async function generateMetadata({
  params,
}: PageProps<"/partidas/[jogo]">): Promise<Metadata> {
  const { jogo } = await params;
  const partida = await carregar(jogo);
  return { title: `${partida?.nome ?? "Partidas"} — Preparatório OLESC` };
}

export default async function PartidaInstrutiva({ params }: PageProps<"/partidas/[jogo]">) {
  const { jogo } = await params;
  const partida = await carregar(jogo);
  if (!partida) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-1">
        <Link href="/partidas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Partidas
        </Link>
        <h1 className="titulo text-tinta">{partida.nome}</h1>
        <p className="text-xs text-tinta-fraca">
          {partida.fonte} · você joga de {partida.cor} · {partida.lancesNossos} lances seus
        </p>
      </header>

      <Sessao linha={partida.linha} resumo={partida.resumo} />

      <Link
        href={`/partidas/${jogo}/momentos`}
        className="foco w-fit rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media transition-colors hover:bg-carta-toque"
      >
        Ir para os momentos de decisão desta partida →
      </Link>

      {partida.avisos.length > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-xl border border-dashed border-borda px-4 py-3">
          <h2 className="rotulo text-tinta-fraca">O que o leitor de PGN deixou de fora</h2>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-tinta-fraca">
            {partida.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
