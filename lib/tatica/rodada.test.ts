import assert from "node:assert/strict";
import test from "node:test";
import { pendentesDaRodada, resultadoDaRodada } from "./rodada.ts";

const puzzles = Array.from({ length: 10 }, (_, i) => ({ id: String(i), origem: i < 8 ? "fork" : "pin" }));

test("interromper a cada resposta mantém exatamente a lista e a ordem da prova", () => {
  const respostas: { puzzle_id: string; acertou: boolean }[] = [];
  for (const esperado of puzzles) {
    const retomada = pendentesDaRodada(puzzles, respostas);
    assert.equal(retomada[0].id, esperado.id);
    respostas.push({ puzzle_id: esperado.id, acertou: false });
  }
  assert.deepEqual(pendentesDaRodada(puzzles, respostas), []);
});

test("outras provas e duplicatas não completam uma prova incompleta", () => {
  const respostas = puzzles.slice(0, 9).map((p) => ({ puzzle_id: p.id, acertou: true }));
  respostas.push({ puzzle_id: "outra-prova", acertou: true }, respostas[0]);
  assert.equal(resultadoDaRodada(puzzles, respostas, 9), null);
});

test("o resultado usa apenas os puzzles atribuídos e informa os temas dos erros", () => {
  const respostas = puzzles.map((p, i) => ({ puzzle_id: p.id, acertou: i < 9 }));
  respostas.push({ puzzle_id: "outra-prova", acertou: true });
  assert.deepEqual(resultadoDaRodada(puzzles, respostas, 9), {
    acertos: 9, total: 10, passou: true, erros: ["pin"],
  });
  assert.equal(resultadoDaRodada([], [], 0), null);
});
