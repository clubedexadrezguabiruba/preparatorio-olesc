import assert from "node:assert/strict";
import test from "node:test";
import { DICAS } from "../meiojogo/conteudo.ts";
import { emPedacos, semMarcacao } from "./negrito.ts";

const junto = (entrada: string) =>
  emPedacos(entrada)
    .map((p) => (p.forte ? `**${p.texto}**` : p.texto))
    .join("");

test("uma frase sem marcação sai inteira, num pedaço só", () => {
  const p = emPedacos("Conte as peças antes de trocar.");
  assert.deepEqual(p, [{ texto: "Conte as peças antes de trocar.", forte: false }]);
});

test("o par completo vira negrito, e o resto fica ao redor", () => {
  assert.deepEqual(emPedacos("é o peão **dele**, não o seu"), [
    { texto: "é o peão ", forte: false },
    { texto: "dele", forte: true },
    { texto: ", não o seu", forte: false },
  ]);
});

test("dois negritos na mesma frase não se fundem num só", () => {
  // O erro clássico da expressão gulosa: `**a** e **b**` viraria um negrito só,
  // com "a** e **b" dentro.
  assert.deepEqual(emPedacos("**dele**, não o **seu**"), [
    { texto: "dele", forte: true },
    { texto: ", não o ", forte: false },
    { texto: "seu", forte: true },
  ]);
});

test("negrito no começo e no fim não deixa pedaço vazio", () => {
  assert.deepEqual(emPedacos("**tudo**"), [{ texto: "tudo", forte: true }]);
  assert.ok(emPedacos("**a** b").every((p) => p.texto.length > 0));
});

test("o que não é par completo passa como texto literal", () => {
  // Uma conta escrita numa dica não pode perder metade dos sinais.
  for (const cru of ["2*3", "abre ** e não fecha", "****", "* item", "a ** b ** "]) {
    assert.equal(junto(cru), cru, `"${cru}" foi alterado`);
    if (cru === "****") assert.deepEqual(emPedacos(cru), [{ texto: "****", forte: false }]);
  }
});

test("string vazia devolve um pedaço vazio, e não uma lista vazia", () => {
  // Quem chama mapeia a lista direto no JSX; uma lista vazia sumiria com o
  // parágrafo em vez de desenhá-lo em branco.
  assert.deepEqual(emPedacos(""), [{ texto: "", forte: false }]);
});

test("nada se perde: remontar os pedaços devolve a entrada", () => {
  const amostras = [
    "sem marca nenhuma",
    "**tudo em negrito**",
    "meio **negrito** meio não",
    "**a**, **b** e **c**",
    "asterisco solto * no meio",
    "",
  ];
  for (const a of amostras) assert.equal(junto(a), a);
});

test("`semMarcacao` devolve a frase legível, sem asterisco", () => {
  assert.equal(semMarcacao("o peão **dele**"), "o peão dele");
  assert.equal(semMarcacao("2*3"), "2*3");
});

test("o conteúdo real do meio-jogo atravessa sem perder caractere", () => {
  // O teste que amarra a regra ao arquivo: se uma dica nova usar uma marcação
  // que este parser não entende, é aqui que se descobre — e não na tela.
  const campos: string[] = [];
  for (const dica of DICAS) {
    campos.push(...dica.explicacao, dica.quiz.porque);
    if (dica.cuidado) campos.push(dica.cuidado);
  }
  assert.ok(campos.length >= 30);

  const comNegrito = campos.filter((c) => c.includes("**"));
  assert.ok(comNegrito.length > 0, "o conteúdo perdeu o negrito — reveja este teste");

  for (const campo of campos) {
    assert.equal(junto(campo), campo, `um campo foi alterado: ${campo.slice(0, 60)}…`);
    assert.ok(
      !semMarcacao(campo).includes("**"),
      `sobrou asterisco na tela: ${campo.slice(0, 60)}…`,
    );
  }
});
