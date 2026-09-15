"use client";

import { useMemo, useState } from "react";
import { Dialogo } from "./Dialogo";
import { modoDaParte, modosPossiveis, nomeDaParte, NOME_DO_MODO, type ModoDaParteV2, type MudancaDeModoV2, type ParteDaAulaV2 } from "@/lib/editor-v2/mudar-modo";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

/** Como o aluno vê cada modo na trilha (`fluxo-do-aluno.ts`) — o nome que o Doug usa ao falar da aula. */
const COMO_O_ALUNO_VE: Record<ModoDaParteV2, string> = { introducao: "Apresentação", capitulo: "Aula", treino: "Treino" };
const O_QUE_E: Record<ModoDaParteV2, string> = {
  introducao: "um quadro com texto e posição parada; o aluno avança quando quiser",
  capitulo: "a linha para assistir, com narração",
  treino: "o aluno joga os lances e recebe resposta a cada um",
};

/**
 * "Mudar para…" — introdução, capítulo ou treino, depois de criada a parte (pedido do Doug, 15/9/2026).
 * Nada muda antes de confirmar; a janela mostra o que sai e o que fica, e o Desfazer devolve.
 */
export function DialogoMudarModo({ aula, parte, positions, aoMudar, aoFechar }: {
  aula: AulaV2;
  parte: ParteDaAulaV2;
  positions: Record<string, Position>;
  aoMudar: (destino: ModoDaParteV2, mudanca: MudancaDeModoV2) => void;
  aoFechar: () => void;
}) {
  const opcoes = useMemo(() => modosPossiveis(aula, parte, positions), [aula, parte, positions]);
  const [escolhido, setEscolhido] = useState<ModoDaParteV2 | null>(() => opcoes.find((o) => o.resultado.ok)?.destino ?? null);
  const atual = modoDaParte(parte);
  const nome = nomeDaParte(aula, parte) ?? "(parte que não existe mais)";
  const selecionada = opcoes.find((o) => o.destino === escolhido);
  const mudanca = selecionada?.resultado.ok ? selecionada.resultado.mudanca : null;

  return (
    <Dialogo
      titulo={`Mudar «${nome}» para…`}
      descricao={`Hoje é ${NOME_DO_MODO[atual]} (o aluno vê «${COMO_O_ALUNO_VE[atual]}»). Nada muda antes de você confirmar, e o Desfazer volta atrás.`}
      largura="max-w-2xl"
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar</button>
          <button
            type="button"
            data-confirmar-mudar-modo
            disabled={!mudanca || !escolhido}
            onClick={() => { if (mudanca && escolhido) aoMudar(escolhido, mudanca); }}
            className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-semibold text-metodo-tinta-alta disabled:opacity-40"
          >
            {escolhido ? `Mudar para ${NOME_DO_MODO[escolhido]}` : "Mudar"}
          </button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-tinta">Novo modo</legend>
          {opcoes.map(({ destino, resultado }) => (
            <label
              key={destino}
              data-mudar-modo={destino}
              className={`flex items-start gap-2 rounded-md border p-2 text-sm ${escolhido === destino ? "border-foco bg-metodo-superficie/25" : "border-borda"} ${resultado.ok ? "cursor-pointer text-tinta" : "text-tinta-fraca"}`}
            >
              <input type="radio" name="novo-modo" className="mt-1" checked={escolhido === destino} disabled={!resultado.ok} onChange={() => setEscolhido(destino)} />
              <span className="min-w-0">
                <span className="font-medium">{NOME_DO_MODO[destino][0].toUpperCase() + NOME_DO_MODO[destino].slice(1)}</span>
                <span className="text-tinta-fraca"> — o aluno vê «{COMO_O_ALUNO_VE[destino]}»: {O_QUE_E[destino]}</span>
                {!resultado.ok ? <span className="mt-1 block text-xs text-aviso-tinta">Não dá: {resultado.mensagem}.</span> : null}
              </span>
            </label>
          ))}
        </fieldset>

        {mudanca ? (
          <div className="grid gap-3 md:grid-cols-2">
            <section aria-label="O que sai" className="rounded-md border border-borda p-3">
              <h3 className="mb-1 text-sm font-semibold text-tinta">Sai</h3>
              {mudanca.saem.length ? (
                <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-tinta">{mudanca.saem.map((item) => <li key={item}>{item}</li>)}</ul>
              ) : <p className="text-sm text-tinta-fraca">Nada sai.</p>}
            </section>
            <section aria-label="O que fica" className="rounded-md border border-borda p-3">
              <h3 className="mb-1 text-sm font-semibold text-tinta">Fica</h3>
              <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-tinta">{mudanca.ficam.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>
        ) : null}
        {mudanca?.avisos.length ? (
          <section aria-label="Para revisar depois" className="rounded-md border border-aviso p-3 text-sm text-tinta">
            <h3 className="mb-1 font-semibold">Para revisar depois</h3>
            <ul className="flex list-disc flex-col gap-1 pl-4">{mudanca.avisos.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
      </div>
    </Dialogo>
  );
}
