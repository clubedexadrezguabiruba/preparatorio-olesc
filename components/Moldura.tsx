/**
 * A moldura da página: a coluna centrada em que o conteúdo mora.
 *
 * ## Três larguras, e não uma
 *
 * Havia **cinco** larguras espalhadas por 18 páginas (`max-w-sm`, `xl`, `2xl`,
 * `3xl`, `4xl`), com quatro combinações diferentes de respiro e de espaçamento
 * entre blocos, nenhuma delas decidida — a segunda tela copiou a primeira.
 *
 * A meta não é *uma* moldura: é **poucas e intencionais**. Três larguras, e cada
 * uma responde a uma pergunta diferente:
 *
 * - **`leitura`** — uma coluna de texto que alguém lê de cima a baixo. A largura
 *   é a de linha confortável, e é por isso que ela não cresce no desktop: linha
 *   longa demais faz o olho perder a volta.
 * - **`painel`** — uma tela de listas e cartões, que se percorre com o polegar.
 *   Um degrau mais larga, porque dois cartões lado a lado no desktop cabem aqui
 *   e não cabem na de leitura.
 * - **`larga`** — o relatório do professor e a trilha inteira: tabela e grade,
 *   onde a informação é bidimensional e cortar colunas custa mais que a linha
 *   longa custa.
 *
 * **O palco da aula fica de fora, de propósito.** Ele tem uma invariante própria
 * — altura fechada, o tabuleiro medido pela altura da janela — e a moldura dele
 * mora em `app/globals.css` com o resto do palco. Trazê-lo para cá seria juntar
 * duas regras que só coincidem no `mx-auto`.
 */

const LARGURA = {
  leitura: "max-w-xl",
  painel: "max-w-2xl",
  larga: "max-w-4xl",
} as const;

export type LarguraDaMoldura = keyof typeof LARGURA;

export function Moldura({
  largura = "painel",
  barraInferior = false,
  className = "",
  children,
}: {
  largura?: LarguraDaMoldura;
  /**
   * A tela tem a barra de navegação fixa embaixo (celular)? Então o conteúdo
   * precisa de respiro para não terminar debaixo dela.
   *
   * É um parâmetro, e não um padrão: as telas de aula e as de fora do login não
   * têm barra, e um respiro de 5 rem no fim de um palco de altura fechada
   * roubaria justamente o pixel que aquela tela conta.
   */
  barraInferior?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-8 px-5 py-8 ${LARGURA[largura]} ${
        barraInferior ? "pb-24 sm:pb-10" : ""
      } ${className}`}
    >
      {children}
    </main>
  );
}
