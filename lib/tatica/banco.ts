import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Indice, Puzzle, PuzzleServido, TemaNoIndice } from "./puzzles.ts";
import { ORIGEM_BASE, type LinhaDoIndice } from "./rating.ts";

/**
 * O banco de puzzles, lido **do disco pelo servidor**.
 *
 * ## Por que o servidor lê o mesmo arquivo que o celular baixa
 *
 * O recorte do Lichess mora em `public/puzzles/`, e o motivo de estar lá é que
 * o navegador só alcança `public/`. Mas quem escolhe os 24 puzzles da série e
 * quem reconfere o lance antes de gravar é o servidor — e ele precisa dos
 * mesmos bytes.
 *
 * Duplicar o recorte em `content/` daria 33 MB repetidos e, pior, dois
 * arquivos que podem divergir: o aluno resolvendo por uma solução e o servidor
 * julgando por outra. Então há **uma cópia só**, e o servidor a lê por
 * `node:fs`, com `outputFileTracingIncludes` no `next.config.ts` garantindo que
 * ela viaje junto na hospedagem.
 *
 * ## O cache
 *
 * Cada arquivo de faixa tem ~350 KB e ~2.000 puzzles. Reparsear isso a cada
 * lance conferido seria caro à toa: o recorte só muda quando alguém roda
 * `npm run puzzles:filtrar` e faz um deploy novo, e um deploy novo é um
 * processo novo. Então a promessa fica guardada em memória de módulo.
 *
 * Promessa **rejeitada não fica guardada**: um erro de leitura passageiro
 * viraria um tema quebrado até o fim da vida do processo.
 */

const RAIZ = path.join(process.cwd(), "public", "puzzles");

let indiceEmMemoria: Promise<Indice> | null = null;
let baseEmMemoria: Promise<TemaNoIndice> | null = null;
let indiceDoRatingEmMemoria: Promise<LinhaDoIndice[]> | null = null;
const faixasEmMemoria = new Map<string, Promise<Puzzle[]>>();

async function lerJson<T>(relativo: string): Promise<T> {
  return JSON.parse(await readFile(path.join(RAIZ, relativo), "utf8")) as T;
}

export function lerIndice(): Promise<Indice> {
  indiceEmMemoria ??= lerJson<Indice>("index.json").catch((erro) => {
    indiceEmMemoria = null;
    throw erro;
  });
  return indiceEmMemoria;
}

export function lerFaixa(arquivo: string): Promise<Puzzle[]> {
  let promessa = faixasEmMemoria.get(arquivo);
  if (!promessa) {
    promessa = lerJson<Puzzle[]>(arquivo).catch((erro) => {
      faixasEmMemoria.delete(arquivo);
      throw erro;
    });
    faixasEmMemoria.set(arquivo, promessa);
  }
  return promessa;
}

/**
 * O "tema" dos problemas de 600–700 do modo rating, que não é tema nenhum.
 *
 * Mora fora do `index.json` de propósito: aquele índice é o currículo, e cada
 * entrada dele vira cartão em `/tatica`, série e prova. Estes problemas não
 * aparecem em lugar nenhum disso. Mas o formato é o mesmo (`TemaNoIndice`), e é
 * isso que deixa `puzzlePorId(ORIGEM_BASE, id)` — e com ele a gravação, a
 * revisão do dia e a conferência — funcionar sem caminho especial.
 */
function lerBase(): Promise<TemaNoIndice> {
  baseEmMemoria ??= lerJson<TemaNoIndice>(`${ORIGEM_BASE}/indice.json`).catch((erro) => {
    baseEmMemoria = null;
    throw erro;
  });
  return baseEmMemoria;
}

/**
 * O índice do modo rating: `[id, origem, rating]` de todo puzzle servível, em
 * rating crescente (`npm run puzzles:indice-rating`). ~120 mil linhas em
 * memória — o mesmo cache, e pelo mesmo motivo, dos arquivos de faixa.
 */
export function lerIndiceDoRating(): Promise<LinhaDoIndice[]> {
  indiceDoRatingEmMemoria ??= lerJson<LinhaDoIndice[]>("rating-indice.json").catch((erro) => {
    indiceDoRatingEmMemoria = null;
    throw erro;
  });
  return indiceDoRatingEmMemoria;
}

export async function temaNoIndice(tag: string): Promise<TemaNoIndice | null> {
  if (tag === ORIGEM_BASE) return lerBase();
  const indice = await lerIndice();
  return indice.temas.find((t) => t.tag === tag) ?? null;
}

/**
 * Todos os puzzles de um tema, na ordem das faixas — ou seja, **em rating
 * crescente**. É a ordem em que o `filtrar-puzzles.ts` gravou, e a série
 * depende dela.
 */
