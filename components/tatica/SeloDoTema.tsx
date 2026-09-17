import type { Nivel } from "@/lib/curso/nivel";
import { IconeDoTema } from "./IconeDoTema";

/**
 * A ilustração do tema no quadro do metal do nível, com o progresso **na
 * moldura** (Doug, 16/9).
 *
 * O cartão tinha um anel de progresso; com a ilustração, os dois disputavam o
 * mesmo canto. A moldura resolve os dois de uma vez: é o quadro do desenho, e
 * ela vai se fechando em verde, a partir do meio de cima, conforme o aluno
 * avança nas três etapas. O verde é o do método — a mesma cor da `Barra` e do
 * anel —, e o metal fica no fundo do quadro e na borda do cartão.
 *
 * `aria-hidden`, pelo motivo do anel: o cartão escreve "18 de 39" por extenso.
 */

/** As classes do metal de cada nível — literais, para o Tailwind achá-las. */
export const COR_DO_NIVEL: Record<Nivel, { fundo: string; borda: string; tinta: string; pastilha: string }> = {
  1: { fundo: "fill-nivel-1-fundo", borda: "border-nivel-1-borda", tinta: "text-nivel-1-tinta", pastilha: "bg-nivel-1-fundo text-nivel-1-tinta border-nivel-1-borda" },
  2: { fundo: "fill-nivel-2-fundo", borda: "border-nivel-2-borda", tinta: "text-nivel-2-tinta", pastilha: "bg-nivel-2-fundo text-nivel-2-tinta border-nivel-2-borda" },
  3: { fundo: "fill-nivel-3-fundo", borda: "border-nivel-3-borda", tinta: "text-nivel-3-tinta", pastilha: "bg-nivel-3-fundo text-nivel-3-tinta border-nivel-3-borda" },
  4: { fundo: "fill-nivel-4-fundo", borda: "border-nivel-4-borda", tinta: "text-nivel-4-tinta", pastilha: "bg-nivel-4-fundo text-nivel-4-tinta border-nivel-4-borda" },
  5: { fundo: "fill-nivel-5-fundo", borda: "border-nivel-5-borda", tinta: "text-nivel-5-tinta", pastilha: "bg-nivel-5-fundo text-nivel-5-tinta border-nivel-5-borda" },
};

export function SeloDoTema({
  tag,
  nivel,
  feitos,
  de,
  tamanho = 64,
}: {
  tag: string;
  nivel: Nivel;
  feitos: number;
  de: number;
  tamanho?: number;
}) {
  const parte = de > 0 ? Math.min(1, feitos / de) : 0;
  const completo = parte >= 1;
  const traco = 4;
  const o = traco / 2;
  const r = 14;
  const S = tamanho;
  // A moldura começa no meio de cima e anda no sentido do relógio.
  const moldura = `M${S / 2},${o} H${S - o - r} A${r},${r} 0 0 1 ${S - o},${o + r} V${S - o - r} A${r},${r} 0 0 1 ${S - o - r},${S - o} H${o + r} A${r},${r} 0 0 1 ${o},${S - o - r} V${o + r} A${r},${r} 0 0 1 ${o + r},${o} Z`;
  const folga = traco + 2;
  const lado = S - 2 * folga;
  const cor = COR_DO_NIVEL[nivel];

  return (
    <div className={`relative shrink-0 ${cor.tinta}`} style={{ width: S, height: S }} aria-hidden>
      <svg width={S} height={S}>
        <path d={moldura} fill="none" strokeWidth={traco} className="stroke-carta-toque" />
        {parte > 0 ? (
          <path
            d={moldura}
            fill="none"
            strokeWidth={traco}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${(parte * 100).toFixed(2)} 100`}
            className={completo ? "stroke-metodo-cheio" : "stroke-metodo-superficie"}
          />
        ) : null}
        <rect x={folga} y={folga} width={lado} height={lado} rx={r - folga + 2} className={cor.fundo} />
      </svg>
      <div className="absolute grid place-items-center" style={{ inset: folga }}>
        <IconeDoTema tag={tag} tamanho={lado - 6} />
      </div>
      {completo ? (
        <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border-2 border-carta bg-metodo-cheio text-[10px] font-bold text-tinta-inversa">
          ✓
        </span>
      ) : null}
    </div>
  );
}
