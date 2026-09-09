import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { goalMovesOf, Tablebase } from "../../scripts/tablebase.ts";
import { derivarTreino, esqueletoDoTreino, type PedirLances } from "./derivar-treino.ts";
import { lessonSchema, positionSchema, type Lesson } from "./schema.ts";

/**
 * **A prova de que a derivação está certa não é um caso que eu invente: é a
 * N1-KPK.**
 *
 * Ela é a única árvore que foi escrita à mão neste projeto — seis nós, seis
 * dicas, seis flechas, quatro blocos de erro, um terminal que promove. Se o
 * gerador a reproduz campo por campo a partir do roteiro dela, ele está certo;
 * se não reproduz, nenhum caso sintético que eu escrevesse serviria de defesa.
 *
 * Os `winningMoves` saem do **cache versionado da tablebase**, e não do próprio
 * arquivo: colhê-los do arquivo faria o teste comparar o arquivo consigo mesmo.
 */

const raiz = process.cwd();

function lerAula(id: string): Lesson {
  return lessonSchema.parse(
    JSON.parse(readFileSync(path.join(raiz, "content/lessons", `${id}.json`), "utf8")),
  );
}

function lerPosicao(nivel: string, id: string) {
  return positionSchema.parse(
    JSON.parse(readFileSync(path.join(raiz, "content/positions", nivel, `${id}.json`), "utf8")),
  );
}

/**
 * A derivação com a tablebase de verdade por trás, em duas passadas: a primeira
 * a seco só para saber **quais** FEN perguntar, a segunda com as respostas na
 * mão. É exatamente o que o gate faz, e por isso é o que o teste faz.
 */
async function derivarComTablebase(lesson: Lesson, posicao: { fen: string; expectedResult: string }) {
  const tablebase = new Tablebase(path.join(raiz, "content/tablebase-cache"), false);
  const seco = derivarTreino(lesson, posicao, () => null);
  assert.ok(seco.tree, "a passada a seco precisa produzir a árvore");
  const objetivo = seco.tree.goal;
  const mapa = new Map<string, string[]>();
  for (const node of Object.values(seco.tree.nodes)) {
    mapa.set(node.fen, goalMovesOf(await tablebase.lookup(node.fen), objetivo));
  }
  const pedir: PedirLances = (fen) => mapa.get(fen) ?? null;
  return derivarTreino(lesson, posicao, pedir);
}

test("a etapa 3 da N1-KPK é derivada do roteiro dela, campo por campo", async () => {
  const lesson = lerAula("N1-KPK");
  const posicao = lerPosicao("N1", "pos-n1-kpk-dlv-1-3");
  const { tree, problemas } = await derivarComTablebase(lesson, posicao);

  assert.deepEqual(problemas, [], "o roteiro da aula piloto não tem problema nenhum");
  assert.ok(tree, "a derivação precisa produzir a árvore");

  // Os números do bloco 1 do plano, cada um dito por extenso.
  assert.deepEqual(Object.keys(tree.nodes), ["n1", "n2", "n3", "n4", "n5", "n6"]);
  assert.equal(tree.root, "n1");
  assert.equal(tree.goal, "win");
  assert.equal(tree.nodes.n6.expects[0].ends, "promotion");
  assert.equal(tree.nodes.n1.expects[0].ends, undefined, "o nó que continua não diz como acaba");

  const doArquivo = lesson.stages.guided;
  assert.ok(doArquivo, "a aula piloto precisa da etapa 3 no arquivo");

  // As seis listas de winningMoves, uma a uma — é a parte que veio da tablebase.
  for (const id of Object.keys(tree.nodes)) {
    assert.deepEqual(
      tree.nodes[id].winningMoves,
      doArquivo.nodes[id].winningMoves,
      `os winningMoves de ${id} não batem`,
    );
  }

  // E o resto do arquivo, campo por campo: a linha, as FEN, os ponteiros entre
  // nós, o desenho, as falas e os erros.
  assert.deepEqual(esqueletoDoTreino(tree), esqueletoDoTreino(doArquivo));
});

