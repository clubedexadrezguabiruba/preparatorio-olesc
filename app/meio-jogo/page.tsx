import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";

export const metadata: Metadata = { title: "Meio-jogo — Preparatório OLESC" };

export default async function MeioJogo() {
  const perfil = await perfilAtual();
  const cabecalho = await dadosDoCabecalho(perfil.id);

  return (
    <>
      <Cabecalho
        atual="meio-jogo"
        nivel={cabecalho.nivel}
        sequencia={cabecalho.sequencia}
        largura="larga"
      />
      <Moldura largura="larga" barraInferior className="gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="titulo text-tinta">Meio-jogo</h1>
        </header>
        <div className="cartao-vazio flex flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="rounded-full border border-dashed border-borda px-2.5 py-1 text-xs font-medium text-tinta-fraca">
            Em breve
          </span>
          <p className="max-w-prose text-sm text-tinta-media">
            As aulas de meio-jogo estão sendo preparadas. Esta seção abre assim que o conteúdo
            estiver pronto.
          </p>
        </div>
      </Moldura>
    </>
  );
}
