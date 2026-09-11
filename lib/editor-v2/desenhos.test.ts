/**
 * O que dá para provar sem tela do desenho com o botão direito.
 *
 * O gesto é humano (plano §19): arrastar com o botão direito não chega ao tabuleiro
 * por script. O que está aqui é a conta — dada a lista de formas que o tabuleiro
 * devolve, o que vai parar no arquivo, e o que o comando faz com o histórico.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { executarComando } from "./comandos.ts";
import { desenhoDeFormas, diretivasSemDesenho, mesmosDesenhos, noComDesenhos } from "./desenhos.ts";
import type { AulaV2 } from "./modelo.ts";

test("cada pincel do tabuleiro volta como a cor que o arquivo guarda", () => {
  const desenho = desenhoDeFormas([
    { orig: "e2", dest: "e4", brush: "green" },
    { orig: "d5", brush: "red" },
    { orig: "g1", dest: "f3", brush: "yellow" },
    { orig: "c4", brush: "blue" },
  ]);
  assert.deepEqual(desenho, {
    arrows: [
      { de: "e2", para: "e4", cor: "verde" },
      { de: "g1", para: "f3", cor: "amarelo" },
    ],
    highlights: [
      { casa: "d5", cor: "vermelho" },
      { casa: "c4", cor: "azul" },
    ],
  });
});

test("o pincel com que o azul é desenhado neste site também volta como azul", () => {
  assert.deepEqual(desenhoDeFormas([{ orig: "a1", dest: "h8", brush: "plano" }]), {
    arrows: [{ de: "a1", para: "h8", cor: "azul" }],
  });
});

test("pincel desconhecido é descartado, e não vira cor inventada", () => {
  assert.equal(desenhoDeFormas([{ orig: "e4", brush: "paleRed" }]), undefined);
  assert.deepEqual(desenhoDeFormas([{ orig: "e4", brush: "paleRed" }, { orig: "d4", brush: "green" }]), {
    highlights: [{ casa: "d4", cor: "verde" }],
  });
});

test("apagar tudo devolve nada, e não um desenho vazio no arquivo", () => {
  assert.equal(desenhoDeFormas([]), undefined);
});

test("a cópia crua do desenho sai junto; o resto das diretivas fica", () => {
  assert.deepEqual(
    diretivasSemDesenho(["[%cal Ge2e4]", "[%clk 0:05:00]", "[%csl Rd5]", "[%anno x]"]),
    ["[%clk 0:05:00]", "[%anno x]"],
  );
  assert.equal(diretivasSemDesenho(["[%cal Ge2e4]"]), undefined);
  assert.equal(diretivasSemDesenho(undefined), undefined);
});

test("o nó reescrito perde o desenho cru e mantém o relógio", () => {
  const no = noComDesenhos(
    { id: "a", uci: "e2e4", filhos: [], diretivas: ["[%cal Ge2e4]", "[%clk 0:05:00]"], desenhos: { arrows: [["e2", "e4"]] } },
    { highlights: [{ casa: "d5", cor: "vermelho" }] },
  );
  assert.deepEqual(no.desenhos, { highlights: [{ casa: "d5", cor: "vermelho" }] });
  assert.deepEqual(no.diretivas, ["[%clk 0:05:00]"]);
});

test("desenho igual não é mudança", () => {
  assert.equal(mesmosDesenhos(undefined, undefined), true);
  assert.equal(mesmosDesenhos({ highlights: [{ casa: "d5", cor: "verde" }] }, { highlights: [{ casa: "d5", cor: "verde" }] }), true);
  assert.equal(mesmosDesenhos({ highlights: [{ casa: "d5", cor: "verde" }] }, { highlights: [{ casa: "d5", cor: "azul" }] }), false);
});

function aulaDeTeste(): AulaV2 {
  return {
    id: "T",
    titulo: "teste",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    analises: [{
      id: "an-1",
      inicio: { tipo: "fen", fen: "8/8/8/8/8/8/4P3/4K2k w - - 0 1" },
      raizId: "r",
      nos: { r: { id: "r", filhos: [] } },
    }],
    capitulos: [],
    treinos: [],
    praticas: [],
    fluxo: [],
  } as unknown as AulaV2;
}

test("o comando guarda o desenho no nó", () => {
  const aula = aulaDeTeste();
  const depois = executarComando(aula, {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: { arrows: [{ de: "e2", para: "e4", cor: "verde" }] },
  }, {});
  assert.deepEqual(depois.analises[0].nos.r.desenhos, { arrows: [{ de: "e2", para: "e4", cor: "verde" }] });
  assert.equal(aula.analises[0].nos.r.desenhos, undefined, "a aula de entrada não é alterada");
});

test("redesenhar o mesmo desenho não cria passo de Desfazer", () => {
  const aula = executarComando(aulaDeTeste(), {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: { highlights: [{ casa: "d5", cor: "azul" }] },
  }, {});
  const igual = executarComando(aula, {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: { highlights: [{ casa: "d5", cor: "azul" }] },
  }, {});
  assert.equal(igual, aula, "documento idêntico: o histórico ignora");
});

test("apagar o desenho tira o campo do nó", () => {
  const com = executarComando(aulaDeTeste(), {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: { highlights: [{ casa: "d5", cor: "azul" }] },
  }, {});
  const sem = executarComando(com, { tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r", desenhos: undefined }, {});
  assert.equal("desenhos" in sem.analises[0].nos.r, false);
});
