"use client";

import { useEffect, useRef, useState } from "react";
import { EXPLICACAO_DA_ETAPA, chaveDaExplicacaoDaEtapa } from "@/lib/tatica/explicacao-etapas";
import { NOME_DA_ETAPA, type Etapa } from "@/lib/tatica/serie";

export function ExplicacaoDaEtapa({ etapa }: { etapa: Etapa }) {
  const [aberta, setAberta] = useState(false);
  const botaoEntendi = useRef<HTMLButtonElement>(null);
  const explicacao = EXPLICACAO_DA_ETAPA[etapa];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(chaveDaExplicacaoDaEtapa(etapa)) !== "lida") {
          setAberta(true);
        }
      } catch {
        setAberta(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [etapa]);

  useEffect(() => {
    if (aberta) botaoEntendi.current?.focus();
  }, [aberta]);

  const fechar = () => {
    try {
      window.localStorage.setItem(chaveDaExplicacaoDaEtapa(etapa), "lida");
    } catch {
      // Sem armazenamento, a explicação volta na próxima entrada em vez de ser perdida para sempre.
    }
    setAberta(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Como funciona: ${NOME_DA_ETAPA[etapa]}`}
        title={`Como funciona: ${NOME_DA_ETAPA[etapa]}`}
        onClick={() => setAberta(true)}
        className="foco grid size-8 shrink-0 place-items-center rounded-full border border-borda text-sm font-bold text-metodo-tinta transition-colors hover:bg-metodo-superficie/15"
      >
        <span aria-hidden>?</span>
      </button>

      {aberta ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/45 px-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`explicacao-${etapa}`}
            className="cartao flex w-full max-w-sm flex-col gap-4 px-5 py-5 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-metodo-superficie/20 font-bold text-metodo-tinta">?</span>
              <h2 id={`explicacao-${etapa}`} className="text-lg font-semibold text-tinta">
                {explicacao.titulo}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-tinta-media">{explicacao.texto}</p>
            <button
              ref={botaoEntendi}
              type="button"
              onClick={fechar}
              className="foco min-h-11 rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
            >
              Entendi, começar
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
