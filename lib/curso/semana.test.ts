import assert from "node:assert/strict";
import test from "node:test";
import { semanaDaTela } from "./semana.ts";

test("o aluno recebe a semana de verdade, mesmo pedindo outra", () => {
  // É o teste que guarda a decisão inteira: sem ele, "obedecer ao parâmetro"
  // parece uma simplificação inofensiva, e a URL do professor copiada no grupo
  // do WhatsApp abriria o preparatório para a turma toda.
  for (const pedida of ["2", "3", "4", "1"]) {
    const tela = semanaDaTela("aluno", pedida, 1);
    assert.equal(tela.semana, 1, `o aluno pediu ${pedida} e a tela cedeu`);
    assert.equal(tela.simulando, false);
  }
});

test("o professor vê a semana que pediu, e a tela sabe que está simulando", () => {
  const tela = semanaDaTela("professor", "3", 1);
  assert.deepEqual(tela, { semana: 3, real: 1, simulando: true });
});

test("professor pedindo a semana de hoje não está simulando", () => {
  // A diferença importa na tela: o aviso de "você está vendo outra semana" não
  // pode aparecer quando não há nada de diferente para avisar.
  const tela = semanaDaTela("professor", "2", 2);
  assert.equal(tela.simulando, false);
});

test("pedido fora das quatro semanas cai na semana real", () => {
  // `0`, `5` e `99` são o dedo escorregando na URL; `abc` e o vazio são o link
  // truncado. Nenhum deles pode virar uma semana que não existe, porque
  // `sabadoDaSemana` faria `find` e devolveria `undefined` numa tela que
  // espera um sábado.
  for (const pedida of ["0", "5", "99", "-1", "abc", "", "2,3", "1.5"]) {
    const tela = semanaDaTela("professor", pedida, 2);
    assert.equal(tela.semana, 2, `"${pedida}" virou semana`);
    assert.equal(tela.simulando, false);
  }
});

test("parâmetro repetido na URL não vira semana", () => {
  // `?semana=2&semana=3` chega como array no Next. Escolher um dos dois seria
  // adivinhar qual o professor quis.
  const tela = semanaDaTela("professor", ["2", "3"], 1);
  assert.equal(tela.semana, 1);
});

test("sem parâmetro nenhum, professor e aluno veem a mesma coisa", () => {
  assert.deepEqual(semanaDaTela("professor", undefined, 4), semanaDaTela("aluno", undefined, 4));
});
