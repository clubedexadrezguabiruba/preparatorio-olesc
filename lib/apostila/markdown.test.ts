import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analisar } from "./markdown.ts";

/**
 * Quem vai errar a sintaxe deste arquivo é o professor, editando o caderno numa
 * quinta-feira à noite. Então metade desta bateria não testa o que funciona —
 * testa se a **mensagem de erro** diz onde está o problema. Um parser que
 * estoura com "unexpected token" numa linha desconhecida seria pior que não ter
 * parser nenhum.
 */

const CABECALHO = `---
numero: 1
titulo: Um caderno
sabado: Sábado 1
subtitulo: Um subtítulo
---
`;

const analisarCorpo = (corpo: string) => analisar(CABECALHO + "\n" + corpo);
const blocos = (corpo: string) => analisarCorpo(corpo).secoes[0].blocos;

/* ------------------------------------------------------------------ *
 * O cabeçalho
 * ------------------------------------------------------------------ */

test("o cabeçalho vira os dados da capa", () => {
  const c = analisarCorpo("# Seção\n\nTexto.").cabecalho;
  assert.deepEqual(c, {
    numero: 1,
    titulo: "Um caderno",
    sabado: "Sábado 1",
    subtitulo: "Um subtítulo",
  });
});

test("cabeçalho faltando campo diz qual campo é", () => {
  const semTitulo = "---\nnumero: 1\nsabado: S1\nsubtitulo: x\n---\n\n# S\n\nTexto.";
  assert.throws(() => analisar(semTitulo), /falta "titulo" no cabeçalho/);
});

test("caderno sem cabeçalho não passa por caderno sem seção", () => {
  assert.throws(() => analisar("# Seção\n\nTexto."), /linha 1: o caderno tem de começar com/);
});

test("numero que não é número reprova em vez de virar NaN na capa", () => {
  const torto = CABECALHO.replace("numero: 1", "numero: um");
  assert.throws(() => analisar(torto + "\n# S\n\nTexto."), /"numero" tem de ser um número/);
});

/* ------------------------------------------------------------------ *
 * O corpo
 * ------------------------------------------------------------------ */

test("linhas seguidas viram um parágrafo só; linha em branco separa", () => {
  const b = blocos("# S\n\nPrimeira linha\ne a continuação dela.\n\nOutro parágrafo.");
  assert.deepEqual(b, [
    { tipo: "paragrafo", texto: "Primeira linha e a continuação dela." },
    { tipo: "paragrafo", texto: "Outro parágrafo." },
  ]);
});

test("## vira subtítulo e # abre outra seção", () => {
  const c = analisarCorpo("# Uma\n\n## Dentro\n\nTexto.\n\n# Outra\n\nMais.");
  assert.equal(c.secoes.length, 2);
  assert.deepEqual(c.secoes[0].titulo, "Uma");
  assert.deepEqual(c.secoes[0].blocos[0], { tipo: "subtitulo", texto: "Dentro" });
  assert.deepEqual(c.secoes[1].titulo, "Outra");
});

test("as duas listas, e uma não engole a outra", () => {
  const b = blocos("# S\n\n- um\n- dois\n\n1. primeiro\n2. segundo");
  assert.deepEqual(b, [
    { tipo: "lista", itens: ["um", "dois"], ordenada: false },
    { tipo: "lista", itens: ["primeiro", "segundo"], ordenada: true },
  ]);
});

test("item de lista quebrado em duas linhas continua o mesmo item", () => {
  // É como o editor de texto quebra sozinho, e como o arquivo está escrito.
  const b = blocos("# S\n\n- um item que ficou\n  comprido demais");
  assert.deepEqual(b, [
    { tipo: "lista", itens: ["um item que ficou comprido demais"], ordenada: false },
  ]);
});

test("a caixa de destaque separa o rótulo do texto", () => {
  const b = blocos("# S\n\n> **Cuidado:** não faça isso.");
  assert.deepEqual(b, [{ tipo: "destaque", rotulo: "Cuidado:", texto: "não faça isso." }]);
});

test("caixa sem rótulo em negrito diz o que faltou", () => {
  assert.throws(() => blocos("# S\n\n> sem rótulo nenhum"), /começa com o rótulo em \*\*negrito\*\*/);
});

