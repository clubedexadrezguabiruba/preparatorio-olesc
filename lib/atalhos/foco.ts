/**
 * O Espaço com o foco num controle é do navegador: ele aperta o botão focado. Um atalho que também
 * agisse faria o gesto valer duas vezes — o "clique duplo" que a `Passada` evita desde a F3 e o
 * capítulo da aula passou a evitar em 17/9/2026.
 *
 * Puro: recebe qualquer coisa com `closest`, para o teste não precisar de DOM.
 */
export type AlvoDoFoco = { closest?: (seletor: string) => unknown } | null | undefined;

export const SELETOR_DE_CONTROLE = "button, a, input, select, textarea, [contenteditable]";

export function focoEmControle(alvo: AlvoDoFoco): boolean {
  return Boolean(alvo && typeof alvo.closest === "function" && alvo.closest(SELETOR_DE_CONTROLE));
}
