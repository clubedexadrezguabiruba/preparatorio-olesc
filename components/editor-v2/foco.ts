"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useAtalho, useCamadaDeJanela } from "@/components/atalhos/Atalhos";

/**
 * O contrato de teclado de uma camada modal (§25): `Esc` fecha, `Tab` não escapa para a tela atrás,
 * e — desde a fatia 10 — **o foco volta sozinho** a quem abriu, e os atalhos de trás ficam mudos.
 *
 * Ele saiu de dentro do `Dialogo` quando a prévia (§15) precisou do **mesmo contrato num casco
 * diferente**. Na fatia 10 passou a ser o único: a janela de importar, a de adicionar capítulo e a de
 * trocar a posição tinham cada uma a sua cópia desta prisão, e uma cópia de regra de foco é a regra
 * que envelhece sozinha.
 *
 * - **Esc** passa pelo registro de atalhos, na camada da janela: com duas janelas empilhadas, só a de
 *   cima fecha.
 * - **Devolução do foco:** o elemento que tinha o foco quando a janela montou recebe o foco de volta
 *   quando ela desmonta — a menos que quem fechou já tenha posto o foco em outro lugar de propósito.
 *
 * Devolve a camada, para a tela cheia registrar `x` e `?` nela (`useTeclasDoTabuleiro`).
 */
export function usePrisaoDeFoco(camada: RefObject<HTMLElement | null>, aoFechar: () => void): number {
  const { camada: numero } = useCamadaDeJanela();
  useAtalho("fechar-janela", () => { aoFechar(); }, { camada: numero });

  const quemAbriu = useRef<HTMLElement | null>(null);
  useEffect(() => {
    quemAbriu.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const origem = quemAbriu.current;
      // Só devolve se o foco ficou "perdido" (no body ou dentro da janela que sumiu).
      requestAnimationFrame(() => {
        const agora = document.activeElement;
        if (origem && origem.isConnected && (!agora || agora === document.body)) origem.focus();
      });
    };
  }, []);

  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab" || !camada.current) return;
      const focaveis = camada.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, summary, details',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!camada.current.contains(document.activeElement)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primeiro).focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      } else if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [camada]);

  return numero;
}