export async function puzzlesDoTema(tag: string): Promise<Puzzle[]> {
  const tema = await temaNoIndice(tag);
  if (!tema) return [];
  const faixas = await Promise.all(tema.faixas.map((f) => lerFaixa(f.arquivo)));
  return faixas.flat();
}

const idsEmMemoria = new Map<string, Promise<ReadonlySet<string>>>();
let origensEmMemoria: Promise<ReadonlyMap<string, string>> | null = null;

/**
 * Os ids de um tema (ou de `rating-base`), para perguntar "ele ainda está
 * aqui?" sem varrer as faixas a cada item da fila de revisão. Tag que não é do
 * currículo dá conjunto vazio.
 */
export function idsDoTema(tag: string): Promise<ReadonlySet<string>> {
  let promessa = idsEmMemoria.get(tag);
  if (!promessa) {
    promessa = puzzlesDoTema(tag).then(
      (puzzles) => new Set(puzzles.map((p) => p.id)),
      (erro) => {
        idsEmMemoria.delete(tag);
        throw erro;
      },
    );
    idsEmMemoria.set(tag, promessa);
  }
  return promessa;
}

/**
 * `id -> origem` de todo puzzle servível, tirado do índice do modo rating — que
 * já lista cada puzzle do currículo uma vez, com um arquivo em que ele está.
 */
export function origensDoBanco(): Promise<ReadonlyMap<string, string>> {
  origensEmMemoria ??= lerIndiceDoRating().then(
    (linhas) => new Map(linhas.map((l) => [l[0], l[1]])),
    (erro) => {
      origensEmMemoria = null;
      throw erro;
    },
  );
  return origensEmMemoria;
}

/** Só a faixa mais fácil do tema. É de onde sai o aquecimento. */
export async function faixaMaisFacil(tag: string): Promise<Puzzle[]> {
  const tema = await temaNoIndice(tag);
  const primeira = tema?.faixas[0];
  return primeira ? lerFaixa(primeira.arquivo) : [];
}

/**
 * O puzzle pelo id, dentro do tema em que ele foi servido.
 *
 * O tema entra na busca de propósito: sem ele, achar um id custaria varrer os
 * 166 mil. Quem grava a tentativa sabe em que tema o aluno estava, porque foi
 * o servidor que o mandou para lá.
 */
export async function puzzlePorId(tag: string, id: string): Promise<Puzzle | null> {
  const tema = await temaNoIndice(tag);
  if (!tema) return null;
  for (const faixa of tema.faixas) {
    const achado = (await lerFaixa(faixa.arquivo)).find((p) => p.id === id);
    if (achado) return achado;
  }
  return null;
}

/**
 * Uma faixa de cada tema da lista — a do meio.
 *
 * É o que a **prova** mistura ao tema atual: o aluno tem de reconhecer o
 * motivo sem que ninguém diga o nome dele, que é o que acontece na partida.
 *
 * A faixa do meio, e não todas: carregar os quatro arquivos de sete temas
 * seriam 10 MB lidos para escolher cinco puzzles. A do meio é a dificuldade
 * média daquele tema, que é exatamente o que uma prova quer.
 *
 * ## A origem sai carimbada daqui, e cada id vem uma vez
 *
 * Quem lê o arquivo é quem sabe de onde o puzzle veio. A origem era deduzida
 * depois, pela primeira tag do puzzle que estivesse na lista — e um garfo que
 * também é `mateIn3` saía carimbado "mateIn3" sem morar no arquivo dele: a
 * gravação o recusava como "puzzle desconhecido" (248 em 8.344 servidos, medido
 * por `scripts/conferir-origens.ts`). E o mesmo id em dois arquivos entrava duas
 * vezes: a prova de nível sorteava o repetido, e uma prova sem 12 ids distintos
 * nunca é corrigida (38 em 100). Fica a primeira cópia, na ordem de `tags`.
 */
export async function amostraDeTemas(tags: readonly string[]): Promise<PuzzleServido[]> {
  const indice = await lerIndice();
  const escolhidas: { tag: string; arquivo: string }[] = [];
  for (const tag of tags) {
    const tema = indice.temas.find((t) => t.tag === tag);
    if (!tema || tema.faixas.length === 0) continue;
    escolhidas.push({ tag, arquivo: tema.faixas[Math.floor(tema.faixas.length / 2)].arquivo });
  }
  const lidas = await Promise.all(escolhidas.map((e) => lerFaixa(e.arquivo)));

  const vistos = new Set<string>();
  const amostra: PuzzleServido[] = [];
  for (const [i, puzzles] of lidas.entries()) {
    for (const p of puzzles) {
      if (vistos.has(p.id)) continue;
      vistos.add(p.id);
      amostra.push({ ...p, origem: escolhidas[i].tag });
    }
  }
  return amostra;
}
