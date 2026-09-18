import assert from "node:assert/strict";
import test from "node:test";
import type { ProgressoParaONivel } from "@/lib/curso/nivel";
import { trofeuDoNivel } from "./trofeu.ts";

const estadoIrrelevante = {} as ProgressoParaONivel;

test("o nível 1 concluído aguarda a prova sem criar um link pronto", () => {
  assert.deepEqual(trofeuDoNivel(1, 0, 1, estadoIrrelevante), { estado: "aguardando" });
});

test("uma prova disponível continua aparecendo como pronta", () => {
  assert.deepEqual(trofeuDoNivel(2, 1, 2, estadoIrrelevante), { estado: "pronto" });
});
