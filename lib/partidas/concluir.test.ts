import assert from "node:assert/strict";
import test from "node:test";
import { situacaoDaPartida, versaoDoMomento, type LinhaDeMomento } from "./concluir.ts";

const MOMENTOS = [
  { n: 1, desafioFinal: false, versao: "aaaa" },
  { n: 2, desafioFinal: true, versao: "bbbb" },
];

const linha = (momento: number, mudar: Partial<LinhaDeMomento> = {}): LinhaDeMomento => ({
  momento,
  versao: momento === 1 ? "aaaa" : "bbbb",
  acertou: true,
  tentativa: 1,
  apoio: 0,
  ...mudar,
});

test("nada jogado: pendente, e não concluída", () => {
  const s = situacaoDaPartida(MOMENTOS, []);
  assert.equal(s.concluida, false);
  assert.equal(s.momentos.get(1), "pendente");
});

test("todos resolvidos e o Desafio final de primeira: concluída", () => {
  const s = situacaoDaPartida(MOMENTOS, [linha(1, { tentativa: 3, apoio: 2 }), linha(2)]);
  assert.equal(s.concluida, true);
  assert.equal(s.momentos.get(1), "com-ajuda");
  assert.equal(s.dePrimeira, 1);
});

test("o Desafio final com erro antes, ou com o lance revelado, não conclui", () => {
  assert.equal(situacaoDaPartida(MOMENTOS, [linha(1), linha(2, { tentativa: 2, apoio: 1 })]).concluida, false);
  assert.equal(situacaoDaPartida(MOMENTOS, [linha(1), linha(2, { apoio: 3 })]).concluida, false);
});

test("refazer a série e acertar o Desafio de primeira conclui", () => {
  const s = situacaoDaPartida(MOMENTOS, [
    linha(1),
    linha(2, { acertou: false }),
    linha(2, { tentativa: 2, apoio: 1 }),
    linha(2),
  ]);
  assert.equal(s.concluida, true);
});

test("o Desafio de primeira sem os outros momentos não conclui", () => {
  assert.equal(situacaoDaPartida(MOMENTOS, [linha(2)]).concluida, false);
});

test("resposta de uma versão velha do momento não conta", () => {
  const s = situacaoDaPartida(MOMENTOS, [linha(1), linha(2, { versao: "velha" })]);
  assert.equal(s.concluida, false);
  assert.equal(s.momentos.get(2), "pendente");
});

test("a versão muda com a FEN ou o lance, e tem 8 casas", async () => {
  const a = await versaoDoMomento({ fen: "8/8/8/8/8/8/8/K6k w - - 0 1", uci: "a1a2" });
  const b = await versaoDoMomento({ fen: "8/8/8/8/8/8/8/K6k w - - 0 1", uci: "a1b1" });
  assert.match(a, /^[0-9a-f]{8}$/);
  assert.notEqual(a, b);
});
