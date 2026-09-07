import assert from "node:assert/strict";
import test from "node:test";
import { fenProblem } from "../chess/fen.ts";
import { DICAS } from "./conteudo.ts";
import {
  comTarefa,
  MAPA,
  respostaDaTarefa,
  TAREFAS,
  tarefaPorId,
  type Tarefa,
} from "./exercicios.ts";

/**
 * O contrato de cada tarefa, rodado.
 *
 * A revisão pediu que cada tarefa dissesse por escrito o que mede e o que não
 * autoriza concluir. Prosa sozinha apodrece: a implementação muda, o contrato
 * fica, e ninguém percebe até o relatório do professor afirmar uma coisa que o
 * clique não provou. Por isso dois dos sete campos são **FEN e resposta**, e
 * este arquivo os executa — o contrato é o teste.
 *
 * Cada tarefa tem os dois lados obrigatórios:
 *
 * - **favorável** — o `exemplo` do contrato devolve exatamente a resposta que
 *   ele promete;
 * - **adversarial** — o `contraexemplo` devolve vazio, porque a posição admite
 *   mais de uma resposta certa (ou nenhuma). É o caso que o aluno encontraria
 *   na tela como "acertei e o site disse que errei".
 */

const CASA = /^[a-h][1-8]$/;

test("as tarefas têm id único", () => {
  const ids = TAREFAS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, `ids repetidos em ${ids.join(", ")}`);
  assert.ok(TAREFAS.length >= 12, `só ${TAREFAS.length} tarefas escritas`);
});

test("nenhum campo do contrato fica em branco", () => {
  // Sete campos, e o gate os cobra porque o custo de esquecer um só aparece
  // meses depois: a tarefa sem `naoAutoriza` é a que o relatório superinterpreta.
  for (const tarefa of TAREFAS) {
    const c = tarefa.contrato;
    for (const [campo, valor] of Object.entries({
      mede: c.mede,
      naoAutoriza: c.naoAutoriza,
      respostaMultipla: c.respostaMultipla,
      enunciado: c.enunciado,
      feedback: c.feedback,
    })) {
      assert.ok(valor.length >= 30, `${tarefa.id}: o campo "${campo}" tem ${valor.length} caracteres`);
    }
  }
});

test("o enunciado é uma instrução curta, e não um parágrafo", () => {
  // A frase que o aluno de doze anos lê antes de tocar no tabuleiro. Passando de
  // duas linhas de celular ela deixa de ser instrução e vira leitura.
  for (const tarefa of TAREFAS) {
    assert.ok(
      tarefa.contrato.enunciado.length <= 130,
      `${tarefa.id}: enunciado de ${tarefa.contrato.enunciado.length} caracteres`,
    );
  }
});

test("nenhum enunciado usa o termo antes da descrição concreta", () => {
  // A regra de adequação ao iniciante: "nesta coluna não há nenhum peão" antes
  // de "coluna aberta", e o termo entra colado à imagem — na explicação, não no
  // enunciado. Muitos verão estes conceitos pela primeira vez.
  const jargao = [
    "isolado",
    "semiaberta",
    "dobrado",
    "posto",
    "retardatário",
    "passado",
    "bispo mau",
    "retardatario",
  ];
  for (const tarefa of TAREFAS) {
    const enunciado = tarefa.contrato.enunciado.toLowerCase();
    for (const termo of jargao) {
      assert.ok(
        !enunciado.includes(termo),
        `${tarefa.id}: o enunciado usa "${termo}" — o termo vai na explicação, não na instrução`,
      );
    }
  }
});

test("as FENs do contrato são legais", () => {
  for (const tarefa of TAREFAS) {
    for (const [qual, fen] of [
      ["exemplo", tarefa.contrato.exemplo.fen],
      ["contraexemplo", tarefa.contrato.contraexemplo.fen],
    ] as const) {
      assert.equal(fenProblem(fen), null, `${tarefa.id} / ${qual}: ${fenProblem(fen)}`);
    }
  }
});

test("o caso favorável: o exemplo devolve a resposta que o contrato promete", () => {
  for (const tarefa of TAREFAS) {
    const { fen, lado, resposta } = tarefa.contrato.exemplo;
    assert.deepEqual(
      respostaDaTarefa(fen, tarefa, lado),
      [...resposta].sort(),
      `${tarefa.id}: o exemplo do contrato não devolve o que ele diz`,
    );
    for (const casa of resposta) assert.match(casa, CASA, `${tarefa.id}: "${casa}" não é casa`);
  }
});

test("o caso adversarial: o contraexemplo não vira item", () => {
  // Aqui está o defeito que a tarefa existe para não cometer. Uma posição com
  // duas respostas certas vira, na tela, um aluno que acerta e é recusado.
  for (const tarefa of TAREFAS) {
    const { fen, lado } = tarefa.contrato.contraexemplo;
    assert.deepEqual(
      respostaDaTarefa(fen, tarefa, lado),
      [],
      `${tarefa.id}: o contraexemplo "${tarefa.contrato.contraexemplo.porque}" virou item`,
    );
    assert.notEqual(
      tarefa.grupos(fen, lado).length,
      1,
      `${tarefa.id}: o contraexemplo tem um grupo só — ele não é contraexemplo`,
    );
  }
});

