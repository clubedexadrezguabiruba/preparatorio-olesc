import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { CartaoDoTema } from "@/components/tatica/CartaoDoTema";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import { GraficoRating } from "@/components/tatica/GraficoRating";
import { perfilAtual } from "@/lib/auth/perfil";
import { grausDosTemas } from "@/lib/progresso/tatica-banco";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { META_DA_OLESC, METAL, NIVEIS, NIVEL, nivelDoAluno, temaFechado } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { BLOCOS, contaNoCurso } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { estadoDosTemas } from "@/lib/tatica/ordem";
import { progressoPorTema, temaZerado } from "@/lib/tatica/progresso";
import { INICIO } from "@/lib/tatica/glicko2";
import { formatarDelta, PROBLEMAS_POR_DIA, type EstadoDoRating } from "@/lib/tatica/rating";
import { serieDoGrafico, type SerieDoGrafico } from "@/lib/tatica/rating-grafico";
import { ratingDoAluno, tentativasDoRating } from "@/lib/tatica/rating-leitura";

export const metadata: Metadata = { title: "Tática — Preparatório OLESC" };

/**
 * ## Os temas abrem em ordem (Doug, 18/9/2026)
 *
 * Como as aulas de abertura: fechar um tema abre o próximo (`lib/tatica/ordem.ts`).
 * O nível não tranca a tática — a corrente vai até o último tema. O trancado é
 * tracejado, com cadeado e sem link; a URL dele redireciona para cá.
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
  const [progresso, conquistado, cabecalho, rating, tentativasNoRating, graus] = await Promise.all([
    progressoPorTema(),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
    ratingDoAluno(perfil.id),
    tentativasDoRating(perfil.id),
    // O grau de cada tema (17/9/2026), em todos os modos — ver `lib/progresso/grau.ts`.
    grausDosTemas(perfil.id),
  ]);
  const nivel = nivelDoAluno(conquistado);

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  // A corrente (18/9/2026): fechar um tema abre o próximo. Tema fora dela — em teste — fica aberto.
  const corrente = estadoDosTemas(
    new Map([...progresso].map(([tag, p]) => [tag, p.feitos])),
    perfil.papel === "professor",
  );
  const estadoDe = (tag: string) => (temaAberto(tag) ? (corrente.get(tag) ?? "aberto") : "em-escrita");

  // O tema tocado por último que ainda não fechou — o "de onde parou".
  const continuar = BLOCOS.flatMap((bloco) => bloco.temas.map((tema) => ({ bloco, tema, p: progresso.get(tema.tag) })))
    .filter(({ tema, p }) => {
      const estado = estadoDe(tema.tag);
      return p?.ultima && !temaFechado(p.feitos) && estado !== "trancado" && estado !== "em-escrita";
    })
    .sort((a, b) => (b.p!.ultima! > a.p!.ultima! ? 1 : -1))[0];

  return (
    <>
      <Cabecalho atual="tatica" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="larga" />
      <Moldura largura="larga" barraInferior>
        <header className="flex flex-col gap-2">
          <h1 className="titulo text-tinta">Curso de tática</h1>
          {/* A frase do topo, no desenho da `/trilha` e de `/finais` (Kasparov, Capablanca, Teichmann). */}
          <figure className="flex max-w-prose flex-col gap-1">
            <blockquote className="font-serif text-lg leading-snug text-tinta-media italic">
              “O xadrez é 99% tática.”
            </blockquote>
            <figcaption className="text-xs text-tinta-fraca">Richard Teichmann, mestre alemão</figcaption>
          </figure>
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
                grau={graus.get(continuar.tema.tag)?.grau ?? 0}
                estado={estadoDe(continuar.tema.tag)}
                nivel={continuar.bloco.nivel}
                destaque
              />
            </ul>
          </section>
        ) : null}

        {/*
         * Por nível, e não na ordem dos blocos (Doug, 16/9: "tem prata no meio de
         * dois ouros"). Os blocos 9 a 11 chegaram depois e caíram nos níveis 4 e
         * 5, e o 4 (Táticas fundamentais) é do nível 2: na ordem do `id`, a página
         * ia Madeira, Bronze, Prata, Ferro, Prata, Ouro, Ouro, Ouro, Prata, Ouro,
         * Ouro. Agrupada, ela sobe como a escada do painel e a `/trilha` — com a
         * mesma língua delas: "Nível N", a faixa FIDE, o resumo do degrau, "Você
         * está aqui" e "Meta da OLESC". O número do bloco saiu do título: fora de
         * ordem, "9." antes de "6." lia como erro.
         */}
        {NIVEIS.map((n) => {
          const blocos = BLOCOS.filter((bloco) => bloco.nivel === n);
          if (blocos.length === 0) return null;
          return (
            <section
              key={n}
              aria-labelledby={`nivel-${n}`}
              aria-current={n === nivel ? "step" : undefined}
              className="flex flex-col gap-5 border-t border-borda-fraca pt-6"
            >
              {/*
               * O metal junto do título, e a faixa com as pastilhas numa linha só
               * embaixo. Tudo numa linha, em 375 px a "Meta da OLESC" descia
               * sozinha para a linha de baixo, solta sob o título.
               */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <h2 id={`nivel-${n}`} className="text-xl font-semibold text-tinta">
                    Nível {n}
                  </h2>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${COR_DO_NIVEL[n].pastilha}`}>
                    {METAL[n]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-fraca tabular-nums">
                  <span>FIDE {faixaFide(n)}</span>
                  {n === nivel ? (
                    <span className="rounded-full bg-metodo-cheio px-2 py-0.5 text-xs font-semibold text-tinta-inversa">
                      Você está aqui
                    </span>
                  ) : null}
                  {META_DA_OLESC.includes(n) ? (
                    <span className="rounded-full border border-metodo-cheio px-2 py-0.5 text-xs font-medium text-metodo-tinta">
                      Meta da OLESC
                    </span>
                  ) : null}
                </div>
                <p className="max-w-prose text-sm text-tinta-media">{NIVEL[n].resumo}</p>
              </div>

              {/* Mais espaço entre blocos que entre o resumo e o primeiro bloco:
                  o resumo é de todos eles, e não só do de baixo. */}
              <div className="flex flex-col gap-8">
                {blocos.map((bloco) => {
                  // O tema em teste aparece, mas fica fora do "X de N concluídos".
                  const contam = bloco.temas.filter(contaNoCurso);
                  const fechados = contam.filter((t) => temaFechado(progresso.get(t.tag)?.feitos)).length;
                  return (
                    <section key={bloco.id} aria-labelledby={`bloco-${bloco.id}`} className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h3 id={`bloco-${bloco.id}`} className="text-base font-semibold text-tinta">
                          {bloco.nome}
                        </h3>
                        <span className="text-xs text-tinta-fraca tabular-nums">
                          {fechados} de {contam.length} {contam.length === 1 ? "concluído" : "concluídos"}
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
                            grau={graus.get(tema.tag)?.grau ?? 0}
                            estado={estadoDe(tema.tag)}
                            nivel={bloco.nivel}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="max-w-prose text-xs text-tinta-fraca">
          Os puzzles vêm do banco público do Lichess (CC0), recortados por tema e por faixa de rating. Os temas abrem em
          ordem: <strong>fechar um tema abre o próximo</strong> — aquecimento, série e prova. As faixas FIDE são
          aproximadas.
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
      Jogar agora
    </Link>
  );

  if (!rating) {
    return (
      <section aria-labelledby="rating-titulo" className="flex flex-wrap items-center justify-between gap-4 cartao border-metodo-cheio px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <IconeRating />
          <div className="flex flex-col gap-1">
          <h2 id="rating-titulo" className="text-base font-semibold text-tinta">Aceite o desafio da tática rating</h2>
          <p className="max-w-prose text-sm text-tinta-media">
            Jogue problemas misturados, descubra sua força e tente superar seu próprio recorde. Você começa em {inicio}.
          </p>
          <p className="text-xs text-tinta-fraca">{quando}</p>
          </div>
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
          <div className="flex items-center gap-2">
            <IconeRating pequeno />
            <h2 id="rating-titulo" className="text-sm font-semibold text-metodo-tinta">Seu desafio de tática rating</h2>
          </div>
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

function IconeRating({ pequeno = false }: { pequeno?: boolean }) {
  const tamanho = pequeno ? 28 : 46;
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-metodo-superficie/20 text-metodo-tinta" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 32 32" width={pequeno ? 18 : 28} height={pequeno ? 18 : 28} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 23 13 16l5 4 8-11" />
        <path d="M20 9h6v6" />
        <circle cx="7" cy="23" r="2" fill="currentColor" stroke="none" />
      </svg>
    </span>
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
