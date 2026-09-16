import Link from "next/link";
import { AnelDeProgresso } from "@/components/AnelDeProgresso";
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
 *
 * ## Cartões, e não listas (Doug, 16/9)
 *
 * O topo é o rating com a curva inteira embaixo — é a coisa que o aluno veio
 * ver. O "desde o começo" e o "7 dias" levam o **sinal verdadeiro**: quem caiu
 * lê a queda. Os temas fracos são cartões com o anel do acerto, e as últimas
 * tentativas, ladrilhos: certo ou errado e quanto andou, de relance.
 */
export function EvolucaoDoRating({ evolucao, paraOAluno }: { evolucao: EvolucaoDoAluno; paraOAluno: boolean }) {
  const { estado, serie, semana, resumo, fracos, ultimas } = evolucao;
  const desdeOComeco = Math.round(estado.rating) - Math.round(estado.ratingInicial);

  return (
    <div className="flex flex-col gap-6">
      {/* No notebook, o número e os quatro cartões à esquerda e a curva à direita:
          a curva com a largura da página inteira deitava a subida (13° medidos). */}
      <section
        aria-labelledby="evolucao-rating"
        className="grid gap-x-8 gap-y-5 cartao px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h3 id="evolucao-rating" className="text-sm text-tinta-fraca">
              Rating agora
            </h3>
            <p className="font-serif text-6xl leading-none font-semibold text-tinta tabular-nums">
              {Math.round(estado.rating)}
            </p>
          </div>
          <dl className="flex flex-wrap gap-2 tabular-nums">
            <Variacao rotulo="desde o começo" valor={desdeOComeco} />
            {semana === null ? null : <Variacao rotulo="nos últimos 7 dias" valor={semana} />}
          </dl>
        </div>

        <div className="min-w-0 lg:row-span-2">
          {serie.pontos.length === 0 ? (
            <p className="text-sm text-tinta-fraca">O gráfico aparece depois do primeiro problema.</p>
          ) : (
            <GraficoRating serie={serie} inicio={estado.ratingInicial} />
          )}
        </div>

        <dl className="grid grid-cols-2 gap-2 self-start sm:grid-cols-4 lg:grid-cols-2">
          <Numero rotulo="Recorde" valor={Math.round(estado.ratingMaximo)} />
          <Numero rotulo="Resolvidos" valor={resumo.resolvidos} />
          <Numero rotulo="Acerto" valor={resumo.acerto === null ? "—" : `${resumo.acerto}%`} />
          <Numero rotulo="Melhor sequência" valor={estado.melhorSequencia} />
        </dl>
      </section>

      <section aria-labelledby="temas-fracos" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 id="temas-fracos" className="text-base font-semibold text-tinta">
            Temas fracos
          </h3>
          <p className="text-xs text-tinta-fraca">
            {fracos.length === 0
              ? `Nenhum tema ainda com ${MINIMO_POR_TEMA} problemas neste modo. Com menos que isso, um erro é sorte, e não fraqueza.`
              : `Os de pior acerto no modo rating, entre os temas com ${MINIMO_POR_TEMA} problemas ou mais.`}
          </p>
        </div>
        {fracos.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {fracos.map((t) => {
              const nome = temaPorTag(t.tag)?.nome ?? t.tag;
              const miolo = (
                <>
                  <AnelDeProgresso feitos={t.acertos} de={t.tentativas} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-tinta">{nome}</span>
                    <span className="text-xs text-tinta-fraca tabular-nums">
                      {t.acertos} de {t.tentativas} certos
                    </span>
                    {paraOAluno ? <span className="text-xs font-medium text-metodo-tinta">Treinar a série</span> : null}
                  </span>
                </>
              );
              return (
                <li key={t.tag}>
                  {paraOAluno ? (
                    <Link href={`/tatica/${t.tag}`} className="foco flex h-full items-center gap-3 cartao-alvo px-4 py-3">
                      {miolo}
                    </Link>
                  ) : (
                    <div className="flex h-full items-center gap-3 cartao px-4 py-3">{miolo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="ultimas-tentativas" className="flex flex-col gap-3">
        <h3 id="ultimas-tentativas" className="text-base font-semibold text-tinta">
          Últimas tentativas
        </h3>
        {ultimas.length === 0 ? (
          <p className="text-sm text-tinta-fraca">Nenhuma ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {ultimas.map((t) => {
              const delta = Math.round(t.rating_depois) - Math.round(t.rating_antes);
              const dia = hojeNoBrasil(new Date(t.criada_em));
              const nome = t.origem === ORIGEM_BASE ? NOME_DA_BASE : (temaPorTag(t.origem)?.nome ?? t.origem);
              return (
                <li
                  key={`${t.puzzle_id}-${t.criada_em}`}
                  className="flex flex-col gap-1 cartao px-3 py-2.5"
                >
                  <span className="flex items-baseline justify-between gap-2 tabular-nums">
                    <span className={`text-xs font-medium ${t.acertou ? "text-metodo-tinta" : "text-erro-texto"}`}>
                      {t.acertou ? "✓ Certo" : "✗ Errado"}
                    </span>
                    <span
                      className={`text-lg font-semibold ${delta > 0 ? "text-metodo-tinta-alta" : delta < 0 ? "text-erro-texto" : "text-tinta"}`}
                    >
                      {formatarDelta(delta)}
                    </span>
                  </span>
                  <span className="truncate text-sm text-tinta" title={nome}>
                    {nome}
                  </span>
                  <span className="text-xs text-tinta-fraca">{porExtenso(dia)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** "+84 desde o começo" — com o sinal que o número tem, e o sinal também no texto. */
function Variacao({ rotulo, valor }: { rotulo: string; valor: number }) {
  const tom = valor > 0 ? "border-metodo-superficie text-metodo-tinta-alta" : valor < 0 ? "border-erro text-erro-texto" : "border-borda text-tinta-media";
  return (
    // `dt` antes de `dd` no HTML (a regra do `<dl>`), número antes do rótulo na tela.
    <div className={`flex flex-row-reverse items-baseline justify-end gap-1.5 rounded-full border px-3 py-1 ${tom}`}>
      <dt className="text-xs text-tinta-media">{rotulo}</dt>
      <dd className="text-sm font-semibold">{formatarDelta(valor)}</dd>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    // Dentro do cartão do rating: um degrau de superfície acima, e não um cartão dentro de cartão.
    <div className="flex flex-col gap-0.5 rounded-lg bg-carta-alta px-3 py-2">
      <dt className="text-xs text-tinta-fraca">{rotulo}</dt>
      <dd className="text-xl font-semibold text-tinta tabular-nums">{valor}</dd>
    </div>
  );
}
