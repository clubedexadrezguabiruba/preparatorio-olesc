import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TEMAS } from "./blocos.ts";

/**
 * Todo tema do currículo tem o seu ícone em `components/tatica/IconeDoTema.tsx`.
 *
 * O componente tem um desenho de reserva (um peão) para não quebrar a tela, e é
 * justamente por isso que este teste existe: sem ele, um tema novo entraria com
 * o peão genérico e ninguém perceberia. O `.tsx` não roda no `node --test`,
 * então o teste lê as chaves de `DESENHOS` no texto do arquivo.
 */
test("cada um dos temas de lib/tatica/blocos.ts tem um ícone desenhado", () => {
  const fonte = readFileSync(new URL("../../components/tatica/IconeDoTema.tsx", import.meta.url), "utf8");
  const desenhos = fonte.slice(fonte.indexOf("const DESENHOS"));
  const comIcone = new Set([...desenhos.matchAll(/^ {2}(\w+): \(/gm)].map((m) => m[1]));
  const semIcone = TEMAS.map((t) => t.tag).filter((tag) => !comIcone.has(tag));
  assert.deepEqual(semIcone, []);
  assert.equal(comIcone.size, TEMAS.length, "nenhum desenho sobrando para tema que não existe");
});
