import Link from "next/link";
import { IconeDoSelo } from "@/components/selos/Medalha";
import { COR_DO_NIVEL } from "@/components/tatica/SeloDoTema";
import type { Acao, TipoDeAcao } from "@/lib/curso/acao";
import type { Nivel } from "@/lib/curso/nivel";
import type { Familia } from "@/lib/curso/selos";

/**
 * **AGORA** — o primeiro elemento da página, e a única coisa que ela manda fazer.
 *
 * ## A régua que este cartão obedece
 *
 * *Isto não é um painel de curso. É um treinador.* Um painel mostra tudo o que
 * existe; um treinador diz o que fazer, mostra por quê, e deixa o resto
 * alcançável sem disputar atenção.
 *
 * Até 2026-09-09 o painel tinha oito seções, ~48 links e **três** respostas
 * simultâneas para "o que eu faço agora?" — o "Próximo passo" do nível, o passo
 * 1 do cartão Hoje e o passo 2, todos corretos segundo funções diferentes.
 * Aqui há uma, e quem a decide é `proximaAcao()`, que é função pura e testada.
 *
 * ## Por que o motivo vem escrito, e não é enfeite
 *
 * "Faça isto" sem porquê é uma ordem, e ordem não ensina. O aluno que lê *"são
 * puzzles que você já acertou e que estão vencendo agora"* aprende a regra da
 * repetição espaçada de graça, no momento em que ela o afeta — e da terceira vez
 * ele já não precisa do site para saber por que a revisão vem antes.
 *
 * O texto mora em `lib/curso/acao.ts`, junto com a decisão. A tela que escreve a
 * própria frase é a tela que discorda da outra.
 *
 * ## Um botão, e ele é grande
 *
 * O alvo tem altura de toque de dedo de criança e ocupa a largura do cartão **no
 * celular**. No desktop ele para de crescer: esticado a 590 px ele deixa de ler
 * como botão e passa a ler como faixa, e uma faixa não parece clicável.
 *
 * Não há segundo botão: um "ou faça isto" ao lado devolveria ao aluno a escolha
 * que ele abriu o site para não ter de fazer. O resto do site continua a um
 * toque, na barra de baixo.
 */
export function Agora({ acao, nivel }: { acao: Acao; nivel: Nivel }) {
  const cor = COR_DO_NIVEL[nivel];
  return (
    // **No metal do degrau, como a faixa da `/trilha` (18/9/2026).** O cartão era cinza com
    // uma borda verde, e o rótulo "AGORA" em caixa alta em cima do título — o único cartão
    // do site com esse desenho. Agora ele é a faixa do nível atual, com o medalhão da
    // frente (tática, finais, repertório) e o botão verde com lábio de `/finais`: é a
    // mesma peça que o aluno já aperta lá para "Começar" uma aula.
    <section
      aria-labelledby="agora"
      className={`trilha-faixa metal-${nivel} flex flex-col gap-4 px-5 py-5 sm:px-6`}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={`trilha-no metal-${nivel} shrink-0`}
          style={{ "--lado": "3.5rem" } as React.CSSProperties}
        >
          <IconeDoSelo familia={FAMILIA[acao.tipo]} tamanho={26} />
        </span>
        <h2
          id="agora"
          className={`min-w-0 flex-1 font-serif text-2xl leading-tight font-semibold text-pretty sm:text-3xl ${cor.tinta}`}
        >
          {acao.titulo}
        </h2>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-tinta-media">
        {acao.motivo}
      </p>

      {acao.href ? (
        <Link href={acao.href} className="foco block rounded-xl sm:w-fit">
          {/* `py` e não `flex items-center`: o `.finais-botao` declara `display: block` fora
              das camadas do Tailwind, e ele ganha de qualquer `flex` utilitário. */}
          <span className="finais-botao px-6 py-3.5 text-center text-sm font-bold tracking-wide uppercase sm:min-w-64">
            {acao.botao}
          </span>
        </Link>
      ) : null}
    </section>
  );
}

/** O desenho do medalhão: a frente de onde a ação vem, com os ícones dos selos. */
const FAMILIA: Record<TipoDeAcao, Familia> = {
  "revisao-tatica": "tatica",
  tema: "tatica",
  "revisao-finais": "finais",
  aula: "finais",
  linha: "repertorio",
  prova: "nivel",
  nada: "constante",
};
