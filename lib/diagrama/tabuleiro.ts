import { Chess } from "chess.js";
import type { ChavePeca } from "./extrair.ts";
import { PECAS } from "./pecas.ts";

/**
 * O lado do quadrado em que a peça cburnett foi desenhada.
 *
 * É o mesmo `LADO_PECA` de `extrair.ts`, e está repetido aqui de propósito: lá
 * ele mora ao lado de um `readFileSync`, e importar o valor de lá arrastaria
 * `node:fs` para dentro de todo componente de servidor que desenhe um
 * diagrama. `tabuleiro.test.ts` confere que os dois números continuam iguais —
 * é a cópia que o teste vigia, não a que se descobre quebrada em produção.
 */
const LADO_PECA = 45;

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

/**
 * As três cores do diagrama.
 *
 * O padrão é o do **papel** (§ acima): casa clara é o branco da folha, escura é
 * o cinza de 21%. A tela passa os tokens do site em `var(--color-…)`, e ganha
 * o mesmo tabuleiro morno que o chessground desenha na aula — em vez de um
 * diagrama cinza colado numa página que não é cinza.
 *
 * Isto é um parâmetro e não um segundo módulo porque a **geometria** é a mesma:
 * duplicar o desenho para trocar três cores seria duas opiniões sobre onde fica
 * a casa d4, e a divergência só apareceria com o aluno comparando a tela com a
 * apostila.
 */
export type Paleta = {
  readonly clara: string;
  readonly escura: string;
  readonly tinta: string;
};

/** A paleta do site, em tokens. Só serve dentro de um HTML que os define. */
export const PALETA_DA_TELA: Paleta = {
  clara: "var(--color-casa-clara)",
  escura: "var(--color-casa-escura)",
  tinta: "var(--color-coordenada)",
};

/**
 * ## O realce, e por que ele não tem cor própria
 *
 * O comentário da paleta em `app/globals.css` mede o orçamento: toda marca de
 * tabuleiro tem de ser **mais escura** que as duas casas para bater 3:1 contra
 * as duas, e a faixa inteira em que uma marca pode viver tem 2,26:1 de ponta a
 * ponta. Foi ela que matou o realce amarelo-claro que o chessground traz — 1,50:1,
 * invisível para quem precisa dele.
 *
 * Então o realce aqui é **a tinta do próprio diagrama** (a mesma da moldura e
 * das coordenadas), e quem carrega o sentido é a **forma**: um aro grosso por
 * dentro da casa. Três consequências, e as três são o motivo:
 *
 * - nenhuma cor nova entra na paleta sem ter sido medida;
 * - o critério de acessibilidade da §8 do plano — "o realce tem forma além de
 *   cor" — é atendido por construção, não por acréscimo;
 * - o mesmo desenho serve o papel, onde só há preto.
 *
 * O aro fica **por baixo das peças** e por dentro da casa: ele não cobre a peça
 * que o aluno precisa identificar, e não engorda a casa vizinha.
 */
export type OpcoesDiagrama = {
  /** De que lado o aluno olha. O padrão é o lado de quem tem a vez na FEN. */
  readonly orientacao?: Orientacao;
  /** Letras e números em volta. Ligado por padrão: o caderno pede o lance escrito. */
  readonly coordenadas?: boolean;
  /** Vira `<title>` — o que um leitor de tela leria, se o SVG for reusado na tela. */
  readonly titulo?: string;
  /** As três cores. O padrão é o papel; a tela passa `PALETA_DA_TELA`. */
  readonly paleta?: Paleta;
  /**
   * As casas a acender, em `e4`. Autoral: quem escreve o passo diz o que ele
   * cita. **Não é extraído do texto por expressão regular** — acender as 136
   * referências das 30 dicas aumentaria a carga em vez de baixá-la.
   */
  readonly realce?: readonly string[];
};

/** Espessura do aro do realce, em unidades de casa (45). */
const REALCE = 3.5;

/** Margem e lado total, dado se o diagrama leva coordenadas. */
function medidas(comCoordenadas: boolean): { margem: number; total: number } {
  const margem = comCoordenadas ? MARGEM : BORDA;
  return { margem, total: LADO_CASA * 8 + margem * 2 };
}

