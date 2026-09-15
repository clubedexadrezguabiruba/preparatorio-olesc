"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useAtalho, useCamadaDeJanela } from "@/components/atalhos/Atalhos";

/**
 * Um menu `⋯` com itens — a peça da tela limpa (revisão de experiência, 14/9/2026).
 *
 * O Doug achou o editor "poluído": toda ação morava num botão sempre à vista. Como no editor de estudo
 * do Lichess, o que se usa a toda hora fica na tela e o resto mora num menu. É o mesmo contrato do
 * `MenuDoLance`: Esc fecha e devolve o foco ao botão, clique fora fecha, o primeiro item recebe o foco,
 * e item impossível fica visível, apagado, dizendo por quê.
 */
export type ItemDeMenu = {
  rotulo: string;
  /** Uma linha curta embaixo do rótulo. */
  ajuda?: string;
  aoEscolher: () => void;
  disponivel?: boolean;
  motivo?: string;
  /** Ação que apaga: vermelho discreto. */
  perigo?: boolean;
  /** Linha divisória antes deste item. */
  separar?: boolean;
};

export function Menu({ rotulo, botao, itens, alinhar = "direita", classeDoBotao, largura = "w-64", refDoBotao }: {
  /** O nome acessível do botão. */
  rotulo: string;
  /** O que o botão mostra; o padrão é `⋯`. */
  botao?: ReactNode;
  itens: ItemDeMenu[];
  alinhar?: "direita" | "esquerda";
  classeDoBotao?: string;
  largura?: string;
  /** Para a janela aberta por um item devolver o foco a este botão quando fechar. */
  refDoBotao?: RefObject<HTMLButtonElement | null>;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const proprio = useRef<HTMLButtonElement>(null);
  const gatilho = refDoBotao ?? proprio;
  const primeiro = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (aberto) primeiro.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
    window.addEventListener("mousedown", fora);
    return () => window.removeEventListener("mousedown", fora);
  }, [aberto]);

  const fechar = () => { setAberto(false); gatilho.current?.focus(); };

  return (
    <div ref={caixa} className="relative shrink-0">
      {aberto ? <CamadaDoMenu aoFechar={fechar} /> : null}
      <button
        ref={gatilho}
        type="button"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        title={rotulo}
        onClick={() => setAberto((atual) => !atual)}
        className={classeDoBotao ?? "foco flex min-h-9 min-w-9 items-center justify-center rounded-md border border-borda px-2 text-base leading-none text-tinta hover:bg-carta-toque"}
      >
        {botao ?? <span aria-hidden>⋯</span>}
      </button>
      {aberto ? (
        <div id={id} role="menu" aria-label={rotulo} className={`absolute z-40 mt-1 flex ${largura} flex-col rounded-md border border-borda bg-carta p-1 shadow-lg ${alinhar === "direita" ? "right-0" : "left-0"}`}>
          {itens.map((item, indice) => (
            <div key={`${item.rotulo}-${indice}`} className={item.separar ? "mt-1 border-t border-borda-fraca pt-1" : undefined}>
              <button
                ref={indice === 0 ? primeiro : undefined}
                type="button"
                role="menuitem"
                disabled={item.disponivel === false}
                title={item.disponivel === false ? item.motivo : undefined}
                onClick={() => { setAberto(false); item.aoEscolher(); }}
                className={`foco w-full rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque disabled:cursor-not-allowed disabled:opacity-40 ${item.perigo ? "text-erro-texto" : "text-tinta"}`}
              >
                {item.rotulo}
                {item.disponivel === false && item.motivo
                  ? <span className="block text-xs font-normal text-tinta-fraca">{item.motivo}</span>
                  : item.ajuda ? <span className="block text-xs font-normal text-tinta-fraca">{item.ajuda}</span> : null}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CamadaDoMenu({ aoFechar }: { aoFechar: () => void }) {
  const { camada } = useCamadaDeJanela();
  useAtalho("fechar-janela", () => { aoFechar(); }, { camada });
  return null;
}
