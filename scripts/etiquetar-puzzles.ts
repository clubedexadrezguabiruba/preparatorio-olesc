/**
 * As nossas etiquetas: `dados/etiquetas-nossas.tsv`.
 *
 * Uso:
 *   npm run puzzles:etiquetar                 (o CSV inteiro)
 *   npm run puzzles:etiquetar -- --linhas 200000   (só o começo, para medir)
 *   npm run puzzles:etiquetar -- --reconferir maxLangeMate,retiMate
 *
 * `--reconferir` refaz só os puzzles que **já** levam uma das tags pedidas, e
 * troca as tags deles no arquivo. Serve quando uma regra ficou **mais estrita**:
 * um puzzle sem a tag não pode ganhá-la com mais uma condição, então conferir de
 * novo só os que a têm dá o mesmo arquivo que a rodada inteira — em segundos, e
 * não em meia hora. Regra que afrouxa pede a rodada inteira.
 *
 * Roda **antes** de `puzzles:filtrar` e de `puzzles:base-rating`, que leem o
 * arquivo. Lê o CSV uma vez, com os mesmos filtros de qualidade dos dois, e
 * passa cada puzzle pelos detectores de `lib/tatica/padroes/detectores.ts`.
 *
 * O arquivo tem um cabeçalho `# governa: ...` com todas as tags que os
 * detectores decidem — para elas, o que o Lichess disse deixa de valer — e uma
 * linha `id<TAB>tags` por puzzle que ganhou alguma. Ver `lerEtiquetasNossas`.
 *
 * ## Em paralelo
 *
 * Reproduzir a linha de cada puzzle com chess.js custa ~0,2 ms, e são milhões.
 * O script divide o trabalho entre os núcleos (`worker_threads`): a linha
 * principal lê o CSV e manda lotes; cada trabalhador etiqueta e devolve.
 */

import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, Worker } from "node:worker_threads";
import { etiquetar, TAGS_GOVERNADAS } from "../lib/tatica/padroes/detectores.ts";
import { lerEtiquetasNossas, lerLinha, type Bruto } from "./puzzles-lichess.ts";

/** Do piso da base do rating (600) ao teto dos temas (2100). */
const RATING_MINIMO = 600;
const RATING_MAXIMO = 2100;
const LOTE = 2000;

type Resultado = { id: string; tags: string[]; rating: number };

if (!isMainThread) {
  parentPort!.on("message", (lote: Bruto[]) => {
    const saida: Resultado[] = [];
    for (const p of lote) {
      const tags = etiquetar(p);
      if (tags.length) saida.push({ id: p.id, tags, rating: p.rating });
    }
    parentPort!.postMessage({ saida, feitos: lote.length });
  });
} else if (process.argv.includes("--reconferir")) {
  await reconferir(process.argv[process.argv.indexOf("--reconferir") + 1].split(","));
} else {
  await principal();
}

