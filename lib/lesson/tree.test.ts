import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Chess } from "chess.js";
import { expectSchema, lessonSchema } from "./schema.ts";
import { isPraise, judgeMove, respostasDe, throwsWinAway } from "./tree.ts";

/**
 * A tabela da §3.2 do plano, linha por linha, rodando sobre a aula de verdade:
 * método avança, erro nomeado tem texto próprio, e os dois fallbacks honestos
 * cobrem todo o resto. É o que o aluno vai ouvir a cada lance — e o que
 * garante que **nenhum** lance recusado saia sem mensagem.
 */

/**
 * **A aula vem de `content/fixtures/`, e não de `content/lessons/`.**
 *
 * Ela vinha da `N0-R-MATE`, uma aula publicada de verdade, e isso era um
 * acoplamento que a demolição de 2026-09-08 expôs da pior maneira: o corpus
 * saiu do disco e cinco arquivos de teste do **motor** ficaram vermelhos de uma
 * vez, sem que nenhuma regra de motor tivesse mudado.
 *
 * A `N1-FIXTURE-KRK` é a árvore com ajuda daquela aula sobre uma posição
 * sintética (`pos-fx-krk-caixa`, sem obra e sem procedência): os textos são
 * nossos, a geometria é a do mate de torre genérico, e nada nela cita livro
 * nenhum. O que se afirma aqui é sobre o `judgeMove`, não sobre o currículo —
 * e agora o arquivo diz isso.
 */
const lesson = lessonSchema.parse(
  JSON.parse(
    readFileSync(path.join(process.cwd(), "content/fixtures/lessons/N1-FIXTURE-KRK.json"), "utf8"),
  ),
);
const guided = lesson.stages.guided!;
const root = guided.nodes[guided.root];

/** A FEN depois de um lance UCI — só para montar nós de teste. */
function applyMove(fen: string, uci: string): string {
  const game = new Chess(fen);
  game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
  return game.fen();
}

function legalMoves(fen: string): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((move) => `${move.from}${move.to}${move.promotion ?? ""}`);
}

/**
 * O primeiro erro nomeado da raiz, procurado em vez de fixado à mão: a posição
 * de ensino já mudou duas vezes, e a cada troca estes testes quebravam por
 * causa de um literal, não de um defeito.
 */
const erroDaRaiz = (root.mistakes ?? [])[0];

test("lance do método: avança e traz a resposta do defensor", () => {
  const esperado = root.expects[0];
  const verdict = judgeMove(lesson, root, esperado.moves[0]);
  assert.equal(verdict.kind, "method");
  assert.deepEqual(verdict.respostas, respostasDe(esperado));
  assert.deepEqual(verdict.respostas, [{ reply: esperado.reply, next: esperado.next }]);
  assert.equal(throwsWinAway(verdict), false);
});

test("erro nomeado: devolve o texto declarado na aula, não um genérico", () => {
  assert.ok(erroDaRaiz, "o nó raiz precisa ter ao menos um erro nomeado");
  const verdict = judgeMove(lesson, root, erroDaRaiz.moves[0]);
  assert.equal(verdict.kind, "named-error");
  assert.equal(verdict.errorId, erroDaRaiz.errorId);
  assert.equal(verdict.text, lesson.errors[erroDaRaiz.errorId].text);
  assert.notEqual(verdict.text, lesson.fallbacks.winningOffMethod);
  assert.notEqual(verdict.text, lesson.fallbacks.losesWin);
});

test("lance que ganha mas não é o método: fallback honesto de off-method", () => {
  const naoListado = root.winningMoves.filter(
    (move) =>
      !root.expects.some((e) => e.moves.includes(move)) &&
      !(root.mistakes ?? []).some((m) => m.moves.includes(move)),
  );
  assert.ok(naoListado.length > 0, "o nó raiz precisa ter algum lance vencedor fora das listas");

  const verdict = judgeMove(lesson, root, naoListado[0]);
  assert.equal(verdict.kind, "off-method");
  assert.equal(verdict.text, lesson.fallbacks.winningOffMethod);
  assert.equal(throwsWinAway(verdict), false);
});

