import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pagina = readFileSync(new URL("../../app/painel/page.tsx", import.meta.url), "utf8");

test("o painel recebe o aluno pelo nome e o convida a treinar", () => {
  assert.match(pagina, /Bem-vindo, \{perfil\.nome\}!/);
  assert.match(pagina, /Vamos treinar e praticar seu xadrez\./);
});