test("a derivação lê a vez no tabuleiro, e não a paridade do índice", () => {
  // A N0-MATING-MATERIAL joga de PRETAS, e a posição dela já começa com o preto
  // na vez. Um gerador que assumisse "índice par = aluno" pediria ao aluno os
  // lances do adversário — em silêncio, e só na tela.
  const lesson = lerAula("N0-MATING-MATERIAL");
  const posicao = lerPosicao("N0", "pos-n0-mating-material-silman-38");
  const { tree, problemas } = derivarTreino(lesson, posicao, () => null);
  assert.deepEqual(problemas, []);
  assert.ok(tree);
  assert.equal(tree.goal, "draw", "a posição é empate, e o objetivo da árvore sai dela");
  const primeiro = tree.nodes[tree.root].expects[0].moves[0];
  assert.equal(primeiro.slice(0, 2), "g8", "o primeiro nó é um lance do REI PRETO");
});

test("roteiro que abre com o defensor não vira etapa 3", () => {
  const lesson = lerAula("N1-KPK");
  const posicao = lerPosicao("N1", "pos-n1-kpk-dlv-1-3");
  // A mesma aula com o lado trocado: agora todo lance branco é do adversário.
  const invertida = { ...lesson, orientation: "black" as const };
  const { tree, problemas } = derivarTreino(invertida, posicao, () => null);
  assert.equal(tree, null);
  assert.equal(problemas[0]?.code, "ROTEIRO_COMECA_ERRADO");
});

test("bloco treino em passo que não vira nó é recusado", () => {
  const lesson = lerAula("N1-KPK");
  const posicao = lerPosicao("N1", "pos-n1-kpk-dlv-1-3");
  const objective = lesson.stages.objective;
  assert.ok(objective);
  const roteiro = objective.roteiro.map((p, i) =>
    i === 0 ? { ...p, treino: { dica: "isto nunca seria lido" } } : p,
  );
  const torta: Lesson = {
    ...lesson,
    stages: { ...lesson.stages, objective: { ...objective, roteiro } },
  };
  const { problemas } = derivarTreino(torta, posicao, () => null);
  assert.equal(problemas[0]?.code, "TREINO_SEM_NO");
  assert.equal(problemas[0]?.passo, 0);
});

test("roteiro que termina com o defensor não fecha a etapa 3", () => {
  const lesson = lerAula("N1-KPK");
  const posicao = lerPosicao("N1", "pos-n1-kpk-dlv-1-3");
  const objective = lesson.stages.objective;
  assert.ok(objective);
  // Fora o último passo (b7b8q), a linha passa a acabar no lance do preto.
  const roteiro = objective.roteiro.slice(0, -1);
  const truncada: Lesson = {
    ...lesson,
    stages: { ...lesson.stages, objective: { ...objective, roteiro } },
  };
  const { tree, problemas } = derivarTreino(truncada, posicao, () => null);
  assert.equal(tree, null);
  assert.equal(problemas[0]?.code, "ROTEIRO_NAO_FECHA");
});

test("lance ilegal no roteiro para a derivação onde ele está", () => {
  const lesson = lerAula("N1-KPK");
  const posicao = lerPosicao("N1", "pos-n1-kpk-dlv-1-3");
  const objective = lesson.stages.objective;
  assert.ok(objective);
  const roteiro = objective.roteiro.map((p, i) => (i === 2 ? { ...p, lance: "h1h8" } : p));
  const quebrada: Lesson = {
    ...lesson,
    stages: { ...lesson.stages, objective: { ...objective, roteiro } },
  };
  const { tree, problemas } = derivarTreino(quebrada, posicao, () => null);
  assert.equal(tree, null);
  assert.equal(problemas[0]?.code, "ROTEIRO_ILEGAL");
  assert.equal(problemas[0]?.passo, 2);
});
