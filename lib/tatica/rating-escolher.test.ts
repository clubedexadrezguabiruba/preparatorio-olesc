import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { TEMAS } from "./blocos.ts";
import { escolherPorRating } from "./rating-escolher.ts";
import { ORIGEM_BASE, type LinhaDoIndice } from "./rating.ts";

/** Um índice de mentira: um puzzle a cada 10 pontos, de 600 a 2090. */
const INDICE: LinhaDoIndice[] = Array.from({ length: 150 }, (_, i) => [`p${600 + i * 10}`, "fork", 600 + i * 10]);

const NUNCA = new Set<string>();
const primeiro = () => 0;
const ultimo = () => 0.999999;

test("dentro de ±100: o sorteio anda de ponta a ponta da janela", () => {
  assert.equal(escolherPorRating(INDICE, 1200, NUNCA, primeiro)?.[2], 1100);
  assert.equal(escolherPorRating(INDICE, 1200, NUNCA, ultimo)?.[2], 1300);
});

test("aceita rating com casas decimais, como o banco guarda", () => {
  assert.equal(escolherPorRating(INDICE, 1143.62, NUNCA, primeiro)?.[2], 1050);
});

test("não repete o que o aluno já viu: a janela cresce para ±200 e depois ±400", () => {
  const ate100 = new Set(INDICE.filter((l) => Math.abs(l[2] - 1200) <= 100).map((l) => l[0]));
  const achado200 = escolherPorRating(INDICE, 1200, ate100, primeiro);
  assert.equal(achado200?.[2], 1000);
  assert.ok(!ate100.has(achado200![0]));

  const ate200 = new Set(INDICE.filter((l) => Math.abs(l[2] - 1200) <= 200).map((l) => l[0]));
  assert.equal(escolherPorRating(INDICE, 1200, ate200, ultimo)?.[2], 1600);
});

test("janela vazia por baixo: rating 100 recebe o puzzle mais próximo (600)", () => {
  assert.deepEqual(escolherPorRating(INDICE, 100, NUNCA, primeiro), ["p600", "fork", 600]);
  // E sem repetir: vistos os dois de baixo, vem o terceiro.
  assert.equal(escolherPorRating(INDICE, 100, new Set(["p600", "p610"]), primeiro)?.[2], 620);
});

test("janela vazia por cima: rating 3000 recebe o puzzle mais próximo (2090)", () => {
  assert.deepEqual(escolherPorRating(INDICE, 3000, NUNCA, primeiro), ["p2090", "fork", 2090]);
  assert.equal(escolherPorRating(INDICE, 3000, new Set(["p2090"]), primeiro)?.[2], 2080);
});

test("tudo visto: null, e nunca um repetido", () => {
  assert.equal(escolherPorRating(INDICE, 1200, new Set(INDICE.map((l) => l[0])), primeiro), null);
  assert.equal(escolherPorRating([], 1200, NUNCA, primeiro), null);
});

test("sorteio uniforme: 1000 sorteios cobrem a janela inteira", () => {
  const contagem = new Map<number, number>();
  let semente = 7;
  const aleatorio = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 1000; i++) {
    const r = escolherPorRating(INDICE, 1200, NUNCA, aleatorio)![2];
    contagem.set(r, (contagem.get(r) ?? 0) + 1);
  }
  assert.equal(contagem.size, 21);
  for (const n of contagem.values()) assert.ok(n > 20, `uma nota saiu só ${n} vezes em 1000`);
});

/* ------------------------------------------------------------------ *
 * O índice de verdade, no disco
 * ------------------------------------------------------------------ */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

test("o rating-indice.json está em rating crescente, sem id repetido, e toda origem existe", () => {
  const real = JSON.parse(
    readFileSync(path.join(RAIZ, "public/puzzles/rating-indice.json"), "utf8"),
  ) as LinhaDoIndice[];
  assert.ok(real.length > 100_000, `o índice tem só ${real.length} linhas`);
  const origens = new Set([...TEMAS.map((t) => t.tag), ORIGEM_BASE]);
  const ids = new Set<string>();
  for (let i = 0; i < real.length; i++) {
    const [id, origem, rating] = real[i];
    assert.ok(i === 0 || rating >= real[i - 1][2], `fora de ordem na linha ${i}`);
    assert.ok(!ids.has(id), `id repetido: ${id}`);
    assert.ok(origens.has(origem), `origem desconhecida: ${origem}`);
    ids.add(id);
  }
  // O aluno que começa em 400 alcança a base de 600–700 na janela de ±200.
  assert.equal(escolherPorRating(real, 400, NUNCA, primeiro)?.[1], ORIGEM_BASE);
});
