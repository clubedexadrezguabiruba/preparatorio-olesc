import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { carregarPartida, podeVerRascunho } from "@/lib/partidas/carregar";
import { Sessao } from "./Sessao";

/**
 * A partida modelo inteira no treinador de lances do repertório — o caminho
 * **opcional**. O que conta no nível são os momentos de decisão, em
 * `/partidas/[jogo]`; jogar os 40 lances de memória não é o exercício.
 *
 * A narração é a do PGN (`{[%autoria …] texto}`), e os símbolos `!`/`!!` dos
 * lances do aluno aparecem no acerto, pela `Linha`.
 */
export async function generateMetadata({ params }: PageProps<"/partidas/[jogo]/inteira">): Promise<Metadata> {
  const { jogo } = await params;
  const partida = await carregarPartida(jogo, true);
  return { title: `${partida?.nome ?? "Partidas modelo"} — a partida inteira — Preparatório OLESC` };
}

export default async function PartidaInteira({ params }: PageProps<"/partidas/[jogo]/inteira">) {
  const { jogo } = await params;
  const perfil = await perfilAtual();
  const [partida, cabecalho] = await Promise.all([
    carregarPartida(jogo, podeVerRascunho(perfil.papel)),
    dadosDoCabecalho(perfil.id),
  ]);
  if (!partida) notFound();

  return (
    <>
      <Cabecalho atual="partidas" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="leitura" />
      <Moldura largura="leitura" barraInferior className="gap-5">
        <header className="flex flex-col gap-1">
          <Link href={`/partidas/${partida.slug}`} className="foco rotulo w-fit text-metodo-tinta hover:underline">
            ← {partida.nome}
          </Link>
          <h1 className="titulo text-tinta">A partida inteira</h1>
          <p className="text-xs text-tinta-fraca">
            Você joga de {partida.cor} · {partida.lancesNossos} lances seus · opcional, não conta no nível
          </p>
        </header>

        <Sessao linha={partida.linha} slug={partida.slug} />
      </Moldura>
    </>
  );
}
