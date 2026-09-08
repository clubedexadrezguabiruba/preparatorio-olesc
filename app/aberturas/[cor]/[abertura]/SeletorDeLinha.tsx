"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { Cor } from "@/lib/repertorio/linhas";
import { diasAteRevisar, type ProgressoDaLinha } from "@/lib/repertorio/treino";
import { Bolinhas } from "../../Bolinhas";

/**
 * Trocar de linha sem sair do palco.
 *
 * ## Por que ele existe
 *
 * Até 8/9/2026 a lista das linhas ficava **abaixo** do tabuleiro, e o palco da
 * aula tem altura fechada — então ela começava exatamente na dobra. Medido nas
 * onze aberturas: mediana de **2 itens** visíveis só depois de rolar, e em
 * quatro delas o bloco tinha **um item só, a própria linha que já estava na
 * tela**. A ironia está registrada em `docs/REVISAO-FONTES.md` §23: aquelas
 * páginas foram movidas para cá em 7/9/2026 porque "quem entra para treinar
 * nunca desce até o rodapé de `/aberturas`". A mudança reproduziu o defeito num
 * lugar novo.
 *
 * A única informação que só a lista tinha — **pular para uma linha específica
 * vendo o estado de cada uma** — sobe para dentro do painel, atrás do "linha 2
 * de 5" que já estava no cabeçalho. O rótulo deixa de ser só um número e vira o
 * gatilho: a pergunta "onde eu estou?" e a pergunta "para onde eu vou?" são a
 * mesma pergunta, e agora moram no mesmo pixel.
 *
 * ## Sobreposto, e não empurrando
 *
 * O menu é `absolute`: um bloco que empurrasse o painel roubaria altura do
 * comentário, que é justamente o espaço que este redesenho existe para
 * proteger. Ele fecha por `Esc`, por clique fora e ao escolher — e cada item é
 * um `Link`, porque trocar de linha é trocar de URL (`?linha=`), o mesmo
 * caminho que a lista antiga usava.
 *
 * ## O teclado, e por que o menu o sequestra
 *
 * A aula escuta `espaço`, `←` e `→` na janela (ver `Passada.tsx`). Com o menu
 * aberto, essas teclas não podem chegar ao tabuleiro que está atrás dele. O
 * ouvinte abaixo é de **captura**, e `stopPropagation` na captura interrompe o
 * percurso inteiro do evento — inclusive os ouvintes de bolha da própria
 * janela. É o que faz o menu ser modal sem precisar de `<dialog>`.
 */

export type LinhaDoMenu = {
  readonly id: string;
  readonly nome: string;
  readonly progresso: ProgressoDaLinha;
};

/** As teclas que a aula usa, e que o menu aberto tem de engolir. */
const DA_AULA = new Set(["ArrowLeft", "ArrowRight", " ", "Spacebar"]);

export function SeletorDeLinha({
  cor,
  abertura,
  linhas,
  atual,
  posicao,
  agora,
}: {
  cor: Cor;
  abertura: string;
  linhas: readonly LinhaDoMenu[];
  atual: string;
  posicao: { indice: number; total: number };
  agora: string;
}) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const gatilhoRef = useRef<HTMLButtonElement | null>(null);
  const idDoMenu = useId();

  const fechar = useCallback(() => setAberto(false), []);

  /**
   * Fechar por clique fora e por `Esc`, e engolir as teclas da aula.
   *
   * `pointerdown` e não `click`: o clique só chega depois do `mouseup`, e nesse
   * intervalo o menu ainda está por cima do que o aluno quis apertar.
   */
  useEffect(() => {
    if (!aberto) return;

    function foraDaqui(evento: PointerEvent) {
      const alvo = evento.target;
      if (alvo instanceof Node && caixaRef.current?.contains(alvo)) return;
      setAberto(false);
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        setAberto(false);
        gatilhoRef.current?.focus();
        return;
      }
      if (DA_AULA.has(evento.key)) evento.stopPropagation();
    }

    document.addEventListener("pointerdown", foraDaqui);
    window.addEventListener("keydown", aoTeclar, true);
    return () => {
      document.removeEventListener("pointerdown", foraDaqui);
      window.removeEventListener("keydown", aoTeclar, true);
    };
  }, [aberto]);

  return (
    <div ref={caixaRef} className="relative">
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls={aberto ? idDoMenu : undefined}
        className="foco flex items-center gap-1 rounded text-xs text-tinta-fraca tabular-nums transition-colors hover:text-tinta-media"
      >
        <span>
          linha {posicao.indice} de {posicao.total}
        </span>
        <span className="sr-only">— trocar de linha</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`transition-transform ${aberto ? "rotate-180" : ""}`}
        >
          <path d="M6 9.5 12 15.5 18 9.5" />
        </svg>
      </button>

      {aberto ? (
        <div
          id={idDoMenu}
          /*
           * `absolute` com `max-h` e rolagem própria: numa abertura de doze
           * linhas o menu é o único lugar da aula onde rolar é a resposta
           * certa — é uma lista que o aluno abriu de propósito, e que ele fecha
           * quando terminar. O que não pode rolar é a aula atrás dele.
           */
          className="absolute left-0 top-full z-20 mt-2 flex max-h-80 w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-xl border border-borda bg-carta p-2 shadow-lg"
        >
          <p className="rotulo px-1 pb-1 text-tinta-fraca">
            {linhas.length === 1 ? "A linha" : `As ${linhas.length} linhas`}
          </p>
          {linhas.map((l) => {
            const ehAtual = l.id === atual;
            return (
              <Link
                key={l.id}
                href={`/aberturas/${cor}/${abertura}?linha=${l.id}`}
                onClick={fechar}
                aria-current={ehAtual ? "true" : undefined}
                className={`foco flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                  ehAtual
                    ? "border-borda-forte bg-carta-alta"
                    : "border-transparent hover:bg-carta-toque"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-tinta">{l.nome}</span>
                {ehAtual ? (
                  <span className="rotulo shrink-0 text-metodo-tinta">nesta tela</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    {/*
                     * "hoje" é o único rótulo de agenda que cabe aqui. O número
                     * de dias vai no fim da passada, onde há espaço e onde ele
                     * responde a uma pergunta que o aluno acabou de fazer.
                     */}
                    {diasAteRevisar(l.progresso, agora) === 0 ? (
                      <span className="rotulo text-aviso-tinta">hoje</span>
                    ) : null}
                    <Bolinhas progresso={l.progresso} />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
