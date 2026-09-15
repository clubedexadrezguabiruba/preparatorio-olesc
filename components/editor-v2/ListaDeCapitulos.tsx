"use client";

import { useState, type DragEvent, type MouseEvent } from "react";
import type { CapituloV2 } from "@/lib/editor-v2/modelo";

export function ListaDeCapitulos({ capitulos, atualId, aoEscolher, aoMover, aoDuplicar, aoExcluir, proveniencia = {}, aoProveniencia, aoRenomear, aoTrocarPosicao, aoTrocarOrientacao, aoMudarModo }: {
  capitulos: CapituloV2[];
  atualId: string;
  aoEscolher: (capitulo: CapituloV2) => void;
  /** Move o capítulo para um vão, contado na ordem anterior ao gesto. */
  aoMover: (capituloId: string, vao: number) => void;
  /** §8.4: abre o diálogo da cópia independente. */
  aoDuplicar: (capituloId: string) => void;
  /** §8.4: abre o diálogo da exclusão, com o impacto. */
  aoExcluir: (capituloId: string) => void;
  /**
   * Fatia 10, §19.1: o estado da proveniência de cada capítulo que começa numa FEN crua. Os que não
   * aparecem aqui começam numa posição do acervo ou numa referência, e o menu não oferece a janela.
   */
  proveniencia?: Record<string, "sem-revisao" | "caduca" | "desconhecida" | "revisada">;
  aoProveniencia?: (capituloId: string) => void;
  /**
   * Revisão de experiência (14/9/2026): o nome e a posição inicial moravam num campo e num botão soltos no
   * pé da coluna, longe do capítulo. Agora são ações do próprio capítulo — no `•••`, e o nome também com
   * dois cliques, como se renomeia um arquivo.
   */
  aoRenomear?: (capituloId: string, titulo: string) => void;
  aoTrocarPosicao?: (capituloId: string) => void;
  /** Qual cor fica embaixo no tabuleiro do aluno — um clique, desfeito pelo Ctrl+Z. */
  aoTrocarOrientacao?: (capituloId: string, orientacao: CapituloV2["orientacao"]) => void;
  /** "Mudar para…" introdução ou treino (pedido do Doug, 15/9/2026). */
  aoMudarModo?: (capituloId: string) => void;
}) {
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [vaoAlvo, setVaoAlvo] = useState<number | null>(null);

  function largar() {
    setArrastando(null);
    setVaoAlvo(null);
  }

  function vaoDoPonteiro(evento: DragEvent<HTMLElement>, indice: number): number {
    const caixa = evento.currentTarget.getBoundingClientRect();
    return evento.clientY < caixa.top + caixa.height / 2 ? indice : indice + 1;
  }

  function aoPassar(evento: DragEvent<HTMLElement>, indice: number) {
    if (arrastando === null) return;
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "move";
    setVaoAlvo(vaoDoPonteiro(evento, indice));
  }

  function aoSoltar(evento: DragEvent<HTMLElement>, indice: number) {
    evento.preventDefault();
    const de = arrastando;
    const vao = vaoDoPonteiro(evento, indice);
    largar();
    if (de !== null) aoMover(capitulos[de].id, vao);
  }

  function fecharMenu(evento: MouseEvent<HTMLButtonElement>) {
    evento.currentTarget.closest("details")?.removeAttribute("open");
  }

  return (
    <nav aria-label="Capítulos na ordem da aula" className="flex flex-col gap-1">
      {capitulos.map((capitulo, indice) => {
        const selecionado = capitulo.id === atualId;
        const linhaAcima = vaoAlvo === indice;
        const linhaAbaixo = vaoAlvo === indice + 1;
        return (
          <div
            key={capitulo.id}
            draggable={capitulos.length > 1}
            onDragStart={(evento) => {
              setArrastando(indice);
              evento.dataTransfer.effectAllowed = "move";
              evento.dataTransfer.setData("text/plain", capitulo.id);
            }}
            onDragEnd={largar}
            onDragOver={(evento) => aoPassar(evento, indice)}
            onDrop={(evento) => aoSoltar(evento, indice)}
            className={`relative flex items-stretch rounded-md border transition-colors ${
              selecionado
                ? "border-foco bg-metodo-superficie/25 text-metodo-tinta-alta"
                : "border-transparent text-tinta hover:border-borda-fraca hover:bg-carta-toque"
            } ${arrastando === indice ? "opacity-40" : ""}`}
          >
            {linhaAcima ? <span aria-hidden className="absolute -top-1 left-0 right-0 h-0.5 rounded bg-foco" /> : null}
            {linhaAbaixo ? <span aria-hidden className="absolute -bottom-1 left-0 right-0 h-0.5 rounded bg-foco" /> : null}
            <span
              aria-hidden
              title={capitulos.length > 1 ? "Arraste para mudar este capítulo de lugar" : undefined}
              className={`flex w-7 shrink-0 items-center justify-center text-tinta-fraca ${capitulos.length > 1 ? "cursor-grab" : "opacity-30"}`}
            >
              <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                <circle cx="4" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
                <circle cx="4" cy="8" r="1" /><circle cx="8" cy="8" r="1" />
                <circle cx="4" cy="13" r="1" /><circle cx="8" cy="13" r="1" />
              </svg>
            </span>
            {renomeando === capitulo.id && aoRenomear ? (
              <input
                autoFocus
                aria-label="Nome do capítulo"
                defaultValue={capitulo.titulo}
                onFocus={(evento) => evento.currentTarget.select()}
                onBlur={(evento) => { aoRenomear(capitulo.id, evento.currentTarget.value); setRenomeando(null); }}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") evento.currentTarget.blur();
                  if (evento.key === "Escape") { evento.currentTarget.value = capitulo.titulo; evento.currentTarget.blur(); }
                }}
                className="foco my-1 min-w-0 flex-1 rounded border border-borda bg-papel px-1 py-1 text-sm text-tinta"
              />
            ) : (
            <button
              type="button"
              onClick={() => aoEscolher(capitulo)}
              onDoubleClick={() => { if (aoRenomear) setRenomeando(capitulo.id); }}
              aria-current={selecionado ? "true" : undefined}
              title={`${capitulo.titulo}${aoRenomear ? " — dois cliques para renomear" : ""}`}
              className={`foco min-w-0 flex-1 px-1 py-1.5 text-left text-sm leading-snug line-clamp-2 break-words ${selecionado ? "font-semibold" : ""}`}
            >
              {capitulo.titulo}
              {proveniencia[capitulo.id] && proveniencia[capitulo.id] !== "revisada" ? (
                <span className="ml-1 text-xs text-aviso-tinta" title="A origem desta posição ainda não foi registrada">⚑<span className="sr-only"> (origem da posição a revisar)</span></span>
              ) : null}
            </button>
            )}
            <details className="relative shrink-0">
              <summary
                aria-label={`Ações do capítulo ${capitulo.titulo}`}
                title="Mais ações"
                className="foco flex h-full min-h-8 min-w-8 cursor-pointer list-none items-center justify-center rounded px-2 text-tinta-fraca hover:bg-carta-alta"
              >
                <span aria-hidden>•••</span>
              </summary>
              <div className="absolute right-0 z-20 mt-1 flex w-52 flex-col rounded-md border border-borda bg-carta p-1 shadow-lg">
                {aoRenomear ? (
                  <button type="button" onClick={(evento) => { fecharMenu(evento); setRenomeando(capitulo.id); }} className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque">
                    Renomear
                  </button>
                ) : null}
                {aoTrocarPosicao ? (
                  <button type="button" onClick={(evento) => { fecharMenu(evento); aoTrocarPosicao(capitulo.id); }} className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque">
                    Trocar a posição inicial…
                  </button>
                ) : null}
                {aoTrocarOrientacao ? (
                  <button
                    type="button"
                    onClick={(evento) => { fecharMenu(evento); aoTrocarOrientacao(capitulo.id, capitulo.orientacao === "white" ? "black" : "white"); }}
                    className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque"
                  >
                    O aluno vê com as {capitulo.orientacao === "white" ? "pretas" : "brancas"} embaixo
                    <span className="block text-xs text-tinta-fraca">Hoje: {capitulo.orientacao === "white" ? "brancas" : "pretas"} embaixo</span>
                  </button>
                ) : null}
                {aoMudarModo ? (
                  <button type="button" data-mudar-modo-capitulo={capitulo.id} onClick={(evento) => { fecharMenu(evento); aoMudarModo(capitulo.id); }} className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque">
                    Mudar para…
                    <span className="block text-xs text-tinta-fraca">introdução ou treino</span>
                  </button>
                ) : null}
                <hr className="my-1 border-borda-fraca" />
                <button
                  type="button"
                  disabled={indice === 0}
                  onClick={(evento) => { fecharMenu(evento); aoMover(capitulo.id, indice - 1); }}
                  className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque disabled:opacity-40"
                >
                  Mover para cima
                </button>
                <button
                  type="button"
                  disabled={indice === capitulos.length - 1}
                  onClick={(evento) => { fecharMenu(evento); aoMover(capitulo.id, indice + 2); }}
                  className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque disabled:opacity-40"
                >
                  Mover para baixo
                </button>
                {/* §8.4 vive aqui, e não num botão solto ao lado do nome, porque
                    as duas são ações **sobre este capítulo** — e o `•••` é o
                    equivalente por teclado que §25 exige do botão direito. */}
                <hr className="my-1 border-borda-fraca" />
                {aoProveniencia && proveniencia[capitulo.id] ? (
                  <button
                    type="button"
                    onClick={(evento) => { fecharMenu(evento); aoProveniencia(capitulo.id); }}
                    className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque"
                  >
                    De onde veio a posição…
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(evento) => { fecharMenu(evento); aoDuplicar(capitulo.id); }}
                  className="foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque"
                >
                  Duplicar como independente
                </button>
                <button
                  type="button"
                  onClick={(evento) => { fecharMenu(evento); aoExcluir(capitulo.id); }}
                  className="foco rounded px-2 py-1.5 text-left text-sm text-erro-texto hover:bg-erro-superficie/20"
                >
                  Excluir capítulo…
                </button>
              </div>
            </details>
          </div>
        );
      })}
    </nav>
  );
}
