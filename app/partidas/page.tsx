import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { listarPartidas } from "@/lib/partidas/carregar";
import { quantosMomentos } from "@/lib/partidas/momentos";

export const metadata: Metadata = { title: "Partidas instrutivas — Preparatório OLESC" };

/**
 * A lista das partidas instrutivas de `content/partidas/`.
 *
 * **Ela deixou de ser órfã em 2026-09-09.** Até ali não havia um único link para
 * cá em todo o site — três partidas e 28 momentos de decisão funcionando, e a
 * página só alcançável digitando a URL. O argumento de então (*"enquanto for
 * teste é o certo, um aluno que tropeçasse nisto acharia que é matéria do
 * curso"*) protegia o aluno de conteúdo inacabado, e cobrava o preço de que
 * ninguém nunca o visse. Ela entra no "Mais" do cabeçalho, que é onde mora o que
 * é do curso mas não é da rotina do dia — e o aviso de que nada aqui é gravado
 * continua na tela, dito ao aluno em vez de escondido dele.
 *
 * **O caminho principal são os momentos de decisão**, e a partida inteira é o
 * link secundário. É a ordem que os números pedem: a Marshall–Tarrasch tem 44
 * lances das pretas e 10 momentos, e cobrar os 44 de memória não é exercício.
 */
export default async function Partidas() {
  const perfil = await perfilAtual();
  const [partidas, cabecalho] = await Promise.all([
    listarPartidas(),
    dadosDoCabecalho(perfil.id),
  ]);

  return (
    <>
      <Cabecalho
        atual="partidas"
        nivel={cabecalho.nivel}
        sequencia={cabecalho.sequencia}
        largura="leitura"
      />
      <Moldura largura="leitura" barraInferior className="gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="titulo text-tinta">Partidas instrutivas</h1>
        <p className="text-xs text-tinta-fraca">
          Teste das fichas-piloto. Nada aqui é gravado.
        </p>
      </header>

      {partidas.length === 0 ? (
        <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
          Nenhum PGN em <code>content/partidas/</code>.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {partidas.map((p) => {
            const momentos = quantosMomentos(p.slug);
            return (
              <li
                key={p.slug}
                className="flex flex-col gap-2 cartao px-3 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-tinta">{p.nome}</span>
                  <span className="text-xs text-tinta-fraca">{p.fonte}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/partidas/${p.slug}/momentos`}
                    className="foco rounded-lg bg-metodo-cheio px-3 py-2 text-xs font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
                  >
                    {momentos} momentos
                  </Link>
                  <Link
                    href={`/partidas/${p.slug}`}
                    className="foco rounded-lg border border-borda px-3 py-2 text-xs font-medium text-tinta-media transition-colors hover:bg-carta-toque"
                  >
                    Partida inteira · {p.lancesNossos} lances de {p.cor}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </Moldura>
    </>
  );
}
