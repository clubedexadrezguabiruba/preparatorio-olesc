"use client";

import { useEffect, useRef, useState } from "react";
import type { EstadoDoMotorDoProfessor } from "@/lib/engine/useMotorDoProfessor";

/**
 * A faixa do motor no topo da coluna direita (§23.1): **uma linha só**, ligada ou não.
 *
 * - Desligado: o interruptor e "desligado · tecla L liga". Nada mais disputa espaço com a
 *   lista de lances.
 * - Ligado: interruptor, a avaliação grande do lado das brancas (e por extenso para o
 *   leitor de tela), a profundidade, a seta do melhor lance e o menu de quantas linhas.
 *
 * O interruptor e a seta usam `aria-pressed`, o mesmo padrão da paleta de desenho: o
 * estado é lido pelo leitor de tela e visto pela borda preenchida, não só pela cor.
 */
export function FaixaDoMotor({ estado, ligado, aoAlternar, seta, aoAlternarSeta, linhas, aoMudarLinhas }: {
  estado: EstadoDoMotorDoProfessor;
  ligado: boolean;
  aoAlternar: () => void;
  seta: boolean;
  aoAlternarSeta: () => void;
  linhas: number;
  aoMudarLinhas: (linhas: number) => void;
}) {
  const melhor = estado.linhas[0];
  return (
    <div data-motor="faixa" className="flex h-8 min-w-0 shrink-0 items-center gap-2">
      <button
        type="button"
        aria-pressed={ligado}
        title="Liga e desliga o motor (tecla L)"
        onClick={aoAlternar}
        className={`foco inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs ${ligado ? "border-metodo-superficie bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta hover:bg-carta-toque"}`}
      >
        <span aria-hidden className={`h-2 w-2 rounded-full ${ligado ? "bg-metodo-tinta-alta" : "border border-tinta-fraca"}`} />
        Motor
      </button>

      {!ligado ? (
        <span className="min-w-0 truncate text-xs text-tinta-fraca" title="A tecla L também liga">desligado</span>
      ) : estado.status === "terminal" ? (
        <span className="min-w-0 truncate text-xs text-tinta-media" title={estado.terminal ?? undefined}>{estado.terminal}</span>
      ) : (
        <>
          <span className="flex min-w-0 items-baseline gap-1">
            <span aria-hidden className="text-base font-semibold tabular-nums text-tinta">{melhor?.curto ?? "…"}</span>
            <span aria-hidden className="text-xs text-tinta-fraca">brancas</span>
            <span className="sr-only">{melhor ? `Motor: ${melhor.extenso}` : "Motor calculando"}</span>
          </span>
          <span className="min-w-0 truncate text-xs tabular-nums text-tinta-fraca" data-motor="profundidade">
            {estado.status === "falhou"
              ? `falhou: ${estado.erro ?? "o motor não respondeu"}`
              : estado.status === "pausado"
                ? "pausado"
                : estado.status === "carregando"
                  ? "carregando…"
                  : estado.profundidade !== null
                    ? `prof ${estado.profundidade}`
                    : "calculando…"}
          </span>
        </>
      )}

      {ligado ? (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-pressed={seta}
            aria-label="Seta do melhor lance"
            title="Seta do melhor lance no tabuleiro"
            onClick={aoAlternarSeta}
            className={`foco rounded border px-1.5 py-0.5 text-xs ${seta ? "border-tinta text-tinta" : "border-borda text-tinta-fraca hover:bg-carta-toque"}`}
          >
            <span aria-hidden>↗</span>
          </button>
          <MenuDeLinhas linhas={linhas} aoMudar={aoMudarLinhas} />
        </span>
      ) : null}
    </div>
  );
}

function MenuDeLinhas({ linhas, aoMudar }: { linhas: number; aoMudar: (linhas: number) => void }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLSpanElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const escolhido = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    escolhido.current?.focus();
    const fora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      setAberto(false);
      botao.current?.focus();
    };
    window.addEventListener("mousedown", fora);
    window.addEventListener("keydown", tecla, true);
    return () => {
      window.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", tecla, true);
    };
  }, [aberto]);

  return (
    <span ref={caixa} className="relative">
      <button
        ref={botao}
        type="button"
        aria-label="Quantas linhas do motor"
        aria-haspopup="menu"
        aria-expanded={aberto}
        title="Quantas linhas do motor"
        onClick={() => setAberto((a) => !a)}
        className="foco rounded border border-borda px-1.5 py-0.5 text-xs text-tinta-fraca hover:bg-carta-toque"
      >
        <span aria-hidden>⋯</span>
      </button>
      {aberto ? (
        <span role="menu" aria-label="Linhas do motor" className="absolute right-0 z-30 mt-1 flex w-32 flex-col rounded-md border border-borda bg-carta p-1 shadow-lg">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              ref={n === linhas ? escolhido : undefined}
              type="button"
              role="menuitemradio"
              aria-checked={n === linhas}
              onClick={() => {
                aoMudar(n);
                setAberto(false);
                botao.current?.focus();
              }}
              className="foco flex items-center justify-between rounded px-2 py-1 text-left text-sm text-tinta hover:bg-carta-toque"
            >
              {n === 1 ? "1 linha" : `${n} linhas`}
              {n === linhas ? <span aria-hidden>✓</span> : null}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
