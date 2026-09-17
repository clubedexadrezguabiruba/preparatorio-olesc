import assert from "node:assert/strict";
import test from "node:test";
import { ajudaNoErro, primeiraFrase } from "./ajuda-no-erro.ts";

/** A posição do B05A: depois de 5...Qxg2, o lance certo é 6.Be4. */
const NO = {
  fen: "rnb1kbnr/pp3ppp/4p3/2ppP3/3P4/2PB1N2/PP3PqP/RNBQK2R w KQkq - 0 6",
  expects: [{ moves: ["d3e4"], feedback: "Isso: 6.Be4. A dama fica presa. Agora é só caçá-la." }],
} as never;

test("escada de ajuda: dica, casa acesa, seta com o lance e Rever (feedback do aluno, 17/9/2026)", () => {
  assert.equal(ajudaNoErro(NO, 0), null, "sem erro, sem ajuda");

  const primeiro = ajudaNoErro(NO, 1)!;
  assert.equal(primeiro.texto, "Dica: Isso: 6.Be4.", "sem [DICA], a primeira frase do comentário do lance certo");
  assert.equal(primeiro.casa, null);
  assert.equal(primeiro.contaComoAjuda, false);
  assert.equal(ajudaNoErro(NO, 1, "Procure a diagonal do bispo.")!.texto, "Dica: Procure a diagonal do bispo.", "a [DICA] do professor vence");

  const segundo = ajudaNoErro(NO, 2)!;
  assert.equal(segundo.casa, "d3");
  assert.equal(segundo.seta, null);
  assert.equal(segundo.rever, false);
  assert.equal(segundo.contaComoAjuda, true);

  for (const erros of [3, 4, 9]) {
    const terceiro = ajudaNoErro(NO, erros)!;
    assert.deepEqual(terceiro.seta, ["d3", "e4"]);
    assert.equal(terceiro.texto, "O lance é Be4. Siga a seta.");
    assert.equal(terceiro.rever, true);
    assert.equal(terceiro.degrau, 3);
  }
});

test("primeira frase", () => {
  assert.equal(primeiraFrase("Nós ocupamos o centro. E mais."), "Nós ocupamos o centro.");
  assert.equal(primeiraFrase("Sem ponto"), "Sem ponto");
  assert.equal(primeiraFrase("  "), null);
});
