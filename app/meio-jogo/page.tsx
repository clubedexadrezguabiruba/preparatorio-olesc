import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { indiceDeMeioJogo, type AulaDeMeioJogo } from "@/lib/meiojogo/conteudo";
import { pontosPorAula } from "@/lib/meiojogo/progresso";

/**
 * As aulas de meio-jogo, na ordem da série.
 *
 * ## Por que a lista é por volume, e não por nível de força
 *
 * Porque a graduação é do autor. Cada aula é um capítulo da série do Yusupov, e
 * a ordem dos volumes e dos capítulos dentro deles **é** o caminho do mais
 * simples ao intermediário — foi por isso que a série foi escolhida. Reordenar
 * por uma classe de força nossa seria pôr uma segunda opinião sobre a primeira,
 * e a nossa é a pior das duas.
 *
 * O nível continua existindo na `/trilha`, que é a tela que cruza os três
 * módulos; aqui a ordem é a do livro.
 *
 * ## Nada fecha por calendário, e é de propósito
 *
 * Uma aula do volume 3 não espera sábado nenhum nem exige a do volume 1. O
 * meio-jogo é conceito, e conceito fora de ordem custa no máximo uma releitura
 * — bem diferente de soltar a prática de um final antes de o aluno saber a
 * técnica. O que fecha uma aula aqui é só ela ainda não ter sido escrita, e
 * nesse caso a tela diz "em escrita", que é o padrão de `/finais`.
 *
 * ## A barra conta pontos, não aulas
 *
 * A régua é a do próprio livro: cada exercício vale 1, 2 ou 3 pontos, e o
 * capítulo tem uma nota de corte impressa. Contar aulas concluídas esconderia
 * que o aluno passou raspando em quatro delas; contar pontos mostra onde ele
 * está de verdade.
 */

export const metadata: Metadata = { title: "Meio-jogo — Preparatório OLESC" };

const VOLUME = {
  1: { nome: "Build Up Your Chess 1", nivel: "laranja", faixa: "até ~1500" },
  2: { nome: "Boost Your Chess 1", nivel: "laranja", faixa: "até ~1500" },
  3: { nome: "Chess Evolution 1", nivel: "laranja", faixa: "até ~1500" },
  4: { nome: "Build Up Your Chess 2", nivel: "azul", faixa: "1400 a 1800" },
  5: { nome: "Boost Your Chess 2", nivel: "azul", faixa: "1400 a 1800" },
  6: { nome: "Chess Evolution 2", nivel: "azul", faixa: "1400 a 1800" },
} as const;

