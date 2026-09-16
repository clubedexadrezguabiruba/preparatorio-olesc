import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { CartaoDoTema } from "@/components/tatica/CartaoDoTema";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { GraficoRating } from "@/components/tatica/GraficoRating";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { METAL, NIVEL, nivelDoAluno, podeAbrir, situacaoDoItem, temaFechado } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { BLOCOS, contaNoCurso } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema, PUZZLES_POR_TEMA, temaZerado } from "@/lib/tatica/progresso";
import { INICIO } from "@/lib/tatica/glicko2";
import { formatarDelta, PROBLEMAS_POR_DIA, type EstadoDoRating } from "@/lib/tatica/rating";
import { serieDoGrafico, type SerieDoGrafico } from "@/lib/tatica/rating-grafico";
import { ratingDoAluno, tentativasDoRating } from "@/lib/tatica/rating-leitura";

export const metadata: Metadata = { title: "Tática — Preparatório OLESC" };

/**
 * ## A pastilha trancada era código morto, e agora diz outra coisa
 *
 * Até 2026-09-09 ela dizia *"Abre no Sábado 2"*, e nunca aparecia: os 36 temas
 * já estavam todos escritos, então `temaAberto()` devolvia `true` para todos e
 * este ramo nunca rodava. Era um portão desenhado numa parede sem porta.
 *
 * Hoje o cartão diz **"Pode adiantar"** (o nível está no cabeçalho do bloco), e o
 * tema **continua clicável**.
 * A trava é mole de propósito (`TRANCA_DURA` em `lib/curso/nivel.ts`): o nível
 * governa o que o site recomenda, não o que ele permite. O tracejado é o que
 * diz "isto é adiantar", e adiantar é do aluno.
 *
 * ## Cartões, e não lista (Doug, 16/9)
 *
 * Os temas de cada bloco são uma grade de cartões (`CartaoDoTema`), cada um com
 * o ícone do tema no quadro do metal do nível — Madeira a Ouro (16/9):
 * uma coluna no celular, duas no tablet, três no notebook — por isso a moldura
 * `larga`. Acima dos blocos, o tema que o aluno deixou pela metade, para ele
 * não ter de procurar entre 36.
 */
