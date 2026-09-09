"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Comentario, useComentarioPaginado } from "@/components/lesson/Comentario";
import { LessonButton } from "@/components/lesson/LessonButton";
import { ProfessorSeApresenta } from "@/components/lesson/ProfessorSeApresenta";
import { desenhoDaAutoria, teachingShapes } from "@/lib/chess/annotations";
import { montarQuadros, pausaDoPasso } from "@/lib/lesson/roteiro";
import type { ObjectiveStage as ObjectiveStageData, Position } from "@/lib/lesson/schema";
import { playForMove } from "@/lib/sound";

/**
 * Etapa 1 — **a aula assistida**: o tabuleiro toca sozinho e o professor
 * comenta, um passo por vez.
 *
 * ## O que ela era, e por que mudou
 *
 * Ela era um documento. Nove blocos de texto empilhados na mesma tela — nome da
 * técnica, resumo, um "por quê", três regras numeradas com título e parágrafo,
 * três perigos e o "o que conta como aprendida" —, ~400 palavras simultâneas, e
 * uma lista com `overflow-y-auto` que rolava por dentro para caber. Era a única
 * rolagem que sobrava no motor de aula. O tabuleiro ficava parado o tempo todo,
 * e um aluno de 11 anos e 600 pontos abria isso e lia um manual.
 *
 * Antes disso ela já tinha sido outra coisa: em 2026-09-08 ela mostrava
 * *quadros* de uma animação (a etapa `example`), e cada regra rebobinava o
 * exemplo até o lance dela. A animação saiu do formato naquele dia, e a perda
 * ficou escrita no próprio arquivo: *"o aluno deixa de ver a técnica
 * demonstrada em animação... para um aluno de 600 é o degrau mais íngreme do
 * plano"*.
 *
 * **Este componente é a reversão daquela decisão**, e ela é deliberada: a
 * demonstração volta, não como etapa separada, mas como a etapa 1 inteira. O
 * precedente que dizia o contrário — "assistir não é treinar", do módulo de
 * aberturas — está reescrito na §6.1 de `docs/VOZ-DO-CURSO.md`, e o que o
 * separa deste caso é que lá assistir era o **único** contato antes da prova.
 * Aqui as etapas 2 e 3 continuam sendo jogadas com a mão.
 *
 * ## Como o relógio anda
 *
 * **Quem manda no avanço é o texto, não um cronômetro.** A fala termina de ser
 * digitada (o `Comentario` revela a 7 ms/caractere), o aluno tem a pausa de
 * leitura de `pausaDoPasso` — proporcional ao tamanho da fala —, e só então a
 * próxima posição entra. Um intervalo fixo daria pressa na fala longa e vazio
 * na curta.
 *
 * `setTimeout` encadeado e cancelado no `cleanup`, nunca `setInterval`: é o
 * mesmo desenho que o `TreeStage` usa para a resposta do defensor. Um
 * `setInterval` continuaria batendo depois de o aluno pausar, sair da etapa ou
 * fechar a aula.
 *
 * **Se a fala paginar, o relógio vira a página em vez de pular o passo.** A
 * régua de 200 caracteres (`docs/VOZ-DO-CURSO.md` §3.1) existe justamente para
 * isso nunca acontecer — uma fala paginada numa aula que anda sozinha para o
 * tabuleiro esperando um toque que o aluno não sabe que deve dar. Mas se
 * acontecer, o aluno lê o texto inteiro em vez de perder metade dele.
 *
 * `prefers-reduced-motion` não precisa de tratamento aqui: o `Comentario` já
 * mostra o texto inteiro de uma vez, `digitando` nasce falso, e o player segue
 * tocando com a pausa de leitura cheia.
 *
 * ## Dois controles, e só dois
 *
 * "Pausar"/"Continuar" e "Ver de novo". Nada de passo a passo, nada de barra
 * arrastável: são controles de vídeo, e isto não é um vídeo — é uma aula de 47
 * segundos que o aluno vai ver uma vez e depois jogar.
 */
