import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { semMarcacao } from "./negrito.ts";

test("uma frase sem marcação sai inteira", () => {
  assert.equal(semMarcacao("Conte as peças antes de trocar."), "Conte as peças antes de trocar.");
});

test("o par completo perde os asteriscos, e o resto fica ao redor", () => {
  assert.equal(semMarcacao("é o peão **dele**, não o seu"), "é o peão dele, não o seu");
});

test("dois negritos na mesma frase não se fundem num só", () => {
  // O erro clássico da expressão gulosa: `**a** e **b**` viraria um negrito só,
  // com "a** e **b" dentro — e o miolo com asteriscos chegaria à tela.
  assert.equal(semMarcacao("**dele**, não o **seu**"), "dele, não o seu");
  assert.ok(!semMarcacao("**a** e **b**").includes("*"));
});

test("negrito no começo e no fim não deixa buraco", () => {
  assert.equal(semMarcacao("**tudo**"), "tudo");
  assert.equal(semMarcacao("**a** b"), "a b");
});

test("o que não é par completo passa como texto literal", () => {
  // Uma conta escrita numa dica não pode perder metade dos sinais.
  for (const cru of ["2*3", "abre ** e não fecha", "****", "* item", "2*3**4"]) {
    assert.equal(semMarcacao(cru), cru, `"${cru}" foi alterado`);
  }
});

test("um par completo é par completo mesmo com espaço no miolo", () => {
  // `a ** b ** ` casa a regra — o miolo é " b " — e some, como sempre somiu.
  // Está aqui escrito porque o par com espaço é o caso que se lê como "isso
  // não devia ser negrito" e não é: a gramática só cobra miolo não-vazio.
  assert.equal(semMarcacao("a ** b ** "), "a  b  ");
});

test("string vazia continua string vazia", () => {
  assert.equal(semMarcacao(""), "");
});

test("o conteúdo real dos temas de tática atravessa sem perder caractere", () => {
  /*
   * O teste que amarra a regra ao arquivo. Ele lia as 30 dicas do meio-jogo
   * até 2026-09-08, quando o módulo saiu do site e levou `conteudo.ts` junto.
   *
   * Passou a ler `content/temas.json`, que é o consumidor que restou: os dois
   * degraus da dica em `lib/tatica/fala.ts` chamam `semMarcacao` sobre esses
   * campos. Se um tema novo usar uma marcação que este parser não entende, é
   * aqui que se descobre — e não no balão do professor.
   *
   * Os 36 temas de tática foram escritos sem marcação nenhuma de propósito (o
   * balão pagina texto puro), então a promessa aqui tem duas metades: nada é
   * alterado no caminho, e nada com asterisco chega à tela.
   */
  const bruto = readFileSync(path.join(process.cwd(), "content", "temas.json"), "utf8");
  const temas = JSON.parse(bruto) as {
    explicacao: string[];
    procure: string[];
    cuidado?: string;
  }[];

  const campos: string[] = [];
  for (const tema of temas) {
    campos.push(...tema.explicacao, ...tema.procure);
    if (tema.cuidado) campos.push(tema.cuidado);
  }
  assert.ok(campos.length >= 36 * 6, `só ${campos.length} campos — o conteúdo encolheu?`);

  for (const campo of campos) {
    assert.equal(semMarcacao(campo), campo, `um campo foi alterado: ${campo.slice(0, 60)}…`);
    assert.ok(
      !semMarcacao(campo).includes("**"),
      `sobrou asterisco na tela: ${campo.slice(0, 60)}…`,
    );
  }
});
