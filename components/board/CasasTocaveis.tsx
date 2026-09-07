"use client";

import { useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import type { Orientacao } from "@/lib/diagrama/tabuleiro";

/**
 * As 64 casas do tabuleiro como botões — o caminho do teclado e do leitor de
 * tela para uma resposta que é **uma casa**.
 *
 * ## Por que ela existe
 *
 * O chessground escuta ponteiro: `mousedown` e `touchstart`, e nada mais
 * (`dist/events.js:14-22`). Quem responde com o teclado — porque usa leitor de
 * tela, porque o mouse não obedece, porque está no computador da escola com o
 * touchpad ruim — não tem por onde tocar em d5. E o critério de aceite da §8 do
 * plano é explícito: *a casa é selecionável por teclado*.
 *
 * ## Como ela convive com o tabuleiro em vez de brigar com ele
 *
 * Ela entra pelo `overlay` do {@link ChessBoard}, dentro da `.tabuleiro-camada`
 * — que já é `pointer-events: none` e já está alinhada com as casas de verdade
 * (a receita de `---cg-width`/`round(50%,1px)` que o `globals.css` repete do
 * pacote). O `pointer-events: none` é herdado pelos botões, e é isso que evita
 * dois juízes para o mesmo gesto: **o mouse atravessa** e continua chegando ao
 * `events.select` do chessground; o teclado, que não depende de ponteiro,
 * dispara o `onClick` do botão focado. Duas portas, um `onEscolher`.
 *
 * ## Uma parada de tabulação, e não 64
 *
 * Tabulação roving, como manda a prática de grade: o `Tab` entra numa casa só e
 * as setas andam pelas outras. Com 64 paradas, quem usa teclado passaria por
 * todas elas para chegar ao botão de apoio que está embaixo do tabuleiro.
 *
 * O rótulo diz a casa **e a peça** ("d5, peão preto"), porque para quem não vê
 * o desenho a casa vazia e a casa com peça são a mesma palavra — e metade das
 * respostas do treino é casa vazia.
 */

const COLUNAS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const FILEIRAS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const PECA: Record<string, string> = {
  p: "peão",
  n: "cavalo",
  b: "bispo",
  r: "torre",
  q: "dama",
  k: "rei",
};

export function CasasTocaveis({
  fen,
  orientacao,
  onEscolher,
  descricao,
}: {
  fen: string;
  orientacao: Orientacao;
  onEscolher: (casa: string) => void;
  /** O que a grade é, dito uma vez para quem chega nela pelo teclado. */
  descricao: string;
}) {
  // A ordem visual: da casa do canto superior esquerdo até a do inferior
  // direito, do jeito que o chessground desenha para esta orientação.
  const casas =
    orientacao === "brancas"
      ? FILEIRAS.flatMap((f) => COLUNAS.map((c) => `${c}${f}`))
      : [...FILEIRAS].reverse().flatMap((f) => [...COLUNAS].reverse().map((c) => `${c}${f}`));

  const jogo = new Chess(fen);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const [naTabulacao, setNaTabulacao] = useState(0);

  const andar = (de: number, evento: React.KeyboardEvent) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[evento.key];
    if (passo === undefined) return;
    // Sem dar a volta pela borda: `d1` com seta para baixo fica em `d1`. A volta
    // levaria o foco para o outro lado do tabuleiro, que é desorientador em
    // exatamente o momento em que a pessoa está contando casas.
    const alvo = de + passo;
    if (alvo < 0 || alvo > 63) return;
    if (Math.abs(passo) === 1 && Math.floor(alvo / 8) !== Math.floor(de / 8)) return;
    evento.preventDefault();
    setNaTabulacao(alvo);
    botoes.current[alvo]?.focus();
  };

  return (
    <div role="group" aria-label={descricao} className="grid h-full w-full grid-cols-8">
      {casas.map((casa, i) => {
        const peca = jogo.get(casa as Square);
        return (
          <button
            key={casa}
            type="button"
            ref={(el) => {
              botoes.current[i] = el;
            }}
            tabIndex={i === naTabulacao ? 0 : -1}
            onFocus={() => setNaTabulacao(i)}
            onKeyDown={(e) => andar(i, e)}
            onClick={() => onEscolher(casa)}
            aria-label={
              peca
                ? `${casa}, ${PECA[peca.type]} ${peca.color === "w" ? "branco" : "preto"}`
                : `${casa}, vazia`
            }
            // `focus-visible` e não `focus`: o anel só aparece para quem chegou
            // de teclado. E ele é desenhado **para dentro** (`-inset-px` com
            // borda), porque um `outline` por fora invadiria a casa vizinha e
            // apontaria para a casa errada.
            className="relative size-full rounded-none focus:outline-none focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-foco"
          />
        );
      })}
    </div>
  );
}
