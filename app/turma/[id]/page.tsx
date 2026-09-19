import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar/Avatares";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { GradeDeSelos } from "@/components/selos/ListaDeSelos";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { formatarTempoEstudo, percentualDeAcerto } from "@/lib/turma/atividade";
import { vitrineDoColega } from "@/lib/turma/vitrine";

export const metadata: Metadata = { title: "Companheiro de equipe — Preparatório OLESC" };

/**
 * A vitrine de um colega: identidade pública, atividade resumida e conquistas.
 *
 * **Só isso**, e a lista do que fica de fora — com o porquê de cada item — está em
 * `lib/turma/turma.ts`. A leitura é de `lib/turma/vitrine.ts`, a única porta de um aluno para
 * outro: a RLS continua fechada, e o servidor escolhe as colunas.
 *
 * - O próprio aluno vai para "Meu perfil" (a vitrine de si mesmo seria uma versão pior dela).
 * - Conta que não existe, conta de professor e conta de ensaio (vista por aluno) são 404 — a
 *   mesma resposta para as três, para a página não servir de sonda de quem existe.
 * - O histórico detalhado continua privado. Só saem os totais pedidos para a turma.
 */
export default async function VitrineDoColega({ params }: PageProps<"/turma/[id]">) {
  const perfil = await perfilAtual();
  const { id } = await params;
  if (id === perfil.id) redirect("/perfil");

  const [cabecalho, vitrine] = await Promise.all([dadosDoCabecalho(perfil.id), vitrineDoColega(perfil, id)]);
  if (!vitrine) notFound();

  const primeiroNome = vitrine.nome.split(/\s+/)[0];
  const acerto = percentualDeAcerto(vitrine.atividade);

  return (
    <>
      <Cabecalho atual="turma" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="painel" barraInferior className="gap-7">
        <nav aria-label="Voltar">
          <Link
            href="/turma"
            className="foco -mx-2 -my-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-metodo-tinta hover:underline"
          >
            ← Equipe
          </Link>
        </nav>

        <header className="flex items-center gap-4 border-b border-borda-fraca pb-6 sm:gap-6">
          <Avatar id={vitrine.avatar} tamanho={96} className="sm:size-28" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <span className="rotulo text-metodo-tinta">Perfil da equipe</span>
            <h1 className="titulo break-words text-tinta">{vitrine.nome}</h1>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR_DO_NIVEL[vitrine.nivel].pastilha}`}
            >
              Nível {vitrine.nivel} · {vitrine.metal}
            </span>
          </div>
        </header>

        <section aria-labelledby="atividade" className="flex flex-col gap-3">
          <h2 id="atividade" className="rotulo text-tinta-fraca">Atividade</h2>
          <div className="cartao overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-borda-fraca border-b border-borda-fraca sm:grid-cols-4">
              <Resumo valor={formatarTempoEstudo(vitrine.atividade.tempoMs)} rotulo="tempo de estudo" destaque />
              <Resumo valor={vitrine.atividade.ratingTatica === null ? "—" : Math.round(vitrine.atividade.ratingTatica)} rotulo="rating de tática" />
              <Resumo valor={vitrine.atividade.puzzlesFeitos} rotulo="puzzles feitos" />
              <Resumo valor={acerto === null ? "—" : `${acerto}%`} rotulo="acerto nos puzzles" />
            </div>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-medium text-tinta">Linhas de abertura</p>
                <p className="mt-0.5 text-xs text-tinta-fraca">Progresso real no treinador de lances</p>
              </div>
              <dl className="grid grid-cols-2 gap-6">
                <Progresso valor={vitrine.atividade.linhasEstudadas} rotulo="estudadas" />
                <Progresso valor={vitrine.atividade.linhasDominadas} rotulo="dominadas" destaque />
              </dl>
            </div>
          </div>
          <p className="px-1 text-xs text-tinta-fraca tabular-nums">
            Puzzles: {vitrine.atividade.puzzlesCertos} certos · {vitrine.atividade.puzzlesErrados} errados
          </p>
        </section>

        <section aria-labelledby="conquistas" className="flex flex-col gap-4">
          <h2 id="conquistas" className="rotulo text-tinta-fraca">
            Conquistas
          </h2>
          {vitrine.selos.length === 0 ? (
            <p className="cartao-vazio px-4 py-5 text-sm text-tinta-fraca">
              {primeiroNome} ainda não ganhou selos. Eles aparecem aqui conforme o treino anda.
            </p>
          ) : (
            <GradeDeSelos selos={vitrine.selos} rotulo={`Selos de ${vitrine.nome}`} />
          )}
        </section>

        {perfil.papel === "professor" ? (
          <p className="border-t border-borda-fraca pt-4 text-sm">
            <Link href={`/professor/${vitrine.id}`} className="foco font-medium text-metodo-tinta hover:underline">
              Abrir o relatório completo →
            </Link>
          </p>
        ) : null}
      </Moldura>
    </>
  );
}

function Resumo({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: React.ReactNode;
  rotulo: string;
  destaque?: boolean;
}) {
  return (
    <div className={`min-w-0 px-4 py-4 ${destaque ? "bg-metodo-superficie/10" : ""}`}>
      <strong className={`block text-xl tabular-nums ${destaque ? "text-metodo-tinta" : "text-tinta"}`}>{valor}</strong>
      <span className="mt-0.5 block text-xs text-tinta-fraca">{rotulo}</span>
    </div>
  );
}

function Progresso({ valor, rotulo, destaque = false }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className="min-w-20 text-right">
      <dt className="text-xs text-tinta-fraca">{rotulo}</dt>
      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${destaque ? "text-metodo-tinta" : "text-tinta"}`}>{valor}</dd>
    </div>
  );
}