test("lance que joga a vitória fora: fallback honesto de loses-win", () => {
  // A raiz do mate de torre é generosa demais (todo lance legal ainda ganha),
  // então o caso vem do primeiro nó em que existe lance perdedor *sem* erro
  // nomeado. Na etapa 3 não há nenhum — o garimpo do B5 nomeou todos os
  // perdedores dos treze nós, e é bom que seja assim: fallback genérico é o
  // que sobra, não o que se planeja. Por isso a busca varre as duas árvores.
  // Varria as duas árvores; hoje há uma só — a etapa 4 saiu do formato.
  const encontrado = Object.values(guided.nodes)
    .flatMap((node) =>
      legalMoves(node.fen)
        .filter(
          (move) =>
            !node.winningMoves.includes(move) &&
            !(node.mistakes ?? []).some((m) => m.moves.includes(move)),
        )
        .map((move) => ({ node, move })),
    )
    .at(0);
  assert.ok(encontrado, "a árvore precisa ter ao menos um lance que perde a vitória");

  const verdict = judgeMove(lesson, encontrado.node, encontrado.move);
  assert.equal(verdict.kind, "loses-win");
  assert.equal(verdict.text, lesson.fallbacks.losesWin);
  assert.equal(throwsWinAway(verdict), true);
});

test("o lance equivalente gerado é método, e a aula segue", () => {
  // Nenhuma das quatro posições garimpadas no B5 rende ramo equivalente: nelas
  // cada corte é geometricamente único, e a derivação conferiu isso (`Rg1` em
  // vez de `Ra7` não separa os dois reis, então não é corte). O veredito é
  // testado num nó montado à mão — é o que o gerador escreveria se houvesse —
  // pelo mesmo caminho que os testes da etapa 3 já usavam.
  // Não é elogio e volta: é um expect de verdade, com resposta e nó seguinte.
  //
  // O lance do ramo e a resposta são **procurados**, não fixados: um literal
  // aqui quebra toda vez que a posição da etapa 4 muda, e já quebrou.
  const doRoteiro = root.expects[0];
  const inventado = root.winningMoves.find((move) => !doRoteiro.moves.includes(move));
  assert.ok(inventado, "a raiz precisa ter mais de um lance que ganha");
  const respostaInventada = legalMoves(applyMove(root.fen, inventado))[0];
  const comRamo = {
    ...root,
    expects: [
      ...root.expects,
      { moves: [inventado], reply: respostaInventada, next: "g1", feedback: "ramo equivalente", generated: true as const },
    ],
  };
  const verdict = judgeMove(lesson, comRamo, inventado);
  assert.equal(verdict.kind, "method");
  assert.equal(verdict.respostas[0].reply, respostaInventada);
  assert.match(verdict.respostas[0].next, /^g\d+$/);
  assert.equal(throwsWinAway(verdict), false);

  // E o lance do roteiro continua sendo o do roteiro.
  const roteiro = judgeMove(lesson, comRamo, doRoteiro.moves[0]);
  assert.equal(roteiro.kind, "method");
  assert.equal(roteiro.respostas[0].next, doRoteiro.next);
});

