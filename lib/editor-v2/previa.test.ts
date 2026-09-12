/**
 * O que dá para provar sem tela da prévia (§15).
 *
 * O relógio, a digitação e o tabuleiro são do runtime do aluno e já têm teste próprio.
 * O que está aqui é a tradução: dado o documento, que passos o player recebe, em que
 * ordem, e onde uma comparação volta ao ponto de escolha.
 *
 * **O caso de aceite obrigatório de §15.3 é o último bloco deste arquivo**, e é uma
 * posição de rei e peão de verdade: a defesa certa até o afogamento, o retorno ao ponto
 * de escolha, e o engano até a promoção da dama — tudo na mesma aula. As duas linhas
 * são conferidas pela chess.js aqui mesmo, para o teste não afirmar um empate que a
 * regra do jogo não dá.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import type { AulaV2, CapituloV2, NoV2 } from "./modelo.ts";
import { pausaDoPasso } from "../lesson/roteiro.ts";
import {
  animacaoDaPrevia,
  INTERVALO_SEM_FALA_MS,
  pausaDaPrevia,
  percursoDoCapitulo,
  podePreverDaqui,
  previaDaAula,
  previaDoCapitulo,
  type PassoDaPrevia,
} from "./previa.ts";

/* ------------------------------------------------------------------ *
 * A montagem de uma aula de teste
 * ------------------------------------------------------------------ */

/** Uma linha de lances vira nós encadeados a partir de uma raiz comum. */
function ramo(nos: Record<string, NoV2>, de: string, prefixo: string, ucis: string[]): string[] {
  const ids: string[] = [];
  let pai = de;
  ucis.forEach((uci, i) => {
    const id = `${prefixo}${i + 1}`;
    nos[id] = { id, uci, filhos: [] };
    nos[pai].filhos.push(id);
    ids.push(id);
    pai = id;
  });
  return ids;
}

function aula({ fen, ramos, capitulos }: {
  fen: string;
  ramos: { prefixo: string; ucis: string[]; de?: string }[];
  capitulos: (ids: Record<string, string[]>) => CapituloV2[];
}): AulaV2 {
  const nos: Record<string, NoV2> = { r: { id: "r", filhos: [] } };
  const ids: Record<string, string[]> = {};
  for (const item of ramos) ids[item.prefixo] = ramo(nos, item.de ?? "r", item.prefixo, item.ucis);
  const lista = capitulos(ids);
  return {
    id: "T",
    titulo: "Rei e peão: a oposição decide",
    metadados: { orientacaoPadrao: "black", criterioDominio: "D1", estadoEditorial: "rascunho" },
    analises: [{ id: "an-1", inicio: { tipo: "fen", fen }, raizId: "r", nos }],
    capitulos: lista,
    treinos: [],
    praticas: [],
    fluxo: lista.map((capitulo, i) => ({ id: `et-${i + 1}`, tipo: "capitulo", entidadeId: capitulo.id })),
  } as unknown as AulaV2;
}

const PARTIDA = "8/8/8/8/8/8/4P3/4K2k w - - 0 1";

/* ------------------------------------------------------------------ *
 * §15.1 — os passos de um capítulo
 * ------------------------------------------------------------------ */

function aulaSimples(): AulaV2 {
  return aula({
    fen: PARTIDA,
    ramos: [{ prefixo: "a", ucis: ["e2e4", "h1g2", "e4e5"] }],
    capitulos: (ids) => [{
      id: "cap-1", titulo: "O peão anda", analiseId: "an-1",
      inicioNodeId: "r", caminho: ids.a, orientacao: "white",
      narracoes: [
        { id: "n-0", nodeId: "r", texto: "Olhe a posição antes de mexer.", pausa: "temporizada" },
        { id: "n-1", nodeId: ids.a[0], texto: "O peão sai.", pausa: "temporizada" },
      ],
    } as CapituloV2],
  });
}

test("o primeiro passo é a posição de partida, e ele não tem lance", () => {
  const previa = previaDoCapitulo(aulaSimples(), {}, "cap-1");
  assert.equal(previa.escopo, "capitulo");
  assert.equal(previa.trechos.length, 1);
  assert.equal(previa.trechos[0].fen, PARTIDA);
  assert.equal(previa.trechos[0].passos[0].lance, undefined);
  assert.equal(previa.trechos[0].passos[0].fala, "Olhe a posição antes de mexer.");
});

