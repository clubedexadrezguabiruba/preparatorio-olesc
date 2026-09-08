import assert from "node:assert/strict";
import test from "node:test";
import { masteryReport, type MasteryInput } from "./mastery.ts";

/**
 * A passada do dia, e o selo que a responde.
 *
 * ## O que este arquivo perdeu, e por quê
 *
 * Ele cobria as **quatro** combinações de um critério de duas metades: a etapa
 * 4 (a árvore sem ajuda) e a etapa 5 (a partida), na mesma sessão. A etapa 4
 * saiu do formato em 2026-09-08 e o critério virou um booleano só — vencer a
 * partida, uma vez.
 *
 * Com uma metade, a tabela de combinações some, e com ela a maior parte do que
 * este arquivo media: qual das duas faltou, três títulos para quatro casos, e
 * as duas pendências com textos distintos. Fica registrado como perda de
 * cobertura, e não como faxina.
 *
 * O que **continua** valendo, e é por isso que o arquivo não sumiu junto:
 *
 * - a invariante que impede o selo de dizer "feita" e listar pendências;
 * - a aula que não joga, que não pode receber o selo de graça;
 * - ganhar e segurar serem pedidos diferentes, que é metade do currículo.
 */

const partida = (practiceWon: boolean): MasteryInput => ({ hasPractice: true, practiceWon });

test("a passada sai se, e só se, a partida foi vencida", () => {
  assert.equal(masteryReport(partida(true)).mastered, true);
  assert.equal(masteryReport(partida(false)).mastered, false);
});

test("`missing` vazio se e somente se a passada saiu — na aula que joga", () => {
  // A invariante que impede o selo de dizer "feita" e listar pendências, ou de
  // dizer "falta" sem dizer o quê.
  //
  // **A aula de leitura fica de fora, e é a exceção de propósito**: ela devolve
  // `mastered: false` com `missing` vazio, porque não há o que exigir e mesmo
  // assim o selo não pode ser dado. Ela tem o seu próprio teste logo abaixo.
  for (const caso of [partida(true), partida(false)]) {
    const r = masteryReport(caso);
    assert.equal(r.mastered, r.missing.length === 0, JSON.stringify(caso));
  }
});

test("a pendência nomeia a etapa certa e fala do computador", () => {
  const [pendencia] = masteryReport(partida(false)).missing;
  assert.equal(pendencia.stage, "practice");
  assert.equal(pendencia.text.includes("computador"), true, pendencia.text);
});

test("os dois títulos são distintos, e o de sucesso convida a voltar noutro dia", () => {
  const saiu = masteryReport(partida(true)).headline;
  const naoSaiu = masteryReport(partida(false)).headline;
  assert.notEqual(saiu, naoSaiu);
  // **O selo não pode dizer "dominado".** A aula só fica aprendida no degrau 3
  // da escada, com três passadas em dias distintos; dizer "dominado" hoje seria
  // a aula prometendo um fim que ela não tem poder de dar.
  assert.equal(/dominad/i.test(saiu), false, saiu);
  assert.equal(saiu.includes("noutro dia"), true, saiu);
});

test("aula que não joga não afere passada, e não a concede de graça", () => {
  // Nada a exigir **não** é o mesmo que critério cumprido: a passada do formato
  // leitura é uma declaração do aluno, gravada no banco, e não este selo.
  const r = masteryReport({ hasPractice: false, practiceWon: false });
  assert.equal(r.mastered, false);
  assert.deepEqual(r.missing, []);
  assert.equal(r.headline.includes("leitura"), true, r.headline);
});

/* ------------------------------------------------------------------ *
 * FN1/B2 — ganhar e segurar são pedidos diferentes
 * ------------------------------------------------------------------ */

test("o objetivo de empate troca a pendência, e ela não fala em vencer", () => {
  const [pendencia] = masteryReport({ ...partida(false), practiceGoal: "draw" }).missing;
  assert.equal(pendencia.text.includes("empate"), true, pendencia.text);
  assert.equal(/vencer|mate\b/i.test(pendencia.text), false, pendencia.text);
});

test("o objetivo de empate também troca o título do sucesso", () => {
  const saiu = masteryReport({ ...partida(true), practiceGoal: "draw" }).headline;
  assert.equal(saiu.includes("segurou o empate"), true, saiu);
});

test("sem dizer o objetivo, o texto é o de vitória — como sempre foi", () => {
  const semDizer = masteryReport(partida(false)).missing.map((m) => m.text);
  const dizendo = masteryReport({ ...partida(false), practiceGoal: "win" }).missing.map(
    (m) => m.text,
  );
  assert.deepEqual(semDizer, dizendo);
  assert.equal(semDizer[0].includes("Vencer o computador"), true, semDizer[0]);
});