test("a linha da árvore leva ao fim sem sair dela", () => {
  // Rodava sobre a etapa 4 e contra o `moveLimit` dela. A etapa saiu do
  // formato e o teto com ela: quem limita a partida sem ajuda hoje é a regra
  // de falta de progresso do `PracticeStage`, não um número no arquivo. O que
  // sobra — e é o que este teste sempre mediu de verdade — é que a linha
  // escrita chega ao fim sem apontar para nó inexistente.
  let node = root;
  const linha: string[] = [];
  const TETO = Object.keys(guided.nodes).length + 5;
  for (let passo = 0; passo <= TETO; passo += 1) {
    const expect = node.expects.find((e) => e.generated) ?? node.expects[0];
    linha.push(expect.moves[0]);
    if (!expect.next) break;
    const seguinte = guided.nodes[expect.next];
    assert.ok(seguinte, `o nó "${expect.next}" existe`);
    node = seguinte;
  }
  assert.equal(linha[0], root.expects[0].moves[0]);
  assert.ok(
    new Chess(root.fen).moves({ verbose: true }).some((m) => `${m.from}${m.to}` === linha[0]),
    "o primeiro lance da linha é legal na raiz",
  );
  assert.ok(linha.length <= TETO, `${linha.length} lances, sem ciclo`);
  console.log(`  linha da árvore: ${linha.join(" ")}`);
});

test("etapa 3: a mesma técnica por outro caminho é elogiada, e a peça volta", () => {
  // A aula N0-R-MATE não tem alternativa em nenhum nó da etapa 3 (a derivação
  // conferiu: os outros cortes deixam caixa maior). O veredito é testado num
  // nó montado à mão, que é o que o gerador escreveria se houvesse — e o lance
  // é procurado entre os que a raiz de fato aceita, para o teste não passar a
  // fingir sobre um lance ilegal quando a posição de ensino mudar.
  const alternativa = root.winningMoves.find(
    (move) =>
      !root.expects.some((e) => e.moves.includes(move)) &&
      !(root.mistakes ?? []).some((m) => m.moves.includes(move)),
  );
  assert.ok(alternativa, "a raiz precisa ter um lance vencedor fora das listas");
  const node = { ...root, methodAlternatives: [alternativa] };
  const verdict = judgeMove(lesson, node, alternativa);
  assert.equal(verdict.kind, "method-alternative");
  assert.equal(verdict.text, lesson.fallbacks.methodAlternative);
  assert.equal(throwsWinAway(verdict), false);
});

test("etapa 3: erro nomeado da autoria vence a alternativa — o autor manda", () => {
  const move = erroDaRaiz.moves[0];
  const node = { ...root, methodAlternatives: [move] };
  const verdict = judgeMove(lesson, node, move);
  assert.equal(verdict.kind, "named-error");
  assert.equal(verdict.errorId, erroDaRaiz.errorId);
});

/* ------------------------------------------------------------------ *
 * B8.2 — "este lance também vale"
 * ------------------------------------------------------------------ */

/**
 * O caso de verdade que este bloco precisa: um nó em que o **mesmo lance** está
 * em `mistakes` e em `winningMoves` — um lance que ganha e é tratado como erro,
 * que é a queixa que abriu o B8.
 *
 * O nó e o lance são procurados na aula, e não escritos aqui. Já foram: a
 * primeira versão fixava dois lances da raiz da aula da dama, e o bloco inteiro
 * morreu no dia em que essa aula saiu do corpus.
 */
const casoDoLanceQueGanhaEErro = Object.values(guided.nodes)
  .flatMap((node) =>
    (node.mistakes ?? []).flatMap((mistake) =>
      mistake.moves
        .filter(
          (move) =>
            node.winningMoves.includes(move) &&
            lesson.errors[mistake.errorId].verdict === "off-method",
        )
        .map((move) => ({ node, move, errorId: mistake.errorId })),
    ),
  )
  .at(0);
assert.ok(
  casoDoLanceQueGanhaEErro,
  "a etapa 3 precisa de ao menos um lance que ganha e é tratado como erro",
);
const { node: erroN1, move: lanceQueGanhaEErro, errorId: erroDoLance } = casoDoLanceQueGanhaEErro;

/** Um segundo lance do mesmo tipo, para o teste dos dois textos. */
const outroLanceQueGanhaEErro = (erroN1.mistakes ?? [])
  .flatMap((m) => m.moves)
  .find((move) => move !== lanceQueGanhaEErro && erroN1.winningMoves.includes(move));
