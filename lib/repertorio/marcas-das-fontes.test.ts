import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { conferirMarcasDasFontes, type FontePgn } from "./marcas-das-fontes.ts";

/**
 * A regra de 14/9/2026: **o símbolo vai junto com o lance.** Ver o cabeçalho de
 * `marcas-das-fontes.ts` e a seção "Símbolos de lance" de `AGENTS.md`.
 */

const cabecalho = (cor: string) => `[Abertura "x"]\n[Nome "X"]\n[Cor "${cor}"]\n[Nivel "base"]\n[Fonte "teste"]\n\n`;

test("as quatro situações de uma marca da fonte", () => {
  const rascunho: FontePgn = {
    nome: "rascunho.pgn",
    // 3.d4 $1 fica no revisado sem a marca; 3.Bc4!? é irmão nosso cortado; 2…f6? é
    // lance dele cortado; 4.c3?? está num ramo que o revisado nem tem.
    texto: `${cabecalho("brancas")}1. e4 e5 2. Nf3 Nc6 (2... f6? 3. Nxe5) 3. d4 $1 (3. Bc4!? Bc5 4. c3??) *`,
  };
  const revisado: FontePgn = { nome: "brancas-x.pgn", texto: `${cabecalho("brancas")}1. e4 e5 2. Nf3 Nc6 3. d4 exd4 *` };

  const c = conferirMarcasDasFontes([rascunho], [revisado]);
  assert.deepEqual(c.faltando.map((m) => [m.lance, m.marcas]), [["3.d4", ["$1"]]]);
  assert.deepEqual(c.irmaoNossoCortado.map((m) => [m.lance, m.marcas]), [["3.Bc4", ["!?"]]]);
  assert.deepEqual(c.ramoDeleCortado.map((m) => [m.lance, m.marcas]), [["2…f6", ["?"]]]);
  assert.equal(c.ramoFora, 1, "4.c3?? está depois de 3…Bc5, que o revisado não tem");
  assert.equal(c.faltando[0].antes, "e4 e5 Nf3 Nc6", "diz onde a posição está");
});

test("`!` e `$1` são a mesma marca, e a marca que chegou não é cobrada", () => {
  const rascunho: FontePgn = { nome: "r.pgn", texto: `${cabecalho("pretas")}1. e4 c5 2. c3 Nf6! *` };
  const revisado: FontePgn = { nome: "pretas-x.pgn", texto: `${cabecalho("pretas")}1. e4 c5 2. c3 Nf6 $1 *` };
  assert.deepEqual(conferirMarcasDasFontes([rascunho], [revisado]).faltando, []);
});

test("o repertório de verdade: nenhum lance perdeu o símbolo da fonte, e nenhum irmão nosso marcado foi cortado", () => {
  const pasta = new URL("../../content/repertorio/", import.meta.url);
  const ler = (sub: string): FontePgn[] =>
    readdirSync(new URL(sub, pasta))
      .filter((nome) => nome.endsWith(".pgn"))
      .map((nome) => ({ nome, texto: readFileSync(new URL(`${sub}${nome}`, pasta), "utf8") }));
  const rascunhos = ler("rascunhos/");
  const revisados = ler("./");
  assert.ok(rascunhos.length > 0 && revisados.length > 0, "sem corpus o teste passaria calado");

  const c = conferirMarcasDasFontes(rascunhos, revisados);
  const lista = (ms: typeof c.faltando) => ms.map((m) => `${m.lance} ${m.marcas.join(" ")} (${m.fonte}; depois de ${m.antes})`);
  assert.deepEqual(lista(c.faltando), [], "o lance está no repertório e o símbolo da fonte não — devolva a marca");
  assert.deepEqual(lista(c.irmaoNossoCortado), [], "lance nosso marcado na fonte saiu da árvore — ele muda o que o treino aceita");

  // O que não reprova, mas não some de vista: devolver exige linha nova (ou o ramo
  // inteiro), e isso é decisão de conteúdo do Doug.
  console.log(
    `  marcas das fontes fora do repertório: ${c.ramoDeleCortado.length} em lance do adversário cortado, ` +
      `${c.ramoFora} em ramos que o repertório não tem`,
  );
});
