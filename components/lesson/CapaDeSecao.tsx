"use client";

import type { ReactNode } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { useAtalho } from "@/components/atalhos/Atalhos";
import { focoEmControle } from "@/lib/atalhos/foco";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { ChessBoard } from "@/components/board/ChessBoard";
import { LessonButton } from "@/components/lesson/LessonButton";

/**
 * A capa de seção da aula de abertura — pedido 5 do feedback do aluno (17/9/2026): "não há
 * transição; um capítulo emenda no outro e eu não sei onde estou".
 *
 * Não é etapa nova (a rodada e o servidor não sabem que ela existe): é a porta da etapa. O
 * `LessonPlayer` a mostra antes do capítulo que o estudo marcou com `[SECAO] Título | subtítulo`,
 * e antes do treino guiado e do move trainer, com capa fixa.
 *
 * ## Por que o tabuleiro fica
 *
 * O palco da aula tem a altura contada (`.aula-palco`): trocar o tabuleiro por uma tela cheia
 * mudaria a geometria entre a capa e o capítulo, e o tabuleiro pularia de lugar no "Começar". Ele
 * fica parado na posição em que a seção começa, e só o painel vira capa.
 *
 * O movimento é curto e de uma vez só (`.capa-chega`, `.capa-traco` em `app/globals.css`, com a
 * guarda de `prefers-reduced-motion`): o título sobe 12 px e o traço se estica.
 */
export type Capa = { titulo: string; subtitulo?: string };

export function CapaDeSecao({
  capa,
  parte,
  fen,
  orientacao,
  trilha,
  aoComecar,
}: {
  capa: Capa;
  /** "Parte 2 de 5" — a posição desta capa entre as capas da aula. */
  parte?: { atual: number; total: number };
  fen: string;
  orientacao: Color;
  trilha?: ReactNode;
  aoComecar: () => void;
}) {
  // Espaço começa — com a mesma guarda do capítulo: botão focado já recebe o Espaço do navegador.
  useAtalho("aluno-continuar", () => {
    const foco = typeof document !== "undefined" ? document.activeElement : null;
    if (focoEmControle(foco)) return false;
    aoComecar();
  });

  return (
    <AulaShell
      tabuleiro={<ChessBoard fen={fen} orientation={orientacao} viewOnly />}
      painel={
        <>
          {trilha}
          <section aria-labelledby="capa-da-secao" className="flex flex-1 flex-col justify-center gap-4 py-6 lg:py-10">
            <span aria-hidden className="capa-traco block h-1 w-16 rounded-full bg-metodo-cheio" />
            {parte ? (
              <p className="capa-chega rotulo text-metodo-tinta">
                Parte {parte.atual} de {parte.total}
              </p>
            ) : null}
            <h2 id="capa-da-secao" className="capa-chega font-serif text-3xl font-semibold leading-tight text-tinta text-balance lg:text-4xl">
              {capa.titulo}
            </h2>
            {capa.subtitulo ? (
              <p className="capa-chega text-lg leading-snug text-tinta-media [animation-delay:90ms]">{capa.subtitulo}</p>
            ) : null}
          </section>
          <AulaRodape>
            <LessonButton variant="primary" onClick={aoComecar}>
              Começar →
            </LessonButton>
            <p className="hidden text-xs text-tinta-fraca lg:block" aria-hidden>
              ou aperte <kbd className="rounded border border-borda px-1 font-sans font-semibold">Espaço</kbd>
            </p>
          </AulaRodape>
        </>
      }
    />
  );
}
