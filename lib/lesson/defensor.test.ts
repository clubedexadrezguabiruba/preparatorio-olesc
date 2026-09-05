import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chaveDoDefensor, escolherResposta, fnv1a } from "./defensor.ts";
import { lessonSchema, type Lesson, type MoveTree } from "./schema.ts";
import { judgeMove, respostasDe } from "./tree.ts";

/**
 * A escolha da variante do defensor (B9/E6).
 *
 * As duas propriedades que a aula depende — estável dentro da tentativa, outra
 * na seguinte — são medidas aqui, e não na tela: são propriedades de uma conta,
 * e uma conta se confere com `node --test` em milissegundos. O que sobra para a
 * tela é ver o lance acontecer.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

const aula = (id: string): Lesson =>
  lessonSchema.parse(
    JSON.parse(readFileSync(path.join(RAIZ, "content/lessons", `${id}.json`), "utf8")),
  );

const DUAS = ["e4f4", "e4d4"] as const;
const TRES = ["e4f4", "e4d4", "e4e5"] as const;

test("dentro de uma tentativa a defesa não muda", () => {
  const chave = chaveDoDefensor("guided", "n7");
  const tres = [1, 2, 3].map(() => escolherResposta(DUAS, chave, 4));
  assert.equal(new Set(tres).size, 1, "três consultas na mesma tentativa deram respostas diferentes");
});

test("entre tentativas seguidas a defesa muda sempre — não por sorte de hash", () => {
  // A tentativa **roda** o índice, e é isso que torna a variação garantida.
  // Uma chave hasheada com o número da tentativa dentro daria duas iguais de
  // vez em quando, e o aluno treinaria a mesma defesa duas vezes achando que
  // estava treinando duas.
  for (const chave of ["guided:n1", "guided:n7", "solo:s3", "solo:s10"]) {
    for (let tentativa = 1; tentativa <= 10; tentativa += 1) {
      assert.notEqual(
        escolherResposta(DUAS, chave, tentativa),
        escolherResposta(DUAS, chave, tentativa + 1),
        `${chave}: as tentativas ${tentativa} e ${tentativa + 1} deram a mesma defesa`,
      );
    }
  }
});

test("com três variantes, três tentativas seguidas cobrem as três", () => {
  const chave = chaveDoDefensor("guided", "n7");
  const vistas = [1, 2, 3].map((t) => escolherResposta(TRES, chave, t));
  assert.equal(new Set(vistas).size, 3);
});

test("nós diferentes não jogam a mesma variante em fila", () => {
  // Se todos os nós escolhessem pelo número da tentativa e mais nada, a aula
  // inteira mudaria em bloco — a segunda tentativa seria "a outra aula". O
  // hash do lugar é o que dá a cada nó um ponto de partida próprio.
  const naPrimeira = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8"].map((no) =>
    escolherResposta(DUAS, chaveDoDefensor("guided", no), 1),
  );
  assert.equal(new Set(naPrimeira).size, 2, "todos os nós começaram na mesma variante");
});

test("uma variante só devolve sempre ela, em qualquer tentativa", () => {
  // É o corpus de hoje inteiro: nenhuma aula publicada usa `replies`, então a
  // conta tem de ser um passa-fora — a aula do aluno não pode mudar por causa
  // deste bloco.
  for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
    assert.equal(escolherResposta(["e4f4"], "guided:n1", tentativa), "e4f4");
  }
});

test("lista vazia é erro de programa, não silêncio", () => {
  assert.throws(() => escolherResposta([], "guided:n1", 1), /variante nenhuma/);
});

test("o hash espalha chaves parecidas", () => {
  const chaves = Array.from({ length: 30 }, (_, i) => `guided:n${i + 1}`);
  const pares = chaves.map((c) => fnv1a(c) % 2);
  assert.equal(new Set(pares).size, 2, "trinta nós caíram todos do mesmo lado");
  assert.equal(new Set(chaves.map(fnv1a)).size, 30, "houve colisão em trinta chaves seguidas");
});

/* ------------------------------------------------------------------ *
 * A aula inteira, jogada duas vezes
 * ------------------------------------------------------------------ */

/** Joga a linha principal até o mate, escolhendo a defesa como a etapa faria. */
function jogar(lesson: Lesson, tree: MoveTree, treeKey: string, tentativa: number): string[] {
  const linha: string[] = [];
  let nodeId = tree.root;
  for (let passo = 0; passo < 60; passo += 1) {
    const no = tree.nodes[nodeId];
    const lance = no.expects[0].moves[0];
    const veredito = judgeMove(lesson, no, lance);
    assert.equal(veredito.kind, "method");
    linha.push(lance);
    const respostas = veredito.kind === "method" ? veredito.respostas : [];
    if (respostas.length === 0) break;
    const escolhida = escolherResposta(respostas, chaveDoDefensor(treeKey, nodeId), tentativa);
    linha.push(escolhida.reply);
    nodeId = escolhida.next;
  }
  return linha;
}

test("a aula publicada joga igual em qualquer tentativa", () => {
  // O contrato de E6 com o conteúdo de hoje: nada muda. A defesa variável só
  // aparece na aula que **usar** `replies`, e nenhuma usa ainda.
  const lesson = aula("N0-R-MATE");
  const guided = lesson.stages.guided as MoveTree;
  const primeira = jogar(lesson, guided, "guided", 1);
  const segunda = jogar(lesson, guided, "guided", 2);
  assert.deepEqual(primeira, segunda);
  assert.equal(primeira.length, 31, "16 lances do aluno e 15 respostas");
});

test("com uma variante escrita, duas tentativas dão duas aulas diferentes", () => {
  const lesson = structuredClone(aula("N0-R-MATE"));
  const guided = lesson.stages.guided as MoveTree;
  // A transposição de verdade: depois de 1.Rf2 o rei preto pode ir para f4 (a
  // linha escrita) ou para d4; de d4, 2.Th4+ Re5 chega ao mesmo n3.
  const expect = guided.nodes.n1.expects[0];
  expect.replies = [
    { reply: "e4f4", next: "n2" },
    { reply: "e4d4", next: "t2" },
  ];
  delete expect.reply;
  delete expect.next;
  guided.nodes.t2 = {
    fen: "8/8/8/8/3k4/8/5K2/7R w - - 2 2",
    expects: [{ moves: ["h1h4"], reply: "d4e5", next: "n3", feedback: "volta ao roteiro" }],
    winningMoves: [],
  };
  assert.equal(respostasDe(guided.nodes.n1.expects[0]).length, 2);

  const primeira = jogar(lesson, guided, "guided", 1);
  const segunda = jogar(lesson, guided, "guided", 2);
  assert.notDeepEqual(primeira, segunda, "as duas tentativas jogaram a mesma defesa");
  // As duas transpõem para n3 e acabam no mesmo mate: a aula é outra no
  // caminho, não no destino.
  assert.equal(primeira[primeira.length - 1], segunda[segunda.length - 1]);
  console.log(
    `  tentativa 1: ${primeira[1]}   tentativa 2: ${segunda[1]}   (mesma aula, outra defesa)`,
  );
});