test("cada lance do percurso vira um passo, na ordem do percurso", () => {
  const passos = previaDoCapitulo(aulaSimples(), {}, "cap-1").trechos[0].passos;
  assert.deepEqual(passos.map((p) => p.lance), [undefined, "e2e4", "h1g2", "e4e5"]);
});

test("lance sem narração vira passo de fala vazia — a prévia não inventa texto", () => {
  const passos = previaDoCapitulo(aulaSimples(), {}, "cap-1").trechos[0].passos;
  assert.equal(passos[2].fala, "", "o professor vê exatamente o silêncio que o aluno veria");
  assert.equal(passos[3].fala, "");
});

test("duas narrações no mesmo lance viram dois passos, e o lance só é jogado uma vez", () => {
  const documento = aulaSimples();
  const primeiro = documento.capitulos[0].caminho[0];
  documento.capitulos[0].narracoes.push({ id: "n-2", nodeId: primeiro, texto: "E olhe o rei.", pausa: "temporizada" });
  const passos = previaDoCapitulo(documento, {}, "cap-1").trechos[0].passos;
  const doLance = passos.filter((p) => p.nodeId === primeiro);
  assert.equal(doLance.length, 2);
  assert.equal(doLance[0].lance, "e2e4");
  assert.equal(doLance[1].lance, undefined, "o segundo passo fala da mesma posição");
});

test("a pausa manual do professor atravessa até o passo", () => {
  const documento = aulaSimples();
  documento.capitulos[0].narracoes[0].pausa = "manual";
  const passos = previaDoCapitulo(documento, {}, "cap-1").trechos[0].passos;
  assert.equal(passos[0].pausaManual, true);
  assert.equal(passos[1].pausaManual, false);
});

test("os desenhos da posição viajam com o passo, com a cor da autoria", () => {
  const documento = aulaSimples();
  const primeiro = documento.capitulos[0].caminho[0];
  documento.analises[0].nos[primeiro].desenhos = { arrows: [{ de: "e2", para: "e4", cor: "vermelho" }] };
  const passos = previaDoCapitulo(documento, {}, "cap-1").trechos[0].passos;
  assert.deepEqual(passos[1].desenhos, { arrows: [{ de: "e2", para: "e4", cor: "vermelho" }] });
});

/* ------------------------------------------------------------------ *
 * §15.1 — "daqui"
 * ------------------------------------------------------------------ */

test("«daqui» começa na posição do lance escolhido, e não no começo do capítulo", () => {
  const documento = aulaSimples();
  const segundo = documento.capitulos[0].caminho[1];
  const previa = previaDoCapitulo(documento, {}, "cap-1", segundo);
  assert.equal(previa.escopo, "daqui");
  assert.equal(previa.trechos[0].passos[0].nodeId, segundo);
  assert.equal(previa.trechos[0].passos[0].lance, undefined, "o ponto de partida não se joga de novo");
  assert.deepEqual(previa.trechos[0].passos.map((p) => p.lance), [undefined, "e4e5"]);
  // A FEN do trecho é a do lance escolhido, e não a da aula.
  const jogo = new Chess(PARTIDA);
  jogo.move({ from: "e2", to: "e4" });
  jogo.move({ from: "h1", to: "g2" });
  assert.equal(previa.trechos[0].fen, jogo.fen());
});

test("lance fora do percurso não abre «daqui» — variante não toca sozinha", () => {
  const documento = aula({
    fen: PARTIDA,
    ramos: [{ prefixo: "a", ucis: ["e2e4"] }, { prefixo: "v", ucis: ["e2e3"] }],
    capitulos: (ids) => [{
      id: "cap-1", titulo: "Só a principal", analiseId: "an-1",
      inicioNodeId: "r", caminho: ids.a, orientacao: "white", narracoes: [],
    } as CapituloV2],
  });
  const capitulo = documento.capitulos[0];
  assert.equal(podePreverDaqui(capitulo, "v1"), false);
  assert.equal(podePreverDaqui(capitulo, "a1"), true);
  // Pedir mesmo assim cai no capítulo inteiro, e a tela diz "capítulo" e não "daqui".
  const previa = previaDoCapitulo(documento, {}, "cap-1", "v1");
  assert.equal(previa.escopo, "capitulo");
  assert.equal(previa.trechos[0].passos[0].nodeId, "r");
});

