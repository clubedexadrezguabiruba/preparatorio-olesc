import Link from "next/link";
import type { Acao } from "@/lib/curso/acao";

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
export function Agora({ acao }: { acao: Acao }) {
  return (
    <section
      aria-labelledby="agora"
      className="cartao flex flex-col gap-3 border-metodo-cheio px-4 py-4 sm:px-5 sm:py-5"
    >
      <h2 id="agora" className="rotulo text-metodo-tinta">
        Agora
      </h2>

      <p className="titulo text-tinta">{acao.titulo}</p>
      <p className="text-sm leading-relaxed text-tinta-media">{acao.motivo}</p>

      {acao.href ? (
        <Link
          href={acao.href}
          className="foco mt-1 flex min-h-12 items-center justify-center rounded-xl bg-metodo-cheio px-4 text-base font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque sm:w-fit sm:min-w-64 sm:px-8"
        >
          {acao.botao}
        </Link>
      ) : null}
    </section>
  );
}
