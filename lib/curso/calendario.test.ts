import assert from "node:assert/strict";
import test from "node:test";
import {
  COMECO_DO_TORNEIO,
  fimDaSemana,
  hojeNoBrasil,
  intervaloPorExtenso,
  porExtenso,
  SABADOS,
  sabadoDaSemana,
  semanaAtual,
} from "./calendario.ts";

test("os quatro sábados são mesmo sábados", () => {
  // O caminho de erro real é o dedo: trocar 12 por 13 no plano e no código, e
  // o site anunciar o encontro num domingo. O calendário do JavaScript sabe a
  // resposta; ninguém precisa contar no dedo.
  for (const sabado of SABADOS) {
    const dia = new Date(`${sabado.data}T12:00:00Z`).getUTCDay();
    assert.equal(dia, 6, `${sabado.data} (semana ${sabado.semana}) não é sábado`);
  }
});

test("as semanas não têm buraco nem sobreposição", () => {
  // O fim de uma semana é a véspera do começo da seguinte. Um dia de folga
  // entre elas seria um dia em que o aluno abre o painel e não tem tarefa.
  for (const sabado of SABADOS) {
    const seguinte = SABADOS.find((s) => s.semana === sabado.semana + 1);
    const proximoComeco = seguinte?.data ?? COMECO_DO_TORNEIO;
    const fim = new Date(`${fimDaSemana(sabado.semana)}T12:00:00Z`);
    fim.setUTCDate(fim.getUTCDate() + 1);
    assert.equal(fim.toISOString().slice(0, 10), proximoComeco);
  }
});

test("a semana atual anda com os sábados", () => {
  assert.equal(semanaAtual("2026-09-03"), 1, "antes do primeiro sábado, a semana é a 1");
  assert.equal(semanaAtual("2026-09-11"), 1, "véspera do Sábado 1");
  assert.equal(semanaAtual("2026-09-12"), 1, "o próprio Sábado 1");
  assert.equal(semanaAtual("2026-09-18"), 1, "sexta da semana 1");
  assert.equal(semanaAtual("2026-09-19"), 2);
  assert.equal(semanaAtual("2026-09-26"), 3);
  assert.equal(semanaAtual("2026-10-03"), 4);
  assert.equal(semanaAtual("2026-10-15"), 4, "durante o torneio ainda é a semana 4");
});

test("o fuso é o de Guabiruba, e não o do servidor da Vercel", () => {
  // Sexta, 18/9, 21h em São Paulo — que é sábado 19/9, 00h em UTC. O servidor
  // roda em UTC: sem o fuso explícito, a semana viraria com um dia de
  // antecedência e as tarefas da semana 1 sumiriam antes de a semana acabar.
  const sextaANoite = new Date("2026-09-19T00:30:00Z");
  assert.equal(hojeNoBrasil(sextaANoite), "2026-09-18");
  assert.equal(semanaAtual(hojeNoBrasil(sextaANoite)), 1);
});

test("as datas por extenso", () => {
  assert.equal(porExtenso("2026-09-12"), "12 de setembro");
  assert.equal(porExtenso("2026-10-03"), "3 de outubro");
  assert.equal(intervaloPorExtenso("2026-09-12", "2026-09-18"), "12 a 18 de setembro");
  assert.equal(
    intervaloPorExtenso("2026-10-03", "2026-10-10"),
    "3 a 10 de outubro",
  );
  // A semana 3 cruza o mês: aí os dois meses aparecem.
  assert.equal(
    intervaloPorExtenso("2026-09-26", "2026-10-02"),
    "26 de setembro a 2 de outubro",
  );
});

test("todo sábado tem título e é achável pela semana", () => {
  for (const sabado of SABADOS) {
    assert.equal(sabadoDaSemana(sabado.semana).data, sabado.data);
    assert.ok(sabado.titulo.length > 5);
  }
});
