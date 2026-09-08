"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { AulaRodape, AulaShell } from "@/components/lesson/AulaShell";
import { BoxOverlay } from "@/components/board/BoxOverlay";
import { ChessBoard } from "@/components/board/ChessBoard";
import { desenhoDaAutoria, teachingShapes } from "@/lib/chess/annotations";
import type { ObjectiveStage as ObjectiveStageData, Position } from "@/lib/lesson/schema";

/**
 * Etapa 1 — o objetivo, **estático**: a posição, o que se quer, a técnica e os
 * perigos, tudo numa tela que não anda.
 *
 * ## O que ela era, e por que mudou
 *
 * Ela mostrava *quadros* da animação da etapa 2 — a posição depois de N lances
 * —, e cada regra apontava o seu: clicar numa regra rebobinava o exemplo até o
 * momento em que ela acontecia. Aquilo tinha resolvido um defeito real (um
 * iniciante lia "corte o rei" ao lado de um diagrama onde nada estava
 * cortado), e o mecanismo era bom.
 *
 * A etapa 2 saiu do formato em 2026-09-08, e com ela o alvo dos quadros. O que
 * ficou no lugar resolve o mesmo defeito por outro caminho, mais barato: a
 * regra **desenha** sobre a posição — setas e casas acesas, escritas no
 * arquivo — em vez de navegar até um momento dela. O diagrama não muda de
 * posição ao clicar; muda de marcação. Para o aluno, é a diferença entre
 * perder o lugar e não perder.
 *
 * **A posição é a mesma das outras duas etapas**, e o `lessonSchema` recusa o
 * arquivo em que não for. É o que dá sentido a "três etapas, uma posição só":
 * o aluno lê o objetivo olhando exatamente o tabuleiro que vai jogar.
 *
 * ## O que se perdeu, dito por extenso
 *
 * O aluno não vê mais a técnica demonstrada lance a lance. Ele lê o objetivo e
 * já joga, com dica sob demanda na etapa seguinte. É o modelo do *move
 * trainer* que o repertório adotou, e é decisão do Doug — mas para um aluno de
 * 600 é o degrau mais íngreme do plano, e fica registrado aqui.
 */
