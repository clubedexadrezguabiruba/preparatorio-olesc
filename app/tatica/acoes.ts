"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { gravarTentativa, type Resultado, type Tentativa } from "@/lib/tatica/gravar";

export type { Tentativa } from "@/lib/tatica/gravar";

/**
 * Grava uma tentativa de puzzle.
 *
 * A casca é de propósito fina: a primeira linha confere **quem** está pedindo,
 * e o `aluno` que segue adiante é o do cookie de sessão, nunca um id vindo do
 * corpo da chamada. Todo o resto — ler o puzzle, julgar a linha, escrever — é
 * `lib/tatica/gravar.ts`, que roda também fora do Next e por isso tem prova em
 * `scripts/verificar-tatica.ts`.
 */
export async function registrarTentativa(tentativa: Tentativa): Promise<Resultado> {
  const perfil = await perfilAtual();
  return gravarTentativa(perfil.id, tentativa);
}
