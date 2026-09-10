"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Comentario, useComentarioPaginado } from "@/components/lesson/Comentario";
import { LessonButton } from "@/components/lesson/LessonButton";
import { ProfessorSeApresenta } from "@/components/lesson/ProfessorSeApresenta";
import { desenhoDaAutoria } from "@/lib/chess/annotations";
import { APRESENTACAO } from "@/lib/lesson/falas";
import type { IntroStage as IntroStageData, Position } from "@/lib/lesson/schema";

/**
 * Etapa 1 — **a apresentação**: o professor diz o que está em jogo, e **quem
 * avança é o aluno**.
 *
 * ## O que ela é, e o que ela não é
 *
 * Ela é o que faltava antes da aula assistida: se esta posição ganha ou empata,
 * e qual é a técnica que vai aparecer. Até 9/9/2026 isso ou não era dito, ou
 * era dito no meio do roteiro — na `N0-MATING-MATERIAL` estava espremido em
 * três falas *depois* do mate, lidas sem tabuleiro que as sustentasse.
 *
 * **Ela não é um relógio.** É a única etapa da aula em que nada anda sozinho: o
 * aluno lê, olha o diagrama e aperta a seta. É de propósito — a aula assistida
 * logo em seguida anda sozinha por um minuto, e entrar nela sem saber o que
 * procurar é assistir a um vídeo de xadrez.
 *
 * **O diagrama pode trocar entre um passo e outro.** É a única etapa que faz
 * isso: `passo.fen` é FEN livre, escrita no arquivo da aula, e serve ao passo
 * que precisa mostrar peças que não estão na posição da aula — "estas peças dão
 * mate" num diagrama, "estas não dão" no outro. Ausente, o diagrama é a posição
 * da aula, que é o caso comum.
 *
 * ## Três decisões de tela, e o porquê de cada uma
 *
 * **Sem `teachingShapes`.** A aula assistida desenha duas camadas: a deduzida
 * da posição (o corte da torre, a peça pendurada) e a que a autoria escreveu.
 * Aqui só a segunda. A primeira é leitura de *partida*, e o diagrama da
 * apresentação é ilustração — uma seta que a máquina deduziu sobre um desenho
 * de material seria ruído sobre uma legenda.
 *
 * **Sem som.** Nenhuma peça se move: não há lance para soar.
 *
 * **`←` e `→` andam e voltam**, no mesmo gesto que a passada do módulo de
 * aberturas já usa. A tecla é ignorada quando o foco está num controle — lá o
 * navegador já sabe o que fazer, e interceptar faria o gesto valer duas vezes.
 */
export function IntroStage({
  stage,
  position,
  orientation,
  trilha,
  rodape,
  passoInicial = 0,
  edicaoDaFala,
  aoAndar,
}: {
  stage: IntroStageData;
  /** A posição da aula — o diagrama do passo que não declara FEN própria. */
  position: Position;
  orientation: Color;
  /** A trilha das etapas, montada pelo `LessonPlayer` e servida no painel. */
  trilha?: ReactNode;
  /** Os botões do rodapé do painel — hoje só o "ir para a etapa seguinte". */
  rodape?: ReactNode;
  /**
   * Em qual passo abrir. Só o modo editor passa.
   *
   * O editor remonta o player a cada salvamento (por `key`), e sem isto o
   * tabuleiro voltaria ao primeiro diagrama a cada letra digitada — o professor
   * escreveria a fala do passo 7 olhando para a posição do passo 1. Entra na
   * carga do estado, e não como um "pule para lá" depois de montar, pelo mesmo
   * motivo que `startAt` do `LessonPlayer`: o segundo passo apagaria o primeiro.
   */
  passoInicial?: number;
  /** Modo editor: a fala com um lápis, no mesmo lugar em que o aluno a lê. */
  edicaoDaFala?: (passo: number, valor: string) => ReactNode;
  /** Modo editor: qual diagrama está na tela, para a lista acender o certo. */
  aoAndar?: (passo: number) => void;
}) {
  const [passo, setPasso] = useState(() =>
    Math.min(Math.max(passoInicial, 0), stage.passos.length - 1),
  );
  const atual = stage.passos[passo];
  const primeiro = passo === 0;
  const ultimo = passo >= stage.passos.length - 1;

  const comentario = useComentarioPaginado(atual.fala);

  useEffect(() => {
    aoAndar?.(passo);
  }, [passo, aoAndar]);

  const shapes = useMemo(() => desenhoDaAutoria(atual), [atual]);

  const andar = useCallback(
    (para: 1 | -1) =>
      setPasso((p) => Math.min(Math.max(p + para, 0), stage.passos.length - 1)),
    [stage.passos.length],
  );

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      // Foco num controle: o navegador já sabe o que fazer com a seta, e
      // interceptar aqui faria o gesto valer duas vezes.
      const alvo = evento.target;
      if (alvo instanceof Element && alvo.closest("button, a, input, select, textarea")) return;
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        andar(1);
      } else if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        andar(-1);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [andar]);

  return (
    <AulaShell
      tabuleiro={
        // **Só o tabuleiro mora aqui, e isso é a aritmética do palco** — a
        // coluna é dimensionada pela altura que sobra, e qualquer irmão embaixo
        // dele transborda e devolve a rolagem.
        <ChessBoard
          fen={atual.fen ?? position.fen}
          orientation={orientation}
          shapes={shapes}
          viewOnly
        />
      }
      painel={
        <>
          {trilha}

          {edicaoDaFala ? (
            edicaoDaFala(passo, atual.fala)
          ) : (
            <Comentario paginacao={comentario} retrato={<ProfessorSeApresenta />} />
          )}

          <AulaRodape>
            <LessonButton onClick={() => andar(-1)} disabled={primeiro}>
              {APRESENTACAO.voltar}
            </LessonButton>
            {!ultimo && (
              <LessonButton variant="primary" onClick={() => andar(1)}>
                {APRESENTACAO.continuar}
              </LessonButton>
            )}
            {rodape}
          </AulaRodape>
        </>
      }
    />
  );
}
