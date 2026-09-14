import assert from "node:assert/strict";
import test from "node:test";
import {
  alturaDaBarra,
  avaliacaoParaBrancas,
  contaPecas,
  estadoTerminal,
  formatarAvaliacao,
  linhasEsperadas,
  pvEmSanDaFen,
  resultadoTerminal,
} from "./avaliacao-do-professor.ts";

/**
 * As contas da faixa do motor do professor (fatia 9, parada 9B). Nenhuma toca Worker:
 * recebem o que o motor disse e devolvem o que a tela escreve.
 */

const INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** Ruy López depois de 3.Bb5 — pretas na vez, lance 3. */
const RUY_LOPEZ = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";

test("perspectiva: o UCI fala de quem joga, a faixa fala das brancas", () => {
  assert.deepEqual(avaliacaoParaBrancas({ cp: 35, mate: null }, "w"), { cp: 35, mate: null });
  // Pretas na vez com +35 para elas é −35 para as brancas.
  assert.deepEqual(avaliacaoParaBrancas({ cp: 35, mate: null }, "b"), { cp: -35, mate: null });
  // Mate também troca de sinal: as pretas dão mate em 3 → −#3.
  assert.deepEqual(avaliacaoParaBrancas({ cp: null, mate: 3 }, "b"), { cp: null, mate: -3 });
  assert.deepEqual(avaliacaoParaBrancas({ cp: null, mate: -2 }, "w"), { cp: null, mate: -2 });
});

test("formatação em pt-BR: vírgula, sinal de menos de verdade, mate com #", () => {
  assert.equal(formatarAvaliacao({ cp: 50, mate: null }).curto, "+0,5");
  assert.equal(formatarAvaliacao({ cp: -123, mate: null }).curto, "−1,2");
  assert.equal(formatarAvaliacao({ cp: 0, mate: null }).curto, "0,0");
  assert.equal(formatarAvaliacao({ cp: 4, mate: null }).curto, "0,0", "arredonda para zero sem sinal");
  assert.equal(formatarAvaliacao({ cp: null, mate: 5 }).curto, "#5");
  assert.equal(formatarAvaliacao({ cp: null, mate: -3 }).curto, "−#3");

  assert.equal(formatarAvaliacao({ cp: 50, mate: null }).extenso, "vantagem das brancas de 0,5 peão");
  assert.equal(formatarAvaliacao({ cp: -250, mate: null }).extenso, "vantagem das pretas de 2,5 peões");
  assert.equal(formatarAvaliacao({ cp: 0, mate: null }).extenso, "posição igual");
  assert.equal(formatarAvaliacao({ cp: null, mate: 5 }).extenso, "as brancas dão mate em 5 lances");
  assert.equal(formatarAvaliacao({ cp: null, mate: -1 }).extenso, "as pretas dão mate em 1 lance");
});

test("barra: metade no zero, extremos no mate, curva que não passa dos limites", () => {
  assert.equal(alturaDaBarra({ cp: 0, mate: null }), 50);
  assert.equal(alturaDaBarra({ cp: null, mate: 4 }), 100);
  assert.equal(alturaDaBarra({ cp: null, mate: -4 }), 0);
  const leve = alturaDaBarra({ cp: 100, mate: null });
  const grande = alturaDaBarra({ cp: 800, mate: null });
  const enorme = alturaDaBarra({ cp: 50_000, mate: null });
  assert.ok(leve > 50 && leve < grande && grande < enorme && enorme < 100, `${leve} ${grande} ${enorme}`);
  assert.equal(alturaDaBarra({ cp: -100, mate: null }), 100 - leve, "simétrica");
});

test("PV a partir da FEN: numeração do meio da partida e reticências com as pretas na vez", () => {
  assert.equal(pvEmSanDaFen(RUY_LOPEZ, ["a7a6", "b5a4", "g8f6", "e1g1"], 6), "3…a6 4.Ba4 Nf6 5.O-O");
  assert.equal(pvEmSanDaFen(INICIAL, ["e2e4", "e7e5", "g1f3"], 6), "1.e4 e5 2.Nf3");
});

test("PV cortada no máximo e no primeiro lance ilegal", () => {
  const pv = ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6"];
  assert.equal(pvEmSanDaFen(INICIAL, pv, 6), "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6");
  // e2e4 duas vezes: o segundo é ilegal, a linha para ali.
  assert.equal(pvEmSanDaFen(INICIAL, ["e2e4", "e7e5", "e2e4", "g8f6"], 6), "1.e4 e5");
  assert.equal(pvEmSanDaFen(INICIAL, [], 6), "");
});

test("posições terminais: o texto vem da regra do jogo, e as outras não são terminais", () => {
  // Mate do louco: brancas levaram mate.
  const mate = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
  assert.equal(estadoTerminal(mate), "Xeque-mate.");
  const afogado = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
  assert.equal(estadoTerminal(afogado), "Rei afogado — empate.");
  const insuficiente = "8/8/4k3/8/8/4K3/8/8 w - - 0 1";
  assert.equal(estadoTerminal(insuficiente), "Material insuficiente para dar mate — empate.");
  assert.equal(estadoTerminal(INICIAL), null);
  assert.equal(estadoTerminal("não é fen"), null);
});

test("barra da posição final: cheia para quem deu mate, no meio no empate", () => {
  // As brancas levaram mate: a barra é toda das pretas.
  assert.deepEqual(resultadoTerminal("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"), { texto: "Xeque-mate.", barra: 0 });
  // As pretas levaram mate de duas torres: a barra é toda das brancas.
  assert.deepEqual(resultadoTerminal("6Rk/6R1/8/8/8/8/8/K7 b - - 0 1"), { texto: "Xeque-mate.", barra: 100 });
  assert.deepEqual(resultadoTerminal("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"), { texto: "Rei afogado — empate.", barra: 50 });
  assert.equal(resultadoTerminal(INICIAL), null);
});

test("peças contadas pela FEN, e linhas esperadas presas aos lances legais", () => {
  assert.equal(contaPecas(INICIAL), 32);
  assert.equal(contaPecas("8/8/4k3/8/3P4/4K3/8/8 w - - 0 1"), 3);
  assert.equal(linhasEsperadas(INICIAL, 3), 3);
  // Rei branco em a1, em xeque da dama de c3: b1 e b2 são do rei preto, só Ka2 escapa.
  assert.equal(linhasEsperadas("8/8/8/8/8/2q5/8/K1k5 w - - 0 1", 3), 1);
});
