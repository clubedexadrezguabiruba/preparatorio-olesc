import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Chess } from "chess.js";
import { lessonSchema, positionSchema } from "../lesson/schema.ts";
import { respostasDe } from "../lesson/tree.ts";
import { rejulgarPratica, rejulgarSolo } from "./rejulgar.ts";

/**
 * O rejulgamento visto de fora: entra uma lista de lances, sai o veredito que
 * vira linha no banco — ou o erro que impede a linha de existir.
 *
 * Roda sobre a **aula de verdade** sempre que a aula de verdade alcança o caso,
 * pelo motivo que `tree.test.ts` já registrou: literal fixado à mão quebra
 * quando a posição de ensino muda, e a posição de ensino já mudou duas vezes.
 * Nem a linha vencedora nem o lance que perde estão escritos aqui — os dois são
 * caminhados a partir do arquivo.
 *
 * Dois casos não cabem na N0-R-MATE, e para eles há a fixture da segunda
 * metade: **defensor com mais de uma variante** (o corpus de hoje é 100% de
 * resposta única) e a **prática inteira**, que num arquivo só existiria como
 * partida jogada contra o Stockfish.
 */

const lesson = lessonSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "content/lessons/N0-R-MATE.json"), "utf8")),
);
const solo = lesson.stages.solo!;

function legais(fen: string): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
}

/**
 * A linha principal da etapa 4 — o primeiro lance de cada nó, seguindo a
 * primeira resposta do defensor — e, junto, o nó em que cada lance foi jogado.
 * É o caminho que o aluno percorre quando acerta tudo, e o índice dos nós é o
 * que permite plantar um lance ruim **no meio** dele.
 */
function linhaPrincipal(): { lances: string[]; nos: string[] } {
  const lances: string[] = [];
  const nos: string[] = [];
  let nodeId = solo.root;
  for (let i = 0; i < 60; i += 1) {
    const node = solo.nodes[nodeId];
    assert.ok(node, `a árvore precisa ter o nó ${nodeId}`);
    const expect = node.expects[0];
    lances.push(expect.moves[0]);
    nos.push(nodeId);
    const respostas = respostasDe(expect);
    if (respostas.length === 0) return { lances, nos };
    nodeId = respostas[0].next;
  }
  throw new Error("a linha principal não terminou em 60 lances");
}

const { lances: linha, nos } = linhaPrincipal();

test("a linha principal da aula de verdade chega ao fim", () => {
  assert.ok(linha.length > 1, `a linha tem ${linha.length} lance(s)`);
  assert.ok(linha.length <= solo.moveLimit, "a linha principal cabe no teto da própria aula");

  assert.deepEqual(rejulgarSolo(lesson, linha), {
    sucesso: true,
    motivo: "chegou ao fim da linha dentro do teto",
  });
});

test("a linha interrompida no meio não é sucesso — e vira linha no banco assim mesmo", () => {
  const r = rejulgarSolo(lesson, linha.slice(0, -1));
  assert.ok("sucesso" in r);
  assert.equal(r.sucesso, false);
  assert.match(r.motivo, /não chegou ao fim/);
});

test("lance depois do fim da tentativa não vira linha nenhuma", () => {
  const r = rejulgarSolo(lesson, [...linha, linha[0]]);
  assert.ok("erro" in r, "a lista não descreve uma tentativa que aconteceu");
  assert.match(r.erro, /depois do fim/);
});

test("lance ilegal não vira linha nenhuma", () => {
  // Derivado, não fixado: a origem é uma casa vazia do tabuleiro da raiz, então
  // o lance é ilegal por construção — não depende de qual posição a aula usa.
  const vazia = new Chess(solo.nodes[solo.root].fen)
    .board()
    .flat()
    .map((casa, i) => ({ casa, square: `${"abcdefgh"[i % 8]}${8 - Math.floor(i / 8)}` }))
    .find(({ casa }) => casa === null)!.square;
  const ilegal = `${vazia}${vazia === "a1" ? "a2" : "a1"}`;
  assert.ok(!legais(solo.nodes[solo.root].fen).includes(ilegal));

  const r = rejulgarSolo(lesson, [ilegal]);
  assert.ok("erro" in r);
  assert.match(r.erro, /ilegal/);
});

