import assert from "node:assert/strict";
import test from "node:test";
import { guardarRespostaDaRodada, esquecerRespostaDaRodada, respostasPendentes } from "./rodada-guardada.ts";

test("F5 sem confirmação conserva a primeira resposta e separa as rodadas", () => {
  const dados = new Map<string, string>();
  const memoria = { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => { dados.set(k, v); }, removeItem: (k: string) => { dados.delete(k); } };
  const resposta = { puzzleId: "a", origem: "fork", lances: ["a1a2"], tempoMs: 1000 };
  guardarRespostaDaRodada(memoria, "rodada-1", resposta);
  guardarRespostaDaRodada(memoria, "rodada-1", { ...resposta, lances: ["b1b2"] });
  assert.deepEqual(respostasPendentes(memoria, "rodada-1"), [resposta]);
  assert.deepEqual(respostasPendentes(memoria, "rodada-2"), []);
  esquecerRespostaDaRodada(memoria, "rodada-1", "a");
  assert.deepEqual(respostasPendentes(memoria, "rodada-1"), []);
});
