import assert from "node:assert/strict";
import test from "node:test";
import { paraBrancas, paraUci, pvEmSan, quemEstaMelhor } from "./motor.ts";

/**
 * O que se lê e o que se escreve ao conversar com o motor.
 *
 * Estas funções passaram meses dentro de `scripts/motor-repertorio.ts`, onde
 * teste nenhum as alcançava — e foram elas que quase puseram uma avaliação
 * invertida no `docs/REPERTORIO.md`. Cada caso aqui é um erro que já aconteceu
 * ou que aconteceria calado.
 */

/* ------------------------------------------------------------------ *
 * A leitura dos lances — o portão da armadilha 3
 * ------------------------------------------------------------------ */

test("lê SAN inglês com número de lance", () => {
  const { uci, sans, vez } = paraUci("1.e4 c5 2.Bc4 Nc6");
  assert.deepEqual(uci, ["e2e4", "c7c5", "f1c4", "b8c6"]);
  assert.deepEqual(sans, ["e4", "c5", "Bc4", "Nc6"]);
  assert.equal(vez, "brancas");
});

test("lê SAN português, e a saída volta em SAN canônico", () => {
  // Quem escreve as linhas digita em português; a `chess.js` só fala inglês.
  const { uci, sans } = paraUci("1.e4 c5 2.Bc4 Cc6 3.Df3");
  assert.deepEqual(uci, ["e2e4", "c7c5", "f1c4", "b8c6", "d1f3"]);
  assert.deepEqual(sans, ["e4", "c5", "Bc4", "Nc6", "Qf3"]);
});

test("lê UCI, e as três notações misturadas na mesma linha", () => {
  const { sans } = paraUci("e2e4 c5 2.f1c4 Cc6");
  assert.deepEqual(sans, ["e4", "c5", "Bc4", "Nc6"]);
});

test("`R` é torre e não rei: ganha o inglês", () => {
  // O único token em que as duas línguas colidem. A regra é decidida, não
  // acidental — e a saída em SAN canônico deixa a leitura visível.
  const { sans, uci } = paraUci("1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O Nf6 5.Re1");
  assert.equal(sans.at(-1), "Re1", "Re1 tem de ser a torre f1-e1");
  assert.equal(uci.at(-1), "f1e1");
});

test("lance ilegal estoura, dizendo qual e depois de quê", () => {
  // A armadilha 3 inteira: o Stockfish descartaria isto em silêncio e
  // responderia com convicção sobre outra posição. Aconteceu no B4.
  assert.throws(
    () => paraUci("1.e4 c5 2.Qf3 Qc5"),
    (erro: Error) => /"Qc5" não é lance legal depois de e4 c5 Qf3/.test(erro.message),
  );
});

test("número de lance, reticências e resultado são descartados", () => {
  const { sans, vez } = paraUci("1. e4 c5 2. Nf3 1-0");
  assert.deepEqual(sans, ["e4", "c5", "Nf3"]);
  assert.equal(vez, "pretas");
});

test("texto vazio é a posição inicial, com as brancas na vez", () => {
  assert.deepEqual(paraUci("   "), { uci: [], sans: [], vez: "brancas" });
});

/* ------------------------------------------------------------------ *
 * O sinal
 * ------------------------------------------------------------------ */

test("a avaliação vira o sinal quando quem joga é o preto", () => {
  // O erro que este teste existe para impedir: o UCI fala do ponto de vista de
  // quem tem a vez, e o documento fala do ponto de vista das brancas.
  assert.equal(paraBrancas(67, "brancas"), 67);
  assert.equal(paraBrancas(67, "pretas"), -67);
  assert.equal(paraBrancas(-30, "pretas"), 30);
  assert.equal(paraBrancas(null, "pretas"), null, "mate não tem sinal a virar");
});

test("o texto da avaliação, nas quatro faixas", () => {
  assert.equal(quemEstaMelhor(null), "mate à vista");
  assert.equal(quemEstaMelhor(0), "igual");
  assert.equal(quemEstaMelhor(24), "igual");
  assert.equal(quemEstaMelhor(-24), "igual");
  assert.equal(quemEstaMelhor(25), "brancas +0,25");
  assert.equal(quemEstaMelhor(-67), "pretas +0,67");
  assert.equal(quemEstaMelhor(319), "brancas +3,19");
});

/* ------------------------------------------------------------------ *
 * A linha principal em SAN
 * ------------------------------------------------------------------ */

test("a PV começa no número de lance certo, e do lado certo", () => {
  // Depois de três meios-lances é a vez das pretas, e a PV tem de abrir com
  // "2..." — não com "2." nem com "3.".
  const caminho = ["e2e4", "c7c5", "g1f3"];
  assert.equal(pvEmSan(caminho, "b8c6 d2d4 c5d4", 3), "2...Nc6 3.d4 cxd4");
});

test("a PV que começa nas brancas abre com o número seco", () => {
  assert.equal(pvEmSan(["e2e4", "c7c5"], "g1f3 d7d6", 2), "2.Nf3 d6");
});

test("`quantos` corta a PV", () => {
  assert.equal(pvEmSan([], "e2e4 e7e5 g1f3", 1), "1.e4");
});

test("PV truncada pelo motor mostra o que deu para ler, sem estourar", () => {
  // O motor às vezes devolve uma PV cortada no meio. Estourar aqui apagaria a
  // única informação que a linha tinha.
  assert.equal(pvEmSan([], "e2e4 e7e5 h9h9 g1f3", 4), "1.e4 e5");
});
