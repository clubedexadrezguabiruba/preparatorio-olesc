import assert from "node:assert/strict";
import test from "node:test";
import {
  anderssenMate,
  balestraMate,
  blackburneMate,
  blindSwineMate,
  cornerMate,
  counterCheck,
  cozioMate,
  damianoMate,
  desperado,
  epauletteMate,
  etiquetar,
  greekGift,
  grecoMate,
  killBoxMate,
  legalMate,
  lolliMate,
  maxLangeMate,
  morphysMate,
  operaMate,
  pawnMate,
  pillsburysMate,
  retiMate,
  suffocationMate,
} from "./detectores.ts";
import { mateFinal } from "./geometria.ts";

/**
 * As posições do Praticar do Lichess (`lichess.org/practice`, estudos
 * "Checkmate Patterns" I a IV) como gabarito dos detectores.
 *
 * Cada posição tem de ser reconhecida pelo detector do padrão dela — e **por
 * nenhum outro**, salvo as sobreposições de `SOBREPOSICOES`, que são a mesma
 * posição servindo de exemplo de dois padrões e estão explicadas ali. Um
 * detector frouxo demais aparece aqui como posição de outro padrão aceita.
 *
 * As linhas foram jogadas até o mate e conferidas por chess.js. Os estudos não
 * trazem a solução; quando ela não estava no PGN, saiu de um resolvedor de mate
 * em N e está anotada no comentário.
 */

const DETECTORES = {
  damianoMate,
  lolliMate,
  anderssenMate,
  cozioMate,
  pawnMate,
  suffocationMate,
  grecoMate,
  maxLangeMate,
  blackburneMate,
  retiMate,
  legalMate,
  epauletteMate,
  killBoxMate,
  balestraMate,
  cornerMate,
  blindSwineMate,
  operaMate,
  pillsburysMate,
  morphysMate,
} as const;

type Padrao = keyof typeof DETECTORES;

type Posicao = { nome: string; padrao: Padrao | null; fen: string; lances: string[] };

