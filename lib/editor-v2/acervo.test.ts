/**
 * Capítulo a partir do acervo — fatia 10, parada 10B.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico } from "./comandos.ts";
import { hashDaPosicao } from "./hash.ts";
import { lerPosicoesDoConteudoV2 } from "./gate.ts";
import { filtrarAcervo, pecasDaFen, type PosicaoDoAcervoV2 } from "./acervo.ts";
import { problemasDaAulaV2, type AulaV2 } from "./modelo.ts";
import { prepararNovoCapitulo } from "./novo-capitulo.ts";

const posicoes = lerPosicoesDoConteudoV2();
const acervo: PosicaoDoAcervoV2[] = Object.values(posicoes).map((position) => ({ position, conteudoHash: hashDaPosicao(position) }));
const vazia: AulaV2 = {
  schemaVersion: 2, id: "EX-ACERVO", titulo: "Acervo",
  metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
  proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
};

test("capítulo do acervo nasce com a posição e a revisão dela registrada, sem aviso de FEN", () => {
  const item = acervo.find((a) => a.position.id === "pos-n0-qmate-cook-d1")!;
  const pedido = { nome: "Mate em dois", fen: item.position.fen, orientacao: "white" as const, doAcervo: { positionId: item.position.id, conteudoHash: item.conteudoHash, estado: item.position.status } };
  const preparo = prepararNovoCapitulo(vazia, pedido);
  assert.ok(preparo.ok);
  let historico = iniciarHistorico(vazia);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "ADICIONAR_CAPITULO", novo: preparo.novo }, posicoes));
  const aula = historico.presente;
  assert.deepEqual(aula.analises[0].inicio, { tipo: "posicao", positionId: "pos-n0-qmate-cook-d1" });
  assert.deepEqual(aula.proveniencia, [{ positionId: "pos-n0-qmate-cook-d1", conteudoHash: item.conteudoHash, estado: "approved" }]);
  assert.deepEqual(problemasDaAulaV2(aula, posicoes, hashDaPosicao).map((p) => p.codigo), []);

  // A segunda vez com a mesma posição não duplica o registro.
  const outra = prepararNovoCapitulo(aula, { ...pedido, nome: "De novo" });
  assert.ok(outra.ok);
  const duas = executarComando(aula, { tipo: "ADICIONAR_CAPITULO", novo: outra.novo }, posicoes);
  assert.equal(duas.proveniencia.length, 1);

  historico = desfazer(historico);
  assert.deepEqual(historico.presente.proveniencia, []);
});

test("busca no acervo e contagem de peças", () => {
  assert.ok(filtrarAcervo(acervo, "kqk").length >= 1);
  assert.equal(filtrarAcervo(acervo, "nada-que-exista-zzz").length, 0);
  assert.equal(pecasDaFen("8/8/8/8/4k3/8/8/3QK3 w - - 0 1"), 3);
});
