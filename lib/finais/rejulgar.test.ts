import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { lessonSchema, positionSchema } from "../lesson/schema.ts";
import { rejulgarPratica } from "./rejulgar.ts";

/**
 * O rejulgamento visto de fora: entra uma lista de lances, sai o veredito que
 * vira linha no banco — ou o erro que impede a linha de existir.
 *
 * ## O que este arquivo perdeu em 2026-09-08, e é preciso dizer
 *
 * Ele tinha duas metades. A primeira rodava sobre a **aula publicada**,
 * caminhando a linha da etapa 4 a partir do arquivo, e cobria nove casos do
 * `rejulgarSolo`: a linha inteira, a linha interrompida, o lance depois do fim,
 * o lance ilegal, o lance que joga o objetivo fora, o lance recusado que não
 * gasta teto, o teto estourado, a aula sem a etapa, e — na fixture de duas
 * variantes — o defensor com mais de uma resposta.
 *
 * **`rejulgarSolo` não existe mais.** A etapa 4 saiu do formato: a etapa sem
 * ajuda virou partida contra o Stockfish, e uma partida o servidor reconfere
 * jogando os lances na chess.js, não seguindo roteiro. Os nove casos não
 * ficaram sem cobertura — eles ficaram sem **assunto**.
 *
 * O que fica é a segunda metade, a da prática, que é hoje a única etapa que
 * vira linha no banco. E fica também a fixture de duas variantes, agora como
 * árvore da etapa *com ajuda*: ela não é mais rejulgada no servidor, mas
 * continua provando que o schema aceita `replies` — o que a mantém honesta
 * para o dia em que a árvore voltar a ser conferida.
 */

/* ------------------------------------------------------------------ *
 * A fixture: defensor com duas variantes, e a prática
 *
 * Rei e torre contra rei, com as **duas fugas** do rei preto escritas como
 * variantes (B9/E1). Escrita à mão porque nenhuma aula publicada tem nó de
 * resposta múltipla, e porque a etapa 5 só existe jogada.
 *
 * O primeiro teste **prova a fixture no tabuleiro** antes de qualquer outra
 * coisa: que o lance terminal dá mate mesmo, que o mesmo lance no outro ramo
 * **não** dá, e que o lance ilegal de um ramo é legal no outro. Fixture que
 * mente deixa teste verde por engano — e num arquivo cujo assunto é
 * desconfiar do que o navegador diz, isso seria irônico demais.
 * ------------------------------------------------------------------ */

const FEN_RAIZ = "6k1/8/5K2/8/8/8/8/1R6 w - - 0 1";
const FEN_S2A = "5k2/8/6K1/8/8/8/8/1R6 w - - 2 2";
const FEN_S2B = "7k/8/6K1/8/8/8/8/1R6 w - - 2 2";

const aula = lessonSchema.parse({
  id: "N9-FIXTURE-REPLAY",
  title: "Fixture do rejulgamento",
  orientation: "white",
  domainCriterion: "D1",
  errors: {},
  fallbacks: {
    winningOffMethod: "Ganha, mas não é o método.",
    losesWin: "Isso joga a vitória fora.",
    methodAlternative: "Mesma ideia por outro caminho.",
  },
  stages: {
    guided: {
      positionId: "pos-fx-replay",
      root: "s1",
      nodes: {
        s1: {
          fen: FEN_RAIZ,
          expects: [
            {
              moves: ["f6g6"],
              feedback: "A oposição: o rei preto fica com duas casas, e as duas perdem.",
              replies: [
                { reply: "g8f8", next: "s2a" },
                { reply: "g8h8", next: "s2b" },
              ],
            },
          ],
          winningMoves: ["f6g6", "f6e6", "b1b7", "b1b8", "b1g1"],
        },
        // O rei foge para o lado aberto: aqui não há mate, e a técnica recomeça
        // — o `next` volta para `s1`, que é literalmente a mesma posição.
        s2a: {
          fen: FEN_S2A,
          expects: [
            { moves: ["g6f6"], feedback: "De novo a oposição.", reply: "f8g8", next: "s1" },
          ],
          winningMoves: ["g6f6", "b1b8", "b1b7"],
        },
        // O rei foge para o canto: é aqui que a torre entrega o mate.
        s2b: {
          fen: FEN_S2B,
          expects: [{ moves: ["b1b8"], feedback: "Mate.", ends: "mate" }],
          winningMoves: ["b1b8", "g6f7", "g6f6", "b1b7"],
        },
      },
    },
    practice: {
      positionId: "pos-fx-replay",
      goal: "win",
      engine: { skill: 20, moveTimeMs: 300 },
    },
  },
});

