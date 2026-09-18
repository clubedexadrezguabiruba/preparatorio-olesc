import assert from "node:assert/strict";
import test from "node:test";
import { problemaParaExcluir, problemaParaNovoPin } from "./gerir-conta.ts";

const aluno = { id: "a1", usuario: "joaopedro", papel: "aluno" };
const professor = { id: "p1", usuario: "doug", papel: "professor" };

test("excluir exige digitar o usuário da conta", () => {
  assert.equal(problemaParaExcluir(aluno, "p1", "joaopedro"), null);
  assert.equal(problemaParaExcluir(aluno, "p1", "  JoaoPedro "), null, "caixa e espaço não pesam");
  assert.match(problemaParaExcluir(aluno, "p1", "") ?? "", /digite o usuário exatamente: joaopedro/);
  assert.match(problemaParaExcluir(aluno, "p1", "joao") ?? "", /joaopedro/);
});

test("conta de professor e a própria conta não se excluem", () => {
  assert.match(problemaParaExcluir(professor, "p2", "doug") ?? "", /Só conta de aluno/);
  assert.match(problemaParaExcluir(professor, "p1", "doug") ?? "", /própria conta/);
  assert.match(problemaParaExcluir(null, "p1", "x") ?? "", /não existe/);
});

test("PIN novo só para conta de aluno que existe", () => {
  assert.equal(problemaParaNovoPin(aluno), null);
  assert.match(problemaParaNovoPin(professor) ?? "", /Só conta de aluno/);
  assert.match(problemaParaNovoPin(null) ?? "", /não existe/);
});
