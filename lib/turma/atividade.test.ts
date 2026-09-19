import assert from "node:assert/strict";
import test from "node:test";
import {
  formatarTempoEstudo,
  ordenarPorTempo,
  percentualDeAcerto,
  resumirAtividades,
} from "./atividade.ts";

test("soma apenas fatos dos alunos autorizados", () => {
  const resumo = resumirAtividades(
    ["ana", "bia"],
    [
      { aluno: "ana", tentativas: 10, acertos: 7 },
      { aluno: "ana", tentativas: 4, acertos: 4 },
      { aluno: "bia", tentativas: 3, acertos: 1 },
      { aluno: "fora", tentativas: 999, acertos: 999 },
    ],
    [{ aluno: "ana", tempo_ms: 3_690_000 }],
    [
      { aluno: "ana", tentativas: 5, aprendida_em: "2026-09-19T12:00:00Z" },
      { aluno: "ana", tentativas: 2, aprendida_em: null },
      { aluno: "bia", tentativas: 0, aprendida_em: null },
    ],
    [{ aluno: "ana", rating: 812.4 }],
  );

  assert.deepEqual(resumo.get("ana"), {
    puzzlesFeitos: 14,
    puzzlesCertos: 11,
    puzzlesErrados: 3,
    tempoMs: 3_690_000,
    linhasEstudadas: 2,
    linhasDominadas: 1,
    ratingTatica: 812.4,
  });
  assert.equal(resumo.get("bia")?.ratingTatica, null);
  assert.equal(resumo.has("fora"), false);
});

test("ordena somente por tempo e desempata pelo nome", () => {
  const atividade = (tempoMs: number) => ({
    puzzlesFeitos: 0,
    puzzlesCertos: 0,
    puzzlesErrados: 0,
    tempoMs,
    linhasEstudadas: 0,
    linhasDominadas: 0,
    ratingTatica: null,
  });
  const lista = ordenarPorTempo([
    { id: "b", nome: "Bia", atividade: atividade(3_600_000) },
    { id: "c", nome: "Caio", atividade: atividade(7_200_000) },
    { id: "a", nome: "Ana", atividade: atividade(3_600_000) },
  ]);
  assert.deepEqual(lista.map((p) => p.nome), ["Caio", "Ana", "Bia"]);
});

test("percentual e tempo não inventam atividade", () => {
  assert.equal(percentualDeAcerto({ puzzlesFeitos: 0, puzzlesCertos: 0 }), null);
  assert.equal(percentualDeAcerto({ puzzlesFeitos: 14, puzzlesCertos: 11 }), 79);
  assert.equal(formatarTempoEstudo(59_999), "0 min");
  assert.equal(formatarTempoEstudo(91 * 60_000), "1 h 31 min");
});
