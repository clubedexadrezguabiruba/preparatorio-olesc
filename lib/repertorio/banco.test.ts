import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { IndiceSchema, meiosLances, validarBanco, type Linha } from "./linhas.ts";

/**
 * O que está publicado em `public/repertorio/` confere?
 *
 * `lib/repertorio/linhas.test.ts` prova as **regras**, com linhas fabricadas.
 * Este arquivo prova os **dados**: os doze JSON que o servidor vai abrir no
 * sábado, exatamente como estão no disco.
 *
 * Ele existe porque entre o compilador e o servidor cabe uma edição à mão — um
 * comentário corrigido direto no JSON, um lance "consertado" sem recompilar — e
 * era o único ponto do caminho que ninguém olhava. Agora o `npm test` olha.
 *
 * Aqui os arquivos são lidos por `node:fs` direto, e não por
 * `lib/repertorio/banco.ts`: aquele é `server-only`, e importá-lo fora do Next
 * estoura na primeira linha. O que se perde é a cobertura do cache; o que se
 * ganha é o teste rodar no `npm test` como todos os outros.
 */

const PUBLICO = path.join(fileURLToPath(new URL("../..", import.meta.url)), "public", "repertorio");

function ler(relativo: string): unknown {
  return JSON.parse(readFileSync(path.join(PUBLICO, relativo), "utf8")) as unknown;
}

const indice = IndiceSchema.parse(ler("index.json"));

test("o índice tem as doze aberturas, sem repetir cor e slug", () => {
  assert.equal(indice.length, 12);
  const chaves = new Set(indice.map((e) => `${e.cor}/${e.abertura}`));
  assert.equal(chaves.size, indice.length, "há uma abertura repetida no índice");
});

test("cada arquivo do índice passa na conferência do banco", () => {
  for (const entrada of indice) {
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    // `validarBanco` estoura com a lista de problemas; deixar estourar aqui é o
    // ponto — a mensagem dele diz qual linha e por quê.
    const linhas: Linha[] = validarBanco(ler(relativo), relativo);
    assert.ok(linhas.length > 0, `${relativo} está vazio`);
  }
});

test("a contagem do índice bate com o tamanho de cada arquivo", () => {
  // O modo de falha que isto pega: alguém apaga uma linha do JSON e esquece o
  // índice. A lista de aberturas desenharia a barra sobre um total que não
  // existe, e ela nunca chegaria ao fim.
  for (const entrada of indice) {
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    const linhas = validarBanco(ler(relativo), relativo);
    assert.equal(linhas.length, entrada.linhas, `${relativo}: o índice diz ${entrada.linhas}`);
  }
});

test("cor e abertura de cada linha batem com a pasta em que ela está", () => {
  for (const entrada of indice) {
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    for (const linha of validarBanco(ler(relativo), relativo)) {
      assert.equal(linha.cor, entrada.cor, `${linha.id}: cor fora do lugar`);
      assert.equal(linha.abertura, entrada.abertura, `${linha.id}: abertura fora do lugar`);
    }
  }
});

test("o Base publicado tem 42 linhas, e o primeiro lance é sempre das brancas", () => {
  const todas = indice.flatMap((e) =>
    validarBanco(ler(e.arquivo.replace(/^\/repertorio\//, "")), e.abertura),
  );
  assert.equal(todas.length, 42);

  for (const linha of todas) {
    // O contrato de que a tela depende para saber quando auto-jogar: `meus`
    // são os índices pares nas brancas e os ímpares nas pretas, porque
    // `lances[0]` é sempre lance branco.
    const esperado = linha.cor === "brancas" ? 0 : 1;
    for (const ply of linha.meus) {
      assert.equal(ply % 2, esperado, `${linha.id}: o meio-lance ${ply} não é do aluno`);
    }
    assert.ok(
      linha.lances.length <= meiosLances(linha.nivel, linha.cor),
      `${linha.id} passa do teto do nível`,
    );
  }
});
