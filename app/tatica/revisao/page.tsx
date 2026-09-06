import type { Metadata } from "next";
import Link from "next/link";
import { perfilAtual } from "@/lib/auth/perfil";
import { hojeNoBrasil } from "@/lib/curso/calendario";
import { puzzlePorId } from "@/lib/tatica/banco";
import { chaveDe } from "@/lib/tatica/chave";
import { revisaoDeHoje } from "@/lib/tatica/progresso";
import type { PuzzleServido } from "@/lib/tatica/puzzles";
import { INTERVALOS_DA_REVISAO } from "@/lib/tatica/revisao";
import { REVISAO_POR_DIA } from "@/lib/tatica/serie";
import { Serie } from "../[tema]/Serie";

export const metadata: Metadata = { title: "Revisão do dia — Preparatório OLESC" };

/**
 * A revisão do dia: até dez puzzles que o aluno errou e que venceram hoje.
 *
 * É a repetição espaçada da tática. A fila é derivada das linhas de
 * `tentativas_puzzle` (`lib/tatica/revisao.ts`): errou, volta em 2 dias;
 * acertou na revisão, em 7; de novo, em 14; depois sai. Esta página só
 * decide **quais dez** de hoje, e reaproveita a série inteira — o tabuleiro, o
 * juiz, a gravação — com `etapa="revisao"`.
 *
 * ## Determinística, como a série
 *
 * Com mais de dez devidos, quais vêm primeiro? Os mais atrasados; no empate,
 * a ordem sai de `chaveDe(aluno:hoje:id)` — a mesma para o mesmo aluno no
 * mesmo dia, para um F5 no meio da rodada não trocar os puzzles.
 *
 * ## A `key` da série
 *
 * Ao fim da rodada a série chama `router.refresh()`: os acertos foram para
 * +7 e os erros para +2, então saem da fila de hoje e a lista muda. A `key` é
 * a lista de ids — muda, remonta, e o aluno vê os próximos dez (se havia mais
 * de dez) ou o cartão de "nada para revisar".
 */
export default async function Revisao() {
  const perfil = await perfilAtual();
  const hoje = hojeNoBrasil();
  const devidos = await revisaoDeHoje(perfil.id);

  const escolhidos = [...devidos]
    .sort((a, b) =>
      a.devidoEm < b.devidoEm
        ? -1
        : a.devidoEm > b.devidoEm
          ? 1
          : chaveDe(`${perfil.id}:${hoje}:${a.puzzleId}`) -
            chaveDe(`${perfil.id}:${hoje}:${b.puzzleId}`),
    )
    .slice(0, REVISAO_POR_DIA);

  // O puzzle que saiu do recorte (o banco foi refeito) não existe mais no
  // disco: `null`, e fica de fora sem barulho. A linha dele continua no
  // histórico, e ele nunca mais vence — o que é o correto.
  const carregados = await Promise.all(
    escolhidos.map(async (item) => {
      const p = await puzzlePorId(item.origem, item.puzzleId);
      return p ? ({ ...p, origem: item.origem } satisfies PuzzleServido) : null;
    }),
  );
  const puzzles = carregados.filter((p): p is PuzzleServido => p !== null);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-1">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Revisão do dia</h1>
        <p className="text-xs text-tinta-fraca">
          Os puzzles que você errou, de volta {INTERVALOS_DA_REVISAO[0]} dias depois. Acertou:
          volta em {INTERVALOS_DA_REVISAO[1]}, depois em {INTERVALOS_DA_REVISAO[2]}, depois sai.
        </p>
      </header>

      {puzzles.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center">
          <p className="text-sm font-medium text-tinta">Nada para revisar hoje.</p>
          <p className="text-sm text-tinta-media">
            Os erros de hoje voltam em {INTERVALOS_DA_REVISAO[0]} dias. Enquanto isso, siga na
            série do seu tema.
          </p>
          <Link href="/tatica" className="foco text-sm font-medium text-metodo-tinta underline">
            Ir para a tática
          </Link>
        </div>
      ) : (
        <Serie
          key={`revisao:${hoje}:${puzzles.map((p) => p.id).join(",")}`}
          tema={null}
          nomeDoTema="Revisão do dia"
          etapa="revisao"
          puzzles={puzzles}
          jaFeitosNaEtapa={0}
          metaDaEtapa={puzzles.length}
          feitosNoTema={null}
          totalNoTema={null}
          explicacao={[]}
          procure={[]}
          cuidado={null}
        />
      )}

      {devidos.length > puzzles.length ? (
        <p className="text-xs text-tinta-fraca tabular-nums">
          {devidos.length - puzzles.length} ainda na fila de hoje — aparecem quando esta rodada
          acabar.
        </p>
      ) : null}
    </main>
  );
}