test("resposta múltipla devolve vazio, e não a primeira que aparecer", () => {
  // A tentação óbvia é `grupos[0]`. Ela é errada e o erro é silencioso: o item
  // entra no conteúdo com uma resposta certa entre duas, e quem descobre é o
  // aluno que clicou na outra.
  const doisIsolados = "4k3/8/8/8/8/8/P1P5/4K3 w - - 0 1";
  const isolado = tarefaPorId("peao-isolado") as Tarefa;
  assert.equal(isolado.grupos(doisIsolados, "brancas").length, 2);
  assert.deepEqual(respostaDaTarefa(doisIsolados, isolado, "brancas"), []);
});

test("posição em que o traço não existe também devolve vazio", () => {
  // O outro jeito de a posição não servir. Os dois casos devolvem a mesma
  // coisa de propósito: quem escolhe posição não precisa distingui-los.
  const semIsolado = "4k3/8/8/8/8/8/PP6/4K3 w - - 0 1";
  const isolado = tarefaPorId("peao-isolado") as Tarefa;
  assert.equal(isolado.grupos(semIsolado, "brancas").length, 0);
  assert.deepEqual(respostaDaTarefa(semIsolado, isolado, "brancas"), []);
});

test("o lado importa: a mesma posição responde diferente para cada cor", () => {
  // Sem isto, um item de reconhecimento poderia aceitar o peão isolado **dele**
  // como resposta a "toque no seu peão isolado".
  const fen = "4k3/p1p5/8/8/8/8/1P6/4K3 w - - 0 1";
  const isolado = tarefaPorId("peao-isolado") as Tarefa;
  assert.deepEqual(respostaDaTarefa(fen, isolado, "brancas"), ["b2"]);
  assert.deepEqual(respostaDaTarefa(fen, isolado, "pretas"), []); // a7 e c7 são dois
});

test("`peca-com-menos-lances` só conta para quem tem a vez", () => {
  // A afirmação `lances-da-peca` já recusa contar lances de quem não joga, e a
  // tarefa herda a recusa: a conta de mobilidade do lado parado não existe.
  const fen = "r2q1rk1/pb2bppp/1p2pn2/8/1nBP4/2N1BN2/PP2QPPP/R2R2K1 w - - 0 1";
  const tarefa = tarefaPorId("peca-com-menos-lances") as Tarefa;
  assert.ok(respostaDaTarefa(fen, tarefa, "brancas").length > 0);
  assert.deepEqual(respostaDaTarefa(fen, tarefa, "pretas"), []);
});

/* ------------------------------------------------------------------ *
 * O mapa das 30
 * ------------------------------------------------------------------ */

test("o mapa cobre as 30 dicas, uma vez cada", () => {
  const ids = MAPA.map((n) => n.dica);
  assert.equal(ids.length, DICAS.length, `o mapa tem ${ids.length} entradas para ${DICAS.length} dicas`);
  assert.equal(new Set(ids).size, ids.length, "há dica repetida no mapa");
  for (const dica of DICAS) {
    assert.ok(ids.includes(dica.id), `${dica.id} não está no mapa`);
  }
});

test("toda tarefa nomeada no mapa existe, e todo `porque` está escrito", () => {
  for (const no of MAPA) {
    if (no.tarefa !== null) {
      assert.ok(tarefaPorId(no.tarefa), `${no.dica} aponta a tarefa "${no.tarefa}", que não existe`);
    }
    assert.ok(no.porque.length >= 30, `${no.dica}: o "porque" tem ${no.porque.length} caracteres`);
  }
});

test("nenhuma dupla de dicas recebe o mesmo exercício", () => {
  // "Uma tarefa por objetivo, não por traço": m12 e m28 usam `peao-isolado` e
  // não podem receber o mesmo item. O que os separa é o `alvo` — o isolado dele
  // contra o seu —, e o par (tarefa, alvo) é o que o teste vigia.
  const vistos = new Map<string, string>();
  for (const no of MAPA) {
    if (no.tarefa === null) continue;
    const chave = `${no.tarefa}/${no.alvo}`;
    const antes = vistos.get(chave);
    assert.equal(antes, undefined, `${no.dica} e ${antes} pediriam o mesmo exercício (${chave})`);
    vistos.set(chave, no.dica);
  }
});

test("os oito conceitos da fatia do piloto têm tarefa", () => {
  // É o achado que o Bloco 3 precisava antes de curar posição: se um dos oito
  // não tivesse fato conferível, ele sairia da fatia — e a fatia tem exatamente
  // oito.
  const fatia = ["m9", "m10", "m11", "m12", "m13", "m14", "m15", "m16"];
  for (const id of fatia) {
    const no = MAPA.find((n) => n.dica === id);
    assert.ok(no?.tarefa, `${id} está na fatia do piloto e não tem tarefa`);
  }
});

test("a reclassificação é impressa, para o número não se perder", () => {
  // Não reprova nada. Existe para o `npm test` de toda quinta imprimir a conta
  // que a revisão pediu — e para ela mudar à vista de todos quando mudar.
  const com = comTarefa().map((n) => n.dica);
  const sem = MAPA.filter((n) => n.tarefa === null).map((n) => n.dica);
  console.log(`  meio-jogo: ${com.length} dicas com fato conferível (${com.join(", ")})`);
  console.log(`  meio-jogo: ${sem.length} sem, e nelas o juiz é a autoria (${sem.join(", ")})`);
  assert.equal(com.length + sem.length, 30);
});
