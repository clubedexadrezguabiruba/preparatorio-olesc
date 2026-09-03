import { Chess } from "chess.js";
import type { ChavePeca } from "./extrair.ts";
import { LADO_PECA } from "./extrair.ts";
import { PECAS } from "./pecas.ts";

/**
 * FEN → SVG, no servidor, para o diagrama impresso da apostila.
 *
 * **Por que não reaproveitar o `ChessBoard` da tela.** O chessground é um
 * componente de navegador: monta `<div>`s posicionados por CSS, lê
 * `getComputedStyle`, e pinta as peças como `background-image`. Nada disso
 * sobrevive a um `page.pdf()` de um HTML estático — e mesmo que sobrevivesse,
 * imprimir a tela traria as cores da tela. O papel quer o contrário: um
 * arquivo só, sem JavaScript, em tons que o laser P&B da escola separa.
 *
 * O que é reaproveitado é o que importa: **os desenhos das peças** (`pecas.ts`,
 * derivados do mesmo chessground) e o **juiz da posição** (chess.js, o mesmo
 * que confere o puzzle). Tela e papel mostram o mesmo cavalo na mesma casa.
 *
 * ## A paleta é de tinta, não de tela
 *
 * As casas não são as marrons do site. Casa clara é o branco do papel — tinta
 * que não se gasta — e casa escura é um cinza de ~21% de cobertura, o mesmo
 * registro dos livros de xadrez impressos. A conta que justifica o número está
 * em `tabuleiro.test.ts`, e ela é medida, não estimada:
 *
 * - a peça **preta** tem de se separar da casa escura (senão o rei preto some
 *   no canto do tabuleiro);
 * - a peça **branca** não se separa da casa clara por preenchimento nenhum —
 *   quem a desenha é o **traço** preto de 1,5 do cburnett. Então é o traço que
 *   é medido contra as duas casas;
 * - e as duas casas têm de se separar uma da outra, ou o tabuleiro vira uma
 *   folha lisa.
 *
 * Nenhum desses três é opinião: os três reprovam em teste.
 */

/** Casa clara: o papel. Não gasta tinta e é o branco mais branco que existe. */
export const CASA_CLARA = "#ffffff";
/** Casa escura: cinza de ~21%, o registro dos diagramas de livro impresso. */
export const CASA_ESCURA = "#c9c9c9";
/** Traço da borda, das coordenadas e do contorno das peças cburnett. */
export const TINTA = "#000000";

/** O lado de uma casa. É o da peça: escala 1, sem arredondamento pelo caminho. */
export const LADO_CASA = LADO_PECA;
/**
 * ## A marca de lado que foi tentada, e por que ela saiu
 *
 * Houve aqui um rei miúdo desenhado fora da moldura, na cor de quem está
 * embaixo, para dizer em desenho que o tabuleiro está virado. A conferência
 * mediu e reprovou, por duas razões que valem ficar escritas:
 *
 * - **Ele lê como peça, não como legenda.** Ficava a 1,06 mm da moldura — um
 *   nono de casa — com 58% do tamanho de uma peça e no mesmo desenho delas. Um
 *   enxadrista lê peça encostada no tabuleiro como *peça capturada posta ao
 *   lado*. E num diagrama de "ache o mate", um segundo rei preto a um milímetro
 *   da borda é um chamariz encostado no exato objeto que a criança está caçando.
 * - **O rei é o pior par tonal do jogo** (1,45× de tinta, contra 2,8× do peão),
 *   e reduzido a 4 mm os traços caíam para 0,088 mm — a cópia de segunda geração
 *   o transformaria num borrão de 4 mm sem coroa nem cruz.
 *
 * Um símbolo de legenda não pode ser membro do conjunto que ele descreve.
 * Trocar por losango resolveria o tom, mas custaria uma convenção nova para o
 * aluno aprender. A saída foi mais simples e é a dos livros impressos: **a
 * palavra, logo abaixo das coordenadas**, em semibold — "Pretas jogam —
 * tabuleiro virado." Fica encostada na borda de baixo, que é para onde o olho
 * vai quando conta casa, e não pede convenção nenhuma.
 */

/**
 * Sobra para as coordenadas, em volta do tabuleiro.
 *
 * Cresceu de 20 para 22 quando as coordenadas subiram de corpo: a 7 pt elas
 * eram o menor elemento da folha, e o menor elemento é o primeiro a fechar
 * numa fotocópia de segunda geração — justo o elemento que o aluno tem de ler
 * letra por letra para escrever o lance.
 */
export const MARGEM = 22;
/** Espessura da moldura. */
export const BORDA = 1.5;

const COLUNAS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export type Orientacao = "brancas" | "pretas";

