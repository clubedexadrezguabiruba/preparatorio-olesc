import assert from "node:assert/strict";
import test from "node:test";
import { applyUci, fenProblem, pieceCount, problemaDaPosicaoMontada, problemaDosCamposDaFen, samePosition } from "./fen.ts";

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

test("o texto colado que não é FEN reclama em português", () => {
  // A chess.js escreve "six" por extenso, e o padrão que só via o algarismo
  // deixava passar em inglês a mensagem mais frequente do editor: a de quem
  // colou no campo alguma coisa que não é uma FEN.
  assert.equal(fenProblem("lixo qualquer"), "a FEN precisa dos 6 campos");
});

test("o peão na última fileira reclama em português", () => {
  assert.equal(fenProblem("P3k3/8/8/8/8/8/8/4K3 w - - 0 1"), "há peão na primeira ou na oitava fileira");
});

/*
 * As duas regras que a chess.js **não** cobre, e que um montador produz o tempo
 * todo. Medido em 11/09/2026: `validateFen` devolve `{ok:true}` para os dois
 * primeiros casos abaixo.
 */
test("o roque declarado exige rei e torre em casa", () => {
  assert.equal(problemaDosCamposDaFen("4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1"), "o roque curto das brancas está marcado, mas não há rei em e1 e torre em h1");
  assert.equal(problemaDosCamposDaFen("4k3/8/8/8/8/8/8/R3K3 w Q - 0 1"), null);
  assert.equal(problemaDosCamposDaFen("r3k3/8/8/8/8/8/8/4K3 w q - 0 1"), null);
  assert.equal(problemaDosCamposDaFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"), null);
});

test("a casa de en passant exige o peão que passou por ela", () => {
  // Peão preto acabou de ir de e7 a e5: com as brancas na vez, e6 é legítima.
  assert.equal(problemaDosCamposDaFen("4k3/8/8/4p3/8/8/8/4K3 w - e6 0 1"), null);
  assert.equal(problemaDosCamposDaFen("4k3/8/8/8/8/8/8/4K3 w - e6 0 1"), "a casa de en passant é e6, mas não há peão preto em e5");
  // A fileira certa depende de quem está na vez, e não da cor do peão.
  assert.equal(problemaDosCamposDaFen("4k3/8/8/4p3/8/8/8/4K3 b - e6 0 1"), "com as pretas na vez, a casa de en passant fica na 3ª fileira");
  // O peão não pode ainda estar em e7, nem e6 pode estar ocupada.
  assert.equal(problemaDosCamposDaFen("4k1p1/4p3/8/4p3/8/8/8/4K3 w - e6 0 1"), "a casa de en passant é e6, mas e6 e e7 precisam estar vazias");
});

test("problemaDaPosicaoMontada soma os dois juízos, e nesta ordem", () => {
  // Sem os seis campos não há o que conferir entre eles: a queixa é a da forma.
  assert.equal(problemaDaPosicaoMontada("lixo qualquer"), "a FEN precisa dos 6 campos");
  assert.equal(problemaDaPosicaoMontada("4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1"), "o roque curto das brancas está marcado, mas não há rei em e1 e torre em h1");
  assert.equal(problemaDaPosicaoMontada("8/8/8/4k3/8/8/4P3/4K3 w - - 0 1"), null);
});
