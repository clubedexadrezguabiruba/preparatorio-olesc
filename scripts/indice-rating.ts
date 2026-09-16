/**
 * O índice do modo "tática com rating": `public/puzzles/rating-indice.json`.
 *
 * Uso:
 *   npm run puzzles:indice-rating
 *
 * Roda depois de `puzzles:filtrar` e de `puzzles:base-rating` — é deles que lê.
 *
 * ## O que é
 *
 * Uma linha `[id, origem, rating]` por puzzle servível, **em rating crescente**,
 * com um `1` no fim quando o puzzle é mate em 1 ou mate em 2 — a marca da regra
 * "nunca dois mates curtos seguidos" (`eMateCurto`, em `lib/tatica/rating.ts`).
 * O servidor guarda o arquivo em memória (`lerIndiceDoRating`, em
 * `lib/tatica/banco.ts`) e a escolha faz busca binária nele
 * (`lib/tatica/rating-escolher.ts`): achar "um puzzle perto de 1143 que o aluno
 * não viu" vira abrir uma janela no array, e não varrer 36 arquivos.
 *
 * A `origem` é o arquivo de onde `puzzlePorId(origem, id)` lê a solução na hora
 * de julgar: uma tag de tema, ou `rating-base` para os de 600–700.
 *
 * ## Ids repetidos
 *
 * O mesmo puzzle mora em mais de um tema: um garfo que dá mate está no arquivo
 * de `fork` e no de `mateIn2`. No índice ele entra **uma vez**, com a origem do
 * primeiro tema na ordem de `BLOCOS` — determinístico, e sempre um arquivo em
 * que o puzzle de fato está. Sem isso, a janela de rating contaria o garfo duas
 * vezes e o sorteio o favoreceria.
 */

import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEMAS } from "../lib/tatica/blocos.ts";
import type { Indice, Puzzle, TemaNoIndice } from "../lib/tatica/puzzles.ts";
import { eMateCurto, ORIGEM_BASE, type LinhaDoIndice } from "../lib/tatica/rating.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PUZZLES = path.join(RAIZ, "public/puzzles");

function ler<T>(relativo: string): T {
  return JSON.parse(readFileSync(path.join(PUZZLES, relativo), "utf8")) as T;
}

const indice = ler<Indice>("index.json");
const base = ler<TemaNoIndice>(`${ORIGEM_BASE}/indice.json`);

const porTag = new Map(indice.temas.map((t) => [t.tag, t]));
// A ordem de `BLOCOS`, e não a do `index.json`: é a regra do desempate, e ela
// não pode depender da ordem em que outro script gravou.
const origens: TemaNoIndice[] = [
  ...TEMAS.map((t) => {
    const noIndice = porTag.get(t.tag);
    if (!noIndice) throw new Error(`"${t.tag}" está em BLOCOS e não está no index.json`);
    return noIndice;
  }),
  base,
];

const vistos = new Set<string>();
const linhas: LinhaDoIndice[] = [];
let lidos = 0;

for (const origem of origens) {
  for (const faixa of origem.faixas) {
    for (const p of ler<Puzzle[]>(faixa.arquivo)) {
      lidos++;
      if (vistos.has(p.id)) continue;
      vistos.add(p.id);
      linhas.push(eMateCurto(p.temas) ? [p.id, origem.tag, p.rating, 1] : [p.id, origem.tag, p.rating]);
    }
  }
}

linhas.sort((a, b) => a[2] - b[2] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

const destino = path.join(PUZZLES, "rating-indice.json");
writeFileSync(destino, JSON.stringify(linhas), "utf8");

const mb = statSync(destino).size / 1024 / 1024;
console.log(`Lidos: ${lidos.toLocaleString("pt-BR")} puzzles em ${origens.length} origens.`);
console.log(`Repetidos entre temas: ${(lidos - linhas.length).toLocaleString("pt-BR")} (ficou o primeiro na ordem de BLOCOS).`);
console.log(`No índice: ${linhas.length.toLocaleString("pt-BR")} puzzles, de ${linhas[0][2]} a ${linhas.at(-1)![2]}.`);
console.log(`Da base 600–700: ${linhas.filter((l) => l[1] === ORIGEM_BASE).length.toLocaleString("pt-BR")}.`);
console.log(`Mate em 1 ou em 2 (marcados com 1): ${linhas.filter((l) => l[3] === 1).length.toLocaleString("pt-BR")}.`);
console.log(`Tamanho: ${mb.toFixed(2)} MB.`);
