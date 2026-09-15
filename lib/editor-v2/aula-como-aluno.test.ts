/**
 * "Fazer a aula inteira como aluno" (pedido do Doug, 14/9/2026): o relógio por etapa e o resumo.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { formatarDuracao, gastoAte, iniciarRelogio, resumoDaAulaComoAluno, trocarEtapa } from "./aula-como-aluno.ts";

test("o relógio fecha o tempo de cada etapa ao trocar, e voltar a uma etapa soma ao tempo dela", () => {
  let relogio = iniciarRelogio();
  relogio = trocarEtapa(relogio, "intro", 1_000);
  relogio = trocarEtapa(relogio, "cap", 41_000);
  relogio = trocarEtapa(relogio, "cap", 50_000); // a mesma etapa: nada muda
  relogio = trocarEtapa(relogio, "intro", 101_000);
  assert.deepEqual(gastoAte(relogio, 111_000), { intro: 50_000, cap: 60_000 });
});

test("a duração aparece como relógio: minutos:segundos, e horas quando passa de uma", () => {
  assert.equal(formatarDuracao(40_000), "0:40");
  assert.equal(formatarDuracao(725_000), "12:05");
  assert.equal(formatarDuracao(3_723_000), "1:02:03");
  assert.equal(formatarDuracao(-5), "0:00");
});

test("o resumo diz o tempo, a tentativa e se cada etapa foi concluída; a aula só conclui com todas as avaliações", () => {
  const etapas = [
    { id: "i", tipo: "introducao" as const, rotulo: "Apresentação" },
    { id: "c", tipo: "capitulo" as const, rotulo: "Aula" },
    { id: "t", tipo: "treino" as const, rotulo: "Treino" },
    { id: "p", tipo: "pratica" as const, rotulo: "Prática real" },
  ];
  const parcial = resumoDaAulaComoAluno(etapas, { i: 40_000, c: 130_000, t: 65_000 }, { t: { tentativas: 2, concluida: true }, p: { tentativas: 1, concluida: false } });
  assert.deepEqual(parcial.linhas.map((linha) => [linha.situacao, linha.tentativas]), [["vista", undefined], ["vista", undefined], ["concluida", 2], ["nao-visitada", undefined]]);
  assert.equal(parcial.totalMs, 235_000);
  assert.equal(parcial.concluida, false);

  const inteira = resumoDaAulaComoAluno(etapas, { i: 1, c: 1, t: 1, p: 200_000 }, { t: { tentativas: 1, concluida: true }, p: { tentativas: 3, concluida: true } });
  assert.equal(inteira.concluida, true);
  assert.equal(inteira.linhas[3].tentativas, 3);
});