const PRATICAR: Posicao[] = [
  { nome: "Damiano #1", padrao: "damianoMate", fen: "5rk1/6p1/6P1/7Q/8/8/8/6K1 w - - 0 1", lances: ["h5h7"] },
  {
    nome: "Damiano #2",
    padrao: "damianoMate",
    fen: "4rk2/1p1q1p2/3p1Bn1/p1pP1p2/P1P5/1PK3Q1/8/7R w - - 0 1",
    lances: ["h1h8", "g6h8", "g3g7"],
  },
  { nome: "Lolli #1", padrao: "lolliMate", fen: "6k1/5p2/5PpQ/8/8/8/8/6K1 w - - 0 1", lances: ["h6g7"] },
  {
    nome: "Lolli #2",
    padrao: "lolliMate",
    fen: "r4r2/1q3pkp/p1b1p1n1/1p4QP/4P3/1BP3P1/P4P2/R2R2K1 w - - 0 1",
    lances: ["h5h6", "g7g8", "g5f6", "a8b8", "f6g7"],
  },
  { nome: "Anderssen #1", padrao: "anderssenMate", fen: "6k1/6P1/5K1R/8/8/8/8/8 w - - 0 1", lances: ["h6h8"] },
  {
    // 1…Qh4 2.Bh3 Qxh3 3.d6 Qh1# — o 3º lance branco é qualquer um.
    nome: "Anderssen #2",
    padrao: "anderssenMate",
    fen: "1k2r3/pP3pp1/8/3P1B1p/5q2/N1P2b2/PP3Pp1/R5K1 b - - 0 1",
    lances: ["f4h4", "f5h3", "h4h3", "d5d6", "h3h1"],
  },
  {
    nome: "Cozio #1",
    padrao: "cozioMate",
    fen: "8/8/1Q6/8/6pk/5q2/8/6K1 w - - 0 1",
    lances: ["b6h6", "h4g3", "h6h2"],
  },
  { nome: "Mate de peão #1", padrao: "pawnMate", fen: "8/7R/1pkp4/2p5/1PP5/8/8/6K1 w - - 0 1", lances: ["b4b5"] },
  {
    nome: "Mate de peão #2",
    padrao: "pawnMate",
    fen: "r1b3nr/ppp3qp/1bnpk3/4p1BQ/3PP3/2P5/PP3PPP/RN3RK1 w - - 0 1",
    lances: ["h5e8", "g8e7", "d4d5"],
  },
  {
    nome: "Asfixia #1",
    padrao: "suffocationMate",
    fen: "5rk1/5p1p/8/3N4/8/8/1B6/7K w - - 0 1",
    lances: ["d5e7"],
  },
  { nome: "Greco #1", padrao: "grecoMate", fen: "7k/6p1/6Q1/8/8/1B6/8/6K1 w - - 0 1", lances: ["g6h5"] },
  {
    nome: "Greco #2",
    padrao: "grecoMate",
    fen: "r4r1k/ppn1NBpp/4b3/4P3/3p1R2/1P6/P1P3PP/R5K1 w - - 0 1",
    lances: ["e7g6", "h7g6", "f4h4"],
  },
  { nome: "Max Lange #1", padrao: "maxLangeMate", fen: "2Q5/5Bpk/7p/8/8/8/8/6K1 w - - 0 1", lances: ["c8g8"] },
  {
    nome: "Max Lange #2",
    padrao: "maxLangeMate",
    fen: "r3k3/ppp2pp1/8/2bpP2P/4q3/1B1p1Q2/PPPP2P1/RNB4K b q - 0 1",
    lances: ["e4h4", "f3h3", "h4e1", "h1h2", "c5g1", "h2h1", "g1f2", "h1h2", "e1g1"],
  },
  {
    nome: "Blackburne #1",
    padrao: "blackburneMate",
    fen: "5rk1/7p/8/6N1/8/8/1BB5/6K1 w - - 0 1",
    lances: ["c2h7"],
  },
  { nome: "Réti #1", padrao: "retiMate", fen: "1nb5/1pk5/2p5/8/7B/8/8/3R3K w - - 0 1", lances: ["h4d8"] },
  { nome: "Légal #1", padrao: "legalMate", fen: "3q1b2/4kB2/3p4/4N3/8/2N5/8/6K1 w - - 0 1", lances: ["c3d5"] },
  { nome: "Dragonas #1", padrao: "epauletteMate", fen: "3rkr2/8/5Q2/8/8/8/8/6K1 w - - 0 1", lances: ["f6e6"] },
  {
    nome: "Dragonas #2",
    padrao: "epauletteMate",
    fen: "1k1r4/pp1q1B1p/3bQp2/2p2r2/P6P/2BnP3/1P6/5RKR b - - 0 1",
    lances: ["d8g8", "f7g8", "d7g7"],
  },
  {
    nome: "Dragonas #3",
    padrao: "epauletteMate",
    fen: "5r2/pp3k2/5r2/q1p2Q2/3P4/6R1/PPP2PP1/1K6 w - - 0 1",
    lances: ["f5d7"],
  },
  { nome: "Caixa #1", padrao: "killBoxMate", fen: "2kr4/8/1Q6/8/8/8/5PPP/3R1RK1 w - - 0 1", lances: ["d1d8"] },
  { nome: "Balestra #1", padrao: "balestraMate", fen: "5k2/8/6Q1/8/8/6B1/8/6K1 w - - 0 1", lances: ["g3d6"] },
  { nome: "Canto #1", padrao: "cornerMate", fen: "7k/7p/8/6N1/8/8/8/6RK w - - 0 1", lances: ["g5f7"] },
  {
    nome: "Canto #2",
    padrao: "cornerMate",
    fen: "5rk1/3Q1p2/6p1/P5r1/R1q1n3/7B/7P/5R1K b - - 0 1",
    lances: ["c4f1", "h3f1", "e4f2"],
  },
  {
    // Resolvedor: 1.Rg7+ Kh8 2.Rh7+ Kg8 3.Rbg7#.
    nome: "Porcos cegos #1",
    padrao: "blindSwineMate",
    fen: "5rk1/1R2R1pp/8/8/8/8/8/1K6 w - - 0 1",
    lances: ["e7g7", "g8h8", "g7h7", "h8g8", "b7g7"],
  },
  { nome: "Ópera #1", padrao: "operaMate", fen: "4k3/5p2/8/6B1/8/8/8/3R2K1 w - - 0 1", lances: ["d1d8"] },
  {
    nome: "Ópera #2",
    padrao: "operaMate",
    fen: "rn1r2k1/ppp2ppp/3q1n2/4b1B1/4P1b1/1BP1Q3/PP3PPP/RN2K1NR b KQ - 0 1",
    lances: ["d6d1", "b3d1", "d8d1"],
  },
  { nome: "Pillsbury #1", padrao: "pillsburysMate", fen: "5rk1/5p1p/8/8/8/8/1B6/4K2R w - - 0 1", lances: ["h1g1"] },
  { nome: "Morphy #1", padrao: "morphysMate", fen: "7k/5p1p/8/8/7B/8/8/6RK w - - 0 1", lances: ["h4f6"] },
  {
    nome: "Morphy #2",
    padrao: "morphysMate",
    fen: "5rk1/p4p1p/1p1rpp2/3qB3/3PR3/7P/PP3PP1/6K1 w - - 0 1",
    lances: ["e4g4", "g8h8", "e5f6"],
  },

  // Padrões do Lichess que não são nossos: nenhum detector pode aceitá-los.
  { nome: "Cauda de andorinha #1", padrao: null, fen: "1r6/pk6/4Q3/3P4/8/8/8/6K1 w - - 0 1", lances: ["e6c6"] },
  {
    nome: "Cauda de andorinha #2",
    padrao: null,
    fen: "r1b1q1r1/ppp3kp/1bnp4/4p1B1/3PP3/2P2Q2/PP3PPP/RN3RK1 w - - 0 1",
    lances: ["f3f6"],
  },
  { nome: "Guéridon #1", padrao: null, fen: "3r1r2/4k3/R7/3Q4/8/8/8/6K1 w - - 0 1", lances: ["d5e6"] },
  { nome: "Guéridon #2", padrao: null, fen: "8/8/2P5/3K1k2/2R3p1/2q5/8/8 b - - 0 1", lances: ["c3e5"] },
  { nome: "Triângulo #1", padrao: null, fen: "8/3p4/3k4/2R4Q/8/4K3/8/8 w - - 0 1", lances: ["h5e5"] },
  { nome: "Vuković #1", padrao: null, fen: "4k3/R7/4N3/3r4/8/B7/4K3/8 w - - 0 1", lances: ["a7e7"] },
  {
    nome: "Vuković #3",
    padrao: null,
    fen: "2r5/8/8/5K1k/4N1R1/7P/8/8 w - - 0 1",
    lances: ["e4f6", "h5h6", "g4g6"],
  },
  {
    nome: "Boden #1",
    padrao: null,
    fen: "2kr4/3p4/8/8/5B2/8/8/5BK1 w - - 0 1",
    lances: ["f1a6"],
  },
  {
    nome: "Boden #2",
    padrao: null,
    fen: "2k1rb1r/ppp3pp/2n2q2/3B1b2/5P2/2P1BQ2/PP1N1P1P/2KR3R b - - 0 1",
    lances: ["f6c3", "b2c3", "f8a3"],
  },
];

