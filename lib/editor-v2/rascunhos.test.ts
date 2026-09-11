import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";
import type { AulaV2 } from "./modelo.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const aula: AulaV2 = {
  schemaVersion: 2, id: "N1-KPK", titulo: "Piloto", treinos: [], praticas: [],
  analises: [{ id: "analise-a", inicio: { tipo: "posicao", positionId: "pos-a" }, raizId: "raiz-a", nos: { "raiz-a": { id: "raiz-a", filhos: [] } } }],
  capitulos: [{ id: "capitulo-a", titulo: "Capítulo", analiseId: "analise-a", inicioNodeId: "raiz-a", caminho: [], orientacao: "white", narracoes: [] }],
  fluxo: [{ id: "etapa-a", tipo: "capitulo", entidadeId: "capitulo-a" }],
};

test("v2 grava atomically, recusa hash velho e não escreve com editor desligado", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "editor-v2-"));
  try {
    const primeira = gravarDocumentoV2(aula.id, aula, "hash-do-adaptador", raiz, ligada);
    assert.equal(primeira.ok, true);
    const lida = lerDocumentoV2(aula.id, raiz);
    assert.equal(lida?.aula.titulo, "Piloto");
    const alterada = { ...aula, titulo: "Outro título" };
    const conflito = gravarDocumentoV2(aula.id, alterada, "hash-velho", raiz, ligada);
    assert.equal(conflito.ok, false);
    assert.ok(!conflito.ok && conflito.conflito);
    const desligada = gravarDocumentoV2(aula.id, alterada, lida?.hash ?? null, raiz, {} as NodeJS.ProcessEnv);
    assert.deepEqual(desligada, { ok: false, erro: "o editor local está desligado" });
    assert.equal(lerDocumentoV2(aula.id, raiz)?.aula.titulo, "Piloto");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
