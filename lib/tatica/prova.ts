import "server-only";
import { PROVA_DE_NIVEL, temasDaProva, type Nivel } from "../curso/nivel.ts";
import { sortearProvaDeNivel } from "./prova-sorteio.ts";
import { obterRodada, ultimaRodada } from "./rodadas.ts";
import { resultadoDaRodada } from "./rodada.ts";

export { sortearProvaDeNivel } from "./prova-sorteio.ts";

export type ResultadoDaProva = {
  readonly acertos: number;
  readonly total: number;
  readonly passou: boolean;
  readonly erros: readonly string[];
};

/** Retoma a lista persistida; só cria outra após conclusão e pedido de refazer. */
export async function abrirProvaDeNivel(aluno: string, nivel: Nivel, nova = false) {
  const anterior = await ultimaRodada(aluno, `nivel:${nivel}`);
  if (anterior && !nova) return anterior;
  return obterRodada({
    aluno, chave: `nivel:${nivel}`, modo: "prova-de-nivel", tema: null,
    selecionar: (numero) => sortearProvaDeNivel(aluno, nivel, numero - 1),
  });
}

/** Nunca mistura respostas de provas diferentes, mesmo interrompidas. */
export async function ultimaProvaDeNivel(
  aluno: string,
  nivel: Nivel,
): Promise<ResultadoDaProva | null> {
  const rodada = await ultimaRodada(aluno, `nivel:${nivel}`);
  if (!rodada || rodada.modo !== "prova-de-nivel" || rodada.puzzles.length !== PROVA_DE_NIVEL.puzzles) return null;
  const temas = new Set(temasDaProva(nivel));
  if (rodada.puzzles.some((p) => !temas.has(p.origem))) return null;
  return resultadoDaRodada(rodada.puzzles, rodada.respostas, PROVA_DE_NIVEL.paraPassar);
}
