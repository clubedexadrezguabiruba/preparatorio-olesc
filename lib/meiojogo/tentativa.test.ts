import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { validarDicas, type ItemDeLance } from "./dicas.ts";
import { uciDe } from "./lances.ts";
import {
  APOIO_MAXIMO,
  COMECO,
  comApoio,
  comLance,
  contratoDoItem,
  custoDoRecusado,
  julgar,
  lancesDoItem,
  uciDoToque,
} from "./tentativa.ts";

/**
 * O caminho do lance, do arrasto da peça ao que vai virar linha no banco.
 *
 * Os itens são os publicados, e não fixtures: o que a tela vai receber é isto,
 * e um teste sobre uma posição inventada provaria a máquina de estado sem
 * provar que ela trabalha no conteúdo de verdade.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const DICAS = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content/meio-jogo.json"), "utf8")),
);

const ITENS = new Map<string, ItemDeLance>(
  DICAS.flatMap((d) => (d.treino?.exercicios ?? []).map((i) => [i.id, i] as const)),
);

/** O primeiro item publicado — o teste anda com o conteúdo, e não com um id fixo. */
const ALGUM = [...ITENS.values()];

function item(indice = 0): ItemDeLance {
  const encontrado = ALGUM[indice];
  assert.ok(encontrado, `não há ${indice + 1} exercício(s) publicado(s)`);
  return encontrado;
}

/**
 * Um lance legal que **não aplica o tema** — o erro honesto do aluno.
 *
 * Tira da conta os aceitos e os recusados: um lance recusado aplica o tema, e
 * confundir os dois faria este arquivo provar `acertou === false` pelo motivo
 * errado.
 */
function foraDoTema(dado: ItemDeLance): string {
  const doTema = new Set([...lancesDoItem(dado), ...dado.lancesRecusados.map((r) => r.lance)]);
  const legais = new Chess(dado.fen).moves({ verbose: true }).map(uciDe);
  const fora = legais.find((l) => !doTema.has(l));
  assert.ok(fora, `${dado.id} não tem lance legal fora do tema`);
  return fora;
}

test("todo item publicado tem pelo menos um lance aceito", () => {
  assert.ok(ALGUM.length > 0, "nenhum exercício publicado — o teste não prova nada");
  for (const dado of ALGUM) {
    assert.ok(lancesDoItem(dado).length > 0, `${dado.id} não tem lance aceito`);
  }
});

test("qualquer lance da lista é acerto — dois caminhos, uma resposta", () => {
  // O caso que o Bloco 3 ensinou sobre casas e agora vale para lances: as duas
  // torres chegam à coluna, e recusar uma delas ensinaria a adivinhar o autor.
  for (const dado of ALGUM) {
    for (const lance of lancesDoItem(dado)) {
      const depois = comLance(COMECO, dado, lance);
      assert.ok(depois.acertou, `${dado.id}: ${lance} devia ser aceito`);
      assert.equal(depois.tentativa, 1);
    }
  }
});

test("o lance legal fora do tema é julgado errado, e não estoura", () => {
  for (const dado of ALGUM.slice(0, 4)) {
    const depois = comLance(COMECO, dado, foraDoTema(dado));
    assert.equal(depois.acertou, false, `${dado.id}: lance fora do tema virou acerto`);
    assert.equal(depois.vereditos.at(-1), "fora", `${dado.id}: o veredito não é "fora"`);
    assert.equal(depois.tentativa, 1);
  }
});

test("o mesmo lance de novo não conta tentativa nova", () => {
  const dado = item();
  const errado = foraDoTema(dado);
  const uma = comLance(COMECO, dado, errado);
  const outra = comLance(uma, dado, errado);
  assert.equal(outra, uma, "o lance repetido criou estado novo");
  assert.equal(outra.tentativa, 1);
});

test("depois do acerto o tabuleiro continua vivo e o estado não muda", () => {
  const dado = item();
  const certo = comLance(COMECO, dado, lancesDoItem(dado)[0]);
  assert.ok(certo.acertou);
  const depois = comLance(certo, dado, foraDoTema(dado));
  assert.equal(depois, certo, "um lance depois do acerto virou tentativa errada");
  assert.equal(depois.tentativa, 1);
});

