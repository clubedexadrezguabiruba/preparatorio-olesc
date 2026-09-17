"use client";

import { useEffect, useRef, useState } from "react";
import { marcarSelosVistos } from "@/app/perfil/acoes";
import { Celebracao, useCelebracao } from "@/components/Celebracao";
import type { Familia } from "@/lib/curso/selos";
import { IconeDoSelo } from "./Medalha";

type SeloNovo = { readonly id: string; readonly familia: Familia; readonly nome: string; readonly conta: string };

/**
 * "Selo novo: Pontaria" — com confete e som, **uma vez só** (0018, 17/9/2026).
 *
 * Quem decide o que é novo é o servidor (`planoDosSelos`): este componente só aparece quando há
 * selo gravado e ainda não visto. Ao aparecer ele festeja e marca os selos como vistos
 * (`marcarSelosVistos`); a próxima visita ao painel ou ao perfil já chega sem ele.
 *
 * - **Marca ao aparecer, e não ao fechar.** Se o aluno sair sem fechar, ele já viu — e um aviso
 *   que volta a cada visita até alguém apertar "Fechar" vira cobrança.
 * - **A lista é guardada no primeiro desenho.** Se a página for redesenhada pelo servidor depois
 *   da marca, a prop chega vazia; o aviso continua até o aluno fechar.
 * - **Uma vez por montagem**, com `ref`: em desenvolvimento o React monta os efeitos duas vezes,
 *   e dois confetes e duas gravações seriam o defeito que o aviso existe para não ter.
 * - `role="status"`: o leitor de tela anuncia o selo sem roubar o foco do que o aluno fazia.
 */
export function AvisoDeSeloNovo({ selos }: { selos: readonly SeloNovo[] }) {
  const [lista] = useState(selos);
  const [aberto, setAberto] = useState(true);
  const { seq, celebrar } = useCelebracao();
  const jaFestejou = useRef(false);

  useEffect(() => {
    if (jaFestejou.current || lista.length === 0) return;
    jaFestejou.current = true;
    celebrar();
    void marcarSelosVistos(lista.map((s) => s.id));
  }, [lista, celebrar]);

  if (lista.length === 0) return null;

  const um = lista.length === 1;
  return (
    <>
      <Celebracao seq={seq} tela />
      {aberto ? (
        <section
          role="status"
          aria-labelledby="selo-novo"
          className="selo-novo-chega cartao flex items-start gap-4 border-metodo-cheio px-4 py-4 sm:px-5"
        >
          <span
            aria-hidden
            className="selo-novo-medalha flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-metodo-cheio bg-metodo-superficie/16 text-metodo-tinta-alta"
          >
            <IconeDoSelo familia={lista[0].familia} id={lista[0].id} tamanho={28} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="selo-novo" className="text-base font-semibold text-tinta">
              {um ? `Selo novo: ${lista[0].nome}` : `${lista.length} selos novos`}
            </h2>
            {um ? (
              <p className="text-sm text-tinta-media">{lista[0].conta}</p>
            ) : (
              <ul className="flex flex-col gap-0.5 text-sm text-tinta-media">
                {lista.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <IconeDoSelo familia={s.familia} id={s.id} tamanho={16} className="text-metodo-tinta" />
                    {s.nome}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="foco -mt-1 -mr-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm text-tinta-fraca hover:bg-carta-toque hover:text-tinta"
          >
            Fechar
          </button>
        </section>
      ) : null}
    </>
  );
}
