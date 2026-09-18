import assert from "node:assert/strict";
import test from "node:test";
import { NIVEL_LIBERADO, nivelAberto } from "./liberado.ts";

test("hoje só o nível 1 está liberado", () => {
  assert.equal(NIVEL_LIBERADO, 1);
});

test("o nível 1 abre para todo aluno", () => {
  assert.equal(nivelAberto(1, { papel: "aluno", nivelDoAluno: 1 }), true);
});

test("acima do liberado fica trancado, mesmo para quem passou na prova", () => {
  assert.equal(nivelAberto(2, { papel: "aluno", nivelDoAluno: 1 }), false);
  assert.equal(nivelAberto(2, { papel: "aluno", nivelDoAluno: 3 }), false);
  assert.equal(nivelAberto(5, { papel: "aluno", nivelDoAluno: 5 }), false);
});

test("liberado o nível 2, ele abre só para quem já chegou lá", () => {
  assert.equal(nivelAberto(2, { papel: "aluno", nivelDoAluno: 1 }, 2), false);
  assert.equal(nivelAberto(2, { papel: "aluno", nivelDoAluno: 2 }, 2), true);
  assert.equal(nivelAberto(3, { papel: "aluno", nivelDoAluno: 3 }, 2), false);
});

test("o professor entra em tudo", () => {
  for (const nivel of [1, 2, 3, 4, 5] as const) {
    assert.equal(nivelAberto(nivel, { papel: "professor", nivelDoAluno: 1 }), true);
  }
});
