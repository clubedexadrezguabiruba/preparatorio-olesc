import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { Cabecalho } from "@/components/Cabecalho";
import { Moldura } from "@/components/Moldura";
import { PeaoDaCor, TabuleiroDaAbertura } from "@/components/repertorio/TabuleiroDaAbertura";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { naVitrine, posicaoNaVitrine } from "@/lib/aberturas/vitrine";
import { perfilAtual } from "@/lib/auth/perfil";
import { dadosDoCabecalho } from "@/lib/curso/cabecalho";
import { LINHAS_POR_NIVEL, nivelDoAluno } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { lerIndice } from "@/lib/repertorio/banco";
import { notas } from "@/lib/repertorio/conteudo";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { lancesEmPortugues } from "@/lib/repertorio/notas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import {
  aprendidasDaAbertura,
  aRevisarNaAbertura,
  baseCompleto,
  faltamNoBase,
  idsLiberados,
  quantasNoAvancado,
} from "@/lib/repertorio/treino";

export const metadata: Metadata = { title: "Aberturas — Preparatório OLESC" };

const TITULO: Record<Cor, string> = {
  brancas: "Repertório de brancas",
  pretas: "Repertório de pretas",
};

const RESUMO: Record<Cor, string> = {
  brancas: "Você começa com 1.e4. Cada abertura é a resposta a uma defesa — primeiro a que você mais vai ver.",
  pretas: "Ele começa. Primeiro a resposta a 1.e4, que é 7 em cada 10 partidas; depois, a 1.d4.",
};

/**
 * A lista das aberturas do repertório — redesenhada em 18/9/2026 na identidade de `/finais` e
 * `/painel`: título em serifa com a frase de um campeão, o resumo à direita com o botão do próximo
 * passo, e cada cor numa lista só.
 *
 * ## A ordem é a do tabuleiro, e só abre o que está pronto
 *
 * As duas decisões do Doug moram em `lib/aberturas/vitrine.ts`: a abertura que o aluno mais vai
 * encontrar vem primeiro (o número da esquerda é essa posição), e a que ainda não foi refeita no
 * molde da Francesa aparece com "Em breve" — sem link para o aluno, e com a URL trancada.
 *
 * **As contas desta tela só olham as abertas.** Medir o aluno contra linhas de uma abertura que ele
 * não pode abrir seria dizer-lhe que falta o que ele não tem como fazer.
 *
 * ## A barra conta linhas aprendidas, não linhas tentadas
 *
 * É a diferença entre "abri" e "sei": aqui o exercício é decorar — três degraus da escada de
 * revisão, em três dias distintos, e errar derruba. O que a barra não mede é o trabalho de hoje:
 * com repetição espaçada, um repertório aprendido ainda tem linhas vencendo — por isso "a revisar
 * hoje" vai ao lado dela, e é a única coisa desta tela em cor de aviso.
 *
 * A contagem sai do `index.json` — que traz os ids de cada abertura — cruzado com o mapa de
 * progresso, e não da leitura dos doze arquivos.
 */
