import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { adaptarLessonV1 } from "../editor-v2/adaptar-v1.ts";
import { montarPacoteV2 } from "../editor-v2/pacote.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { idsDeAulasV2Ativas, pacoteAtivoDoAluno, pacoteDaPublicacao } from "./conteudo-v2.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

function conteudoComPublicacao() {
  const content = mkdtempSync(path.join(tmpdir(), "conteudo-v2-"));
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  const pasta = path.join(content, "aulas-v2", "N0-LADDER");
  mkdirSync(path.join(pasta, "publicacoes"), { recursive: true });
  const arquivo = path.join(pasta, "publicacoes", `${pacote.publicationId}.json`);
  writeFileSync(arquivo, JSON.stringify(pacote));
  writeFileSync(path.join(pasta, "ativa.json"), JSON.stringify({ publicationId: pacote.publicationId, anterior: null, ativadaEm: "2026-09-13T00:00:00.000Z" }));
  return { content, pacote, arquivo };
}

test("fatia 7: sem ponteiro, a aula não é v2 — e id fora do padrão também não", () => {
  const content = mkdtempSync(path.join(tmpdir(), "conteudo-v2-vazio-"));
  test.after(() => rmSync(content, { recursive: true, force: true }));
  assert.equal(pacoteAtivoDoAluno("N0-LADDER", content), null);
  assert.equal(pacoteAtivoDoAluno("../fora", content), null);
  assert.deepEqual(idsDeAulasV2Ativas(content), []);
});

test("fatia 7: o ponteiro resolve o pacote ativo; uma publicação guardada é lida pelo id", () => {
  const { content, pacote } = conteudoComPublicacao();
  test.after(() => rmSync(content, { recursive: true, force: true }));
  assert.equal(pacoteAtivoDoAluno("N0-LADDER", content)?.publicationId, pacote.publicationId);
  assert.deepEqual(idsDeAulasV2Ativas(content), ["N0-LADDER"]);
  assert.equal(pacoteDaPublicacao("N0-LADDER", pacote.publicationId, content)?.publicationId, pacote.publicationId);
  assert.equal(pacoteDaPublicacao("N0-LADDER", "pub-0000000000000000", content), null, "snapshot ausente: reabrir, nunca julgar contra outro");
});

test("fatia 7: pacote ativo adulterado lança, em vez de cair calado para a aula v1", () => {
  const { content, arquivo } = conteudoComPublicacao();
  test.after(() => rmSync(content, { recursive: true, force: true }));
  writeFileSync(arquivo, readFileSync(arquivo, "utf8").replace("desce para d2.", "desce para d3."));
  assert.throws(() => pacoteAtivoDoAluno("N0-LADDER", content), /não está íntegro/);
});
