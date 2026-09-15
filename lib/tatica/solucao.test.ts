import assert from "node:assert/strict";
import test from "node:test";
import { applyUci } from "../chess/fen.ts";
import { quadrosDaSolucao } from "./solucao.ts";

/** backRankMate 1Sh7v (rating 1000): Dxe4, e as pretas dão mate em 2 no corredor. */
const PUZZLE = {
  fen: "r5k1/4ppbp/2p3p1/2PnN3/3Pn3/7R/5PPP/1Q4K1 w - - 5 35",
  lances: ["b1e4", "a8a1", "e4b1", "a1b1"],
};
const depoisDe = (...ucis: string[]) => ucis.reduce((fen, uci) => applyUci(fen, uci)!.fen, PUZZLE.fen);

test("errou o primeiro lance: a posição dele, e a linha inteira até o mate", () => {
  const quadros = quadrosDaSolucao(PUZZLE.lances, { fen: depoisDe("b1e4"), indice: 1 });
  assert.equal(quadros.length, 4);
  assert.deepEqual(quadros[0].lance, ["b1", "e4"], "o quadro 0 destaca o lance do adversário que levou à posição");
  assert.equal(quadros[0].fen, depoisDe("b1e4"));
  assert.deepEqual(quadros[1], { fen: depoisDe("b1e4", "a8a1"), lance: ["a8", "a1"], mateDe: null, captura: false, xeque: true });
  assert.deepEqual(quadros[3].lance, ["a1", "b1"]);
  assert.equal(quadros[3].captura, true);
  assert.equal(quadros[3].mateDe, "w", "o mate é no rei branco");
});

test("errou o segundo lance: começa ali, e não repete o que ele já acertou", () => {
  const quadros = quadrosDaSolucao(PUZZLE.lances, { fen: depoisDe("b1e4", "a8a1", "e4b1"), indice: 3 });
  assert.equal(quadros.length, 2);
  assert.deepEqual(quadros[0].lance, ["e4", "b1"]);
  assert.equal(quadros[1].mateDe, "w");
});

test("um lance que não se aplica corta a linha ali, sem quebrar", () => {
  const quadros = quadrosDaSolucao(["b1e4", "a8a1", "h1h8", "a1b1"], { fen: depoisDe("b1e4"), indice: 1 });
  assert.equal(quadros.length, 2);
});
