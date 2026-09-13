import assert from "node:assert/strict";
import test from "node:test";
import { extrasDaTrilha } from "../finais/trilha.ts";
import { frasesDoImpactoV2, impactoDaPublicacaoV2 } from "./impacto-publicacao.ts";
import type { PacoteV2 } from "./pacote.ts";

/**
 * O efeito real no fechamento do nível — §22, parada 8E (D5).
 *
 * Até a fatia 8 a janela de publicar dizia "a aula conta para o fechamento do nível N" para
 * qualquer aula com nível no documento — inclusive a extra, que nenhuma conta do curso lia.
 * Agora a frase sai de `fechamentoDoNivel` antes e depois desta publicação.
 */

/** Um pacote com só o que o impacto lê. */
function pacote(id: string, metadados: { nivel?: number; classe?: "E" | "D" | "C" | "B" } = {}, publicationId = "pub-aaaaaaaaaaaaaaaa"): PacoteV2 {
  return {
    publicationId,
    revisoes: { "pratica-1": { tipo: "pratica", revisao: "ar_1" } },
    aula: {
      schemaVersion: 2,
      id,
      titulo: `Aula ${id}`,
      metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", ...metadados },
      proveniencia: [],
      excecoes: [],
      analises: [],
      introducoes: [],
      capitulos: [],
      treinos: [],
      praticas: [{ id: "pratica-1", titulo: "Prática", positionId: "pos", ladoAluno: "white", objetivo: "win", engine: { skill: 1, moveTimeMs: 100 } }],
      fluxo: [],
    },
  } as unknown as PacoteV2;
}

const hoje = { publicadas: new Set(["N0-LADDER", "N0-MATING-MATERIAL", "N1-KPK"]), extras: [] };

test("extra nova no nível 2: entra na conta, exigidas 1 → 2, e a frase diz isso", () => {
  const impacto = impactoDaPublicacaoV2(null, pacote("EX-ENSAIO", { nivel: 2, classe: "D" }), hoje);
  assert.equal(impacto.lugar, "extra");
  assert.equal(impacto.nivel, 2);
  assert.deepEqual(impacto.fechamento, {
    nivel: 2,
    antes: { exigidas: 1, declaradas: 4, publicadas: 1 },
    depois: { exigidas: 2, declaradas: 4, publicadas: 2 },
    nivelAnterior: null,
  });
  const frases = frasesDoImpactoV2(impacto, { comProgresso: 0 });
  assert.ok(frases.includes("Aula extra: entra na conta do nível 2: para fechar o nível, antes 1 aula de finais, depois 2 aulas (o nível declara 4; publicadas no nível: 1 → 2)."), frases.join("\n"));
  assert.ok(frases.some((f) => f.startsWith("Quem ainda não fechou o nível 2 passa a precisar de mais 1 aula")));
  assert.ok(!frases.some((f) => f === "A aula conta para o fechamento do nível 2."), "a frase antiga, falsa para a extra, não volta");
  // Achado no roteiro da 8F: a extra não tem versão antiga para os alunos "deixarem de receber".
  assert.equal(frases[0], "É a primeira publicação desta aula extra: ela passa a existir para os alunos.");
});

test("republicar a mesma extra: já conta, a exigência não muda", () => {
  const extra = pacote("EX-ENSAIO", { nivel: 2, classe: "D" }, "pub-bbbbbbbbbbbbbbbb");
  const curso = { publicadas: new Set([...hoje.publicadas, "EX-ENSAIO"]), extras: extrasDaTrilha([{ id: "EX-ENSAIO", titulo: "x", metadados: { nivel: 2, classe: "D" } }]) };
  const impacto = impactoDaPublicacaoV2(pacote("EX-ENSAIO", { nivel: 2, classe: "D" }), extra, curso);
  assert.deepEqual(impacto.fechamento?.antes, impacto.fechamento?.depois);
  assert.ok(frasesDoImpactoV2(impacto, { comProgresso: 1 }).some((f) => f.startsWith("Aula extra: já conta para o fechamento do nível 2; a exigência continua 2 aulas")));
});

test("extra que muda de nível sai da conta do anterior", () => {
  const curso = { publicadas: new Set([...hoje.publicadas, "EX-ENSAIO"]), extras: extrasDaTrilha([{ id: "EX-ENSAIO", titulo: "x", metadados: { nivel: 2, classe: "D" } }]) };
  const impacto = impactoDaPublicacaoV2(pacote("EX-ENSAIO", { nivel: 2, classe: "D" }), pacote("EX-ENSAIO", { nivel: 3, classe: "D" }, "pub-cccccccccccccccc"), curso);
  assert.equal(impacto.fechamento?.nivelAnterior, 2);
  assert.ok(frasesDoImpactoV2(impacto, { comProgresso: 0 }).some((f) => f.startsWith("Aula extra: sai da conta do nível 2 e passa para o nível 3")));
});

test("fora da trilha: a fixture e a extra sem nível não contam para nível nenhum", () => {
  const fixture = impactoDaPublicacaoV2(null, pacote("N0-FIXTURE-V2"), hoje);
  assert.equal(fixture.lugar, "fora");
  assert.equal(fixture.fechamento, null);
  assert.ok(frasesDoImpactoV2(fixture, { comProgresso: 0 }).includes("Esta aula não está na trilha do curso: não conta para o fechamento de nenhum nível."));

  const semNivel = impactoDaPublicacaoV2(null, pacote("EX-SEM-NIVEL", { classe: "D" }), hoje);
  assert.equal(semNivel.lugar, "fora");
  assert.ok(frasesDoImpactoV2(semNivel, { comProgresso: 0 }).some((f) => f.includes("não tem nível e classe declarados")));
});

test("aula do curso já publicada em v1: republicar em v2 não muda a exigência", () => {
  const impacto = impactoDaPublicacaoV2(null, pacote("N0-LADDER"), hoje);
  assert.equal(impacto.lugar, "curso");
  assert.equal(impacto.nivel, 1);
  assert.deepEqual(impacto.fechamento?.antes, { exigidas: 2, declaradas: 4, publicadas: 2 });
  assert.deepEqual(impacto.fechamento?.depois, impacto.fechamento?.antes);
  assert.ok(frasesDoImpactoV2(impacto, { comProgresso: 0 }).some((f) => f.startsWith("Já conta para o fechamento do nível 1")));
});
