import "server-only";
import { PROVA_DE_NIVEL, temasDaProva, type Nivel } from "../curso/nivel.ts";
import { criarClienteServidor } from "../supabase/servidor.ts";
import { amostraDeTemas } from "./banco.ts";
import type { PuzzleServido } from "./puzzles.ts";
import { misturar, sortear } from "./serie.ts";

/**
 * A prova de nível: 12 puzzles misturados, sem dizer o tema.
 *
 * ## Por que ela existe, sendo a quinta medida de "eu sei isto"
 *
 * O site já tem quatro — a prova do tema, a tablebase dos finais, os três
 * degraus do repertório, a fila de revisão — e **todas dizem ao aluno qual é o
 * tema**. Na partida ninguém avisa "aqui tem um garfo". Reconhecer que existe
 * uma tática *sem ser avisado* é a única habilidade que o curso não treina em
 * lugar nenhum, e é o que esta prova treina. É isso que a impede de ser a
 * quinta régua redundante.
 *
 * ## Ela é o selo, não o exame de admissão
 *
 * Ofertada **só depois** de tática, finais e repertório do nível terem fechado
 * (`prontoParaProva` em `lib/curso/nivel.ts`). E é repetível, com sorteio novo
 * a cada vez: sem prova de saída ninguém tem incentivo para burlar — o aluno já
 * fez os 39 puzzles de cada tema —, e limitar tentativas só produziria alunos
 * presos.
 *
 * Reprovar não pune. Os 12 entram na fila de revisão normal, como qualquer
 * outro erro, e a tela nomeia os temas errados.
 */

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

  return misturar(escolhidos, semente).map((p) => ({
    ...p,
    // A origem é o tema de cujo arquivo o puzzle veio — sem ela o servidor
    // procuraria a solução no arquivo errado e recusaria a tentativa.
    origem: temas.find((t) => p.temas.includes(t)) ?? temas[0],
  }));
}

/** Uma linha da prova, no que a correção precisa saber. */
export type LinhaDaProva = {
  readonly puzzleId: string;
  readonly tema: string;
  readonly acertou: boolean;
};

/**
 * As linhas de prova de nível deste aluno, da mais recente para a mais antiga.
 *
 * Lê no máximo o dobro de uma prova: quem corrige só olha as 12 últimas, e o
 * resto do histórico não é pergunta de ninguém.
 */
async function ultimasLinhas(aluno: string): Promise<LinhaDaProva[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("tentativas_puzzle")
    .select("puzzle_id, tema, acertou, criada_em")
    .eq("aluno", aluno)
    .eq("modo", "prova-de-nivel")
    .order("criada_em", { ascending: false })
    .limit(PROVA_DE_NIVEL.puzzles * 2);

  return ((data ?? []) as { puzzle_id: string; tema: string; acertou: boolean }[]).map((l) => ({
    puzzleId: l.puzzle_id,
    tema: l.tema,
    acertou: l.acertou,
  }));
}

/** Quantas provas de nível completas o aluno já deixou gravadas. */
export async function tentativasCompletas(aluno: string): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("tentativas_puzzle")
    .select("*", { count: "exact", head: true })
    .eq("aluno", aluno)
    .eq("modo", "prova-de-nivel");
  return Math.floor((count ?? 0) / PROVA_DE_NIVEL.puzzles);
}

export type ResultadoDaProva = {
  readonly acertos: number;
  readonly total: number;
  readonly passou: boolean;
  /** Os temas dos erros, sem repetir. A tela os nomeia — nunca "tente de novo". */
  readonly erros: readonly string[];
};

/**
 * A última prova completa deste aluno, corrigida — ou `null` se não há uma.
 *
 * ## Por que "as 12 últimas", e não uma tentativa identificada
 *
 * Porque não há tabela de prova, de propósito (ver `0009_prova_de_nivel.sql`):
 * o resultado **são** as linhas. Identificá-las exigiria uma coluna nova cuja
 * única função seria agrupar o que a ordem cronológica já agrupa.
 *
 * A conferência que fecha o buraco: as 12 têm de ser **puzzles distintos** e
 * todas de temas que a prova deste nível sorteia. Uma rodada abandonada pela
 * metade, misturada com o resto de uma prova antiga, cai fora por uma das duas
 * — e o chamador ainda reconfere `prontoParaProva` antes de conceder qualquer
 * coisa.
 */
export async function ultimaProvaDeNivel(
  aluno: string,
  nivel: Nivel,
): Promise<ResultadoDaProva | null> {
  const linhas = (await ultimasLinhas(aluno)).slice(0, PROVA_DE_NIVEL.puzzles);
  if (linhas.length < PROVA_DE_NIVEL.puzzles) return null;

  const doNivel = new Set(temasDaProva(nivel));
  if (linhas.some((l) => !doNivel.has(l.tema))) return null;
  if (new Set(linhas.map((l) => l.puzzleId)).size !== linhas.length) return null;

  const acertos = linhas.filter((l) => l.acertou).length;
  return {
    acertos,
    total: linhas.length,
    passou: acertos >= PROVA_DE_NIVEL.paraPassar,
    erros: [...new Set(linhas.filter((l) => !l.acertou).map((l) => l.tema))],
  };
}
