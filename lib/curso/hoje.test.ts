import assert from "node:assert/strict";
import test from "node:test";
import {
  META_DO_DIA_MIN,
  MINIMO_DA_SEQUENCIA_MIN,
  MINUTOS_DA_PARTIDA,
  minutosDeHoje,
  sequenciaDeDias,
  serieDeDias,
  type MinutosDoDia,
} from "./hoje.ts";

const linha = (dia: string, bloco: string, minutos: number): MinutosDoDia => ({
  dia,
  bloco,
  tempo_ms: minutos * 60_000,
});

test("os minutos de hoje somam por bloco e ignoram os outros dias", () => {
  const linhas = [
    linha("2026-09-14", "tatica", 28),
    linha("2026-09-14", "finais", 37),
    linha("2026-09-13", "tatica", 90),
  ];
  assert.deepEqual(minutosDeHoje(linhas, "2026-09-14"), {
    tatica: 28,
    finais: 37,
    partida: 0,
    medido: 65,
    total: 65,
  });
  assert.deepEqual(minutosDeHoje(linhas, "2026-09-15"), {
    tatica: 0,
    finais: 0,
    partida: 0,
    medido: 0,
    total: 0,
  });
});

test("arredonda depois de somar, não antes", () => {
  // Trinta puzzles de 40 segundos são 20 minutos. Arredondando cada um seriam
  // zero — que é o erro que faria o cartão dizer que o aluno não treinou.
  const trintaDe40s: MinutosDoDia[] = Array.from({ length: 30 }, () => ({
    dia: "2026-09-14",
    bloco: "tatica",
    tempo_ms: 40_000,
  }));
  assert.equal(minutosDeHoje(trintaDe40s, "2026-09-14").total, 20);
});

/* ------------------------------------------------------------------ *
 * A partida, e a barra que passa a medir o que promete
 * ------------------------------------------------------------------ */

test("a partida declarada entra no total, e fica separada do medido", () => {
  const linhas = [linha("2026-09-14", "tatica", 45), linha("2026-09-14", "finais", 30)];
  const m = minutosDeHoje(linhas, "2026-09-14", true);
  assert.equal(m.medido, 75, "medido é só o que o site cronometrou");
  assert.equal(m.partida, MINUTOS_DA_PARTIDA);
  assert.equal(m.total, 105);
});

test("a rotina inteira do plano mestre bate a meta do dia", () => {
  // **O defeito, cravado em número.** Antes de 2026-09-09 o aluno que cumpria a
  // rotina inteira — 45 de tática, 30 de finais, a partida jogada — lia
  // "75 de 120" e concluía que tinha falhado. Agora ele lê 105 de 90.
  const rotina = [linha("2026-09-14", "tatica", 45), linha("2026-09-14", "finais", 30)];
  const m = minutosDeHoje(rotina, "2026-09-14", true);
  assert.ok(m.total >= META_DO_DIA_MIN, `${m.total} não bate a meta de ${META_DO_DIA_MIN}`);

  // E sem a partida ele ainda não bate — a partida é bloco de rotina, não bônus.
  assert.ok(minutosDeHoje(rotina, "2026-09-14", false).total < META_DO_DIA_MIN);
});

test("a meta é 90 e o mínimo da sequência é 60 — e o mínimo é menor", () => {
  assert.equal(META_DO_DIA_MIN, 90);
  assert.equal(MINIMO_DA_SEQUENCIA_MIN, 60);
  assert.ok(MINIMO_DA_SEQUENCIA_MIN < META_DO_DIA_MIN, "um dia curto não pode zerar a sequência");
});

/* ------------------------------------------------------------------ *
 * A sequência
 * ------------------------------------------------------------------ */

test("a sequência conta dias seguidos com o mínimo", () => {
  const linhas = [
    linha("2026-09-14", "tatica", 70),
    linha("2026-09-13", "finais", 65),
    linha("2026-09-12", "tatica", 120),
  ];
  assert.equal(sequenciaDeDias(linhas, "2026-09-14"), 3);
});

test("a partida não sustenta a sequência — só tempo medido conta", () => {
  // A escolha registrada: com a partida valendo 30, deixá-la contar derrubaria
  // o mínimo de 60 para "30 minutos reais mais uma caixa marcada". A sequência
  // premia constância e não pode ser mantida por declaração.
  const meiaRotina = [linha("2026-09-14", "tatica", 35)];
  assert.equal(minutosDeHoje(meiaRotina, "2026-09-14", true).total, 65, "a barra vê 65");
  assert.equal(sequenciaDeDias(meiaRotina, "2026-09-14"), 0, "a sequência não vê a partida");
});

