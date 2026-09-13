import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2 } from "./modelo.ts";
import { guardarSnapshotAntesDeMigrarV1, prepararMigracaoV1 } from "./migrar-v1.ts";

const ARQUIVO_V1 = "content/lessons/N0-LADDER.json";
const textoV1 = readFileSync(ARQUIVO_V1, "utf8");
const lesson = lessonSchema.parse(JSON.parse(textoV1));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const sha = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

test("§20.3: a N0-LADDER adaptada pode ser convertida, com 0 divergências e os ids contados", () => {
  const preparo = prepararMigracaoV1(lesson, textoV1, positions, adaptarLessonV1(lesson, positions));
  assert.equal(preparo.podeConverter, true, preparo.motivo ?? "");
  assert.deepEqual(preparo.divergencias, []);
  assert.equal(preparo.hashV1, sha(textoV1));
  assert.deepEqual(preparo.ids, { analises: 1, nos: 10, capitulos: 1, narracoes: 13, treinos: 1, questoes: 5, praticas: 1, etapas: 4 });
});

test("§20.3: converter é um comando com Desfazer e Refazer, e não converte duas vezes", () => {
  const aula = adaptarLessonV1(lesson, positions);
  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "CONVERTER_V1", convertidaEm: "2026-09-13T18:00:00.000Z" }, positions));
  assert.equal(historico.presente.origem?.convertidaEm, "2026-09-13T18:00:00.000Z");
  assert.equal(validarAulaV2(historico.presente, positions).ok, true);
  assert.equal(prepararMigracaoV1(lesson, textoV1, positions, historico.presente).podeConverter, false);
  assert.equal(executarComando(historico.presente, { tipo: "CONVERTER_V1", convertidaEm: "outra-data" }, positions), historico.presente, "já convertida: nada muda e nada entra no histórico");
  historico = desfazer(historico);
  assert.equal(historico.presente.origem?.convertidaEm, undefined);
  historico = refazer(historico);
  assert.equal(historico.presente.origem?.convertidaEm, "2026-09-13T18:00:00.000Z");
  assert.throws(() => executarComando({ ...aula, origem: undefined }, { tipo: "CONVERTER_V1", convertidaEm: "x" }, positions), /não veio do formato antigo/);
});

test("§14: o snapshot antes de migrar guarda o arquivo v1 inteiro, e o arquivo v1 não muda um byte", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "migrar-v1-"));
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const antes = sha(readFileSync(ARQUIVO_V1, "utf8"));
  const aula = adaptarLessonV1(lesson, positions);
  const guardado = guardarSnapshotAntesDeMigrarV1("N0-LADDER", textoV1, aula, raiz);
  assert.equal(guardado.ok, true);
  const pasta = path.join(raiz, ".editor", "v2", "snapshots", "N0-LADDER");
  const [arquivo] = readdirSync(pasta);
  assert.match(arquivo, /antes-de-migrar/);
  const snapshot = JSON.parse(readFileSync(path.join(pasta, arquivo), "utf8"));
  assert.equal(snapshot.textoV1, textoV1);
  assert.equal(snapshot.hashV1, antes);
  assert.equal(sha(readFileSync(ARQUIVO_V1, "utf8")), antes);
});
