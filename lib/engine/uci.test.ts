import assert from "node:assert/strict";
import test from "node:test";
import {
  goCommand,
  goDepthCommand,
  multiPvCommand,
  parseInfo,
  parseLine,
  positionCommand,
  skillCommand,
  type EngineLine,
} from "./uci.ts";

/**
 * O leitor da língua do motor (plano da F1, §5 / bloco B4.1).
 *
 * As linhas abaixo são saída **real** do Stockfish 18, não inventadas: é o que
 * o `uci`, o `isready` e o `go movetime` devolvem. Este é o único pedaço do
 * motor que teste automático alcança — Worker e WebAssembly não têm navegador
 * no CI, e a verificação deles é por medição na tela.
 */

test("uciok e readyok são reconhecidos", () => {
  assert.deepEqual(parseLine("uciok"), { kind: "uciok" } satisfies EngineLine);
  assert.deepEqual(parseLine("readyok"), { kind: "readyok" } satisfies EngineLine);
  // O motor imprime com fim de linha; a classificação não pode depender disso.
  assert.deepEqual(parseLine("  readyok\r\n"), { kind: "readyok" });
});

test("bestmove entrega o lance, com ou sem ponder", () => {
  assert.deepEqual(parseLine("bestmove h1h4 ponder e5d5"), { kind: "bestmove", uci: "h1h4" });
  assert.deepEqual(parseLine("bestmove h1h4"), { kind: "bestmove", uci: "h1h4" });
});

test("bestmove com promoção preserva a peça escolhida", () => {
  // Sem isto, um mate por promoção viraria um lance ilegal na etapa 5.
  assert.deepEqual(parseLine("bestmove e7e8q"), { kind: "bestmove", uci: "e7e8q" });
});

test("bestmove (none) vira null, não a string literal", () => {
  // Acontece em posição já terminada. Tratar "(none)" como lance mandaria uma
  // string impossível para a chess.js — e o aluno veria um erro sem sentido.
  assert.deepEqual(parseLine("bestmove (none)"), { kind: "bestmove", uci: null });
});

test("o nome da opção sobrevive ao espaço em Skill Level", () => {
  // O corte é entre "name" e "type": cortar por espaço perderia "Level" e a
  // bancada não conseguiria provar que a build aceita ajuste de força.
  assert.deepEqual(parseLine("option name Skill Level type spin default 20 min 0 max 20"), {
    kind: "option",
    name: "Skill Level",
  });
  assert.deepEqual(parseLine("option name Threads type spin default 1 min 1 max 1"), {
    kind: "option",
    name: "Threads",
  });
});

test("id name identifica a build que está de fato rodando", () => {
  assert.deepEqual(parseLine("id name Stockfish 18"), { kind: "id", name: "Stockfish 18" });
});

test("info, banner e linha vazia são ignorados sem lançar", () => {
  const ruido = [
    "info depth 12 seldepth 18 multipv 1 score cp 0 nodes 10241 nps 341366 time 30 pv h1h4",
    "Stockfish 18 by the Stockfish developers (see AUTHORS file)",
    "id author the Stockfish developers",
    "",
    "   ",
    "algo que nenhum motor imprime",
  ];
  for (const linha of ruido) {
    assert.deepEqual(parseLine(linha), { kind: "ignored" }, `deveria ignorar: ${linha}`);
  }
});

test("skillCommand prende a força na faixa que o motor aceita", () => {
  assert.equal(skillCommand(3), "setoption name Skill Level value 3");
  assert.equal(skillCommand(0), "setoption name Skill Level value 0");
  assert.equal(skillCommand(20), "setoption name Skill Level value 20");
  // Dado de aula fora da faixa não pode virar comando inválido no meio da aula.
  assert.equal(skillCommand(-5), "setoption name Skill Level value 0");
  assert.equal(skillCommand(99), "setoption name Skill Level value 20");
  assert.equal(skillCommand(3.6), "setoption name Skill Level value 4");
});

test("position e go saem no formato que o motor espera", () => {
  const fen = "8/8/8/4k3/8/8/4K3/7R w - - 0 1";
  assert.equal(positionCommand(fen), `position fen ${fen}`);
  assert.equal(goCommand(300), "go movetime 300");
  // `go movetime 0` faz o motor responder lixo; o piso de 1 ms é o guarda.
  assert.equal(goCommand(0), "go movetime 1");
});

/* ------------------------------------------------------------------ *
 * Análise (B9/E7b)
 *
 * As nove asserções acima são contrato e continuam intactas: `parseLine` não
 * mudou uma linha. O que segue mora ao lado dela.
 * ------------------------------------------------------------------ */

test("`parseLine` continua ignorando `info` depois da análise existir", () => {
  // A garantia de que E7b não mexeu na etapa 5: a mesma linha que a análise lê
  // continua sendo ruído para quem só quer um lance.
  const info = "info depth 12 seldepth 18 multipv 1 score cp 0 nodes 10241 nps 341366 time 30 pv h1h4";
  assert.deepEqual(parseLine(info), { kind: "ignored" });
  assert.notEqual(parseInfo(info), null);
});

test("parseInfo lê profundidade, pontuação e variante", () => {
  const lido = parseInfo(
    "info depth 22 seldepth 30 multipv 2 score cp -137 nodes 1 nps 1 time 1 pv e2e4 e7e5 g1f3",
  );
  assert.deepEqual(lido, {
    depth: 22,
    multipv: 2,
    cp: -137,
    mate: null,
    pv: ["e2e4", "e7e5", "g1f3"],
  });
});

test("mate vem com sinal, e não vira centipeão", () => {
  const lido = parseInfo("info depth 14 multipv 1 score mate 7 pv h1h8");
  assert.equal(lido?.mate, 7);
  assert.equal(lido?.cp, null);
  assert.equal(parseInfo("info depth 14 score mate -3 pv e1e2")?.mate, -3);
});

test("sem multipv a linha é a primeira", () => {
  assert.equal(parseInfo("info depth 9 score cp 41 pv d2d4")?.multipv, 1);
});

test("avaliação parcial é descartada, e o número não pula na tela", () => {
  // `lowerbound`/`upperbound` saem no meio da janela de aspiração: mostrá-las
  // faz a avaliação oscilar como se o motor estivesse indeciso.
  assert.equal(parseInfo("info depth 20 score cp 300 lowerbound nodes 1 pv e2e4"), null);
  assert.equal(parseInfo("info depth 20 score cp -300 upperbound nodes 1 pv e2e4"), null);
});

test("linha `info` sem pontuação não é avaliação", () => {
  assert.equal(parseInfo("info depth 1 currmove e2e4 currmovenumber 1"), null);
  assert.equal(parseInfo("info string NNUE evaluation using nn-1234.nnue"), null);
  assert.equal(parseInfo("bestmove h1h4"), null);
  assert.equal(parseInfo(""), null);
});

test("os comandos da análise saem no formato do motor, e presos na faixa", () => {
  assert.equal(goDepthCommand(18), "go depth 18");
  assert.equal(goDepthCommand(0), "go depth 1");
  assert.equal(goDepthCommand(999), "go depth 40");
  assert.equal(multiPvCommand(3), "setoption name MultiPV value 3");
  assert.equal(multiPvCommand(1), "setoption name MultiPV value 1");
  assert.equal(multiPvCommand(0), "setoption name MultiPV value 1");
  assert.equal(multiPvCommand(99), "setoption name MultiPV value 8");
});
