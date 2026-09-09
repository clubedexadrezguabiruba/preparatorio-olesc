import Link from "next/link";
import { Barra } from "@/components/Barra";
import { PROVA_DE_NIVEL, type FechamentoDoNivel, type Nivel } from "@/lib/curso/nivel";

/**
 * Os três módulos do degrau: tática, finais e repertório.
 *
 * ## O que este arquivo era, e o que ele deixou de fazer
 *
 * Era a `FaixaDoNivel`: um cartão alto que dizia o nível, a faixa FIDE, o
 * resumo, três barras, a prova **e** o próximo passo. Ele fazia bem uma coisa e
 * mal três. Em 2026-09-09 o painel virou treinador e as peças se separaram:
 *
 * - *"o que eu faço agora?"* virou `Agora.tsx`, servido por `proximaAcao()`;
 * - *"onde eu estou?"* virou `Escada.tsx`, a escada dos cinco degraus;
 * - *"quanto falta em cada frente?"* ficou aqui, e é só isto.
 *
 * ## Três barras, e elas contam coisas diferentes
 *
 * Tema fechado, aula aprendida e linha decorada não somam na mesma barra: a
 * primeira é medida pelo servidor puzzle a puzzle, a segunda é certificada pela
 * tablebase, a terceira é uma escada de três dias. É a mesma disciplina da
 * `/trilha` — cada barra escreve embaixo o que ela conta.
 *
 * ## O clamp dos finais aparece na tela, e é isso que o torna honesto
 *
 * O requisito de finais é `min(declarado, publicado)`. Escondê-lo faria o nível
 * 1 fechar com finais em branco e ninguém entenderia por quê; escrevê-lo — *"2
 * de 4 aulas publicadas"* — diz ao aluno que o degrau fecha com o que existe
 * hoje, e que o curso de finais ainda está sendo escrito. Um requisito que
 * encolhe em silêncio é pior que um requisito alto.
 *
 * ## Os dois números soltos vieram parar aqui
 *
 * "Puzzles resolvidos" e "Acerto" ocupavam a posição nobre do painel, logo
 * abaixo do cartão do dia, em dois quadrados sem contexto nenhum. Eles não
 * mudam o que fazer agora — mas dentro do cartão de tática eles significam
 * alguma coisa: são o histórico da frente que a barra está medindo.
 *
 * **O acerto é aviso, e nunca cadeado.** Nenhuma barra aqui cobra piso de
 * acerto, e isso é decisão escrita em `lib/curso/nivel.ts`: quem pune acerto
 * baixo é a fila de revisão, que já existe e já derruba.
 */
export function Modulos({
  fechamento,
  puzzles,
  acerto,
  linhasARevisar,
}: {
  fechamento: FechamentoDoNivel;
  /** Puzzles tentados no curso inteiro. */
  puzzles: number;
  /** Percentual de acerto, ou `null` quando ainda não há tentativa nenhuma. */
  acerto: number | null;
  linhasARevisar: number;
}) {
  return (
    <section aria-labelledby="modulos" className="flex flex-col gap-3">
      <h2 id="modulos" className="rotulo text-tinta-fraca">
        O degrau, em três frentes
      </h2>

      {/* Grade no desktop, empilhados no celular: três cartões numa coluna de
          360 px viram três telas de rolagem, e três numa de 1366 px viram uma
          coluna estreita com dois terços de vazio ao lado. */}
      <ul className="grid gap-3 sm:grid-cols-3">
        <Modulo
          nome="Tática"
          href="/tatica"
          feitos={fechamento.tatica.feitos}
          de={fechamento.tatica.total}
          conta={`${fechamento.tatica.feitos} de ${fechamento.tatica.total} ${
            fechamento.tatica.total === 1 ? "tema" : "temas"
          }`}
          nota={
            puzzles > 0
              ? `${puzzles} ${puzzles === 1 ? "puzzle resolvido" : "puzzles resolvidos"} · ${acerto}% de acerto`
              : "Um tema fecha com as três etapas: aquecimento, série e prova."
          }
        />
        <Modulo
          nome="Finais"
          href="/finais"
          feitos={fechamento.finais.feitos}
          de={fechamento.finais.exigidas}
          conta={
            fechamento.finais.exigidas === 0
              ? "nenhuma ainda"
              : `${fechamento.finais.feitos} de ${fechamento.finais.exigidas} ${
                  fechamento.finais.exigidas === 1 ? "aula" : "aulas"
                }`
          }
          nota={
            fechamento.finais.publicadas < fechamento.finais.declaradas
              ? `${fechamento.finais.publicadas} de ${fechamento.finais.declaradas} aulas publicadas — o nível fecha com o que existe hoje.`
              : "Cada aula é certificada pela tablebase, em três dias diferentes."
          }
        />
        <Modulo
          nome="Repertório"
          href="/aberturas"
          feitos={Math.min(fechamento.repertorio.feitas, fechamento.repertorio.exigidas)}
          de={fechamento.repertorio.exigidas}
          conta={`${fechamento.repertorio.feitas} de ${fechamento.repertorio.exigidas} ${
            fechamento.repertorio.exigidas === 1 ? "linha" : "linhas"
          }`}
          nota={
            linhasARevisar > 0
              ? `${linhasARevisar} ${linhasARevisar === 1 ? "linha vence" : "linhas vencem"} hoje na revisão.`
              : "Quaisquer linhas — quem adiantou repertório atravessa de graça."
          }
          alerta={linhasARevisar > 0}
        />
      </ul>
    </section>
  );
}

