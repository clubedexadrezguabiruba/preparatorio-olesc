import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar/Avatares";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { formatarTempoEstudo, percentualDeAcerto } from "@/lib/turma/atividade";
import type { ColegaNaTurma } from "@/lib/turma/turma";
import { turmaVisivel } from "@/lib/turma/vitrine";

export const metadata: Metadata = { title: "Equipe — Preparatório OLESC" };

/**
 * A atividade da turma (Doug, 19/9/2026), sem pontos nem posição inventada. A lista é ordenada
 * pelo tempo realmente medido; o aluno só enxerga a própria turma e o professor vê os grupos.
 *
 * O próprio aluno aparece marcado "você" e leva a "Meu perfil".
 *
 * A conta de ensaio (`alunoteste`) não aparece para os alunos e aparece para o professor; a
 * regra e o porquê estão em `lib/turma/turma.ts`.
 *
 * **Duas turmas (18/9/2026)**: OLESC e testadores. O aluno vê só a dele, sem título — para ele
 * a outra não existe. O professor vê as duas, cada uma com o nome em cima.
 */
export default async function Turma() {
  const perfil = await perfilAtual();
  const [cabecalho, turma] = await Promise.all([dadosDoCabecalho(perfil.id), turmaVisivel(perfil)]);
  const professor = perfil.papel === "professor";

  return (
    <>
      <Cabecalho atual="turma" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="larga" />
      <Moldura largura="larga" barraInferior className="gap-7">
        <header className="flex flex-col gap-3 border-b border-borda-fraca pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="rotulo mb-1 text-metodo-tinta">Atividade da equipe</p>
              <h1 className="titulo text-tinta">Equipe</h1>
            </div>
            <span className="rounded-full border border-borda-fraca bg-carta px-3 py-1 text-xs text-tinta-fraca">
              Ordenada por tempo de estudo
            </span>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-tinta-media">Seus companheiros de equipe!</p>
        </header>

        {turma.length === 0 ? (
          <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">Nenhum aluno cadastrado ainda.</p>
        ) : (
          turma.map((grupo) => (
            <section key={grupo.turma} aria-label={professor ? grupo.nome : undefined} className="flex flex-col gap-3">
              {/* O nome da turma só para o professor: o aluno vê uma só, e não precisa saber da outra. */}
              {professor ? <h2 className="rotulo text-tinta-fraca">{grupo.nome}</h2> : null}
              <Lista colegas={grupo.colegas} />
            </section>
          ))
        )}
      </Moldura>
    </>
  );
}

function Lista({ colegas }: { colegas: readonly ColegaNaTurma[] }) {
  return (
    <div className="cartao overflow-hidden">
      <div className="hidden grid-cols-[minmax(13rem,2fr)_repeat(5,minmax(6rem,1fr))] gap-4 border-b border-borda-fraca bg-carta-alta/35 px-5 py-3 text-[11px] font-semibold tracking-wide text-tinta-fraca uppercase md:grid">
        <span>Aluno</span>
        <span>Estudo</span>
        <span>Rating</span>
        <span>Puzzles</span>
        <span>Acerto</span>
        <span>Linhas</span>
      </div>
      <ul className="min-w-0 divide-y divide-borda-fraca">
        {colegas.map((colega) => {
          const acerto = percentualDeAcerto(colega.atividade);
          return <li key={colega.id}>
          <Link
            href={colega.ehVoce ? "/perfil" : `/turma/${colega.id}`}
            aria-label={colega.ehVoce ? `${colega.nome} (você): Meu perfil` : colega.nome}
            className={`foco relative grid gap-4 px-4 py-4 transition-colors hover:bg-carta-toque sm:px-5 md:grid-cols-[minmax(13rem,2fr)_repeat(5,minmax(6rem,1fr))] md:items-center ${colega.ehVoce ? "bg-metodo-superficie/10 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-metodo-cheio" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Avatar id={colega.avatar} tamanho={48} decorativo />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-tinta">{colega.nome}</span>
                <span className="mt-0.5 block text-xs text-tinta-fraca md:hidden">
                  {colega.ehVoce ? <span className="font-medium text-metodo-tinta">Você · </span> : null}
                  ver atividade
                </span>
                {colega.ehVoce ? <span className="hidden text-xs font-medium text-metodo-tinta md:block">você</span> : null}
              </span>
              <span aria-hidden className="text-tinta-fraca md:hidden">→</span>
            </span>
            <span className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-borda-fraca pt-3 md:contents md:border-0 md:pt-0">
              <Metrica valor={formatarTempoEstudo(colega.atividade.tempoMs)} rotulo="Estudo" destaque />
              <Metrica valor={colega.atividade.ratingTatica === null ? "—" : Math.round(colega.atividade.ratingTatica)} rotulo="Rating tática" />
              <Metrica valor={colega.atividade.puzzlesFeitos} rotulo="Puzzles" />
              <Metrica valor={acerto === null ? "—" : `${acerto}%`} rotulo="Acerto" detalhe={acerto === null ? undefined : `${colega.atividade.puzzlesCertos} certos · ${colega.atividade.puzzlesErrados} errados`} />
              <Metrica valor={`${colega.atividade.linhasEstudadas} / ${colega.atividade.linhasDominadas}`} rotulo="Linhas" detalhe="estudadas / dominadas" largo />
            </span>
          </Link>
        </li>;
        })}
      </ul>
    </div>
  );
}

function Metrica({
  valor,
  rotulo,
  detalhe,
  destaque = false,
  largo = false,
}: {
  valor: React.ReactNode;
  rotulo: string;
  detalhe?: string;
  destaque?: boolean;
  largo?: boolean;
}) {
  return (
    <span className={`${largo ? "col-span-2" : ""} flex min-w-0 flex-col gap-0.5 md:col-span-1`}>
      <span className="text-[11px] font-medium text-tinta-fraca md:hidden">{rotulo}</span>
      <span className={`text-sm font-semibold tabular-nums ${destaque ? "text-metodo-tinta" : "text-tinta"}`}>{valor}</span>
      {detalhe ? <span className="text-[11px] leading-tight text-tinta-fraca">{detalhe}</span> : null}
    </span>
  );
}
