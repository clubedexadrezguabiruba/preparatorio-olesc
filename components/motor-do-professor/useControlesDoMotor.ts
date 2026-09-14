"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { ehCampoDeTexto } from "@/lib/editor-v2/navegacao";
import { useMotorDoProfessor } from "@/lib/engine/useMotorDoProfessor";

/**
 * O que os dois editores (aulas e repertório) ligam no motor do professor: o
 * interruptor, a seta, quantas linhas, a tecla `L` e a forma da seta para o tabuleiro.
 *
 * **Sempre desligado ao abrir** (§23.1): os três estados são `useState` sem memória — nem
 * `localStorage`, nem URL. Recarregar a página volta tudo ao padrão.
 *
 * A tecla `L` segue a guarda das setas do teclado: fora de campo de texto, sem Ctrl/Alt/
 * Meta e sem janela aberta. O ouvinte é registrado uma vez; o "tem janela aberta" chega
 * por uma caixinha atualizada a cada desenho, como no `EditorV2`.
 */
export function useControlesDoMotor(fen: string, { pausado }: { pausado: boolean }) {
  const [ligado, setLigado] = useState(false);
  const [seta, setSeta] = useState(false);
  const [linhas, setLinhas] = useState(2);
  const estado = useMotorDoProfessor(fen, { ligado, linhas, pausado });

  const bloqueado = useRef(pausado);
  useEffect(() => {
    bloqueado.current = pausado;
  });

  useEffect(() => {
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key !== "l" && evento.key !== "L") return;
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if (bloqueado.current || ehCampoDeTexto(evento.target as HTMLElement | null)) return;
      evento.preventDefault();
      setLigado((atual) => !atual);
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, []);

  const lance = ligado && seta ? estado.linhas[0]?.primeiroLance ?? null : null;
  /*
   * Memorizada pela string do lance: o `ChessBoard` reescreve a camada automática sempre
   * que a identidade da lista muda, e o motor manda até quatro retratos por segundo com o
   * mesmo melhor lance.
   */
  const shapes = useMemo<DrawShape[] | undefined>(
    () => (lance ? [{ orig: lance.slice(0, 2) as Key, dest: lance.slice(2, 4) as Key, brush: "motor" }] : undefined),
    [lance],
  );

  return {
    estado,
    ligado,
    alternar: () => setLigado((atual) => !atual),
    seta,
    alternarSeta: () => setSeta((atual) => !atual),
    linhas,
    mudarLinhas: setLinhas,
    shapes,
  };
}
