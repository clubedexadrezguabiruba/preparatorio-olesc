import assert from "node:assert/strict";
import test from "node:test";
import { casaEscura, separarPlano } from "./esquema.ts";

/**
 * O leitor do bloco `[%plano]`.
 *
 * Cada teste aqui existe para um jeito específico de o bloco dar errado em
 * silêncio — e "em silêncio" é a palavra: um bloco mal lido não quebra nada,
 * ele só some da tela, e o aluno termina a linha sem saber o que ainda falta.
 */

test("sem bloco, o comentário passa inteiro e o plano sai vazio", () => {
  const { prosa, plano, erros } = separarPlano("O cavalo ataca e5.", "brancas");
  assert.equal(prosa, "O cavalo ataca e5.");
  assert.deepEqual(plano, {});
  assert.deepEqual(erros, []);
});

test("comentário nulo ou só espaço vira prosa nula", () => {
  assert.equal(separarPlano(null, "brancas").prosa, null);
  assert.equal(separarPlano("   ", "brancas").prosa, null);
});

test("o bloco sai da prosa, e o que sobra é o texto do professor", () => {
  const { prosa, plano } = separarPlano(
    "A dama fica em e2 para a torre chegar em d1.\n" +
      "[%plano\nc1>b2: só sai depois do b3, quando o e5 dele fechar a diagonal de f4\n]",
    "brancas",
  );
  assert.equal(prosa, "A dama fica em e2 para a torre chegar em d1.");
  assert.deepEqual(plano, {
    c1: { casa: "b2", motivo: "só sai depois do b3, quando o e5 dele fechar a diagonal de f4" },
  });
});

test("comentário que é SÓ o bloco devolve prosa nula", () => {
  // Isto é o que faz o gate "o último lance está sem comentário" continuar
  // valendo: um bloco não vale como comentário escrito.
  const { prosa, plano } = separarPlano("[%plano\nrei-fica: com as damas fora o rei fica melhor no centro\n]", "brancas");
  assert.equal(prosa, null);
  assert.deepEqual(plano, { rei: { casa: null, motivo: "com as damas fora o rei fica melhor no centro" } });
});

test("linha sem cabeça é continuação do motivo de cima", () => {
  const { plano, erros } = separarPlano(
    "x\n[%plano\nc8>b7: o bispo espera o b6\ne o b6 espera a torre sair de a8\n]",
    "pretas",
  );
  assert.deepEqual(erros, []);
  assert.equal(plano.c8.motivo, "o bispo espera o b6 e o b6 espera a torre sair de a8");
});

test("O-O e O-O-O viram casa de rei, e a cor decide a fila", () => {
  const brancas = separarPlano("x\n[%plano\nO-O: falta só tirar o bispo de f1 do caminho do rei\n]", "brancas");
  assert.deepEqual(brancas.plano.rei, { casa: "g1", motivo: "falta só tirar o bispo de f1 do caminho do rei" });

  const pretas = separarPlano("x\n[%plano\nO-O-O: o rei vai para o lado da dama, longe do ataque dele\n]", "pretas");
  assert.equal(pretas.plano.rei.casa, "c8");

  const pretaCurto = separarPlano("x\n[%plano\nO-O: o roque curto vem assim que o bispo de f8 sair\n]", "pretas");
  assert.equal(pretaCurto.plano.rei.casa, "g8");
});

test("duas entradas no mesmo bloco convivem", () => {
  const { plano } = separarPlano(
    "x\n[%plano\nc1>g5: sai depois do h3, para não levar o …h6 com tempo\nO-O: o roque vem no lance seguinte, com a coluna e fechada\n]",
    "brancas",
  );
  assert.deepEqual(Object.keys(plano).sort(), ["c1", "rei"]);
});

test("bloco que não fecha é erro nomeado, e a prosa ainda é salva", () => {
  const { prosa, erros } = separarPlano("A prosa que importa.\n[%plano\nc1>b2: sem fechar", "brancas");
  assert.equal(prosa, "A prosa que importa.");
  assert.match(erros[0], /abriu e não fechou/);
});

test("bloco vazio é erro — ou escreve, ou tira", () => {
  assert.match(separarPlano("x\n[%plano\n]", "brancas").erros[0], /está vazio/);
});

test("texto solto antes da primeira entrada é erro, e não some", () => {
  const { erros } = separarPlano("x\n[%plano\no bispo ainda não saiu\nc1>b2: agora sim, o motivo inteiro escrito aqui\n]", "brancas");
  assert.match(erros[0], /antes de qualquer entrada/);
});

test("cabeça mal escrita não vira continuação silenciosa do motivo de cima", () => {
  // O modo de falha que isto pega: `Bc1>b2:` em vez de `c1>b2:`. Sem esta
  // regra a entrada inteira viraria rabo do motivo anterior, e o aluno não
  // veria seta nenhuma para o bispo.
  const { erros, plano } = separarPlano(
    "x\n[%plano\nc1>b2: o motivo do primeiro bispo, escrito por extenso\nBf1>d3: o segundo\n]",
    "brancas",
  );
  assert.match(erros[0], /cabeça errada/);
  assert.equal(plano.c1.motivo, "o motivo do primeiro bispo, escrito por extenso");
});

test("a mesma peça duas vezes é erro", () => {
  const { erros } = separarPlano(
    "x\n[%plano\nc1>b2: um motivo comprido o suficiente aqui\nc1>g5: outro motivo comprido o suficiente\n]",
    "brancas",
  );
  assert.match(erros[0], /duas vezes da peça de c1/);
});

test("a cor das casas: a1 é escura, c1 é escura, f1 é clara", () => {
  // É o que reprova um bispo de casas claras prometido a uma casa escura.
  assert.equal(casaEscura("a1"), true);
  assert.equal(casaEscura("c1"), true);
  assert.equal(casaEscura("f1"), false);
  assert.equal(casaEscura("c8"), false);
  assert.equal(casaEscura("f8"), true);
});
