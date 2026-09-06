import assert from "node:assert/strict";
import test from "node:test";
import { boxRect } from "./box-overlay.ts";
import { boxBounds, boxSize } from "./technique.ts";

/**
 * A caixa desenhada, medida nas posições da própria aula. Os números não são
 * invenção: são a caixa que o rei preto tem em cada uma, conferida casa a casa.
 */

/** Etapa 1–3: rei preto b5, rei branco b1, torre a1 (Rogers, DIAGRAM XVI). */
const ROGERS = "8/8/8/1k6/8/8/8/RK6 w - - 0 1";
/** O mesmo final depois de 2.Rd1: o rei preto preso nas colunas a, b e c. */
const CORTE_NA_COLUNA = "8/8/8/8/2k5/8/1K6/3R4 w - - 4 3";
/** Freeborough No. 258: rei preto e8, rei branco e6, torre e3. */
const FREEBOROUGH = "4k3/8/4K3/8/8/4R3/8/8 w - - 0 1";

test("a torre em a1 barra a coluna a, e a 1ª fileira só até o próprio rei", () => {
  const b = boxBounds(ROGERS);
  // Coluna a vedada (a2–a8 atacadas, a1 é a própria torre); fileira 1 não,
  // porque o rei branco em b1 tapa a torre a partir de c1.
  assert.deepEqual(b, { fileLo: 1, fileHi: 7, rankLo: 0, rankHi: 7 });
  assert.equal(boxSize(b), 56);
});

test("torre em d1 com os dois reis a oeste: a caixa é a, b e c", () => {
  const b = boxBounds(CORTE_NA_COLUNA);
  assert.deepEqual(b, { fileLo: 0, fileHi: 2, rankLo: 1, rankHi: 7 });
  assert.equal(boxSize(b), 21);
});

test("com o rei em cima da coluna da torre, só a fileira barra", () => {
  // A torre em e3 veda a 3ª fileira inteira, e o rei preto fica com as
  // fileiras 4 a 8. A coluna e NÃO barra: o rei está em cima dela, e barreira
  // que passa debaixo do próprio rei não prende ninguém.
  const b = boxBounds(FREEBOROUGH);
  assert.deepEqual(b, { fileLo: 0, fileHi: 7, rankLo: 3, rankHi: 7 });
  assert.equal(boxSize(b), 40);
});

test("quem tem a peça maior é o atacante, mesmo sendo as pretas", () => {
  // Torre preta em e2, rei branco em e1: quem está preso é o BRANCO, na
  // 1ª fileira. A caixa não olha a cor, olha quem tem a peça maior.
  const b = boxBounds("4k3/8/8/8/8/8/4r3/4K3 b - - 0 1");
  assert.deepEqual(b, { fileLo: 0, fileHi: 7, rankLo: 0, rankHi: 0 });
  assert.equal(boxSize(b), 8);
});

test("o retângulo em % com as brancas embaixo", () => {
  // Colunas a–c, fileiras 2–8: encosta na esquerda, desce até 12,5% do fundo.
  const r = boxRect({ fileLo: 0, fileHi: 2, rankLo: 1, rankHi: 7 }, "white");
  assert.deepEqual(r, { left: 0, top: 0, width: 37.5, height: 87.5 });
});

test("girar o tabuleiro gira o retângulo nos dois eixos", () => {
  const bounds = { fileLo: 0, fileHi: 2, rankLo: 1, rankHi: 7 };
  const r = boxRect(bounds, "black");
  // Com as pretas embaixo, a coluna a vai para a direita e a fileira 8 desce.
  assert.deepEqual(r, { left: 62.5, top: 12.5, width: 37.5, height: 87.5 });
});

test("a caixa de uma casa só é um oitavo em cada eixo, nos dois sentidos", () => {
  const canto = { fileLo: 0, fileHi: 0, rankLo: 7, rankHi: 7 };
  assert.deepEqual(boxRect(canto, "white"), { left: 0, top: 0, width: 12.5, height: 12.5 });
  assert.deepEqual(boxRect(canto, "black"), { left: 87.5, top: 87.5, width: 12.5, height: 12.5 });
});
