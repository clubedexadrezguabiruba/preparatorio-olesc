"use client";

import { useEffect, type RefObject } from "react";

/**
 * O contrato de teclado de uma camada modal (§25): `Esc` fecha, e `Tab` não escapa
 * para a tela atrás.
 *
 * Ele saiu de dentro do `Dialogo` quando a prévia (§15) precisou do **mesmo contrato
 * num casco diferente**: a janela do `Dialogo` é centrada, rola por dentro e tem
 * rodapé grudado; a prévia toma a tela inteira, porque o palco da aula é dimensionado
 * pela altura da janela (`.aula-palco`, em `app/globals.css`) e não sobreviveria a ser
 * espremido dentro de outra caixa.
 *
 * Dois cascos, um contrato. É a mesma lição que criou o `Dialogo`: cópia de regra de
 * foco é a regra que envelhece sozinha.
 */
export function usePrisaoDeFoco(camada: RefObject<HTMLElement | null>, aoFechar: () => void) {
  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        aoFechar();
        return;
      }
      if (evento.key !== "Tab" || !camada.current) return;
      const focaveis = camada.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, summary, details',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      } else if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [camada, aoFechar]);
}
