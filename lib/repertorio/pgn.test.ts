import assert from "node:assert/strict";
import test from "node:test";
import { Chess } from "chess.js";
import {
  apenasLances,
  embrulhar,
  lerPgn,
  lerPgns,
  recortarJogos,
  type LancePgn,
} from "./pgn.ts";

/**
 * O leitor de PGN do repertório.
 *
 * Os oito primeiros testes são os do Laboratório de Finais, de onde o leitor
 * foi copiado: eles são o contrato do que a cópia não pode perder. Os de baixo
 * medem o que **mudou** na cópia, e cada um nasceu de um byte que existe nos
 * arquivos de fonte deste projeto, não de uma hipótese.
 */

/**
 * O PGN de referência: **5 lances de linha principal, 1 variação de 2 lances,
 * 2 comentários**. Escrito à mão, com a pontuação que um estudo do Lichess
 * exporta — tags, NAG, `!?` colado e comentário entre chaves.
 */
const REFERENCIA = `[Event "Referência do B9"]
[Result "*"]

1. e4 e5 {a abertura clássica} 2. Nf3 Nc6 (2... d6 3. d4 {a defesa Philidor})
3. Bb5!? $5 *`;

/** Conta os lances de uma linha, sem entrar nas variações. */
const conta = (lances: LancePgn[]): number => lances.length;

/** Conta todos os comentários da árvore, inclusive os das variações. */
function contaComentarios(lances: LancePgn[]): number {
  let n = 0;
  for (const lance of lances) {
    if (lance.comentario) n += 1;
    for (const variacao of lance.variacoes) n += contaComentarios(variacao);
  }
  return n;
}

test("o PGN de referência: o que este leitor aproveita, e o que a chess.js perde", () => {
  const nosso = lerPgn(REFERENCIA);
  const lancesNossos = conta(nosso.lances);
  const variacoesNossas = nosso.lances.flatMap((l) => l.variacoes);
  const comentariosNossos = contaComentarios(nosso.lances);

  // A chess.js sobre o mesmo texto.
  const jogo = new Chess();
  jogo.loadPgn(REFERENCIA);
  const lancesDela = jogo.history().length;
  // `loadPgn` anda só por `variations[0]` e descarta os irmãos: o que sobra na
  // árvore dela é a linha principal, sem nenhuma variação.
  const comentariosDela = jogo.getComments().length;

  console.log(
    `  este leitor: ${lancesNossos} lances + ${variacoesNossas.length} variação de ` +
      `${variacoesNossas[0]?.length ?? 0} + ${comentariosNossos} comentários\n` +
      `  chess.js:    ${lancesDela} lances + 0 variação + ${comentariosDela} comentário`,
  );

  assert.equal(lancesNossos, 5, "a linha principal tem 5 lances");
  assert.equal(variacoesNossas.length, 1, "há uma variação");
  assert.equal(variacoesNossas[0].length, 2, "e ela tem 2 lances");
  assert.equal(comentariosNossos, 2, "e 2 comentários, um deles dentro da variação");

  assert.equal(lancesDela, 5, "a chess.js lê a linha principal inteira");
  assert.equal(comentariosDela, 1, "mas só o comentário que está fora da variação");
  // O número que justifica o arquivo: a variação inteira some, sem erro nenhum.
  assert.equal(
    jogo.history().includes("d6"),
    false,
    "se isto virar `true`, a chess.js passou a guardar variações e este leitor pode sair",
  );
});

test("a variação pendura no lance que ela substitui, não no seguinte", () => {
  const { lances } = lerPgn(REFERENCIA);
  // `(2... d6 …)` é alternativa ao 4º meio-lance (Nc6), não ao 5º.
  assert.equal(lances[3].san, "Nc6");
  assert.equal(lances[3].variacoes.length, 1);
  assert.equal(lances[3].variacoes[0][0].san, "d6");
  assert.deepEqual(
    lances.map((l) => l.variacoes.length),
    [0, 0, 0, 1, 0],
  );
});

test("tags, resultado e anotações saem do texto", () => {
  const lido = lerPgn(REFERENCIA);
  assert.equal(lido.tags.Event, "Referência do B9");
  assert.equal(lido.tags.Result, "*");
  assert.equal(lido.resultado, "*");
  // `!?` colado no SAN e `$5` solto são a mesma coisa para o leitor: anotação.
  assert.equal(lido.lances[4].san, "Bb5");
  assert.deepEqual(lido.lances[4].nags, ["!?", "$5"]);
});

