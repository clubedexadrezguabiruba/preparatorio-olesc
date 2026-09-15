import assert from "node:assert/strict";
import test from "node:test";
import { oQueAAulaInteiraTem, resumoDaConferencia } from "./frases.ts";

const etapas = (...tipos: string[]) => tipos.map((tipo) => ({ tipo }));

test("a pergunta antes de publicar diz o que a aula tem: nenhuma, uma ou várias práticas", () => {
  assert.equal(oQueAAulaInteiraTem(etapas("introducao", "capitulo", "capitulo", "treino")), "A introdução, os 2 capítulos e o treino");
  assert.equal(oQueAAulaInteiraTem(etapas("capitulo", "treino", "treino", "pratica")), "O capítulo, os 2 treinos e a prática");
  assert.equal(oQueAAulaInteiraTem(etapas("capitulo", "pratica", "treino", "pratica")), "O capítulo, o treino e as 2 práticas");
  assert.equal(oQueAAulaInteiraTem(etapas("capitulo")), "O capítulo");
  assert.equal(oQueAAulaInteiraTem([]), "A aula inteira");
});

test("o resumo da conferência concorda com o número de avisos", () => {
  const verde = { podePublicar: true, erros: 0 };
  assert.equal(resumoDaConferencia({ ...verde, avisos: 0 }), "Pode publicar.");
  assert.equal(resumoDaConferencia({ ...verde, avisos: 1 }), "Pode publicar. 1 aviso, que não impede.");
  assert.equal(resumoDaConferencia({ ...verde, avisos: 7 }), "Pode publicar. 7 avisos, que não impedem.");
});

test("o resumo da conferência que impede continua como estava", () => {
  assert.equal(resumoDaConferencia({ podePublicar: false, erros: 1, avisos: 0 }), "Ainda não dá para publicar: 1 problema impede.");
  assert.equal(resumoDaConferencia({ podePublicar: false, erros: 2, avisos: 1 }), "Ainda não dá para publicar: 2 problemas impedem. E 1 aviso.");
  assert.equal(resumoDaConferencia({ podePublicar: false, erros: 0, avisos: 0, impedimento: "o disco não respondeu" }), "Não deu para conferir: o disco não respondeu.");
  assert.equal(resumoDaConferencia({ podePublicar: true, erros: 0, avisos: 3, vencida: true }), "A aula mudou — conferindo de novo…");
});
