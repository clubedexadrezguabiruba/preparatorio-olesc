import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { divergenciasDaMigracaoV1, marcasDoDesenho } from "./equivalencia-v1.ts";

function arquivosJson(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? arquivosJson(caminho) : caminho.endsWith(".json") ? [caminho] : [];
  });
}

const positions: Record<string, Position> = Object.fromEntries(arquivosJson("content/positions").map((arquivo) => {
  const posicao = positionSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
  return [posicao.id, posicao];
}));

for (const arquivo of arquivosJson("content/lessons")) {
  const lesson = lessonSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
  test(`§14/§20.3: a ${lesson.id} adaptada ensina o mesmo que a v1 — 0 divergências`, () => {
    const divergencias = divergenciasDaMigracaoV1(lesson, positions, adaptarLessonV1(lesson, positions));
    console.log(`  ${lesson.id}: ${divergencias.length} divergência(s)${divergencias.length ? ` — ${divergencias.map((d) => d.onde).join("; ")}` : ""}`);
    assert.deepEqual(divergencias, []);
  });
}

test("a comparação acusa o que some: desenho, pausa, resumo e texto de reserva", () => {
  const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  delete capitulo.resumo;
  capitulo.narracoes[2] = { ...capitulo.narracoes[2], esperaMs: undefined };
  aula.analises[0].nos[aula.analises[0].raizId].desenhos = undefined;
  aula.catalogo!.mensagensPadrao.vitoriaForaDoMetodo = "Outra frase.";
  const onde = divergenciasDaMigracaoV1(lesson, positions, aula).map((d) => d.onde);
  assert.ok(onde.includes("capítulo · resumo da técnica"), onde.join(" | "));
  assert.ok(onde.includes("capítulo · passo 3 · espera"), onde.join(" | "));
  assert.ok(onde.includes("capítulo · passo 1 · desenho"), onde.join(" | "));
  assert.ok(onde.some((item) => /^treino · pergunta 1 · o que o aluno ouve/.test(item)), onde.join(" | "));
});

test("forma curta e longa do mesmo desenho viram as mesmas marcas; a cor escrita conta", () => {
  assert.deepEqual(marcasDoDesenho({ arrows: [["e2", "e4"]], highlights: ["d5"] }), ["seta e2e4", "casa d5"]);
  assert.deepEqual(marcasDoDesenho({ arrows: [{ de: "e2", para: "e4", cor: "verde" }] }), ["seta e2e4 verde"]);
  assert.deepEqual(marcasDoDesenho(undefined), []);
});
