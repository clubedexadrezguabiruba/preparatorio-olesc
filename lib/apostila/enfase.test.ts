import assert from "node:assert/strict";
import test from "node:test";
import { enfase, escaparHtml } from "./enfase.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { temaEscrito } from "../tatica/conteudo.ts";

test("o negrito do conteúdo vira negrito no papel", () => {
  assert.equal(enfase("o lance **obriga**"), "o lance <strong>obriga</strong>");
  assert.equal(enfase("*quase* sempre"), "<em>quase</em> sempre");
});

test("o par duplo ganha do simples", () => {
  assert.equal(enfase("**a**"), "<strong>a</strong>");
});

test("asterisco solto não vira tag aberta", () => {
  assert.equal(enfase("3 * 4 = 12"), "3 * 4 = 12");
  assert.equal(enfase("a*b"), "a*b");
});

test("escapa antes de converter, nunca depois", () => {
  assert.equal(escaparHtml("<b>&"), "&lt;b&gt;&amp;");
  assert.equal(enfase("**<b>**"), "<strong>&lt;b&gt;</strong>");
});

test("o conteúdo que existe hoje atravessa sem sobrar asterisco", () => {
  // A trava de verdade: qualquer parágrafo de tema que o caderno imprima passa
  // por aqui. Um `**` que sobrasse sairia impresso na folha do aluno.
  let conferidos = 0;
  for (const bloco of BLOCOS) {
    for (const { tag } of bloco.temas) {
      const escrito = temaEscrito(tag);
      if (escrito === null) continue;
      for (const linha of [...escrito.explicacao, ...escrito.procure, escrito.cuidado ?? ""]) {
        assert.ok(!enfase(linha).includes("*"), `sobrou asterisco em "${tag}": ${linha}`);
        conferidos += 1;
      }
    }
  }
  assert.ok(conferidos > 20, `só ${conferidos} linhas conferidas — o conteúdo sumiu?`);
});
