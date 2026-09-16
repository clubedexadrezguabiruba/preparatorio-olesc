import "server-only";
import { PROVA_DE_NIVEL, temasDaProva, type Nivel } from "../curso/nivel.ts";
import { amostraDeTemas } from "./banco.ts";
import type { PuzzleServido } from "./puzzles.ts";
import { misturar, sortear } from "./serie.ts";

/**
 * Os 12 puzzles desta tentativa.
 *
 * ## A semente, e as duas coisas que ela precisa fazer ao mesmo tempo
 *
 * **Estável se a página recarregar**, para um F5 no meio da prova não trocar os
 * puzzles; e **diferente a cada nova tentativa**, para repetir a prova não ser
 * refazer a mesma. As duas saem de `(aluno, nível, tentativa)`, onde
 * `tentativa` é quantas provas completas de 12 já ficaram gravadas — uma
 * divisão inteira que **não anda no meio da rodada**, porque as 11 primeiras
 * linhas ainda dão o mesmo quociente.
 *
 * `jaVistos` fica vazio de propósito: a prova **quer** repetir o que o aluno já
 * viu. É o contrário da série, onde `sortear` exclui o visto para não servir o
 * mesmo puzzle duas vezes.
 */
export async function sortearProvaDeNivel(
  aluno: string,
  nivel: Nivel,
  tentativa: number,
): Promise<PuzzleServido[]> {
  const temas = temasDaProva(nivel);
  const candidatos = await amostraDeTemas(temas);
  const semente = `${aluno}:prova-de-nivel:${nivel}:${tentativa}`;

  const escolhidos = sortear(candidatos, PROVA_DE_NIVEL.puzzles, semente, new Set());

  // A origem vem carimbada por `amostraDeTemas` — o arquivo de onde o puzzle
  // foi lido —, e cada id vem uma vez só: a correção exige 12 distintos.
  return misturar(escolhidos, semente);
}
