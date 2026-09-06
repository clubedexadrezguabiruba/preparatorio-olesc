"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { gravarTreino, type Resultado, type Treino } from "@/lib/repertorio/gravar";

export type { Treino } from "@/lib/repertorio/gravar";

/**
 * Grava uma passada pela linha.
 *
 * A casca é de propósito fina: a primeira linha confere **quem** está pedindo,
 * e o `aluno` que segue adiante é o do cookie de sessão, nunca um id vindo do
 * corpo da chamada. Todo o resto — abrir o arquivo da abertura, julgar os
 * lances, escrever — é `lib/repertorio/gravar.ts`. É a mesma forma de
 * `app/tatica/acoes.ts`, e pelo mesmo motivo.
 */
export async function registrarTreino(treino: Treino): Promise<Resultado> {
  const perfil = await perfilAtual();
  return gravarTreino(perfil.id, treino);
}
