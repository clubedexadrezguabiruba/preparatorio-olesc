import assert from "node:assert/strict";
import test from "node:test";
import { CHAVES, extrairPecas, LADO_PECA, lerCssChessground } from "./extrair.ts";
import { PECAS } from "./pecas.ts";

/**
 * O arquivo gerado ainda é o que o chessground desenha?
 *
 * É a única coisa que separa "o caderno imprime as mesmas peças da tela" de uma
 * promessa. Um `npm update` que troque o desenho das peças reprova aqui, e a
 * correção é uma linha: `node scripts/gerar-pecas.ts`.
 */

test("pecas.ts bate com o CSS do chessground", () => {
  const agora = extrairPecas(lerCssChessground());
  for (const chave of CHAVES) {
    assert.equal(
      PECAS[chave],
      agora[chave],
      `a peça "${chave}" mudou no chessground — rode: node scripts/gerar-pecas.ts`,
    );
  }
});

test("as doze peças estão lá, e nenhuma vazia", () => {
  assert.deepEqual(Object.keys(PECAS).sort(), [...CHAVES].sort());
  for (const chave of CHAVES) {
    assert.ok(PECAS[chave].length > 100, `a peça "${chave}" saiu vazia demais`);
  }
});

test("nenhuma peça carrega um <svg> aninhado", () => {
  // O tabuleiro escala as peças por `transform`. Um `<svg>` com width/height em
  // pixel dentro do grupo ignoraria a escala e a peça sairia do tamanho da casa.
  for (const chave of CHAVES) {
    assert.ok(!PECAS[chave].includes("<svg"), `a peça "${chave}" trouxe o invólucro junto`);
  }
});

test("uma peça em tamanho diferente reprova em vez de sair torta", () => {
  // O tamanho mora dentro do base64, então o estrago tem de ser feito lá: é
  // exatamente a forma que um upgrade do chessground teria.
  const css = lerCssChessground();
  const original = css.match(/piece\.king\.white \{\s*background-image: url\('data:image\/svg\+xml;base64,([^']+)'\)/)![1];
  const torto = Buffer.from(
    Buffer.from(original, "base64").toString("utf8").replace('width="45"', 'width="40"'),
  ).toString("base64");

  assert.throws(() => extrairPecas(css.replace(original, torto)), /wk: peça 40×45/);
  assert.equal(LADO_PECA, 45);
});

test("peça que sumir do CSS reprova com o nome dela", () => {
  const cssPodado = lerCssChessground().replace("piece.king.black", "piece.king.roxo");
  assert.throws(() => extrairPecas(cssPodado), /bk/);
});