export default async function Aberturas() {
  const perfil = await perfilAtual();
  const [indiceInteiro, progresso, conquistado, cabecalho, trava] = await Promise.all([
    lerIndice(),
    progressoDoRepertorio(),
    nivelConquistado(perfil.id),
    dadosDoCabecalho(perfil.id),
    travaDoAluno(perfil),
  ]);
  const nivel = nivelDoAluno(conquistado);
  const professor = perfil.papel === "professor";

  const indice = [...indiceInteiro].sort(
    (a, b) => posicaoNaVitrine(a.cor, a.abertura) - posicaoNaVitrine(b.cor, b.abertura),
  );
  const abertas = indice.filter((e) => naVitrine(e.cor, e.abertura)?.liberada);
  const emBreve = indice.length - abertas.length;

  const agora = new Date().toISOString();
  // O portão do Avançado e a trava por aula (17/9/2026) entram como antes: as linhas do Avançado
  // enquanto o Base não fecha, e as do move trainer de uma aula não concluída, saem de toda conta.
  const { trancadas } = trava;
  const destravado = baseCompleto(progresso, indiceInteiro, trancadas);
  const somar = (f: (e: (typeof indice)[number]) => number) => abertas.reduce((s, e) => s + f(e), 0);
  const aprendidas = somar((e) => aprendidasDaAbertura(progresso, e, destravado, trancadas));
  const aRevisar = somar((e) => aRevisarNaAbertura(progresso, e, agora, destravado, trancadas));
  const total = somar((e) => idsLiberados(e, destravado, trancadas).length);
  const faltam = faltamNoBase(progresso, indiceInteiro, trancadas);
  const noAvancado = quantasNoAvancado(indiceInteiro);

  /*
   * O alvo do degrau: 4 linhas por nível, **em acumulado**. Escrito aqui, ao lado da contagem, para
   * "quantas eu preciso?" não ter duas respostas em duas telas. O nível 5 cobra o Base inteiro —
   * o mesmo `baseCompleto` que destrava o Avançado.
   */
  const alvoDoNivel = nivel === 5 ? null : LINHAS_POR_NIVEL * nivel;

  /** O que o cartão de cada abertura precisa, calculado uma vez. */
  const cartoes = indice.map((entrada) => {
    const { cor, abertura } = entrada;
    const vitrine = naVitrine(cor, abertura);
    const aulas = trava.cursos.get(`${cor}/${abertura}`) ?? [];
    const visiveis = idsLiberados(entrada, destravado, trancadas).length;
    const feitas = aprendidasDaAbertura(progresso, entrada, destravado, trancadas);
    const vencendo = aRevisarNaAbertura(progresso, entrada, agora, destravado, trancadas);
    // Começadas conta também as trancadas: o que o aluno treinou antes da trava é trabalho dele.
    const comecadas = idsLiberados(entrada, destravado).filter(
      (id) => (progresso.get(id)?.tentativas ?? 0) > 0,
    ).length;
    const aulasFeitas = aulas.filter((a) => trava.concluidas.has(a.id)).length;
    const emAndamento = aulas.filter((a) => trava.abertas.has(a.id) && !trava.concluidas.has(a.id)).length;
    const liberada = vitrine?.liberada ?? false;
    const cursoFeito = aulas.length === 0 || aulasFeitas === aulas.length;
    const linhasFeitas = visiveis === 0 || (feitas >= visiveis && vencendo === 0);
    return {
      entrada,
      vitrine,
      liberada,
      href: `/aberturas/${cor}/${abertura}`,
      aulas,
      aulasFeitas,
      emAndamento,
      visiveis,
      feitas,
      vencendo,
      comecadas,
      completa: cursoFeito && linhasFeitas,
      tocada: aulasFeitas + emAndamento + comecadas > 0,
    };
  });

  // O próximo passo: a primeira aberta (na ordem da vitrine) com revisão vencida; senão, a primeira
  // por terminar. É o botão verde do resumo — um lugar só para onde ir.
  const abertosDoAluno = cartoes.filter((c) => c.liberada);
  const proximo =
    abertosDoAluno.find((c) => c.vencendo > 0) ?? abertosDoAluno.find((c) => !c.completa) ?? null;
  const acao = proximo ? (proximo.vencendo > 0 ? "Revisar" : proximo.tocada ? "Continuar" : "Começar") : null;

  // Desenhado duas vezes (celular em cima, desktop ao lado), então o id leva o lugar.
  const resumo = (onde: string) => (
    <section aria-labelledby={`seu-repertorio-${onde}`} className="flex flex-col gap-4 cartao px-4 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={`seu-repertorio-${onde}`} className="text-base font-semibold text-tinta">
            Seu repertório
          </h2>
          {total > 0 ? (
            <p className="text-sm text-tinta-media tabular-nums">
              <span className="font-serif text-2xl leading-none font-semibold text-tinta">{aprendidas}</span>
              <span className="text-tinta-fraca"> de {total}</span>
            </p>
          ) : null}
        </div>
        {total > 0 ? (
          <>
            <Barra feitos={aprendidas} de={total} tom={aprendidas === total ? "completo" : "metodo"} />
            <p className="text-xs text-tinta-fraca tabular-nums">
              {aprendidas === 1 ? "Linha aprendida" : "Linhas aprendidas"}
              {aRevisar > 0 ? (
                <>
                  {" · "}
                  <strong className="font-semibold text-aviso-tinta">{aRevisar} a revisar hoje</strong>
                </>
              ) : null}
            </p>
          </>
        ) : (
          <p className="text-sm text-tinta-media">
            As linhas abrem conforme você conclui as aulas. Comece pela aula A.
          </p>
        )}
      </div>

      {proximo && acao ? (
        <Link
          href={proximo.href}
          aria-label={`${acao}: ${proximo.entrada.nome}`}
          className="foco group flex flex-col gap-3 rounded-2xl border border-borda bg-papel/40 p-3 transition-colors hover:bg-carta-toque"
        >
          <span className="flex items-center gap-3">
            <PeaoDaCor
              cor={proximo.entrada.cor}
              className="[--lado-peao:2.75rem]"
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm leading-snug font-semibold text-pretty text-tinta">
                {proximo.entrada.nome}
              </span>
              <span className="text-xs text-tinta-fraca">Você de {proximo.entrada.cor}</span>
            </span>
          </span>
          <span aria-hidden className="finais-botao py-2 text-center text-sm font-bold tracking-wide uppercase">
            {acao}
          </span>
        </Link>
      ) : abertosDoAluno.length > 0 ? (
        <p className="text-sm text-metodo-tinta">
          Tudo o que está aberto você já sabe. As próximas aberturas estão sendo preparadas.
        </p>
      ) : null}

      <p className="border-t border-borda-fraca pt-3 text-xs text-tinta-fraca tabular-nums">
        {alvoDoNivel === null
          ? `O nível 5 pede o Base inteiro — todas as linhas do repertório.`
          : `O nível ${nivel} pede ${alvoDoNivel} linhas aprendidas${
              aprendidas >= alvoDoNivel ? " — feito." : `; faltam ${alvoDoNivel - aprendidas}.`
            }`}{" "}
        Uma linha é aprendida quando você a acerta em três dias diferentes.
      </p>
    </section>
  );

  return (
    <>
      <Cabecalho atual="aberturas" nivel={cabecalho.nivel} sequencia={cabecalho.sequencia} largura="larga" />
      <Moldura largura="larga" barraInferior>
        <header className="flex flex-col gap-2">
          <h1 className="titulo text-tinta">Repertório do clube</h1>
          <figure className="flex max-w-prose flex-col gap-1">
            <blockquote className="font-serif text-lg leading-snug text-tinta-media italic">
              “Cada lance deve ter um propósito.”
            </blockquote>
            <figcaption className="text-xs text-tinta-fraca">Siegbert Tarrasch, mestre alemão</figcaption>
          </figure>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-10">
            <div className="lg:hidden">{resumo("celular")}</div>

            {CORES.map((cor) => {
              const daCor = cartoes.filter((c) => c.entrada.cor === cor);
              if (daCor.length === 0) return null;
              const abertasDaCor = daCor.filter((c) => c.liberada).length;

              return (
                <section key={cor} aria-labelledby={`titulo-${cor}`} className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <PeaoDaCor cor={cor} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 id={`titulo-${cor}`} className="font-serif text-xl leading-tight font-semibold text-tinta">
                          {TITULO[cor]}
                        </h2>
                        <p className="text-sm text-pretty text-tinta-fraca">{RESUMO[cor]}</p>
                      </div>
                    </div>
                    <p className="hidden shrink-0 text-xs text-tinta-fraca tabular-nums sm:block">
                      {abertasDaCor} de {daCor.length} {daCor.length === 1 ? "aberta" : "abertas"}
                    </p>
                  </div>

                  <ol className="flex flex-col overflow-hidden cartao">
                    {daCor.map((c, i) => {
                      const chave = `${cor}/${c.entrada.abertura}`;
                      const numero = (
                        <span
                          aria-hidden
                          className={`w-4 shrink-0 text-center font-serif text-lg sm:w-6 sm:text-xl leading-none font-semibold tabular-nums ${
                            c.liberada ? "text-metodo-tinta" : "text-tinta-muda"
                          }`}
                        >
                          {i + 1}
                        </span>
                      );
                      const identidade = (
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className={`text-base font-semibold ${c.liberada ? "text-tinta" : "text-tinta-media"}`}>
                            {c.entrada.nome}
                          </span>
                          {c.vitrine ? (
                            <span className="text-xs text-tinta-fraca tabular-nums">
                              <span className="font-medium text-tinta-media">{c.vitrine.lances}</span>
                              <span className="hidden sm:inline"> · {c.vitrine.frequencia}</span>
                            </span>
                          ) : null}
                        </span>
                      );
                      const tabuleiro = c.vitrine ? (
                        <TabuleiroDaAbertura
                          sans={c.vitrine.sans}
                          lado={cor}
                          className={c.liberada ? "" : "opacity-55 saturate-50"}
                        />
                      ) : null;
                      const linha = "flex items-center gap-3 px-3 py-3.5 sm:gap-4 sm:px-5 sm:py-4";
                      const divisoria = i > 0 ? "border-t border-borda-fraca" : "";

                      if (!c.liberada) {
                        const selo = (
                          <span className="hidden shrink-0 rounded-full border border-dashed border-borda px-2.5 py-1 text-xs font-medium text-tinta-fraca sm:inline">
                            Em breve
                          </span>
                        );
                        // No celular a pílula da direita roubava 80 px do nome; lá ela desce para baixo dele.
                        const seloEmbaixo = (
                          <span className="mt-1.5 inline-block rounded-full border border-dashed border-borda px-2 py-0.5 text-xs font-medium text-tinta-fraca sm:hidden">
                            Em breve
                          </span>
                        );
                        return (
                          <li key={chave} className={divisoria}>
                            {professor ? (
                              // O professor entra para revisar; o aluno vê a mesma linha, sem link.
                              <Link
                                href={c.href}
                                title="Em breve para o aluno — você entra para revisar"
                                className={`foco ${linha} transition-colors hover:bg-carta-toque`}
                              >
                                {numero}
                                {tabuleiro}
                                <span className="min-w-0 flex-1">
                                  {identidade}
                                  {seloEmbaixo}
                                </span>
                                {selo}
                              </Link>
                            ) : (
                              <div className={linha}>
                                {numero}
                                {tabuleiro}
                                <span className="min-w-0 flex-1">
                                  {identidade}
                                  {seloEmbaixo}
                                </span>
                                {selo}
                              </div>
                            )}
                          </li>
                        );
                      }

                      const comCurso = c.aulas.length > 0;
                      const detalhe = [
                        comCurso
                          ? `${c.aulasFeitas} de ${c.aulas.length} aulas${
                              c.emAndamento > 0 ? ` · ${c.emAndamento} em andamento` : ""
                            }`
                          : null,
                        c.visiveis > 0 ? `${c.feitas} de ${c.visiveis} ${c.visiveis === 1 ? "linha" : "linhas"}` : null,
                        c.visiveis === 0 && c.comecadas > 0
                          ? `${c.comecadas} ${c.comecadas === 1 ? "linha começada" : "linhas começadas"}`
                          : null,
                      ].filter(Boolean);

                      return (
                        <li key={chave} className={divisoria}>
                          <Link
                            href={c.href}
                            className={`foco group ${linha} bg-carta-alta/40 transition-colors hover:bg-carta-toque`}
                          >
                            {numero}
                            {tabuleiro}
                            <span className="flex min-w-0 flex-1 flex-col gap-2.5">
                              {identidade}
                              <Barra
                                feitos={comCurso ? c.aulasFeitas : c.feitas}
                                de={comCurso ? c.aulas.length : c.visiveis}
                                tom={c.completa ? "completo" : "metodo"}
                              />
                              <span className="text-xs text-tinta-fraca tabular-nums">
                                {detalhe.join(" · ")}
                                {c.vencendo > 0 ? (
                                  <>
                                    {detalhe.length > 0 ? " · " : ""}
                                    <strong className="font-semibold whitespace-nowrap text-aviso-tinta">{c.vencendo} a revisar</strong>
                                  </>
                                ) : null}
                              </span>
                            </span>
                            <svg
                              aria-hidden
                              viewBox="0 0 24 24"
                              width={20}
                              height={20}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0 text-tinta-fraca transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-tinta"
                            >
                              <path d="m9 6 6 6-6 6" />
                            </svg>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}

            {emBreve > 0 ? (
              <p className="max-w-prose text-sm text-tinta-media">
                As aberturas estão sendo refeitas no formato novo — aulas curtas primeiro, e só
                depois as linhas para decorar. As marcadas com{" "}
                <span className="font-medium text-tinta">Em breve</span> abrem assim que ficarem
                prontas, na ordem da lista.
              </p>
            ) : null}

            {/* ------------------------------------------------------------------ *
             * O Avançado, e o portão que o abre (decisão de 7/9/2026: aparece
             * trancado, não escondido). Enquanto houver abertura "em breve" ele
             * sai: o portão pede o Base inteiro, e parte dele o aluno ainda não
             * tem como abrir — a barra mediria o que não depende dele.
             * ------------------------------------------------------------------ */}
            {noAvancado > 0 && !destravado && emBreve === 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="font-serif text-xl leading-tight font-semibold text-tinta">
                    Avançado — ainda trancado
                  </h2>
                  <p className="text-sm text-tinta-fraca">
                    Mais {noAvancado === 1 ? "1 linha" : `${noAvancado} linhas`}: os ramos que as de
                    cima deixaram de lado. Elas abrem sozinhas quando <strong>todas</strong> as
                    linhas de cima estiverem aprendidas.
                  </p>
                </div>
                <div className="flex items-center gap-3 cartao-vazio px-4 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="truncate text-sm font-medium text-tinta-fraca">
                      {faltam === 1 ? "Falta 1 linha do Base" : `Faltam ${faltam} linhas do Base`}
                    </p>
                    <Barra feitos={total - faltam} de={total} />
                  </div>
                </div>
              </section>
            ) : null}

            {/* ------------------------------------------------------------------ *
             * As que não viraram linha. Não têm treino, são texto — por isso no
             * fim. **Não chame o bloco de "as raras"**: a do bispo em c4 é ~31 %
             * das sicilianas; está aqui por não ter teoria. Cada nota diz o seu
             * motivo no campo `porque`.
             * ------------------------------------------------------------------ */}
            <section aria-labelledby="sem-linha" className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="sem-linha" className="font-serif text-xl leading-tight font-semibold text-tinta">
                  Sem linha para decorar
                </h2>
                <p className="max-w-prose text-sm text-pretty text-tinta-fraca">
                  Algumas porque são raras demais, outras porque se espalham em quatro respostas e
                  nenhuma manda. Posição espalhada não rende sequência para decorar: rende uma ideia.
                </p>
              </div>

              <ul className="flex flex-col overflow-hidden cartao">
                {notas().map((nota, i) => (
                  <li key={nota.slug} className={i > 0 ? "border-t border-borda-fraca" : ""}>
                    <Link
                      href={`/aberturas/notas/${nota.slug}`}
                      className="foco group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-carta-toque sm:px-5"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium text-tinta">{nota.nome}</span>
                        <span className="text-xs text-tinta-fraca tabular-nums">
                          Você de {nota.cor} · {lancesEmPortugues(nota.lances)}
                        </span>
                      </span>
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        width={18}
                        height={18}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-tinta-muda transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-tinta"
                      >
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <p className="max-w-prose text-xs text-tinta-fraca">
              As linhas vêm dos cursos do clube e do motor, e cada uma diz de onde veio. Na primeira
              vez, o site joga a linha com você e desenha a seta; depois cobra de memória, e o botão
              &ldquo;Dica&rdquo; acende a peça quando você travar.
            </p>
          </div>

          <aside className="hidden flex-col gap-6 lg:sticky lg:top-20 lg:flex">{resumo("lado")}</aside>
        </div>
      </Moldura>
    </>
  );
}