/** Coluna e linha na tela (0 = canto superior esquerdo), a partir da casa. */
function naTela(casa: string, orientacao: Orientacao): { coluna: number; linha: number } {
  if (!/^[a-h][1-8]$/.test(casa)) {
    throw new Error(`"${casa}" não é casa do tabuleiro (formato \`e4\`)`);
  }
  const arquivo = casa.charCodeAt(0) - "a".charCodeAt(0);
  const fileira = Number(casa[1]) - 1;
  return orientacao === "brancas"
    ? { coluna: arquivo, linha: 7 - fileira }
    : { coluna: 7 - arquivo, linha: fileira };
}

/** Os aros das casas acesas, na geometria do diagrama. */
function aros(
  casas: readonly string[],
  orientacao: Orientacao,
  margem: number,
  cor: string,
): string[] {
  return casas.map((casa) => {
    const { coluna, linha } = naTela(casa, orientacao);
    return (
      `<rect x="${margem + coluna * LADO_CASA + REALCE / 2}"` +
      ` y="${margem + linha * LADO_CASA + REALCE / 2}"` +
      ` width="${LADO_CASA - REALCE}" height="${LADO_CASA - REALCE}"` +
      ` fill="none" stroke="${cor}" stroke-width="${REALCE}" class="realce"/>`
    );
  });
}

/**
 * Só a camada dos aros, num SVG com **o mesmo `viewBox`** do diagrama.
 *
 * Existe por uma conta de bytes. A dica tem até três passos, e cada passo
 * acende casas diferentes; redesenhar o tabuleiro inteiro por passo custaria
 * 24,7 KB de marcação por passo — 74 KB numa página que a criança abre no dado
 * móvel dela. A camada custa algumas centenas de bytes, e quem troca de passo
 * troca de camada.
 *
 * O `viewBox` compartilhado é o que garante o alinhamento: as duas peças de
 * marcação passam pela mesma `medidas()` e pelo mesmo `naTela()`, então não há
 * duas opiniões sobre onde fica d4 — que é exatamente o erro que uma sobreposição
 * feita à mão em porcentagem de CSS produziria na primeira mudança de margem.
 */
export function camadaDeRealce(
  casas: readonly string[],
  opcoes: { orientacao: Orientacao; coordenadas?: boolean; paleta?: Paleta } = {
    orientacao: "brancas",
  },
): string {
  const { margem, total } = medidas(opcoes.coordenadas ?? true);
  const cor = (opcoes.paleta ?? { clara: CASA_CLARA, escura: CASA_ESCURA, tinta: TINTA }).tinta;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"` +
    ` aria-hidden="true" class="camada-realce">${aros(casas, opcoes.orientacao, margem, cor).join("")}</svg>`
  );
}

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
  const paleta = opcoes.paleta ?? { clara: CASA_CLARA, escura: CASA_ESCURA, tinta: TINTA };
  const daVezDasBrancas = orientacao === "brancas";

  const { margem, total } = medidas(comCoordenadas);
  const tabuleiro = LADO_CASA * 8;

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
          ` fill="${clara ? paleta.clara : paleta.escura}" shape-rendering="crispEdges"/>`,
      );
    }
  }

  // A moldura. Fica **por cima** das casas, meia espessura para dentro, para
  // não engordar a caixa nem comer a primeira fileira.
  partes.push(
    `<rect x="${margem + BORDA / 2}" y="${margem + BORDA / 2}"` +
      ` width="${tabuleiro - BORDA}" height="${tabuleiro - BORDA}"` +
      ` fill="none" stroke="${paleta.tinta}" stroke-width="${BORDA}"/>`,
  );

  // O realce, entre a moldura e as peças: por baixo da peça, por dentro da casa.
  partes.push(...aros(opcoes.realce ?? [], orientacao, margem, paleta.tinta));

  if (comCoordenadas) {
    // 15 unidades num tabuleiro de 84 mm dão ~8,8 pt no papel, e o semibold
    // engorda o traço o bastante para a letra sobreviver à cópia. Sem serifa,
    // porque sans aguenta baixa resolução melhor que serifada de traço fino.
    const fonte =
      `font-family="'Segoe UI', Arial, 'Liberation Sans', sans-serif"` +
      ` font-size="15" font-weight="600" fill="${paleta.tinta}"`;
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
