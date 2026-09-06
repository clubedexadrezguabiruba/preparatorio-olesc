"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Barra } from "@/components/Barra";
import { META_DO_DIA_MIN, type MinutosDeHoje } from "@/lib/curso/hoje";
import { marcarPartidaDoDia } from "./acoes";

/**
 * O cartão do dia: a rotina de 2 horas, na ordem em que ela acontece.
 *
 * **A ordem é a decisão.** O Doug fixou que a partida vem por último, depois do
 * treino: treina-se primeiro, joga-se para aplicar. Então o cartão lista 1)
 * tática, 2) finais, 3) meio-jogo, 4) partida — e a caixa da partida é o
 * último elemento, embaixo dos minutos, não o primeiro.
 *
 * ## Por que os minutos aparecem
 *
 * Porque a obrigação é de tempo, e obrigação que ninguém mede é intenção. O
 * banco já guardava `tempo_ms` em cada tentativa desde a primeira migration;
 * o que faltava era a soma do dia na frente do aluno. A sequência de dias
 * premia constância — e é por isso que ela usa 60 minutos como mínimo, e não
 * os 120 da meta: um dia curto não pode apagar duas semanas.
 *
 * ## O toque otimista
 *
 * Mesma regra de `Tarefas.tsx`: o aluno marca no celular, no 4G, e sem resposta
 * imediata ele aperta de novo achando que não pegou — e o segundo toque
 * desmarca o que o primeiro marcou.
 */
export function Hoje({
  minutos,
  sequencia,
  revisaoDeTatica,
  revisaoDeFinais,
  partidaFeita,
}: {
  minutos: MinutosDeHoje;
  sequencia: number;
  /** Quantos puzzles estão devidos hoje. */
  revisaoDeTatica: number;
  /** As aulas devidas hoje: nome e para onde ir. A primeira é a que o cartão mostra. */
  revisaoDeFinais: { id: string; nome: string }[];
  partidaFeita: boolean;
}) {
  const [jogou, aplicar] = useOptimistic(partidaFeita, (_atual, novo: boolean) => novo);
  const [, transicao] = useTransition();

  function alternar(marcar: boolean) {
    transicao(async () => {
      aplicar(marcar);
      await marcarPartidaDoDia(marcar);
    });
  }

  const primeiraAula = revisaoDeFinais[0];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="rotulo text-tinta-fraca">Hoje</h2>
        <span className="text-sm text-tinta-media tabular-nums">
          {minutos.total} de {META_DO_DIA_MIN} min
        </span>
      </div>

      <Barra
        feitos={minutos.total}
        de={META_DO_DIA_MIN}
        tom={minutos.total >= META_DO_DIA_MIN ? "completo" : "metodo"}
      />

      <p className="text-xs text-tinta-fraca tabular-nums">
        Tática {minutos.tatica} min · Finais {minutos.finais} min
        {sequencia > 0 ? (
          <>
            {" · "}
            <span className="text-metodo-tinta">
              {sequencia} {sequencia === 1 ? "dia seguido" : "dias seguidos"}
            </span>
          </>
        ) : null}
      </p>

      <ol className="flex flex-col gap-2 border-t border-borda-fraca pt-3">
        <Passo numero={1} titulo="Tática">
          {revisaoDeTatica > 0 ? (
            <Ir href="/tatica/revisao">
              Revisão do dia: {revisaoDeTatica}{" "}
              {revisaoDeTatica === 1 ? "puzzle" : "puzzles"}
            </Ir>
          ) : (
            <span className="text-xs text-tinta-fraca">
              Nada a revisar hoje. Siga na série do seu tema.
            </span>
          )}
        </Passo>

        <Passo numero={2} titulo="Finais">
          {primeiraAula ? (
            <Ir href={`/finais/${primeiraAula.id}?revisao=1`}>
              Revisar: {primeiraAula.nome}
              {revisaoDeFinais.length > 1 ? ` (+${revisaoDeFinais.length - 1})` : ""}
            </Ir>
          ) : (
            <Ir href="/finais">Uma aula nova da trilha</Ir>
          )}
        </Passo>

        <Passo numero={3} titulo="Meio-jogo">
          <Ir href="/meio-jogo">Uma dica e o vídeo dela</Ir>
        </Passo>

        {/* Por último, e é a decisão do Doug: treina-se primeiro, joga-se
            depois, para aplicar o que acabou de treinar. */}
        <Passo numero={4} titulo="Partida">
          <label className="-m-2 flex cursor-pointer items-start gap-2 p-2">
            <input
              type="checkbox"
              className="foco mt-0.5 size-5 shrink-0 accent-metodo-cheio"
              checked={jogou}
              onChange={(e) => alternar(e.target.checked)}
              aria-label="Joguei a partida de hoje"
            />
            <span className={`text-xs ${jogou ? "text-tinta-fraca line-through" : "text-tinta-media"}`}>
              Joguei uma partida de 15+10, anotada, e procurei o lance que a decidiu.
            </span>
          </label>
        </Passo>
      </ol>
    </section>
  );
}

function Passo({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-baseline gap-3">
      <span
        aria-hidden
        className="w-4 shrink-0 text-right text-xs font-semibold text-tinta-fraca tabular-nums"
      >
        {numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-tinta">{titulo}</span>
        {children}
      </div>
    </li>
  );
}

function Ir({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="foco w-fit text-xs font-medium text-metodo-tinta hover:underline">
      {children} →
    </Link>
  );
}
