import type { Color, Key } from "@lichess-org/chessground/types";
import { posicaoDoNag } from "@/lib/chess/nag-overlay";

export function NagOverlay({ casa, orientation, simbolo }: { casa: Key; orientation: Color; simbolo: string }) {
  const ponto = posicaoDoNag(casa, orientation);
  return (
    <span
      aria-hidden
      className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-metodo-superficie text-xs font-bold leading-none text-metodo-tinta-alta shadow-sm"
      style={{ left: `${ponto.left}%`, top: `${ponto.top}%` }}
    >
      {simbolo}
    </span>
  );
}
