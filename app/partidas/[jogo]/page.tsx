import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { carregarPartida, podeVerRascunho } from "@/lib/partidas/carregar";
import { situacoesDoAluno } from "@/lib/partidas/progresso";
import { Percurso } from "./Percurso";

/**
 * Uma partida modelo: apresentação → objetivos → momentos de decisão → o fecho
 * (momento final, resumo e perguntas) — com a partida inteira como caminho
 * opcional, em `/partidas/[jogo]/inteira`.
 *
 * O fecho só aparece depois dos momentos, ou para quem já concluiu: ele explica
 * o golpe final, e ler antes entregaria o Desafio.
 *
 * O placar vem do banco (`tentativa_partida_momento`), e não da memória da aba:
 * fechar a página não apaga o que o aluno já resolveu.
 */
export async function generateMetadata({ params }: PageProps<"/partidas/[jogo]">): Promise<Metadata> {
  const { jogo } = await params;
  const partida = await carregarPartida(jogo, true);
  return { title: `${partida?.nome ?? "Partidas modelo"} — Preparatório OLESC` };
}

export default async function PartidaModelo({ params }: PageProps<"/partidas/[jogo]">) {
  const { jogo } = await params;
  const perfil = await perfilAtual();
  const verRascunho = podeVerRascunho(perfil.papel);
  const [partida, situacoes, cabecalho] = await Promise.all([
    carregarPartida(jogo, verRascunho),
    situacoesDoAluno(perfil.id, verRascunho),
    dadosDoCabecalho(perfil.id),
  ]);
  if (!partida) notFound();

  const situacao = situacoes.get(partida.slug);

  return (
    <>
      <Cabecalho atual="partidas" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="leitura" />
      <Moldura largura="leitura" barraInferior className="gap-5">
        <header className="flex flex-col gap-1">
          <Link href="/partidas" className="foco rotulo w-fit text-metodo-tinta hover:underline">
            ← Partidas modelo
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="titulo text-tinta">{partida.nome}</h1>
            {partida.status === "rascunho" ? (
              <span className="rounded-full border border-aviso px-2 py-0.5 text-xs font-medium text-aviso-tinta">
                em revisão
              </span>
            ) : null}
          </div>
          <p className="text-xs text-tinta-fraca">
            Nível {partida.nivel} · {partida.ano} · você joga de {partida.cor}
          </p>
        </header>

        <Percurso
          slug={partida.slug}
          cor={partida.cor}
          tema={partida.tema}
          ficha={{
            intro: partida.ficha.intro,
            objetivos: partida.ficha.objetivos,
            momentoFinal: partida.ficha.momentoFinal,
            resumo: partida.ficha.resumo,
            perguntas: partida.ficha.perguntas,
          }}
          momentos={partida.momentos}
          jaFeitos={Object.fromEntries(situacao?.momentos ?? [])}
          concluida={situacao?.concluida ?? false}
        />

        <footer className="flex flex-col gap-1 border-t border-borda-fraca pt-3 text-xs text-tinta-fraca">
          <span>
            {partida.brancas} × {partida.pretas}, {partida.ano}. Texto adaptado de {partida.fonte}.
          </span>
        </footer>
      </Moldura>
    </>
  );
}