const posicao = positionSchema.parse({
  id: "pos-fx-replay",
  fen: FEN_RAIZ,
  expectedResult: "win-white",
  tags: ["fixture", "krk"],
  status: "fixture",
  provenance: {
    externalHumanSource: null,
    bibliographicSource: null,
    originalGame: null,
    authorComposer: null,
    license: null,
    editionFile: null,
    fenMethod: "fixture técnica escrita para o teste do rejulgamento",
    qaApplied: null,
    pendingRisk: null,
  },
});

/** A partida da prática, jogada dos dois lados a partir da posição da aula. */
const MATE = ["f6g6", "g8h8", "b1b8"];
/** A torre entregue ao rei preto: sobra rei contra rei. */
const ENTREGA_A_TORRE = ["f6f5", "g8g7", "b1g1", "g7f7", "g1g7", "f7g7"];

function legais(fen: string): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
}

function depoisDe(lances: string[]): Chess {
  const jogo = new Chess(FEN_RAIZ);
  for (const uci of lances) jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
  return jogo;
}

test("a fixture é honesta: o mate é mate, o outro ramo não é, e a torre cai mesmo", () => {
  assert.equal(depoisDe(MATE).isCheckmate(), true);
  // O mesmo lance no ramo do lado aberto **não** dá mate: o rei preto escapa
  // por e7. É esta assimetria que o retrocesso precisa atravessar.
  assert.equal(depoisDe(["f6g6", "g8f8", "b1b8"]).isCheckmate(), false);
  assert.equal(depoisDe(ENTREGA_A_TORRE).isInsufficientMaterial(), true);

  assert.equal(legais(FEN_S2B).includes("g6f7"), true);
  assert.equal(legais(FEN_S2A).includes("g6f7"), false, "g6f7 é ilegal com o rei preto em f8");
});

/*
 * **Os três testes do defensor de duas variantes saíram com o `rejulgarSolo`.**
 *
 * Eles provavam que a linha vale por qualquer uma das duas respostas, que o
 * ramo em que o lance é ilegal não condena a tentativa que fecha no outro, e
 * que sem ramo que feche sobra o fracasso — e não o erro do ramo ilegal. Era a
 * parte mais fina do rejulgamento, e a única cobertura de `replies` que o
 * projeto tinha rodando de verdade.
 *
 * A fixture continua acima, e o teste de honestidade dela continua rodando: o
 * mate é mate, o outro ramo não é, e a torre cai mesmo. É o que sobra de pé
 * para o dia em que a árvore voltar a ser rejulgada no servidor.
 */

/* ------------------------------------------------------------------ *
 * A prática
 * ------------------------------------------------------------------ */

test("prática: a partida que termina em mate para o lado do aluno é sucesso", () => {
  const r = rejulgarPratica(aula, posicao, MATE);
  assert.ok("sucesso" in r);
  assert.equal(r.sucesso, true);
  assert.match(r.motivo, /Xeque-mate/);
});

test("prática: entregar a torre é empate, e empate não passa numa aula de vitória", () => {
  const r = rejulgarPratica(aula, posicao, ENTREGA_A_TORRE);
  assert.ok("sucesso" in r);
  assert.equal(r.sucesso, false);
  assert.match(r.motivo, /Material insuficiente/);
});

test("prática: o mesmo empate passa quando o objetivo da aula é empatar", () => {
  const paraEmpatar = structuredClone(aula);
  paraEmpatar.stages.practice!.goal = "draw";

  const r = rejulgarPratica(paraEmpatar, posicao, ENTREGA_A_TORRE);
  assert.ok("sucesso" in r);
  assert.equal(r.sucesso, true);
});

test("prática: partida não terminada, lance ilegal e lance depois do fim não viram linha", () => {
  assert.deepEqual(rejulgarPratica(aula, posicao, ["f6g6"]), { erro: "a partida não terminou" });

  const ilegal = rejulgarPratica(aula, posicao, ["f6f8"]);
  assert.ok("erro" in ilegal);
  assert.match(ilegal.erro, /ilegal/);

  const depoisDoFim = rejulgarPratica(aula, posicao, [...ENTREGA_A_TORRE, "f5f6"]);
  assert.ok("erro" in depoisDoFim);
  assert.match(depoisDoFim.erro, /depois do fim/);
});

test("prática: a posição precisa ser a que a aula marcou", () => {
  const outra = positionSchema.parse({ ...posicao, id: "pos-fx-outra" });
  assert.deepEqual(rejulgarPratica(aula, outra, MATE), { erro: "a posição não é a da prática" });
});
