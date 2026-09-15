"use client";

import { useCallback, useEffect, useState } from "react";
import type { Gravado } from "@/app/partidas/acoes";
import type { MomentoComVersao } from "@/lib/partidas/carregar";
import { armAudioOnFirstGesture, playComplete } from "@/lib/sound";
import { Desafio, type Placar } from "./Desafio";

/**
 * A série dos momentos de decisão de uma partida modelo.
 *
 * A `key` do `Desafio` é o que zera um momento: cada posição tem erros, dica e
 * revelação próprios, e a maneira do React de voltar tudo ao zero é desmontar.
 *
 * **Cada lance sobe ao servidor** (`registrarLance`), e é o servidor quem diz se a
 * partida ficou concluída — esta tela só repete o que ele respondeu. O placar
 * desta série é da série; o que já foi feito em outros dias a página lê do banco.
 */
export function Momentos({
  slug,
  momentos,
  aoTerminar,
}: {
  slug: string;
  momentos: readonly MomentoComVersao[];
  /** `true` quando o servidor confirmou a partida concluída. */
  aoTerminar: (concluiu: boolean) => void;
}) {
  useEffect(() => armAudioOnFirstGesture(), []);

  const [indice, setIndice] = useState(0);
  const [serie, setSerie] = useState(0);
  const [placares, setPlacares] = useState<Record<number, Placar>>({});
  const [resolvido, setResolvido] = useState(false);
  const [concluida, setConcluida] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const momento = momentos[indice];
  const acabou = indice >= momentos.length;

  const aoResolver = useCallback(
    (placar: Placar) => {
      setPlacares((antes) => ({ ...antes, [indice]: placar }));
      setResolvido(true);
    },
    [indice],
  );

  const aoGravado = useCallback((r: Gravado) => {
    if ("erro" in r) setFalhou(true);
    else if (r.concluida) setConcluida(true);
  }, []);

  const seguir = useCallback(() => {
    setResolvido(false);
    setIndice((n) => n + 1);
  }, []);

  useEffect(() => {
    if (acabou && momentos.length > 0) playComplete();
  }, [acabou, momentos.length]);

  const recomecar = useCallback(() => {
    setIndice(0);
    setPlacares({});
    setResolvido(false);
    setFalhou(false);
    setSerie((n) => n + 1);
  }, []);

  if (acabou) {
    const limpos = Object.values(placares).filter((p) => p.acertouDePrimeira).length;
    const desafio = momentos.findIndex((m) => m.desafioFinal);
    const desafioLimpo = placares[desafio]?.acertouDePrimeira ?? false;
    return (
      <div className="flex flex-col gap-3 cartao px-4 py-4" aria-live="polite">
        <p className="titulo text-tinta">
          {concluida
            ? "Partida concluída!"
            : desafioLimpo
              ? `${limpos} de ${momentos.length} de primeira`
              : "Faltou o Desafio final de primeira"}
        </p>
        <p className="text-sm text-tinta-media">
          {concluida
            ? "Todos os momentos resolvidos e o Desafio final de primeira. Ela já conta no seu nível."
            : desafioLimpo
              ? "O Desafio saiu de primeira. Ainda falta resolver algum momento para concluir."
              : "Para concluir, refaça a série e acerte o Desafio final sem errar antes e sem ajuda."}
        </p>
        {falhou ? (
          <p className="rounded-lg bg-aviso-superficie/15 px-3 py-2 text-sm text-aviso-tinta">
            Algum lance não foi gravado. Confira a internet e refaça a série.
          </p>
        ) : null}
        <ul className="flex flex-col gap-1">
          {momentos.map((m, i) => {
            const p = placares[i];
            return (
              <li key={m.n} className="flex items-baseline gap-2 text-sm">
                <span aria-hidden className={p?.acertouDePrimeira ? "text-metodo-tinta" : "text-aviso-tinta"}>
                  {p?.acertouDePrimeira ? "●" : "○"}
                </span>
                <span className="min-w-0 flex-1 truncate text-tinta-media">
                  {m.desafioFinal ? "Desafio final · " : ""}
                  {m.titulo}
                </span>
                <span className="rotulo shrink-0 text-tinta-muda tabular-nums">
                  {!p ? "" : p.revelou ? "revelado" : p.erros === 0 ? "" : `${p.erros} erro${p.erros > 1 ? "s" : ""}`}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => aoTerminar(concluida)}
            className="foco min-h-11 rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
          >
            Ler o desfecho
          </button>
          {concluida ? null : (
            <button
              type="button"
              onClick={recomecar}
              className="foco min-h-11 rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
            >
              Refazer a série
            </button>
          )}
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
        {momento.desafioFinal ? (
          <span className="rounded-full border border-metodo-cheio px-2 py-0.5 text-xs font-semibold text-metodo-tinta">
            Desafio final
          </span>
        ) : null}
      </div>

      {/* Cheia é acerto de primeira, vazada é acerto com ajuda — a mesma
          distinção do boletim do fim. */}
      <div className="flex flex-wrap gap-1.5" aria-hidden>
        {momentos.map((m, i) => (
          <span
            key={m.n}
            className={`h-1.5 flex-1 rounded-full ${
              !placares[i] ? "bg-borda-fraca" : placares[i].acertouDePrimeira ? "bg-metodo-cheio" : "bg-aviso-tinta"
            }`}
          />
        ))}
      </div>

      <Desafio
        key={`${serie}:${momento.n}`}
        slug={slug}
        momento={momento}
        aoResolver={aoResolver}
        aoGravado={aoGravado}
      />

      {resolvido ? (
        <button
          type="button"
          onClick={seguir}
          className="foco min-h-11 w-fit rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
        >
          {indice + 1 < momentos.length ? "Próximo momento →" : "Ver o resultado →"}
        </button>
      ) : null}
    </div>
  );
}