export default async function MeioJogo() {
  const perfil = await perfilAtual();
  const pontos = await pontosPorAula(perfil.id);
  const aulas = indiceDeMeioJogo();

  const escritas = aulas.filter((a) => a.status === "published" && a.aprovacao !== null);
  const ganhos = escritas.reduce((soma, a) => soma + (pontos.get(a.id) ?? 0), 0);
  const possiveis = escritas.reduce((soma, a) => soma + (a.aprovacao?.maximo ?? 0), 0);
  const aprovadas = escritas.filter(
    (a) => (pontos.get(a.id) ?? 0) >= (a.aprovacao?.minimo ?? Infinity),
  ).length;

  const volumes = [...new Set(aulas.map((a) => a.volume))].sort((a, b) => a - b);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Meio-jogo</h1>
        <p className="text-sm text-tinta-media">
          O que fazer quando a abertura acabou e o final ainda não começou. Cada aula é um
          capítulo de livro inteiro: o conceito, o exemplo do autor lance a lance, e os
          exercícios dele — que você resolve jogando no tabuleiro.
        </p>
      </header>

      {escritas.length === 0 ? (
        <p className="rounded-xl border border-borda-fraca bg-carta px-4 py-6 text-sm leading-relaxed text-tinta-fraca">
          Nenhuma aula escrita ainda. As que estão a caminho aparecem abaixo, com o capítulo de
          onde saem.
        </p>
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="rotulo text-tinta-fraca">Pontos dos capítulos</span>
            <span className="text-sm text-tinta-media tabular-nums">
              {ganhos} de {possiveis}
            </span>
          </div>
          <Barra feitos={ganhos} de={possiveis} tom={ganhos === possiveis ? "completo" : "metodo"} />
          <p className="text-xs text-tinta-fraca">
            {aprovadas} de {escritas.length} aula(s) aprovada(s) pela nota de corte do próprio
            livro. Passar não é acertar tudo: o autor escreveu a régua contando que você erre uma
            parte.
          </p>
        </section>
      )}

      {volumes.map((volume) => {
        const daqui = aulas.filter((a) => a.volume === volume);
        const info = VOLUME[volume as keyof typeof VOLUME];
        const escritasAqui = daqui.filter((a) => a.status === "published" && a.aprovacao !== null);
        const aprovadasAqui = escritasAqui.filter(
          (a) => (pontos.get(a.id) ?? 0) >= (a.aprovacao?.minimo ?? Infinity),
        ).length;

        return (
          <section key={volume} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className="rotulo text-tinta-fraca">
                  Volume {volume} · {info?.nome ?? "—"}
                </h2>
                <span className="text-xs text-tinta-fraca tabular-nums">
                  {aprovadasAqui} de {escritasAqui.length} aprovada(s)
                  {escritasAqui.length < daqui.length ? ` · ${daqui.length} no total` : ""}
                </span>
              </div>
              <p className="text-sm text-tinta-media">
                Nível {info?.nivel ?? "—"} da série — {info?.faixa ?? "—"}.
              </p>
            </div>

            <ul className="flex flex-col gap-2">
              {daqui.map((aula) => (
                <li key={aula.id}>
                  {aula.status === "published" && aula.aprovacao !== null ? (
                    <Cartao aula={aula} pontos={pontos.get(aula.id) ?? 0} />
                  ) : (
                    <EmEscrita aula={aula} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
        A ordem é a da série, do conceito mais simples ao intermediário — é a graduação do próprio
        autor.{" "}
        <Link href="/trilha" className="font-medium underline">
          Veja a trilha do curso inteiro
        </Link>{" "}
        — tática, finais e meio-jogo, por nível.
      </p>

      {/* A atribuição da obra, em toda tela do módulo. Ver `content/sources.json`. */}
      <footer className="border-t border-borda-fraca pt-4 text-xs leading-relaxed text-tinta-fraca">
        Posições, exercícios, pontuação e nota de corte de Artur Yusupov, série{" "}
        <em>Build Up Your Chess / Boost Your Chess / Chess Evolution</em> (Quality Chess). Uso
        interno do preparatório, com exemplares adquiridos. A prosa em português é nossa.
      </footer>
    </main>
  );
}

function Cartao({ aula, pontos }: { aula: AulaDeMeioJogo; pontos: number }) {
  const regua = aula.aprovacao!;
  const aprovado = pontos >= regua.minimo;
  return (
    <Link
      href={`/meio-jogo/${aula.id}`}
      className="foco flex flex-col gap-2 rounded-xl border border-borda bg-carta px-4 py-3 transition hover:bg-carta-alta"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium text-tinta">
          <span className="rotulo mr-2 text-tinta-fraca">Cap. {aula.capitulo}</span>
          {aula.titulo}
        </span>
        <span className="text-sm tabular-nums text-tinta-media">
          {pontos} de {regua.maximo} pts
        </span>
      </div>
      <Barra feitos={pontos} de={regua.maximo} tom={aprovado ? "completo" : "metodo"} />
      <span className={`text-xs ${aprovado ? "text-metodo-tinta" : "text-tinta-fraca"}`}>
        {aprovado
          ? `Aprovado — o livro pede ${regua.minimo}.`
          : `${aula.exercicios} exercício(s) · a nota de corte do livro é ${regua.minimo}.`}
      </span>
    </Link>
  );
}

/**
 * A aula que a série tem e nós ainda não escrevemos.
 *
 * Aparece de propósito, e é o padrão de `/finais`: esconder o que falta faria o
 * aluno achar que o módulo acaba onde a nossa escrita acabou. Aqui não há
 * sábado a prometer — o meio-jogo não tem calendário —, então a pastilha diz só
 * o que é verdade.
 */
function EmEscrita({ aula }: { aula: AulaDeMeioJogo }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl border border-dashed border-borda px-4 py-3 text-tinta-fraca">
      <span>
        <span className="rotulo mr-2">Cap. {aula.capitulo}</span>
        {aula.titulo}
      </span>
      <span className="rotulo">em escrita</span>
    </div>
  );
}
