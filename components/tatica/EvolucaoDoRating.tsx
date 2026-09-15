import Link from "next/link";
import { hojeNoBrasil, porExtenso } from "@/lib/curso/calendario";
import { temaPorTag } from "@/lib/tatica/blocos";
import { formatarDelta, NOME_DA_BASE, ORIGEM_BASE } from "@/lib/tatica/rating";
import { MINIMO_POR_TEMA } from "@/lib/tatica/rating-historico";
import type { EvolucaoDoAluno } from "@/lib/tatica/rating-leitura";
import { GraficoRating } from "./GraficoRating";

/**
 * O corpo da evolução do rating de tática — o mesmo na tela do aluno
 * (`/tatica/rating/evolucao`) e no relatório do professor
 * (`/professor/[aluno]`). Um componente só é o que impede as duas telas de
 * dizerem números diferentes sobre o mesmo aluno na frente dele.
 *
 * `paraOAluno` liga o que só faz sentido para quem joga: os temas fracos viram
 * link para a série do tema.
 */
export function EvolucaoDoRating({ evolucao, paraOAluno }: { evolucao: EvolucaoDoAluno; paraOAluno: boolean }) {
  const { estado, pontos, resumo, fracos, ultimas } = evolucao;
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Rating" valor={Math.round(estado.rating)} destaque />
        <Numero rotulo="Máximo" valor={Math.round(estado.ratingMaximo)} />
        <Numero rotulo="Resolvidos" valor={resumo.resolvidos} />
        <Numero rotulo="Acerto" valor={resumo.acerto === null ? "—" : `${resumo.acerto}%`} />
      </dl>

      <section className="flex flex-col gap-2 cartao px-4 py-4">
        <h3 className="text-sm font-semibold text-tinta">Evolução</h3>
        {pontos.length === 0 ? (
          <p className="text-sm text-tinta-fraca">O gráfico aparece depois do primeiro problema.</p>
        ) : (
          <GraficoRating pontos={pontos} />
        )}
      </section>

      <section className="flex flex-col gap-2 cartao px-4 py-4">
        <h3 className="text-sm font-semibold text-tinta">Temas fracos</h3>
        {fracos.length === 0 ? (
          <p className="text-sm text-tinta-fraca">
            Nenhum tema ainda com {MINIMO_POR_TEMA} problemas neste modo. Com menos que isso, um erro é sorte, e
            não fraqueza.
          </p>
        ) : (
          <>
            <p className="text-xs text-tinta-fraca">
              Os de pior acerto no modo rating, entre os temas com {MINIMO_POR_TEMA} problemas ou mais.
            </p>
            <ul className="flex flex-col gap-1.5">
              {fracos.map((t) => {
                const nome = temaPorTag(t.tag)?.nome ?? t.tag;
                return (
                  <li key={t.tag} className="flex items-baseline justify-between gap-3 text-sm">
                    {paraOAluno ? (
                      <Link href={`/tatica/${t.tag}`} className="foco font-medium text-metodo-tinta underline">
                        {nome}
                      </Link>
                    ) : (
                      <span className="font-medium text-tinta">{nome}</span>
                    )}
                    <span className="text-tinta-media tabular-nums">
                      {t.acertos} de {t.tentativas} · {t.acerto}%
                    </span>
                  </li>
                );
              })}
            </ul>
            {paraOAluno ? <p className="text-xs text-tinta-fraca">Toque num tema para treinar a série dele.</p> : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 cartao px-4 py-4">
        <h3 className="text-sm font-semibold text-tinta">Últimas tentativas</h3>
        {ultimas.length === 0 ? (
          <p className="text-sm text-tinta-fraca">Nenhuma ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-borda-fraca">
            {ultimas.map((t) => {
              const delta = Math.round(t.rating_depois) - Math.round(t.rating_antes);
              const dia = hojeNoBrasil(new Date(t.criada_em));
              return (
                <li key={`${t.puzzle_id}-${t.criada_em}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-tinta">
                      {t.origem === ORIGEM_BASE ? NOME_DA_BASE : (temaPorTag(t.origem)?.nome ?? t.origem)}
                    </span>
                    <span className="text-xs text-tinta-fraca">{porExtenso(dia)}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
                    <span className={t.acertou ? "text-tinta-media" : "text-erro-texto"}>
                      {t.acertou ? "✓ Certo" : "✗ Errado"}
                    </span>
                    <span className="w-12 text-right font-semibold text-tinta">
                      {formatarDelta(delta)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Numero({ rotulo, valor, destaque = false }: { rotulo: string; valor: number | string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 cartao px-3 py-2.5">
      <dt className="text-xs text-tinta-fraca">{rotulo}</dt>
      <dd className={`font-semibold text-tinta tabular-nums ${destaque ? "text-3xl" : "text-xl"}`}>{valor}</dd>
    </div>
  );
}
