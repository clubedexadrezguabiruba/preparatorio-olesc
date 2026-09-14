"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * O `(?)` que guarda uma legenda fixa (fatia 9, "espaço devolvido").
 *
 * As legendas das setas do teclado e do botão direito ficavam sempre na tela, e a coluna
 * da direita precisava das linhas delas para o motor. Elas não sumiram — §16 pede atalho
 * descobrível —, só passaram a ocupar espaço quando alguém pergunta.
 *
 * Um popover leve com `role="dialog"`: abre no clique, fecha com Esc, com clique fora ou
 * no próprio `(?)`, e devolve o foco a ele. Não prende o Tab — não há nada para fazer lá
 * dentro além de ler.
 */
export function AjudaDeAtalhos({ rotulo, children, lado = "direita" }: {
  /** O nome acessível do botão: "Atalhos da lista de lances". */
  rotulo: string;
  children: ReactNode;
  /** Para que lado a caixa se abre a partir do botão. */
  lado?: "direita" | "esquerda";
}) {
  const [aberta, setAberta] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberta) return;
    const fora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberta(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      evento.stopPropagation();
      setAberta(false);
      botao.current?.focus();
    };
    window.addEventListener("mousedown", fora);
    window.addEventListener("keydown", tecla, true);
    return () => {
      window.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", tecla, true);
    };
  }, [aberta]);

  return (
    <div ref={caixa} className="relative inline-flex">
      <button
        ref={botao}
        type="button"
        aria-label={rotulo}
        aria-expanded={aberta}
        aria-controls={aberta ? id : undefined}
        title={rotulo}
        onClick={() => setAberta((a) => !a)}
        className="foco inline-flex h-5 w-5 items-center justify-center rounded-full border border-borda text-[11px] leading-none text-tinta-fraca hover:bg-carta-toque hover:text-tinta"
      >
        ?
      </button>
      {aberta ? (
        <div
          id={id}
          role="dialog"
          aria-label={rotulo}
          className={`absolute top-6 z-30 w-64 rounded-md border border-borda bg-carta p-2 text-xs leading-relaxed text-tinta-media shadow-lg ${lado === "direita" ? "left-0" : "right-0"}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
