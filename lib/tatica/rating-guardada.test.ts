import assert from "node:assert/strict";
import test from "node:test";
import { esquecerResposta, guardarResposta, respostaGuardada, type Armazem } from "./rating-guardada.ts";

function armazem(): Armazem & { itens: Map<string, string> } {
  const itens = new Map<string, string>();
  return {
    itens,
    getItem: (k) => itens.get(k) ?? null,
    setItem: (k, v) => void itens.set(k, v),
    removeItem: (k) => void itens.delete(k),
  };
}

const errada = { puzzleId: "40eM3", lances: ["b5a6"], ondeErrou: { fen: "8/8/8/8/8/8/8/8 w - - 0 1", indice: 1 } };

test("guardada antes de sair, achada no F5 do mesmo problema", () => {
  const a = armazem();
  guardarResposta(a, "aluno-1", errada);
  assert.deepEqual(respostaGuardada(a, "aluno-1", "40eM3"), errada);
  assert.deepEqual(respostaGuardada(a, "aluno-1", "40eM3"), errada, "achar não apaga: só o veredito apaga");
});

test("esquecida quando o servidor julga", () => {
  const a = armazem();
  guardarResposta(a, "aluno-1", errada);
  esquecerResposta(a, "aluno-1");
  assert.equal(respostaGuardada(a, "aluno-1", "40eM3"), null);
});

test("de outro problema: não serve, e é apagada", () => {
  const a = armazem();
  guardarResposta(a, "aluno-1", errada);
  assert.equal(respostaGuardada(a, "aluno-1", "outro"), null);
  assert.equal(a.itens.size, 0);
});

test("de outro aluno no mesmo computador: nunca é enviada", () => {
  const a = armazem();
  guardarResposta(a, "aluno-1", errada);
  assert.equal(respostaGuardada(a, "aluno-2", "40eM3"), null);
  assert.deepEqual(respostaGuardada(a, "aluno-1", "40eM3"), errada, "e a do dono continua lá");
});

test("a linha inteira jogada guarda ondeErrou nulo", () => {
  const a = armazem();
  const inteira = { puzzleId: "abc", lances: ["e2e4", "g1f3"], ondeErrou: null };
  guardarResposta(a, "aluno-1", inteira);
  assert.deepEqual(respostaGuardada(a, "aluno-1", "abc"), inteira);
});

test("lixo no armazém: ignorado e apagado, sem quebrar a tela", () => {
  const a = armazem();
  a.itens.set("tatica-rating:resposta:aluno-1", "{não é json");
  assert.equal(respostaGuardada(a, "aluno-1", "40eM3"), null);
  a.itens.set("tatica-rating:resposta:aluno-1", JSON.stringify({ puzzleId: "40eM3", lances: [1, 2] }));
  assert.equal(respostaGuardada(a, "aluno-1", "40eM3"), null);
  assert.equal(a.itens.size, 0);
});

test("armazém que recusa (aba privada) ou não existe: nada quebra", () => {
  const recusa: Armazem = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
  assert.doesNotThrow(() => guardarResposta(recusa, "aluno-1", errada));
  assert.equal(respostaGuardada(recusa, "aluno-1", "40eM3"), null);
  assert.equal(respostaGuardada(null, "aluno-1", "40eM3"), null);
});