test("o percurso é o início mais o caminho, e nada da variante", () => {
  const documento = aula({
    fen: PARTIDA,
    ramos: [{ prefixo: "a", ucis: ["e2e4"] }, { prefixo: "v", ucis: ["e2e3"] }],
    capitulos: (ids) => [{
      id: "cap-1", titulo: "x", analiseId: "an-1", inicioNodeId: "r",
      caminho: ids.a, orientacao: "white", narracoes: [],
    } as CapituloV2],
  });
  assert.deepEqual(percursoDoCapitulo(documento.capitulos[0]), ["r", "a1"]);
});

/* ------------------------------------------------------------------ *
 * §15.1 — a aula inteira, na ordem do fluxo
 * ------------------------------------------------------------------ */

test("a aula inteira segue a ordem do fluxo, não a do cadastro de capítulos", () => {
  const documento = aulaSimples();
  documento.capitulos.push({
    id: "cap-2", titulo: "Segundo", analiseId: "an-1", inicioNodeId: "r",
    caminho: [], orientacao: "black", narracoes: [],
  } as unknown as CapituloV2);
  documento.fluxo = [
    { id: "et-2", tipo: "capitulo", entidadeId: "cap-2" },
    { id: "et-1", tipo: "capitulo", entidadeId: "cap-1" },
  ] as AulaV2["fluxo"];
  const previa = previaDaAula(documento, {});
  assert.deepEqual(previa.trechos.map((t) => t.capituloId), ["cap-2", "cap-1"]);
  assert.equal(previa.escopo, "aula");
});

test("cada capítulo leva a própria orientação — os dois lados na mesma prévia", () => {
  const documento = aulaSimples();
  documento.capitulos.push({
    id: "cap-2", titulo: "Do outro lado", analiseId: "an-1", inicioNodeId: "r",
    caminho: [], orientacao: "black", narracoes: [],
  } as unknown as CapituloV2);
  documento.fluxo.push({ id: "et-2", tipo: "capitulo", entidadeId: "cap-2" } as AulaV2["fluxo"][number]);
  const previa = previaDaAula(documento, {});
  assert.deepEqual(previa.trechos.map((t) => t.orientacao), ["white", "black"]);
});

/* ------------------------------------------------------------------ *
 * §15.2 — o relógio
 * ------------------------------------------------------------------ */

const passo = (extra: Partial<PassoDaPrevia> = {}): PassoDaPrevia =>
  ({ nodeId: "x", fala: "", pausaManual: false, ...extra });

const regua = (fala: string) => pausaDoPasso({ fala } as Parameters<typeof pausaDoPasso>[0]);

test("a velocidade NÃO comprime o tempo de leitura da narração", () => {
  const comFala = passo({ fala: "O rei preto toma a oposição e o peão não passa." });
  const normal = pausaDaPrevia(comFala, 1, regua);
  assert.equal(pausaDaPrevia(comFala, 2, regua), normal, "2× não apressa quem está lendo");
  assert.equal(pausaDaPrevia(comFala, 0.5, regua), normal, "0,5× não estica a leitura");
  assert.equal(normal, regua(comFala.fala), "é a régua do aluno, e não outra conta");
});

test("a velocidade vale inteira no intervalo do lance sem narração", () => {
  const mudo = passo();
  assert.equal(pausaDaPrevia(mudo, 1, regua), INTERVALO_SEM_FALA_MS);
  assert.equal(pausaDaPrevia(mudo, 2, regua), INTERVALO_SEM_FALA_MS / 2);
  assert.equal(pausaDaPrevia(mudo, 0.5, regua), INTERVALO_SEM_FALA_MS * 2);
});

test("a pausa manual não anda sozinha em velocidade nenhuma", () => {
  const manual = passo({ fala: "Pense antes de continuar.", pausaManual: true });
  for (const v of [0.5, 1, 2]) assert.equal(pausaDaPrevia(manual, v, regua), null);
});