function Modulo({
  nome,
  href,
  feitos,
  de,
  conta,
  nota,
  alerta = false,
}: {
  nome: string;
  href: string;
  feitos: number;
  de: number;
  conta: string;
  nota: string;
  alerta?: boolean;
}) {
  // Denominador zero é estado previsto — é o clamp dos finais quando nenhuma
  // aula do nível foi publicada ainda. Ele **não** conta como completo: uma barra
  // verde cheia em "Finais" com zero aula aprendida seria a tela comemorando o
  // vazio. Quem explica o zero é a nota, que diz quantas das declaradas existem.
  const completo = de > 0 && feitos >= de;

  return (
    <li>
      {/* A ordem é título → barra → nota, e a nota leva `mt-auto`.

          Na primeira versão a contagem dividia a linha do título, e a dos finais
          ("nada publicado neste nível") quebrava em duas: a barra daquele cartão
          descia 18 px e a fileira das três entortava no meio. Com o título
          sozinho na primeira linha, as três barras caem no mesmo `y` por
          construção — e o `mt-auto` da nota faz os três cartões terminarem
          juntos por mais linhas que ela ocupe. */}
      <Link href={href} className="cartao-alvo foco flex h-full flex-col gap-2 px-4 py-3.5">
        <span className="flex items-baseline justify-between gap-x-2">
          <span className="text-sm font-semibold text-tinta">{nome}</span>
          <span className="shrink-0 text-xs text-tinta-fraca tabular-nums">{conta}</span>
        </span>
        <Barra feitos={feitos} de={de} tom={completo ? "completo" : "metodo"} />
        <span
          className={`mt-auto text-xs ${alerta ? "font-semibold text-aviso-tinta" : "text-tinta-fraca"}`}
        >
          {nota}
        </span>
      </Link>
    </li>
  );
}

/**
 * O estado da prova, em três formas.
 *
 * A prova é **ofertada só depois** das três trilhas: ela é o selo, não o exame
 * de admissão. E é o único lugar do curso onde o aluno vê um puzzle **sem saber
 * o tema** — as outras quatro medidas de "eu sei isto" (a prova do tema, a
 * tablebase, os degraus do repertório, a fila de revisão) todas dizem qual é o
 * motivo. Na partida ninguém avisa "aqui tem um garfo".
 *
 * ## Ela não repete o botão do "Agora"
 *
 * Quando a prova é a ação do dia, quem a oferece é o cartão AGORA, com o botão
 * grande. Aqui ela aparece **fechada** ("abre quando as três barras encherem")
 * ou **passada** ("o selo é seu") — os dois estados que o AGORA nunca mostra,
 * porque nenhum deles é uma ação. Dois botões para a mesma prova na mesma tela
 * seriam a divergência de 9/9 renascendo por outra porta.
 */
export function Prova({
  nivel,
  fechado,
  conquistado,
}: {
  nivel: Nivel;
  fechado: boolean;
  conquistado: 0 | Nivel;
}) {
  if (conquistado >= nivel) {
    return (
      <p className="rounded-lg bg-metodo-superficie/12 px-3 py-2 text-sm text-metodo-tinta-alta">
        ✓ Prova do nível {nivel} passada. O selo é seu.
      </p>
    );
  }

  if (fechado) return null;

  return (
    <p className="cartao-vazio px-4 py-3 text-sm text-tinta-fraca">
      A prova do nível {nivel} abre quando as três barras encherem. São{" "}
      {PROVA_DE_NIVEL.puzzles} puzzles misturados, sem dizer o tema.
    </p>
  );
}
