import type { Nivel } from "./nivel.ts";

/**
 * Até que nível o curso está liberado para o aluno (Doug, 18/9/2026).
 *
 * O nível 1 é o que está pronto: os 3 temas de tática, as 6 aulas de finais e as aberturas do nível
 * 1. Os níveis de cima ficam trancados **mesmo que o aluno passe na prova de nível** — até o Doug
 * liberar. O professor entra em tudo.
 *
 * **Para liberar o nível 2, é só trocar este número.** A tática não passa por aqui: ela abre em
 * corrente (`lib/tatica/ordem.ts`).
 */
export const NIVEL_LIBERADO: Nivel = 1;

export type Papel = "aluno" | "professor";

/** O aluno entra num item deste nível? O nível já liberado e já alcançado; o professor, sempre. */
export function nivelAberto(
  nivel: Nivel,
  { papel, nivelDoAluno }: { papel: Papel; nivelDoAluno: Nivel },
  liberado: Nivel = NIVEL_LIBERADO,
): boolean {
  if (papel === "professor") return true;
  return nivel <= liberado && nivel <= nivelDoAluno;
}
