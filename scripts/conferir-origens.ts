import { NIVEIS, temasDaProva } from "../lib/curso/nivel.ts";
import { puzzlePorId } from "../lib/tatica/banco.ts";
import { TEMAS } from "../lib/tatica/blocos.ts";
import { escolherPuzzles } from "../lib/tatica/escolher.ts";
import { sortearProvaDeNivel } from "../lib/tatica/prova-sorteio.ts";
import type { PuzzleServido } from "../lib/tatica/puzzles.ts";

/**
 * Todo puzzle que a prova serve mora no arquivo que a `origem` dele diz?
 *
 *     node --conditions=react-server scripts/conferir-origens.ts
 *
 * Contra o banco de puzzles em disco, sem Supabase. Sorteia, para cada tema, a
 * prova do tema com os três temas anteriores do currículo misturados, e para
 * cada nível as provas de nível de 20 alunos inventados. Depois procura cada
 * puzzle servido em `puzzlePorId(origem, id)` — é o que a gravação faz, e um
 * `null` ali é tentativa recusada como "puzzle desconhecido".
 *
 * Conta também a prova de nível com o mesmo id duas vezes: `ultimaProvaDeNivel`
 * exige 12 puzzles distintos, e uma prova com repetido nunca seria corrigida.
 */

const ALUNOS = 20;
let servidos = 0;
let foraDoArquivo = 0;
let provasComRepetido = 0;
const exemplos: string[] = [];

async function conferir(onde: string, puzzles: readonly PuzzleServido[]): Promise<void> {
  for (const p of puzzles) {
    servidos++;
    if (await puzzlePorId(p.origem, p.id)) continue;
    foraDoArquivo++;
    if (exemplos.length < 5) {
      exemplos.push(`${onde}: ${p.id} carimbado "${p.origem}", tags ${p.temas.join(" ")}`);
    }
  }
}

for (const [i, tema] of TEMAS.entries()) {
  const anteriores = TEMAS.slice(Math.max(0, i - 3), i).map((t) => t.tag).reverse();
  for (let aluno = 0; aluno < ALUNOS; aluno++) {
    const puzzles = await escolherPuzzles({
      tag: tema.tag,
      etapa: "prova",
      faltam: 10,
      semente: `origens:${aluno}:${tema.tag}`,
      jaVistos: new Set(),
      outrosTemas: anteriores,
      errados: [],
    });
    await conferir(`prova de ${tema.tag}`, puzzles);
  }
}

for (const nivel of NIVEIS) {
  if (temasDaProva(nivel).length === 0) continue;
  for (let aluno = 0; aluno < ALUNOS; aluno++) {
    const puzzles = await sortearProvaDeNivel(`aluno-${aluno}`, nivel, 0);
    await conferir(`prova do nível ${nivel}`, puzzles);
    if (new Set(puzzles.map((p) => p.id)).size !== puzzles.length) provasComRepetido++;
  }
}

console.log(`Puzzles servidos: ${servidos}`);
console.log(`Fora do arquivo da origem: ${foraDoArquivo}`);
console.log(`Provas de nível com id repetido: ${provasComRepetido}`);
for (const e of exemplos) console.log(`  ${e}`);
if (foraDoArquivo > 0 || provasComRepetido > 0) process.exitCode = 1;
