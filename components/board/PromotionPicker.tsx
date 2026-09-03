"use client";

import type { Color } from "@lichess-org/chessground/types";

const CHOICES = [
  { role: "queen", letter: "q", label: "Dama" },
  { role: "rook", letter: "r", label: "Torre" },
  { role: "bishop", letter: "b", label: "Bispo" },
  { role: "knight", letter: "n", label: "Cavalo" },
] as const;

export type PromotionChoice = (typeof CHOICES)[number]["letter"];

export function PromotionPicker({
  color,
  onChoose,
  onCancel,
}: {
  color: Color;
  onChoose: (piece: PromotionChoice) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-veu backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Escolha a peça da promoção"
    >
      {/* A classe cg-wrap é o que faz os desenhos de peça do chessground valerem aqui dentro. */}
      <div className="cg-wrap flex gap-2 rounded-lg bg-carta p-3 shadow-xl ring-1 ring-borda">
        {CHOICES.map((choice) => (
          <button
            key={choice.letter}
            type="button"
            onClick={() => onChoose(choice.letter)}
            title={choice.label}
            aria-label={choice.label}
            className="relative size-14 rounded-md bg-carta-alta transition hover:bg-carta-toque foco sm:size-16"
            /*
             * A peça entra como HTML cru, e não como JSX, por causa de um erro
             * no console: React 19 reclama de toda tag que ele não conhece e
             * que não tem hífen no nome — "The tag <piece> is unrecognized in
             * this browser" —, e `piece` é exatamente isso. Em dev ele sai
             * como **erro**, não como aviso, e sujava o console de quem fosse
             * depurar outra coisa.
             *
             * A tag tem de ser `piece` mesmo: o seletor do cburnett é
             * `.cg-wrap piece.queen.white`, e é dele que vem o desenho. Trocar
             * por um `<span>` custaria copiar as doze imagens para o nosso
             * CSS, que é a duplicação que este projeto evita em toda parte.
             *
             * Interpolar HTML só é seguro quando não há texto de fora, e não
             * há: `choice.role` vem de uma lista `as const` deste arquivo e
             * `color` é o tipo `Color` do chessground — dois valores, ambos
             * escritos aqui.
             *
             * O estilo em linha é porque a peça do chessground nasce absoluta
             * com 12,5% (o tamanho de uma casa); aqui ela ocupa o botão.
             */
            dangerouslySetInnerHTML={{
              __html:
                `<piece class="${choice.role} ${color}"` +
                ` style="width:100%;height:100%;position:absolute"></piece>`,
            }}
          />
        ))}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 text-sm text-tinta-fraca transition hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
