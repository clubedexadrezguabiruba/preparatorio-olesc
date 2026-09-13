/**
 * A store do aluno para a aula v2 (fatia 7): etapas por id do fluxo, selo por prática, id
 * idempotente de tentativa e registro de dica vista. Os testes da aula v1 (`store.test.ts`)
 * continuam valendo sem mudança.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { useLessonStore } from "./store.ts";

const abrir = () =>
  useLessonStore.getState().open("N0-LADDER", "etapa-capitulo", { "etapa-treino-a": "n1", "etapa-treino-b": "q1" }, [
    { key: "etapa-pratica", positionId: "pos-x", startFen: "8/8/8/8/8/4k3/6R1/6RK w - - 0 1" },
  ]);

test("aula v2: uma árvore por treino do fluxo, e a etapa aberta é o id da etapa", () => {
  abrir();
  const estado = useLessonStore.getState();
  assert.equal(estado.stage, "etapa-capitulo");
  assert.deepEqual(Object.keys(estado.trees).sort(), ["etapa-treino-a", "etapa-treino-b"]);
  assert.equal(estado.trees["etapa-treino-b"]?.rootId, "q1");
});

test("§20.2: cada tentativa tem id próprio, e recomeçar cria outro", () => {
  abrir();
  const primeira = useLessonStore.getState().trees["etapa-treino-a"]!.tentativaId;
  const partida = useLessonStore.getState().practices["etapa-pratica"]!.tentativaId;
  assert.match(primeira, /^[0-9a-f-]{36}$/);
  assert.notEqual(primeira, useLessonStore.getState().trees["etapa-treino-b"]!.tentativaId);
  useLessonStore.getState().treeRestart("etapa-treino-a");
  assert.notEqual(useLessonStore.getState().trees["etapa-treino-a"]!.tentativaId, primeira);
  useLessonStore.getState().practiceRestart("etapa-pratica");
  assert.notEqual(useLessonStore.getState().practices["etapa-pratica"]!.tentativaId, partida);
});

test("plano §8: a dica vista é registrada uma vez por pergunta, e recomeçar zera", () => {
  abrir();
  const store = useLessonStore.getState();
  store.treeHelp("etapa-treino-a", "n1");
  store.treeHelp("etapa-treino-a", "n1");
  store.treeHelp("etapa-treino-a", "n2");
  assert.deepEqual(useLessonStore.getState().trees["etapa-treino-a"]!.ajudas, ["n1", "n2"]);
  useLessonStore.getState().treeRestart("etapa-treino-a");
  assert.deepEqual(useLessonStore.getState().trees["etapa-treino-a"]!.ajudas, []);
});

test("o selo é da prática que venceu, pela chave dela", () => {
  abrir();
  assert.equal(useLessonStore.getState().cleared["etapa-pratica"], false);
  useLessonStore.getState().practiceFinish("etapa-pratica", { result: "win-white", text: "venceu", passed: true });
  assert.equal(useLessonStore.getState().cleared["etapa-pratica"], true);
});
