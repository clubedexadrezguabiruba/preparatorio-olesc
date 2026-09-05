import assert from "node:assert/strict";
import test from "node:test";
import { ehPergunta, expandir, type Cabecalho } from "./arvore.ts";
import { lerPgn } from "./pgn.ts";
import { PROFUNDIDADE } from "./linhas.ts";

/**
 * A expansão da árvore em linhas.
 *
 * Cada teste aqui nasceu de um trecho que existe nos arquivos de fonte do
 * projeto, e vários deles são trechos que a regra **antiga** do plano
 * classificava errado. O comentário de cada um diz qual arquivo.
 */

const BRANCAS: Cabecalho = {
  abertura: "escocesa",
  nome: "Escocesa",
  cor: "brancas",
  nivel: "base",
  fonte: "teste",
};

const PRETAS: Cabecalho = { ...BRANCAS, abertura: "dragao", nome: "Dragão", cor: "pretas" };

const expandirTexto = (pgn: string, cabecalho = BRANCAS) => expandir(lerPgn(pgn), cabecalho);

test("três respostas do adversário viram três linhas", () => {
  const { linhas, problemas } = expandirTexto(
    "1. e4 e5 (1... c5 2. Nf3) (1... e6 2. d4) 2. Nf3",
  );
  assert.deepEqual(problemas, []);
  assert.equal(linhas.length, 3);
  assert.deepEqual(
    linhas.map((l) => l.sans.join(" ")).sort(),
    ["e4 c5 Nf3", "e4 e5 Nf3", "e4 e6 d4"],
  );
});

test("cada linha começa do lance 1, inclusive nas pretas", () => {
  // Nas pretas o lance 1 do adversário é jogado sozinho: a linha não pode
  // começar no meio, senão o aluno vê um tabuleiro sem saber como chegou nele.
  const { linhas } = expandirTexto("1. e4 c5 2. Nf3 Nc6 (2. Nc3 Nc6)", PRETAS);
  for (const linha of linhas) {
    assert.equal(linha.sans[0], "e4");
    assert.equal(linha.meus[0], 1, "o primeiro lance nosso é o meio-lance 1");
  }
});

test("irmão nosso com marca boa vira alternativa aceita, e não vira linha", () => {
  // `Scotch Game + Homework.pgn`: `9. Nd2 $1 (9. g3) (9. c4 $5) (9. a3 $5)`.
  const { linhas } = expandirTexto("1. e4 e5 2. Nf3 (2. Bc4 $5) Nc6");
  assert.equal(linhas.length, 1, "o irmão nosso não abre linha nova");
  // `Bc4` é o meio-lance 2 (e4=0, e5=1, Nf3=2).
  assert.deepEqual(linhas[0].alternativas, { "2": ["f1c4"] });
});

test("irmão nosso sem marca não é aceito — vira aviso", () => {
  // A regra do plano dizia o contrário, e `PGN for Pirc Defense.pgn` mostra o
  // preço: `4. Bc4 $1 ({Why 4.Nf3 is worse?} 4. Nf3)`. Sem marca, aceitar seria
  // dizer "certo" para o lance que a fonte desaconselha.
  const { linhas, avisos } = expandirTexto("1. e4 e5 2. Nf3 (2. Bc4) Nc6");
  assert.deepEqual(linhas[0].alternativas, {}, "não entrou como aceito");
  assert.deepEqual(linhas[0].errosNomeados, {}, "e nem como erro");
  const semMarca = avisos.filter((a) => a.tipo === "irmao-sem-marca");
  assert.equal(semMarca.length, 1);
  assert.match(semMarca[0].detalhe, /"Bc4" é irmão de "Nf3"/);
});

test("irmão nosso marcado como erro é erro nomeado, nunca alternativa", () => {
  // A regra que impede o treinador de aceitar o lance que o curso mostra de
  // propósito como ruim.
  const { linhas } = expandirTexto("1. e4 e5 2. Nf3 (2. Qh5 $2) (2. f4 ?!) Nc6");
  assert.deepEqual(linhas[0].alternativas, {});
  assert.deepEqual(linhas[0].errosNomeados, { "2": ["d1h5", "f2f4"] });
});

test("a variação do adversário sai da posição certa, não da seguinte", () => {
  const { linhas, problemas } = expandirTexto("1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4)");
  assert.deepEqual(problemas, []);
  const philidor = linhas.find((l) => l.sans.includes("d6"));
  assert.deepEqual(philidor?.sans, ["e4", "e5", "Nf3", "d6", "d4"]);
});

test("SAN ilegal derruba só o ramo, e o erro diz qual lance foi", () => {
  const { linhas, problemas } = expandirTexto("1. e4 e5 (1... c5 2. Qh8) 2. Nf3");
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /"Qh8" não é lance legal depois de e4 c5/);
  // A linha principal sobreviveu — meia árvore aproveitável é melhor que nenhuma.
  assert.ok(linhas.some((l) => l.sans.join(" ") === "e4 e5 Nf3"));
});

test("o comentário cai no meio-lance certo", () => {
  const { linhas } = expandirTexto("1. e4 {abre o centro} e5 2. Nf3 {ataca e5}");
  assert.deepEqual(linhas[0].comentarios, { "0": "abre o centro", "2": "ataca e5" });
});

