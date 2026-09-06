import assert from "node:assert/strict";
import test from "node:test";
import { filaCompleta, filaDeRevisao, type LinhaDeTentativa } from "./revisao.ts";

/**
 * A fila é uma função das linhas: estes testes montam o histórico à mão e
 * perguntam o que está devido em cada dia. Nada de banco, nada de relógio —
 * `hoje` é um parâmetro.
 *
 * As datas são meio-dia em São Paulo (`T15:00:00Z`) para que o dia da linha
 * seja o dia escrito, sem depender do fuso de quem roda o teste.
 */
function linha(
  puzzle_id: string,
  dia: string,
  acertou: boolean,
  modo = "serie",
  extra: Partial<LinhaDeTentativa> = {},
): LinhaDeTentativa {
  return {
    puzzle_id,
    tema: "fork",
    origem: "fork",
    modo,
    acertou,
    criada_em: `${dia}T15:00:00.000Z`,
    ...extra,
  };
}

const ids = (fila: ReturnType<typeof filaDeRevisao>) => fila.map((i) => i.puzzleId);

test("puzzle errado volta em dois dias, e não antes", () => {
  const linhas = [linha("a", "2026-09-14", false)];
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-14")), []);
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-15")), []);
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-16")), ["a"]);
  assert.equal(filaCompleta(linhas)[0].devidoEm, "2026-09-16");
  assert.equal(filaCompleta(linhas)[0].nivel, 1);
});

test("puzzle nunca errado não entra na fila", () => {
  assert.deepEqual(filaCompleta([linha("a", "2026-09-14", true)]), []);
});

test("acertar na prova no mesmo dia do erro não adianta a fila", () => {
  // O aluno errou na série e acertou o mesmo puzzle na prova meia hora depois.
  // Lembrar de meia hora atrás não é reter o padrão: a revisão continua devida.
  const linhas = [linha("a", "2026-09-14", false), linha("a", "2026-09-14", true, "prova")];
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-16")), ["a"]);
  assert.equal(filaCompleta(linhas)[0].nivel, 1);
});

test("acertar no prazo sobe para 7, depois 14, depois sai", () => {
  const linhas = [
    linha("a", "2026-09-14", false),
    linha("a", "2026-09-16", true, "revisao"), // devido em 16/9: no prazo
  ];
  assert.equal(filaCompleta(linhas)[0].nivel, 2);
  assert.equal(filaCompleta(linhas)[0].devidoEm, "2026-09-23");
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-22")), []);
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-23")), ["a"]);

  linhas.push(linha("a", "2026-09-23", true, "revisao"));
  assert.equal(filaCompleta(linhas)[0].nivel, 3);
  assert.equal(filaCompleta(linhas)[0].devidoEm, "2026-10-07");

  linhas.push(linha("a", "2026-10-07", true, "revisao"));
  assert.deepEqual(filaCompleta(linhas), [], "terceiro acerto no prazo tira da fila");

  // Um acerto depois de sair não ressuscita o puzzle.
  linhas.push(linha("a", "2026-10-09", true, "prova"));
  assert.deepEqual(filaCompleta(linhas), []);
});

test("errar na revisão volta a dois dias, do zero", () => {
  const linhas = [
    linha("a", "2026-09-14", false),
    linha("a", "2026-09-16", true, "revisao"),
    linha("a", "2026-09-23", false, "revisao"),
  ];
  const [item] = filaCompleta(linhas);
  assert.equal(item.nivel, 1);
  assert.equal(item.devidoEm, "2026-09-25");
});

test("revisar atrasado conta a partir do dia da revisão, não do devido", () => {
  const linhas = [
    linha("a", "2026-09-14", false), // devido 16/9
    linha("a", "2026-09-20", true, "revisao"), // quatro dias atrasado
  ];
  assert.equal(filaCompleta(linhas)[0].devidoEm, "2026-09-27");
});

test("a fila sai do mais atrasado para o menos, e por id no empate", () => {
  const linhas = [
    linha("c", "2026-09-14", false),
    linha("a", "2026-09-12", false),
    linha("b", "2026-09-12", false),
    linha("d", "2026-09-15", false),
  ];
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-16")), ["a", "b", "c"]);
  assert.deepEqual(ids(filaDeRevisao(linhas, "2026-09-17")), ["a", "b", "c", "d"]);
});

test("linhas fora de ordem cronológica dão a mesma fila", () => {
  const emOrdem = [linha("a", "2026-09-14", false), linha("a", "2026-09-16", true, "revisao")];
  const aoContrario = [...emOrdem].reverse();
  assert.deepEqual(filaCompleta(aoContrario), filaCompleta(emOrdem));
});

test("o dia da linha é o de Guabiruba", () => {
  // 00:30 UTC de 15/9 é 21:30 de 14/9 em São Paulo: o erro foi no dia 14, e o
  // puzzle volta no 16 — não no 17.
  const linhas = [linha("a", "x", false, "serie", { criada_em: "2026-09-15T00:30:00.000Z" })];
  assert.equal(filaCompleta(linhas)[0].devidoEm, "2026-09-16");
});

test("origem nula usa o tema, e a origem da prova é preservada", () => {
  const antiga = [linha("a", "2026-09-14", false, "serie", { origem: null, tema: "pin" })];
  assert.equal(filaCompleta(antiga)[0].origem, "pin");

  const daProva = [linha("b", "2026-09-14", false, "prova", { origem: "fork", tema: "pin" })];
  assert.equal(filaCompleta(daProva)[0].origem, "fork");
  assert.equal(filaCompleta(daProva)[0].tema, "pin");
});
