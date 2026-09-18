import assert from "node:assert/strict";
import test from "node:test";
import { EXPLICACAO_DA_ETAPA, chaveDaExplicacaoDaEtapa } from "./explicacao-etapas.ts";
import { ETAPAS } from "./serie.ts";

test("cada etapa explica rapidamente o que o aluno vai praticar", () => {
  assert.deepEqual(Object.keys(EXPLICACAO_DA_ETAPA), ETAPAS);
  assert.match(EXPLICACAO_DA_ETAPA.aquecimento.texto, /5 problemas mais fáceis/);
  assert.match(EXPLICACAO_DA_ETAPA.serie.texto, /24 problemas.*dificuldade crescente/);
  assert.match(EXPLICACAO_DA_ETAPA.prova.texto, /misturado com temas que você já estudou/);
  assert.match(EXPLICACAO_DA_ETAPA.prova.texto, /reconhecer sozinho/);
  assert.equal(new Set(ETAPAS.map(chaveDaExplicacaoDaEtapa)).size, ETAPAS.length);
});
