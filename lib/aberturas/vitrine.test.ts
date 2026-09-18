import assert from "node:assert/strict";
import test from "node:test";
import { podeAbrir, VITRINE } from "./vitrine.ts";

test("o nível 1 tem a Escocesa e a Siciliana, e a Francesa foi para o 2", () => {
  const doNivel1 = VITRINE.filter((v) => v.nivel === 1).map((v) => v.abertura);
  assert.deepEqual(doNivel1.sort(), ["escocesa", "siciliana"]);
  assert.equal(VITRINE.find((v) => v.abertura === "francesa")?.nivel, 2);
});

test("o aluno entra só nas liberadas do nível aberto", () => {
  assert.equal(podeAbrir("brancas", "escocesa", "aluno", 1), true);
  assert.equal(podeAbrir("pretas", "siciliana", "aluno", 1), true);
  assert.equal(podeAbrir("brancas", "francesa", "aluno", 1), false, "liberada, mas do nível 2");
  assert.equal(podeAbrir("brancas", "francesa", "aluno", 3), false, "o nível 2 ainda não foi liberado");
  assert.equal(podeAbrir("brancas", "alapin", "aluno", 1), false, "em breve");
  assert.equal(podeAbrir("brancas", "inexistente", "aluno", 5), false, "fora da vitrine");
});

test("o professor entra em todas", () => {
  for (const v of VITRINE) assert.equal(podeAbrir(v.cor, v.abertura, "professor", 1), true);
});
