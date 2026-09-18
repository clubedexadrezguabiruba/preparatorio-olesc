"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { gravarTentativa, type Resultado, type Tentativa } from "@/lib/tatica/gravar";
import { temaLiberado } from "@/lib/tatica/ordem";
import { progressoPorTema } from "@/lib/tatica/progresso";
import { ETAPAS } from "@/lib/tatica/serie";

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
  if (tentativa.modo !== "revisao" && !tentativa.rodadaId) {
    return { erro: "A rodada foi atualizada. Recarregue a página para continuar." };
  }
  // A revisão e a prova de nível só servem puzzles já vistos; as três etapas são do tema, e o tema
  // trancado não grava (a URL já redireciona, isto fecha a chamada direta).
  if ((ETAPAS as readonly string[]).includes(tentativa.modo)) {
    const progresso = await progressoPorTema();
    const feitos = new Map([...progresso].map(([t, p]) => [t, p.feitos]));
    if (!temaLiberado(tentativa.tema, feitos, perfil.papel === "professor")) {
      return { erro: "Este tema ainda está trancado: feche o anterior primeiro." };
    }
  }
  return gravarTentativa(perfil.id, tentativa);
}
