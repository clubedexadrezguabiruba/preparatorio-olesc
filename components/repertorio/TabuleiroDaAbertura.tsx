import { Chess } from "chess.js";

/**
 * O tabuleirinho da lista de `/aberturas`: a posição que dá nome à abertura (18/9/2026).
 *
 * ## Por que não é o `ChessBoard` nem a `Miniatura` do editor
 *
 * O `ChessBoard` monta um chessground inteiro — worker, observadores, animação — para onze imagens
 * que ninguém vai arrastar. A `Miniatura` do editor desenha com glifos Unicode, que servem para
 * achar um diagrama numa lista do professor, mas não para o aluno reconhecer uma abertura: aqui a
 * peça tem de ser **a mesma do tabuleiro em que ele vai jogar**.
 *
 * Por isso as peças são as do `cburnett.css` do chessground, alcançadas como a paleta do montador
 * faz: o contêiner é um `.cg-wrap`, e cada peça é um `<piece class="papel cor">`, escrito como HTML
 * cru porque o React não conhece a tag. O CSS que desfaz o posicionamento de tabuleiro grande mora
 * em `.tabuleiro-mini`, no `globals.css`.
 *
 * O último lance vai marcado na cor do tabuleiro grande: é ele que faz a posição ser **aquela**
 * abertura, e não a vizinha — 1…e5 2.Cf3 d6 e 2.Cf3 Cf6 só se distinguem por uma casa.
 */
const PAPEL: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export function TabuleiroDaAbertura({
  sans,
  lado,
  className = "",
}: {
  sans: readonly string[];
  /** De que lado o aluno joga: é o lado de baixo do tabuleiro. */
  lado: "brancas" | "pretas";
  className?: string;
}) {
  const jogo = new Chess();
  let ultimo: { from: string; to: string } | null = null;
  for (const san of sans) {
    try {
      ultimo = jogo.move(san);
    } catch {
      // Lance ilegal na vitrine é erro de digitação nosso; o tabuleiro para onde a posição valia.
      break;
    }
  }
  const grade = jogo.board();
  const linhas = lado === "pretas" ? [...grade].reverse().map((l) => [...l].reverse()) : grade;
  const marcadas = new Set(ultimo ? [ultimo.from, ultimo.to] : []);

  return (
    <div aria-hidden className={`cg-wrap tabuleiro-mini ${className}`}>
      {linhas.flatMap((linha, i) =>
        linha.map((casa, j) => {
          // O nome da casa pela posição na tela, desfeita a virada: é o que diz se ela é clara.
          const coluna = lado === "pretas" ? 7 - j : j;
          const fileira = lado === "pretas" ? i + 1 : 8 - i;
          const nome = `${"abcdefgh"[coluna]}${fileira}`;
          const clara = (coluna + fileira) % 2 === 0;
          return (
            <span
              key={nome}
              data-clara={clara || undefined}
              data-ultimo={marcadas.has(nome) || undefined}
              className="tabuleiro-mini-casa"
              dangerouslySetInnerHTML={
                casa
                  ? { __html: `<piece class="${PAPEL[casa.type]} ${casa.color === "w" ? "white" : "black"}"></piece>` }
                  : undefined
              }
            />
          );
        }),
      )}
    </div>
  );
}

/**
 * O peão da cor: o selo de "Você de brancas / de pretas", com a peça de verdade do tabuleiro.
 *
 * O desenho de traço do selo (`IconeDoSelo`) distinguia as cores só por cheio ou vazio, e a 22 px
 * as duas liam como o mesmo boneco. Aqui cada peão fica numa **casa do tabuleiro**, e na casa que o
 * faz saltar: o branco na escura, o preto na clara — como se ele estivesse de pé no jogo.
 */
export function PeaoDaCor({ cor, className = "" }: { cor: "brancas" | "pretas"; className?: string }) {
  return (
    <span
      aria-hidden
      data-cor={cor}
      className={`cg-wrap peao-da-cor ${className}`}
      dangerouslySetInnerHTML={{ __html: `<piece class="pawn ${cor === "brancas" ? "white" : "black"}"></piece>` }}
    />
  );
}
