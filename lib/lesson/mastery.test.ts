import assert from "node:assert/strict";
import test from "node:test";
import { masteryReport, type MasteryInput } from "./mastery.ts";

/**
 * O critério de domínio, D1 (plano da F1, §6 / bloco B4.5; formatos na FN1/B2).
 *
 * As combinações estão todas aqui porque a etapa 1 promete ao aluno, por
 * extenso, o que conta como dominado — e o selo é a única resposta a essa
 * promessa. Um selo que erra a contabilidade é pior que selo nenhum: diz
 * "dominado" a quem não dominou, ou esconde de quem dominou o que já conquistou.
 */

/** Aula completa: as duas etapas jogadas, que é o que a N0 sempre foi. */
const completa = (soloCleared: boolean, practiceWon: boolean): MasteryInput => ({
  hasSolo: true,
  hasPractice: true,
  soloCleared,
  practiceWon,
});

/** Aula curta: só a etapa 5. São ~39 das 49 aulas da trilha. */
const curta = (practiceWon: boolean): MasteryInput => ({
  hasSolo: false,
  hasPractice: true,
  soloCleared: false,
  practiceWon,
});

const casos = [
  completa(false, false),
  completa(true, false),
  completa(false, true),
  completa(true, true),
];

test("na aula completa, só os dois juntos dão domínio", () => {
  for (const caso of casos) {
    const esperado = caso.soloCleared && caso.practiceWon;
    assert.equal(masteryReport(caso).mastered, esperado, JSON.stringify(caso));
  }
});

test("o que falta é exatamente o que não foi feito", () => {
  assert.deepEqual(masteryReport(completa(false, false)).missing.map((m) => m.stage), [
    "solo",
    "practice",
  ]);
  assert.deepEqual(masteryReport(completa(true, false)).missing.map((m) => m.stage), ["practice"]);
  assert.deepEqual(masteryReport(completa(false, true)).missing.map((m) => m.stage), ["solo"]);
  assert.deepEqual(masteryReport(completa(true, true)).missing, []);
});

test("`missing` vazio se e somente se dominado", () => {
  // A invariante que impede o selo de dizer "dominado" e listar pendências, ou
  // de dizer "falta" sem dizer o quê.
  for (const caso of [...casos, curta(false), curta(true)]) {
    const r = masteryReport(caso);
    assert.equal(r.mastered, r.missing.length === 0, JSON.stringify(caso));
  }
});

test("cada combinação da aula completa tem um título próprio", () => {
  const titulos = casos.map((c) => masteryReport(c).headline);
  // Três títulos para quatro casos: "falta uma" é o mesmo texto para as duas
  // metades que faltam, porque o *que* falta vem na lista logo abaixo.
  assert.equal(new Set(titulos).size, 3, titulos.join(" | "));
  assert.equal(titulos[3].startsWith("Dominado"), true);
  assert.equal(titulos[0].startsWith("Ainda não dominado"), true);
});

test("os dois textos de pendência são distintos e nomeiam a etapa certa", () => {
  const [solo, practice] = masteryReport(completa(false, false)).missing;
  assert.notEqual(solo.text, practice.text);
  assert.equal(solo.text.includes("sem ajuda"), true);
  assert.equal(practice.text.includes("computador"), true);
});

/* ------------------------------------------------------------------ *
 * FN1/B2 — a aula diz quais etapas tem
 * ------------------------------------------------------------------ */

test("aula curta nunca cobra a etapa sem ajuda, nem quando ela não foi feita", () => {
  // O caso que motivou a mudança: `soloCleared: false` numa aula que não tem
  // etapa 4. Antes o selo mandava o aluno a uma aba que não existe.
  const r = masteryReport(curta(false));
  assert.equal(
    r.missing.some((m) => m.stage === "solo"),
    false,
    JSON.stringify(r.missing),
  );
  assert.equal(r.missing.length, 1);
  assert.equal(r.mastered, false);
});

test("aula curta é dominada só com a prática vencida", () => {
  const r = masteryReport(curta(true));
  assert.equal(r.mastered, true);
  assert.equal(r.missing.length, 0);
  // O título diz *por que* uma metade bastou, senão o aluno da aula completa e
  // o da curta leem a mesma frase para critérios diferentes.
  assert.equal(r.headline.includes("não tem etapa sem ajuda"), true, r.headline);
});

test("aula só com etapa sem ajuda é dominada sem prática", () => {
  const r = masteryReport({
    hasSolo: true,
    hasPractice: false,
    soloCleared: true,
    practiceWon: false,
  });
  assert.equal(r.mastered, true);
  assert.equal(r.missing.length, 0);
});

test("aula de leitura não afere domínio, e não o concede de graça", () => {
  // Nada a exigir **não** é o mesmo que critério cumprido: o domínio do formato
  // leitura é uma declaração do aluno, gravada no banco, e não este selo.
  const r = masteryReport({
    hasSolo: false,
    hasPractice: false,
    soloCleared: false,
    practiceWon: false,
  });
  assert.equal(r.mastered, false);
  assert.deepEqual(r.missing, []);
  assert.equal(r.headline.includes("leitura"), true, r.headline);
});

/* ------------------------------------------------------------------ *
 * FN1/B2 — ganhar e segurar são pedidos diferentes
 * ------------------------------------------------------------------ */

test("o objetivo de empate troca as duas pendências, e nenhuma fala em vencer", () => {
  const r = masteryReport({
    ...completa(false, false),
    soloGoal: "draw",
    practiceGoal: "draw",
  });
  const [solo, practice] = r.missing;
  assert.equal(solo.text.includes("empate"), true, solo.text);
  assert.equal(practice.text.includes("empate"), true, practice.text);
  for (const item of r.missing) {
    assert.equal(/vencer|mate\b/i.test(item.text), false, item.text);
  }
});

test("sem dizer o objetivo, o texto é o de vitória — como sempre foi", () => {
  const semDizer = masteryReport(completa(false, false)).missing.map((m) => m.text);
  const dizendo = masteryReport({ ...completa(false, false), soloGoal: "win", practiceGoal: "win" })
    .missing.map((m) => m.text);
  assert.deepEqual(semDizer, dizendo);
  assert.equal(semDizer[0].includes("até o mate"), true, semDizer[0]);
});

test("as duas etapas podem ter objetivos diferentes", () => {
  // Existe de verdade: uma aula pode aferir a técnica de vitória na árvore e
  // pedir na prática que o aluno segure a posição do outro lado.
  const r = masteryReport({ ...completa(false, false), soloGoal: "win", practiceGoal: "draw" });
  assert.equal(r.missing[0].text.includes("até o mate"), true, r.missing[0].text);
  assert.equal(r.missing[1].text.includes("Segurar o empate"), true, r.missing[1].text);
});
