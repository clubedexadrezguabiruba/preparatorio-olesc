import Link from "next/link";
import { META_DA_OLESC, NIVEIS, NIVEL, type Nivel } from "@/lib/curso/nivel";

/**
 * A escada dos cinco níveis, na horizontal: **você está aqui**.
 *
 * ## O que ela substituiu
 *
 * A faixa antiga era um cartão alto que dizia o número do nível, a faixa FIDE, o
 * resumo, três barras e a prova — tudo junto. Ela respondia bem "o que falta
 * para fechar este degrau?" e mal a pergunta anterior, que é **"de quantos
 * degraus estamos falando, e onde eu estou neles?"**. Um número solto ("Nível
 * 2") não responde isso: 2 de quê, e o que vem depois?
 *
 * Cinco pastilhas numa linha respondem as duas de uma vez, e cabem em 360 px.
 *
 * ## Três estados, e o terceiro não é uma tranca
 *
 * `✓` conquistado · `◉` o atual · e os adiante, apagados. **Apagado não é
 * trancado**: `TRANCA_DURA` é `false` em `lib/curso/nivel.ts`, e o aluno que
 * quiser adiantar entra em `/tatica` e abre o tema que quiser. O nível governa o
 * que o site *recomenda*, não o que ele permite.
 *
 * ## Uma porta, e não cinco
 *
 * Os degraus não são links. O plano previa que cada um levasse à `/trilha`, e eu
 * troquei por **um** link no rodapé do cartão — cinco links que fazem a mesma
 * promessa são quatro decisões a mais numa tela cuja meta é ter uma. A `/trilha`
 * continua alcançável daqui e do cabeçalho, que era o buraco a tapar.
 * Registrado em `DECISOES-QUE-TOMEI-SOZINHO.md`.
 */
export function Escada({ nivel, conquistado }: { nivel: Nivel; conquistado: 0 | Nivel }) {
  const [piso, teto] = NIVEL[nivel].fide;
  const faixa = teto === null ? `${piso}+` : piso === 0 ? `até ${teto}` : `${piso} a ${teto}`;

  return (
    <section aria-labelledby="escada" className="cartao flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="escada" className="rotulo text-tinta-fraca">
          A escada
        </h2>
        <span className="text-xs text-tinta-fraca tabular-nums">FIDE {faixa}</span>
      </div>

      <ol className="flex items-stretch gap-1.5">
        {NIVEIS.map((n) => {
          const feito = conquistado >= n;
          const atual = n === nivel;
          const daOlesc = META_DA_OLESC.includes(n);
          return (
            <li key={n} className="flex flex-1 flex-col items-center gap-1.5">
              {/* **Cheio quer dizer conquistado, e só isso.**

                  O degrau atual tinha aqui um trilho verde inteiro, um tom
                  abaixo do conquistado — e medido na folha ele lia como um
                  terceiro ✓: três trilhos completos para dois níveis passados.
                  Quem diz "você está aqui" é o anel verde em volta do número,
                  que é uma forma e não um nível de preenchimento. */}
              <span
                aria-hidden
                className={`h-1 w-full rounded-full ${feito ? "bg-metodo-cheio" : "bg-carta-toque"}`}
              />
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm tabular-nums ${
                  feito
                    ? "bg-metodo-cheio font-semibold text-tinta-inversa"
                    : atual
                      ? "border border-metodo-cheio font-semibold text-metodo-tinta"
                      : "border border-borda text-tinta-fraca"
                }`}
              >
                {feito ? <span aria-hidden>✓</span> : n}
                <span className="sr-only">
                  Nível {n}
                  {feito ? " — conquistado" : atual ? " — você está aqui" : " — adiante"}
                </span>
              </span>
              {/* A meta da OLESC são os níveis 1 a 3, e ela precisa aparecer na
                  escada: é o que diz onde termina o preparatório e começa o
                  resto do curso. Um ponto, e não uma palavra — a palavra não
                  cabe cinco vezes em 360 px. */}
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${daOlesc ? "bg-aviso-superficie" : "bg-transparent"}`}
              />
            </li>
          );
        })}
      </ol>

      {/* O que este degrau ensina, em corpo de leitura.

          Ele vivia dentro da faixa de nível antiga, grande, e na primeira versão
          desta escada virou nota de rodapé de 12 px colada na legenda dos
          pontinhos — duas coisas diferentes espremidas na mesma linha. É a única
          frase do painel que diz **o que o aluno está aprendendo a fazer**, e ela
          merece o corpo que tinha. */}
      <p className="text-sm text-tinta-media">{NIVEL[nivel].resumo}</p>

      <p className="text-xs text-tinta-fraca">
        <span
          aria-hidden
          className="mr-1 inline-block size-1.5 rounded-full bg-aviso-superficie align-middle"
        />
        Os três primeiros degraus são a meta da OLESC.
      </p>

      <Link
        href="/trilha"
        className="foco w-fit text-sm font-medium text-metodo-tinta hover:underline"
      >
        A escada inteira, degrau a degrau →
      </Link>
    </section>
  );
}
