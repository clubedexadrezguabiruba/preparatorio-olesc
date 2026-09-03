import assert from "node:assert/strict";
import test from "node:test";
import { applyUci, fenProblem, pieceCount, samePosition } from "./fen.ts";

/**
 * A checagem de posição possível, agora compartilhada entre o gate e o
 * montador do modo autor (B8.4).
 *
 * Ela existe por causa de dois erros que **toda** posição montada à mão comete
 * — e que a `validateFen` da chess.js não pega, porque os dois produzem FEN
 * bem formada. O montador precisa recusá-los antes de salvar; o gate precisa
 * recusá-los antes de aplicar; e os dois precisam dizer a mesma coisa.
 */

test("posição legal passa", () => {
  assert.equal(fenProblem("8/8/8/3k4/8/8/8/6QK w - - 0 1"), null);
  assert.equal(fenProblem("4k3/8/4K3/8/8/8/8/7R w - - 0 1"), null);
});

test("reis colados são recusados, com as duas casas na mensagem", () => {
  const problema = fenProblem("8/8/8/1k6/1K6/8/8/R7 w - - 0 1");
  assert.match(problema ?? "", /reis adjacentes/);
  assert.match(problema ?? "", /b5/);
  assert.match(problema ?? "", /b4/);
});

test("reis na diagonal também estão colados", () => {
  // A distância é de rei, não de coluna: b5 e c4 se tocam.
  assert.match(fenProblem("8/8/8/1k6/2K5/8/8/R7 w - - 0 1") ?? "", /reis adjacentes/);
});

test("o lado fora da vez em xeque é posição impossível", () => {
  // Torre branca em e1, rei preto em e8: a coluna está aberta, então o preto
  // está em xeque. Com as **brancas** na vez, isso significaria que o lance
  // anterior do preto deixou o próprio rei atacado — não existe partida que
  // chegue aqui. Com as pretas na vez, é uma posição comum.
  assert.equal(
    fenProblem("4k3/8/8/8/8/8/8/K3R3 b - - 0 1"),
    null,
    "com as pretas na vez a mesma posição é legal",
  );
  assert.match(
    fenProblem("4k3/8/8/8/8/8/8/K3R3 w - - 0 1") ?? "",
    /não está na vez está em xeque/,
  );
});

test("falta de rei é recusada, e a mensagem chega em português", () => {
  // A `validateFen` da chess.js reprova aqui, mas em inglês. O montador põe
  // esta frase na tela a cada peça posta enquanto a posição está incompleta —
  // é a mensagem que o autor mais vê, e ela não pode ser a única em inglês
  // numa interface inteira em PT-BR.
  assert.equal(fenProblem("8/8/8/3k4/8/8/8/8 w - - 0 1"), "falta o rei branco");
  assert.equal(fenProblem("8/8/8/8/8/8/8/4K3 w - - 0 1"), "falta o rei preto");
  // Sem nenhum dos dois, a chess.js reclama do branco primeiro. A tradução é
  // fiel de propósito: quem diagnostica é ela, e inventar "faltam os dois"
  // aqui seria um segundo juiz discordando do primeiro por conta própria.
  assert.equal(fenProblem("8/8/8/8/8/8/8/6Q1 w - - 0 1"), "falta o rei branco");
});

test("a mensagem de reis colados não repete a si mesma", () => {
  // A tela já diz "Posição impossível:" antes do texto. Repetir no fim dava
  // "Posição impossível: reis adjacentes (b4 e b5) — posição impossível".
  const problema = fenProblem("8/8/8/1k6/1K6/8/8/R7 w - - 0 1");
  assert.equal(problema, "reis adjacentes (b4 e b5)");
});

test("FEN malformada devolve o motivo, e não uma exceção", () => {
  assert.ok(fenProblem("isto não é uma FEN"));
  assert.ok(fenProblem("8/8/8/3k4/8/8/8/6QK"));
});

test("pieceCount conta as peças, que é o que a tablebase limita", () => {
  assert.equal(pieceCount("8/8/8/3k4/8/8/8/6QK w - - 0 1"), 3);
  assert.equal(pieceCount("4k3/8/4K3/8/8/8/8/7R w - - 0 1"), 3);
  assert.equal(
    pieceCount("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    32,
    "a posição inicial tem 32 — bem além das 7 da tablebase",
  );
});

test("samePosition ignora os contadores, e só eles", () => {
  assert.equal(
    samePosition("8/8/8/3k4/8/8/8/6QK w - - 0 1", "8/8/8/3k4/8/8/8/6QK w - - 9 40"),
    true,
  );
  assert.equal(
    samePosition("8/8/8/3k4/8/8/8/6QK w - - 0 1", "8/8/8/3k4/8/8/8/6QK b - - 0 1"),
    false,
  );
});

test("applyUci recusa lance ilegal em vez de estourar", () => {
  assert.equal(applyUci("8/8/8/3k4/8/8/8/6QK w - - 0 1", "g1a8"), null);
  assert.ok(applyUci("8/8/8/3k4/8/8/8/6QK w - - 0 1", "g1g4"));
});
