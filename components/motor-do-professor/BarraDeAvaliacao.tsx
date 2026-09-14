"use client";

import { useOrientacaoDaVista } from "@/components/atalhos/Atalhos";

/**
 * A barra de avaliação ao lado do tabuleiro (§23 e §23.1).
 *
 * **O vão é sempre reservado.** Desligada, a barra continua ocupando os mesmos 14 px,
 * vazia e apagada: se ela nascesse ao ligar, o tabuleiro encolheria na hora e cada peça
 * pularia de lugar debaixo do mouse do professor.
 *
 * Acompanha a orientação, como no Lichess: o branco fica do lado das brancas do
 * tabuleiro — embaixo com as brancas embaixo, em cima com o tabuleiro virado.
 *
 * É `aria-hidden`: o número que ela desenha está escrito por extenso na faixa do motor, e
 * o leitor de tela o ouve lá. Duas leituras do mesmo número seriam ruído.
 *
 * Desligada, a borda é tracejada e o fundo transparente: com fundo escuro e borda cheia ela
 * se parecia com a trilha de rolagem da coluna ao lado (conferido na captura da 9F).
 */
export function BarraDeAvaliacao({ altura, orientacao }: {
  /** Quanto é branco, 0–100; `null` com o motor desligado ou ainda sem número. */
  altura: number | null;
  orientacao: "white" | "black";
}) {
  const ligada = altura !== null;
  const vista = useOrientacaoDaVista(orientacao);
  return (
    <div
      aria-hidden
      data-motor="barra"
      className={`relative w-3.5 shrink-0 self-stretch overflow-hidden rounded-sm border ${ligada ? "border-borda-forte bg-tinta-inversa" : "border-dashed border-borda bg-transparent"}`}
    >
      {ligada ? (
        <div
          className={`absolute inset-x-0 bg-tinta transition-[height] duration-300 ease-out motion-reduce:transition-none ${vista === "white" ? "bottom-0" : "top-0"}`}
          style={{ height: `${altura}%` }}
        />
      ) : null}
      {/* O meio: é onde "igual" mora, e sem a marca a barra quase cheia e a quase vazia
          não têm referência. */}
      <div className={`absolute inset-x-0 top-1/2 h-px ${ligada ? "bg-tinta-muda" : "bg-borda-fraca"}`} />
    </div>
  );
}
