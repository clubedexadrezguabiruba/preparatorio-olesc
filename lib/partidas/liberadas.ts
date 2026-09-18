/**
 * As partidas instrutivas ainda não estão prontas (18/9/2026): o aluno vê "Em breve" em `/partidas`
 * e não entra em nenhuma partida, nem pela URL. O professor continua entrando, para revisar.
 *
 * **Para liberar, é só trocar para `true`.**
 */
export const PARTIDAS_LIBERADAS = false;

export function podeAbrirPartidas(papel: "aluno" | "professor"): boolean {
  return papel === "professor" || PARTIDAS_LIBERADAS;
}
