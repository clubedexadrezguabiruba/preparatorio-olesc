/**
 * O pacote publicado — plano final §13 e §10, especificação §20.1.
 *
 * O `publicationId` é o nome do snapshot exato que o aluno jogou. Ele precisa de três
 * propriedades, e cada uma tem o seu teste:
 *
 * - **estável**: o mesmo conteúdo dá o mesmo id, mesmo com as chaves em outra ordem — é o
 *   que deixa republicar sem mudança não criar publicação nova;
 * - **sensível**: um byte de conteúdo a mais muda o id;
 * - **verificável**: quem lê o pacote do disco detecta adulteração sem confiar no nome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { montarPacoteV2, problemasDoPacoteV2 } from "./pacote.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const outra = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position, [outra.id]: outra };

/** O mesmo objeto, com as chaves em ordem inversa em todos os níveis. */
function embaralhado<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(embaralhado) as T;
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).reverse().map(([k, v]) => [k, embaralhado(v)])) as T;
  return valor;
}

test("§13: o id da publicação é pub- + 16 hex, estável e indiferente à ordem das chaves", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const a = montarPacoteV2(aula, positions);
  const b = montarPacoteV2(embaralhado(structuredClone(aula)), embaralhado(positions));
  assert.match(a.publicationId, /^pub-[0-9a-f]{16}$/);
  assert.equal(a.publicationId, b.publicationId);
});

test("§13: o pacote embute só as posições que a aula usa", () => {
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  assert.deepEqual(Object.keys(pacote.posicoes), [position.id]);
});

test("§13: um texto diferente muda o id", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const antes = montarPacoteV2(aula, positions).publicationId;
  aula.capitulos[0].narracoes[0].texto += ".";
  assert.notEqual(montarPacoteV2(aula, positions).publicationId, antes);
});

test("§13: o pacote íntegro passa, e um byte adulterado em qualquer parte é detectado", () => {
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  assert.deepEqual(problemasDoPacoteV2(structuredClone(pacote)), []);

  const texto = JSON.stringify(pacote);
  const alvo = "desce para d2.";
  assert.ok(texto.includes(alvo));
  const adulterado = JSON.parse(texto.replace(alvo, "desce para d3."));
  assert.match(problemasDoPacoteV2(adulterado).join(" "), /aula/);

  const posicao = structuredClone(pacote);
  posicao.posicoes[position.id] = { ...posicao.posicoes[position.id], fen: posicao.posicoes[position.id].fen.replace(" 0 1", " 0 2") };
  assert.match(problemasDoPacoteV2(posicao).join(" "), /posição/);

  const nome = { ...structuredClone(pacote), publicationId: "pub-0000000000000000" };
  assert.match(problemasDoPacoteV2(nome).join(" "), /id/);

  const revisao = structuredClone(pacote);
  const [entidade] = Object.keys(revisao.revisoes);
  revisao.revisoes[entidade] = { ...revisao.revisoes[entidade], revisao: `ar_${"0".repeat(64)}` };
  assert.match(problemasDoPacoteV2(revisao).join(" "), /revisão/);

  assert.notDeepEqual(problemasDoPacoteV2({ formato: "outro" }), []);
});

test("§13: aula que usa posição fora do pacote de posições não vira pacote", () => {
  const aula = adaptarLessonV1(lesson, positions);
  assert.throws(() => montarPacoteV2(aula, {}), /pos-n0-ladder-silman-yk7/);
});
