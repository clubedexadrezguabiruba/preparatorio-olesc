"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import Link from "next/link";
import type { PacoteDeAula } from "@/lib/finais/conteudo";
import type { TentativaDeAula } from "@/lib/finais/gravar";
import { IntroStage } from "@/components/lesson/IntroStage";
import { AVANCO, PARTIDA } from "@/lib/lesson/falas";
import { masteryReport } from "@/lib/lesson/mastery";
import {
  STAGE_LABEL,
  STAGE_ORDER,
  useLessonStore,
  type PracticeKey,
  type StageKey,
  type TreeKey,
} from "@/lib/lesson/store";
import { armAudioOnFirstGesture, isSoundOn, setSoundOn, subscribeSound } from "@/lib/sound";
import { MasterySeal } from "./MasterySeal";
import { ObjectiveStage } from "./ObjectiveStage";
import { PracticeStage } from "./PracticeStage";
import { TreeStage } from "./TreeStage";

/**
 * Orquestra a aula: qual etapa está aberta, o avanço entre elas e a montagem
 * do componente de cada uma. Toda a leitura de xadrez vem do arquivo da aula —
 * este componente não sabe as regras do jogo, só a ordem das etapas.
 */
export function LessonPlayer({
  bundle,
  startAt,
  marcacao,
  revisao = false,
  onStageDone,
  leitura,
  aoAndar,
  edicao,
}: {
  bundle: PacoteDeAula;
  /**
   * Onde a aula deve abrir. O aluno nunca passa isto — ele começa na etapa 1.
   *
   * Quem passa é o modo autor (B8): o painel remonta o motor por `key` a cada
   * salvamento, e sem isto o autor voltaria à etapa 1 a cada frase escrita.
   * Entra **na carga**, e não como restauração depois dela, porque restaurar
   * depois é uma corrida: o React em modo estrito reexecuta os efeitos da
   * subárvore recém-montada **depois** dos efeitos do pai, e o segundo `open()`
   * apagava a devolução. Medido em 2026-08-24, três vezes, 122 ms depois do
   * clique — e em silêncio, que é o que o tornava caro.
   */
  startAt?: {
    stage: StageKey;
    /** Onde cada árvore parou. Sem isto, salvar desfaz o lance recém-jogado. */
    trees?: Partial<Record<TreeKey, { nodeId: string; studentMoves: number }>>;
    /**
     * Em qual diagrama das etapas 1 e 2 abrir, e se a etapa 2 abre parada.
     *
     * As duas etapas de assistir guardam o passo em estado próprio, e não no
     * `useLessonStore` — então `treeSeek` não as alcança e a devolução tem de
     * descer como prop até elas. O editor sempre abre a etapa 2 **parada**: uma
     * aula que anda sozinha embaixo de quem está escrevendo foge da frase.
     */
    passo?: number;
    pausado?: boolean;
  };
  /** O editor acompanha o passo para acender a miniatura certa. O aluno não passa. */
  aoAndar?: (passo: number) => void;
  /**
   * **A edição no lugar.** Só o modo editor passa; sem isto, nada muda.
   *
   * Cada função troca um pedaço de texto pelo mesmo texto com um lápis em cima.
   * É render-prop, e não um `modoEditor: boolean`, por uma razão de desenho: o
   * player não deve saber o que é um lápis, o que é um rascunho ou o que é
   * salvar. Ele continua sabendo apenas montar a aula; quem sabe editar é o
   * editor, e ele entrega o pedaço já montado.
   *
   * A fala fica **exatamente onde o aluno a lê** — no balão do painel, com a
   * mesma tipografia. É essa a régua de uso: o professor edita a aula olhando
   * para a aula, não para um formulário com nomes de campo.
   */
  edicao?: {
    titulo?: (valor: string) => ReactNode;
    fala?: (etapa: "intro" | "objective", passo: number, valor: string) => ReactNode;
    tecnica?: (campo: "name" | "summary", valor: string) => ReactNode;
  };
  /**
   * Só o modo autor (B8.3): liga o desenho com o botão direito nas etapas 2 e
   * 3 e diz o que desenhar. O aluno nunca recebe isto, e sem isto nada muda.
   */
  marcacao?: { shapes: DrawShape[] | null; onChange: (shapes: DrawShape[]) => void };
  /**
   * A aula foi aberta pelo cartão de **revisão** do painel (`?revisao=1`).
   *
   * Muda uma coisa só, e só nas aulas que **não** têm etapa 6: ali a revisão é
   * a própria prática jogada de novo, dias depois, e a linha precisa dizer
   * `revisao` para a fila espaçada (`lib/finais/revisao.ts`) contá-la. Numa
   * aula com etapa 6 a prática continua sendo prática — o que conta como
   * revisão são as partidas da etapa 6.
   */
  revisao?: boolean;
  /**
   * O que fazer quando uma etapa jogada termina — a server action que grava
   * (`app/finais/acoes.ts`), passada de fora.
   *
   * De fora, e não importada aqui, porque este componente é o motor de aula e
   * não sabe o que é Supabase: quem sabe é a rota. A mesma divisão do
   * `seal={<MasterySeal …/>}` logo abaixo — o motor diz *onde* e *quando*, o
   * site diz *o quê*.
   *
   * O que sobe são **os lances**, nunca um "dominei": quem decide se a etapa
   * saiu é `lib/finais/rejulgar.ts`, no servidor. Sem esta prop nada quebra —
   * é assim que a aula roda no modo autor, sem gravar linha nenhuma.
   */
  onStageDone?: (tentativa: TentativaDeAula) => void | Promise<unknown>;
  /**
   * O que a aula de **leitura** oferece no fim do exemplo: o controle de "eu li
   * até o fim".
   *
   * Vem pronto de fora pelo mesmo motivo que o `onStageDone`, e como elemento e
   * não como par de callbacks porque ele tem estado próprio (o que o banco já
   * sabe, e o toque otimista) que não é da aula. Aula que não é de leitura não
   * recebe nada, e nada aparece.
   */
  leitura?: ReactNode;
}) {
  const { lesson, positions } = bundle;
  const stage = useLessonStore((s) => s.stage);
  const lessonId = useLessonStore((s) => s.lessonId);
  const open = useLessonStore((s) => s.open);
  const goToStage = useLessonStore((s) => s.goToStage);
  const treeSeek = useLessonStore((s) => s.treeSeek);
  const cleared = useLessonStore((s) => s.cleared);
  const practice = useLessonStore((s) => s.practices.practice);

  const available = STAGE_ORDER.filter((key) => lesson.stages[key] !== undefined);

  // Navegador nenhum toca áudio antes de um gesto. O primeiro toque na página
  // destrava o som — inclusive o clique que abre a etapa 2, que roda sozinha.
  useEffect(() => armAudioOnFirstGesture(), []);

  useEffect(() => {
    // A partida da etapa 3 é registrada aqui, junto da raiz da árvore: quem
    // inicializa é a store, não a etapa — e assim trocar de aula zera as duas
    // pelo mesmo caminho.
    const practices: Array<{ key: PracticeKey; positionId: string; startFen: string }> = [];
    const practice = lesson.stages.practice;
    if (practice) {
      practices.push({
        key: "practice",
        positionId: practice.positionId,
        startFen: positions[practice.positionId].fen,
      });
    }

    // A etapa pedida só vale se ela existe nesta aula; senão, a primeira.
    const inicial =
      startAt && available.includes(startAt.stage) ? startAt.stage : available[0] ?? "objective";

    open(lesson.id, inicial, { guided: lesson.stages.guided?.root }, practices);
    for (const [key, onde] of Object.entries(startAt?.trees ?? {})) {
      if (onde) treeSeek(key as TreeKey, onde.nodeId, onde.studentMoves);
    }
    // Reabrir a aula é o que zera o estado; o resto vem da store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  /**
   * A tentativa já mandada, para não mandá-la duas vezes.
   *
   * O `useEffect` roda de novo a cada mudança da fatia observada, e em modo
   * estrito roda duas vezes na montagem. A chave é `etapa:aula:tentativa`:
   * recomeçar a etapa vira uma tentativa nova (o `attempt` sobe) e volta a
   * gravar, que é o comportamento certo — o professor vê a evolução na
   * sequência de linhas, e é para isso que `tentativas_aula` não tem `update`.
   */
  const enviadas = useRef(new Set<string>());

  useEffect(() => {
    // `lessonId` é a trava contra o quadro em que a store ainda fala da aula
    // anterior e o `lesson.id` já é o da nova: sem ela, trocar de aula gravaria
    // os lances de uma no nome da outra.
    if (!onStageDone || lessonId !== lesson.id) return;

    const fim = (
      etapa: TentativaDeAula["etapa"],
      attempt: number,
      lances: string[],
      startedAt: number,
      posicaoId?: string,
    ) => {
      const chave = `${etapa}:${posicaoId ?? ""}:${lesson.id}:${attempt}`;
      if (enviadas.current.has(chave)) return;
      enviadas.current.add(chave);
      // Sem `await` e sem tela de espera: a gravação é o registro do que
      // aconteceu, não um passo da aula. O aluno já viu o selo, e uma falha de
      // rede aqui não pode travar o tabuleiro dele.
      void onStageDone({
        aula: lesson.id,
        etapa,
        lances,
        tempoMs: Date.now() - startedAt,
        posicaoId,
      });
    };

    // Fracasso grava tanto quanto acerto: é a tentativa que o professor precisa
    // ver. Quem decide o veredito é o servidor; daqui sobem só os lances.
    //
    // **Só a partida grava, e ela é a única etapa que afere.** A árvore que
    // sobrou é a *com ajuda*, aquecimento por decisão do Doug: ela não entra na
    // conta da escada, e gravá-la encheria `tentativas_aula` de linhas que
    // nenhuma conta lê. A etapa 4, que gravava como `solo`, saiu do formato.
    if (practice && practice.status !== "playing") {
      // Aberta pelo cartão de revisão, a partida **é** a passada do dia, e é
      // assim que ela precisa ser gravada.
      fim(
        revisao ? "revisao" : "pratica",
        practice.attempt,
        practice.moves,
        practice.startedAt,
        revisao ? practice.positionId : undefined,
      );
    }
    // `practice` muda a cada lance, então este efeito roda muito — e é a trava
    // `enviadas` que segura, não a lista de dependências.
  }, [lesson.id, lessonId, onStageDone, practice, revisao]);

  // Enquanto o efeito acima não rodou, a store ainda fala da aula anterior.
  if (lessonId !== lesson.id) return null;

  const nextStage = (from: StageKey): StageKey | null =>
    available[available.indexOf(from) + 1] ?? null;

  /**
   * A trilha das etapas, que desce para DENTRO do painel de cada etapa.
   *
   * Ela era uma `<nav>` entre o cabeçalho e o palco, e ali ela custava altura
   * de tabuleiro: `--aula-teto` é `100dvh` menos o respiro, o cabeçalho e o
   * vão, e nada mais — qualquer coisa a mais entre eles devolve a rolagem que
   * o palco existe para matar (ver "O palco da aula" em `app/globals.css`).
   * No painel ela não custa nada ao tabuleiro; custa ao comentário, que é o
   * lado que pagina em vez de rolar.
   *
   * É a mesma peça que o repertório chama de `TrilhaDeEtapas`, e ela ainda
   * **não** foi promovida a `components/lesson/`: lá são três etapas fixas
   * escritas à mão, aqui é a lista variável de `available` — a aula curta tem
   * duas abas e a completa tem cinco. Promover agora seria juntar duas coisas
   * que ainda não são a mesma; quando a segunda cópia nascer igual, ela sobe.
   */
  const trilha = (
    <nav aria-label="Etapas da aula" className="flex flex-wrap gap-2">
      {available.map((key, index) => {
        const active = key === stage;
        return (
          <button
            key={key}
            type="button"
            onClick={() => goToStage(key)}
            aria-current={active ? "step" : undefined}
            className={`min-h-11 rounded-md px-3 py-2 text-sm font-medium ring-1 transition foco ${
              active
                ? "bg-metodo-cheio text-tinta-inversa ring-metodo/30"
                : "bg-carta text-tinta-media ring-borda hover:bg-carta-alta"
            }`}
          >
            {/* O numeral recua **só** na aba inativa. Na ativa ele herda a
                tinta do botão: a aba cheia já é a barulhenta da fila, e um
                cinza de fundo claro sobre o verde cheio media 1,39:1 — a pior
                reprovação que a régua achou no B6.1. */}
            <span className={`tabular-nums ${active ? "" : "text-tinta-fraca"}`}>
              {index + 1}.
            </span>{" "}
            {STAGE_LABEL[key]}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex w-full flex-1 flex-col gap-3">
      {/*
       * **O cabeçalho é uma LINHA, e isso é altura de tabuleiro.**
       *
       * Ele eram três linhas empilhadas — voltar, título, som — e o respiro da
       * página era 80 px. Somados, davam altura que o tabuleiro não tinha.
       * Medido no chess.com em 8/9/2026: a aula deles gasta 16 px acima do
       * tabuleiro e 17 abaixo, e o tabuleiro fica com 95% da altura útil da
       * janela. Numa linha, com o respiro em 40 e o vão em 12, a conta fecha
       * nos 5,5rem que `--aula-teto` desconta no desktop.
       *
       * `flex-wrap` com `items-baseline`: no celular ela quebra em duas, e as
       * peças continuam alinhadas pela base do texto em vez de pelo topo da
       * caixa — que é o que faz um título de 20 px e um link de 12 parecerem a
       * mesma linha. Os 6rem do celular já contam com essa quebra.
       */}
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {/* No laboratório este link ia para `/`, que era o índice de aulas.
            Aqui `/` é a porta do site e o índice é `/finais` — apontar para a
            raiz mandaria o aluno para fora do curso no meio da aula. */}
        <Link href="/finais" className="foco rotulo text-tinta-fraca hover:underline">
          ← Finais
        </Link>
        <h1 className="titulo">{edicao?.titulo ? edicao.titulo(lesson.title) : lesson.title}</h1>
        <div className="ml-auto self-center">
          <SoundToggle />
        </div>
      </header>

      <section className="flex flex-1 flex-col">
        {stage === "intro" && lesson.stages.intro && (
          <IntroStage
            stage={lesson.stages.intro}
            // O diagrama do passo que não declara FEN própria é a posição da
            // aula. Ela vem da etapa que a tem — a apresentação não aponta
            // posição nenhuma, e é por isso que a trava da MESMA posição não a
            // alcança (ver `lessonSchema`).
            position={
              positions[
                (lesson.stages.objective ?? lesson.stages.guided ?? lesson.stages.practice)!
                  .positionId
              ]
            }
            orientation={lesson.orientation}
            trilha={trilha}
            passoInicial={startAt?.stage === "intro" ? (startAt.passo ?? 0) : 0}
            edicaoDaFala={
              edicao?.fala ? (passo, valor) => edicao.fala!("intro", passo, valor) : undefined
            }
            aoAndar={aoAndar}
            rodape={
              <StageFooter next={nextStage("intro")} onGo={goToStage} label={AVANCO.paraAula} />
            }
          />
        )}

        {stage === "objective" && lesson.stages.objective && (
          <ObjectiveStage
            stage={lesson.stages.objective}
            position={positions[lesson.stages.objective.positionId]}
            orientation={lesson.orientation}
            trilha={trilha}
            passoInicial={startAt?.stage === "objective" ? (startAt.passo ?? 0) : 0}
            pausadoInicial={startAt?.stage === "objective" ? (startAt.pausado ?? false) : false}
            aoAndar={aoAndar}
            edicaoDaFala={
              edicao?.fala ? (passo, valor) => edicao.fala!("objective", passo, valor) : undefined
            }
            edicaoDaTecnica={edicao?.tecnica}
            rodape={
              <StageFooter next={nextStage("objective")} onGo={goToStage} label={AVANCO.paraTreino} />
            }
          />
        )}

        {stage === "guided" && lesson.stages.guided && (
          <TreeStage
            lesson={lesson}
            tree={lesson.stages.guided}
            treeKey="guided"
            trilha={trilha}
            position={positions[lesson.stages.guided.positionId]}
            orientation={lesson.orientation}
            allowHelp
            showBox={lesson.stages.guided.showBox}
            intro={lesson.stages.guided.intro}
            marcacao={marcacao}
            onFinish={() => {
              const next = nextStage("guided");
              if (next) goToStage(next);
            }}
            finishLabel={AVANCO.paraValendo}
          />
        )}

        {stage === "practice" && lesson.stages.practice && (
          <PracticeStage
            practiceKey="practice"
            trilha={trilha}
            position={positions[lesson.stages.practice.positionId]}
            orientation={lesson.orientation}
            goal={lesson.stages.practice.goal}
            engine={lesson.stages.practice.engine}
            intro={PARTIDA.abertura}
            seal={
              <MasterySeal
                report={masteryReport({
                  hasPractice: true,
                  practiceWon: cleared.practice,
                  practiceGoal: lesson.stages.practice.goal,
                })}
              />
            }
          />
        )}

        {/* A aula de leitura não joga: o fim dela é o fim do objetivo, e é ali
            que ela pergunta se foi lida. */}
        {stage === "objective" && leitura}
      </section>
    </div>
  );
}

/**
 * Liga e desliga o som. A preferência mora no `localStorage`, fora do React —
 * por isso `useSyncExternalStore`: no servidor o som é "ligado", e a leitura
 * real do armazenamento entra na hidratação sem acusar divergência.
 */
function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!on)}
      aria-pressed={on}
      /*
       * **`lg:min-h-9` é altura de tabuleiro, e o número foi medido.**
       *
       * O palco desconta 5,5rem do `100dvh` no desktop, e esses 88 px são
       * respiro (40) + cabeçalho (36) + vão (12) — ver "O palco da aula" em
       * `app/globals.css`. Este botão é a peça mais alta do cabeçalho: a
       * `min-h-11` ele mede 44, o cabeçalho vai a 44, e a página passou a rolar
       * **exatamente 8 px** — medido em 1366×768 antes de existir esta linha.
       *
       * Os 44 px continuam valendo abaixo de `lg`, que é onde há dedo: o alvo
       * de toque de 44 px é o mínimo AAA da WCAG 2.5.5, e o orçamento do
       * celular (6rem) já conta com um cabeçalho de 50. No desktop há ponteiro,
       * e 36 px fica bem acima do mínimo AA de 24 (2.5.8).
       */
      className="min-h-11 shrink-0 rounded-md bg-carta px-3 py-2 text-lg leading-none ring-1 ring-borda transition hover:bg-carta-alta foco lg:min-h-9 lg:py-1"
    >
      <span aria-hidden>{on ? "🔊" : "🔇"}</span>
      <span className="sr-only">{on ? "Desligar o som" : "Ligar o som"}</span>
    </button>
  );
}

function StageFooter({
  next,
  onGo,
  label,
}: {
  next: StageKey | null;
  onGo: (stage: StageKey) => void;
  label: string;
}) {
  if (!next) return null;
  // `ml-auto`: o avanço encosta na borda direita do rodapé, e os controles da
  // própria etapa ficam à esquerda dele. Sem isto o botão de avançar sentaria
  // colado nos de "Pausar" e "Ver de novo", que fazem outra coisa.
  return (
    <div className="ml-auto">
      <button
        type="button"
        onClick={() => onGo(next)}
        className="min-h-11 rounded-md bg-metodo-cheio px-4 py-2 text-sm font-medium text-tinta-inversa ring-1 ring-metodo/30 transition hover:bg-metodo-cheio-toque foco"
      >
        {label} →
      </button>
    </div>
  );
}
