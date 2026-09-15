import assert from "node:assert/strict";
import test from "node:test";
import { aposPuzzle, glicko2, INICIO, LIMITES, RD_DO_PUZZLE, ratingInicial, type Jogador } from "./glicko2.ts";

/**
 * A fórmula, contra duas réguas que não fomos nós que escrevemos.
 *
 * 1. **O exemplo do artigo do Glickman** ("Example of the Glicko-2 system"):
 *    1500/200/0,06 contra três adversários, τ = 0,5. O artigo publica o
 *    resultado — 1464,06 / 151,52 / 0,05999.
 * 2. **O SQL do clube** (`calculate_glicko2`, do vtracer). Os números abaixo
 *    saíram da própria função SQL, rodada em 15/9/2026 dentro de uma transação
 *    desfeita (`create function pg_temp.…`, e rollback), e não de uma conta à
 *    mão. O clube arredonda o rating para inteiro, o RD para 2 casas e a
 *    volatilidade para 6; a comparação arredonda do mesmo jeito.
 */

test("o exemplo do artigo do Glickman: 1464,06 / 151,52 / 0,05999", () => {
  const depois = glicko2({ rating: 1500, rd: 200, volatilidade: 0.06 }, [
    { rating: 1400, rd: 30, placar: 1 },
    { rating: 1550, rd: 100, placar: 0 },
    { rating: 1700, rd: 300, placar: 0 },
  ]);
  // O artigo arredonda os passos intermediários (μ' = −0,2069, φ' = 0,8722) e
  // por isso publica 1464,06; a conta sem arredondar dá 1464,0507. A régua é
  // "a um centésimo do publicado", não a quarta casa de um arredondamento dele.
  assert.ok(Math.abs(depois.rating - 1464.06) <= 0.01, `rating ${depois.rating}`);
  assert.ok(Math.abs(depois.rd - 151.52) <= 0.01, `RD ${depois.rd}`);
  assert.ok(Math.abs(depois.volatilidade - 0.05999) <= 0.00001, `volatilidade ${depois.volatilidade}`);
});

/** Arredonda como o `calculate_glicko2` do clube arredonda antes de devolver. */
function comoOClube(j: { rating: number; rd: number; volatilidade: number }) {
  return {
    rating: Math.round(j.rating),
    rd: Number(j.rd.toFixed(2)),
    volatilidade: Number(j.volatilidade.toFixed(6)),
  };
}

const CASOS_DO_CLUBE = [
  {
    nome: "aluno novo (400/350) acerta um puzzle de 450",
    jogador: { rating: 400, rd: 350, volatilidade: 0.06 },
    puzzle: { rating: 450, rd: 75, placar: 1 },
    sql: { rating: 601, rd: 251.22, volatilidade: 0.059999 },
  },
  {
    // O caso que quebrava o clube antes de 17/02: Δ² ≤ φ² + v numa derrota
    // de 400/350. É o aluno do primeiro dia aqui.
    nome: "aluno novo (400/350) erra um puzzle de 450",
    jogador: { rating: 400, rd: 350, volatilidade: 0.06 },
    puzzle: { rating: 450, rd: 75, placar: 0 },
    sql: { rating: 248, rd: 251.22, volatilidade: 0.059999 },
  },
  {
    nome: "aluno assentado (1200/80) acerta um puzzle de 1500",
    jogador: { rating: 1200, rd: 80, volatilidade: 0.06 },
    puzzle: { rating: 1500, rd: 75, placar: 1 },
    sql: { rating: 1230, rd: 79.61, volatilidade: 0.060007 },
  },
];

for (const caso of CASOS_DO_CLUBE) {
  test(`igual ao SQL do clube: ${caso.nome}`, () => {
    assert.deepEqual(comoOClube(glicko2(caso.jogador, [caso.puzzle])), caso.sql);
  });
}

test("os limites do clube seguram rating, RD e volatilidade", () => {
  // Um aluno no teto que acerta mais um: não passa de 3000.
  const noTeto = glicko2({ rating: 3000, rd: 350, volatilidade: 0.15 }, [
    { rating: 3000, rd: RD_DO_PUZZLE, placar: 1 },
  ]);
  assert.ok(noTeto.rating <= LIMITES.rating[1]);
  // E no piso, errando: não desce de 100.
  const noPiso = glicko2({ rating: 100, rd: 350, volatilidade: 0.06 }, [
    { rating: 100, rd: RD_DO_PUZZLE, placar: 0 },
  ]);
  assert.ok(noPiso.rating >= LIMITES.rating[0]);
  // Muitos puzzles seguidos: o RD encosta no piso de 30 e para ali.
  let j = { rating: 1200, rd: 31, volatilidade: 0.01 };
  for (let i = 0; i < 200; i++) j = glicko2(j, [{ rating: 1200, rd: RD_DO_PUZZLE, placar: i % 2 }]);
  assert.ok(j.rd >= LIMITES.rd[0] && j.rd <= LIMITES.rd[1]);
  assert.ok(j.volatilidade >= LIMITES.volatilidade[0] && j.volatilidade <= LIMITES.volatilidade[1]);
});

test("sem resultado, só o RD cresce", () => {
  const depois = glicko2({ rating: 1200, rd: 50, volatilidade: 0.06 }, []);
  assert.equal(depois.rating, 1200);
  assert.ok(depois.rd > 50);
});

test("a progressão de 20 em 20 (Doug, 15/9): com RD 80, seis acertos seguidos dão +17 +17 +16 +16 +16 +15", () => {
  let j: Jogador = { rating: 600, ...INICIO };
  const saltos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const depois = aposPuzzle(j, Math.round(j.rating), true);
    saltos.push(depois.delta);
    j = depois;
  }
  assert.deepEqual(saltos, [17, 17, 16, 16, 16, 15]);
  // E errar desce na mesma medida.
  assert.equal(aposPuzzle({ rating: 600, ...INICIO }, 600, false).delta, -17);
});

test("com o uso o salto assenta perto de 11, e não some", () => {
  let j: Jogador = { rating: 800, ...INICIO };
  let ultimo = 0;
  for (let i = 1; i <= 300; i++) {
    const depois = aposPuzzle(j, Math.round(j.rating), i % 2 === 0);
    ultimo = Math.abs(depois.delta);
    j = depois;
  }
  assert.ok(ultimo >= 10 && ultimo <= 12, `depois de 300 problemas o salto é ${ultimo}`);
});

test("o início é o rating de entrada do perfil, com piso de 600", () => {
  assert.equal(ratingInicial(1400), 1400);
  assert.equal(ratingInicial(1187.6), 1188);
  assert.equal(ratingInicial(450), 600, "abaixo do problema mais fácil, começa nele");
  assert.equal(ratingInicial(null), 600, "sem rating anotado, 600");
  assert.equal(ratingInicial(undefined), 600);
  assert.equal(ratingInicial(9000), 3000, "e não passa do teto do Glicko");
});

test("o delta é a diferença dos ratings arredondados", () => {
  const antes = { rating: 1000.4, rd: 60, volatilidade: 0.06 };
  const depois = aposPuzzle(antes, 1000, true);
  assert.equal(depois.delta, Math.round(depois.rating) - 1000);
});
