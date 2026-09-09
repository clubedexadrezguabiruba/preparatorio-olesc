import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BLOCOS, TEMAS } from "./blocos.ts";
import { METAS, PUZZLES_POR_TEMA } from "./serie.ts";

/**
 * O gate sobre o recorte do banco — que até aqui não existia.
 *
 * ## Por que ele faltava, e por que ele importa
 *
 * `public/puzzles/` é gerado por `scripts/filtrar-puzzles.ts` a partir de um
 * CSV de 570 MB que **não** é versionado. O único gate que havia era o próprio
 * script, e só contra a tag que saiu com zero puzzles. Tudo o que estava entre
 * "zero" e "o bastante" passava em silêncio: um tema com 12 puzzles gera
 * arquivo, gera índice, abre na tela — e acaba no terceiro dia do aluno.
 *
 * Este teste lê o `index.json` pelo mesmo molde com que `temas.test.ts` lê o
 * `content/`: ele não recorta nada, ele confere o que está no disco.
 *
 * ## O limite declarado, com os números medidos em 2026-09-08
 *
 * O recorte de 700 a 2100 (teto de 1.000 por arquivo) deu **175.987 puzzles**
 * em 224 arquivos de faixa, 36 MB. Nenhum tema ficou vazio, e o mais magro
 * passa folgado dos 39 que um aluno consome:
 *
 * | tema               | total | faixa de aquecimento |
 * |--------------------|-------|----------------------|
 * | `doubleBishopMate` |    79 | 11                   |
 * | `underPromotion`   |   210 | 37                   |
 * | `bodenMate`        |   231 | 101                  |
 * | `enPassant`        |  1639 |  8                   |
 *
 * **O que é sabido e aceito:** com 79 puzzles, `doubleBishopMate` dá cerca de
 * duas passadas inteiras antes de o sorteio começar a repetir; `enPassant` tem
 * 8 puzzles na faixa mais fácil, contra os 5 que o aquecimento pede — folga de
 * três. Nesses temas o aluno que voltar muitas vezes verá posição repetida. É
 * o limite do banco público do Lichess nesses padrões, não um defeito do
 * recorte: alargar o teto para 2100 já foi o que tirou `doubleBishopMate` de
 * 51 para 79. Repetir é aceitável; abrir um tema vazio, não — e é essa a linha
 * que estes números guardam.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

type FaixaNoIndice = { de: number; ate: number; arquivo: string; total: number };
type TemaNoIndice = { tag: string; bloco: number; faixas: FaixaNoIndice[]; total: number };
type Indice = { totalNoSite: number; filtros: { rating: [number, number] }; temas: TemaNoIndice[] };

function lerIndice(): Indice {
  return JSON.parse(readFileSync(path.join(RAIZ, "public/puzzles/index.json"), "utf8")) as Indice;
}

test("todo tema do currículo tem puzzles no disco", () => {
  // O espelho do teste de conteúdo: lá é "tem texto", aqui é "tem puzzle".
  // Um tema precisa dos dois para existir de verdade.
  const noIndice = new Map(lerIndice().temas.map((t) => [t.tag, t]));
  for (const bloco of BLOCOS) {
    for (const tema of bloco.temas) {
      const t = noIndice.get(tema.tag);
      assert.ok(t, `"${tema.tag}" não está no índice do banco (bloco ${bloco.id})`);
      assert.ok(t.total > 0, `"${tema.tag}" está no índice com zero puzzles`);
    }
  }
});

test("todo tema tem ao menos uma passada inteira de puzzles", () => {
  /*
   * `PUZZLES_POR_TEMA` (39) é o que o aluno consome atravessando aquecimento,
   * série e prova uma vez. Abaixo disso, ele repete posição antes de terminar
   * o tema pela primeira vez — e aí a prova mede memória, não tática.
   */
  for (const t of lerIndice().temas) {
    assert.ok(
      t.total >= PUZZLES_POR_TEMA,
      `"${t.tag}" tem ${t.total} puzzles, e uma passada consome ${PUZZLES_POR_TEMA}`,
    );
  }
});

test("a faixa mais fácil de cada tema cobre o aquecimento", () => {
  /*
   * O aquecimento sai da faixa mais fácil do tema (`escolherAquecimento` em
   * `serie.ts`). Se ela tiver menos de `METAS.aquecimento`, o aluno começa o
   * tema já vendo repetição — logo no lugar em que a tela promete "5 puzzles
   * fáceis".
   */
  for (const t of lerIndice().temas) {
    const facil = t.faixas[0];
    assert.ok(facil, `"${t.tag}" não tem faixa nenhuma`);
    assert.ok(
      facil.total >= METAS.aquecimento,
      `"${t.tag}": a faixa ${facil.de}-${facil.ate} tem ${facil.total} puzzles, ` +
        `e o aquecimento pede ${METAS.aquecimento}`,
    );
  }
});

test("o índice e o currículo dizem a mesma coisa sobre as faixas", () => {
  /*
   * O caminho de erro real: mexer no teto de um bloco em `blocos.ts` e não
   * refazer o recorte. O site passaria a imprimir "rating 800–2100" no cartão
   * (`app/tatica/page.tsx`) enquanto o disco ainda teria as faixas velhas.
   */
  const indice = lerIndice();
  assert.deepEqual(
    indice.filtros.rating,
    [700, 2100],
    "o recorte no disco não é o de 700 a 2100 que blocos.ts descreve",
  );
  const noIndice = new Map(indice.temas.map((t) => [t.tag, t]));
  for (const tema of TEMAS) {
    const t = noIndice.get(tema.tag);
    assert.ok(t);
    for (const faixa of t.faixas) {
      assert.ok(
        faixa.de >= tema.faixa[0] && faixa.ate <= tema.faixa[1],
        `"${tema.tag}": a faixa ${faixa.de}-${faixa.ate} está fora de ${tema.faixa[0]}-${tema.faixa[1]}`,
      );
    }
  }
});

test("as faixas de cada tema vêm em ordem crescente de rating", () => {
  // A série sobe de dificuldade sozinha porque as faixas vêm nesta ordem. Fora
  // de ordem, o aluno pega o puzzle de 1900 no terceiro lugar da série.
  for (const t of lerIndice().temas) {
    for (let i = 1; i < t.faixas.length; i++) {
      assert.ok(
        t.faixas[i].de >= t.faixas[i - 1].ate,
        `"${t.tag}": a faixa ${t.faixas[i].de}-${t.faixas[i].ate} vem depois de ` +
          `${t.faixas[i - 1].de}-${t.faixas[i - 1].ate}`,
      );
    }
  }
});

test("o total do índice bate com a soma dos temas", () => {
  // O `totalNoSite` é o número que o README publica. Se ele for escrito à mão
  // um dia, este teste é quem percebe.
  const indice = lerIndice();
  const soma = indice.temas.reduce((n, t) => n + t.total, 0);
  assert.equal(soma, indice.totalNoSite);
});
