import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { NIVEIS } from "@/lib/curso/trilha";
import { DICAS, dicasDoNivel, ordemDaDica } from "@/lib/meiojogo/conteudo";
import { dicasLidas } from "@/lib/meiojogo/progresso";

/**
 * As dicas de meio-jogo, por nível de força.
 *
 * ## Por que esta lista não se parece com `/tatica` nem com `/finais`
 *
 * Porque a unidade é outra. Em tática e em finais existe um número medido — 24
 * puzzles resolvidos, uma aula dominada contra a tablebase —, e a barra conta
 * uma coisa que aconteceu. Aqui só existe uma declaração do aluno: "li". A
 * barra conta leituras, e a tela **diz isso**, para ninguém confundir uma
 * declaração com um selo de domínio.
 *
 * ## Nada fecha, e é de propósito
 *
 * Uma dica de nível 1400 não espera sábado nenhum nem exige a de nível 800: as
 * trinta estão abertas desde o primeiro dia. Meio-jogo é leitura, e leitura
 * fora de ordem custa no máximo uma releitura — bem diferente de soltar a
 * prática de um final antes de o aluno saber a técnica. O nível ordena; ele não
 * tranca.
 */

export const metadata: Metadata = { title: "Meio-jogo — Preparatório OLESC" };

export default async function MeioJogo() {
  const perfil = await perfilAtual();
  const lidas = await dicasLidas(perfil.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Meio-jogo</h1>
        <p className="text-sm text-tinta-media">
          O que fazer quando a abertura acabou e o final ainda não começou. Cada dica é uma
          técnica em uma frase, um diagrama, um &quot;o que procurar&quot; e uma pergunta.
        </p>
      </header>

      <section className="flex flex-col gap-2 rounded-xl border border-borda-fraca bg-carta px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="rotulo text-tinta-fraca">Dicas lidas</span>
          <span className="text-sm text-tinta-media tabular-nums">
            {lidas.size} de {DICAS.length}
          </span>
        </div>
        <Barra
          feitos={lidas.size}
          de={DICAS.length}
          tom={lidas.size === DICAS.length ? "completo" : "metodo"}
        />
        <p className="text-xs text-tinta-fraca">
          Esta barra conta o que você declarou ter lido — não é selo de domínio. Em meio-jogo
          não há lance para o computador reconferir.
        </p>
      </section>

      {NIVEIS.map((nivel) => {
        const daqui = dicasDoNivel(nivel.id);
        if (daqui.length === 0) return null;
        const lidasAqui = daqui.filter((d) => lidas.has(d.id)).length;

        return (
          <section key={nivel.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className="rotulo text-tinta-fraca">{nivel.nome} de rápidas</h2>
                <span className="text-xs text-tinta-fraca tabular-nums">
                  {lidasAqui} de {daqui.length} lidas
                </span>
              </div>
              <p className="text-sm text-tinta-media">{nivel.resumo}</p>
            </div>

            <ul className="flex flex-col gap-2">
              {daqui.map((dica) => (
                <li key={dica.id}>
                  <Link
                    href={`/meio-jogo/${dica.id}`}
                    className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
                  >
                    <span
                      aria-hidden
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums ${
                        lidas.has(dica.id)
                          ? "border-metodo-cheio bg-metodo-cheio text-tinta-inversa"
                          : "border-borda-forte text-tinta-fraca"
                      }`}
                    >
                      {lidas.has(dica.id) ? "✓" : ordemDaDica(dica.id)}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm font-medium text-tinta">{dica.titulo}</p>
                      <p className="text-xs text-tinta-fraca">{dica.resumo}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="rounded-lg bg-dica-superficie/12 px-3 py-2 text-sm text-dica-tinta">
        As posições foram compostas para esta escola, e cada afirmação de legenda é conferida
        por máquina antes de a página existir.{" "}
        <Link href="/trilha" className="font-medium underline">
          Veja a trilha do curso inteiro
        </Link>{" "}
        — tática, finais e meio-jogo, por nível.
      </p>
    </main>
  );
}
