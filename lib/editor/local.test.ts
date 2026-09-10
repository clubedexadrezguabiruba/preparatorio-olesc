import assert from "node:assert/strict";
import test from "node:test";
import { editorLigado, motivoDoEditorFechado } from "./local.ts";

/**
 * A tranca de ambiente do editor, cobrada nos quatro ambientes que existem.
 *
 * O editor escreve arquivos do repositório. Se esta função devolver `true` num
 * lugar onde não devia, a consequência não é um erro na tela — é uma tela de
 * edição de conteúdo existindo onde ninguém pediu. Por isso o teste enumera os
 * ambientes em vez de conferir só o caminho feliz: cada `false` aqui é uma
 * porta que continua fechada.
 */

const LIGADO = { NODE_ENV: "development", EDITOR_LOCAL: "1" };

test("na máquina do Doug, com a chave no .env.local, a porta existe", () => {
  assert.equal(editorLigado(LIGADO), true);
  assert.equal(motivoDoEditorFechado(LIGADO), null);
});

test("build de produção não tem editor, nem com a chave ligada", () => {
  assert.equal(editorLigado({ NODE_ENV: "production", EDITOR_LOCAL: "1" }), false);
  assert.match(String(motivoDoEditorFechado({ NODE_ENV: "production", EDITOR_LOCAL: "1" })), /produção|desenvolvimento/);
});

test("na Vercel não tem editor, nem em modo de desenvolvimento com a chave", () => {
  const env = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "1" };
  assert.equal(editorLigado(env), false);
  assert.match(String(motivoDoEditorFechado(env)), /Vercel/);
});

test("`next dev` sem a chave não abre a porta — o caso do agente e do teste", () => {
  assert.equal(editorLigado({ NODE_ENV: "development" }), false);
  assert.equal(editorLigado({ NODE_ENV: "development", EDITOR_LOCAL: "" }), false);
  assert.equal(editorLigado({ NODE_ENV: "development", EDITOR_LOCAL: "0" }), false);
  assert.equal(editorLigado({ NODE_ENV: "development", EDITOR_LOCAL: "true" }), false);
  assert.match(String(motivoDoEditorFechado({ NODE_ENV: "development" })), /EDITOR_LOCAL/);
});

test("ambiente vazio é porta fechada", () => {
  assert.equal(editorLigado({}), false);
});