async function reconferir(tags: readonly string[]): Promise<void> {
  const RAIZ = fileURLToPath(new URL("..", import.meta.url));
  const destino = path.join(RAIZ, "dados/etiquetas-nossas.tsv");
  const atuais = lerEtiquetasNossas(destino);
  const porId = new Map(atuais.porId);
  const alvo = new Set([...porId].filter(([, t]) => t.some((x) => tags.includes(x))).map(([id]) => id));
  const antes = new Map(tags.map((t) => [t, [...porId.values()].filter((l) => l.includes(t)).length]));

  const leitor = createInterface({
    input: createReadStream(path.join(RAIZ, "dados/lichess_db_puzzle.csv"), { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let vistos = 0;
  for await (const linha of leitor) {
    const id = linha.slice(0, linha.indexOf(","));
    if (!alvo.has(id)) continue;
    const p = lerLinha(linha, RATING_MINIMO, RATING_MAXIMO);
    if (!p) continue;
    vistos++;
    const novas = etiquetar(p);
    if (novas.length) porId.set(id, novas);
    else porId.delete(id);
  }

  const ordenados = [...porId].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  writeFileSync(
    destino,
    `# governa: ${TAGS_GOVERNADAS.join(" ")}\n` + ordenados.map(([id, t]) => `${id}\t${t.join(" ")}`).join("\n") + "\n",
    "utf8",
  );
  console.log(`Reconferidos: ${vistos} de ${alvo.size} puzzles.`);
  for (const t of tags) {
    const depois = [...porId.values()].filter((l) => l.includes(t)).length;
    console.log(`  ${t.padEnd(18)} ${antes.get(t)} → ${depois}`);
  }
}

async function principal(): Promise<void> {
  const RAIZ = fileURLToPath(new URL("..", import.meta.url));
  const argv = process.argv.slice(2);
  const iLinhas = argv.indexOf("--linhas");
  const maxLinhas = iLinhas >= 0 ? Number(argv[iLinhas + 1]) : Infinity;
  const csv = path.join(RAIZ, "dados/lichess_db_puzzle.csv");
  const destino = path.join(RAIZ, "dados/etiquetas-nossas.tsv");

  const n = Math.max(1, availableParallelism() - 1);
  const trabalhadores = Array.from({ length: n }, () => new Worker(fileURLToPath(import.meta.url)));
  const livres: Worker[] = [...trabalhadores];
  const esperando: ((w: Worker) => void)[] = [];
  const resultados: Resultado[] = [];
  let lidos = 0;
  let pendentes = 0;
  let fim: () => void = () => {};
  const tudoPronto = new Promise<void>((r) => (fim = r));

  for (const w of trabalhadores) {
    w.on("message", ({ saida }: { saida: Resultado[] }) => {
      resultados.push(...saida);
      pendentes--;
      const proximo = esperando.shift();
      if (proximo) proximo(w);
      else livres.push(w);
      if (pendentes === 0 && terminouDeLer) fim();
    });
  }

  const pegar = (): Promise<Worker> =>
    livres.length ? Promise.resolve(livres.pop()!) : new Promise((r) => esperando.push(r));

  const inicio = Date.now();
  let terminouDeLer = false;
  let lote: Bruto[] = [];
  let linhas = 0;
  const leitor = createInterface({ input: createReadStream(csv, { encoding: "utf8" }), crlfDelay: Infinity });

  const enviar = async (l: Bruto[]) => {
    const w = await pegar();
    pendentes++;
    w.postMessage(l);
  };

  for await (const linha of leitor) {
    if (++linhas > maxLinhas) break;
    const p = lerLinha(linha, RATING_MINIMO, RATING_MAXIMO);
    if (!p) continue;
    lidos++;
    lote.push(p);
    if (lote.length === LOTE) {
      await enviar(lote);
      lote = [];
    }
    if (linhas % 1_000_000 === 0) {
      process.stdout.write(`  ${linhas / 1_000_000} M linhas, ${((Date.now() - inicio) / 1000).toFixed(0)} s\n`);
    }
  }
  if (lote.length) await enviar(lote);
  terminouDeLer = true;
  if (pendentes > 0) await tudoPronto;
  await Promise.all(trabalhadores.map((w) => w.terminate()));

  resultados.sort((a, b) => (a.id < b.id ? -1 : 1));
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(
    destino,
    `# governa: ${TAGS_GOVERNADAS.join(" ")}\n` + resultados.map((r) => `${r.id}\t${r.tags.join(" ")}`).join("\n") + "\n",
    "utf8",
  );

  console.log(
    `\n${lidos.toLocaleString("pt-BR")} puzzles passaram nos filtros (${RATING_MINIMO}–${RATING_MAXIMO}), ` +
      `etiquetados em ${((Date.now() - inicio) / 1000).toFixed(0)} s com ${n} trabalhadores.`,
  );
  console.log(`${resultados.length.toLocaleString("pt-BR")} ganharam alguma tag. Gravado em ${destino}.\n`);

  // A contagem por tag, e quantos cairiam na primeira faixa de 1000–1200 (a
  // dos blocos novos): é a régua de entrada de um tema.
  console.log("Tag                   total   1000–2100   1000–1200");
  for (const tag of TAGS_GOVERNADAS) {
    const comTag = resultados.filter((r) => r.tags.includes(tag));
    const noBloco = comTag.filter((r) => r.rating >= 1000 && r.rating <= 2100).length;
    const primeira = comTag.filter((r) => r.rating >= 1000 && r.rating < 1200).length;
    console.log(
      `${tag.padEnd(20)} ${String(comTag.length).padStart(7)} ${String(noBloco).padStart(11)} ${String(primeira).padStart(11)}`,
    );
  }
}
