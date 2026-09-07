import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess, type Square } from "chess.js";
import { validarDicas, type ItemDeReconhecimento } from "./dicas.ts";
import { APOIO_MAXIMO, COMECO, casasAceitas, comApoio, comClique } from "./tentativa.ts";

/**
 * O caminho do clique, do toque na casa ao que vai virar linha no banco.
 *
 * Os itens são os publicados, e não fixtures: o que a tela vai receber é isto,
 * e um teste sobre uma posição inventada provaria a máquina de estado sem
 * provar que ela trabalha no conteúdo de verdade.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const DICAS = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content/meio-jogo.json"), "utf8")),
);

const ITENS = new Map<string, ItemDeReconhecimento>(
  DICAS.flatMap((d) => (d.treino?.reconhecimento ?? []).map((i) => [i.id, i] as const)),
);

const item = (id: string): ItemDeReconhecimento => {
  const encontrado = ITENS.get(id);
  assert.ok(encontrado, `o item ${id} sumiu do conteúdo`);
  return encontrado;
};

/** Uma casa vazia que não é resposta — o clique que o `events.select` produz. */
function casaVaziaFora(dado: ItemDeReconhecimento): string {
  const jogo = new Chess(dado.fen);
  for (const coluna of "abcdefgh") {
    for (let fileira = 1; fileira <= 8; fileira += 1) {
      const casa = `${coluna}${fileira}`;
      if (!jogo.get(casa as Square) && !dado.resposta.includes(casa)) return casa;
    }
  }
  throw new Error(`${dado.id} não tem casa vazia fora da resposta`);
}

test("qualquer casa do grupo é acerto — a resposta de oito casas da coluna aberta", () => {
  const coluna = item("m9-d2-a");
  assert.equal(coluna.resposta.length, 8, "m9-d2-a deixou de ser a resposta de coluna inteira");
  for (const casa of coluna.resposta) {
    const depois = comClique(COMECO, coluna, casa);
    assert.ok(depois.acertou, `${casa} devia ser aceita`);
    assert.equal(depois.tentativa, 1);
  }
});

test("o clique em casa vazia é julgado errado, e não estoura", () => {
  // É o caso que o `events.select` do chessground cria e o `movable.after` não
  // criaria: ele dispara em casa sem peça nenhuma (`dist/board.js:179`). Antes
  // de existir tela, o juiz tem de responder "errou" a isso.
  for (const id of ["m12-d2-a", "m15-d3-a", "m16-d2-b"]) {
    const dado = item(id);
    const depois = comClique(COMECO, dado, casaVaziaFora(dado));
    assert.equal(depois.acertou, false, `${id}: casa vazia virou acerto`);
    assert.equal(depois.tentativa, 1);
  }
});

test("o segundo toque na mesma casa não conta tentativa nova", () => {
  const dado = item("m12-d2-a");
  const errada = casaVaziaFora(dado);
  const uma = comClique(COMECO, dado, errada);
  const outra = comClique(uma, dado, errada);
  assert.equal(outra, uma, "o toque repetido criou estado novo");
  assert.equal(outra.tentativa, 1);
});

test("depois do acerto o tabuleiro continua clicável e o estado não muda", () => {
  const dado = item("m12-d2-a");
  const certo = comClique(COMECO, dado, dado.resposta[0]);
  assert.ok(certo.acertou);
  const depois = comClique(certo, dado, casaVaziaFora(dado));
  assert.equal(depois, certo, "um passeio pelas casas virou tentativa errada");
  assert.equal(depois.tentativa, 1);
});

test("as tentativas contam respostas diferentes, na ordem", () => {
  const dado = item("m10-d2-a");
  const jogo = new Chess(dado.fen);
  const erradas = "abcdefgh"
    .split("")
    .flatMap((c) => [1, 2, 3, 4, 5, 6, 7, 8].map((f) => `${c}${f}`))
    .filter((casa) => !jogo.get(casa as Square) && !dado.resposta.includes(casa))
    .slice(0, 3);

  let estado = COMECO;
  for (const casa of erradas) estado = comClique(estado, dado, casa);
  assert.equal(estado.tentativa, 3);
  assert.deepEqual(estado.tocadas, erradas);
  assert.equal(estado.acertou, false);

  estado = comClique(estado, dado, dado.resposta[0]);
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
  const dado = item("m15-d2-a");
  const comAjuda = comApoio(comApoio(COMECO));
  const depois = comClique(comAjuda, dado, dado.resposta[0]);
  assert.ok(depois.acertou);
  assert.equal(depois.apoio, 2, "o nível de apoio se perdeu no clique");
  assert.equal(depois.tentativa, 1);
});

test("tarefa que não existe estoura em vez de virar item sem resposta", () => {
  assert.throws(
    () => casasAceitas({ ...item("m12-d2-a"), tarefa: "peao-inventado" }),
    /peao-inventado/,
  );
});
