import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { notas as NOTAS_FN } from "./conteudo.ts";
import { estadoDe, IndiceSchema, validarBanco, type Linha } from "./linhas.ts";

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
  //
  // **38 desde 17/9/2026:** a Francesa passou a vir do estudo do Lichess (curso de abertura) —
  // a linha escrita à mão saiu e entraram as 19 do move trainer, todas no Base.
  // **89 desde 18/9/2026:** a Siciliana também passou a vir do estudo (Dragão Acelerado) — as 6
  // linhas escritas à mão continuam, com os mesmos ids, e o move trainer dela tem 56, todas no Base
  // (eram 74; o Doug mandou cortar os capítulos mais raros na faixa 1000–1800).
  // **126 desde 18/9/2026:** a Escocesa também veio do estudo — as 5 linhas escritas à mão continuam,
  // com os mesmos ids, e o move trainer dela tem 41, todas no Base (a do 3...Cf6 saiu do Avançado).
  // **127 desde 18/9/2026 (tarde):** a Siciliana ganhou a linha 8.f3 Db6! no treinador (Doug).
  assert.equal(todas.filter((l) => l.nivel === "base").length, 127);

  for (const linha of todas) {
    // O contrato de que a tela depende para saber quando auto-jogar: `meus`
    // são os índices pares nas brancas e os ímpares nas pretas, porque
    // `lances[0]` é sempre lance branco.
    const esperado = linha.cor === "brancas" ? 0 : 1;
    for (const ply of linha.meus) {
      assert.equal(ply % 2, esperado, `${linha.id}: o meio-lance ${ply} não é do aluno`);
    }
  }
});

test("o repertório publicado tem 1141 lances nossos", () => {
  // Até 17/9/2026 este teste também exigia comentário em cada um deles; o Doug
  // tornou o comentário opcional no move trainer, nos 11 repertórios.
  let nossos = 0;
  for (const entrada of indice) {
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    for (const linha of validarBanco(ler(relativo), relativo)) nossos += linha.meus.length;
  }
  // Se este número cair, alguém encurtou uma linha; se subir, alguém a alongou.
  // Ele SOBE de propósito enquanto a §24 estica as 27 linhas até o roque e as
  // peças menores fora: era 222 no fim da §23, e o alvo é cerca de 340. Foi 351 até
  // 17/9/2026, quando as 19 linhas da Francesa geradas do estudo trocaram a escrita à mão; 499 até
  // 18/9/2026, quando a Siciliana passou de 6 linhas para as 56 do estudo do Dragão Acelerado; 886
  // até 18/9/2026, quando a Escocesa passou de 5 linhas para as 41 do estudo.
  // 1133 até 18/9/2026 (tarde): a linha 8.f3 Db6! da Siciliana trouxe mais 8.
  assert.equal(nossos, 1141, "o repertório tem 1141 lances nossos, em 132 linhas");
});

test("as páginas de princípios ligadas a uma abertura apontam para abertura viva", () => {
  // O link é de mão única e falha CALADO: uma nota apontando para slug que não
  // existe some da tela da abertura sem erro nenhum, e volta a ser invisível
  // fora do rodapé de `/aberturas` — que é o problema que a §23 consertou. O
  // `repertorio:compilar` reprova isto; aqui a mesma regra é medida no
  // publicado, e o número declara quantas estão de fato ligadas.
  const chaves = new Set(indice.map((e) => `${e.cor}/${e.abertura}`));
  const ligadas = NOTAS_FN().filter((n) => n.abertura);
  for (const nota of ligadas) {
    assert.ok(
      chaves.has(`${nota.cor}/${nota.abertura}`),
      `a nota "${nota.slug}" aponta para ${nota.cor}/${nota.abertura}, que não existe`,
    );
  }
  // Quatro das nove: as outras cinco (Pirc, Nimzowitsch, Alekhine, Owen e as
  // outras primeiras) não são ramo de abertura nenhuma do treinador.
  assert.equal(ligadas.length, 4);
});

test("cada linha publicada se remonta no tabuleiro, e a FEN final bate", () => {
  // A `fenFinal` deixou de ser enfeite em 8/9/2026: a régua do término (§24 de
  // `docs/REVISAO-FONTES.md`) lê nela quais peças menores ficaram na casa de
  // origem. Se ela estiver errada — um JSON editado à mão, um compilador com
  // bug de `undo` —, o placar de fechamento mente e a linha passa por fechada
  // sem estar. Aqui os lances são jogados de novo, um a um, e a posição que
  // sai é comparada com a que está gravada.
  //
  // De quebra isto cobre a legalidade de todo lance publicado: um UCI
  // impossível estoura na `chess.js` com o lance nomeado.
  for (const entrada of indice) {
    const relativo = entrada.arquivo.replace(/^\/repertorio\//, "");
    for (const linha of validarBanco(ler(relativo), relativo)) {
      const jogo = new Chess(linha.fenInicial);
      for (const [i, uci] of linha.lances.entries()) {
        const feito = jogo.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.slice(4) || undefined,
        });
        assert.equal(feito.san, linha.sans[i], `${linha.id}: o SAN do meio-lance ${i} não bate`);
      }
      assert.equal(jogo.fen(), linha.fenFinal, `${linha.id}: a FEN final não bate com os lances`);
    }
  }
});

test("o placar do fechamento cobre todo o publicado (retrato, sem régua desde 16/9/2026)", () => {
  // Até 16/9/2026 este teste exigia zero linhas abertas. A régua de tamanho saiu
  // (spec §21): o placar continua sendo impresso, e aqui só se confere que ele
  // conta todas as linhas.
  const todas = indice.flatMap((e) =>
    validarBanco(ler(e.arquivo.replace(/^\/repertorio\//, "")), e.abertura),
  );
  const conta = { fecha: 0, "com-plano": 0, aberta: 0 };
  for (const linha of todas) conta[estadoDe(linha)] += 1;
  assert.equal(conta.fecha + conta["com-plano"] + conta.aberta, todas.length);
});