test("o movimento da peça obedece à velocidade", () => {
  assert.equal(animacaoDaPrevia(1), 180);
  assert.equal(animacaoDaPrevia(2), 90);
  assert.equal(animacaoDaPrevia(0.5), 360);
});

/* ------------------------------------------------------------------ *
 * §15.3 — a comparação
 * ------------------------------------------------------------------ */

test("dois capítulos que se separam num lance marcam esse lance como ponto de escolha", () => {
  const documento = aula({
    fen: PARTIDA,
    ramos: [
      { prefixo: "a", ucis: ["e2e4", "h1g2", "e4e5"] },
      { prefixo: "b", ucis: ["h1h2"], de: "a1" },
    ],
    capitulos: (ids) => [
      { id: "cap-1", titulo: "A linha certa", analiseId: "an-1", inicioNodeId: "r", caminho: ids.a, orientacao: "white", narracoes: [] },
      { id: "cap-2", titulo: "A outra", analiseId: "an-1", inicioNodeId: "r", caminho: [ids.a[0], ...ids.b], orientacao: "white", narracoes: [] },
    ] as CapituloV2[],
  });
  const previa = previaDaAula(documento, {});
  assert.equal(previa.trechos[0].comparacao, undefined, "o primeiro não volta a lugar nenhum");
  const comparacao = previa.trechos[1].comparacao!;
  assert.equal(comparacao.comCapituloId, "cap-1");
  assert.equal(comparacao.comTitulo, "A linha certa");
  assert.equal(comparacao.nodeId, "a1", "a bifurcação é o último lance em comum");
  assert.equal(comparacao.rotulo, "1. e4");
  assert.equal(comparacao.outraSegue, "1… Kg2");
  assert.equal(comparacao.estaSegue, "1… Kh2");
  assert.equal(
    comparacao.texto,
    "Voltamos a 1. e4. Em «A linha certa» a partida seguiu com 1… Kg2; agora, a outra escolha: 1… Kh2.",
  );
  // O retorno é dito na bifurcação: depois do passo de `1. e4`, antes de `1… Kh2`.
  const passos = previa.trechos[1].passos;
  const retorno = passos.findIndex((p) => p.retorno);
  assert.equal(passos[retorno].nodeId, "a1");
  assert.equal(passos[retorno - 1].lance, "e2e4");
  assert.equal(passos[retorno + 1].lance, "h1h2");
});

test("quando as duas linhas se separam já no começo, o ponto de escolha é a posição inicial", () => {
  const documento = aula({
    fen: PARTIDA,
    ramos: [{ prefixo: "a", ucis: ["e2e4"] }, { prefixo: "b", ucis: ["e2e3"] }],
    capitulos: (ids) => [
      { id: "cap-1", titulo: "Uma", analiseId: "an-1", inicioNodeId: "r", caminho: ids.a, orientacao: "white", narracoes: [] },
      { id: "cap-2", titulo: "Outra", analiseId: "an-1", inicioNodeId: "r", caminho: ids.b, orientacao: "white", narracoes: [] },
    ] as CapituloV2[],
  });
  const comparacao = previaDaAula(documento, {}).trechos[1].comparacao!;
  assert.equal(comparacao.nodeId, "r");
  assert.equal(comparacao.rotulo, "a posição inicial");
  assert.equal(comparacao.fen, PARTIDA);
});

test("um capítulo que é só o começo do outro não é comparação — não há escolha ali", () => {
  const documento = aula({
    fen: PARTIDA,
    ramos: [{ prefixo: "a", ucis: ["e2e4", "h1g2"] }],
    capitulos: (ids) => [
      { id: "cap-1", titulo: "Inteiro", analiseId: "an-1", inicioNodeId: "r", caminho: ids.a, orientacao: "white", narracoes: [] },
      { id: "cap-2", titulo: "Só o começo", analiseId: "an-1", inicioNodeId: "r", caminho: [ids.a[0]], orientacao: "white", narracoes: [] },
    ] as CapituloV2[],
  });
  assert.equal(previaDaAula(documento, {}).trechos[1].comparacao, undefined);
});

