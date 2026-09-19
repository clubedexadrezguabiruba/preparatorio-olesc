"use client";

import { useSyncExternalStore } from "react";
import { isSoundOn, setSoundOn, subscribeSound } from "@/lib/sound";

/**
 * Liga e desliga o som. A preferência mora no `localStorage`, fora do React —
 * por isso `useSyncExternalStore`: no servidor o som é "ligado", e a leitura
 * real do armazenamento entra na hidratação sem acusar divergência.
 *
 * Morava dentro de `app/tatica/[tema]/Serie.tsx`. Saiu quando a tática com
 * rating (`app/tatica/rating/Rodada.tsx`) passou a precisar do mesmo botão: a
 * preferência é uma só, e o botão que a mostra também.
 */
export function BotaoDeSom() {
  const ligado = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!ligado)}
      aria-pressed={ligado}
      className="botao-som-aula foco min-h-11 shrink-0 rounded-lg px-2 text-lg leading-none transition-colors hover:bg-carta-toque"
    >
      <span aria-hidden>{ligado ? "🔊" : "🔇"}</span>
      <span className="sr-only">{ligado ? "Desligar o som" : "Ligar o som"}</span>
    </button>
  );
}
