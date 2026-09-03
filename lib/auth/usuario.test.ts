import assert from "node:assert/strict";
import test from "node:test";
import {
  DOMINIO,
  emailDoUsuario,
  normalizarUsuario,
  problemaDoPin,
  problemaDoUsuario,
  sortearPin,
  TAMANHO_DO_PIN,
} from "./usuario.ts";

test("o mesmo aluno entra escreva como escrever", () => {
  // O caso que motivou a normalização: o aluno digita o próprio nome com
  // maiúscula na segunda-feira e leva "usuário ou PIN incorreto", sem nenhuma
  // pista do que fez de errado.
  assert.equal(normalizarUsuario("Joao"), "joao");
  assert.equal(normalizarUsuario("  JOAO  "), "joao");
  assert.equal(normalizarUsuario("joao pedro"), "joaopedro");
});

test("acento cai, e é isto que trava o intervalo invisível", () => {
  // `normalizarUsuario` apaga U+0300–U+036F com um intervalo literal, que num
  // editor parece um colchete vazio. Se ele sumir numa cópia, `joão` passa a
  // virar `joo` — o `ã` decomposto perde a base e sobra lixo. Este teste é o
  // que faz esse acidente ficar vermelho.
  assert.equal(normalizarUsuario("João"), "joao");
  assert.equal(normalizarUsuario("Íris"), "iris");
  assert.equal(normalizarUsuario("Gonçalves"), "goncalves");
});

test("o nome de usuário recusado diz o motivo em português", () => {
  assert.equal(problemaDoUsuario("ana"), null);
  assert.match(problemaDoUsuario("an") ?? "", /3 letras/);
  assert.match(problemaDoUsuario("a".repeat(25)) ?? "", /24 letras/);
  assert.match(problemaDoUsuario("2ana") ?? "", /começa por letra/);
});

test("o PIN é seis dígitos, e não cinco nem letra", () => {
  assert.equal(problemaDoPin("123456"), null);
  assert.match(problemaDoPin("12345") ?? "", /6 números/);
  assert.match(problemaDoPin("12345a") ?? "", /só de números/);
});

test("o e-mail sintético sai do usuário já normalizado", () => {
  // A ponte tem de ser uma só. Se a criação da conta normalizasse e a entrada
  // não, o professor cadastraria `João` e o aluno nunca entraria.
  assert.equal(emailDoUsuario("João Pedro"), `joaopedro@${DOMINIO}`);
  assert.equal(emailDoUsuario("joaopedro"), emailDoUsuario("JOAOPEDRO"));
});

test("o PIN sorteado passa na própria régua", () => {
  for (let i = 0; i < 200; i++) {
    const pin = sortearPin();
    assert.equal(pin.length, TAMANHO_DO_PIN);
    assert.equal(problemaDoPin(pin), null, `PIN inválido sorteado: ${pin}`);
  }
});
