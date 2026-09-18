"use client";

import { useEffect } from "react";

/**
 * Ao abrir a trilha, leva o aluno até o próximo passo — como o Duolingo, que
 * abre o caminho na lição da vez, e não no topo.
 *
 * Só rola se o nó estiver fora da tela: quem já vê o próximo passo não precisa
 * ver a página pular. Sem animação: rolagem suave no carregamento lê como a
 * página mexendo sozinha.
 */
export function RolarAteOProximo() {
  useEffect(() => {
    const alvo = document.getElementById("proximo");
    if (!alvo) return;
    const { top, bottom } = alvo.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) alvo.scrollIntoView({ block: "center" });
  }, []);
  return null;
}