test("variação aninhada não confunde a pilha", () => {
  const texto = "1. e4 e5 (1... c5 2. Nf3 (2. Nc3 d6) Nc6) 2. Nf3";
  const { lances } = lerPgn(texto);
  assert.equal(lances.length, 3, "a linha principal é e4 e5 Nf3");
  const variacao = lances[1].variacoes[0];
  assert.deepEqual(
    variacao.map((l) => l.san),
    ["c5", "Nf3", "Nc6"],
  );
  // A de dentro pendura no `Nf3` da variação, e não no `Nc6` que veio depois.
  assert.deepEqual(
    variacao[1].variacoes[0].map((l) => l.san),
    ["Nc3", "d6"],
  );
});

test("comentário antes do primeiro lance é introdução, e não some", () => {
  const { intro, lances } = lerPgn("{o que este estudo mostra} 1. e4 e5");
  assert.equal(intro, "o que este estudo mostra");
  assert.equal(lances.length, 2);
});

test("comentário no começo de uma variação vai para o dono dela", () => {
  const { lances } = lerPgn("1. e4 e5 ({outra ideia} 1... c5)");
  assert.equal(lances[1].comentario, "outra ideia");
  assert.equal(lances[1].variacoes[0][0].san, "c5");
});

test("PGN sem cabeçalho, em uma linha, com comentário de ponto e vírgula", () => {
  const { lances, tags } = lerPgn("1.e4 e5 2.Nf3 ; até aqui\n");
  assert.deepEqual(Object.keys(tags), []);
  assert.deepEqual(
    lances.map((l) => l.san),
    ["e4", "e5", "Nf3"],
  );
  assert.equal(lances[2].comentario, "até aqui");
});

test("texto vazio ou lixo não estoura", () => {
  assert.deepEqual(lerPgn("").lances, []);
  assert.deepEqual(lerPgn("nada disto é xadrez ??? ...").lances.length, 3);
});

/* ------------------------------------------------------------------ *
 * O que mudou na cópia
 * ------------------------------------------------------------------ */

test("o roque escrito com zero vira O-O, e a chess.js aceita o que sai", () => {
  const { lances } = lerPgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. 0-0 Bc5 5. d3 0-0");
  assert.deepEqual(
    lances.map((l) => l.san),
    ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "O-O", "Bc5", "d3", "O-O"],
  );
  // O motivo da correção: sem ela os dois roques somem da linha, sem erro. E o
  // que sai daqui tem de ser jogável, não só bonito.
  const jogo = new Chess();
  for (const lance of lances) jogo.move(lance.san);
  assert.equal(jogo.history().length, 10);
});

test("roque grande com zero, e com xeque colado", () => {
  const { lances } = lerPgn("1. 0-0-0+ 0-0-0!?");
  assert.deepEqual(
    lances.map((l) => l.san),
    ["O-O-O+", "O-O-O"],
  );
  assert.deepEqual(lances[1].nags, ["!?"]);
});

test("`0-0` dentro de comentário continua sendo prosa do autor", () => {
  // Nos 20 arquivos de fonte deste projeto as duas únicas ocorrências de `0-0`
  // estão em comentário. Uma troca cega de texto reescreveria o que o autor
  // escreveu; a correção é no token, e por isso este teste existe.
  const { lances } = lerPgn("1. e4 {depois do 0-0 as brancas atacam} e5");
  assert.deepEqual(
    lances.map((l) => l.san),
    ["e4", "e5"],
  );
  assert.equal(lances[0].comentario, "depois do 0-0 as brancas atacam");
});

test("vários jogos num arquivo, cada um com o seu cabeçalho", () => {
  const dois = `[Event "Manhattan #1"]
[Result "*"]

1. d4 d5 2. c4 e6 *

[Event "Londres"]
[Result "*"]

1. d4 d5 2. Bf4 c5 *`;
  const jogos = lerPgns(dois);
  assert.equal(jogos.length, 2);
  assert.equal(jogos[0].tags.Event, "Manhattan #1");
  assert.equal(jogos[1].tags.Event, "Londres");
  assert.equal(jogos[1].lances[3].san, "c5");
});

test("jogo sem tag `[Event]` nenhuma é lido inteiro, e não some", () => {
  // 6 dos 13 arquivos do Grigoryan são assim. Separar os jogos "nos `[Event`",
  // como o plano dizia, engoliria estes arquivos por completo.
  const semEvent = `[White "Caro Kann "]
[Result "*"]

1. e4 c6 2. d4 d5 3. exd5 cxd5 4. Bd3 Nc6 *`;
  const jogos = lerPgns(semEvent);
  assert.equal(jogos.length, 1);
  assert.equal(jogos[0].tags.Event, undefined);
  assert.equal(jogos[0].lances.length, 8);
});

