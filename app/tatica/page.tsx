import type { Metadata } from "next";
import Link from "next/link";
import { perfilAtual } from "@/lib/auth/perfil";
import { BLOCOS } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema, PUZZLES_POR_TEMA, temaZerado } from "@/lib/tatica/progresso";

export const metadata: Metadata = { title: "Tática — Preparatório OLESC" };

const DATA_DO_SABADO: Record<1 | 2 | 3, string> = {
  1: "12 de setembro",
  2: "19 de setembro",
  3: "26 de setembro",
};

export default async function Tatica() {
  await perfilAtual();
  const progresso = await progressoPorTema();

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Curso de tática</h1>
        <p className="text-sm text-tinta-media">
          Cada tema tem aquecimento, série e prova — {PUZZLES_POR_TEMA} puzzles ao todo. A
          dificuldade sobe sozinha: você não escolhe o nível.
        </p>
        {feitos > 0 ? (
          <p className="text-sm text-tinta-fraca tabular-nums">
            {feitos} {feitos === 1 ? "puzzle resolvido" : "puzzles resolvidos"} ·{" "}
            {Math.round((100 * certos) / feitos)}% de acerto
          </p>
        ) : null}
      </header>

      {BLOCOS.map((bloco) => (
        <section key={bloco.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold text-tinta">
              <span className="text-tinta-muda tabular-nums">{bloco.id}.</span> {bloco.nome}
            </h2>
            <span className="text-xs text-tinta-fraca tabular-nums">
              rating {bloco.faixa[0]}–{bloco.faixa[1]}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {bloco.temas.map((tema) => {
              const p = progresso.get(tema.tag) ?? temaZerado();
              const aberto = temaAberto(tema.tag);

              if (!aberto) {
                return (
                  <li
                    key={tema.tag}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-borda bg-carta/50 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tinta-fraca">{tema.nome}</p>
                      <p className="text-xs text-tinta-muda">
                        Abre no Sábado {bloco.sabado}, {DATA_DO_SABADO[bloco.sabado]}.
                      </p>
                    </div>
                  </li>
                );
              }

              return (
                <li key={tema.tag}>
                  <Link
                    href={`/tatica/${tema.tag}`}
                    className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-sm font-medium text-tinta">{tema.nome}</p>
                      <p className="text-xs text-tinta-fraca">{tema.resumo}</p>
                      <Barra feitos={p.tentativas} />
                    </div>
                    <div className="flex w-16 shrink-0 flex-col items-end">
                      <span className="text-sm font-semibold text-tinta tabular-nums">
                        {Math.min(p.tentativas, PUZZLES_POR_TEMA)}
                        <span className="text-tinta-muda">/{PUZZLES_POR_TEMA}</span>
                      </span>
                      {p.tentativas > 0 ? (
                        <span className="text-xs text-tinta-fraca tabular-nums">
                          {Math.round((100 * p.certos) / p.tentativas)}%
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-tinta-muda">
        Os puzzles vêm do banco público do Lichess (CC0), recortados por tema e por faixa de
        rating.
      </p>
    </main>
  );
}

function Barra({ feitos }: { feitos: number }) {
  const parte = Math.min(1, feitos / PUZZLES_POR_TEMA);
  return (
    <div
      className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-carta-alta"
      /* A barra é decoração: o número ao lado dela já diz a mesma coisa em
         texto, e um leitor de tela que lesse os dois diria tudo duas vezes. */
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-metodo-superficie transition-[width]"
        style={{ width: `${parte * 100}%` }}
      />
    </div>
  );
}
