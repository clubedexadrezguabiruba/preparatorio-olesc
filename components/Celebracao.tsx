"use client";

import { useCallback, useState, type RefObject } from "react";
import { Confetti } from "@/components/lesson/Confetti";
import { playComplete } from "@/lib/sound";

/**
 * Confete + som de conclusão, num lugar só — pedido 6 do feedback do aluno (17/9/2026).
 *
 * Dispara no **fim** de algo que o aluno reconhece como fim: a aula concluída, a linha do move
 * trainer terminada, a série de tática fechada. Etapa intermediária não dispara (a parada da aula,
 * por exemplo, é `semConfete`).
 *
 * ```tsx
 * const { seq, celebrar } = useCelebracao();
 * // ... quando termina: celebrar();
 * <Celebracao seq={seq} tela />
 * ```
 *
 * `tela` cobre a janela inteira (`fixed`), para quem não tem um contêiner `relative` à mão; sem
 * ela, o canvas cobre o ancestral `relative` mais próximo, como o `Confetti` das etapas.
 * O `Confetti` já respeita `prefers-reduced-motion`; o som segue a preferência de som do site.
 */
export function useCelebracao() {
  const [seq, setSeq] = useState(0);
  const celebrar = useCallback((opcoes?: { som?: boolean }) => {
    if (opcoes?.som !== false) playComplete();
    setSeq((atual) => atual + 1);
  }, []);
  return { seq, celebrar };
}

export function Celebracao({
  seq,
  originRef,
  tela = false,
}: {
  seq: number;
  originRef?: RefObject<HTMLElement | null>;
  tela?: boolean;
}) {
  if (!tela) return <Confetti seq={seq} originRef={originRef} />;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <Confetti seq={seq} originRef={originRef} />
    </div>
  );
}
