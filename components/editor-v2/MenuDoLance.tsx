"use client";

import { useEffect, useRef } from "react";
import type { AcaoDoLanceV2 } from "@/lib/editor-v2/acoes-do-lance";

/**
 * O menu de um lance — §11.3 e §25.
 *
 * ## A mesma lista nos dois gestos
 *
 * §11.3: "botão direito no lance e `•••` acessível por teclado devem oferecer o
 * **mesmo conjunto aplicável** de ações". Por isso a lista não é montada aqui:
 * ela chega pronta de `acoesDoLance`, que é uma função pura com teste. Os dois
 * gestos abrem este mesmo componente, com o mesmo `nodeId` — não há como um
 * oferecer uma ação que o outro não tem.
 *
 * ## Ação impossível fica visível, e diz por quê
 *
 * §11.3 permite "ausentes **ou** desabilitadas com motivo", e a segunda é
 * melhor: um menu que muda de tamanho conforme o lance obriga o professor a
 * procurar de novo a cada clique, e some justamente com a ação que ele estava
 * querendo — sem explicar que ela existe. Aqui ela fica no mesmo lugar, apagada,
 * com o motivo no `title` e anunciado pelo `aria-describedby`.
 */
export function MenuDoLance({
  acoes,
  aberto,
  rotulo,
  aoAbrir,
  aoFechar,
  aoEscolher,
}: {
  acoes: AcaoDoLanceV2[];
  aberto: boolean;
  /** O nome do lance, para o nome acessível do botão `•••`. */
  rotulo: string;
  aoAbrir: () => void;
  aoFechar: () => void;
  aoEscolher: (id: AcaoDoLanceV2["id"]) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const primeiro = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberto) primeiro.current?.focus();
  }, [aberto]);

  /*
   * Clicar em qualquer outro lugar fecha — inclusive num lance da lista, que é o
   * gesto de quem desistiu e foi olhar outro. O `mousedown` (e não o `click`)
   * pela mesma razão do véu das janelas: o clique que fecha precisa ser o que
   * começou fora, e não o fim de um gesto que começou dentro.
   */
  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) aoFechar();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") { evento.stopPropagation(); aoFechar(); }
    };
    window.addEventListener("mousedown", fora);
    window.addEventListener("keydown", tecla, true);
    return () => {
      window.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", tecla, true);
    };
  }, [aberto, aoFechar]);

  return (
    <div ref={caixa} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Ações do lance ${rotulo}`}
        aria-expanded={aberto}
        title="Mais ações"
        onClick={() => (aberto ? aoFechar() : aoAbrir())}
        className="foco flex h-full items-center rounded px-1.5 text-xs text-tinta-fraca hover:bg-carta-toque hover:text-tinta"
      >
        <span aria-hidden>•••</span>
      </button>

      {aberto ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 flex w-64 flex-col rounded-md border border-borda bg-carta p-1 shadow-lg">
          {acoes.map((acao, indice) => (
            <button
              key={acao.id}
              ref={indice === 0 ? primeiro : undefined}
              type="button"
              role="menuitem"
              disabled={!acao.disponivel}
              title={acao.motivo}
              onClick={() => { aoEscolher(acao.id); aoFechar(); }}
              className="foco rounded px-2 py-1.5 text-left text-sm text-tinta hover:bg-carta-toque disabled:cursor-not-allowed disabled:opacity-40"
            >
              {acao.rotulo}
              {!acao.disponivel && acao.motivo ? (
                <span className="block text-xs font-normal text-tinta-fraca">{acao.motivo}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