test("com três linhas, a comparação aponta o começo comum mais longo — a bifurcação mais perto", () => {
  const documento = aula({
    fen: PARTIDA,
    ramos: [
      { prefixo: "a", ucis: ["e2e4", "h1g2", "e4e5"] },
      { prefixo: "b", ucis: ["e1e2"], de: "a2" },
      { prefixo: "c", ucis: ["e2e3"] },
    ],
    capitulos: (ids) => [
      { id: "cap-1", titulo: "Principal", analiseId: "an-1", inicioNodeId: "r", caminho: ids.a, orientacao: "white", narracoes: [] },
      { id: "cap-2", titulo: "Longe", analiseId: "an-1", inicioNodeId: "r", caminho: ids.c, orientacao: "white", narracoes: [] },
      { id: "cap-3", titulo: "Perto", analiseId: "an-1", inicioNodeId: "r", caminho: [ids.a[0], ids.a[1], ...ids.b], orientacao: "white", narracoes: [] },
    ] as CapituloV2[],
  });
  const previa = previaDaAula(documento, {});
  assert.equal(previa.trechos[1].comparacao?.nodeId, "r");
  assert.equal(previa.trechos[2].comparacao?.nodeId, "a2", "a bifurcação de dois lances, e não a da raiz");
  assert.equal(previa.trechos[2].comparacao?.comCapituloId, "cap-1");
});

/* ------------------------------------------------------------------ *
 * §15.3 — O CASO DE ACEITE OBRIGATÓRIO
 *
 * "uma posição de rei e peão: linha correta até o empate, retorno ao ponto de escolha
 * e linha errada até a derrota, na mesma aula."
 * ------------------------------------------------------------------ */

/** Rei branco d5, peão e4, rei preto e7, **pretas jogam**. O preto tem a oposição. */
const REI_E_PEAO = "8/4k3/8/3K4/4P3/8/8/8 b - - 0 1";

/** A defesa certa: oposição, rei sempre na frente, e afogamento no fim. */
const DEFESA_CERTA = ["e7d7", "e4e5", "d7e7", "e5e6", "e7e8", "d5d6", "e8d8", "e6e7", "d8e8", "d6e6"];
/** O engano: o rei sai da frente do peão e a dama chega. */
const O_ENGANO = ["e7e8", "d5e6", "e8d8", "e6f7", "d8d7", "e4e5", "d7d8", "e5e6", "d8c7", "e6e7", "c7d7", "e7e8q"];

function aulaDeReiEPeao(): AulaV2 {
  return aula({
    fen: REI_E_PEAO,
    ramos: [{ prefixo: "certa", ucis: DEFESA_CERTA }, { prefixo: "erro", ucis: O_ENGANO }],
    capitulos: (ids) => [
      {
        id: "cap-certa", titulo: "A defesa certa: o empate", analiseId: "an-1",
        inicioNodeId: "r", caminho: ids.certa, orientacao: "black",
        narracoes: [
          { id: "nc-0", nodeId: "r", texto: "As pretas jogam, e é essa jogada que decide a partida.", pausa: "manual" },
          { id: "nc-1", nodeId: ids.certa[0], texto: "Rei para d7: de frente para o rei branco, com uma casa entre eles. Isto é a oposição.", pausa: "temporizada" },
          { id: "nc-9", nodeId: ids.certa[9], texto: "O rei preto não tem para onde ir, e não está em xeque: afogamento. Empate.", pausa: "temporizada" },
        ],
      },
      {
        id: "cap-erro", titulo: "O engano: a derrota", analiseId: "an-1",
        inicioNodeId: "r", caminho: ids.erro, orientacao: "black",
        narracoes: [
          { id: "ne-0", nodeId: "r", texto: "Na mesma posição, agora o lance natural — e ele perde.", pausa: "temporizada" },
          { id: "ne-1", nodeId: ids.erro[0], texto: "Rei para e8 sai da oposição, e o rei branco toma a frente.", pausa: "temporizada" },
          { id: "ne-11", nodeId: ids.erro[11], texto: "Dama. Daqui em diante é técnica de mate, e a partida está perdida.", pausa: "temporizada" },
        ],
      },
    ] as CapituloV2[],
  });
}

