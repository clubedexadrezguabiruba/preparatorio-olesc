import assert from "node:assert/strict";
import test from "node:test";
import {
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
  assert.deepEqual(minutosDeHoje(linhas, "2026-09-14"), { tatica: 28, finais: 37, total: 65 });
  assert.deepEqual(minutosDeHoje(linhas, "2026-09-15"), { tatica: 0, finais: 0, total: 0 });
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

test("a sequência conta dias seguidos com o mínimo", () => {
  const linhas = [
    linha("2026-09-14", "tatica", 70),
    linha("2026-09-13", "finais", 65),
    linha("2026-09-12", "tatica", 120),
  ];
  assert.equal(sequenciaDeDias(linhas, "2026-09-14"), 3);
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
  assert.equal(serie[1].bateuMeta, false, "85 minutos não são os 120 da meta");
  assert.equal(serie[3].tatica, 30);
  assert.equal(serie[3].bateuMinimo, false);
});
