import assert from "node:assert/strict";
import test from "node:test";
import {
  COMECO_DO_TORNEIO,
  diasEntre,
  hojeNoBrasil,
  intervaloPorExtenso,
  porExtenso,
  SABADOS,
  somarDias,
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

test("o fuso é o de Guabiruba, e não o do servidor da Vercel", () => {
  // Sexta, 18/9, 21h em São Paulo — que é sábado 19/9, 00h em UTC. O servidor
  // roda em UTC: sem o fuso explícito, o "hoje" viraria com um dia de
  // antecedência, e a revisão espaçada — que conta em dias de Guabiruba —
  // devolveria os puzzles de amanhã na noite de hoje.
  const sextaANoite = new Date("2026-09-19T00:30:00Z");
  assert.equal(hojeNoBrasil(sextaANoite), "2026-09-18");
});

test("somar dias atravessa o mês e volta a véspera", () => {
  // A revisão espaçada é literalmente esta conta: "errou dia 30, volta dia 2".
  assert.equal(somarDias("2026-09-30", 2), "2026-10-02");
  assert.equal(somarDias("2026-09-12", 7), "2026-09-19");
  assert.equal(somarDias("2026-10-01", -1), "2026-09-30");
  assert.equal(somarDias("2026-09-12", 0), "2026-09-12");
  assert.equal(diasEntre("2026-09-12", "2026-09-19"), 7);
  assert.equal(diasEntre("2026-09-19", "2026-09-12"), -7);
  assert.equal(diasEntre("2026-09-30", "2026-10-02"), 2);
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

test("os quatro encontros são numerados 1 a 4, sem repetir, e todos têm título", () => {
  // `sabadoDaSemana` saiu com o calendário de tranca em 2026-09-09. O que
  // restou de verdade sobre esta lista é que ela é achável pelo número — é
  // assim que `content/agenda.json` a aponta, pelo rótulo `"sabado-2"`.
  assert.deepEqual(SABADOS.map((s) => s.semana), [1, 2, 3, 4]);
  for (const sabado of SABADOS) {
    assert.ok(sabado.titulo.length > 5, `o encontro ${sabado.semana} não tem título`);
  }
});

test("o torneio vem depois do último encontro", () => {
  // A agenda tira a véspera de `COMECO_DO_TORNEIO`. Se o torneio caísse antes
  // do Sábado 4, a véspera apareceria no meio do curso e ninguém veria por quê.
  assert.ok(COMECO_DO_TORNEIO > SABADOS[SABADOS.length - 1].data);
});
