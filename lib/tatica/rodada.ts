import type { PuzzleServido } from "./puzzles.ts";

export type ItemDaRodada = Pick<PuzzleServido, "id" | "origem">;
export type RespostaDaRodada = {
  readonly puzzle_id: string;
  readonly acertou: boolean;
};

/** A lista original e suas cotas não mudam: só retiramos o que foi respondido. */
export function pendentesDaRodada<T extends ItemDaRodada>(
  puzzles: readonly T[],
  respostas: readonly RespostaDaRodada[],
): T[] {
  const feitos = new Set(respostas.map((r) => r.puzzle_id));
  return puzzles.filter((p) => !feitos.has(p.id));
}

export function resultadoDaRodada(
  puzzles: readonly ItemDaRodada[],
  respostas: readonly RespostaDaRodada[],
  paraPassar: number,
) {
  if (puzzles.length === 0 || new Set(puzzles.map((p) => p.id)).size !== puzzles.length) return null;
  const porId = new Map(respostas.map((r) => [r.puzzle_id, r]));
  if (puzzles.some((p) => !porId.has(p.id))) return null;
  const acertos = puzzles.filter((p) => porId.get(p.id)?.acertou).length;
  return {
    acertos,
    total: puzzles.length,
    passou: acertos >= paraPassar,
    erros: [...new Set(puzzles.filter((p) => !porId.get(p.id)?.acertou).map((p) => p.origem))],
  };
}
