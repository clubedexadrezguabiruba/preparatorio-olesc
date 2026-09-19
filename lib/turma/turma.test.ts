import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMPOS_DA_VITRINE,
  CAMPOS_PROIBIDOS,
  COLUNAS_DO_COLEGA,
  ehContaDeEnsaio,
  ehIdDeConta,
  ehTurma,
  montarVitrine,
  quemAparece,
  TURMAS,
  turmaEmOrdem,
  turmaPorTempo,
  turmasEmOrdem,
} from "./turma.ts";

/**
 * A vitrine e a lista pública da turma. Metade do login e o caderno detalhado nunca saem.
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

test("a montagem alfabética legada continua estável e marca o próprio aluno", () => {
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
    assert.deepEqual(Object.keys(c).sort(), ["atividade", "avatar", "ehVoce", "id", "nome"]);
  }
});

test("a lista pública sai por tempo estudado com os totais permitidos", () => {
  const atividades = new Map([
    ["a", { puzzlesFeitos: 10, puzzlesCertos: 8, puzzlesErrados: 2, tempoMs: 3_600_000, linhasEstudadas: 2, linhasDominadas: 1, ratingTatica: 700 }],
    ["b", { puzzlesFeitos: 20, puzzlesCertos: 5, puzzlesErrados: 15, tempoMs: 7_200_000, linhasEstudadas: 5, linhasDominadas: 3, ratingTatica: 820 }],
  ]);
  const lista = turmaPorTempo(
    [
      { id: "b", nome: "Bia", avatar: null },
      { id: "a", nome: "Ana", avatar: null },
    ],
    "b",
    atividades,
  );
  assert.deepEqual(lista.map((c) => [c.nome, c.atividade.tempoMs, c.ehVoce]), [
    ["Bia", 7_200_000, true],
    ["Ana", 3_600_000, false],
  ]);
});

test("conta de ensaio: some para o aluno, aparece para o professor, e o próprio aluno sempre se vê", () => {
  assert.equal(ehContaDeEnsaio("alunoteste"), true);
  assert.equal(ehContaDeEnsaio("zz.teste.a"), true);
  assert.equal(ehContaDeEnsaio("maria.s"), false);

  const aluno = { id: "x", papel: "aluno" as const, turma: "olesc" as const };
  const professor = { id: "p", papel: "professor" as const, turma: "olesc" as const };
  assert.equal(quemAparece(aluno, { id: "t", usuario: "alunoteste", turma: "olesc" }), false);
  assert.equal(quemAparece(aluno, { id: "m", usuario: "maria.s", turma: "olesc" }), true);
  assert.equal(quemAparece(professor, { id: "t", usuario: "alunoteste", turma: "olesc" }), true);
  assert.equal(
    quemAparece({ id: "t", papel: "aluno", turma: "olesc" }, { id: "t", usuario: "alunoteste", turma: "olesc" }),
    true,
  );
});

test("OLESC e testadores não se enxergam; o professor vê os dois", () => {
  const daOlesc = { id: "o", papel: "aluno" as const, turma: "olesc" as const };
  const testador = { id: "t", papel: "aluno" as const, turma: "testadores" as const };
  const professor = { id: "p", papel: "professor" as const, turma: "olesc" as const };
  const maria = { id: "m", usuario: "maria.s", turma: "olesc" as const };
  const colega = { id: "c", usuario: "colega.doug", turma: "testadores" as const };

  assert.equal(quemAparece(daOlesc, colega), false, "aluno da OLESC viu um testador");
  assert.equal(quemAparece(testador, maria), false, "testador viu um aluno da OLESC");
  assert.equal(quemAparece(daOlesc, maria), true);
  assert.equal(quemAparece(testador, colega), true);
  assert.equal(quemAparece(professor, maria), true);
  assert.equal(quemAparece(professor, colega), true);
});

test("a grade do professor sai separada por turma, OLESC primeiro, e turma vazia não sai", () => {
  const grupos = turmasEmOrdem(
    [
      { id: "t1", nome: "Zeca", avatar: null, turma: "testadores" },
      { id: "o2", nome: "Bruno", avatar: null, turma: "olesc" },
      { id: "o1", nome: "Ana", avatar: null, turma: "olesc" },
    ],
    "p",
  );
  assert.deepEqual(
    grupos.map((g) => [g.nome, g.colegas.map((c) => c.nome)]),
    [
      ["OLESC", ["Ana", "Bruno"]],
      ["Testadores", ["Zeca"]],
    ],
  );
  for (const g of grupos) for (const c of g.colegas) assert.ok(!("turma" in c), "a turma vazou para o cartão");

  const soOlesc = turmasEmOrdem([{ id: "o1", nome: "Ana", avatar: null, turma: "olesc" }], "o1");
  assert.deepEqual(
    soOlesc.map((g) => g.turma),
    ["olesc"],
  );
});

test("a lista de turmas é a mesma do código e do banco", async () => {
  const { readdirSync, readFileSync } = await import("node:fs");
  const pasta = new URL("../../supabase/migrations/", import.meta.url);
  const ultima = readdirSync(pasta)
    .filter((nome) => nome.endsWith(".sql"))
    .sort()
    .map((nome) => readFileSync(new URL(nome, pasta), "utf8"))
    .filter((sql) => /add constraint perfis_turma_valida/.test(sql))
    .at(-1);
  assert.ok(ultima, "nenhuma migração define perfis_turma_valida");
  const lista = /perfis_turma_valida check \(turma in \(([^)]*)\)\)/.exec(ultima)?.[1] ?? "";
  assert.deepEqual(
    lista.split(",").map((s) => s.trim().replace(/'/g, "")),
    [...TURMAS],
  );
  assert.equal(ehTurma("olesc"), true);
  assert.equal(ehTurma("testadores"), true);
  assert.equal(ehTurma("OLESC"), false);
  assert.equal(ehTurma(undefined), false);
});

test("id de rota que não é uuid nem chega ao banco", () => {
  assert.equal(ehIdDeConta("a24f21fd-1cd0-440e-954d-41120614fd26"), true);
  assert.equal(ehIdDeConta("alunoteste"), false);
  assert.equal(ehIdDeConta("a24f21fd-1cd0-440e-954d-41120614fd26' or 1=1"), false);
});