test("texto antes da primeira seção reprova em vez de sumir", () => {
  assert.throws(() => analisarCorpo("Um parágrafo solto.\n\n# S\n\nTexto."), /antes do primeiro/);
});

test("caderno sem nenhuma seção reprova", () => {
  assert.throws(() => analisar(CABECALHO), /não tem nenhuma seção/);
});

/* ------------------------------------------------------------------ *
 * Os comandos
 * ------------------------------------------------------------------ */

test("@folha vira quebra de página onde estiver", () => {
  const b = blocos("# S\n\nAntes.\n\n@folha\n\nDepois.");
  assert.equal(b[1].tipo, "quebra");
});

test("@exercicios guarda tema, quantidade e enunciado", () => {
  const b = blocos("# S\n\n@exercicios mateIn1 6 | Ache o mate em 1.");
  assert.deepEqual(b[0], {
    tipo: "exercicios",
    tag: "mateIn1",
    quantos: 6,
    pedido: "Ache o mate em 1.",
    linha: 10,
  });
});

test("@exercicios sem enunciado diz que falta o enunciado", () => {
  assert.throws(() => blocos("# S\n\n@exercicios mateIn1 6"), /precisa do enunciado/);
});

test("@exercicios sem quantidade diz o formato inteiro", () => {
  assert.throws(
    () => blocos("# S\n\n@exercicios mateIn1 | Ache."),
    /tema quantidade \| o que se pede/,
  );
});

test("@planilha e @tarefas exigem o número", () => {
  assert.deepEqual(blocos("# S\n\n@planilha 50")[0], { tipo: "planilha", lances: 50 });
  assert.throws(() => blocos("# S\n\n@planilha"), /precisa do número de lances/);
  assert.throws(() => blocos("# S\n\n@tarefas"), /precisa do número da semana/);
});

test("@diagrama aceita FEN, vez e legenda", () => {
  const b = blocos("# S\n\n@diagrama 8/8/8/3k4/8/8/8/6QK w - - 0 1 | Brancas jogam. | Um final.");
  assert.deepEqual(b[0], {
    tipo: "diagramas",
    pedido: "Um final.",
    itens: [{ fen: "8/8/8/3k4/8/8/8/6QK w - - 0 1", vez: "Brancas jogam." }],
  });
});

test("comando que não existe diz o nome e a linha", () => {
  assert.throws(() => blocos("# S\n\n@gabarrito"), /linha 10: não conheço o comando "@gabarrito"/);
});

test("todo erro traz o número da linha", () => {
  // A garantia inteira desta bateria: quem lê a mensagem estava editando o
  // arquivo, e sem a linha ele procura o problema em 400 linhas na mão.
  const casos = ["> sem rótulo", "@planilha", "@naoexiste", "@exercicios mateIn1"];
  for (const caso of casos) {
    assert.throws(() => blocos(`# S\n\n${caso}`), /linha \d+:/, `sem linha em "${caso}"`);
  }
});

/* ------------------------------------------------------------------ *
 * O caderno de verdade
 * ------------------------------------------------------------------ */

test("o caderno 1 que está no repositório analisa sem erro", () => {
  // O teste que pega o estrago de verdade: o Doug edita o `.md`, erra a
  // sintaxe, e isto fica vermelho no `npm test` antes de ele tentar gerar o PDF.
  const raiz = path.join(fileURLToPath(new URL("../..", import.meta.url)));
  const fonte = readFileSync(path.join(raiz, "apostila", "caderno-1.md"), "utf8");
  const caderno = analisar(fonte);

  assert.equal(caderno.cabecalho.numero, 1);
  assert.ok(caderno.secoes.length >= 10, `só ${caderno.secoes.length} seções`);

  const comandos = caderno.secoes.flatMap((s) => s.blocos).filter((b) => "linha" in b);
  assert.ok(
    comandos.some((b) => b.tipo === "gabarito"),
    "o caderno 1 tem de terminar com @gabarito",
  );
  const exercicios = comandos.filter((b) => b.tipo === "exercicios");
  assert.ok(exercicios.length >= 8, `só ${exercicios.length} grupos de exercício`);
});
