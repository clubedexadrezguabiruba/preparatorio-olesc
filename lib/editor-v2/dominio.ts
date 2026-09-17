/**
 * De que curso é uma aula v2, pelo id — especificação §13.3.3 (decisões do Doug, 16/9/2026).
 *
 * Até o curso de abertura, a pergunta era respondida em cada arquivo com um `startsWith("EX-")`
 * ou uma regex de `N\d`. Três prefixos pedem um lugar só:
 *
 * - **finais** — `N0-…` a `N5-…`, as aulas da trilha de finais;
 * - **extra** — `EX-…`, as aulas extras de finais (§22);
 * - **abertura** — `AB-<COR>-<ABERTURA>-<BLOCO>`, uma aula por bloco do estudo (§13.3).
 *
 * Aula de abertura **nunca** aparece em `/finais`, no índice de finais nem no progresso de níveis.
 * Módulo puro: roda no navegador e no servidor.
 */

export type DominioDaAulaV2 = "finais" | "extra" | "abertura";

export type CorDoCurso = "brancas" | "pretas";

export type AberturaDaAula = { cor: CorDoCurso; abertura: string; bloco: string };

/** `AB-BRANCAS-FRANCESA-B`, `AB-PRETAS-CARO-KANN-EF`: a cor, o slug da abertura e o bloco. */
export const ID_DE_ABERTURA = /^AB-(BRANCAS|PRETAS)-([A-Z0-9]+(?:-[A-Z0-9]+)*)-([A-Z0-9]{1,3})$/;

export function dominioDaAulaV2(id: string): DominioDaAulaV2 {
  if (id.startsWith("AB-")) return "abertura";
  if (id.startsWith("EX-")) return "extra";
  return "finais";
}

/** As aulas que pertencem a `/finais`: as da trilha e as extras. */
export const ehAulaDeFinais = (id: string) => dominioDaAulaV2(id) !== "abertura";

/** Lê cor, abertura e bloco de um id `AB-`; `null` para qualquer outro id. */
export function aberturaDoId(id: string): AberturaDaAula | null {
  const casou = ID_DE_ABERTURA.exec(id);
  if (!casou) return null;
  return { cor: casou[1].toLowerCase() as CorDoCurso, abertura: casou[2].toLowerCase(), bloco: casou[3] };
}

/** O id de uma aula de abertura. O slug `caro-kann` vira `CARO-KANN`. */
export function idDaAulaDeAbertura({ cor, abertura, bloco }: AberturaDaAula): string {
  return `AB-${cor.toUpperCase()}-${abertura.toUpperCase()}-${bloco.toUpperCase()}`;
}
