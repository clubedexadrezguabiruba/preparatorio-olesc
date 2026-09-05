import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonSchema, type ExampleScene, type ExampleStage } from "./schema.ts";
import { buildFrames, defaultFrame, pausesBefore, phaseAt, sceneById } from "./example.ts";

/**
 * A aritmética da etapa 2. O que se cobra aqui é o que o componente *não*
 * consegue provar sozinho: onde o autoplay para, que fase vale em cada lance, e
 * qual quadro a etapa 1 mostra quando o autor não escolhe nenhum.
 *
 * Metade dos casos usa uma cena sintética — é o único jeito de medir fronteira
 * de fase sem depender de a aula real ter fases naquelas posições — e a outra
 * metade lê o `content/` de verdade, para o dia em que a aula mudar e a conta
 * não mudar junto.
 */

const lesson = lessonSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "content/lessons/N0-R-MATE.json"), "utf8")),
);

const cena = (parcial: Partial<ExampleScene>): ExampleScene => ({
  id: "cena",
  title: "Cena",
  positionId: "pos",
  intro: "intro",
  steps: [],
  ...parcial,
});

const quatroLances = cena({
  steps: ["a", "b", "c", "d"].map((t) => ({ move: "e2e4", text: t })),
  phases: [
    { title: "primeira", fromStep: 1 },
    { title: "segunda", fromStep: 3 },
  ],
});

test("buildFrames dá um quadro a mais que os lances, e o primeiro é a posição de partida", () => {
  const inicial = "5k2/8/4K3/3R4/8/8/8/8 w - - 0 1";
  const frames = buildFrames(inicial, [
    { move: "d5g5", text: "corte" },
    { move: "f8e8", text: "única" },
    { move: "g5g8", text: "mate" },
  ]);
  assert.equal(frames.length, 4);
  assert.equal(frames[0].fen, inicial);
  assert.equal(frames[0].lastMove, null);
  assert.deepEqual(frames[1].lastMove, ["d5", "g5"]);
  assert.equal(frames[3].mate, true);
  // Quem está para jogar num mate é o lado matado.
  assert.equal(frames[3].matedColor, "black");
  assert.equal(frames[2].mate, false);
});

test("phaseAt: antes do primeiro lance já vale a fase 1, e a virada é no fromStep", () => {
  assert.equal(phaseAt(quatroLances, 0)?.number, 1);
  assert.equal(phaseAt(quatroLances, 1)?.number, 1);
  assert.equal(phaseAt(quatroLances, 2)?.number, 1);
  assert.equal(phaseAt(quatroLances, 3)?.number, 2);
  assert.equal(phaseAt(quatroLances, 4)?.number, 2);
  assert.equal(phaseAt(quatroLances, 3)?.total, 2);
});

test("phaseAt devolve null quando a cena não declara fases", () => {
  assert.equal(phaseAt(cena({ steps: [{ move: "e2e4", text: "x" }] }), 0), null);
});

test("pausesBefore para na fronteira de fase, e nunca antes do primeiro lance", () => {
  // A fase 2 começa no lance 3, então a parada é *antes* de mostrá-lo: índice 2.
  assert.equal(pausesBefore(quatroLances, 2)?.title, "segunda");
  assert.equal(pausesBefore(quatroLances, 0), null, "a fase 1 começa junto com a cena");
  assert.equal(pausesBefore(quatroLances, 1), null);
  assert.equal(pausesBefore(quatroLances, 3), null);
});

test("defaultFrame é o último quadro da primeira cena — o mate, não a posição de partida", () => {
  const stage: ExampleStage = {
    scenes: [quatroLances, cena({ id: "outra", steps: [{ move: "e2e4", text: "x" }] })],
  };
  assert.deepEqual(defaultFrame(stage), { scene: "cena", step: 4 });
});

test("sceneById acha pelo id e devolve undefined no que não existe", () => {
  const stage: ExampleStage = { scenes: [quatroLances] };
  assert.equal(sceneById(stage, "cena")?.title, "Cena");
  assert.equal(sceneById(stage, "nao-existe"), undefined);
});

test("na aula de verdade, toda fase declarada cai dentro da cena e a primeira abre no lance 1", () => {
  const example = lesson.stages.example;
  assert.ok(example, "a N0-R-MATE precisa ter etapa 2");
  for (const scene of example.scenes) {
    const frames = buildFrames("8/8/8/1k6/8/8/8/RK6 w - - 0 1", []);
    assert.equal(frames.length, 1, "sanidade do helper");
    if (!scene.phases) continue;
    assert.equal(scene.phases[0].fromStep, 1, `a cena "${scene.id}" tem de abrir na fase 1`);
    for (const phase of scene.phases) {
      assert.ok(
        phase.fromStep <= scene.steps.length,
        `a fase "${phase.title}" começa fora da cena "${scene.id}"`,
      );
    }
    // Cada fronteira de fase, exceto a primeira, é uma parada do autoplay.
    const paradas = scene.steps
      .map((_, i) => pausesBefore(scene, i))
      .filter((p): p is NonNullable<typeof p> => p !== null);
    assert.equal(paradas.length, scene.phases.length - 1);
  }
});
