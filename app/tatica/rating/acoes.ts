"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { responderRating, type RespostaDoRating } from "@/lib/tatica/gravar-rating";

export type { RespostaDoRating } from "@/lib/tatica/gravar-rating";

/**
 * Responde ao problema pendente do modo rating.
 *
 * A casca fina de `app/tatica/acoes.ts`: a primeira linha confere **quem** está
 * pedindo, e o `aluno` que segue é o do cookie de sessão, nunca um id do corpo
 * da chamada. O navegador manda só o id do problema e os lances jogados — nem
 * "acertei", nem o tempo, nem o rating. Todo o resto é
 * `lib/tatica/gravar-rating.ts`, que `scripts/verificar-tatica-rating.ts` prova
 * contra o banco.
 */
export async function responder(puzzleId: string, lances: string[]): Promise<RespostaDoRating> {
  const perfil = await perfilAtual();
  return responderRating(perfil.id, puzzleId, lances);
}
