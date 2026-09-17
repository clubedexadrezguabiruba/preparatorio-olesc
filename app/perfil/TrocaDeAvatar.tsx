"use client";

import { useId, useState } from "react";
import { EscolhaDeAvatar } from "./EscolhaDeAvatar";

/**
 * O botão "Trocar avatar" e a grade que ele abre (Doug, 17/9/2026: "sem poluir").
 *
 * Com o perfil e o progresso na mesma página, a grade de vinte avatares aberta no topo empurraria
 * as conquistas para a segunda tela — para uma coisa que o aluno faz uma vez. Fechada, ela é um
 * botão ao lado do nome; aberta, fica logo abaixo, onde o avatar novo aparece no cabeçalho assim
 * que ele toca.
 *
 * `aria-expanded` e `aria-controls` no botão: o leitor de tela sabe que ele abre uma região, e
 * qual. `<details>` não serviria aqui porque o botão e a grade moram em linhas diferentes.
 */
export function TrocaDeAvatar({ atual, children }: { atual: string | null; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const regiao = useId();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
        {children}
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={regiao}
          onClick={() => setAberto((a) => !a)}
          className={`foco min-h-11 shrink-0 rounded-lg border px-4 text-sm font-medium transition-colors ${
            aberto
              ? "border-borda-forte bg-carta-toque text-tinta"
              : "border-borda bg-carta text-metodo-tinta hover:bg-carta-toque"
          }`}
        >
          {aberto ? "Pronto" : "Trocar avatar"}
        </button>
      </div>
      <div id={regiao} hidden={!aberto}>
        {aberto ? <EscolhaDeAvatar atual={atual} /> : null}
      </div>
    </div>
  );
}
