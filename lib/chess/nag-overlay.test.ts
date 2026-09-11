import assert from "node:assert/strict";
import test from "node:test";
import { posicaoDoNag } from "./nag-overlay.ts";

test("o selo fica sobre o canto superior direito do lance, como no Lichess", () => {
  assert.deepEqual(posicaoDoNag("e5", "white"), { left: 61.5, top: 38.5 });
  assert.deepEqual(posicaoDoNag("e5", "black"), { left: 49, top: 51 });
});