test("uma linha que começa com `[%cal …]}` não abre jogo novo", () => {
  // Acontece de verdade: o exportador quebra a linha no meio do comentário, e
  // a linha seguinte começa com `[`. Por isso o corte é por token, e não por
  // linha começando com colchete.
  const quebrado = `[White "English Opening"]

1. c4 e5 2. Nc3 {as pretas seguram o centro
[%cal Ga2a3,Gc2c3]} Nc6 3. g3 *`;
  const jogos = lerPgns(quebrado);
  assert.equal(jogos.length, 1, "é um jogo só");
  assert.equal(jogos[0].lances.length, 5, "c4 e5 Nc3 Nc6 g3");
});

test("`apenasLances` tira a prosa e as tags, e guarda os NAGs", () => {
  const bruto = `[Event "?"]
[White "Scotch Game"]

{Dear Champions! Antes de tudo, leia estes 2 artigos.} 1. e4 e5 2. Nf3 Nc6
3. d4 exd4 4. Nxd4 Bc5 $1 {[%csl Rc5][#] boa jogada} (4... Qh4 $2 5. Nc3 $1) *`;
  assert.equal(
    apenasLances(bruto),
    "1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bc5 $1 (4... Qh4 $2 5. Nc3 $1) *",
  );
});

test("`apenasLances` engole o artefato `$146ão` do chess.com junto com o comentário", () => {
  // O chess.com exporta "Não" como `$146ão` dentro do comentário. Como ele mora
  // dentro das chaves, some com elas — nenhum tratamento especial é preciso, e
  // este teste é o que garante que ninguém vá inventar um.
  const bruto = `1. e4 c5 2. c3 d5 {aqui $146ÃO é bom trocar} 3. exd5 Qxd5 $1 *`;
  assert.equal(apenasLances(bruto), "1. e4 c5 2. c3 d5 3. exd5 Qxd5 $1 *");
});

test("o que `apenasLances` devolve o leitor lê de volta igual", () => {
  const bruto = `[Event "?"]

1. e4 e5 {prosa} (1... c5 {mais prosa} 2. Nf3) 2. Nf3 Nc6 *`;
  const relido = lerPgn(apenasLances(bruto));
  assert.deepEqual(
    relido.lances.map((l) => l.san),
    ["e4", "e5", "Nf3", "Nc6"],
  );
  assert.deepEqual(
    relido.lances[1].variacoes[0].map((l) => l.san),
    ["c5", "Nf3"],
  );
  assert.equal(contaComentarios(relido.lances), 0, "nenhuma palavra do autor sobrou");
});

test("`embrulhar` quebra sem cortar lance no meio", () => {
  const linha = embrulhar("1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bc5", 20);
  assert.deepEqual(linha.split("\n"), ["1. e4 e5 2. Nf3 Nc6", "3. d4 exd4 4. Nxd4", "Bc5"]);
  for (const l of linha.split("\n")) assert.ok(l.length <= 20);
});

test("`recortarJogos` não deixa o preâmbulo empurrar os capítulos", () => {
  // O bug que este teste tranca: o preâmbulo do `kushager-short-sweet.pgn`
  // traz a data "5/9/2026.", e a primeira versão do recorte guardava todo
  // pedaço que casasse com "dígito ponto". O preâmbulo sobreviveu, empurrou os
  // dez capítulos uma casa, e o rascunho saiu com o capítulo 1 vazio e o 10
  // perdido — sem erro nenhum.
  const arquivo = `; Transcrito de capturas de tela enviadas por Doug em 5/9/2026.
; Convertido para notação inglesa.

[Event "Manhattan #1"]

1. d4 d5 *

[Event "Londres"]

1. d4 d5 2. Bf4 *`;
  const { pedacos, confere } = recortarJogos(arquivo, 2);
  assert.ok(confere);
  assert.equal(pedacos.length, 2);
  assert.match(pedacos[0], /Manhattan #1/);
  assert.match(pedacos[1], /Londres/);
  assert.equal(pedacos[0].includes("Transcrito"), false, "o preâmbulo não é capítulo");
});

test("`recortarJogos` avisa quando o corte discorda do leitor", () => {
  // Um arquivo com dois jogos em que o segundo não tem `[Event]`: o leitor acha
  // 2, o corte acha 1. Recortar errado em silêncio é o que não pode acontecer.
  const torto = `[Event "Um"]

1. e4 e5 *

[White "Dois, sem Event"]

1. d4 d5 *`;
  const { pedacos, confere } = recortarJogos(torto, 2);
  assert.equal(confere, false);
  assert.equal(pedacos.length, 1, "sai num bloco só, para separar à mão");
  assert.equal(lerPgns(torto).length, 2, "e o leitor continua achando os dois");
});

test("`recortarJogos` com um jogo só devolve o arquivo inteiro", () => {
  const um = `[White "Caro Kann "]

1. e4 c6 *`;
  assert.deepEqual(recortarJogos(um, 1), { pedacos: [um], confere: true });
});
