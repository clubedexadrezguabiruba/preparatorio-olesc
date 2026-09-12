"use client";

import { useState } from "react";
import type { DestinoV2 } from "@/lib/editor-v2/diagnostico-visual";
import type { RevisaoPendenteListadaV2 } from "@/lib/editor-v2/revisoes";
import type { AlvoDeRevisaoV2 } from "@/lib/editor-v2/trocar-posicao";

/**
 * As revisões pendentes, juntas e resolvíveis — §19.2.
 *
 * ## Por que ela é um `<details>` fechado
 *
 * Porque ela é uma lista de trabalho, e não um alarme. Depois de uma troca de
 * posição inicial numa aula grande, são dezesseis linhas — e dezesseis linhas
 * abertas no alto da tela empurram o tabuleiro para fora da janela justamente
 * quando o professor quer ir de uma em uma. O cabeçalho fechado diz quantas são,
 * que é a informação que ele precisa antes de decidir se vai olhar agora.
 *
 * ## Por que «Já reli todas» fica longe das outras
 *
 * Ela é a única daqui que não pede leitura. Fica no fim da lista, depois de o
 * professor ter rolado por tudo — e não ao lado do cabeçalho, onde seria o
 * primeiro botão da tela e apagaria dezesseis avisos com um clique de quem só
 * queria fechar o painel.
 */
export function ListaDeRevisoes({
  revisoes,
  aoIr,
  aoResolver,
  aoResolverTodas,
}: {
  revisoes: RevisaoPendenteListadaV2[];
  aoIr: (destino: DestinoV2) => void;
  aoResolver: (alvo: AlvoDeRevisaoV2) => void;
  aoResolverTodas: (alvos: AlvoDeRevisaoV2[]) => void;
}) {
  const [confirmandoTodas, setConfirmandoTodas] = useState(false);
  if (revisoes.length === 0) return null;

  return (
    <details className="rounded-lg border border-aviso-superficie bg-aviso-superficie/10">
      <summary className="foco cursor-pointer list-none px-3 py-2 text-sm font-medium text-aviso-tinta">
        {revisoes.length === 1
          ? "1 texto marcado para revisão"
          : `${revisoes.length} textos marcados para revisão`}
        <span className="ml-2 font-normal text-tinta-fraca">
          — a posição inicial mudou depois que eles foram escritos
        </span>
      </summary>

      <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto border-t border-aviso-superficie/40 p-3">
        {revisoes.map((revisao) => (
          <li key={revisao.chave} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-borda-fraca pt-2 text-sm first:border-t-0 first:pt-0">
            <span className="rotulo shrink-0 text-aviso-tinta">{revisao.tipo}</span>
            <span className="text-tinta-fraca">{revisao.onde}</span>
            <span className="basis-full text-tinta">“{revisao.trecho}”</span>
            <span className="flex gap-2">
              {revisao.destino ? (
                <button
                  type="button"
                  onClick={() => aoIr(revisao.destino!)}
                  className="foco rounded-md border border-borda px-2 py-0.5 text-xs font-medium text-tinta hover:bg-carta-toque"
                >
                  Ir até lá
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => aoResolver(revisao.alvo)}
                className="foco rounded-md border border-aviso-superficie px-2 py-0.5 text-xs font-medium text-aviso-tinta hover:bg-aviso-superficie/20"
              >
                Já reli
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-aviso-superficie/40 px-3 py-2">
        {confirmandoTodas ? (
          <>
            <span className="mr-auto text-xs text-tinta-media">
              Tirar a marca {revisoes.length === 1 ? "do texto" : `dos ${revisoes.length} textos`} sem abrir um por um? Um Desfazer traz as marcas de volta.
            </span>
            <button type="button" onClick={() => setConfirmandoTodas(false)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { aoResolverTodas(revisoes.map((item) => item.alvo)); setConfirmandoTodas(false); }}
              className="foco rounded-md border border-aviso-superficie bg-aviso-superficie/20 px-2 py-1 text-xs font-medium text-aviso-tinta"
            >
              Sim, já reli todas
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmandoTodas(true)} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta hover:bg-carta-toque">
            Já reli todas
          </button>
        )}
      </div>
    </details>
  );
}