/**
 * Posições que são exemplo de dois padrões ao mesmo tempo — a sobreposição é da
 * definição, não do detector:
 *
 * - **Guéridon #1** tem as "dragonas" (torres em d8 e f8 dos lados do xeque) e a
 *   dama a uma casa só; não passa em `epauletteMate` porque a regra pede xeque
 *   de duas casas ou mais. Nada a declarar — fica aqui como lembrete.
 */
const SOBREPOSICOES: Record<string, readonly Padrao[]> = {};

for (const p of PRATICAR) {
  test(`${p.nome}: a linha termina em mate`, () => {
    assert.ok(mateFinal(p.fen, p.lances), "a linha não termina em mate");
  });

  if (p.padrao) {
    test(`${p.nome}: ${p.padrao} reconhece`, () => {
      const mate = mateFinal(p.fen, p.lances)!;
      assert.equal(DETECTORES[p.padrao!](mate), true);
    });
  }

  test(`${p.nome}: nenhum outro detector aceita`, () => {
    const mate = mateFinal(p.fen, p.lances)!;
    const outros = (Object.keys(DETECTORES) as Padrao[]).filter(
      (d) => d !== p.padrao && !(SOBREPOSICOES[p.nome] ?? []).includes(d) && DETECTORES[d](mate),
    );
    assert.deepEqual(outros, []);
  });
}

