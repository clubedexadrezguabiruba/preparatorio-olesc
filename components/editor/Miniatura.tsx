/**
 * Um tabuleiro do tamanho de um selo, para a lista de diagramas.
 *
 * ## Por que não é o `ChessBoard`
 *
 * O `ChessBoard` monta um chessground: um `Worker` de layout, observadores de
 * redimensionamento, animação de peça, camada de desenho. Treze deles numa
 * coluna, remontados a cada salvamento, seriam a coisa mais cara da tela — e o
 * que se compra com eles é uma imagem de 72 px que ninguém vai arrastar.
 *
 * ## Por que glifos e não as peças do cburnett
 *
 * As peças do tabuleiro grande vêm de imagens embutidas no CSS do pacote,
 * endereçadas por `piece.rei.branco` dentro de um `.cg-wrap`. Alcançá-las daqui
 * exigiria fingir a estrutura do chessground em volta de cada casa. A pergunta
 * que esta miniatura responde é "qual dos treze diagramas é este?", e para essa
 * pergunta o desenho da peça importa menos que a **silhueta da posição** — onde
 * estão as peças, quantas são, de que lado. Os glifos Unicode dão isso.
 *
 * Se um dia a lista virar arrastável (Bloco 2) e o Doug achar o selo pobre, a
 * troca é local: só este arquivo sabe como uma casa é desenhada.
 */

const GLIFO: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

/** As 64 casas da FEN, da a8 à h1, `null` onde está vazio. */
function casas(fen: string): Array<string | null> {
  const tabuleiro = fen.split(" ")[0] ?? "";
  const saida: Array<string | null> = [];
  for (const c of tabuleiro) {
    if (c === "/") continue;
    if (c >= "1" && c <= "8") {
      for (let i = 0; i < Number(c); i += 1) saida.push(null);
    } else {
      saida.push(c);
    }
  }
  // FEN quebrada não pode derrubar a lista de diagramas: o professor pode estar
  // no meio de montar uma posição. Completa-se com vazio e desenha-se o que há.
  while (saida.length < 64) saida.push(null);
  return saida.slice(0, 64);
}

export function Miniatura({
  fen,
  orientation = "white",
  tamanho = 72,
}: {
  fen: string;
  orientation?: "white" | "black";
  tamanho?: number;
}) {
  const grade = casas(fen);
  const ordenadas = orientation === "black" ? [...grade].reverse() : grade;

  return (
    <div
      className="grid shrink-0 grid-cols-8 overflow-hidden rounded-sm border border-borda-fraca"
      style={{ width: tamanho, height: tamanho }}
      aria-hidden
    >
      {ordenadas.map((peca, i) => {
        const linha = Math.floor(i / 8);
        const coluna = i % 8;
        const clara = (linha + coluna) % 2 === 0;
        return (
          <span
            key={i}
            className="flex items-center justify-center leading-none"
            style={{
              // As mesmas duas casas do tabuleiro grande, pelos tokens — o
              // selo tem de parecer o tabuleiro, não um segundo tabuleiro.
              background: `var(${clara ? "--color-casa-clara" : "--color-casa-escura"})`,
              fontSize: tamanho / 8.5,
              // O glifo preto e o branco são desenhos diferentes, não a mesma
              // forma em duas cores — então a cor aqui é só contraste contra a
              // casa, e não a identidade da peça.
              color: "oklch(20% 0 0)",
            }}
          >
            {peca ? GLIFO[peca] : ""}
          </span>
        );
      })}
    </div>
  );
}