test("as tentativas contam lances diferentes, na ordem", () => {
  const dado = item();
  const aceitos = lancesDoItem(dado);
  const doTema = new Set([...aceitos, ...dado.lancesRecusados.map((r) => r.lance)]);
  const errados = new Chess(dado.fen)
    .moves({ verbose: true })
    .map(uciDe)
    .filter((l) => !doTema.has(l))
    .slice(0, 3);
  assert.ok(errados.length === 3, `${dado.id} não tem três lances fora do tema`);

  let estado = COMECO;
  for (const lance of errados) estado = comLance(estado, dado, lance);
  assert.equal(estado.tentativa, 3);
  assert.deepEqual(estado.jogados, errados);
  assert.equal(estado.acertou, false);

  estado = comLance(estado, dado, aceitos[0]);
  assert.equal(estado.tentativa, 4);
  assert.ok(estado.acertou);
});

test("a escada de apoio sobe um degrau por vez e para no topo", () => {
  let estado = COMECO;
  assert.equal(estado.apoio, 0);
  for (const esperado of [1, 2, 3]) {
    estado = comApoio(estado);
    assert.equal(estado.apoio, esperado);
  }
  const topo = comApoio(estado);
  assert.equal(topo, estado, "pedir apoio no topo mexeu no estado");
  assert.equal(topo.apoio, APOIO_MAXIMO);
});

test("o apoio não interfere no julgamento — pedir ajuda não é errar", () => {
  const dado = item();
  const comAjuda = comApoio(comApoio(COMECO));
  const depois = comLance(comAjuda, dado, lancesDoItem(dado)[0]);
  assert.ok(depois.acertou);
  assert.equal(depois.apoio, 2, "o nível de apoio se perdeu no lance");
  assert.equal(depois.tentativa, 1);
});

/**
 * O tabuleiro entrega origem e destino; o UCI aceito pode ter a promoção no
 * fim. Sem a casação por prefixo, o aluno que promovesse jogaria o lance certo
 * e o site diria que não é.
 */
test("o toque vira o lance aceito inteiro, com a promoção quando há", () => {
  assert.equal(uciDoToque("e7", "e8", ["e7e8q"]), "e7e8q");
  assert.equal(uciDoToque("f1", "d1", ["a1d1", "f1d1"]), "f1d1");
  // Lance fora da lista sai como o par que o tabuleiro deu: é o que vai para o
  // registro, e é ele que o professor lê quando procura o erro da turma.
  assert.equal(uciDoToque("e2", "e4", ["f1d1"]), "e2e4");
});

/**
 * O terceiro veredito, e o que ele existe para impedir.
 *
 * Um lance que aplica o tema e o motor reprovou **não** pode ser julgado como
 * "fora do tema": o aluno fez o que a dica manda. A tela precisa da terceira
 * frase, e quem lhe dá o direito de dizê-la é este julgamento.
 */
test("o lance que aplica o tema e o motor reprovou é `caro`, e não `fora`", () => {
  const comRecusado = ALGUM.filter((i) => i.lancesRecusados.length > 0);
  for (const dado of comRecusado) {
    for (const { lance, custo } of dado.lancesRecusados) {
      assert.equal(julgar(dado, lance), "caro", `${dado.id}: ${lance} devia ser caro`);
      assert.equal(custoDoRecusado(dado, lance), custo);
      const depois = comLance(COMECO, dado, lance);
      assert.equal(depois.acertou, false, `${dado.id}: lance caro não pode virar acerto`);
      assert.equal(depois.vereditos.at(-1), "caro");
      // E ele **conta** como tentativa: o aluno respondeu, e o professor tem de
      // ver que ele respondeu com o padrão certo na casa errada.
      assert.equal(depois.tentativa, 1);
    }
  }
  console.log(`  meio-jogo: ${comRecusado.length} exercício(s) com lance do tema que o motor recusa`);
});

test("os três vereditos cobrem todo lance legal, e não se sobrepõem", () => {
  for (const dado of ALGUM.slice(0, 6)) {
    const aceitos = lancesDoItem(dado);
    const recusados = dado.lancesRecusados.map((r) => r.lance);
    for (const lance of new Chess(dado.fen).moves({ verbose: true }).map(uciDe)) {
      const v = julgar(dado, lance);
      if (aceitos.includes(lance)) assert.equal(v, "certo", `${dado.id}/${lance}`);
      else if (recusados.includes(lance)) assert.equal(v, "caro", `${dado.id}/${lance}`);
      else assert.equal(v, "fora", `${dado.id}/${lance}`);
    }
    assert.equal(
      aceitos.filter((l) => recusados.includes(l)).length,
      0,
      `${dado.id}: um lance está nas duas listas`,
    );
  }
});

test("juiz que não existe estoura em vez de virar item sem lance", () => {
  assert.throws(() => contratoDoItem({ ...item(), tarefa: "tema-inventado" }), /tema-inventado/);
});