export type OpcoesDiagrama = {
  /** De que lado o aluno olha. O padrão é o lado de quem tem a vez na FEN. */
  readonly orientacao?: Orientacao;
  /** Letras e números em volta. Ligado por padrão: o caderno pede o lance escrito. */
  readonly coordenadas?: boolean;
  /** Vira `<title>` — o que um leitor de tela leria, se o SVG for reusado na tela. */
  readonly titulo?: string;
};

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * O lado que joga, lido da FEN. É o padrão da orientação porque um diagrama de
 * puzzle sempre se olha do lado de quem tem de achar o lance.
 */
export function ladoDaVez(fen: string): Orientacao {
  return new Chess(fen).turn() === "w" ? "brancas" : "pretas";
}

/**
 * O diagrama, como um SVG autocontido — sem fonte externa, sem script, sem
 * referência a arquivo. É colável dentro do HTML que vira PDF.
 */
export function diagrama(fen: string, opcoes: OpcoesDiagrama = {}): string {
  const jogo = new Chess(fen); // FEN inválida estoura aqui, não no PDF.
  const orientacao = opcoes.orientacao ?? (jogo.turn() === "w" ? "brancas" : "pretas");
  const comCoordenadas = opcoes.coordenadas ?? true;
  const daVezDasBrancas = orientacao === "brancas";

  const margem = comCoordenadas ? MARGEM : BORDA;
  const tabuleiro = LADO_CASA * 8;
  const total = tabuleiro + margem * 2;

  const partes: string[] = [];

  /** Coluna e linha na tela (0 = canto superior esquerdo), a partir do arquivo/fileira. */
  const naTela = (arquivo: number, fileira: number) =>
    daVezDasBrancas
      ? { coluna: arquivo, linha: 7 - fileira }
      : { coluna: 7 - arquivo, linha: fileira };

  // As casas. `crispEdges` porque um quadriculado antisserrilhado imprime com
  // uma costura clara entre as casas escuras vizinhas.
  for (let arquivo = 0; arquivo < 8; arquivo += 1) {
    for (let fileira = 0; fileira < 8; fileira += 1) {
      const { coluna, linha } = naTela(arquivo, fileira);
      const clara = (arquivo + fileira) % 2 === 1;
      partes.push(
        `<rect x="${margem + coluna * LADO_CASA}" y="${margem + linha * LADO_CASA}"` +
          ` width="${LADO_CASA}" height="${LADO_CASA}"` +
          ` fill="${clara ? CASA_CLARA : CASA_ESCURA}" shape-rendering="crispEdges"/>`,
      );
    }
  }

  // A moldura. Fica **por cima** das casas, meia espessura para dentro, para
  // não engordar a caixa nem comer a primeira fileira.
  partes.push(
    `<rect x="${margem + BORDA / 2}" y="${margem + BORDA / 2}"` +
      ` width="${tabuleiro - BORDA}" height="${tabuleiro - BORDA}"` +
      ` fill="none" stroke="${TINTA}" stroke-width="${BORDA}"/>`,
  );

  if (comCoordenadas) {
    // 15 unidades num tabuleiro de 84 mm dão ~8,8 pt no papel, e o semibold
    // engorda o traço o bastante para a letra sobreviver à cópia. Sem serifa,
    // porque sans aguenta baixa resolução melhor que serifada de traço fino.
    const fonte =
      `font-family="'Segoe UI', Arial, 'Liberation Sans', sans-serif"` +
      ` font-size="15" font-weight="600" fill="${TINTA}"`;
    for (let i = 0; i < 8; i += 1) {
      const { coluna } = naTela(i, 0);
      partes.push(
        `<text x="${margem + coluna * LADO_CASA + LADO_CASA / 2}" y="${margem + tabuleiro + 16}"` +
          ` text-anchor="middle" ${fonte}>${COLUNAS[i]}</text>`,
      );
      const { linha } = naTela(0, i);
      partes.push(
        `<text x="${margem - 8}" y="${margem + linha * LADO_CASA + LADO_CASA / 2 + 5}"` +
          ` text-anchor="end" ${fonte}>${i + 1}</text>`,
      );
    }
  }

  // As peças, por último: nada as cobre.
  for (const fileiraDoTabuleiro of jogo.board()) {
    for (const casa of fileiraDoTabuleiro) {
      if (casa === null) continue;
      const arquivo = casa.square.charCodeAt(0) - "a".charCodeAt(0);
      const fileira = Number(casa.square[1]) - 1;
      const { coluna, linha } = naTela(arquivo, fileira);
      const chave = `${casa.color}${casa.type}` as ChavePeca;
      partes.push(
        `<g transform="translate(${margem + coluna * LADO_CASA} ${margem + linha * LADO_CASA})">` +
          `${PECAS[chave]}</g>`,
      );
    }
  }

  const titulo =
    opcoes.titulo === undefined ? "" : `<title>${escapar(opcoes.titulo)}</title>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"` +
    ` role="img" class="diagrama">${titulo}${partes.join("")}</svg>`
  );
}
