import assert from "node:assert/strict";
import test from "node:test";
import { guidedStageSchema, lessonSchema } from "./schema.ts";

/**
 * As regras de forma que a FN1/B2 acrescentou ao dado (§7 do plano da fase).
 *
 * Elas moram no schema, e não no gate, porque o schema roda **dos dois lados**:
 * no `validate:content` antes do commit e em `lib/finais/conteudo.ts` na build.
 * Aula incoerente não chega a virar página.
 *
 * Duas delas não têm mutação plantada no `validate:mutations` — o `ends` escrito
 * onde a linha não acaba, e a classe faltando em aula publicada. Ficam provadas
 * aqui, e é de propósito que estejam provadas em algum lugar: regra sem teste
 * nenhum é regra que se pode apagar sem ninguém notar.
 */

const FEN = "8/8/8/8/8/8/8/K6k w - - 0 1";

const arvore = (expects: unknown[]) => ({
  positionId: "pos-teste",
  root: "n1",
  nodes: { n1: { fen: FEN, expects, winningMoves: [] } },
});

const aula = (extra: Record<string, unknown> = {}) => ({
  id: "N1-TESTE",
  title: "Aula de teste",
  orientation: "white",
  domainCriterion: "D1",
  errors: {},
  fallbacks: { winningOffMethod: "a", losesWin: "b", methodAlternative: "c" },
  stages: {},
  ...extra,
});

/* ------------------------------------------------------------------ *
 * `goal` — e o default que mantém `content/` intacto
 * ------------------------------------------------------------------ */

test("árvore sem `goal` é aceita e sai valendo vitória", () => {
  // É esta linha que permitiu a FN1/B2 inteira sem tocar num byte dos JSONs da
  // N0: o campo entra no tipo, não no arquivo.
  const r = guidedStageSchema.safeParse(arvore([{ moves: ["a1a2"], feedback: "f" }]));
  assert.equal(r.success, true);
  assert.equal(r.success && r.data.goal, "win");
});

test("árvore pode declarar objetivo de empate", () => {
  const r = guidedStageSchema.safeParse({
    ...arvore([{ moves: ["a1a2"], feedback: "f" }]),
    goal: "draw",
  });
  assert.equal(r.success && r.data.goal, "draw");
});

test("objetivo que não é ganhar nem empatar é recusado", () => {
  const r = guidedStageSchema.safeParse({
    ...arvore([{ moves: ["a1a2"], feedback: "f" }]),
    goal: "survive",
  });
  assert.equal(r.success, false);
});

/* ------------------------------------------------------------------ *
 * `ends` — só onde a linha acaba
 * ------------------------------------------------------------------ */

test("`ends` é aceito no lance terminal", () => {
  for (const ends of ["mate", "promotion", "draw-secured", "tablebase-win"]) {
    const r = guidedStageSchema.safeParse(arvore([{ moves: ["a1a2"], ends, feedback: "f" }]));
    assert.equal(r.success, true, ends);
  }
});

test("`ends` num expect que tem resposta do defensor é recusado", () => {
  // A linha não acaba ali. O campo passaria batido pelo gate — que só olha
  // `ends` no terminal — e ficaria no arquivo dizendo uma coisa que ninguém
  // confere: conteúdo entrando sem ser julgado.
  const r = guidedStageSchema.safeParse(
    arvore([{ moves: ["a1a2"], reply: "h1h2", next: "n1", ends: "mate", feedback: "f" }]),
  );
  assert.equal(r.success, false);
  assert.equal(
    r.success === false && r.error.issues.some((i) => i.path.includes("ends")),
    true,
    JSON.stringify(r.success === false && r.error.issues),
  );
});

test("`ends` junto de `replies` é recusado pelo mesmo motivo", () => {
  const r = guidedStageSchema.safeParse(
    arvore([
      {
        moves: ["a1a2"],
        replies: [
          { reply: "h1h2", next: "n1" },
          { reply: "h1g1", next: "n1" },
        ],
        ends: "mate",
        feedback: "f",
      },
    ]),
  );
  assert.equal(r.success, false);
  assert.equal(r.success === false && r.error.issues.some((i) => i.path.includes("ends")), true);
});

/* ------------------------------------------------------------------ *
 * `class` — obrigatória para publicar
 * ------------------------------------------------------------------ */

test("aula em rascunho não precisa declarar a classe", () => {
  assert.equal(lessonSchema.safeParse(aula()).success, true);
});

test("aula publicada sem classe é recusada", () => {
  // Sem classe a aula sai da conta da rotação de livros-base (§4 da trilha), e
  // a regra que impede uma obra protegida de dominar uma classe fica cega.
  const r = lessonSchema.safeParse(aula({ status: "published" }));
  assert.equal(r.success, false);
  assert.equal(r.success === false && r.error.issues.some((i) => i.path.includes("class")), true);
});

test("aula publicada com classe passa", () => {
  assert.equal(lessonSchema.safeParse(aula({ status: "published", class: "E" })).success, true);
});

test("classe fora de E/D/C/B é recusada", () => {
  assert.equal(lessonSchema.safeParse(aula({ class: "A" })).success, false);
});