assert.ok(outroLanceQueGanhaEErro, "o nó precisa de dois lances desse tipo");

test("o lance declarado válido é elogiado com o texto do autor, não com o genérico", () => {
  const move = lanceQueGanhaEErro;
  assert.ok(erroN1.winningMoves.includes(move), "o lance do teste precisa ganhar");

  const meuTexto = "Também é corte, e aperta a caixa igual — guarde a ideia.";
  const node = {
    ...erroN1,
    // Aceitar um lance que era erro é **mover** de uma lista para a outra.
    mistakes: (erroN1.mistakes ?? []).map((m) => ({
      ...m,
      moves: m.moves.filter((x) => x !== move),
    })).filter((m) => m.moves.length > 0),
    authorAlternatives: [{ moves: [move], feedback: meuTexto }],
  };

  const verdict = judgeMove(lesson, node, move);
  assert.equal(verdict.kind, "author-alternative");
  assert.equal(verdict.text, meuTexto);
  assert.notEqual(verdict.text, lesson.fallbacks.methodAlternative);
  assert.notEqual(verdict.text, lesson.fallbacks.winningOffMethod);
  assert.equal(throwsWinAway(verdict), false);
  assert.equal(isPraise(verdict), true);
});

test("sem o campo, o mesmo lance continua sendo a repreensão de hoje", () => {
  // O contraste que dá sentido ao bloco: é este texto que o aluno lê hoje ao
  // jogar um lance que ganha.
  const verdict = judgeMove(lesson, erroN1, lanceQueGanhaEErro);
  assert.equal(verdict.kind, "named-error");
  assert.equal(verdict.errorId, erroDoLance);
  assert.equal(verdict.preservesWin, true);
});

test("a declaração da autoria não encerra a tentativa", () => {
  // Rodava na raiz da etapa 4, onde `methodAlternatives` era proibido e o
  // `authorAlternatives` era o único elogio possível. A etapa saiu; o que o
  // teste mede — que um lance declarado pela autoria é elogio e **não** joga a
  // vitória fora — vale igual na árvore que restou.
  const move = root.winningMoves.find(
    (m) =>
      !root.expects.some((e) => e.moves.includes(m)) &&
      !(root.mistakes ?? []).some((x) => x.moves.includes(m)),
  );
  assert.ok(move, "a raiz precisa de um lance vencedor fora das listas");

  const node = { ...root, authorAlternatives: [{ moves: [move], feedback: "vale igual" }] };
  const verdict = judgeMove(lesson, node, move);
  assert.equal(verdict.kind, "author-alternative");
  assert.equal(verdict.text, "vale igual");
  assert.equal(throwsWinAway(verdict), false);
});

test("mais de um lance declarado, cada um com o seu texto", () => {
  const node = {
    ...erroN1,
    mistakes: [],
    authorAlternatives: [
      { moves: [lanceQueGanhaEErro], feedback: "primeiro texto" },
      { moves: [outroLanceQueGanhaEErro], feedback: "segundo texto" },
    ],
  };
  assert.equal((judgeMove(lesson, node, lanceQueGanhaEErro) as { text: string }).text, "primeiro texto");
  assert.equal((judgeMove(lesson, node, outroLanceQueGanhaEErro) as { text: string }).text, "segundo texto");
});

test("o lance do roteiro continua vencendo a declaração", () => {
  const roteiro = erroN1.expects[0].moves[0];
  const node = { ...erroN1, authorAlternatives: [{ moves: [roteiro], feedback: "não devia aparecer" }] };
  const verdict = judgeMove(lesson, node, roteiro);
  assert.equal(verdict.kind, "method", "expects é consultado primeiro, e a aula avança");
});

test("o erro nomeado continua vencendo a declaração", () => {
  // O gate recusa esse arquivo (ALTERNATIVA_E_ERRO). Em runtime a ordem é
  // defensiva: se as duas listas se contradisserem, o erro nomeado manda.
  const node = { ...erroN1, authorAlternatives: [{ moves: [lanceQueGanhaEErro], feedback: "não devia aparecer" }] };
  const verdict = judgeMove(lesson, node, lanceQueGanhaEErro);
  assert.equal(verdict.kind, "named-error");
});

