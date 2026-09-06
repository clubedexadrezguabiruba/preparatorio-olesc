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
import { lerIndice } from "@/lib/repertorio/banco";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { aprendidasDaAbertura, aRevisarNaAbertura } from "@/lib/repertorio/treino";
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

  const [progresso, marcadas, indice, repertorio] = await Promise.all([
    progressoPorTema(),
    tarefasMarcadas(),
    lerIndice(),
    progressoDoRepertorio(),
  ]);
  const estados = estadoDasTarefas(tarefasDaSemana, marcadas, progresso);

  const aberturas = indice.length;
  const linhasDoRepertorio = indice.reduce((soma, e) => soma + e.linhas, 0);
  const linhasAprendidas = indice.reduce(
    (soma, e) => soma + aprendidasDaAbertura(repertorio, e.cor, e.abertura),
    0,
  );
  const agoraNoRepertorio = new Date().toISOString();
  const linhasARevisar = indice.reduce(
    (soma, e) => soma + aRevisarNaAbertura(repertorio, e.cor, e.abertura, agoraNoRepertorio),
    0,
  );

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

      {/* ----------------------------------------------------------------- *
       * O repertório
       *
       * Irmã da seção de tática, e com a mesma forma — mas a barra mede outra
       * coisa: aqui conta **linha aprendida**, três degraus da escada de
       * revisão, e não linha tentada. Na tática um puzzle tentado é um puzzle
       * pensado; aqui o exercício é decorar, e "abri a linha" não quer dizer
       * nada.
       *
       * O que a barra **não** mostra é o trabalho do dia: com repetição
       * espaçada, um repertório inteiro aprendido ainda tem linhas vencendo.
       * Por isso a contagem de "a revisar hoje" vai ao lado, e é ela que muda
       * de cor — é a única parte desta seção que pede uma ação agora.
       * ----------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="rotulo text-tinta-fraca">Repertório do clube</h2>
          <Link
            href="/aberturas"
            className="foco text-sm font-medium text-metodo-tinta hover:underline"
          >
            Treinar →
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-sm font-medium text-tinta">
              {aberturas} aberturas, de brancas e de pretas
            </p>
            {linhasARevisar > 0 ? (
              <p className="text-xs font-semibold text-aviso-tinta tabular-nums">
                {linhasARevisar} {linhasARevisar === 1 ? "linha" : "linhas"} a revisar hoje
              </p>
            ) : null}
            <Barra
              feitos={linhasAprendidas}
              de={linhasDoRepertorio}
              tom={linhasAprendidas >= linhasDoRepertorio ? "completo" : "metodo"}
            />
          </div>
          <span className="w-28 shrink-0 text-right text-xs text-tinta-fraca tabular-nums">
            {linhasAprendidas}/{linhasDoRepertorio} aprendidas
          </span>
        </div>
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
