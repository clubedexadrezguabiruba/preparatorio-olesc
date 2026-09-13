/**
 * As sobras da fatia 7 fechadas na 8F: o título da aula editável (D12) e a lista de
 * publicações que mostra a ativa e a anterior primeiro (D11).
 */
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua } from "../lesson/voz.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { conferirAulaV2 } from "./gate.ts";
import { publicacoesDaAulaV2, publicarAulaV2, reativarPublicacaoV2 } from "./publicar.ts";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const ARQUIVO_DA_POSICAO = "content/positions/N0/pos-n0-ladder-silman-yk7.json";
const position = positionSchema.parse(JSON.parse(readFileSync(ARQUIVO_DA_POSICAO, "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const ID = "N0-LADDER";

test("D12: renomear a aula entra no Desfazer, e título vazio ou igual não apaga nem empilha", () => {
  const aula = adaptarLessonV1(lesson, positions);
  let historico = iniciarHistorico(aula);
  const aplicar = (titulo: string) => { historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "RENOMEAR_AULA", titulo }, positions)); };

  aplicar("  Mate da escada, revisto  ");
  assert.equal(historico.presente.titulo, "Mate da escada, revisto");
  assert.equal(historico.passados.length, 1);

  aplicar("   ");
  aplicar("Mate da escada, revisto");
  assert.equal(historico.presente.titulo, "Mate da escada, revisto", "vazio não apaga");
  assert.equal(historico.passados.length, 1, "vazio e igual não entram no histórico");

  historico = desfazer(historico);
  assert.equal(historico.presente.titulo, aula.titulo);
  historico = refazer(historico);
  assert.equal(historico.presente.titulo, "Mate da escada, revisto");
});

test("D11: a lista traz a ativa e a anterior primeiro; reativar devolve a anterior e a lista acompanha", async () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "publicacoes-v2-"));
  try {
    mkdirSync(path.join(raiz, "content", "positions", "N0"), { recursive: true });
    cpSync(ARQUIVO_DA_POSICAO, path.join(raiz, ARQUIVO_DA_POSICAO));
    cpSync("content/tablebase-cache", path.join(raiz, "content", "tablebase-cache"), { recursive: true });
    const regua = lerRegua();
    assert.equal((await conferirAulaV2(ID, { raiz, env: ligada, rede: false, regua, documentoInicial: adaptarLessonV1(lesson, positions) })).verde, true);
    const a = await publicarAulaV2(ID, { raiz, env: ligada });

    const documento = lerDocumentoV2(ID, raiz)!;
    const renomeada = executarComando(documento.aula, { tipo: "RENOMEAR_AULA", titulo: "Segunda publicação" }, positions);
    assert.equal(gravarDocumentoV2(ID, renomeada, documento.hash, raiz, ligada).ok, true);
    assert.equal((await conferirAulaV2(ID, { raiz, env: ligada, rede: false, regua })).verde, true);
    const b = await publicarAulaV2(ID, { raiz, env: ligada });
    assert.ok(a.ok && b.ok);

    const lista = publicacoesDaAulaV2(ID, raiz);
    assert.deepEqual(lista.map((p) => [p.publicationId, p.ativa, p.anterior, p.titulo]), [
      [b.publicationId, true, false, "Segunda publicação"],
      [a.publicationId, false, true, lesson.title],
    ]);

    assert.deepEqual(reativarPublicacaoV2(ID, a.publicationId, { raiz, env: ligada }), { ok: true });
    const depois = publicacoesDaAulaV2(ID, raiz);
    assert.deepEqual(depois.map((p) => [p.publicationId, p.ativa, p.anterior]), [
      [a.publicationId, true, false],
      [b.publicationId, false, true],
    ]);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
