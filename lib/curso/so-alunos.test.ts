import assert from "node:assert/strict";
import test from "node:test";
import { contarSoAlunos, contasDasLinhas } from "./so-alunos.ts";

test("a conta de professor não entra na contagem de alunos (o caso do roteiro 8F)", () => {
  const linhas = [{ aluno: "prof-teste" }, { aluno: "aluno-teste" }];
  const papeis = new Map([["prof-teste", "professor"], ["aluno-teste", "aluno"]]);
  assert.deepEqual(contarSoAlunos(linhas, papeis), { registros: 1, alunos: 1 });
});

test("dois registros do mesmo aluno são dois registros e um aluno; conta sem papel não conta", () => {
  const linhas = [{ aluno: "a" }, { aluno: "a" }, { aluno: "b" }, { aluno: "sumiu" }];
  const papeis = new Map([["a", "aluno"], ["b", "aluno"]]);
  assert.deepEqual(contarSoAlunos(linhas, papeis), { registros: 3, alunos: 2 });
  assert.deepEqual(contasDasLinhas(linhas), ["a", "b", "sumiu"]);
});

test("sem linhas, zero e zero", () => {
  assert.deepEqual(contarSoAlunos([], new Map()), { registros: 0, alunos: 0 });
});