test("hoje ainda vazio não zera a sequência de ontem", () => {
  // Nove da manhã: ninguém treinou hoje. A sequência está viva, não perdida.
  const linhas = [linha("2026-09-13", "tatica", 65), linha("2026-09-12", "tatica", 90)];
  assert.equal(sequenciaDeDias(linhas, "2026-09-14"), 2);

  // Com 20 minutos hoje ela continua valendo 2 — hoje ainda não fechou.
  assert.equal(sequenciaDeDias([...linhas, linha("2026-09-14", "tatica", 20)], "2026-09-14"), 2);
});

test("um buraco corta a sequência", () => {
  const linhas = [
    linha("2026-09-14", "tatica", 70),
    // 13/9 sem nada
    linha("2026-09-12", "tatica", 90),
  ];
  assert.equal(sequenciaDeDias(linhas, "2026-09-14"), 1);
});

test("um dia curto não conta, e soma os dois blocos", () => {
  assert.equal(sequenciaDeDias([linha("2026-09-14", "tatica", 59)], "2026-09-14"), 0);
  // Os dois blocos somam: 35 de tática e 30 de finais fecham o mínimo.
  const somando = [linha("2026-09-14", "tatica", 35), linha("2026-09-14", "finais", 30)];
  assert.equal(sequenciaDeDias(somando, "2026-09-14"), 1);
});

test("sem nada, a sequência é zero", () => {
  assert.equal(sequenciaDeDias([], "2026-09-14"), 0);
});

/* ------------------------------------------------------------------ *
 * A série do relatório do professor
 * ------------------------------------------------------------------ */

test("a série de dias mostra os buracos, e não só os dias treinados", () => {
  // O dia vazio é a informação: um gráfico que só desenha os dias com linha
  // esconde justamente o que o professor abriu a tela para ver.
  const linhas: MinutosDoDia[] = [
    { dia: "2026-09-10", bloco: "tatica", tempo_ms: 45 * 60_000 },
    { dia: "2026-09-10", bloco: "finais", tempo_ms: 40 * 60_000 },
    { dia: "2026-09-12", bloco: "tatica", tempo_ms: 30 * 60_000 },
  ];
  const serie = serieDeDias(linhas, "2026-09-12", 4);

  assert.equal(serie.length, 4);
  assert.deepEqual(
    serie.map((d) => d.dia),
    ["2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"],
  );
  assert.equal(serie[0].total, 0, "o dia sem linha entra zerado");
  assert.equal(serie[1].total, 85);
  assert.equal(serie[1].bateuMinimo, true);
  assert.equal(serie[1].bateuMeta, false, `85 minutos não são os ${META_DO_DIA_MIN} da meta`);
  assert.equal(serie[3].tatica, 30);
  assert.equal(serie[3].bateuMinimo, false);
});

test("o gráfico do professor soma o mesmo que a barra do aluno, no mesmo dia", () => {
  // **A divergência nº 3, cravada.** As duas telas leem funções diferentes; se
  // uma passar a contar a partida e a outra não, é o bug de 6/9/2026 de novo,
  // por outra porta. Aqui elas são comparadas termo a termo.
  const linhas = [linha("2026-09-14", "tatica", 45), linha("2026-09-14", "finais", 30)];
  const partidas = new Set(["2026-09-14"]);

  const doAluno = minutosDeHoje(linhas, "2026-09-14", partidas.has("2026-09-14"));
  const doProfessor = serieDeDias(linhas, "2026-09-14", 1, partidas)[0];

  assert.equal(doProfessor.total, doAluno.total);
  assert.equal(doProfessor.medido, doAluno.medido);
  assert.equal(doProfessor.partida, doAluno.partida);
  assert.equal(doProfessor.bateuMeta, doAluno.total >= META_DO_DIA_MIN);
});

test("na série, a partida conta para a meta mas não para o mínimo", () => {
  const linhas = [linha("2026-09-14", "tatica", 35), linha("2026-09-14", "finais", 25)];
  const [dia] = serieDeDias(linhas, "2026-09-14", 1, new Set(["2026-09-14"]));
  assert.equal(dia.total, 90);
  assert.equal(dia.medido, 60);
  assert.equal(dia.bateuMeta, true);
  assert.equal(dia.bateuMinimo, true, "60 medidos batem o mínimo por conta própria");

  // Um dia curto com partida: bate a meta? Não. E não sustenta a sequência.
  const curto = [linha("2026-09-14", "tatica", 20)];
  const [outro] = serieDeDias(curto, "2026-09-14", 1, new Set(["2026-09-14"]));
  assert.equal(outro.total, 50);
  assert.equal(outro.bateuMeta, false);
  assert.equal(outro.bateuMinimo, false);
});

test("sem partidas declaradas, a série é a de antes", () => {
  const linhas = [linha("2026-09-14", "tatica", 70)];
  const [comConjuntoVazio] = serieDeDias(linhas, "2026-09-14", 1, new Set());
  const [semArgumento] = serieDeDias(linhas, "2026-09-14", 1);
  assert.deepEqual(comConjuntoVazio, semArgumento);
  assert.equal(comConjuntoVazio.partida, 0);
});
