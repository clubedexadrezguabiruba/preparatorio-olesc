import Link from "next/link";
import { GraficoRating } from "@/components/tatica/GraficoRating";
import {
  formatarDelta,
  PROBLEMAS_POR_DIA,
  type EstadoDoRating,
} from "@/lib/tatica/rating";
import type { SerieDoGrafico } from "@/lib/tatica/rating-grafico";

/** Quando jogar — a mesma frase do cartão de `/tatica` (revisão de 15/9, item 7). */
const QUANDO = `Depois da revisão e da série do tema: até ${PROBLEMAS_POR_DIA} problemas por dia.`;

/**
 * A tática rating no painel: o número, o quanto andou desde o começo, a
 * minicurva dos últimos 30 dias e o link para a evolução — ou, para quem nunca
 * jogou, o convite.
 *
 * Fica **depois dos módulos e antes da prova**: é contexto, como o cartão Hoje,
 * e não uma quarta frente do degrau. O que o aluno tem de fazer agora continua
 * sendo o cartão AGORA, e este cartão não disputa com ele — por isso não há
 * botão cheio aqui, só links.
 *
 * A minicurva usa a escala apertada de `GraficoRating` (Doug, 16/9: a linha tem
 * de subir, e não deitar), e com poucos dias de jogo ela é por problema — por
 * isso aparece já no primeiro dia.
 *
 * O `prefetch={false}` do "Jogar" pelo motivo do cartão de `/tatica`: a página
 * do modo grava o problema pendente e a hora em que ele foi servido.
 */
export function RatingDeTatica({
  estado,
  serie,
  inicio,
}: {
  estado: EstadoDoRating | null;
  serie: SerieDoGrafico;
  /** Onde ele começaria, se nunca jogou (`INICIO.rating`). */
  inicio: number;
}) {
  const desdeOComeco = estado
    ? Math.round(estado.rating) - Math.round(estado.ratingInicial)
    : 0;
  return (
    // O título dentro do cartão, como em "Hoje" e em "Suas aulas" de `/finais` (18/9/2026).
    <section
      aria-labelledby="rating-de-tatica"
      className={`flex flex-col gap-3 px-4 py-4 sm:px-5 ${estado ? "cartao" : "cartao-vazio"}`}
    >
      <h2 id="rating-de-tatica" className="text-base font-semibold text-tinta">
        Tática rating
      </h2>

      {estado ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex flex-col">
            <span className="font-serif text-4xl leading-none font-semibold text-tinta tabular-nums">
              {Math.round(estado.rating)}
            </span>
            <span className="mt-1 text-xs text-tinta-fraca tabular-nums">
              <span
                className={
                  desdeOComeco > 0
                    ? "font-semibold text-metodo-tinta"
                    : desdeOComeco < 0
                      ? "font-semibold text-erro-texto"
                      : ""
                }
              >
                {formatarDelta(desdeOComeco)}
              </span>{" "}
              desde o começo · recorde {Math.round(estado.ratingMaximo)}
            </span>
          </div>
          {serie.pontos.length > 1 ? (
            // Largura limitada: esticada pelo cartão, a minicurva deita a subida.
            // No celular, uma linha só dela: espremida ao lado dos links ela tinha ~150 px.
            <div className="max-w-64 min-w-32 flex-1 basis-full sm:basis-0">
              <GraficoRating serie={serie} compacto />
              <p className="text-[11px] text-tinta-fraca">
                {serie.eixo === "dia" ? "últimos 30 dias" : "a cada problema"}
              </p>
            </div>
          ) : (
            <p className="flex-1 text-xs text-tinta-fraca">
              A curva aparece a partir do primeiro problema.
            </p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/tatica/rating/evolucao"
              className="foco font-medium text-metodo-tinta underline"
            >
              Ver evolução
            </Link>
            <Link
              href="/tatica/rating"
              prefetch={false}
              className="foco font-medium text-metodo-tinta underline"
            >
              Jogar
            </Link>
          </div>
          <p className="basis-full text-xs text-tinta-fraca">{QUANDO}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tinta-media">
            Problemas misturados, e um rating que sobe e desce a cada um. Você
            começa em {inicio}. {QUANDO}
          </p>
          <Link
            href="/tatica/rating"
            prefetch={false}
            className="foco text-sm font-medium text-metodo-tinta underline"
          >
            Experimentar
          </Link>
        </div>
      )}
    </section>
  );
}
