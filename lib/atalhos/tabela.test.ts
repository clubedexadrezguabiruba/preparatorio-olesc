import assert from "node:assert/strict";
import test from "node:test";
import { criarDespachante } from "./registro.ts";
import { ATALHOS, conflitosDaTabela, nomeDaTecla, teclaDoEvento } from "./tabela.ts";

test("a tabela não repete tecla no mesmo escopo, e o x e o ? do tabuleiro não colidem com nada", () => {
  assert.deepEqual(conflitosDaTabela(), []);
  assert.deepEqual(conflitosDaTabela([...ATALHOS, { id: "outro-l", teclas: ["l"], escopo: "editor", descricao: "x" }]), ['editor:l está em "motor" e em "outro-l"']);
  assert.equal(new Set(ATALHOS.map((a) => a.id)).size, ATALHOS.length, "ids únicos");
});

test("a tecla do evento na forma da tabela", () => {
  assert.equal(teclaDoEvento({ key: "X" }), "x");
  assert.equal(teclaDoEvento({ key: "?", shiftKey: true }), "?");
  assert.equal(teclaDoEvento({ key: "Z", ctrlKey: true, shiftKey: true }), "Control+Shift+z");
  assert.equal(teclaDoEvento({ key: "ArrowLeft" }), "ArrowLeft");
  assert.equal(nomeDaTecla("Control+Shift+z"), "Ctrl+Shift+Z");
  assert.equal(nomeDaTecla(" "), "Espaço");
});

test("despachante: campo de texto engole; janela emudece o que está atrás; Esc vale no campo", () => {
  const d = criarDespachante();
  const feitos: string[] = [];
  d.registrar("motor", () => { feitos.push("motor"); });
  d.registrar("virar-tabuleiro", () => { feitos.push("virar"); });
  assert.equal(d.despachar({ key: "l" }), "motor");
  assert.equal(d.despachar({ key: "l", target: { tagName: "TEXTAREA" } }), null, "digitando 'l' num comentário não liga o motor");
  assert.equal(d.despachar({ key: "l", ctrlKey: true }), null);

  // O menu ••• abre como janela: o L atrás dele fica mudo (registrado na fatia 9).
  const menu = d.empilharJanela();
  let fechou = false;
  const tirar = d.registrar("fechar-janela", () => { fechou = true; }, { camada: menu.camada });
  assert.equal(d.despachar({ key: "l" }), null);
  assert.equal(d.despachar({ key: "Escape", target: { tagName: "INPUT" } }), "fechar-janela");
  assert.ok(fechou);
  tirar();
  menu.sair();
  assert.equal(d.despachar({ key: "x" }), "virar-tabuleiro");
  assert.deepEqual(feitos, ["motor", "virar"]);
});
