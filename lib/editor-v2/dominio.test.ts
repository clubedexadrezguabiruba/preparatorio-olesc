/**
 * De que curso é a aula, pelo id — §13.3.3 (curso de abertura, 16/9/2026).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { aberturaDoId, adversarioDaAulaDeAbertura, dominioDaAulaV2, ehAulaDeFinais, idDaAulaDeAbertura } from "./dominio.ts";
import { aulaIdV2Schema } from "./modelo.ts";

test("os três domínios saem do prefixo do id", () => {
  assert.equal(dominioDaAulaV2("N0-LADDER"), "finais");
  assert.equal(dominioDaAulaV2("EX-CAPITULO-0-3-MATE-DE-DAMA-E"), "extra");
  assert.equal(dominioDaAulaV2("AB-BRANCAS-FRANCESA-B"), "abertura");
  assert.equal(ehAulaDeFinais("AB-BRANCAS-FRANCESA-B"), false, "aula de abertura nunca é de /finais");
  assert.equal(ehAulaDeFinais("EX-OPOSICAO"), true);
});

test("o id de abertura carrega cor, abertura (com hífen) e bloco, e volta igual", () => {
  assert.deepEqual(aberturaDoId("AB-BRANCAS-FRANCESA-EF"), { cor: "brancas", abertura: "francesa", bloco: "EF" });
  assert.deepEqual(aberturaDoId("AB-PRETAS-CARO-KANN-A"), { cor: "pretas", abertura: "caro-kann", bloco: "A" });
  assert.equal(idDaAulaDeAbertura({ cor: "pretas", abertura: "caro-kann", bloco: "A" }), "AB-PRETAS-CARO-KANN-A");
  assert.equal(aberturaDoId("N0-LADDER"), null);
});

test("o schema aceita AB- no padrão e recusa o que foge dele", () => {
  assert.ok(aulaIdV2Schema.safeParse("AB-BRANCAS-FRANCESA-B").success);
  for (const ruim of ["AB-VERDES-FRANCESA-B", "AB-BRANCAS-B", "AB-brancas-francesa-b", "AB-BRANCAS-FRANCESA-BLOCO"]) {
    assert.equal(aulaIdV2Schema.safeParse(ruim).success, false, ruim);
  }
});

test("o adversário da aula de abertura sai da cor do curso: a capa do treino guiado da Siciliana fala das Brancas (18/9/2026)", () => {
  assert.equal(adversarioDaAulaDeAbertura("AB-BRANCAS-FRANCESA-B"), "Pretas");
  assert.equal(adversarioDaAulaDeAbertura("AB-PRETAS-SICILIANA-B"), "Brancas");
  assert.equal(adversarioDaAulaDeAbertura("N1-KPK"), null);
});
