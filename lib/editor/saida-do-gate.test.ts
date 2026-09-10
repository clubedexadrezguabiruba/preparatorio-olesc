import assert from "node:assert/strict";
import test from "node:test";
import { aulaDoOnde, diagramaDoOnde, lerJsonl, lerPassada } from "./saida-do-gate.ts";

/**
 * O leitor do gate, cobrado contra a saída de verdade.
 *
 * O caso perigoso não é o JSON malformado — é o **silêncio**: um gate que morre
 * sem dizer nada não pode ser lido como "verde", porque o botão "Publicar no
 * curso" só acende com verde. Metade destes testes é sobre isso.
 */

const VERDE = [
  "",
  "Conteúdo conferido em content",
  '{"tipo":"progresso","texto":"derivando a etapa 3 de 3 aula(s)"}',
  "  posições: 18   aulas: 3   obras: 27 (13 com teto)",
  '{"tipo":"resumo","posicoes":18,"aulas":3,"tablebase":{"consultadas":38,"doCache":35,"pelaRede":3},"rascunhos":{"aulas":1,"posicoes":0},"promovidos":[],"problemas":0}',
  "[32m✔ tudo verde[0m",
  '{"tipo":"fim","exit":0}',
].join("\n");

test("a saída humana no meio do caminho não atrapalha o leitor", () => {
  const p = lerPassada(VERDE, 0);
  assert.equal(p.verde, true);
  assert.equal(p.exit, 0);
  assert.deepEqual(p.problemas, []);
  assert.deepEqual(p.progresso, ["derivando a etapa 3 de 3 aula(s)"]);
  assert.equal(p.resumo?.tablebase.pelaRede, 3);
  assert.equal(p.resumo?.rascunhos?.aulas, 1);
});

test("problema carrega o código, o lugar e a aula deduzida", () => {
  const saida = [
    '{"tipo":"problema","code":"LANCE_ILEGAL","onde":"N1-KPK / guided / n3","message":"c6c7 não é legal"}',
    '{"tipo":"problema","code":"FEN_ILEGAL","onde":"posição pos-n1-kpk-dlv-1-3","message":"reis adjacentes"}',
    '{"tipo":"fim","exit":1}',
  ].join("\n");
  const p = lerPassada(saida, 1);
  assert.equal(p.verde, false);
  assert.equal(p.problemas.length, 2);
  assert.equal(p.problemas[0].aula, "N1-KPK");
  assert.equal(p.problemas[0].code, "LANCE_ILEGAL");
  assert.equal(p.problemas[1].aula, null, "posição não é aula");
});

test("gate que morre sem dizer nada não é verde", () => {
  const p = lerPassada("Error: ENOENT\n    at Object.<anonymous>\n", 1);
  assert.equal(p.verde, false);
  assert.equal(p.exit, 1);
});

test("cano vazio e sem código de saída também não é verde", () => {
  assert.equal(lerPassada("", null).verde, false);
});

test("exit 0 no processo mas problema no cano não é verde", () => {
  // Se isto acontecer é bug do gate — e o editor recusa em vez de publicar.
  const saida = '{"tipo":"problema","code":"X","onde":"aula N1-KPK","message":"m"}\n{"tipo":"fim","exit":0}';
  assert.equal(lerPassada(saida, 0).verde, false);
});

test("erro de argumento chega como problema, com exit 2", () => {
  const saida = [
    '{"tipo":"problema","code":"FLAG_DESCONHECIDA","onde":"argumentos","message":"--rascunho não existe"}',
    '{"tipo":"fim","exit":2}',
  ].join("\n");
  const p = lerPassada(saida, 2);
  assert.equal(p.exit, 2);
  assert.equal(p.verde, false);
  assert.equal(p.problemas[0].onde, "argumentos");
  assert.equal(p.problemas[0].aula, null);
});

test("linha quebrada no meio do cano é ignorada, não derruba a leitura", () => {
  const saida = [
    '{"tipo":"progresso","texto":"indo"}',
    '{"tipo":"fim","exit":0',
    "[",
    "null",
    '{"semTipo":1}',
    '{"tipo":"desconhecido"}',
    '{"tipo":"fim","exit":0}',
  ].join("\n");
  const eventos = lerJsonl(saida);
  assert.deepEqual(
    eventos.map((e) => e.tipo),
    ["progresso", "fim"],
  );
});

test("aulaDoOnde acha o id nos cinco formatos que o gate usa", () => {
  assert.equal(aulaDoOnde("aula N1-KPK"), "N1-KPK");
  assert.equal(aulaDoOnde("N0-MATING-MATERIAL / guided"), "N0-MATING-MATERIAL");
  assert.equal(aulaDoOnde("N1-KPK / guided / n3"), "N1-KPK");
  assert.equal(aulaDoOnde("content/lessons/N0-LADDER.json"), "N0-LADDER");
  assert.equal(aulaDoOnde("posição pos-n1-kpk-dlv-1-3"), null);
  assert.equal(aulaDoOnde("argumentos"), null);
  assert.equal(aulaDoOnde("classe D"), null);
});

test("campo de tipo errado não vira NaN nem undefined na tela", () => {
  const saida = '{"tipo":"resumo","posicoes":"muitas","tablebase":null,"promovidos":"não"}';
  const [e] = lerJsonl(saida);
  assert.equal(e.tipo, "resumo");
  if (e.tipo !== "resumo") return;
  assert.equal(e.posicoes, 0);
  assert.equal(e.tablebase.consultadas, 0);
  assert.deepEqual(e.promovidos, []);
});

test("o problema aponta o diagrama, nos dois formatos que o gate escreve", () => {
  assert.deepEqual(diagramaDoOnde("aula N1-KPK / treino / roteiro[3]"), {
    etapa: "objective",
    indice: 3,
  });
  assert.deepEqual(diagramaDoOnde("aula N1-KPK / intro / passos[0]"), {
    etapa: "intro",
    indice: 0,
  });
  assert.equal(diagramaDoOnde("aula N1-KPK / guided / n3"), null);
  assert.equal(diagramaDoOnde("posição pos-n1-kpk-dlv-1-3"), null);
});
