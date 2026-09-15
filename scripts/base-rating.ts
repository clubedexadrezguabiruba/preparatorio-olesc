/**
 * Os problemas de 600 a 700 — só do modo "tática com rating".
 *
 * Uso:
 *   npm run puzzles:base-rating -- [caminho-do-csv]
 *   npm run puzzles:base-rating -- --limite 500     (teto por faixa, para testar)
 *
 * ## Por que existe (decisão do Doug, 15/9)
 *
 * Todo aluno começa o modo rating em 400 (`lib/tatica/glicko2.ts`), e o piso
 * dos 36 temas é 700 (`lib/tatica/blocos.ts`) — piso que **não muda**. Sem
 * problemas abaixo de 700, o aluno de 400 receberia um puzzle 300 pontos acima
 * dele, e o primeiro acerto valeria +383.
 *
 * ## Por que 600, e não os 400 do plano (medido em 15/9)
 *
 * O plano pedia 400–700. **O banco do Lichess não tem esses problemas:** o menor
 * rating do CSV inteiro (3.080.528 puzzles) é 545, há 117 abaixo de 600, e
 * nenhum deles passa nos três filtros de qualidade. De 600 a 700 passam 54.235.
 * Então a base é 600–700, e o primeiro acerto do aluno de 400 vale +302 contra
 * um de 600 (o plano esperava +201 contra um de 450). Baixar os filtros para
 * alcançar os 117 seria servir justamente os puzzles que ninguém jogou.
 *
 * Estes problemas **não pertencem a tema nenhum** e não aparecem em série de
 * tema nenhuma. A origem deles é `rating-base` (`lib/tatica/banco.ts`).
 *
 * ## Mesmo formato, mesmos filtros
 *
 * O `Puzzle` de `lib/tatica/puzzles.ts`, e os filtros de qualidade de
 * `scripts/puzzles-lichess.ts` — o mesmo módulo que `filtrar-puzzles.ts`
 * importa. A amostra é a mesma também: as `teto` menores chaves de
 * `chaveDe(id)`, uniforme e determinística.
 *
 * ## O que grava
 *
 * - `public/puzzles/rating-base/<de>-<ate>.json` — 600-650 e 650-700, cada um
 *   em rating crescente;
 * - `public/puzzles/rating-base/indice.json` — o `TemaNoIndice` dessa origem,
 *   no formato de uma entrada do `index.json` dos temas. É por ele que
 *   `puzzlePorId("rating-base", id)` acha o arquivo.
 *
 * Só apaga e regrava `rating-base/`. Os temas ficam intocados.
 */

import { createReadStream, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chaveDe } from "../lib/tatica/chave.ts";
import { ORIGEM_BASE } from "../lib/tatica/rating.ts";
import {
  DESVIO_MAXIMO,
  JOGADAS_MINIMAS,
  lerLinha,
  POPULARIDADE_MINIMA,
  problemaDo,
  type Bruto,
} from "./puzzles-lichess.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/**
 * Duas faixas de 50 em 50. O 700 fica fora: ele é o piso dos temas. Abaixo de
 * 600 não há o que recortar — ver "Por que 600" no cabeçalho.
 */
const FAIXAS: readonly [number, number][] = [
  [600, 650],
  [650, 700],
];

/**
 * Teto por faixa: 3.000.
 *
 * Um aluno sai da faixa de 600–700 depois de algumas dezenas de problemas — o
 * rating anda centenas de pontos por acerto no começo. 3.000 por faixa são
 * dezenas de vezes o que a turma inteira consome ali, e dão ~1 MB no total.
 */
const TETO_PADRAO = 3000;

const argv = process.argv.slice(2);
const iLimite = argv.indexOf("--limite");
const teto = iLimite >= 0 ? Number(argv[iLimite + 1]) : TETO_PADRAO;
const csv =
  argv.find((a, i) => !a.startsWith("--") && !(iLimite >= 0 && i === iLimite + 1)) ??
  path.join(RAIZ, "dados/lichess_db_puzzle.csv");

type Balde = { de: number; ate: number; vistos: number; amostra: (Bruto & { chave: number })[] };