test("lance que joga o objetivo fora encerra a tentativa, como na tela", () => {
  // O primeiro nó da linha em que existe lance legal fora de `winningMoves`.
  // Não é a raiz: em rei e torre contra rei, no começo **todo** lance ainda
  // ganha — é adiante, quando a torre pode ser entregue ou o rei afogado, que
  // aparece o que a tablebase reprova.
  const alvo = nos
    .map((id, i) => ({ i, node: solo.nodes[id] }))
    .map(({ i, node }) => ({
      i,
      perdedor: legais(node.fen).find((m) => !node.winningMoves.includes(m)),
    }))
    .find(({ perdedor }) => perdedor !== undefined);
  assert.ok(alvo, "a linha precisa ter algum nó com lance legal fora de winningMoves");

  const r = rejulgarSolo(lesson, [...linha.slice(0, alvo.i), alvo.perdedor!]);
  assert.ok("sucesso" in r);
  assert.equal(r.sucesso, false);
  assert.match(r.motivo, /jogou o objetivo fora/);
});

test("lance recusado que ainda ganha não gasta lance do teto", () => {
  const raiz = solo.nodes[solo.root];
  const foraDoMetodo = raiz.winningMoves.find(
    (m) =>
      !raiz.expects.some((e) => e.moves.includes(m)) &&
      !(raiz.mistakes ?? []).some((mm) => mm.moves.includes(m)) &&
      !(raiz.authorAlternatives ?? []).some((a) => a.moves.includes(m)) &&
      !(raiz.methodAlternatives ?? []).includes(m),
  );
  assert.ok(foraDoMetodo, "a raiz precisa ter algum lance vencedor fora das listas");

  // A linha inteira **mais** o recusado na frente. Se o recusado gastasse lance
  // do teto, uma linha que cabia passaria a estourá-lo — que é exatamente o que
  // a tela não faz: ali a peça volta e o contador não anda.
  assert.deepEqual(rejulgarSolo(lesson, [foraDoMetodo, ...linha]), {
    sucesso: true,
    motivo: "chegou ao fim da linha dentro do teto",
  });
});

test("o teto de lances é o do arquivo, e reprova quem não cabe nele", () => {
  const apertada = structuredClone(lesson);
  apertada.stages.solo!.moveLimit = 1;

  const r = rejulgarSolo(apertada, [linha[0]]);
  assert.ok("sucesso" in r);
  assert.equal(r.sucesso, false);
  assert.match(r.motivo, /teto de 1 lances/);
});

test("aula sem etapa sem ajuda recusa a tentativa em vez de inventá-la", () => {
  const curta = structuredClone(lesson);
  delete curta.stages.solo;
  assert.deepEqual(rejulgarSolo(curta, linha), { erro: "a aula não tem etapa sem ajuda" });
  assert.deepEqual(rejulgarSolo(lesson, []), { erro: "tentativa sem lance nenhum" });
});

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
    solo: {
      positionId: "pos-fx-replay",
      root: "s1",
      moveLimit: 4,
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

test("defensor com duas variantes: a linha vale por qualquer uma delas", () => {
  assert.deepEqual(rejulgarSolo(aula, ["f6g6", "b1b8"]), {
    sucesso: true,
    motivo: "chegou ao fim da linha dentro do teto",
  });
});

test("o ramo em que o lance é ilegal não condena a tentativa que fecha no outro", () => {
  // Sem retrocesso, o ramo `s2a` — onde `g6f7` é ilegal — derrubaria uma
  // tentativa que terminou em mate no ramo `s2b`.
  assert.deepEqual(rejulgarSolo(aula, ["f6g6", "g6f7", "b1b8"]), {
    sucesso: true,
    motivo: "chegou ao fim da linha dentro do teto",
  });
});

test("sem ramo que feche, sobra o fracasso — e não o erro do ramo ilegal", () => {
  const r = rejulgarSolo(aula, ["f6g6", "g6f7"]);
  assert.ok("sucesso" in r, "fracasso do aluno vira linha; erro de arquivo não");
  assert.equal(r.sucesso, false);
});

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
