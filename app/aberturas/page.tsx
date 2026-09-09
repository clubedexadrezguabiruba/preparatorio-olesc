import type { Metadata } from "next";
import Link from "next/link";
import { Barra } from "@/components/Barra";
import { perfilAtual } from "@/lib/auth/perfil";
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
  const perfil = await perfilAtual();
  const [indice, progresso, conquistado] = await Promise.all([
    lerIndice(),
    progressoDoRepertorio(),
    nivelConquistado(perfil.id),
  ]);
  const nivel = nivelDoAluno(conquistado);

  const agora = new Date().toISOString();
  // O portão: enquanto o Base não fecha, as linhas do Avançado não entram em
  // conta nenhuma desta tela — nem no total, nem na barra, nem no "a revisar".
  // Contá-las daria ao aluno um denominador que ele não pode alcançar.
  const destravado = baseCompleto(progresso, indice);
  const aprendidas = indice.reduce(
    (soma, e) => soma + aprendidasDaAbertura(progresso, e, destravado),
    0,
  );
  const aRevisar = indice.reduce(
    (soma, e) => soma + aRevisarNaAbertura(progresso, e, agora, destravado),
    0,
  );
  const total = indice.reduce((soma, e) => soma + idsLiberados(e, destravado).length, 0);
  const faltam = faltamNoBase(progresso, indice);
  const noAvancado = quantasNoAvancado(indice);

  /*
   * O alvo do degrau — a única coisa que os níveis mudaram nesta tela.
   *
   * O repertório entra no portão do nível: 4 linhas por degrau, **em
   * acumulado**, quaisquer que sejam. Escrever o alvo aqui, ao lado da
   * contagem que o aluno já lê, é o que impede a pergunta "quantas eu preciso?"
   * de ter duas respostas em duas telas.
   *
   * O nível 5 é o único que não usa o número: ele cobra o Base inteiro, que é
   * o mesmo `baseCompleto` que já destrava o Avançado aqui em cima. Fechar o
   * degrau 5 e abrir o Avançado são o mesmo evento.
   */
  const alvoDoNivel = nivel === 5 ? null : LINHAS_POR_NIVEL * nivel;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/painel" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Painel
        </Link>
        <h1 className="titulo text-tinta">Repertório do clube</h1>
        <p className="text-sm text-tinta-media">
          {total} linhas, cada uma até o roque e as peças fora. Uma linha é aprendida quando
          você a acerta{" "}
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
        <p className="text-sm text-tinta-media tabular-nums">
          {alvoDoNivel === null
            ? `O nível 5 pede o Base inteiro — as ${total} linhas.`
            : `O nível ${nivel} pede ${alvoDoNivel}${
                aprendidas >= alvoDoNivel ? " — feito." : `; faltam ${alvoDoNivel - aprendidas}.`
              }`}
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
                const visiveis = idsLiberados(abertura, destravado).length;
                // Uma abertura inteiramente de Avançado some da lista enquanto o
                // portão está fechado: um cartão "0/0" não é informação, é ruído.
                if (visiveis === 0) return null;
                const feitas = aprendidasDaAbertura(progresso, abertura, destravado);
                const vencendo = aRevisarNaAbertura(progresso, abertura, agora, destravado);
                const completa = feitas >= visiveis && vencendo === 0;

                return (
                  <li key={`${cor}/${abertura.abertura}`}>
                    <Link
                      href={`/aberturas/${cor}/${abertura.abertura}`}
                      className="foco flex items-center gap-3 cartao-alvo px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="truncate text-sm font-medium text-tinta">{abertura.nome}</p>
                        <Barra
                          feitos={feitas}
                          de={visiveis}
                          tom={completa ? "completo" : "metodo"}
                        />
                      </div>
                      <div className="flex w-20 shrink-0 flex-col items-end">
                        <span className="text-sm font-semibold text-tinta tabular-nums">
                          {feitas}
                          <span className="text-tinta-muda">/{visiveis}</span>
                        </span>
                        <span
                          className={`text-xs ${vencendo > 0 ? "text-aviso-tinta" : "text-tinta-fraca"}`}
                        >
                          {vencendo > 0
                            ? `${vencendo} a revisar`
                            : completa
                              ? "em dia"
                              : visiveis === 1
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
       * O Avançado, e o portão que o abre
       *
       * Aparece **trancado**, e não escondido, por decisão do professor em
       * 7/9/2026: *"só desbloqueia quando o aluno terminou todas as linhas com
       * acerto"*. Um bloco invisível não é recompensa — o aluno precisa ver o
       * que está ganhando e o quanto falta, senão o portão só o atrapalha.
       *
       * Some de vez quando não há linha de Avançado nenhuma: aí não há portão,
       * e anunciar um prêmio vazio seria pior que o silêncio.
       * ------------------------------------------------------------------ */}
      {noAvancado > 0 && !destravado ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-tinta">Avançado — ainda trancado</h2>
            <p className="text-xs text-tinta-fraca">
              Mais {noAvancado === 1 ? "1 linha" : `${noAvancado} linhas`}: os ramos que as de
              cima deixaram de lado, para quem já sabe o resto. Elas abrem sozinhas quando{" "}
              <strong>todas</strong> as {total} linhas de cima estiverem aprendidas.
            </p>
          </div>

          <div className="flex items-center gap-3 cartao-vazio px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="truncate text-sm font-medium text-tinta-fraca">
                {faltam === 1 ? "Falta 1 linha do Base" : `Faltam ${faltam} linhas do Base`}
              </p>
              <Barra feitos={total - faltam} de={total} />
            </div>
            <span className="shrink-0 text-sm font-semibold text-tinta-muda tabular-nums">
              {total - faltam}
              <span className="text-tinta-muda">/{total}</span>
            </span>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------------ *
       * As que não viraram linha
       *
       * Ficam no fim, e não misturadas às aberturas, porque não têm treino: são
       * texto. Escondê-las seria pior — o aluno encontra um 1…d6 por torneio, e
       * o bispo em c4 em quase um terço das sicilianas.
       *
       * **Não chame o bloco de "as raras".** Quatro são; a do bispo em c4 é o
       * contrário — ~31 % das sicilianas, a posição mais frequente do repertório
       * inteiro. Ela está aqui por não ter teoria, e não por ser rara. Cada nota
       * diz o seu próprio motivo no campo `porque`, e é por isso que ele existe.
       * ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-tinta">Sem linha para decorar</h2>
          <p className="text-xs text-tinta-fraca">
            Algumas porque são raras demais, outras porque se espalham em quatro respostas
            e nenhuma manda. Posição espalhada não rende sequência para decorar: rende uma
            ideia. Em vez de lances, o que fazer — escrito.
          </p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {notas().map((nota) => (
            <li key={nota.slug}>
              <Link
                href={`/aberturas/notas/${nota.slug}`}
                className="foco flex flex-col gap-1 cartao-alvo px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm text-tinta">{nota.nome}</span>
                  <span className="text-xs text-tinta-muda">Você de {nota.cor}</span>
                </span>
                <span className="text-xs text-tinta-fraca tabular-nums">
                  {lancesEmPortugues(nota.lances)}
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
