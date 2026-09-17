import type { Metadata } from "next";
import Link from "next/link";
import { VistaDoTabuleiro } from "@/components/atalhos/Atalhos";
import { perfilAtual } from "@/lib/auth/perfil";
import { garantirPendente } from "@/lib/tatica/gravar-rating";
import { problemasDeHoje } from "@/lib/tatica/rating-leitura";
import { Rodada } from "./Rodada";

export const metadata: Metadata = { title: "Tática rating — Preparatório OLESC" };

/**
 * A tática com rating: problemas misturados, e o rating sobe e desce a cada um.
 * O plano inteiro está em `docs/TATICA-RATING.md`.
 *
 * **Quem escolhe o problema é o servidor, e ele o grava antes de mostrar**
 * (`garantirPendente`). Por isso recarregar a página traz o mesmo problema: um
 * F5 não foge de um difícil, e o id na tela não escolhe um fácil.
 *
 * A moldura é a do palco da série (`app/tatica/[tema]/page.tsx`): altura
 * fechada, cabeçalho de uma linha, sem o `Cabecalho` do site — cada pixel fora
 * do tabuleiro sai do tabuleiro.
 *
 * O cabeçalho não explica a regra ("errou um lance, o problema acaba"): o Doug
 * achou a frase estranha e ruim (15/9), e a tela já a mostra acontecendo.
 *
 * A `key` da `Rodada` é o problema servido: o botão "Recarregar" chama
 * `router.refresh()`, que troca as props sem desmontar o componente de cliente;
 * sem a `key`, o estado velho ficaria na tela com o problema novo.
 */
export default async function TaticaRating() {
  const perfil = await perfilAtual();
  const [servido, feitosHoje] = await Promise.all([garantirPendente(perfil.id), problemasDeHoje(perfil.id)]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <Link href="/tatica" className="foco rotulo text-metodo-tinta hover:underline">
          ← Tática
        </Link>
        <h1 className="titulo text-tinta">Tática rating</h1>
      </header>

      {"erro" in servido ? (
        <div className="flex flex-col gap-3 cartao-vazio px-4 py-6 text-center">
          <p className="text-sm font-medium text-tinta">Não deu para servir um problema agora.</p>
          <p className="text-sm text-tinta-media">({servido.erro}) Recarregue a página; se continuar, avise o professor.</p>
        </div>
      ) : (
        <VistaDoTabuleiro escopos={["tatica-rating"]}>
          <Rodada key={servido.puzzle.id} aluno={perfil.id} inicial={servido} feitosHoje={feitosHoje} />
        </VistaDoTabuleiro>
      )}
    </main>
  );
}
