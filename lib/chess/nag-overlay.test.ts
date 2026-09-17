import assert from "node:assert/strict";
import test from "node:test";
import { posicaoDoNag, simboloDoCirculo } from "./nag-overlay.ts";

test("o selo fica sobre o canto superior direito do lance, como no Lichess", () => {
  assert.deepEqual(posicaoDoNag("e5", "white"), { left: 61.5, top: 38.5 });
  assert.deepEqual(posicaoDoNag("e5", "black"), { left: 49, top: 51 });
});

test("o círculo mostra o primeiro dos seis símbolos de qualidade; os outros NAGs ficam fora dele", () => {
  assert.equal(simboloDoCirculo([3]), "!!");
  assert.equal(simboloDoCirculo([14, 4, 36]), "??");
  assert.equal(simboloDoCirculo([14, 36, 40]), null);
  assert.equal(simboloDoCirculo(undefined), null);
});
