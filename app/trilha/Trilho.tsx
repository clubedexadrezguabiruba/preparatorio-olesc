"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * O pontilhado que liga os medalhões de um nível — o "caminho" do Duolingo.
 *
 * Medido, e não calculado: a onda é `--onda × --passo`, e o `--passo` muda com
 * a largura da tela, o balão do próximo passo empurra a linha dele para baixo,
 * e o nível fechado tem altura zero. Ler o centro de cada `.trilha-no` na tela
 * acerta os três casos sem repetir a regra do CSS aqui. O `ResizeObserver`
 * refaz a conta quando a largura muda ou quando o nível é aberto.
 *
 * As curvas saem na vertical de um nó e chegam na vertical do outro, então a
 * linha serpenteia em vez de fazer bico em cada medalhão.
 */
export function Trilho() {
  const ref = useRef<SVGSVGElement>(null);
  const [d, setD] = useState("");

  useLayoutEffect(() => {
    const caixa = ref.current?.parentElement;
    if (!caixa) return;
    const medir = () => {
      const base = caixa.getBoundingClientRect();
      const pontos = [...caixa.querySelectorAll<HTMLElement>(".trilha-no")].map((no) => {
        const r = no.getBoundingClientRect();
        return [r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top] as const;
      });
      setD(
        pontos
          .map(([x, y], i) => {
            if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
            const [x0, y0] = pontos[i - 1];
            const meio = (y - y0) / 2;
            return `C${x0.toFixed(1)},${(y0 + meio).toFixed(1)} ${x.toFixed(1)},${(y - meio).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" "),
      );
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    return () => observador.disconnect();
  }, []);

  return (
    <svg ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <path d={d} fill="none" strokeWidth={7} strokeLinecap="round" strokeDasharray="0.1 15" className="trilha-trilho" />
    </svg>
  );
}
