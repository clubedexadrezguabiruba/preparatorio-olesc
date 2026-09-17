"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { marcarEtapaDaRodada, type ResultadoDaEtapa } from "@/lib/aberturas/rodada-banco";

/**
 * Grava que o aluno fez uma etapa da aula de abertura nesta rodada (regras 16 e 17, spec §18.1).
 *
 * Casca fina, como `registrarTreino`: o aluno é o do cookie de sessão, e quem confere que a etapa
 * existe — e, no treino e no move trainer, que o jogo foi gravado nesta rodada — é
 * `lib/aberturas/rodada-banco.ts`.
 */
export async function marcarEtapaDaAula(pedido: { aula: string; publicationId: string; etapaId: string }): Promise<ResultadoDaEtapa> {
  const perfil = await perfilAtual();
  return marcarEtapaDaRodada(perfil.id, pedido);
}
