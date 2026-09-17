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

test("dentro de ±20: o problema fica colado ao rating (Doug, 15/9)", () => {
  assert.equal(escolherPorRating(INDICE, 1200, NUNCA, primeiro)?.[2], 1180);
  assert.equal(escolherPorRating(INDICE, 1200, NUNCA, ultimo)?.[2], 1220);
});

test("aceita rating com casas decimais, como o banco guarda", () => {
  assert.equal(escolherPorRating(INDICE, 1143.62, NUNCA, primeiro)?.[2], 1130);
});

test("não repete o que o aluno já viu: a janela cresce de ±20 para ±50, ±100…", () => {
  const perto = (raio: number) => new Set(INDICE.filter((l) => Math.abs(l[2] - 1200) <= raio).map((l) => l[0]));
  const ate20 = perto(20);
  const achado50 = escolherPorRating(INDICE, 1200, ate20, primeiro);
  assert.equal(achado50?.[2], 1150);
  assert.ok(!ate20.has(achado50![0]));

  assert.equal(escolherPorRating(INDICE, 1200, perto(50), ultimo)?.[2], 1300);
  assert.equal(escolherPorRating(INDICE, 1200, perto(200), ultimo)?.[2], 1600);
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
  assert.equal(contagem.size, 5, "1180, 1190, 1200, 1210 e 1220");
  for (const n of contagem.values()) assert.ok(n > 120, `uma nota saiu só ${n} vezes em 1000`);
});

/* ------------------------------------------------------------------ *
 * Nunca dois mates curtos seguidos (Doug, 16/9)
 * ------------------------------------------------------------------ */

/** Um índice de mentira em que só os ratings listados em `semMate` não são mate curto. */
function indiceDeMates(semMate: readonly number[]): LinhaDoIndice[] {
  return INDICE.map(([id, origem, rating]) => (semMate.includes(rating) ? [id, origem, rating] : [id, "mateIn1", rating, 1]));
}

test("depois de um mate curto, o próximo não é mate — dentro de ±20, se houver", () => {
  const indice = indiceDeMates([1210]);
  assert.equal(escolherPorRating(indice, 1200, NUNCA, primeiro, { evitarMateCurto: true })?.[2], 1210);
  assert.equal(escolherPorRating(indice, 1200, NUNCA, primeiro, { evitarMateCurto: false })?.[2], 1180, "sem a regra, nada muda");
  assert.equal(escolherPorRating(indice, 1200, NUNCA, primeiro)?.[2], 1180, "e a regra é desligada por padrão");
});

test("sem problema não-mate a ±20, a regra vai até ±50, e não além", () => {
  assert.equal(escolherPorRating(indiceDeMates([1150]), 1200, NUNCA, primeiro, { evitarMateCurto: true })?.[2], 1150);
  // Só a 80 pontos há um que não é mate: a regra cede, e vale o mate perto do rating.
  const cedeu = escolherPorRating(indiceDeMates([1280]), 1200, NUNCA, primeiro, { evitarMateCurto: true });
  assert.equal(cedeu?.[2], 1180);
  assert.equal(cedeu?.[3], 1);
});

test("abaixo do índice, a regra parte da janela em que a escolha acharia problema, e não desiste", () => {
  // O índice começa em 600. Em 560, ±20 está vazio e ±50 só alcança o 600 e o
  // 610 — mates. A regra vai à janela seguinte (±100) e acha o 650.
  const indice = indiceDeMates([650]);
  assert.equal(escolherPorRating(indice, 560, NUNCA, primeiro)?.[2], 600, "a escolha de sempre fica no 600");
  assert.equal(escolherPorRating(indice, 560, NUNCA, primeiro, { evitarMateCurto: true })?.[2], 650);
});

test("a regra respeita os vistos: o não-mate já visto não volta", () => {
  const indice = indiceDeMates([1190, 1210]);
  assert.equal(escolherPorRating(indice, 1200, new Set(["p1190"]), primeiro, { evitarMateCurto: true })?.[2], 1210);
});

/* ------------------------------------------------------------------ *
 * O índice de verdade, no disco
 * ------------------------------------------------------------------ */

test("no índice de verdade, 100 problemas seguidos em 560, 600, 750 e 900 nunca trazem dois mates curtos em sequência", () => {
  const real = JSON.parse(readFileSync(path.join(RAIZ, "public/puzzles/rating-indice.json"), "utf8")) as LinhaDoIndice[];
  // 560: o aluno que errou muito e caiu abaixo do começo do índice (600).
  for (const rating of [560, 600, 750, 900]) {
    let semente = 11;
    const aleatorio = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646;
    const vistos = new Set<string>();
    let anteriorEraMate = false;
    let seguidos = 0;
    let mates = 0;
    for (let i = 0; i < 100; i++) {
      const linha: LinhaDoIndice = escolherPorRating(real, rating, vistos, aleatorio, { evitarMateCurto: anteriorEraMate })!;
      const eMate: boolean = linha[3] === 1;
      if (anteriorEraMate && eMate) seguidos++;
      if (eMate) mates++;
      const teto = rating < 600 ? 100 : 50;
      assert.ok(Math.abs(linha[2] - rating) <= teto, `em ${rating}, a regra levou o problema a ${linha[2]}`);
      vistos.add(linha[0]);
      anteriorEraMate = eMate;
    }
    assert.equal(seguidos, 0, `em ${rating}: ${seguidos} pares de mates seguidos em 100 (${mates} mates)`);
    assert.ok(mates <= 50, `em ${rating}: ${mates} mates em 100`);
  }
});

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
  // O aluno que começa no piso (600) recebe um problema da base de 600–700,
  // colado ao rating dele — e há milhares de candidatos na janela de ±20.
  const noPiso = escolherPorRating(real, 600, NUNCA, ultimo);
  assert.equal(noPiso?.[1], ORIGEM_BASE);
  assert.ok(noPiso![2] <= 620);
  assert.ok(real.filter((l) => Math.abs(l[2] - 1200) <= 20).length > 1000, "±20 em 1200 tem mais de mil problemas");
});