export function ObjectiveStage({
  stage,
  position,
  orientation,
  trilha,
  rodape,
}: {
  stage: ObjectiveStageData;
  /** A posição da aula — a MESMA das três etapas, e de onde o roteiro parte. */
  position: Position;
  orientation: Color;
  /** A trilha das etapas, montada pelo `LessonPlayer` e servida no painel. */
  trilha?: ReactNode;
  /** Os botões do rodapé do painel — hoje só o "ir para a etapa seguinte". */
  rodape?: ReactNode;
}) {
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(true);

  /**
   * Os quadros do roteiro, um por passo. A conta é pura e mora em
   * `lib/lesson/roteiro.ts`, com teste — aqui só se escolhe qual quadro está na
   * tela.
   */
  const quadros = useMemo(
    () => montarQuadros(position.fen, stage.roteiro),
    [position.fen, stage.roteiro],
  );

  const atual = stage.roteiro[passo];
  const quadro = quadros[passo];
  const ultimo = passo >= stage.roteiro.length - 1;

  const comentario = useComentarioPaginado(atual.fala);
  const { digitando, naUltima } = comentario;
  const terminou = ultimo && naUltima && !digitando;

  /**
   * A paginação numa referência.
   *
   * O relógio precisa dela **na hora em que dispara**, e não na hora em que foi
   * agendado: entre uma coisa e outra a medição do `ResizeObserver` pode ter
   * chegado e partido a fala em duas. A referência é sincronizada por efeito, e
   * não escrita durante o render, porque escrever ref no render quebra o modo
   * concorrente (`react-hooks/refs`) — é a mesma regra que o `ChessBoard` segue
   * com os callbacks dele.
   */
  const comentarioRef = useRef(comentario);
  useEffect(() => {
    comentarioRef.current = comentario;
  });

  /** O relógio: a fala acaba, o aluno lê, e o próximo passo entra. */
  useEffect(() => {
    if (!tocando || digitando) return;
    if (ultimo && naUltima) return;
    const espera = pausaDoPasso(atual);
    const relogio = setTimeout(() => {
      // Página antes de passo: uma fala partida é lida inteira, e só então o
      // tabuleiro anda.
      if (!comentarioRef.current.naUltima) comentarioRef.current.virar();
      else setPasso((p) => Math.min(p + 1, stage.roteiro.length - 1));
    }, espera);
    return () => clearTimeout(relogio);
  }, [tocando, digitando, naUltima, ultimo, atual, stage.roteiro.length]);

  /**
   * O som do lance, por passo.
   *
   * Roda no passo, e não dentro do relógio, para o "Ver de novo" soar igual à
   * primeira vez. O passo que não move peça (`lastMove` nulo) é mudo — não há
   * lance para soar.
   */
  useEffect(() => {
    const q = quadros[passo];
    if (!q?.lastMove) return;
    playForMove({ capture: q.capture, check: q.check });
  }, [passo, quadros]);

  /**
   * O que se desenha por cima, em duas camadas: a de baixo é deduzida da
   * posição (`teachingShapes` — o corte, a peça pendurada), a de cima é a que a
   * autoria escreveu no passo.
   *
   * Elas trocam a cada passo em vez de somar: três passos empilhados chegariam
   * ao aluno como um tabuleiro de nove setas.
   */
  const shapes = useMemo(
    () => [...teachingShapes(quadro.fen, quadro.lastMove), ...desenhoDaAutoria(atual)],
    [quadro, atual],
  );

  const rever = () => {
    setPasso(0);
    setTocando(true);
  };

  return (
    <AulaShell
      tabuleiro={
        // **Só o tabuleiro mora aqui, e isso é a aritmética do palco.** A coluna
        // é dimensionada pela ALTURA que sobra (`.aula-tabuleiro` no CSS), então
        // qualquer irmão embaixo dele transborda o palco e devolve a rolagem.
        <ChessBoard
          fen={quadro.fen}
          orientation={orientation}
          lastMove={quadro.lastMove}
          check={quadro.check}
          shapes={shapes}
          matedKing={quadro.matedColor}
          viewOnly
        />
      }
      painel={
        <>
          {trilha}

          <div>
            <h2 className="text-lg font-semibold text-tinta">{stage.technique.name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta-media">
              {stage.technique.summary}
            </p>
          </div>

          <Comentario paginacao={comentario} retrato={<ProfessorSeApresenta />} />

          <AulaRodape>
            {/* O botão de pausa some quando a aula acaba: pausar o que já parou
                não é controle, é botão morto. */}
            {!terminou && (
              <LessonButton onClick={() => setTocando((t) => !t)}>
                {tocando ? "Pausar" : "Continuar"}
              </LessonButton>
            )}
            <LessonButton variant={terminou ? "primary" : "default"} onClick={rever}>
              Ver de novo
            </LessonButton>
            {rodape}
          </AulaRodape>
        </>
      }
    />
  );
}
