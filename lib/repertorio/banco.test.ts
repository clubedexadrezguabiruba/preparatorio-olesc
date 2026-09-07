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

test("o índice tem as onze aberturas, sem repetir cor e slug", () => {
  // Eram doze até 7/9/2026. A poda da §23 de `docs/REVISAO-FONTES.md` apagou
  // `pretas/outras` inteira: a única linha dela terminava na MESMA posição do
  // 6º lance da `pretas-manhattan-7945d4d3`, conferido casa a casa — o aluno
  // chega lá treinando o Manhattan, e uma abertura só para a outra porta cobrava
  // duas vezes pela mesma ideia.
  assert.equal(indice.length, 11);
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

test("o Base publicado tem 20 linhas, e o primeiro lance é sempre das brancas", () => {
  const todas = indice.flatMap((e) =>
    validarBanco(ler(e.arquivo.replace(/^\/repertorio\//, "")), e.abertura),
  );
  // Conta o **Base**, não o total. Desde que o `6.Bf4` da Caro-Kann virou linha
  // do Avançado (§11.1 de `docs/REVISAO-FONTES.md`), os dois números deixaram
  // de ser o mesmo. Contar o total faria esta afirmação virar "quantas linhas
  // existem", que não é contrato de nada.
  //
  // **Foi 41 até 7/9/2026, e caiu para 20 na mesma tarde** (§23 de
  // `docs/REVISAO-FONTES.md`). O motivo não foi orçamento: 42 linhas custavam
  // ao aluno **205 decisões distintas**, das quais 188 lances sem comentário
  // nenhum — decoreba, que é o contrário do que o repertório existe para
  // ensinar. O Base agora custa 127 decisões, e o que saiu não morreu todo: 7
  // linhas foram para o Avançado, que abre quando o Base estiver aprendido.
  //
  // Este número é a meta pedagógica do Base; ele não tem relação com o `teto`
  // de `aberturasInchadas`, que conta linhas **por abertura** e continua em 40.
  assert.equal(todas.filter((l) => l.nivel === "base").length, 20);

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
