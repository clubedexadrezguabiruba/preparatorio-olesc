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

/**
 * As quatro etapas declaradas ausentes de uma vez.
 *
 * A aula sintética destes casos não tem etapa nenhuma — ela existe para provar
 * outra regra —, e desde 9/9/2026 a aula publicada precisa ter as quatro ou
 * dizer por escrito qual falta. Declarar as quatro é o que a mantém no assunto
 * dela em vez de virar uma aula de mentira com quatro etapas de mentira.
 */
const SEM_NENHUMA = {
  intro: "aula de teste: não apresenta nada",
  objective: "aula de teste: não ensina nada",
  guided: "aula de teste: não treina nada",
  practice: "aula de teste: não joga nada",
};

test("aula publicada com classe passa", () => {
  assert.equal(
    lessonSchema.safeParse(
      aula({ status: "published", class: "E", etapasAusentes: SEM_NENHUMA }),
    ).success,
    true,
  );
});

/* ------------------------------------------------------------------ *
 * Um formato só, e a ausência por escrito (2026-09-09)
 * ------------------------------------------------------------------ */

test("aula publicada sem uma das quatro etapas e sem dizer por quê é recusada", () => {
  const r = lessonSchema.safeParse(
    aula({
      status: "published",
      class: "E",
      etapasAusentes: { intro: "a", objective: "b", guided: "c" },
    }),
  );
  assert.equal(r.success, false);
  assert.match(r.error?.issues[0].message ?? "", /"practice" e não diz por quê/);
});

test("declarar ausente uma etapa que existe é recusado", () => {
  // A declaração que o arquivo desmente é pior que a ausência de declaração:
  // ninguém a leria de novo para conferir se ainda é verdade.
  const dizendoDuasVerdades = lessonSchema.safeParse(
    aula({
      status: "published",
      class: "E",
      etapasAusentes: { ...SEM_NENHUMA },
      stages: {
        practice: { positionId: "pos-teste", goal: "win", engine: { skill: 20, moveTimeMs: 300 } },
      },
    }),
  );
  assert.equal(dizendoDuasVerdades.success, false);
  assert.match(
    (dizendoDuasVerdades.error?.issues ?? []).map((i) => i.message).join(" | "),
    /declara que não tem a etapa "practice" e ela está em stages/,
  );
});

test("classe fora de E/D/C/B é recusada", () => {
  assert.equal(lessonSchema.safeParse(aula({ class: "A" })).success, false);
});

/* ------------------------------------------------------------------ *
 * As travas que a etapa 3 derivada mudou (2026-09-09)
 * ------------------------------------------------------------------ */

/** Uma posição de verdade, para as travas que encadeiam lances. */
const KPK = "8/4k3/2K5/8/8/8/1P6/8 w - - 0 1";

/**
 * Uma aula publicada com só as etapas que o caso precisa, e **as demais
 * declaradas ausentes**: desde 9/9/2026 a aula publicada tem as quatro ou diz
 * por escrito qual falta, e um caso sobre a flecha do treino não deve reprovar
 * por uma regra que não é a dele.
 */
const publicada = (stages: Record<string, unknown>) =>
  aula({
    status: "published",
    class: "E",
    etapasAusentes: Object.fromEntries(
      (["intro", "objective", "guided", "practice"] as const)
        .filter((etapa) => stages[etapa] === undefined)
        .map((etapa) => [etapa, "aula de teste: fora do assunto deste caso"]),
    ),
    stages,
  });

const noDoAluno = (extra: Record<string, unknown> = {}) => ({
  fen: KPK,
  expects: [{ moves: ["c6c7"], feedback: "f" }],
  winningMoves: ["c6c7"],
  ...extra,
});

test("o nó do treino com casa acesa e sem flecha passa na aula publicada", () => {
  // A flecha era obrigatória sozinha. O passo que só precisa dizer "olhe esta
  // casa" era obrigado a inventar uma origem para a seta sair de algum lugar.
  const r = lessonSchema.safeParse(
    publicada({
      guided: {
        positionId: "pos-teste",
        root: "n1",
        nodes: { n1: noDoAluno({ highlights: ["b8"] }) },
      },
    }),
  );
  assert.equal(r.success, true);
});

test("o nó do treino sem flecha e sem casa acesa é recusado, e a mensagem manda ao roteiro", () => {
  const r = lessonSchema.safeParse(
    publicada({
      guided: { positionId: "pos-teste", root: "n1", nodes: { n1: noDoAluno() } },
    }),
  );
  assert.equal(r.success, false);
  const mensagem = r.error?.issues[0].message ?? "";
  assert.match(mensagem, /casa acesa/);
  assert.match(
    mensagem,
    /treino\.arrows/,
    "o nó é derivado: a mensagem tem de dizer onde o conserto mora",
  );
});

test("a trava da MESMA posição vale da aula em diante, e diz que a apresentação é a exceção", () => {
  const r = lessonSchema.safeParse(
    publicada({
      objective: {
        source: "silman-endgame-course",
        positionId: "pos-uma",
        technique: { name: "n", summary: "s" },
        roteiro: [{ fala: "a" }, { fala: "b" }, { fala: "c" }],
      },
      practice: { positionId: "pos-outra", goal: "win", engine: { skill: 20, moveTimeMs: 300 } },
    }),
  );
  assert.equal(r.success, false);
  assert.match(r.error?.issues[0].message ?? "", /apresentação é a exceção/);
});

test("aula publicada com aula e sem treino passa no schema — o treino é derivado", () => {
  /*
   * O contrato de `guidedStageSchema` é *apague `stages.guided`, rode
   * `--write`, e ele volta byte por byte*. Se o schema recusasse o arquivo sem
   * a árvore, a aula sumiria da carga do gate e a derivação — a única coisa
   * capaz de reescrevê-la — nunca chegaria a rodar. Medido em 9/9/2026: apagar
   * a árvore da `N1-KPK` deixava o `--write` sem conserto nenhum.
   *
   * Quem cobra a ausência é o gate, com `TREINO_DESATUALIZADO`.
   */
  const r = lessonSchema.safeParse(
    aula({
      status: "published",
      class: "E",
      etapasAusentes: { intro: "a", practice: "b" },
      stages: {
        objective: {
          source: "silman-endgame-course",
          positionId: "pos-teste",
          technique: { name: "n", summary: "s" },
          roteiro: [{ fala: "a" }, { fala: "b" }],
        },
      },
    }),
  );
  assert.equal(r.success, true);
});

test("aula publicada SEM aula e sem treino ainda precisa declarar o treino", () => {
  // Sem roteiro não há de onde derivar, e aí a ausência volta a ser ausência.
  const r = lessonSchema.safeParse(
    aula({
      status: "published",
      class: "E",
      etapasAusentes: { intro: "a", objective: "b", practice: "c" },
    }),
  );
  assert.equal(r.success, false);
  assert.match(r.error?.issues[0].message ?? "", /não tem a etapa "guided"/);
});
