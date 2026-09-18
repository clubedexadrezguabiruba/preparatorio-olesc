import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("o cartão de rating convida a jogar com ação e ilustração", () => {
  const pagina = readFileSync("app/tatica/page.tsx", "utf8");
  assert.match(pagina, /Aceite o desafio da tática rating/);
  assert.match(pagina, /Jogar agora/);
  assert.match(pagina, /function IconeRating/);
  assert.match(pagina, /superar seu próprio recorde/);
});
