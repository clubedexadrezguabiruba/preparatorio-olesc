import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cabecalho = readFileSync(new URL("../../components/Cabecalho.tsx", import.meta.url), "utf8");
const pagina = readFileSync(new URL("../../app/meio-jogo/page.tsx", import.meta.url), "utf8");

test("Meio-jogo aparece depois de Partidas e abre a página Em breve", () => {
  const partidas = cabecalho.indexOf('{ id: "partidas"');
  const meioJogo = cabecalho.indexOf('{ id: "meio-jogo"');
  const turma = cabecalho.indexOf('{ id: "turma"');

  assert.ok(partidas >= 0 && partidas < meioJogo && meioJogo < turma);
  assert.match(pagina, /atual="meio-jogo"/);
  assert.match(pagina, />\s*Em breve\s*</);
});
