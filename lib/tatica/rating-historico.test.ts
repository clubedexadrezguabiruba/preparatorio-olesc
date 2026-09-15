import assert from "node:assert/strict";
import test from "node:test";
import {
  historicoPorDia,
  resumo,
  temasDaTentativa,
  temasFracos,
  ultimosDias,
  variacaoNaSemana,
  type TentativaDoRating,
} from "./rating-historico.ts";

/**
 * As datas são meio-dia em São Paulo (`T15:00:00Z`), como em `revisao.test.ts`,
 * para o dia da linha ser o dia escrito sem depender do fuso de quem roda.
 */
function linha(dia: string, antes: number, depois: number, acertou = depois >= antes, hora = "15:00"): TentativaDoRating {
  return { puzzle_id: `${dia}-${hora}`, origem: "fork", acertou, rating_antes: antes, rating_depois: depois, criada_em: `${dia}T${hora}:00.000Z` };
}

test("o gráfico: o último rating de cada dia, na ordem, mesmo com as linhas fora de ordem", () => {
  const linhas = [
    linha("2026-09-15", 700, 650, false, "18:00"),
    linha("2026-09-14", 400, 600),
    linha("2026-09-15", 600, 700, true, "16:00"),
  ];
  assert.deepEqual(historicoPorDia(linhas), [
    { dia: "2026-09-14", rating: 600, recorde: 600 },
    { dia: "2026-09-15", rating: 650, recorde: 700 },
  ]);
});

test("o recorde conta o pico de dentro do dia, e nunca desce", () => {
  const linhas = [
    linha("2026-09-14", 400, 900, true, "13:00"),
    linha("2026-09-14", 900, 850, false, "14:00"),
    linha("2026-09-15", 850, 800, false),
  ];
  const pontos = historicoPorDia(linhas);
  assert.deepEqual(pontos.map((p) => p.recorde), [900, 900]);
  assert.deepEqual(pontos.map((p) => p.rating), [850, 800]);
});

test("o recorde começa no rating de antes do primeiro problema: quem só errou tem recorde no início", () => {
  assert.equal(historicoPorDia([linha("2026-09-14", 600, 583, false)])[0].recorde, 600);
  assert.equal(historicoPorDia([linha("2026-09-14", 1200, 1184, false)])[0].recorde, 1200, "o início é o de cada aluno");
  assert.deepEqual(historicoPorDia([]), []);
});

test("o dia é o de Guabiruba: 23h30 de lá ainda é o mesmo dia", () => {
  // 02:30Z do dia 16 é 23:30 do dia 15 em São Paulo.
  const pontos = historicoPorDia([linha("2026-09-16", 400, 500, true, "02:30")]);
  assert.equal(pontos[0].dia, "2026-09-15");
});

test("os últimos 30 dias contam hoje", () => {
  const pontos = [
    { dia: "2026-08-16", rating: 1, recorde: 1 },
    { dia: "2026-08-17", rating: 2, recorde: 2 },
    { dia: "2026-09-15", rating: 3, recorde: 3 },
  ];
  assert.deepEqual(ultimosDias(pontos, 30, "2026-09-15").map((p) => p.rating), [2, 3]);
});

test("o resumo: resolvidos e % de acerto", () => {
  assert.deepEqual(resumo([{ acertou: true }, { acertou: false }, { acertou: true }]), { resolvidos: 3, acertos: 2, acerto: 67 });
  assert.deepEqual(resumo([]), { resolvidos: 0, acertos: 0, acerto: null });
});

test("a variação da semana: atual menos o de antes da primeira tentativa dos últimos 7 dias", () => {
  const agora = new Date("2026-09-15T15:00:00.000Z");
  const linhas = [linha("2026-09-01", 400, 800), linha("2026-09-09", 800, 820), linha("2026-09-14", 820, 780, false)];
  // Os 7 dias são 9 a 15: a primeira é a de 9/9, que começou em 800.
  assert.equal(variacaoNaSemana(linhas, 780.4, agora), -20);
  assert.equal(variacaoNaSemana([linha("2026-09-01", 400, 800)], 800, agora), 0, "sem tentativa na semana, zero");
});

test("por quais temas conta: o tema de origem, ou os temas do problema de 600–700", () => {
  assert.deepEqual(temasDaTentativa("fork", ["fork", "middlegame"]), ["fork"]);
  assert.deepEqual(temasDaTentativa("rating-base", ["mateIn1", "hangingPiece", "short", "endgame"]), ["mateIn1", "hangingPiece"]);
  assert.deepEqual(temasDaTentativa("rating-base", null), []);
  assert.deepEqual(temasDaTentativa("temaQueSaiu", []), []);
});

test("temas fracos: os 3 de pior acerto, só com 5 tentativas ou mais", () => {
  const vezes = (temas: string[], certos: number, erros: number) => [
    ...Array.from({ length: certos }, () => ({ temas, acertou: true })),
    ...Array.from({ length: erros }, () => ({ temas, acertou: false })),
  ];
  const tentativas = [
    ...vezes(["fork"], 4, 1), // 80%
    ...vezes(["pin"], 1, 4), // 20%
    ...vezes(["skewer"], 2, 3), // 40%
    ...vezes(["mateIn1"], 3, 2), // 60%
    ...vezes(["zugzwang"], 0, 4), // 0%, mas só 4: fica fora
  ];
  assert.deepEqual(
    temasFracos(tentativas).map((t) => [t.tag, t.acerto, t.tentativas]),
    [["pin", 20, 5], ["skewer", 40, 5], ["mateIn1", 60, 5]],
  );
});

test("temas fracos: no empate, mais tentativas primeiro; depois a ordem do currículo", () => {
  const t = (tag: string, n: number) => Array.from({ length: n }, (_, i) => ({ temas: [tag], acertou: i % 2 === 0 }));
  // fork 10 (5/10 = 50%), pin 6 (3/6 = 50%), mateIn1 6 (3/6 = 50%): mateIn1 vem antes de pin no currículo.
  assert.deepEqual(temasFracos([...t("pin", 6), ...t("mateIn1", 6), ...t("fork", 10)]).map((x) => x.tag), ["fork", "mateIn1", "pin"]);
});

test("temas fracos: um problema com dois temas conta nos dois, e uma vez em cada", () => {
  const tentativas = Array.from({ length: 5 }, () => ({ temas: ["mateIn1", "hangingPiece", "mateIn1"], acertou: false }));
  assert.deepEqual(temasFracos(tentativas).map((x) => [x.tag, x.tentativas]), [["mateIn1", 5], ["hangingPiece", 5]]);
});