test("linha que não termina em mate não tem geometria de mate", () => {
  assert.equal(mateFinal("5rk1/6p1/6P1/7Q/8/8/8/6K1 w - - 0 1", ["h5h6"]), null);
});

test("etiquetar: Cozio acrescenta dovetailMate; dragonas só ficam com a tag do Lichess", () => {
  const cozio = { fen: "8/8/1Q6/8/6pk/5q2/8/6K1 w - - 0 1", lances: ["b6h6", "h4g3", "h6h2"] };
  assert.deepEqual(etiquetar({ ...cozio, temas: ["mate"] }), ["dovetailMate"]);

  const dragonas = { fen: "3rkr2/8/5Q2/8/8/8/8/6K1 w - - 0 1", lances: ["f6e6"] };
  assert.deepEqual(etiquetar({ ...dragonas, temas: ["mate"] }), []);
  assert.deepEqual(etiquetar({ ...dragonas, temas: ["mate", "epauletteMate"] }), ["epauletteMate"]);
  // A tag do Lichess numa posição sem a figura cai.
  assert.deepEqual(etiquetar({ ...cozio, temas: ["mate", "epauletteMate"] }), ["dovetailMate"]);
});

/*
 * As táticas olham a linha do puzzle, no formato do Lichess: `lances[0]` é o
 * erro do adversário, e quem resolve joga os de índice ímpar.
 */

test("sacrifício grego: Bxh7+ contra o rei rocado, com o cavalo chegando a g5", () => {
  // Posição de escola: 1…a6?? 2.Bxh7+ Kxh7 3.Ng5+.
  const fen = "r1bq1rk1/pppnbppp/4pn2/3pP3/3P4/3B1N2/PPP2PPP/RNBQ1RK1 b - - 0 1";
  assert.equal(greekGift(fen, ["a7a6", "d3h7", "g8h7", "f3g5"]), true);
  assert.equal(greekGift(fen, ["a7a6", "d1e2", "a6a5", "d3h7"]), false, "o bispo tem de ser o primeiro lance");
});

test("contra-xeque: em xeque, responder dando xeque sem mexer o rei", () => {
  // Pretas dão xeque com a torre em a1; brancas tapam com a dama em e1, dando xeque ao rei em e8.
  const fen = "r3k3/8/8/8/8/8/3Q4/6K1 b - - 0 1";
  assert.equal(counterCheck(fen, ["a8a1", "d2e1"]), true);
  assert.equal(counterCheck(fen, ["a8a1", "g1f2"]), false, "fugir com o rei não é contra-xeque");
});

test("desperado: a peça que ficou perdida toma algo menor antes de cair, e depois se colhe outra", () => {
  // 1…e6 ataca o cavalo de d5, com o bispo preto de g4 pendurado. Em vez de
  // fugir, 2.Nxc7+ Qxc7 e 3.Qxg4: o cavalo vendeu caro, e a dama colhe o bispo.
  const fen = "r2qkbnr/pppppppp/2n5/3N4/6b1/8/PPP2PPP/R1BQKBNR b KQkq - 0 1";
  assert.equal(desperado(fen, ["e7e6", "d5c7", "d8c7", "d1g4"]), true);
  assert.equal(desperado(fen, ["e7e6", "d5c7", "d8c7"]), false, "sem a segunda captura é só perder o cavalo");
  assert.equal(desperado(fen, ["e7e6", "d5f4", "g4d1"]), false, "fugir não é desperado");
});
