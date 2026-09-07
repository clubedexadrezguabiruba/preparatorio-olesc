"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Momento } from "@/lib/partidas/momentos";
import { armAudioOnFirstGesture, playComplete } from "@/lib/sound";
import { Desafio, type Placar } from "./Desafio";

/**
 * **TESTE.** A sequência dos momentos de decisão de uma partida.
 *
 * A `key` do `Desafio` é o que zera um momento: cada posição tem erros, dica e
 * revelação próprios, e a maneira do React de voltar tudo ao zero é desmontar.
 * Mesma decisão do treinador de repertório, e pelo mesmo motivo.
 *
 * Nada sobe ao servidor. O placar existe para **você** julgar o formato, e
 * morre quando a aba fecha.
 */

const NIVEL: Record<string, string> = {
  essencial: "essencial",
  clube: "clube",
  avancado: "avançado",
};

export function Momentos({
  momentos,
  partida,
  inicial = 0,
}: {
  momentos: Momento[];
  partida: string;
  /** Por onde a série começa. Vem de `?m=` — atalho de teste, ver a página. */
  inicial?: number;
}) {
  useEffect(() => armAudioOnFirstGesture(), []);

  const [indice, setIndice] = useState(inicial);
  /**
   * O placar **por índice do momento**, e não uma lista na ordem em que foram
   * resolvidos. Com `?m=5` a série começa no quinto: uma lista empilhada faria
   * o primeiro resultado cair na linha do momento 1, e o boletim do fim
   * mostraria o título errado ao lado do número certo.
   */
  const [placares, setPlacares] = useState<Record<number, Placar>>({});
  const [resolvido, setResolvido] = useState(false);

  const momento = momentos[indice];
  const acabou = indice >= momentos.length;

  const aoResolver = useCallback(
    (placar: Placar) => {
      setPlacares((antes) => ({ ...antes, [indice]: placar }));
      setResolvido(true);
    },
    [indice],
  );

  const seguir = useCallback(() => {
    setResolvido(false);
    setIndice((n) => n + 1);
  }, []);

  const feitos = Object.entries(placares).map(([i, p]) => ({ i: Number(i), p }));
  const limpos = feitos.filter(({ p }) => p.acertouDePrimeira).length;

  // O prêmio toca uma vez, quando a série fecha.
  useEffect(() => {
    if (acabou && momentos.length > 0) playComplete();
  }, [acabou, momentos.length]);

  const recomecar = useCallback(() => {
    setIndice(inicial);
    setPlacares({});
    setResolvido(false);
  }, [inicial]);

  if (acabou) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-4">
        <p className="titulo text-tinta">
          {limpos} de {feitos.length} de primeira
        </p>
        <ul className="flex flex-col gap-1">
          {feitos.map(({ i, p }) => (
            <li key={momentos[i].n} className="flex items-baseline gap-2 text-sm">
              <span
                aria-hidden
                className={p.acertouDePrimeira ? "text-metodo-tinta" : "text-aviso-tinta"}
              >
                {p.acertouDePrimeira ? "●" : "○"}
              </span>
              <span className="min-w-0 flex-1 truncate text-tinta-media">{momentos[i].titulo}</span>
              <span className="rotulo shrink-0 text-tinta-muda tabular-nums">
                {p.revelou ? "revelado" : p.erros === 0 ? "" : `${p.erros} erro${p.erros > 1 ? "s" : ""}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-tinta-fraca">
          Este é um teste: nada foi gravado, e esta série não conta em lugar nenhum.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={recomecar}
            className="foco rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
          >
            De novo
          </button>
          <Link
            href={`/partidas/${partida}`}
            className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
          >
            Ver a partida inteira
          </Link>
          <Link
            href="/partidas"
            className="foco rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
          >
            Outra partida
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-tinta-fraca tabular-nums">
          momento {indice + 1} de {momentos.length} · lance {Math.floor(momento.ply / 2) + 1}
        </span>
        <span className="rotulo text-tinta-muda">{NIVEL[momento.nivel] ?? momento.nivel}</span>
      </div>

      {/*
       * As bolinhas do progresso da série. Cheia é acerto de primeira, vazada é
       * acerto com ajuda — a mesma distinção que o painel de fim faz, para o
       * número não mudar de significado entre as duas telas.
       */}
      <div className="flex flex-wrap gap-1.5" aria-hidden>
        {momentos.map((m, i) => (
          <span
            key={m.n}
            className={`h-1.5 flex-1 rounded-full ${
              !placares[i]
                ? "bg-borda-fraca"
                : placares[i].acertouDePrimeira
                  ? "bg-metodo-cheio"
                  : "bg-aviso-tinta"
            }`}
          />
        ))}
      </div>

      <Desafio key={momento.n} momento={momento} aoResolver={aoResolver} />

      {resolvido ? (
        <button
          type="button"
          onClick={seguir}
          className="foco w-fit rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
        >
          {indice + 1 < momentos.length ? "Próximo momento →" : "Ver o resultado →"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/partidas/${partida}`}
            className="foco text-xs font-medium text-metodo-tinta hover:underline"
          >
            ← Ver a partida inteira
          </Link>
          <Link href="/partidas" className="foco text-xs font-medium text-metodo-tinta hover:underline">
            Escolher outra partida →
          </Link>
        </div>
      )}
    </div>
  );
}