test("caso de aceite §15.3: a linha correta vai até o empate, pela regra do jogo", () => {
  const jogo = new Chess(REI_E_PEAO);
  for (const uci of DEFESA_CERTA) {
    const lance = jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    assert.ok(lance, `lance ilegal na defesa certa: ${uci}`);
  }
  assert.equal(jogo.isStalemate(), true, "afogamento");
  assert.equal(jogo.isDraw(), true, "empate");
});

test("caso de aceite §15.3: a linha errada vai até a derrota, pela regra do jogo", () => {
  const jogo = new Chess(REI_E_PEAO);
  for (const uci of O_ENGANO) {
    const lance = jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    assert.ok(lance, `lance ilegal no engano: ${uci}`);
  }
  assert.equal(jogo.isDraw(), false);
  // Dama branca contra rei sozinho: o final está perdido para as pretas.
  assert.match(jogo.fen(), /^4Q3/, "a dama está em e8");
});

test("caso de aceite §15.3: as duas linhas na mesma aula, com retorno ao ponto de escolha", () => {
  const previa = previaDaAula(aulaDeReiEPeao(), {});
  assert.equal(previa.trechos.length, 2);

  const [certa, erro] = previa.trechos;
  assert.equal(certa.titulo, "A defesa certa: o empate");
  assert.equal(certa.fen, REI_E_PEAO);
  assert.equal(certa.comparacao, undefined);
  assert.deepEqual(certa.passos.map((p) => p.lance), [undefined, ...DEFESA_CERTA]);

  assert.equal(erro.titulo, "O engano: a derrota");

  // O retorno: a mesma posição de partida, nomeada, com o que cada linha joga dali.
  const comparacao = erro.comparacao!;
  assert.equal(comparacao.comTitulo, "A defesa certa: o empate");
  assert.equal(comparacao.rotulo, "a posição inicial");
  assert.equal(comparacao.fen, REI_E_PEAO);
  assert.equal(comparacao.outraSegue, "1… Kd7");
  assert.equal(comparacao.estaSegue, "1… Ke8");

  // E ele é dito **no tabuleiro da bifurcação**, antes do primeiro lance diferente:
  // um passo a mais, sem lance, logo depois do último passo da posição de escolha.
  const retorno = erro.passos.findIndex((p) => p.retorno);
  assert.ok(retorno >= 0, "a prévia da aula inteira anuncia o retorno");
  assert.equal(erro.passos[retorno].nodeId, "r");
  assert.equal(erro.passos[retorno].lance, undefined);
  assert.equal(
    erro.passos[retorno].fala,
    "Voltamos à posição inicial. Em «A defesa certa: o empate» a partida seguiu com 1… Kd7; agora, a outra escolha: 1… Ke8.",
  );
  assert.equal(erro.passos[retorno + 1].lance, O_ENGANO[0], "e logo depois vem o lance da outra linha");
  // Fora o passo do retorno, os lances são exatamente o percurso do capítulo.
  assert.deepEqual(erro.passos.filter((p) => !p.retorno).map((p) => p.lance), [undefined, ...O_ENGANO]);
});

test("caso de aceite §15.3: narração diferente em cada passagem pela mesma posição", () => {
  const previa = previaDaAula(aulaDeReiEPeao(), {});
  const [certa, erro] = previa.trechos;
  assert.equal(certa.passos[0].nodeId, "r");
  assert.equal(erro.passos[0].nodeId, "r");
  assert.notEqual(certa.passos[0].fala, erro.passos[0].fala);
  assert.match(certa.passos[0].fala, /decide a partida/);
  assert.match(erro.passos[0].fala, /ele perde/);
});

test("caso de aceite §15.3: a pausa manual do ponto de escolha atravessa até o passo", () => {
  const previa = previaDaAula(aulaDeReiEPeao(), {});
  assert.equal(previa.trechos[0].passos[0].pausaManual, true);
  assert.equal(pausaDaPrevia(previa.trechos[0].passos[0], 2, regua), null);
});

test("caso de aceite §15.3: a prévia do capítulo sozinho não inventa comparação", () => {
  const previa = previaDoCapitulo(aulaDeReiEPeao(), {}, "cap-erro");
  assert.equal(previa.trechos.length, 1);
  assert.equal(previa.trechos[0].comparacao, undefined, "só a aula inteira mostra o retorno");
  assert.equal(previa.rotulo, "«O engano: a derrota»");
});
