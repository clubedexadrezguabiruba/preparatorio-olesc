import assert from "node:assert/strict";
import test from "node:test";
import { conferirSolucao, lanceCerto, posicaoInicial } from "./conferir.ts";
import type { Puzzle } from "./puzzles.ts";

/**
 * Os dois primeiros são puzzles de verdade, copiados do recorte que está em
 * `public/puzzles/`. Um mate em 1 e um mate em 2 — o segundo é o que prova que
 * a função sabe intercalar a resposta do adversário, que é onde uma
 * implementação distraída erra.
 */
const MATE_EM_1: Puzzle = {
  id: "02Bm1",
  fen: "3r4/p1p2pk1/1p3p1p/5P2/2N2bP1/1B5P/PPP5/1K3R2 w - - 4 26",
  lances: ["f1f4", "d8d1"],
  rating: 600,
  temas: ["backRankMate", "mateIn1", "oneMove"],
};

const MATE_EM_2: Puzzle = {
  id: "005N7",
  fen: "r6k/2q3pp/8/2p1n3/R1Qp4/7P/2PB1PP1/6K1 b - - 0 32",
  lances: ["e5c4", "a4a8", "c7b8", "a8b8"],
  rating: 600,
  temas: ["backRankMate", "mateIn2", "short"],
};

test("o puzzle começa um lance depois da FEN", () => {
  // A FEN do arquivo tem as brancas na vez, e `lances[0]` é o erro delas
  // (Txf4). Quem resolve é o outro lado. Um jogador de puzzle que mostrasse a
  // FEN crua pediria o lance ao lado errado.
  const jogo = posicaoInicial(MATE_EM_1);
  assert.equal(jogo.turn(), "b");
  assert.equal(jogo.history({ verbose: true }).length, 1);
});

test("a solução certa é aceita, de um e de dois lances", () => {
  assert.equal(conferirSolucao(MATE_EM_1, ["d8d1"]), true);
  assert.equal(conferirSolucao(MATE_EM_2, ["a4a8", "a8b8"]), true);
});

test("um lance errado no meio derruba a linha inteira", () => {
  // O primeiro lance certo, o segundo não: o aluno achou o xeque e não achou o
  // mate. Isto não é meio acerto.
  assert.equal(conferirSolucao(MATE_EM_2, ["a4a8", "a8a7"]), false);
  assert.equal(conferirSolucao(MATE_EM_1, ["d8d2"]), false);
});

test("parar no meio não é acertar", () => {
  assert.equal(conferirSolucao(MATE_EM_2, ["a4a8"]), false);
  assert.equal(conferirSolucao(MATE_EM_2, []), false);
});

test("lance ilegal não estoura — só é errado", () => {
  // O que chega à server action é o que um navegador mandou, e um navegador
  // pode mandar qualquer coisa. Se `conferirSolucao` lançasse exceção aqui, a
  // gravação da tentativa viraria erro 500 em vez de "errou".
  assert.equal(conferirSolucao(MATE_EM_1, ["h1h8"]), false);
  assert.equal(conferirSolucao(MATE_EM_1, ["xxxx"]), false);
});

test("outro mate também é mate", () => {
  // A regra do Lichess, e a única honesta: dizer "errado" para um xeque-mate
  // ensina o aluno a desconfiar do próprio acerto. Aqui Ta8# e Te8# matam
  // igual, e o arquivo só conhece um dos dois.
  const DOIS_MATES: Puzzle = {
    id: "sintetico",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R3R1K1 b - - 0 1",
    lances: ["g8h8", "a1a8"],
    rating: 600,
    temas: ["mateIn1"],
  };
  assert.equal(conferirSolucao(DOIS_MATES, ["a1a8"]), true);
  assert.equal(conferirSolucao(DOIS_MATES, ["e1e8"]), true);
  // E o que não é mate continua errado.
  assert.equal(conferirSolucao(DOIS_MATES, ["a1a7"]), false);
});

test("lanceCerto é o mesmo juiz, lance a lance", () => {
  const jogo = posicaoInicial(MATE_EM_2);
  assert.equal(lanceCerto(jogo.fen(), "a4a8", "a4a8"), true);
  assert.equal(lanceCerto(jogo.fen(), "a4a7", "a4a8"), false);
});