export default async function Tatica() {
  const perfil = await perfilAtual();
  const [progresso, conquistado, cabecalho, rating, tentativasNoRating] = await Promise.all([
    progressoPorTema(),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
    ratingDoAluno(perfil.id),
    tentativasDoRating(perfil.id),
  ]);
  const nivel = nivelDoAluno(conquistado);

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  const situacaoDe = (nivelDoBloco: (typeof BLOCOS)[number]["nivel"], tag: string) =>
    situacaoDoItem(nivelDoBloco, nivel, temaAberto(tag));

  // O tema tocado por último que ainda não fechou — o "de onde parou".
  const continuar = BLOCOS.flatMap((bloco) => bloco.temas.map((tema) => ({ bloco, tema, p: progresso.get(tema.tag) })))
    .filter(({ bloco, tema, p }) => p?.ultima && !temaFechado(p.feitos) && podeAbrir(situacaoDe(bloco.nivel, tema.tag)))
    .sort((a, b) => (b.p!.ultima! > a.p!.ultima! ? 1 : -1))[0];

  return (
    <>
      <Cabecalho atual="tatica" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="larga" barraInferior>
        <header className="flex flex-col gap-2">
          <h1 className="titulo text-tinta">Curso de tática</h1>
          <p className="max-w-prose text-sm text-tinta-media">
            Cada tema tem aquecimento, série e prova — {PUZZLES_POR_TEMA} puzzles ao todo. A dificuldade sobe sozinha:
            você não escolhe o nível.
          </p>
          {feitos > 0 ? (
            <p className="text-sm text-tinta-fraca tabular-nums">
              {feitos} {feitos === 1 ? "puzzle resolvido" : "puzzles resolvidos"} nos temas ·{" "}
              {Math.round((100 * certos) / feitos)}% de acerto
            </p>
          ) : null}
        </header>

        <CartaoDoRating
          rating={rating}
          serie={serieDoGrafico(tentativasNoRating, { dias: 30 })}
          inicio={INICIO.rating}
        />

        {continuar ? (
          <section aria-labelledby="continuar" className="flex flex-col gap-3">
            <h2 id="continuar" className="text-base font-semibold text-tinta">
              Continue de onde parou
            </h2>
            <ul>
              <CartaoDoTema
                tema={continuar.tema}
                progresso={continuar.p ?? temaZerado()}
                situacao={situacaoDe(continuar.bloco.nivel, continuar.tema.tag)}
                nivel={continuar.bloco.nivel}
                destaque
              />
            </ul>
          </section>
        ) : null}

        {BLOCOS.map((bloco) => {
          // O tema em teste aparece, mas fica fora do "X de N concluídos".
          const contam = bloco.temas.filter(contaNoCurso);
          const fechados = contam.filter((t) => temaFechado(progresso.get(t.tag)?.feitos)).length;
          return (
            <section key={bloco.id} aria-labelledby={`bloco-${bloco.id}`} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id={`bloco-${bloco.id}`} className="text-base font-semibold text-tinta">
                  <span className="text-tinta-fraca tabular-nums">{bloco.id}.</span> {bloco.nome}
                </h2>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-fraca tabular-nums">
                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${COR_DO_NIVEL[bloco.nivel].pastilha}`}>
                    Nível {bloco.nivel} · {METAL[bloco.nivel]}
                  </span>
                  FIDE {faixaFide(bloco.nivel)} · {fechados} de {contam.length}{" "}
                  {contam.length === 1 ? "concluído" : "concluídos"}
                </span>
              </div>

              {/*
               * Três colunas, salvo quando elas deixariam um cartão sozinho na
               * última linha e duas colunas fecham certo: quatro temas (3 + 1 →
               * 2 + 2) e dez (3 + 3 + 3 + 1 → cinco linhas de 2). Sete fica em três:
               * em duas também sobraria um.
               */}
              <ul className={`grid gap-3 sm:grid-cols-2 ${duasColunas(bloco.temas.length) ? "" : "lg:grid-cols-3"}`}>
                {bloco.temas.map((tema) => (
                  <CartaoDoTema
                    key={tema.tag}
                    tema={tema}
                    progresso={progresso.get(tema.tag) ?? temaZerado()}
                    situacao={situacaoDe(bloco.nivel, tema.tag)}
                    nivel={bloco.nivel}
                  />
                ))}
              </ul>
            </section>
          );
        })}

        <p className="max-w-prose text-xs text-tinta-fraca">
          Os puzzles vêm do banco público do Lichess (CC0), recortados por tema e por faixa de rating. As faixas FIDE são
          aproximadas — <strong>nada aqui é trancado por elas</strong>, e um tema de nível acima continua clicável.
        </p>
      </Moldura>
    </>
  );
}

/**
 * A entrada da tática com rating, no topo da página (decisão do Doug, 15/9).
 *
 * O número em serifa grande, o quanto andou **desde o começo** (com o sinal
 * verdadeiro) e a minicurva dos últimos 30 dias na escala apertada — a linha
 * que sobe (Doug, 16/9).
 *
 * O subtítulo diz **quando** jogar: depois da revisão e da série, até
 * `PROBLEMAS_POR_DIA`. Sem isso o modo mais divertido toma o lugar do que a
 * rotina manda fazer primeiro (revisão de 15/9, item 7).
 *
 * O `prefetch={false}` no "Jogar" não é enfeite: a página do modo **grava** o
 * problema pendente e a hora em que ele foi servido (`garantirPendente`). Um
 * prefetch do Next abriria a página sem o aluno ter clicado, e o tempo gravado
 * daquele problema começaria a contar antes.
 */
function CartaoDoRating({ rating, serie, inicio }: { rating: EstadoDoRating | null; serie: SerieDoGrafico; inicio: number }) {
  const quando = `Depois da revisão e da série do tema: até ${PROBLEMAS_POR_DIA} problemas por dia.`;
  const jogar = (
    <Link
      href="/tatica/rating"
      prefetch={false}
      className="foco inline-flex min-h-11 items-center justify-center rounded-lg bg-metodo-cheio px-6 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
    >
      Jogar
    </Link>
  );

  if (!rating) {
    return (
      <section aria-labelledby="rating-titulo" className="flex flex-wrap items-center justify-between gap-4 cartao-vazio px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 id="rating-titulo" className="text-base font-semibold text-tinta">
            Tática rating
          </h2>
          <p className="max-w-prose text-sm text-tinta-media">
            Problemas misturados, e o rating sobe e desce a cada um. Você começa em {inicio}.
          </p>
          <p className="text-xs text-tinta-fraca">{quando}</p>
        </div>
        {jogar}
      </section>
    );
  }

  const desdeOComeco = Math.round(rating.rating) - Math.round(rating.ratingInicial);
  return (
    <section aria-labelledby="rating-titulo" className="flex flex-col gap-4 cartao px-4 py-5 sm:px-6">
      <div className="grid items-center gap-x-6 gap-y-4 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex flex-col">
          <h2 id="rating-titulo" className="text-sm text-tinta-fraca">
            Tática rating
          </h2>
          <p className="font-serif text-5xl leading-none font-semibold text-tinta tabular-nums">
            {Math.round(rating.rating)}
          </p>
          <p className="mt-1.5 text-sm text-tinta-media tabular-nums">
            <span
              className={`font-semibold ${desdeOComeco > 0 ? "text-metodo-tinta" : desdeOComeco < 0 ? "text-erro-texto" : "text-tinta-media"}`}
            >
              {formatarDelta(desdeOComeco)}
            </span>{" "}
            desde o começo
          </p>
          <p className="text-xs text-tinta-fraca tabular-nums">
            recorde {Math.round(rating.ratingMaximo)} · melhor sequência {rating.melhorSequencia}
          </p>
        </div>

        {serie.pontos.length > 1 ? (
          // Largura limitada: a minicurva esticada pela largura do cartão deitava (6° medidos no celular).
          <div className="flex w-full max-w-72 min-w-0 flex-col gap-1 justify-self-center">
            <GraficoRating serie={serie} compacto altura={88} />
            <p className="text-[11px] text-tinta-fraca">{serie.eixo === "dia" ? "últimos 30 dias" : "a cada problema"}</p>
          </div>
        ) : (
          <p className="text-xs text-tinta-fraca">A curva aparece a partir do primeiro problema.</p>
        )}

        <div className="flex items-center gap-4 sm:flex-col sm:items-stretch sm:gap-2">
          {jogar}
          <Link href="/tatica/rating/evolucao" className="foco text-center text-sm font-medium text-metodo-tinta underline">
            Ver evolução
          </Link>
        </div>
      </div>
      <p className="text-xs text-tinta-fraca">{quando}</p>
    </section>
  );
}

/** "800 a 1000", "1400+" — o rótulo do degrau, sem o `null` do teto na tela. */
/** Duas colunas quando três deixariam um cartão sozinho e duas não deixam. */
function duasColunas(temas: number): boolean {
  return temas % 3 === 1 && temas % 2 === 0;
}

function faixaFide(nivel: 1 | 2 | 3 | 4 | 5): string {
  const [piso, teto] = NIVEL[nivel].fide;
  if (teto === null) return `${piso}+`;
  return piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;
}
