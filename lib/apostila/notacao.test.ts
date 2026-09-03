import assert from "node:assert/strict";
import test from "node:test";
import { lanceEmPortugues, solucaoEmPortugues, terminaEmMate } from "./notacao.ts";

/**
 * O gabarito é a única parte do caderno que o aluno lê **depois** de já ter
 * escrito a resposta dele. Um erro aqui não confunde: ele corrige o aluno que
 * tinha acertado. Por isso a bateria é dura com a troca de letras.
 */

test("as cinco peças trocam de letra", () => {
  assert.equal(lanceEmPortugues("Kg1"), "Rg1");
  assert.equal(lanceEmPortugues("Qxh7"), "Dxh7");
  assert.equal(lanceEmPortugues("Rd1"), "Td1");
  assert.equal(lanceEmPortugues("Bb5"), "Bb5");
  assert.equal(lanceEmPortugues("Nf3"), "Cf3");
});

test("o R inglês é torre e o R português é rei — e a troca não se atropela", () => {
  // A armadilha: numa troca em duas passadas, `Kg1` viraria `Rg1` e depois
  // `Tg1`. Um rei impresso como torre no gabarito é o pior erro possível aqui.
  assert.equal(lanceEmPortugues("Kg1"), "Rg1");
  assert.equal(lanceEmPortugues("Rg1"), "Tg1");
});

test("só a primeira letra é peça — coluna e casa ficam como estão", () => {
  // Em `Rb1` o `b` é a coluna b, não um bispo. Em `exd5` o `e` é coluna.
  assert.equal(lanceEmPortugues("Rb1"), "Tb1");
  assert.equal(lanceEmPortugues("exd5"), "exd5");
  assert.equal(lanceEmPortugues("bxc3"), "bxc3");
});

test("peão, roque, promoção, xeque e mate atravessam intactos", () => {
  assert.equal(lanceEmPortugues("e4"), "e4");
  assert.equal(lanceEmPortugues("O-O"), "O-O");
  assert.equal(lanceEmPortugues("O-O-O"), "O-O-O");
  assert.equal(lanceEmPortugues("e8=Q+"), "e8=Q+");
  assert.equal(lanceEmPortugues("Qh7#"), "Dh7#");
});

test("desambiguação de coluna e de fileira sobrevive", () => {
  assert.equal(lanceEmPortugues("Rad1"), "Tad1");
  assert.equal(lanceEmPortugues("R1d2"), "T1d2");
  assert.equal(lanceEmPortugues("Nbd7"), "Cbd7");
});

/* ------------------------------------------------------------------ *
 * A linha inteira
 * ------------------------------------------------------------------ */

/**
 * Um mate em 1 de verdade, na convenção do Lichess: `lances[0]` é o erro do
 * adversário, e a solução começa no `lances[1]`.
 */
const MATE_EM_1 = {
  fen: "1k6/pp3pp1/5r2/1Q1p4/6B1/n3P1P1/PP3P1P/KqR5 w - - 7 30",
  lances: ["c1b1", "a3c2"],
};

test("mate em 1 das pretas abre com 1... e termina em #", () => {
  assert.equal(solucaoEmPortugues(MATE_EM_1), "1...Cc2#");
  assert.ok(terminaEmMate(MATE_EM_1));
});

test("a linha das brancas é numerada 1. e emenda a resposta do adversário", () => {
  // A FEN é do lado do **adversário**, que é a convenção do Lichess: as pretas
  // erram com 1...Ta7 e aí a torre branca mata no corredor.
  const puzzle = {
    fen: "r5k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1",
    lances: ["a8a7", "d1d8"],
  };
  assert.equal(solucaoEmPortugues(puzzle), "1.Td8#");
});

test("uma linha de dois lances traz a resposta do adversário no meio", () => {
  const puzzle = {
    fen: "r5k1/5ppp/8/8/8/7Q/5PPP/6K1 b - - 0 1",
    lances: ["a8a7", "h3h7", "g8h7"],
  };
  assert.equal(solucaoEmPortugues(puzzle), "1.Dxh7+ Rxh7");
});

test("a numeração começa em 1 mesmo num puzzle do lance 30", () => {
  // A FEN de `MATE_EM_1` está no lance 30 da partida original. Imprimir "30..."
  // levantaria no aluno uma pergunta que a folha não responde.
  assert.ok(solucaoEmPortugues(MATE_EM_1).startsWith("1..."));
});

test("puzzle sem lance depois do erro do adversário estoura", () => {
  assert.throws(
    () => solucaoEmPortugues({ fen: MATE_EM_1.fen, lances: ["c1b1"] }),
    /sem solução/,
  );
});

test("nem toda solução é mate", () => {
  const ganhaPeca = {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    lances: ["e1g1", "c6d4"],
  };
  assert.equal(terminaEmMate(ganhaPeca), false);
});
