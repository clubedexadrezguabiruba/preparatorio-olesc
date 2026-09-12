/**
 * O que dá para provar sem tela da paleta clicável (§10.2 e §25).
 *
 * O clique no tabuleiro é humano — o chessground só confia em ponteiro de verdade
 * (`drag.js:6`). O que está aqui é a máquina de estados: dada a ferramenta, a cor e o
 * que já está desenhado, qual é a lista nova de formas. A ponte até o arquivo é a
 * mesma de `desenhos.ts`, e os últimos testes fecham o caminho inteiro — paleta →
 * formas → arquivo — para provar que as duas portas do desenho concordam.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { executarComando } from "./comandos.ts";
import { desenhoDeFormas, type FormaCrua } from "./desenhos.ts";
import type { AulaV2 } from "./modelo.ts";
import {
  cliqueNaCasa,
  desistirDaSeta,
  escolherCor,
  escolherFerramenta,
  ESTADO_INICIAL_DA_PALETA,
  instrucaoDaPaleta,
  type EstadoDaPaleta,
} from "./paleta-de-desenho.ts";

const comSeta = (cor: EstadoDaPaleta["cor"] = "verde"): EstadoDaPaleta => ({ ferramenta: "seta", cor });
const comCasa = (cor: EstadoDaPaleta["cor"] = "verde"): EstadoDaPaleta => ({ ferramenta: "casa", cor });

test("sem ferramenta escolhida, o clique no tabuleiro não desenha nada", () => {
  const efeito = cliqueNaCasa(ESTADO_INICIAL_DA_PALETA, [], "e4");
  assert.equal(efeito.formas, undefined, "o clique continua sendo do lance, não do desenho");
  assert.deepEqual(efeito.estado, ESTADO_INICIAL_DA_PALETA);
});

test("a casa acende num clique só, na cor escolhida", () => {
  const efeito = cliqueNaCasa(comCasa("vermelho"), [], "d4");
  assert.deepEqual(efeito.formas, [{ orig: "d4", brush: "red" }]);
});

test("o azul da paleta é desenhado com o pincel deste site", () => {
  // `annotations.ts` explica por quê: o tabuleiro é azul, e o azul do autor sai no
  // pincel `plano`. O importante aqui é que ele volte a ser "azul" no arquivo.
  const efeito = cliqueNaCasa(comCasa("azul"), [], "c5");
  assert.deepEqual(efeito.formas, [{ orig: "c5", brush: "plano" }]);
  assert.deepEqual(desenhoDeFormas(efeito.formas!), { highlights: [{ casa: "c5", cor: "azul" }] });
});

test("a seta precisa de dois cliques, e o primeiro não desenha nada", () => {
  const primeiro = cliqueNaCasa(comSeta(), [], "e2");
  assert.equal(primeiro.formas, undefined);
  assert.equal(primeiro.estado.origem, "e2");

  const segundo = cliqueNaCasa(primeiro.estado, [], "e4");
  assert.deepEqual(segundo.formas, [{ orig: "e2", dest: "e4", brush: "green" }]);
  assert.equal(segundo.estado.origem, undefined, "a seta fechou, e a próxima começa do zero");
});

test("clicar duas vezes na mesma casa desiste da seta em vez de acender a casa", () => {
  const primeiro = cliqueNaCasa(comSeta(), [], "g1");
  const segundo = cliqueNaCasa(primeiro.estado, [], "g1");
  assert.equal(segundo.formas, undefined, "acender casa é a outra ferramenta");
  assert.equal(segundo.estado.origem, undefined);
});

test("repetir o gesto com a mesma cor apaga — a regra do botão direito", () => {
  const jaDesenhado: FormaCrua[] = [{ orig: "d4", brush: "green" }];
  const efeito = cliqueNaCasa(comCasa("verde"), jaDesenhado, "d4");
  assert.deepEqual(efeito.formas, []);
});

test("repetir o gesto com outra cor troca a cor, e não empilha dois traços", () => {
  const jaDesenhado: FormaCrua[] = [{ orig: "e2", dest: "e4", brush: "green" }];
  const efeito = cliqueNaCasa(cliqueNaCasa(comSeta("amarelo"), jaDesenhado, "e2").estado, jaDesenhado, "e4");
  assert.deepEqual(efeito.formas, [{ orig: "e2", dest: "e4", brush: "yellow" }]);
});

test("a seta e a casa da mesma origem são traços diferentes e convivem", () => {
  const comArco: FormaCrua[] = [{ orig: "e2", brush: "green" }];
  const efeito = cliqueNaCasa(cliqueNaCasa(comSeta(), comArco, "e2").estado, comArco, "e4");
  assert.deepEqual(efeito.formas, [
    { orig: "e2", brush: "green" },
    { orig: "e2", dest: "e4", brush: "green" },
  ]);
});

test("o resto do desenho da posição não é tocado pelo traço novo", () => {
  const antes: FormaCrua[] = [
    { orig: "a1", dest: "a8", brush: "red" },
    { orig: "h4", brush: "yellow" },
  ];
  const efeito = cliqueNaCasa(comCasa("verde"), antes, "d4");
  assert.deepEqual(efeito.formas, [...antes, { orig: "d4", brush: "green" }]);
});

test("clicar na ferramenta ligada devolve o tabuleiro ao movimento de peça", () => {
  assert.equal(escolherFerramenta(comSeta(), "seta").ferramenta, "mover");
  assert.equal(escolherFerramenta(comSeta(), "casa").ferramenta, "casa");
  assert.equal(escolherFerramenta(ESTADO_INICIAL_DA_PALETA, "seta").ferramenta, "seta");
});

test("trocar de ferramenta no meio de uma seta esquece a origem pendurada", () => {
  const pendurada = cliqueNaCasa(comSeta(), [], "e2").estado;
  assert.equal(escolherFerramenta(pendurada, "casa").origem, undefined);
  assert.equal(desistirDaSeta(pendurada).origem, undefined);
});

test("trocar a cor no meio da seta não faz o professor recomeçar", () => {
  const pendurada = cliqueNaCasa(comSeta("verde"), [], "b1").estado;
  const outraCor = escolherCor(pendurada, "amarelo");
  assert.equal(outraCor.origem, "b1");
  const fechada = cliqueNaCasa(outraCor, [], "c3");
  assert.deepEqual(fechada.formas, [{ orig: "b1", dest: "c3", brush: "yellow" }]);
});

test("a instrução da tela diz o estado em que a paleta está", () => {
  assert.match(instrucaoDaPaleta(ESTADO_INICIAL_DA_PALETA), /Arraste uma peça/);
  assert.match(instrucaoDaPaleta(comCasa()), /Clique numa casa/);
  assert.match(instrucaoDaPaleta(comSeta()), /casa de onde a seta parte/);
  assert.match(instrucaoDaPaleta(cliqueNaCasa(comSeta(), [], "f6").estado), /Seta de f6/);
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

test("o caminho inteiro: dois cliques na paleta viram uma seta no arquivo", () => {
  const primeiro = cliqueNaCasa(comSeta("vermelho"), [], "e1");
  const segundo = cliqueNaCasa(primeiro.estado, [], "e2");
  const aula = executarComando(aulaDeTeste(), {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: desenhoDeFormas(segundo.formas!),
  }, {});
  assert.deepEqual(aula.analises[0].nos.r.desenhos, { arrows: [{ de: "e1", para: "e2", cor: "vermelho" }] });
});

test("apagar o último traço pela paleta OMITE o campo, e não grava lista vazia", () => {
  // §10.2: "apagar o último desenho omite o campo; não salva listas vazias inválidas".
  const com = executarComando(aulaDeTeste(), {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: desenhoDeFormas(cliqueNaCasa(comCasa("verde"), [], "d4").formas!),
  }, {});
  assert.deepEqual(com.analises[0].nos.r.desenhos, { highlights: [{ casa: "d4", cor: "verde" }] });

  const sobrou = cliqueNaCasa(comCasa("verde"), [{ orig: "d4", brush: "green" }], "d4").formas!;
  assert.deepEqual(sobrou, []);
  const sem = executarComando(com, {
    tipo: "DEFINIR_DESENHOS", analiseId: "an-1", nodeId: "r",
    desenhos: desenhoDeFormas(sobrou),
  }, {});
  assert.equal("desenhos" in sem.analises[0].nos.r, false, "campo omitido, não `{}` nem `{arrows:[]}`");
});
