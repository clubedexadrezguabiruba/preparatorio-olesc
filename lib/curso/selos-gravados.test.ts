import assert from "node:assert/strict";
import test from "node:test";
import { selos, type ParaOsSelos } from "./selos.ts";
import { comDatas, idsParaMarcarVistos, planoDosSelos, type SeloGravado } from "./selos-gravados.ts";

/**
 * A regra do selo gravado (0018): o que é novo, o que entra calado, o que já foi visto, e o
 * selo que não some. Tudo aqui é função pura — o servidor só executa o plano.
 */

const AGORA = "2026-09-17T20:00:00.000Z";
const ONTEM = "2026-09-16T20:00:00.000Z";

const gravado = (selo: string, vistoEm: string | null = ONTEM): SeloGravado => ({
  selo,
  conquistadoEm: ONTEM,
  vistoEm,
});

const ZERADO: ParaOsSelos = {
  temasFechados: 0,
  aulasAprendidas: 0,
  repertorio: { aberturas: [], baseCompleto: false, avancadoCompleto: false },
  conquistado: 0,
  diasComUmaHora: 0,
  maiorSequencia: 0,
  ratingTatica: null,
  puzzles: { resolvidos: 0, tentativas: 0, melhorJanela: null },
  aberturas: { concluidas: 0, cursos: [] },
};

test("primeira vez de um aluno: grava tudo o que ele já tem, sem festa", () => {
  // O aluno antigo abre o painel no dia em que a 0018 entrou: vinte selos de uma vez com confete
  // seria o site comemorando o que ele fez há semanas. Entra tudo calado, já visto.
  const plano = planoDosSelos({ ganhos: ["tatica-3", "nivel-1", "hora-1"], gravados: [], iniciado: false, agora: AGORA });
  assert.equal(plano.primeiraVez, true);
  assert.deepEqual(plano.anunciar, []);
  assert.deepEqual(
    plano.gravar,
    ["tatica-3", "nivel-1", "hora-1"].map((selo) => ({ selo, conquistado_em: AGORA, visto_em: AGORA })),
  );
  assert.equal(plano.marcarInicio, true);
});

test("primeira vez sem selo nenhum: marca o início, e o primeiro selo depois disso tem festa", () => {
  // O aluno novo de 18/9 abre o painel zerado. Sem a marca de início, a visita seguinte (já com o
  // primeiro selo) pareceria "primeira vez" de novo e o selo entraria calado — justo o primeiro.
  const zerado = planoDosSelos({ ganhos: [], gravados: [], iniciado: false, agora: AGORA });
  assert.deepEqual(zerado.gravar, []);
  assert.equal(zerado.marcarInicio, true);

  const depois = planoDosSelos({ ganhos: ["tatica-3"], gravados: [], iniciado: true, agora: AGORA });
  assert.equal(depois.primeiraVez, false);
  assert.deepEqual(depois.gravar, [{ selo: "tatica-3", conquistado_em: AGORA, visto_em: null }]);
  assert.deepEqual(depois.anunciar, ["tatica-3"]);
  assert.equal(depois.marcarInicio, false);
});

test("selo novo é anunciado; o já gravado não é gravado de novo", () => {
  const plano = planoDosSelos({
    ganhos: ["tatica-3", "tatica-7"],
    gravados: [gravado("tatica-3")],
    iniciado: true,
    agora: AGORA,
  });
  assert.deepEqual(plano.gravar.map((g) => g.selo), ["tatica-7"]);
  assert.deepEqual(plano.anunciar, ["tatica-7"]);
});

test("uma vez só: gravado e ainda não visto continua anunciado; visto, nunca mais", () => {
  // O aluno ganhou, mas a página caiu antes de o aviso marcar "visto": na visita seguinte ele vê.
  const naoVisto = planoDosSelos({ ganhos: ["hora-1"], gravados: [gravado("hora-1", null)], iniciado: true, agora: AGORA });
  assert.deepEqual(naoVisto.gravar, []);
  assert.deepEqual(naoVisto.anunciar, ["hora-1"]);

  const visto = planoDosSelos({ ganhos: ["hora-1"], gravados: [gravado("hora-1", AGORA)], iniciado: true, agora: AGORA });
  assert.deepEqual(visto.anunciar, []);
});

test("selo gravado nunca some, mesmo quando a derivação deixa de valer", () => {
  // O Base tinha 20 linhas e ganhou mais 2: "repertorio-base" deixa de derivar, mas o selo é dele.
  const lista = selos(ZERADO);
  assert.equal(lista.find((s) => s.id === "repertorio-base")?.ganho, false);

  const base = comDatas(lista, [gravado("repertorio-base")]).find((s) => s.id === "repertorio-base");
  assert.equal(base?.ganho, true);
  assert.equal(base?.falta, null);
  assert.equal(base?.conquistadoEm, ONTEM);

  // O plano também não o apaga: não existe "remover" no plano, só gravar.
  const plano = planoDosSelos({ ganhos: [], gravados: [gravado("repertorio-base")], iniciado: true, agora: AGORA });
  assert.deepEqual(plano.gravar, []);
  assert.deepEqual(Object.keys(plano).sort(), ["anunciar", "gravar", "marcarInicio", "primeiraVez"]);
});

test("gravado com id que o catálogo de hoje não conhece continua na lista, ganho", () => {
  // Um curso de abertura despublicado: o selo dele continua do aluno.
  const comData = comDatas([], [gravado("abertura-curso-brancas-inglesa")]);
  assert.equal(comData.length, 1);
  assert.equal(comData[0].ganho, true);
  assert.equal(comData[0].familia, "abertura");
  assert.ok(comData[0].nome.length > 3);
});

test("derivado e ainda não gravado (a gravação falhou) aparece ganho, sem data", () => {
  const tres = comDatas(selos({ ...ZERADO, temasFechados: 3 }), []).find((s) => s.id === "tatica-3");
  assert.equal(tres?.ganho, true);
  assert.equal(tres?.conquistadoEm, null);
});

test("marcar visto aceita só uma lista curta de ids bem formados", () => {
  assert.deepEqual(idsParaMarcarVistos(["tatica-3", "abertura-curso-brancas-francesa"]), [
    "tatica-3",
    "abertura-curso-brancas-francesa",
  ]);
  assert.deepEqual(idsParaMarcarVistos("tatica-3"), []);
  assert.deepEqual(idsParaMarcarVistos([{ selo: "x" }]), []);
  assert.deepEqual(idsParaMarcarVistos(["tatica-3); drop table perfis;--"]), []);
  assert.equal(idsParaMarcarVistos(Array.from({ length: 200 }, (_, i) => `tatica-${i}`)).length, 60);
});

test("os selos de cor que saíram (17/9) continuam com nome legível para quem já os gravou", () => {
  const [brancas, pretas] = comDatas([], [gravado("repertorio-brancas"), gravado("repertorio-pretas")]);
  assert.equal(brancas.nome, "Repertório de brancas");
  assert.equal(pretas.nome, "Repertório de pretas");
  assert.equal(brancas.ganho, true);
  assert.equal(brancas.familia, "repertorio");
});
