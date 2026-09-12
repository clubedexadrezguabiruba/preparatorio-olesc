"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
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
  passoInicial = 0,
  pausadoInicial = false,
  aoAndar,
  edicaoDaFala,
  edicaoDaTecnica,
  marcacao,
  previa,
}: {
  stage: ObjectiveStageData;
  /** A posição da aula — a MESMA das três etapas, e de onde o roteiro parte. */
  position: Position;
  orientation: Color;
  /** A trilha das etapas, montada pelo `LessonPlayer` e servida no painel. */
  trilha?: ReactNode;
  /** Os botões do rodapé do painel — hoje só o "ir para a etapa seguinte". */
  rodape?: ReactNode;
  /**
   * Em qual passo abrir, e se abre parado. Só o modo editor passa os dois.
   *
   * O editor remonta o player a cada salvamento (por `key`), e o professor está
   * escrevendo a fala de *um* diagrama: sem isto, o tabuleiro voltaria ao passo
   * 1 e recomeçaria a tocar a cada letra digitada. E `pausadoInicial` é o
   * padrão do editor porque uma aula que anda sozinha embaixo de quem está
   * escrevendo é uma aula que foge da frase.
   */
  passoInicial?: number;
  pausadoInicial?: boolean;
  /** O editor acompanha para acender a miniatura certa na lista de diagramas. */
  aoAndar?: (passo: number) => void;
  /** Modo editor: a fala com um lápis, no mesmo lugar em que o aluno a lê. */
  edicaoDaFala?: (passo: number, valor: string) => ReactNode;
  /** Modo editor: o nome e o resumo da técnica, com lápis. */
  edicaoDaTecnica?: (campo: "name" | "summary", valor: string) => ReactNode;
  /**
   * Modo editor: o desenho com o botão direito, no diagrama que está na tela.
   *
   * Quando presente, o desenho da autoria sai da camada automática e entra na
   * camada **do usuário** do chessground — que é a única em que o botão direito
   * mexe. As duas existem ao mesmo tempo no tabuleiro; desenhar na automática
   * daria um traço que o professor vê e não consegue apagar.
   *
   * O `ChessBoard` decide se aceita desenho **na criação** (`ChessBoard.tsx:245`),
   * então ligar isto em vida exige remontar por `key` — o editor já remonta a
   * cada troca de diagrama.
   */
  marcacao?: { shapes: DrawShape[]; onChange: (shapes: DrawShape[]) => void };
  /**
   * **A prévia do Editor v2 (§15).** O aluno não passa nada disto; sem ele, este
   * componente se comporta exatamente como antes.
   *
   * ## Por que a prévia entra aqui, e não num player só dela
   *
   * §15.1 é um requisito, não uma preferência: *"usa o mesmo runtime do aluno, nunca
   * um segundo player aproximado"*, e o plano final §16 repete — *"não reproduzir o
   * comportamento pedagógico em um segundo player exclusivo do editor"*. O que faz a
   * aula ser a aula está aqui dentro: o relógio que espera a leitura, a digitação da
   * fala, o som do lance, as duas camadas de desenho e o palco. Um segundo player
   * copiaria as cinco coisas e divergiria na primeira que alguém consertasse.
   *
   * Então o player **cresce controles**, em vez de ganhar um irmão. É um objeto só, e
   * não cinco props soltas, porque ou a prévia está ligada ou não está: meia prévia
   * não é estado que exista.
   *
   * - `relogio` devolve `null` quando o passo **não anda sozinho** — é a pausa manual
   *   de §15.2, e é o professor que aperta "Continuar";
   * - `autoria` substitui o desenho deduzido do passo pelo do documento v2, que tem
   *   cor; `desenhoDaAutoria` lê a forma do arquivo v1, que não tem;
   * - `animacaoMs` é o "movimento" que a velocidade altera;
   * - `aoTerminar` encadeia o próximo capítulo na prévia da aula inteira;
   * - `controles` substitui os dois botões do aluno pela barra da prévia. É
   *   render-prop pelo mesmo motivo de `edicaoDaFala`: este componente não deve saber
   *   o que é uma velocidade nem o que é fechar uma prévia.
   */
  previa?: {
    relogio: (passo: number) => number | null;
    autoria: (passo: number) => DrawShape[];
    animacaoMs: number;
    aoTerminar: () => void;
    controles: (api: {
      passo: number;
      total: number;
      tocando: boolean;
      alternar: () => void;
      irPara: (passo: number) => void;
      reiniciar: () => void;
    }) => ReactNode;
  };
}) {
  const [passo, setPasso] = useState(() =>
    Math.min(Math.max(passoInicial, 0), stage.roteiro.length - 1),
  );
  const [tocando, setTocando] = useState(!pausadoInicial);

  useEffect(() => {
    aoAndar?.(passo);
  }, [passo, aoAndar]);

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

  /**
   * O aviso de fim, por referência.
   *
   * A prévia da aula inteira encadeia o próximo capítulo aqui. Vai por `useRef` para
   * o aviso não sair de novo a cada render do pai — e o efeito depende só de
   * `terminou`, que vira uma vez.
   */
  const aoTerminarRef = useRef(previa?.aoTerminar);
  useEffect(() => {
    aoTerminarRef.current = previa?.aoTerminar;
  });
  useEffect(() => {
    if (terminou) aoTerminarRef.current?.();
  }, [terminou]);

  /** O relógio: a fala acaba, o aluno lê, e o próximo passo entra. */
  useEffect(() => {
    if (!tocando || digitando) return;
    if (ultimo && naUltima) return;
    // Na prévia o relógio é o de §15.2: a leitura fica intacta, o intervalo obedece à
    // velocidade, e `null` é a pausa manual — que não anda até o professor mandar.
    const espera = previa ? previa.relogio(passo) : pausaDoPasso(atual);
    if (espera === null) return;
    const relogio = setTimeout(() => {
      // Página antes de passo: uma fala partida é lida inteira, e só então o
      // tabuleiro anda.
      if (!comentarioRef.current.naUltima) comentarioRef.current.virar();
      else setPasso((p) => Math.min(p + 1, stage.roteiro.length - 1));
    }, espera);
    return () => clearTimeout(relogio);
  }, [tocando, digitando, naUltima, ultimo, atual, passo, previa, stage.roteiro.length]);

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
    () => [
      ...teachingShapes(quadro.fen, quadro.lastMove),
      // Com o editor ligado, o desenho da autoria vive na camada do usuário
      // (por `marcacao`) — repeti-lo aqui o desenharia duas vezes. Os
      // destaques deduzidos ficam: o professor precisa ver o mesmo tabuleiro
      // que o aluno vai ver, e eles não são dele para apagar.
      ...(marcacao ? [] : previa ? previa.autoria(passo) : desenhoDaAutoria(atual)),
    ],
    [quadro, atual, marcacao, previa, passo],
  );

  const rever = () => {
    setPasso(0);
    setTocando(true);
  };

  const irPara = (n: number) => {
    setPasso(Math.min(Math.max(n, 0), stage.roteiro.length - 1));
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
          desenhavel={marcacao}
          animacaoMs={previa?.animacaoMs}
          viewOnly
        />
      }
      painel={
        <>
          {trilha}

          <div>
            <h2 className="text-lg font-semibold text-tinta">
              {edicaoDaTecnica ? edicaoDaTecnica("name", stage.technique.name) : stage.technique.name}
            </h2>
            <div className="mt-1 text-sm leading-relaxed text-tinta-media">
              {edicaoDaTecnica ? (
                edicaoDaTecnica("summary", stage.technique.summary)
              ) : (
                <p>{stage.technique.summary}</p>
              )}
            </div>
          </div>

          {edicaoDaFala ? (
            edicaoDaFala(passo, atual.fala)
          ) : (
            <Comentario paginacao={comentario} retrato={<ProfessorSeApresenta />} />
          )}

          <AulaRodape>
            {previa ? (
              previa.controles({
                passo,
                total: stage.roteiro.length,
                tocando,
                alternar: () => setTocando((t) => !t),
                irPara,
                reiniciar: rever,
              })
            ) : (
              <>
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
              </>
            )}
            {rodape}
          </AulaRodape>
        </>
      }
    />
  );
}