export function ObjectiveStage({
  stage,
  position,
  orientation,
  trilha,
  rodape,
}: {
  stage: ObjectiveStageData;
  /** A posição da aula — a MESMA das três etapas. */
  position: Position;
  orientation: Color;
  /** A trilha das etapas, montada pelo `LessonPlayer` e servida no painel. */
  trilha?: ReactNode;
  /** Os botões do rodapé do painel — hoje só o "ir para a etapa seguinte". */
  rodape?: ReactNode;
}) {
  /** Índice da regra escolhida; `null` = nenhuma, e vale o desenho da etapa. */
  const [escolhida, setEscolhida] = useState<number | null>(null);

  const regra = escolhida === null ? null : stage.rules[escolhida];

  /**
   * O que se desenha por cima da posição, em duas camadas.
   *
   * A de baixo é deduzida (`teachingShapes`): o corte que a peça maior faz, a
   * peça pendurada. A de cima é a da autoria — e ela é a da **regra escolhida**
   * quando há uma, ou a da etapa quando não há. Não somam: escolher uma regra
   * troca o desenho, não empilha em cima do anterior, senão a terceira regra
   * chegaria num tabuleiro com nove setas.
   *
   * Sem `lastMove`: a posição é de partida, e ninguém acabou de jogar nada.
   */
  const shapes = useMemo(
    () => [...teachingShapes(position.fen, null), ...desenhoDaAutoria(regra ?? stage)],
    [position.fen, regra, stage],
  );

  /** Clicar de novo na mesma regra a desliga, e o tabuleiro volta ao desenho da etapa. */
  const escolher = (indice: number) =>
    setEscolhida((atual) => (atual === indice ? null : indice));

  return (
    <AulaShell
      tabuleiro={
        // **Só o tabuleiro mora aqui, e isso é a aritmética do palco.** A
        // coluna é dimensionada pela ALTURA que sobra (`.aula-tabuleiro` no
        // CSS), então o tabuleiro já ocupa a altura inteira dela: qualquer
        // irmão embaixo dele transborda o palco e devolve a rolagem. Medido em
        // 1366×768: a legenda que ficava aqui somava 24 px à coluna e a página
        // rolava exatamente isso. Ela foi para o painel, onde não custa altura
        // de tabuleiro.
        <ChessBoard
          fen={position.fen}
          orientation={orientation}
          shapes={shapes}
          overlay={regra?.box ? <BoxOverlay fen={position.fen} orientation={orientation} /> : undefined}
          viewOnly
        />
      }
      painel={
        <>
          {trilha}

          {/* A legenda é a única pista, para quem clicou numa regra, de que o
              DESENHO mudou — a posição não muda mais. Fica viva pelo mesmo
              motivo: quem não vê a tela precisa ouvir a troca. */}
          <p aria-live="polite" className="text-xs text-tinta-fraca">
            {regra ? `Mostrando: ${regra.title}` : "O que você vai conseguir fazer no fim da aula."}
          </p>

          <div>
            <h2 className="text-lg font-semibold text-tinta">{stage.technique.name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta-media">{stage.technique.summary}</p>
          </div>

          {/* **A lista rola por dentro, e é ela quem paga o palco.**

              O painel tem altura fechada (ver "O palco da aula" em
              `app/globals.css`), então alguma coisa aqui tem de ceder quando o
              conteúdo passa: ou a PÁGINA rola — que é o defeito que o palco
              existe para matar — ou um bloco de dentro rola. A escolha é a
              lista, porque ela é o único bloco repetitivo: o aluno já sabe o
              que vem depois do passo 3, e rolar dentro dela não tira de vista
              nada que ele precise ver junto com o tabuleiro.

              `min-h-0` é o que faz `overflow-y-auto` valer: sem ele um filho
              `flex-1` nunca encolhe abaixo do próprio conteúdo, a barra nunca
              aparece, e o transbordo vaza para a página — calado. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <p className="text-sm leading-relaxed text-tinta-media">{stage.why}</p>

            <div>
              <h3 className="rotulo text-tinta-fraca">A técnica, em {stage.rules.length} passos</h3>
              {/* `<ol>` e não `<ul>`: a ordem é a técnica. Cada item é um botão
                  porque clicar nele muda o tabuleiro — e `aria-pressed` porque é
                  um estado que fica ligado, não uma navegação. */}
              <ol className="mt-2 flex flex-col gap-2">
                {stage.rules.map((r, i) => {
                  const ativa = escolhida === i;
                  return (
                    <li key={r.title}>
                      <button
                        type="button"
                        aria-pressed={ativa}
                        onClick={() => escolher(i)}
                        className={`flex w-full gap-3 rounded-lg px-4 py-3 text-left ring-1 transition foco ${
                          ativa
                            ? "bg-carta-toque text-tinta ring-borda-forte"
                            : "bg-carta text-tinta-media ring-borda hover:bg-carta-alta"
                        }`}
                      >
                        <span className="rotulo shrink-0 tabular-nums text-metodo">{i + 1}</span>
                        <span className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-tinta">{r.title}</span>
                          <span className="text-sm leading-relaxed">{r.text}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Os perigos. Âmbar e não rubro: é aviso do que costuma dar
                errado, não repreensão de erro que o aluno tenha cometido — ele
                ainda não jogou lance nenhum quando lê isto. */}
            {stage.dangers && stage.dangers.length > 0 && (
              <div className="rounded-lg border border-aviso-superficie/30 bg-aviso-superficie/5 px-4 py-3">
                <h3 className="rotulo text-aviso-tinta">Onde se erra</h3>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
                  {stage.dangers.map((d) => (
                    <li key={d} className="text-sm leading-relaxed text-tinta-media">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-metodo-superficie/30 bg-metodo-superficie/5 px-4 py-3">
              <h3 className="rotulo text-metodo">
                O que conta como dominado
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta-media">{stage.mastery}</p>
            </div>
          </div>

          {rodape ? <AulaRodape>{rodape}</AulaRodape> : null}
        </>
      }
    />
  );
}
