/**
 * Regras 16 e 17 do curso de abertura (spec §18.1): o que cada vez deixa fazer.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { comoPular, podeAbrir, podePular, primeiraPendente, rodadaConcluida, temAtalhoDoTreinador, type EtapaDaRodada } from "./rodada.ts";

const AULA_B: EtapaDaRodada[] = [
  { id: "cap-1", tipo: "capitulo" },
  { id: "parada-1", tipo: "treino" },
  { id: "cap-2", tipo: "capitulo" },
  { id: "guiado", tipo: "treino" },
  { id: "treinador", tipo: "treinador" },
];
const AULA_D: EtapaDaRodada[] = [{ id: "partida", tipo: "capitulo" }];

test("1ª vez: só se abre até a primeira etapa pendente, e nada se pula", () => {
  const rodada = { vez: 1, feitas: ["cap-1"] };
  assert.equal(primeiraPendente(AULA_B, rodada.feitas), 1);
  assert.deepEqual(AULA_B.map((_, i) => podeAbrir(rodada, AULA_B, i)), [true, true, false, false, false]);
  assert.ok(AULA_B.every((etapa) => !podePular(rodada, etapa)));
  assert.equal(temAtalhoDoTreinador(rodada, AULA_B), false);
});

test("2ª vez: Pular só na explicação; parada, treino guiado e move trainer não se pulam", () => {
  const rodada = { vez: 2, feitas: [] };
  assert.deepEqual(AULA_B.map((etapa) => podePular(rodada, etapa)), [true, false, true, false, false]);
  assert.deepEqual(AULA_B.map((_, i) => podeAbrir(rodada, AULA_B, i)), [true, false, false, false, false]);
  assert.equal(podePular(rodada, AULA_D[0]), true, "a partida modelo pula livre da 2ª vez em diante");
});

test("3ª vez em diante: nada trava, e a aula conclui com o move trainer", () => {
  const rodada = { vez: 3, feitas: ["treinador"] };
  assert.ok(AULA_B.every((_, i) => podeAbrir(rodada, AULA_B, i)));
  assert.equal(temAtalhoDoTreinador(rodada, AULA_B), true);
  assert.equal(rodadaConcluida(rodada, AULA_B), true);
  assert.equal(temAtalhoDoTreinador({ vez: 5, feitas: [] }, AULA_D), false, "sem move trainer, sem atalho");
});

test("até a 2ª vez, a rodada só conclui com todas as etapas feitas; retoma na primeira pendente", () => {
  assert.equal(rodadaConcluida({ vez: 1, feitas: ["cap-1", "parada-1", "cap-2", "guiado"] }, AULA_B), false);
  assert.equal(rodadaConcluida({ vez: 1, feitas: AULA_B.map((e) => e.id) }, AULA_B), true);
  assert.equal(rodadaConcluida({ vez: 3, feitas: [] }, AULA_D), false);
  assert.equal(primeiraPendente(AULA_B, ["cap-1", "parada-1"]), 2);
  assert.equal(primeiraPendente(AULA_B, AULA_B.map((e) => e.id)), AULA_B.length);
});

test("Pular num capítulo com perguntas corre a fala e para em cada pergunta (Doug, 18/9/2026)", () => {
  const rodada = { vez: 2, feitas: [] };
  const comPerguntas = { id: "cap-golpe", tipo: "capitulo" as const, perguntas: 2 };
  assert.equal(podePular(rodada, comPerguntas), true);
  assert.equal(comoPular(comPerguntas), "corre", "o aluno ainda joga os lances");
  assert.equal(comoPular({ id: "cap-a", tipo: "capitulo", perguntas: 0 }), "pula");
  assert.equal(comoPular({ id: "intro", tipo: "introducao" }), "pula");
});
