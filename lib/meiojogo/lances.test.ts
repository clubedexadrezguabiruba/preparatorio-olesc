import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import { COR, MAPA, type Lado } from "./exercicios.ts";
import { JUIZES, juizDaDica, juizPorId, lancesQueAplicam, uciDe } from "./lances.ts";

/**
 * O contrato de cada juiz de lance, rodado.
 *
 * Mesma disciplina de `exercicios.test.ts`: dois dos campos do contrato são FEN
 * e resposta, e este arquivo os executa. A diferença é o que o contraexemplo
 * agora cobre — não só "a posição tem duas respostas", mas também "a posição
 * tem o traço e ninguém chega nele", que é o caso novo que o lance criou e o
 * clique não tinha.
 */

const UCI = /^[a-h][1-8][a-h][1-8][nbrq]?$/;

test("os juízes têm id único, e o id é o de uma tarefa", async () => {
  const ids = JUIZES.map((j) => j.id);
  assert.equal(new Set(ids).size, ids.length, `ids repetidos em ${ids.join(", ")}`);
  const { tarefaPorId } = await import("./exercicios.ts");
  for (const j of JUIZES) {
    assert.ok(tarefaPorId(j.id), `o juiz ${j.id} não corresponde a nenhuma tarefa`);
  }
});

test("cada dica servida por um juiz existe no MAPA, e só tem um juiz", () => {
  const vistas = new Map<string, string>();
  for (const j of JUIZES) {
    for (const dica of j.dicas) {
      assert.ok(
        MAPA.some((n) => n.dica === dica),
        `o juiz ${j.id} serve ${dica}, que não está no MAPA`,
      );
      const outro = vistas.get(dica);
      assert.equal(outro, undefined, `${dica} tem dois juízes: ${outro} e ${j.id}`);
      vistas.set(dica, j.id);
      assert.equal(juizDaDica(dica)?.id, j.id);
    }
  }
});

test("nenhum campo do contrato fica em branco", () => {
  for (const j of JUIZES) {
    const c = j.contrato;
    for (const [campo, texto] of Object.entries({
      aplica: c.aplica,
      naoAutoriza: c.naoAutoriza,
      lanceMultiplo: c.lanceMultiplo,
      enunciado: c.enunciado,
      foraDoTema: c.foraDoTema,
      custaCaro: c.custaCaro,
      porqueDoContraexemplo: c.contraexemplo.porque,
    })) {
      assert.ok(texto.trim().length >= 20, `${j.id}.${campo} tem menos de 20 caracteres`);
    }
  }
});

test("o exemplo de cada juiz devolve exatamente os lances que promete", () => {
  for (const j of JUIZES) {
    const { fen, lado, lances } = j.contrato.exemplo;
    assert.deepEqual(
      j.lances(fen, lado),
      [...lances],
      `o exemplo de ${j.id} não devolve o que o contrato promete`,
    );
    assert.ok(lances.length >= 1, `o exemplo de ${j.id} não tem lance nenhum`);
  }
});

test("o contraexemplo de cada juiz devolve vazio", () => {
  for (const j of JUIZES) {
    const { fen, lado } = j.contrato.contraexemplo;
    assert.deepEqual(
      j.lances(fen, lado),
      [],
      `o contraexemplo de ${j.id} devolve lance — ${j.contrato.contraexemplo.porque}`,
    );
  }
});

test("todo lance devolvido é UCI e é legal na posição", () => {
  for (const j of JUIZES) {
    const { fen, lado } = j.contrato.exemplo;
    const jogo = new Chess(fen);
    const legais = new Set(jogo.moves({ verbose: true }).map(uciDe));
    for (const lance of j.lances(fen, lado)) {
      assert.match(lance, UCI, `${j.id} devolveu ${lance}, que não é UCI`);
      assert.ok(legais.has(lance), `${j.id} devolveu ${lance}, que não é legal na posição`);
    }
  }
});

test("os lances vêm ordenados, e sem repetição", () => {
  for (const j of JUIZES) {
    const { fen, lado } = j.contrato.exemplo;
    const lances = j.lances(fen, lado);
    assert.deepEqual(lances, [...lances].sort(), `${j.id} devolveu fora de ordem`);
    assert.equal(new Set(lances).size, lances.length, `${j.id} repetiu lance`);
  }
});

/**
 * Dois lances que aplicam o tema são **uma** resposta com dois lances
 * aceitáveis, e não duas respostas — o caso que o Bloco 3 ensinou sobre casas e
 * que agora vale para lances. `peao-na-semiaberta` é quem o carrega: as duas
 * torres chegam a d1, e recusar uma delas ensinaria o aluno a adivinhar qual o
 * autor tinha em mente.
 */
test("resposta múltipla é uma resposta com vários lances, e não posição inutilizável", () => {
  const juiz = juizPorId("peao-na-semiaberta");
  assert.ok(juiz);
  const { fen, lado } = juiz.contrato.exemplo;
  assert.equal(juiz.lances(fen, lado).length, 2, "as duas torres deveriam contar");
});

test("não é a vez de quem joga o tema, então não há lance", () => {
  for (const j of JUIZES) {
    const { fen, lado } = j.contrato.exemplo;
    const jogo = new Chess(fen);
    const quem = j.quemJoga(lado);
    assert.equal(
      jogo.turn(),
      COR[quem],
      `o exemplo de ${j.id} está com a vez errada — o tema é de ${quem}`,
    );
    // A mesma posição com a vez trocada não pode devolver lance nenhum: quem
    // joga é o outro, e o tema não é dele.
    const trocada = fen.replace(/ (w|b) /, jogo.turn() === "w" ? " b " : " w ");
    let legal = true;
    try {
      new Chess(trocada);
    } catch {
      legal = false;
    }
    if (legal) {
      assert.deepEqual(
        j.lances(trocada, lado),
        [],
        `${j.id} devolveu lance com a vez do adversário`,
      );
    }
  }
});

test("lancesQueAplicam despacha pelo id, e devolve vazio para id desconhecido", () => {
  for (const j of JUIZES) {
    const { fen, lado } = j.contrato.exemplo;
    assert.deepEqual(lancesQueAplicam(fen, j.id, lado), j.lances(fen, lado));
  }
  assert.deepEqual(lancesQueAplicam("8/8/8/8/8/8/8/K6k w - - 0 1", "nao-existe", "brancas"), []);
});

/**
 * A regra "chegar, e não estar", provada onde ela morde: uma torre que já mora
 * na coluna aberta e desliza dentro dela não aplica o tema.
 */
test("deslizar dentro da coluna aberta não conta como ocupá-la", () => {
  const juiz = juizPorId("coluna-aberta");
  assert.ok(juiz);
  // A coluna d é a única aberta; a torre branca já está em d1.
  const fen = "4k3/pp3ppp/8/8/8/8/PP3PPP/3RK3 w - - 0 1";
  const lado: Lado = "brancas";
  const jogo = new Chess(fen);
  const desliza = jogo.moves({ verbose: true }).filter((m) => m.from === "d1" && m.to[0] === "d");
  assert.ok(desliza.length > 0, "a posição precisa ter deslize de torre na coluna d");
  assert.deepEqual(juiz.lances(fen, lado), [], "o deslize não pode contar como ocupar a coluna");
});
