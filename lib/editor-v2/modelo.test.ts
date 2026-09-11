import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { quadroDoNo } from "./arvore.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { problemasDaAulaV2, validarAulaV2 } from "./modelo.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

test("a N1-KPK vira um capítulo explícito sem tocar no arquivo v1", () => {
  const antes = readFileSync("content/lessons/N1-KPK.json", "utf8");
  const aula = adaptarLessonV1(lesson, positions);
  assert.equal(aula.schemaVersion, 2);
  assert.equal(aula.capitulos.length, 1);
  assert.equal(aula.capitulos[0].narracoes.length, 13);
  assert.equal(aula.capitulos[0].caminho.length, 11);
  assert.deepEqual(validarAulaV2(aula), { ok: true, aula });
  assert.equal(readFileSync("content/lessons/N1-KPK.json", "utf8"), antes);
});

test("cada nó do piloto reconstrói a posição e o último promove em b8", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const fim = capitulo.caminho.at(-1)!;
  const quadro = quadroDoNo(aula, capitulo.analiseId, fim, positions);
  assert.equal(quadro.san, "b8=Q");
  assert.match(quadro.fen, /1Q6/);
});

test("o contrato acusa filho ausente e ciclo", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  analise.nos[analise.raizId].filhos.push("node-ausente");
  const fim = aula.capitulos[0].caminho.at(-1)!;
  analise.nos[fim].filhos.push(analise.raizId);
  const codigos = problemasDaAulaV2(aula).map((p) => p.codigo);
  assert.ok(codigos.includes("FILHO_AUSENTE"));
  assert.ok(codigos.includes("CICLO_NA_ARVORE"));
});

test("editar comentário e NAG é transacional e desfaz/refaz", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const nodeId = capitulo.caminho[0];
  let h = iniciarHistorico(aula);
  h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "EDITAR_COMENTARIO", analiseId: capitulo.analiseId, nodeId, comentario: "O rei abre o caminho." }, positions));
  h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "ALTERNAR_NAG", analiseId: capitulo.analiseId, nodeId, nag: 1 }, positions));
  assert.equal(h.presente.analises[0].nos[nodeId].comentario, "O rei abre o caminho.");
  assert.deepEqual(h.presente.analises[0].nos[nodeId].nags, [1]);
  h = desfazer(h);
  assert.equal(h.presente.analises[0].nos[nodeId].nags, undefined);
  h = refazer(h);
  assert.deepEqual(h.presente.analises[0].nos[nodeId].nags, [1]);
});

test("lance divergente vira variante, e promover não troca a identidade", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const raiz = aula.analises[0].raizId;
  const comVariante = executarComando(aula, { tipo: "ADICIONAR_LANCE", analiseId: capitulo.analiseId, nodeId: raiz, uci: "c6b6", novoNodeId: "node-variante-teste" }, positions);
  assert.equal(comVariante.analises[0].nos[raiz].filhos.at(-1), "node-variante-teste");
  const promovida = executarComando(comVariante, { tipo: "PROMOVER_VARIANTE", analiseId: capitulo.analiseId, parentId: raiz, nodeId: "node-variante-teste" }, positions);
  assert.equal(promovida.analises[0].nos[raiz].filhos[0], "node-variante-teste");
  assert.ok(promovida.analises[0].nos["node-variante-teste"]);
});
