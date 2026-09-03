import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Indice, Puzzle, TemaNoIndice } from "./puzzles.ts";

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

export async function temaNoIndice(tag: string): Promise<TemaNoIndice | null> {
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
 */
export async function amostraDeTemas(tags: readonly string[]): Promise<Puzzle[]> {
  const indice = await lerIndice();
  const arquivos: string[] = [];
  for (const tag of tags) {
    const tema = indice.temas.find((t) => t.tag === tag);
    if (!tema || tema.faixas.length === 0) continue;
    arquivos.push(tema.faixas[Math.floor(tema.faixas.length / 2)].arquivo);
  }
  return (await Promise.all(arquivos.map(lerFaixa))).flat();
}
