import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carregar } from "@/lib/partidas/carregar";
import { momentosDa } from "@/lib/partidas/momentos";
import { Momentos } from "./Momentos";

/**
 * **TESTE.** Os momentos de decisão de uma partida — o que a ficha chama de
 * *move trainer*.
 *
 * É a outra metade do teste: `/partidas/[jogo]` joga a partida inteira, e esta
 * rota cobra as 8 a 10 decisões que a ficha isolou. A diferença entre as duas
 * é o tamanho: a Marshall–Tarrasch tem 44 lances das pretas e 10 momentos.
 */
export async function generateMetadata({
  params,
}: PageProps<"/partidas/[jogo]/momentos">): Promise<Metadata> {
  const { jogo } = await params;
  const partida = await carregar(jogo);
  return { title: `Momentos — ${partida?.nome ?? "Partidas"} — Preparatório OLESC` };
}

export default async function MomentosDaPartida({
  params,
  searchParams,
}: PageProps<"/partidas/[jogo]/momentos">) {
  const { jogo } = await params;
  const partida = await carregar(jogo);
  if (!partida) notFound();

  const momentos = momentosDa(jogo);

  /*
   * `?m=5` começa a série no momento 5. É atalho de **teste**: quem está
   * julgando o formato precisa abrir a posição difícil sem resolver as quatro
   * fáceis antes. Fora da faixa vira zero em vez de tela vazia.
   */
  const { m } = await searchParams;
  const pedido = typeof m === "string" ? Number(m) : NaN;
  const inicial = Number.isInteger(pedido) && pedido >= 1 && pedido <= momentos.length
    ? pedido - 1
    : 0;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-1">
        <Link href="/partidas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Partidas
        </Link>
        <h1 className="titulo text-tinta">{partida.nome}</h1>
        <p className="text-xs text-tinta-fraca">
          Momentos de decisão · você joga de {partida.cor}
        </p>
      </header>

      {momentos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
          Esta partida não tem momentos na ficha.
        </p>
      ) : (
        <Momentos momentos={momentos} partida={jogo} inicial={inicial} />
      )}
    </main>
  );
}
