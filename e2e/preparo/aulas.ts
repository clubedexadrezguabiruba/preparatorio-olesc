/** As aulas de ensaio que nascem vazias no disco (sem passar por "Nova aula", que tem ensaio próprio). */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./protecao.ts";

export const FIXTURE_DO_ESTUDO = path.join(RAIZ, "e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn");

export function criarAulaVazia(id: string, titulo: string) {
  writeFileSync(path.join(RAIZ, ".editor/v2", `${id}.json`), JSON.stringify({
    schemaVersion: 2, id, titulo,
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  }, null, 2) + "\n");
}
