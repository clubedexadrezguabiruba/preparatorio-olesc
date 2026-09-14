import assert from "node:assert/strict";
import test from "node:test";
import { RECUO_DO_PULSO, setaQueEnsina, simboloNaCasa } from "./desenhos-do-tabuleiro.ts";

/**
 * Os desenhos estilo Chess.com. O que se confere aqui é o que o olho erraria
 * calado: o ângulo da seta com as pretas embaixo, o recuo do pulso em qualquer
 * comprimento, e o símbolo certo para cada veredito.
 */

const angulo = (html: string): number => Number(/rotate\((-?[\d.]+)\)/.exec(html)?.[1]);
const encolhe = (html: string): number => Number(/--encolhe:([\d.]+)/.exec(html)?.[1]);
const ponta = (html: string): number => Number(/ ([\d.]+),0 /.exec(html)?.[1]);

test("a seta sai da casa de origem e gira com o tabuleiro", () => {
  const brancas = setaQueEnsina("e2", "e4", "white");
  assert.equal(brancas.orig, "e2");
  assert.equal(brancas.dest, undefined, "sem `dest`: não disputa lugar com as setas do pacote");
  assert.equal(angulo(brancas.customSvg!.html), -90, "com as brancas embaixo, e2→e4 sobe");
  assert.equal(ponta(brancas.customSvg!.html), 200, "a ponta chega ao centro de e4, duas casas adiante");

  assert.equal(angulo(setaQueEnsina("e2", "e4", "black").customSvg!.html), 90, "com as pretas embaixo, desce");
  assert.equal(angulo(setaQueEnsina("g1", "f3", "white").customSvg!.html), Number((Math.atan2(-200, -100) * 180 / Math.PI).toFixed(3)));
});

test("o pulso recua a ponta 14% de casa em qualquer comprimento de seta", () => {
  for (const [orig, dest] of [["e2", "e3"], ["e2", "e4"], ["a1", "h8"]] as const) {
    const html = setaQueEnsina(orig, dest, "white").customSvg!.html;
    const corpo = Number(/points="([\d.]+),/.exec(html)?.[1]);
    assert.ok(Math.abs(corpo * (1 - encolhe(html)) - RECUO_DO_PULSO) < 0.05, `${orig}→${dest}: a haste encolhe 14`);
    assert.match(html, /class="seta-haste"/);
    assert.match(html, /class="seta-ponta"/);
  }
});

test("cada veredito tem o seu desenho, e só Brilhante e Ótimo têm a entrada grande", () => {
  const html = (qual: Parameters<typeof simboloNaCasa>[1]) => simboloNaCasa("c4", qual).customSvg!.html;

  assert.match(html("acerto"), /<path /, "o acerto é a estrela");
  assert.match(html("acerto"), /simbolo-cor-acerto/);
  for (const [qual, sinal] of [["alternativa", "!?"], ["erro", "?"], ["armadilha", "??"]] as const) {
    assert.match(html(qual), new RegExp(`>${sinal.replace(/\?/g, "\\?")}</text>`), `${qual} escreve ${sinal}`);
    assert.match(html(qual), new RegExp(`simbolo-cor-${qual}`));
    assert.match(html(qual), /class="simbolo-lance" transform="translate\(94 6\)"/, "no canto, 94% × 6%");
    assert.doesNotMatch(html(qual), /entrada-grande/);
  }
  for (const [qual, sinal, rotulo] of [["brilhante", "!!", "Brilhante!"], ["otimo", "!", "Ótimo!"]] as const) {
    assert.match(html(qual), /class="entrada-grande"/);
    assert.match(html(qual), new RegExp(`tinta-${qual}`), "a casa se pinta com a tinta dele");
    assert.match(html(qual), new RegExp(`>${sinal}</text>`));
    assert.match(html(qual), new RegExp(`>${rotulo}</text>`));
  }
});
