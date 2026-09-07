import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
import { lerIndice } from "@/lib/repertorio/banco";
import { notas } from "@/lib/repertorio/conteudo";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { aprendidasDaAbertura, aRevisarNaAbertura } from "@/lib/repertorio/treino";

export const metadata: Metadata = { title: "Aberturas — Preparatório OLESC" };

const TITULO: Record<Cor, string> = {
  brancas: "Você de brancas",
  pretas: "Você de pretas",
};

const RESUMO: Record<Cor, string> = {
  brancas: "Você começa com 1.e4. Cada abertura aqui é a resposta a uma defesa.",
  pretas: "Ele começa. Estas são as respostas — quase todas terminam em posição igual.",
};

/**
 * A lista das aberturas do repertório.
 *
 * **A barra conta linhas aprendidas, não linhas tentadas.** É a diferença entre
 * "abri" e "sei": a tática mede tentativas porque um puzzle tentado é um puzzle
 * pensado, e aqui o exercício é decorar — três degraus da escada de revisão, em
 * três dias distintos, e errar derruba.
 *
 * **O que a barra não mede é o trabalho de hoje.** Com repetição espaçada, um
 * repertório inteiro aprendido ainda tem linhas vencendo — por isso "a revisar
 * hoje" vai ao lado dela, e é a única coisa desta tela que muda de cor.
 *
 * A contagem sai do `index.json` — que traz os ids de cada abertura — cruzado
 * com o mapa de progresso, e não da leitura dos doze arquivos: desenhar doze
 * barrinhas não é motivo para abrir doze JSON.
 */
export default async function Aberturas() {
  await perfilAtual();
  const [indice, progresso] = await Promise.all([lerIndice(), progressoDoRepertorio()]);

  const agora = new Date().toISOString();
  const aprendidas = indice.reduce((soma, e) => soma + aprendidasDaAbertura(progresso, e), 0);
  const aRevisar = indice.reduce((soma, e) => soma + aRevisarNaAbertura(progresso, e, agora), 0);
  const total = indice.reduce((soma, e) => soma + e.linhas, 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Repertório do clube</h1>
        <p className="text-sm text-tinta-media">
          {total} linhas curtas, até o lance 8. Uma linha é aprendida quando você a acerta{" "}
          <strong className="font-semibold text-tinta">em três dias diferentes</strong> — e
          depois ela volta de vez em quando, para você não esquecer.
        </p>
        <p className="text-sm text-tinta-fraca tabular-nums">
          {aprendidas} de {total} aprendidas
          {aRevisar > 0 ? (
            <>
              {" · "}
              <strong className="font-semibold text-aviso-tinta">
                {aRevisar} a revisar hoje
              </strong>
            </>
          ) : null}
        </p>
      </header>

      {CORES.map((cor) => {
        const daCor = indice.filter((e) => e.cor === cor);
        if (daCor.length === 0) return null;

        return (
          <section key={cor} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-tinta">{TITULO[cor]}</h2>
              <p className="text-xs text-tinta-fraca">{RESUMO[cor]}</p>
            </div>

            <ul className="flex flex-col gap-2">
              {daCor.map((abertura) => {
                const feitas = aprendidasDaAbertura(progresso, abertura);
                const vencendo = aRevisarNaAbertura(progresso, abertura, agora);
                const completa = feitas >= abertura.linhas && vencendo === 0;

                return (
                  <li key={`${cor}/${abertura.abertura}`}>
                    <Link
                      href={`/aberturas/${cor}/${abertura.abertura}`}
                      className="foco flex items-center gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-3 transition-colors hover:bg-carta-toque"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="truncate text-sm font-medium text-tinta">{abertura.nome}</p>
                        <Barra
                          feitos={feitas}
                          de={abertura.linhas}
                          tom={completa ? "completo" : "metodo"}
                        />
                      </div>
                      <div className="flex w-20 shrink-0 flex-col items-end">
                        <span className="text-sm font-semibold text-tinta tabular-nums">
                          {feitas}
                          <span className="text-tinta-muda">/{abertura.linhas}</span>
                        </span>
                        <span
                          className={`text-xs ${vencendo > 0 ? "text-aviso-tinta" : "text-tinta-fraca"}`}
                        >
                          {vencendo > 0
                            ? `${vencendo} a revisar`
                            : completa
                              ? "em dia"
                              : abertura.linhas === 1
                                ? "1 linha"
                                : "linhas"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* ------------------------------------------------------------------ *
       * As que não viraram linha
       *
       * Ficam no fim, e não misturadas às aberturas, porque não têm treino: são
       * texto. Escondê-las seria pior — o aluno encontra um 1…d6 por torneio, e
       * precisa saber que existe uma página dizendo o que fazer.
       * ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-tinta">As raras, por princípio</h2>
          <p className="text-xs text-tinta-fraca">
            Aparecem menos de uma vez por torneio. Não há linha para decorar — há o que
            fazer, escrito.
          </p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {notas().map((nota) => (
            <li key={nota.slug}>
              <Link
                href={`/aberturas/notas/${nota.slug}`}
                className="foco flex items-baseline justify-between gap-3 rounded-lg border border-borda-fraca bg-carta px-3 py-2.5 transition-colors hover:bg-carta-toque"
              >
                <span className="text-sm text-tinta">{nota.nome}</span>
                <span className="shrink-0 text-xs text-tinta-fraca tabular-nums">
                  {nota.lances}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-tinta-muda">
        As linhas vêm dos cursos do clube e do motor, e cada uma diz de onde veio. Na
        primeira vez, o site joga a linha com você e desenha a seta; depois cobra de
        memória, e o botão &ldquo;Dica&rdquo; acende a peça quando você travar.
      </p>
    </main>
  );
}
