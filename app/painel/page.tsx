import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/acoes";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import {
  fimDaSemana,
  intervaloPorExtenso,
  porExtenso,
  sabadoDaSemana,
  semanaAtual,
} from "@/lib/curso/calendario";
import { TAREFAS } from "@/lib/tarefas/conteudo";
import { estadoDasTarefas } from "@/lib/tarefas/estado";
import { tarefasMarcadas } from "@/lib/tarefas/progresso";
import { daSemana } from "@/lib/tarefas/tarefas";
import { BLOCOS } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema, PUZZLES_POR_TEMA, temaZerado } from "@/lib/tatica/progresso";
import { etapaAtual, METAS, NOME_DA_ETAPA } from "@/lib/tatica/serie";
import { Tarefas } from "./Tarefas";

export const metadata: Metadata = { title: "Painel — Preparatório OLESC" };

const EQUIPE = { M: "Equipe masculina", F: "Equipe feminina" } as const;

/**
 * O painel do aluno: a semana em que ele está, o que falta fazer nela, e onde
 * ele parou em cada tema.
 *
 * **As três consultas do painel são as mesmas de outras telas, e de propósito.**
 * O progresso vem de `progressoPorTema`, que a lista de tática e (na B1.3) o
 * relatório também usam; as tarefas feitas vêm de `tarefasMarcadas`; e a conta
 * de "está feita?" é `estadoDasTarefas`, função pura com teste. Nada aqui soma
 * nada por conta própria — é o que impede o painel de dizer 5 e o relatório
 * dizer 4 com o aluno na frente.
 */
export default async function Painel() {
  const perfil = await perfilAtual();

  const semana = semanaAtual();
  const sabado = sabadoDaSemana(semana);
  const tarefasDaSemana = daSemana(TAREFAS, semana);

  const [progresso, marcadas] = await Promise.all([progressoPorTema(), tarefasMarcadas()]);
  const estados = estadoDasTarefas(tarefasDaSemana, marcadas, progresso);

  const abertos = BLOCOS.map((bloco) => ({
    ...bloco,
    temas: bloco.temas.filter((t) => temaAberto(t.tag)),
  })).filter((bloco) => bloco.temas.length > 0);

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="rotulo text-metodo-tinta">Preparatório OLESC 2026</p>
          <h1 className="titulo text-tinta">{perfil.nome}</h1>
          <p className="text-sm text-tinta-fraca">
            {perfil.equipe ? EQUIPE[perfil.equipe] : "Professor"}
            {perfil.tabuleiro ? ` · tabuleiro ${perfil.tabuleiro}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {perfil.papel === "professor" ? (
            <Link
              href="/professor"
              className="foco rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-tinta-media hover:bg-carta-toque"
            >
              Área do professor
            </Link>
          ) : null}
          <form action={sair}>
            <button
              type="submit"
              className="foco rounded-lg px-2 py-1.5 text-sm text-tinta-fraca hover:text-tinta"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className="flex gap-3">
        <Numero rotulo="Puzzles resolvidos" valor={feitos} />
        <Numero
          rotulo="Acerto"
          valor={feitos ? `${Math.round((100 * certos) / feitos)}%` : "—"}
        />
      </section>

      {/* ----------------------------------------------------------------- *
       * A semana
       * ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="rotulo text-tinta-fraca">
            Semana {semana} · {intervaloPorExtenso(sabado.data, fimDaSemana(semana))}
          </h2>
          <p className="text-sm text-tinta-media">
            Sábado {semana}, {porExtenso(sabado.data)}: {sabado.titulo}.
          </p>
        </div>

        {estados.length > 0 ? (
          <Tarefas estados={estados} />
        ) : (
          <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
            As tarefas desta semana saem no Sábado {semana}. Até lá, siga na tática.
          </p>
        )}
      </section>

      {/* ----------------------------------------------------------------- *
       * O progresso por tema
       * ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="rotulo text-tinta-fraca">Curso de tática</h2>
          <Link
            href="/tatica"
            className="foco text-sm font-medium text-metodo-tinta hover:underline"
          >
            Ver todos os temas →
          </Link>
        </div>

        {abertos.map((bloco) => (
          <div key={bloco.id} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-tinta">
              <span className="text-tinta-muda tabular-nums">{bloco.id}.</span> {bloco.nome}
            </p>
            <ul className="flex flex-col gap-2">
              {bloco.temas.map((tema) => {
                const p = progresso.get(tema.tag) ?? temaZerado();
                const etapa = etapaAtual(p.feitos);
                return (
                  <li key={tema.tag}>
                    <Link
                      href={`/tatica/${tema.tag}`}
                      className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="truncate text-sm font-medium text-tinta">{tema.nome}</p>
                        <Barra
                          feitos={p.tentativas}
                          de={PUZZLES_POR_TEMA}
                          tom={etapa ? "metodo" : "completo"}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-xs text-tinta-fraca tabular-nums">
                        {etapa
                          ? `${NOME_DA_ETAPA[etapa]} ${p.feitos[etapa]}/${METAS[etapa]}`
                          : "Concluído"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
          Dentro de cada tema os puzzles vêm em ordem de dificuldade: começam fáceis e vão
          subindo. Os blocos seguintes abrem nos próximos sábados.
        </p>
      </section>
    </main>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
      <span className="text-2xl font-semibold text-tinta tabular-nums">{valor}</span>
      <span className="text-xs text-tinta-fraca">{rotulo}</span>
    </div>
  );
}