const baldes: Balde[] = FAIXAS.map(([de, ate]) => ({ de, ate, vistos: 0, amostra: [] }));

function aparar(balde: Balde): void {
  balde.amostra.sort((a, b) => a.chave - b.chave);
  balde.amostra.length = Math.min(balde.amostra.length, teto);
}

async function principal(): Promise<void> {
  console.log(`Lendo ${csv}`);
  console.log(
    `Filtros: rating ${FAIXAS[0][0]}-${FAIXAS.at(-1)![1]} (sem o ${FAIXAS.at(-1)![1]}), ` +
      `popularidade >= ${POPULARIDADE_MINIMA}, jogadas >= ${JOGADAS_MINIMAS}, ` +
      `desvio <= ${DESVIO_MAXIMO}, teto ${teto}/faixa\n`,
  );

  const leitor = createInterface({ input: createReadStream(csv, { encoding: "utf8" }), crlfDelay: Infinity });
  const inicio = Date.now();
  let linhas = 0;

  for await (const linha of leitor) {
    linhas++;
    // `lerLinha` aceita o teto; o `< ate` de cada balde é quem tira o 700.
    const lido = lerLinha(linha, FAIXAS[0][0], FAIXAS.at(-1)![1]);
    if (!lido) continue;
    const balde = baldes.find((b) => lido.rating >= b.de && lido.rating < b.ate);
    if (!balde) continue;
    balde.vistos++;
    const chave = chaveDe(lido.id);
    if (balde.amostra.length >= teto && chave > balde.amostra[balde.amostra.length - 1].chave) continue;
    balde.amostra.push({ ...lido, chave });
    if (balde.amostra.length > teto * 2) aparar(balde);
  }

  console.log(`${linhas.toLocaleString("pt-BR")} linhas em ${((Date.now() - inicio) / 1000).toFixed(0)} s.\n`);

  const destino = path.join(RAIZ, "public/puzzles", ORIGEM_BASE);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });

  const faixas: { de: number; ate: number; arquivo: string; total: number }[] = [];
  let total = 0;
  let noBanco = 0;
  let recusados = 0;
  let bytes = 0;

  console.log("Faixa      no site   no banco      KB");
  for (const balde of baldes) {
    aparar(balde);
    noBanco += balde.vistos;
    const bons = balde.amostra
      .filter((p) => {
        const problema = problemaDo(p);
        if (problema) {
          recusados++;
          if (recusados <= 5) console.warn(`  recusado ${p.id}: ${problema}`);
        }
        return !problema;
      })
      .map(({ id, fen, lances, rating, temas }) => ({ id, fen, lances, rating, temas }))
      .sort((a, b) => a.rating - b.rating || (a.id < b.id ? -1 : 1));

    const arquivo = `${ORIGEM_BASE}/${balde.de}-${balde.ate}.json`;
    const caminho = path.join(RAIZ, "public/puzzles", arquivo);
    writeFileSync(caminho, JSON.stringify(bons), "utf8");
    const kb = statSync(caminho).size / 1024;
    bytes += statSync(caminho).size;
    faixas.push({ de: balde.de, ate: balde.ate, arquivo, total: bons.length });
    total += bons.length;
    console.log(
      `  ${`${balde.de}-${balde.ate}`.padEnd(8)} ${String(bons.length).padStart(7)} ` +
        `${balde.vistos.toLocaleString("pt-BR").padStart(10)} ${kb.toFixed(0).padStart(7)}`,
    );
  }

  writeFileSync(
    path.join(destino, "indice.json"),
    `${JSON.stringify({ tag: ORIGEM_BASE, bloco: 0, faixas, total, noBanco }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nTotal: ${total.toLocaleString("pt-BR")} problemas, ${(bytes / 1024 / 1024).toFixed(2)} MB.`);
  if (recusados) console.log(`Recusados na conferência: ${recusados}.`);
  if (baldes.some((b) => b.amostra.length === 0)) {
    console.error("Há faixa sem nenhum problema.");
    process.exitCode = 1;
  }
}

await principal();
