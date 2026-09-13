/**
 * O Conferir do v2 em disco — §19.3 e plano §8 e §13.
 *
 * Numa pasta temporária com a posição da N0-LADDER e o cache da tablebase, sem rede: prova
 * que a passada A só mexe na certificação (inclusive num treino personalizado), que o verde
 * fica preso ao manifesto, e que mudar a posição ou a aula depois de conferir apaga o
 * Publicar.
 */
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua } from "../lesson/voz.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { conferirAulaV2, podePublicarV2, semCertificacao as semCertificacaoDoGate, ultimaConferenciaV2 } from "./gate.ts";
import { jsonCanonico } from "./hash.ts";
import type { AulaV2 } from "./modelo.ts";
import { comCopiaMaterializada } from "./propriedade-treino.ts";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const ARQUIVO_DA_POSICAO = "content/positions/N0/pos-n0-ladder-silman-yk7.json";
const position = positionSchema.parse(JSON.parse(readFileSync(ARQUIVO_DA_POSICAO, "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const regua = lerRegua();

function pastaDeEnsaio(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), "gate-v2-"));
  mkdirSync(path.join(raiz, "content", "positions", "N0"), { recursive: true });
  cpSync(ARQUIVO_DA_POSICAO, path.join(raiz, ARQUIVO_DA_POSICAO));
  cpSync("content/tablebase-cache", path.join(raiz, "content", "tablebase-cache"), { recursive: true });
  return raiz;
}

const semCertificacao = (aula: AulaV2) => jsonCanonico(semCertificacaoDoGate(aula));

test("§19.3: conferir renova a certificação herdada, fica verde e acende o Publicar", async () => {
  const raiz = pastaDeEnsaio();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const adaptada = adaptarLessonV1(lesson, positions);
  const conferencia = await conferirAulaV2("N0-LADDER", { raiz, env: ligada, rede: false, regua, documentoInicial: adaptada });
  assert.equal(conferencia.impedimento, undefined);
  assert.equal(conferencia.verde, true, conferencia.problemas.map((p) => `${p.codigo} ${p.mensagem}`).join(" | "));
  assert.equal(conferencia.certificacoesRenovadas, 1);
  assert.equal(conferencia.tablebase.pelaRede, 0);
  assert.match(conferencia.manifestoHash ?? "", /^[0-9a-f]{64}$/);
  const emDisco = lerDocumentoV2("N0-LADDER", raiz)!.aula;
  assert.equal(emDisco.treinos[0].certificacao?.estado, "confirmada");
  assert.equal(semCertificacao(emDisco), semCertificacao(adaptada), "só a certificação mudou");
  assert.deepEqual(await podePublicarV2("N0-LADDER", raiz), { pode: true, motivo: null, manifestoHash: conferencia.manifestoHash });
  assert.equal(ultimaConferenciaV2("N0-LADDER", raiz)?.manifestoHash, conferencia.manifestoHash);
});

test("plano §8: treino personalizado sai da conferência com a autoria byte a byte igual", async () => {
  const raiz = pastaDeEnsaio();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const aula = adaptarLessonV1(lesson, positions);
  const treino = comCopiaMaterializada(aula, aula.treinos[0], positions);
  treino.propriedade = "personalizado";
  treino.questoes[0].respostas[0].feedback = "Feedback próprio do professor.";
  treino.questoes[0].dica = "Dica própria do professor.";
  aula.treinos[0] = treino;
  assert.equal(gravarDocumentoV2("N0-LADDER", aula, null, raiz, ligada).ok, true);
  const antes = readFileSync(path.join(raiz, ".editor", "v2", "N0-LADDER.json"), "utf8");

  const conferencia = await conferirAulaV2("N0-LADDER", { raiz, env: ligada, rede: false, regua });
  assert.equal(conferencia.verde, true, conferencia.problemas.map((p) => p.codigo).join(", "));
  const depois = lerDocumentoV2("N0-LADDER", raiz)!.aula;
  // Byte a byte: o JSON do documento sem a certificação, na ordem de chaves em que foi gravado.
  const autoriaAntes = JSON.stringify(semCertificacaoDoGate(JSON.parse(antes) as AulaV2));
  const autoriaDepois = JSON.stringify(semCertificacaoDoGate(depois));
  assert.equal(autoriaDepois, autoriaAntes);
  assert.equal(depois.treinos[0].propriedade, "personalizado");
  assert.equal(depois.treinos[0].certificacao?.estado, "confirmada");
});

test("§13: mudar a posição em content/ ou a aula depois de conferir apaga o Publicar", async () => {
  const raiz = pastaDeEnsaio();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  await conferirAulaV2("N0-LADDER", { raiz, env: ligada, rede: false, regua, documentoInicial: adaptarLessonV1(lesson, positions) });
  assert.equal((await podePublicarV2("N0-LADDER", raiz)).pode, true);

  const arquivo = path.join(raiz, ARQUIVO_DA_POSICAO);
  const original = readFileSync(arquivo, "utf8");
  const mexida = JSON.parse(original);
  mexida.provenance.qaApplied = `${mexida.provenance.qaApplied} (revisto)`;
  writeFileSync(arquivo, JSON.stringify(mexida, null, 2));
  const depoisDaPosicao = await podePublicarV2("N0-LADDER", raiz);
  assert.equal(depoisDaPosicao.pode, false);
  assert.match(depoisDaPosicao.motivo ?? "", /mudou depois da conferência/);

  writeFileSync(arquivo, original);
  assert.equal((await podePublicarV2("N0-LADDER", raiz)).pode, true, "desfeita a mudança, o manifesto volta a ser o julgado");

  const documento = lerDocumentoV2("N0-LADDER", raiz)!;
  assert.equal(gravarDocumentoV2("N0-LADDER", { ...documento.aula, titulo: "Outro título" }, documento.hash, raiz, ligada).ok, true);
  assert.equal((await podePublicarV2("N0-LADDER", raiz)).pode, false);
});

test("§19.3: conferência vermelha não acende o Publicar", async () => {
  const raiz = pastaDeEnsaio();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const aula = adaptarLessonV1(lesson, positions);
  aula.capitulos[0].narracoes[0].revisao = { motivo: "posicao-inicial-trocada" };
  const conferencia = await conferirAulaV2("N0-LADDER", { raiz, env: ligada, rede: false, regua, documentoInicial: aula });
  assert.equal(conferencia.verde, false);
  assert.ok(conferencia.problemas.some((p) => p.codigo === "REVISAO_PENDENTE" && p.severidade === "erro"));
  assert.equal(conferencia.manifestoHash, null);
  assert.equal((await podePublicarV2("N0-LADDER", raiz)).pode, false);
});
