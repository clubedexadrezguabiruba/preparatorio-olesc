import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * De onde vêm os desenhos das peças do caderno impresso.
 *
 * O `chessground` já traz as peças **cburnett** (CC BY-SA 3.0, Colin M.L.
 * Burnett — as mesmas do Lichess) embutidas em base64 dentro do seu
 * `chessground.cburnett.css`. O site as usa como `background-image`; a
 * apostila precisa do mesmo desenho como **marcação SVG**, para compor um
 * tabuleiro inteiro num arquivo só que o Chromium imprime.
 *
 * Redesenhar as peças seria um segundo conjunto de peças no projeto: a tela e o
 * papel deixariam de mostrar o mesmo cavalo, e ninguém notaria até o aluno
 * comparar. Por isso o papel **deriva** da tela, e não a copia.
 *
 * ## O par mais fraco do conjunto, e por que ele fica como está
 *
 * A conferência do caderno mediu a **cobertura de tinta** de cada peça
 * impressa, e o rei é o par de pior separação de todo o conjunto cburnett: rei
 * preto 31,9% contra rei branco 22,1%, razão de 1,44×. Para comparar, o peão dá
 * 2,9× e o cavalo 2,5×. A causa é o desenho: o rei preto é feito de contorno com
 * o miolo branco, não de massa preta.
 *
 * A correção óbvia — preencher o corpo do rei preto de preto sólido — foi
 * **recusada**, e vale dizer por quê. Ela transformaria `pecas.ts` num terceiro
 * jogo de peças: nem o do chessground, nem o do Lichess, mas um nosso, mantido
 * à mão, que o teste de `pecas.test.ts` deixaria de conseguir conferir. E a leitura visual da
 * mesma conferência não achou nenhum rei ambíguo: o que separa os dois na folha
 * é a massa do arco e das faixas da base, e numa fotocópia de segunda geração
 * esses vazados finos **fecham**, o que torna o rei preto mais preto, não menos.
 *
 * Ou seja: o número é ruim e o resultado é bom. Fica registrado para quem um dia
 * imprimir num papel pior e vir o rei sumir — aí a decisão se reabre, com um
 * caso concreto em vez de uma razão de contraste isolada.
 *
 * A derivação roda uma vez, por `node scripts/gerar-pecas.ts`, e o resultado
 * fica versionado em `pecas.ts`. Não roda na build por dois motivos: ler
 * `node_modules` em tempo de execução quebra quando o bundler move o arquivo,
 * e um upgrade do chessground que mudasse o desenho entraria mudo. Com o
 * arquivo gerado, quem confere é `pecas.test.ts` — ele reextrai e compara.
 */

/** A chave é a do chess.js: cor (`w`/`b`) seguida do tipo (`pnbrqk`). */
export type ChavePeca =
  | "wp" | "wn" | "wb" | "wr" | "wq" | "wk"
  | "bp" | "bn" | "bb" | "br" | "bq" | "bk";

export const CHAVES: readonly ChavePeca[] = [
  "wp", "wn", "wb", "wr", "wq", "wk",
  "bp", "bn", "bb", "br", "bq", "bk",
];

/** O lado do quadrado em que a peça foi desenhada. Todas as cburnett são 45×45. */
export const LADO_PECA = 45;

const TIPOS: Record<string, string> = {
  pawn: "p", knight: "n", bishop: "b", rook: "r", queen: "q", king: "k",
};

export const CSS_CHESSGROUND = fileURLToPath(
  new URL("../../node_modules/@lichess-org/chessground/assets/chessground.cburnett.css", import.meta.url),
);

export function lerCssChessground(): string {
  return readFileSync(CSS_CHESSGROUND, "utf8");
}

/**
 * O miolo de cada peça — o que está **dentro** do `<svg>`, sem o invólucro.
 *
 * Sem invólucro porque o tabuleiro põe as doze peças no mesmo SVG: cada uma
 * entra num `<g transform="translate(…) scale(…)">`, e um `<svg>` aninhado com
 * `width`/`height` em pixel brigaria com essa escala.
 */
export function extrairPecas(css: string): Record<ChavePeca, string> {
  const achadas: Partial<Record<ChavePeca, string>> = {};

  const regra = /piece\.(pawn|knight|bishop|rook|queen|king)\.(white|black)\s*\{\s*background-image:\s*url\('data:image\/svg\+xml;base64,([^']+)'\)/g;
  for (const [, tipo, cor, base64] of css.matchAll(regra)) {
    const chave = `${cor === "white" ? "w" : "b"}${TIPOS[tipo]}` as ChavePeca;
    const svg = Buffer.from(base64, "base64").toString("utf8");

    // O `45` não é decoração: se uma versão futura desenhar em 40, a escala do
    // tabuleiro sairia errada em silêncio e a peça vazaria da casa.
    const largura = svg.match(/\bwidth="(\d+)"/)?.[1];
    const altura = svg.match(/\bheight="(\d+)"/)?.[1];
    if (largura !== String(LADO_PECA) || altura !== String(LADO_PECA)) {
      throw new Error(`${chave}: peça ${largura}×${altura}, esperado ${LADO_PECA}×${LADO_PECA}`);
    }

    const miolo = svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1];
    if (miolo === undefined) throw new Error(`${chave}: não achei o miolo do <svg>`);
    achadas[chave] = miolo.trim();
  }

  const faltando = CHAVES.filter((c) => achadas[c] === undefined);
  if (faltando.length > 0) {
    throw new Error(`o CSS do chessground não trouxe: ${faltando.join(", ")}`);
  }
  return achadas as Record<ChavePeca, string>;
}