test("nenhum lance legal da árvore fica sem mensagem", () => {
  let julgados = 0;
  for (const tree of [guided]) {
    for (const node of Object.values(tree.nodes)) {
      for (const move of legalMoves(node.fen)) {
        const verdict = judgeMove(lesson, node, move);
        const texto = verdict.kind === "method" ? verdict.feedback : verdict.text;
        assert.ok(texto.length > 0, `lance ${move} sem texto`);
        julgados += 1;
      }
    }
  }
  assert.ok(julgados > 300, `poucos lances julgados: ${julgados}`);
  console.log(`  ${julgados} lances legais julgados, todos com mensagem`);
});

/* ------------------------------------------------------------------ *
 * As variantes do defensor (B9/E1)
 * ------------------------------------------------------------------ */

test("respostasDe: as três formas do expect, e só elas", () => {
  const feedback = "texto";
  // Terminal: o lance deu mate, não há resposta.
  assert.deepEqual(respostasDe({ moves: ["a1a8"], feedback }), []);
  // Única: a escrita de 100% do corpus de hoje.
  assert.deepEqual(respostasDe({ moves: ["a1a7"], reply: "h8g8", next: "s2", feedback }), [
    { reply: "h8g8", next: "s2" },
  ]);
  // Múltipla: o defensor escolhe.
  const varias = [
    { reply: "h8g8", next: "s2" },
    { reply: "h8h7", next: "s3" },
  ];
  assert.deepEqual(respostasDe({ moves: ["a1a7"], replies: varias, feedback }), varias);
});

test("o schema aceita as três formas e recusa a mistura", () => {
  const base = { moves: ["a1a7"], feedback: "texto" };
  const forma = (extra: Record<string, unknown>) =>
    expectSchema.safeParse({ ...base, ...extra }).success;

  assert.equal(forma({}), true, "terminal");
  assert.equal(forma({ reply: "h8g8", next: "s2" }), true, "única");
  assert.equal(
    forma({ replies: [{ reply: "h8g8", next: "s2" }, { reply: "h8h7", next: "s3" }] }),
    true,
    "múltipla",
  );

  assert.equal(forma({ reply: "h8g8" }), false, "reply sem next");
  assert.equal(forma({ next: "s2" }), false, "next sem reply");
  // Uma variante só se escreve em `reply`: o min(2) mata a lista de um item
  // sem precisar de regra de gate.
  assert.equal(forma({ replies: [{ reply: "h8g8", next: "s2" }] }), false, "replies de um item");
  assert.equal(
    forma({
      reply: "h8g8",
      next: "s2",
      replies: [{ reply: "h8g8", next: "s2" }, { reply: "h8h7", next: "s3" }],
    }),
    false,
    "as duas escritas juntas",
  );
});

test("a árvore não muda de forma: toda resposta ainda é única", () => {
  // O contrato de E1 é este: `replies` é opcional e a árvore escrita não muda
  // um byte. No dia em que a primeira variante for escrita, este número muda
  // junto com o arquivo — e é aí que ele vira o aviso certo.
  //
  // O número caiu de 20 para 15 quando a fixture passou a ser a fonte: eram
  // duas árvores da aula publicada (33 nós), hoje é uma (20). O que o teste
  // afirma continua o mesmo; o que mudou é o tamanho do que ele varre.
  let unicas = 0;
  for (const node of Object.values(guided.nodes)) {
    for (const expect of node.expects) {
      assert.equal(expect.replies, undefined, "a árvore da fixture não usa replies ainda");
      if (respostasDe(expect).length === 1) unicas += 1;
    }
  }
  assert.ok(unicas > 15, `poucas respostas únicas na árvore: ${unicas}`);
});
