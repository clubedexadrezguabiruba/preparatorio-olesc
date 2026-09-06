import assert from "node:assert/strict";
import test from "node:test";
import type { Puzzle } from "./puzzles.ts";
import {
  candidatosDeAquecimento,
  emOrdemDeRating,
  etapaAtual,
  idsErradosParaAProva,
  METAS,
  misturar,
  quantosFaltam,
  semRepetidos,
  sortear,
  vagasParaErrados,
} from "./serie.ts";

/** Cem puzzles de mentira: só o `id` e o `rating` importam para o sorteio. */
function banco(quantos: number, curtos = false): Puzzle[] {
  return Array.from({ length: quantos }, (_, i) => ({
    id: `p${i}`,
    fen: "8/8/8/8/8/8/8/K6k w - - 0 1",
    lances: ["a1a2", "h1h2"],
    rating: 600 + i,
    temas: curtos && i % 2 === 0 ? ["fork", "oneMove"] : ["fork"],
  }));
}

const ids = (ps: readonly Puzzle[]) => ps.map((p) => p.id);

test("o mesmo aluno recarregando a página vê a mesma série", () => {
  // É a diferença entre sorteio determinístico e aleatório, e ela decide se o
  // progresso conta alguma coisa: com `Math.random`, um F5 no meio da série
  // trocaria os 24 puzzles e as 24 tentativas não seriam de nada.
  const b = banco(100);
  assert.deepEqual(ids(sortear(b, 24, "aluno-1", new Set())), ids(sortear(b, 24, "aluno-1", new Set())));
});

test("dois alunos lado a lado veem séries diferentes", () => {
  const b = banco(100);
  const um = new Set(ids(sortear(b, 24, "aluno-1", new Set())));
  const outro = ids(sortear(b, 24, "aluno-2", new Set()));
  const repetidos = outro.filter((id) => um.has(id)).length;
  // Vinte e quatro de cem, duas vezes: a interseção esperada é ~6. Exigir
  // diferença exata seria testar o hash; o que importa é não ser a mesma lista.
  assert.ok(repetidos < 24, `as duas séries coincidiram inteiras (${repetidos})`);
});

test("o que o aluno já viu não volta", () => {
  const b = banco(100);
  const primeira = sortear(b, 24, "aluno-1", new Set());
  const vistos = new Set(ids(primeira));
  const segunda = sortear(b, 24, "aluno-1", vistos);
  assert.equal(segunda.length, 24);
  assert.equal(ids(segunda).filter((id) => vistos.has(id)).length, 0);
});

test("banco no fim: repete em vez de servir série curta", () => {
  // Com 2.000 por faixa isto é o ano que vem, mas o modo de falha sem o
  // segundo braço seria feio: uma série de 3 puzzles, sem explicação na tela.
  const b = banco(10);
  const quaseTudo = new Set(ids(b).slice(0, 9));
  assert.equal(sortear(b, 5, "aluno-1", quaseTudo).length, 5);
});

test("a série sobe de dificuldade", () => {
  const fora = [banco(3)[2], banco(3)[0], banco(3)[1]];
  assert.deepEqual(
    emOrdemDeRating(fora).map((p) => p.rating),
    [600, 601, 602],
  );
});

test("a prova sai fora de ordem, e a mesma ordem para o mesmo aluno", () => {
  // Fora de ordem de propósito: reconhecer o motivo sem saber o nome é o que
  // acontece na partida. Dez garfos em rating crescente treinam outra coisa.
  const b = banco(10);
  const mistura = misturar(b, "aluno-1");
  assert.deepEqual(ids(mistura), ids(misturar(b, "aluno-1")));
  assert.notDeepEqual(ids(mistura), ids(b));
});

test("o aquecimento prefere os de um lance só", () => {
  const comCurtos = candidatosDeAquecimento(banco(20, true));
  assert.ok(comCurtos.every((p) => p.temas.includes("oneMove")));
  // Num tema onde nada é de um lance — `mateIn3` nunca é —, a faixa inteira
  // serve, e o aquecimento vira "os mais fáceis que existem aqui".
  const semCurtos = candidatosDeAquecimento(banco(20, false));
  assert.equal(semCurtos.length, 20);
});

test("os errados da série voltam na prova, e só até ela", () => {
  // A promessa da tela: "os que você errou voltam misturados na prova". O que
  // conta é erro no aquecimento ou na série; acerto não volta, e o errado que
  // já foi à prova (F5 no meio dela) não entra de novo.
  const linhas = [
    { puzzle_id: "a", modo: "aquecimento", acertou: false },
    { puzzle_id: "b", modo: "serie", acertou: true },
    { puzzle_id: "c", modo: "serie", acertou: false },
    { puzzle_id: "d", modo: "serie", acertou: false },
    { puzzle_id: "d", modo: "prova", acertou: false },
    { puzzle_id: "e", modo: "revisao", acertou: false },
  ];
  assert.deepEqual(idsErradosParaAProva(linhas), ["a", "c"]);
});

test("os errados ocupam no máximo metade da prova", () => {
  assert.equal(vagasParaErrados(10, 7), 5);
  assert.equal(vagasParaErrados(3, 7), 2);
  assert.equal(vagasParaErrados(10, 1), 1);
  assert.equal(vagasParaErrados(10, 0), 0);
});

test("sem repetidos mantém a primeira ocorrência", () => {
  const b = banco(3);
  assert.deepEqual(ids(semRepetidos([b[0], b[1], b[0], b[2], b[1]])), ["p0", "p1", "p2"]);
});

test("a etapa anda sozinha, e o tema acaba", () => {
  assert.equal(etapaAtual({ aquecimento: 0, serie: 0, prova: 0 }), "aquecimento");
  assert.equal(etapaAtual({ aquecimento: METAS.aquecimento, serie: 3, prova: 0 }), "serie");
  assert.equal(
    etapaAtual({ aquecimento: METAS.aquecimento, serie: METAS.serie, prova: 0 }),
    "prova",
  );
  assert.equal(
    etapaAtual({ aquecimento: METAS.aquecimento, serie: METAS.serie, prova: METAS.prova }),
    null,
  );
  // O aluno que fez mais que a meta — duas sessões no mesmo dia — não volta
  // para a etapa anterior.
  assert.equal(quantosFaltam("serie", { aquecimento: 9, serie: 30, prova: 0 }), 0);
});
