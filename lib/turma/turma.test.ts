import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMPOS_DA_VITRINE,
  CAMPOS_PROIBIDOS,
  COLUNAS_DO_COLEGA,
  ehContaDeEnsaio,
  ehIdDeConta,
  montarVitrine,
  quemAparece,
  turmaEmOrdem,
} from "./turma.ts";

/**
 * A vitrine de um colega e a grade da turma (17/9/2026). O que se cobra aqui é o que **não**
 * pode sair: nenhum número de desempenho, nenhuma ordem por desempenho, e metade do login nunca.
 */

test("a coluna lida do colega nunca inclui campo proibido", () => {
  const colunas = COLUNAS_DO_COLEGA.split(",").map((c) => c.trim());
  for (const proibido of CAMPOS_PROIBIDOS) assert.ok(!colunas.includes(proibido), `lê ${proibido}`);
  assert.deepEqual(colunas, ["id", "nome", "avatar"]);
  for (const esperado of ["usuario", "rating", "equipe", "tabuleiro", "papel"]) {
    assert.ok(CAMPOS_PROIBIDOS.includes(esperado), `${esperado} devia estar na lista de proibidos`);
  }
});

test("a vitrine monta só os campos permitidos, mesmo se a linha vier com mais", () => {
  const linhaSuja = {
    id: "b1",
    nome: "Bia",
    avatar: "cavalo-dj",
    usuario: "bia.s",
    rating: 1400,
    equipe: "F",
    tabuleiro: 1,
    papel: "aluno",
  };
  const gravados = [
    { selo: "tatica-3", conquistadoEm: "2026-09-10T12:00:00Z", vistoEm: null },
    { selo: "rating-1000", conquistadoEm: "2026-09-11T12:00:00Z", vistoEm: null },
    { selo: "rating-mais-100", conquistadoEm: "2026-09-11T12:00:00Z", vistoEm: null },
    { selo: "pontaria-80", conquistadoEm: "2026-09-12T12:00:00Z", vistoEm: null },
  ];
  const vitrine = montarVitrine(linhaSuja, 2, gravados, []);
  assert.deepEqual(Object.keys(vitrine).sort(), [...CAMPOS_DA_VITRINE].sort());
  const json = JSON.stringify(vitrine);
  for (const vazado of ["bia.s", "1400", "tabuleiro", "usuario", "conquistadoEm", "vistoEm", "rating-"]) {
    assert.ok(!json.includes(vazado), `a vitrine vazou "${vazado}": ${json}`);
  }
  assert.deepEqual(vitrine.selos.map((s) => s.id), ["tatica-3", "pontaria-80"], "a família rating fica fora");
  for (const s of vitrine.selos) assert.deepEqual(Object.keys(s).sort(), ["conta", "familia", "id", "nome"]);
  assert.equal(vitrine.metal, "Ferro");
});

test("a turma sai em ordem alfabética, sem número nenhum, e o próprio aluno é marcado", () => {
  const turma = turmaEmOrdem(
    [
      { id: "a1", nome: "Otávio", avatar: null },
      { id: "c3", nome: "ana Clara", avatar: "peao-ninja" },
      { id: "b2", nome: "Álvaro", avatar: "rei-pipoca" },
      { id: "d4", nome: "Bruno", avatar: null },
    ],
    "c3",
  );
  assert.deepEqual(turma.map((c) => c.nome), ["Álvaro", "ana Clara", "Bruno", "Otávio"]);
  assert.deepEqual(turma.map((c) => c.ehVoce), [false, true, false, false]);
  for (const c of turma) {
    assert.deepEqual(Object.keys(c).sort(), ["avatar", "ehVoce", "id", "nome"]);
    assert.ok(!Object.values(c).some((v) => typeof v === "number"), "número na grade da turma");
  }
});

test("conta de ensaio: some para o aluno, aparece para o professor, e o próprio aluno sempre se vê", () => {
  assert.equal(ehContaDeEnsaio("alunoteste"), true);
  assert.equal(ehContaDeEnsaio("zz.teste.a"), true);
  assert.equal(ehContaDeEnsaio("maria.s"), false);

  const aluno = { id: "x", papel: "aluno" as const };
  const professor = { id: "p", papel: "professor" as const };
  assert.equal(quemAparece(aluno, { id: "t", usuario: "alunoteste" }), false);
  assert.equal(quemAparece(aluno, { id: "m", usuario: "maria.s" }), true);
  assert.equal(quemAparece(professor, { id: "t", usuario: "alunoteste" }), true);
  assert.equal(quemAparece({ id: "t", papel: "aluno" }, { id: "t", usuario: "alunoteste" }), true);
});

test("id de rota que não é uuid nem chega ao banco", () => {
  assert.equal(ehIdDeConta("a24f21fd-1cd0-440e-954d-41120614fd26"), true);
  assert.equal(ehIdDeConta("alunoteste"), false);
  assert.equal(ehIdDeConta("a24f21fd-1cd0-440e-954d-41120614fd26' or 1=1"), false);
});
