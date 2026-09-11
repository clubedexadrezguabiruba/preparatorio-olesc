/**
 * O que dá para provar sem tela da navegação por teclado (§16).
 *
 * A tecla real é teste humano (§19). O que está aqui é a conta: dado o documento e a
 * ação, qual nó fica selecionado — e quais teclas sequer são nossas.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { acaoDeTeclado, ehCampoDeTexto, navegar } from "./navegacao.ts";
import type { AnaliseV2 } from "./modelo.ts";

/**
 * 1.e4 com duas respostas: 1…e5 (principal) e 1…c5 (variante), cada uma seguida de
 * 2.Cf3. O painel desenha nesta ordem: raiz, e4, c5, Cf3(da variante), e5, Cf3.
 */
const analise: AnaliseV2 = {
  id: "an-1",
  inicio: { tipo: "posicao", positionId: "p-1" },
  raizId: "r",
  nos: {
    r: { id: "r", filhos: ["a"] },
    a: { id: "a", uci: "e2e4", filhos: ["b", "c"] },
    b: { id: "b", uci: "e7e5", filhos: ["d"] },
    c: { id: "c", uci: "c7c5", filhos: ["e"] },
    d: { id: "d", uci: "g1f3", filhos: [] },
    e: { id: "e", uci: "g1f3", filhos: [] },
  },
};

test("← volta ao pai e para na posição inicial", () => {
  assert.equal(navegar(analise, "d", "anterior"), "b");
  assert.equal(navegar(analise, "a", "anterior"), "r");
  assert.equal(navegar(analise, "r", "anterior"), "r");
});

test("→ desce pela linha principal e para no fim do ramo", () => {
  assert.equal(navegar(analise, "r", "proximo"), "a");
  assert.equal(navegar(analise, "a", "proximo"), "b");
  assert.equal(navegar(analise, "d", "proximo"), "d");
});

test("↑ e ↓ andam na ordem desenhada, variantes incluídas", () => {
  assert.equal(navegar(analise, "a", "abaixo"), "c");
  assert.equal(navegar(analise, "c", "abaixo"), "e");
  assert.equal(navegar(analise, "e", "abaixo"), "b");
  assert.equal(navegar(analise, "b", "acima"), "e");
  assert.equal(navegar(analise, "r", "acima"), "r");
  assert.equal(navegar(analise, "d", "abaixo"), "d");
});

test("Home volta à raiz e End desce até o fim da linha atual", () => {
  assert.equal(navegar(analise, "e", "inicio"), "r");
  assert.equal(navegar(analise, "a", "fim"), "d");
  assert.equal(navegar(analise, "c", "fim"), "e");
});

test("um nó que não existe mais não quebra a navegação", () => {
  assert.equal(navegar(analise, "sumiu", "proximo"), "a");
  assert.equal(navegar(analise, "sumiu", "anterior"), "r");
});

test("um ciclo no documento não trava o End", () => {
  const ciclica: AnaliseV2 = { ...analise, nos: { ...analise.nos, d: { id: "d", uci: "g1f3", filhos: ["b"] } } };
  assert.equal(navegar(ciclica, "b", "fim"), "d");
});

test("as teclas da árvore são só as seis, e sem modificador", () => {
  assert.equal(acaoDeTeclado({ key: "ArrowLeft" }), "anterior");
  assert.equal(acaoDeTeclado({ key: "ArrowRight" }), "proximo");
  assert.equal(acaoDeTeclado({ key: "ArrowUp" }), "acima");
  assert.equal(acaoDeTeclado({ key: "ArrowDown" }), "abaixo");
  assert.equal(acaoDeTeclado({ key: "Home" }), "inicio");
  assert.equal(acaoDeTeclado({ key: "End" }), "fim");
  assert.equal(acaoDeTeclado({ key: "z" }), null);
  assert.equal(acaoDeTeclado({ key: "ArrowLeft", ctrlKey: true }), null);
  assert.equal(acaoDeTeclado({ key: "ArrowLeft", metaKey: true }), null);
  assert.equal(acaoDeTeclado({ key: "ArrowRight", altKey: true }), null);
  assert.equal(acaoDeTeclado({ key: "ArrowRight", shiftKey: true }), null);
});

test("campo de texto engole o atalho", () => {
  assert.equal(ehCampoDeTexto({ tagName: "INPUT" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "textarea" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "SELECT" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(ehCampoDeTexto({ tagName: "DIV", getAttribute: () => "textbox" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "BUTTON" }), false);
  assert.equal(ehCampoDeTexto(null), false);
});