test("o SAN que vai para o JSON é o da chess.js, não o texto do autor", () => {
  // O autor escreveu `e4xd5`; a chess.js canoniza para `exd5`. Guardar o texto
  // do autor faria a tela comparar contra uma grafia que ela não gera.
  const { linhas, problemas } = expandirTexto("1. e4 d5 2. e4xd5");
  assert.deepEqual(problemas, []);
  assert.deepEqual(linhas[0].sans, ["e4", "d5", "exd5"]);
  assert.deepEqual(linhas[0].lances, ["e2e4", "d7d5", "e4d5"]);
});

test("o id é estável entre rodadas e muda quando a linha muda", () => {
  const uma = expandirTexto("1. e4 e5 2. Nf3").linhas[0];
  const igual = expandirTexto("1. e4 e5 2. Nf3").linhas[0];
  const outra = expandirTexto("1. e4 e5 2. Nc3").linhas[0];
  assert.equal(uma.id, igual.id, "rodar de novo dá o mesmo id");
  assert.notEqual(uma.id, outra.id, "linha diferente é linha nova");
  assert.match(uma.id, /^brancas-escocesa-[0-9a-f]{8}$/);
});

test("mexer no comentário não muda o id — o progresso do aluno fica", () => {
  const antes = expandirTexto("1. e4 e5 2. Nf3 {ataca e5}").linhas[0];
  const depois = expandirTexto("1. e4 e5 2. Nf3 {o cavalo ataca o peão}").linhas[0];
  assert.equal(antes.id, depois.id);
});

test("ponta em lance do adversário vira aviso, com a linha ainda montada", () => {
  // É o caso dos draft com homework: a linha existe e serve de lista de
  // trabalho no rascunho; quem a reprova é `validarBanco`, no PGN revisado.
  const { linhas, avisos } = expandirTexto("1. e4 e5 2. Nf3 Nc6");
  assert.equal(linhas.length, 1);
  const aviso = avisos.find((a) => a.tipo === "termina-no-adversario");
  assert.match(String(aviso?.detalhe), /"Nc6", lance do adversário/);
});

test("erro do adversário sem punição escrita é aviso próprio", () => {
  // `Scotch Game + Homework.pgn`: `(6... Nd5 $2 {[#] How do we continue here?})`.
  // É o material de "armadilha conhecida" que a fonte deixou pela metade.
  const { avisos } = expandirTexto("1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Qh4 $2");
  assert.equal(avisos.filter((a) => a.tipo === "erro-do-adversario-sem-refutacao").length, 1);
});

test("pergunta de homework na ponta é contada", () => {
  const { avisos } = expandirTexto("1. e4 e5 2. Nf3 Nc6 {Do you remember what we play here?}");
  assert.equal(avisos.filter((a) => a.tipo === "termina-em-pergunta").length, 1);
});

test("`[#]` sozinho não é pergunta, e `[%csl …]` não engana o detector", () => {
  assert.equal(ehPergunta("[#]"), false);
  assert.equal(ehPergunta("[%csl Rc7,Rf6]"), false);
  assert.equal(ehPergunta("[#] How do we continue here?"), true);
  assert.equal(ehPergunta("No more f5!"), false);
  assert.equal(ehPergunta(null), false);
});

test("a profundidade é contada em lance nosso, e por isso muda com a cor", () => {
  // O erro do plano: 16 meios-lances numa árvore das brancas termina num lance
  // das pretas. Contado em lance nosso, o 8º lance branco é o 15º meio-lance e
  // o 8º preto é o 16º — o mesmo "lance 8" para os dois.
  assert.equal(PROFUNDIDADE.base, 8);
  const oito = "1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bc5 5. Nb3 Bb6 6. Nc3 Nf6 7. Qe2 d6 8. Be3";
  const brancas = expandirTexto(oito);
  assert.equal(brancas.linhas[0].lances.length, 15);
  assert.equal(brancas.avisos.filter((a) => a.tipo === "acima-da-profundidade").length, 0);

  const pretas = expandirTexto(`${oito} O-O`, PRETAS);
  assert.equal(pretas.linhas[0].lances.length, 16);
  assert.equal(pretas.avisos.filter((a) => a.tipo === "acima-da-profundidade").length, 0);

  const longa = expandirTexto(`${oito} O-O 9. O-O-O`);
  assert.equal(longa.avisos.filter((a) => a.tipo === "acima-da-profundidade").length, 1);
});

test("os rótulos de um ramo não vazam para o ramo irmão", () => {
  // A alternativa aceita registrada dentro da variação não pode aparecer na
  // linha principal, e vice-versa.
  const { linhas } = expandirTexto("1. e4 e5 2. Nf3 (2. Bc4 $5) Nc6 (2... d6 3. d4 (3. Bc4 $1))");
  const principal = linhas.find((l) => l.sans.includes("Nc6"));
  const philidor = linhas.find((l) => l.sans.includes("d6"));
  assert.deepEqual(principal?.alternativas, { "2": ["f1c4"] });
  assert.deepEqual(philidor?.alternativas, { "2": ["f1c4"], "4": ["f1c4"] });
});
