import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { NIVEL, nivelDoAluno, situacaoDoItem } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { BLOCOS } from "@/lib/tatica/blocos";
import { temaAberto } from "@/lib/tatica/conteudo";
import { progressoPorTema, PUZZLES_POR_TEMA, temaZerado } from "@/lib/tatica/progresso";
import { INICIO } from "@/lib/tatica/glicko2";
import { PROBLEMAS_POR_DIA } from "@/lib/tatica/rating";
import { ratingDoAluno } from "@/lib/tatica/rating-leitura";

export const metadata: Metadata = { title: "Tática — Preparatório OLESC" };

/**
 * ## A pastilha trancada era código morto, e agora diz outra coisa
 *
 * Até 2026-09-09 ela dizia *"Abre no Sábado 2"*, e nunca aparecia: os 36 temas
 * já estavam todos escritos, então `temaAberto()` devolvia `true` para todos e
 * este ramo nunca rodava. Era um portão desenhado numa parede sem porta.
 *
 * Hoje ela diz **"Nível 4 — você está no 2"**, e o tema **continua clicável**.
 * A trava é mole de propósito (`TRANCA_DURA` em `lib/curso/nivel.ts`): o nível
 * governa o que o site recomenda, não o que ele permite. O tracejado é o que
 * diz "isto é adiantar", e adiantar é do aluno.
 */
export default async function Tatica() {
  const perfil = await perfilAtual();
  const [progresso, conquistado, cabecalho, rating] = await Promise.all([
    progressoPorTema(),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
    ratingDoAluno(perfil.id),
  ]);
  const nivel = nivelDoAluno(conquistado);

  const feitos = [...progresso.values()].reduce((s, p) => s + p.tentativas, 0);
  const certos = [...progresso.values()].reduce((s, p) => s + p.certos, 0);

  return (
    <>
      <Cabecalho atual="tatica" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} />
      <Moldura largura="painel" barraInferior>
      <header className="flex flex-col gap-2">
        <h1 className="titulo text-tinta">Curso de tática</h1>
        <p className="text-sm text-tinta-media">
          Cada tema tem aquecimento, série e prova — {PUZZLES_POR_TEMA} puzzles ao todo. A
          dificuldade sobe sozinha: você não escolhe o nível.
        </p>
        {feitos > 0 ? (
          <p className="text-sm text-tinta-fraca tabular-nums">
            {feitos} {feitos === 1 ? "puzzle resolvido" : "puzzles resolvidos"} ·{" "}
            {Math.round((100 * certos) / feitos)}% de acerto
          </p>
        ) : null}
      </header>

      <CartaoDoRating rating={rating} inicio={INICIO.rating} />

      {BLOCOS.map((bloco) => (
        <section key={bloco.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold text-tinta">
              <span className="text-tinta-fraca tabular-nums">{bloco.id}.</span> {bloco.nome}
            </h2>
            <span className="text-xs text-tinta-fraca tabular-nums">
              Nível {bloco.nivel} · FIDE {faixaFide(bloco.nivel)}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {bloco.temas.map((tema) => {
              const p = progresso.get(tema.tag) ?? temaZerado();
              const situacao = situacaoDoItem(bloco.nivel, nivel, temaAberto(tema.tag));

              // Sem texto escrito não há o que abrir, e nenhuma trava conserta
              // isso. É o único dos três estados que de fato fecha a porta.
              if (situacao === "em-escrita") {
                return (
                  <li
                    key={tema.tag}
                    className="flex items-center gap-3 cartao-vazio px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-tinta-fraca">{tema.nome}</p>
                      <p className="text-xs text-tinta-fraca">Este tema ainda não foi escrito.</p>
                    </div>
                  </li>
                );
              }

              const adiante = situacao === "adiante";

              return (
                <li key={tema.tag}>
                  <Link
                    href={`/tatica/${tema.tag}`}
                    className={`foco flex items-center gap-3 px-4 py-3 transition-colors hover:bg-carta-toque ${
                      adiante ? "cartao-vazio" : "cartao"
                    }`}
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <p
                        className={`text-sm font-medium ${adiante ? "text-tinta-fraca" : "text-tinta"}`}
                      >
                        {tema.nome}
                      </p>
                      <p className="text-xs text-tinta-fraca">
                        {adiante
                          ? `Nível ${bloco.nivel} — você está no ${nivel}. Pode adiantar.`
                          : tema.resumo}
                      </p>
                      <div className="mt-0.5">
                        <Barra feitos={p.tentativas} de={PUZZLES_POR_TEMA} />
                      </div>
                    </div>
                    <div className="flex w-16 shrink-0 flex-col items-end">
                      <span className="text-sm font-semibold text-tinta tabular-nums">
                        {Math.min(p.tentativas, PUZZLES_POR_TEMA)}
                        <span className="text-tinta-fraca">/{PUZZLES_POR_TEMA}</span>
                      </span>
                      {p.tentativas > 0 ? (
                        <span className="text-xs text-tinta-fraca tabular-nums">
                          {Math.round((100 * p.certos) / p.tentativas)}%
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-tinta-fraca">
        Os puzzles vêm do banco público do Lichess (CC0), recortados por tema e por faixa de
        rating. As faixas FIDE são aproximadas — <strong>nada aqui é trancado por
        elas</strong>, e um tema de nível acima continua clicável.
      </p>
      </Moldura>
    </>
  );
}

/**
 * A entrada da tática com rating, no topo da página (decisão do Doug, 15/9).
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
function CartaoDoRating({ rating, inicio }: { rating: Awaited<ReturnType<typeof ratingDoAluno>>; inicio: number }) {
  return (
    <section aria-labelledby="rating-titulo" className="flex flex-col gap-3 cartao px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="rating-titulo" className="text-base font-semibold text-tinta">
          Tática rating
        </h2>
        <p className="text-xs text-tinta-fraca">
          Depois da revisão e da série do tema: até {PROBLEMAS_POR_DIA} problemas por dia.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {rating ? (
          <dl className="flex items-baseline gap-5 tabular-nums">
            <div className="flex flex-col">
              <dt className="text-xs text-tinta-fraca">Rating</dt>
              <dd className="text-3xl font-semibold text-tinta">{Math.round(rating.rating)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-xs text-tinta-fraca">Melhor sequência</dt>
              <dd className="text-lg font-semibold text-tinta">{rating.melhorSequencia}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-tinta-media">Problemas misturados, e o rating sobe e desce a cada um. Você começa em {inicio}.</p>
        )}
        <div className="flex items-center gap-3">
          {rating ? (
            <Link href="/tatica/rating/evolucao" className="foco text-sm font-medium text-metodo-tinta underline">
              Ver evolução
            </Link>
          ) : null}
          <Link
            href="/tatica/rating"
            prefetch={false}
            className="foco inline-flex min-h-11 items-center rounded-lg bg-metodo-cheio px-5 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
          >
            Jogar
          </Link>
        </div>
      </div>
    </section>
  );
}

/** "800 a 1000", "1400+" — o rótulo do degrau, sem o `null` do teto na tela. */
function faixaFide(nivel: 1 | 2 | 3 | 4 | 5): string {
  const [piso, teto] = NIVEL[nivel].fide;
  if (teto === null) return `${piso}+`;
  return piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;
}

