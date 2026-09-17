import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { EvolucaoDoRating } from "@/components/tatica/EvolucaoDoRating";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { INICIO } from "@/lib/tatica/glicko2";
import { evolucaoDoAluno } from "@/lib/tatica/rating-leitura";

export const metadata: Metadata = { title: "Evolução na tática rating — Preparatório OLESC" };

/**
 * A evolução do aluno no modo rating: o rating com a curva (por dia, ou por
 * problema nos primeiros dias) e o recorde em degraus, os números, os temas
 * fracos e as últimas tentativas — em cartões, na moldura larga (Doug, 16/9).
 *
 * O tempo de cada problema é gravado, mas **não aparece aqui nem em tela
 * nenhuma** (decisão do Doug, 15/9).
 */
export default async function Evolucao() {
  const perfil = await perfilAtual();
  const [cabecalho, evolucao] = await Promise.all([dadosDoCabecalho(perfil.id), evolucaoDoAluno(perfil.id)]);

  return (
    <>
      <Cabecalho atual="tatica" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="larga" barraInferior>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link href="/tatica" className="foco rotulo w-fit text-metodo-tinta hover:underline">
              ← Tática
            </Link>
            <h1 className="titulo text-tinta">Sua evolução na tática rating</h1>
          </div>
          <Link
            href="/tatica/rating"
            prefetch={false}
            className="foco inline-flex min-h-11 items-center rounded-lg bg-metodo-cheio px-5 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
          >
            Jogar
          </Link>
        </header>

        {evolucao ? (
          <EvolucaoDoRating evolucao={evolucao} paraOAluno />
        ) : (
          <div className="flex flex-col gap-2 cartao-vazio px-4 py-6 text-center">
            <p className="text-sm font-medium text-tinta">Você ainda não jogou a tática rating.</p>
            <p className="text-sm text-tinta-media">Você começa em {INICIO.rating}, e o rating sobe e desce a cada problema.</p>
          </div>
        )}
      </Moldura>
    </>
  );
}
