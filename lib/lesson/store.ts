"use client";

import { create } from "zustand";

/**
 * O estado da aula (plano da F1, §4). Uma store só, porque só existe uma aula
 * aberta por vez: a rota `app/aula/[id]` a inicializa em `open()` e todo o
 * resto — etapa atual, passo da etapa 2, nó da árvore, mensagem do painel —
 * mora aqui, fora dos componentes.
 *
 * O que **não** mora aqui: a posição desenhada no tabuleiro durante a animação
 * de um lance. Essa é efêmera e vive no componente da etapa.
 */

export type StageKey =
  | "objective"
  | "example"
  | "guided"
  | "solo"
  | "exercises"
  | "practice"
  | "review";
export type TreeKey = "guided" | "solo";

/**
 * A ordem das etapas, e ela é a mesma nos dois módulos — o que muda é **quais**
 * a aula tem. Uma aula de finais tem objetivo, exemplo, com ajuda, sem ajuda,
 * prática e revisão; uma de meio-jogo tem objetivo, exemplo e exercícios, e
 * mais nada. `available`, no `LessonPlayer`, filtra pela presença do bloco no
 * arquivo, e por isso nenhuma das duas precisa saber da outra.
 *
 * `exercises` entra entre `solo` e `practice`: é onde ela cai numa aula de
 * meio-jogo (depois de ver o conceito e o exemplo do autor) e onde cairia se um
 * dia uma aula de finais quisesse as duas.
 */
export const STAGE_ORDER: StageKey[] = [
  "objective",
  "example",
  "guided",
  "solo",
  "exercises",
  "practice",
  "review",
];

export const STAGE_LABEL: Record<StageKey, string> = {
  objective: "Objetivo",
  example: "Exemplo",
  guided: "Com ajuda",
  solo: "Sem ajuda",
  exercises: "Exercícios",
  practice: "Prática real",
  review: "Revisão",
};

export type MessageTone = "good" | "bad" | "warn" | "neutral";

export type PanelMessage = {
  tone: MessageTone;
  text: string;
  /**
   * Sobe a cada mensagem. Serve a duas coisas: o `aria-live` reanuncia mesmo
   * quando o texto se repete (o aluno insistiu no mesmo erro), e o reforço
   * visual na casa sabe que é um evento novo.
   */
  seq: number;
  /** Casa envolvida, para o reforço visual breve no tabuleiro. */
  square?: string;
  /**
   * Esta mensagem é a conclusão da etapa. O painel só consegue enfatizar o que
   * é nó separado — enquanto "Etapa concluída." era concatenada no fim do texto
   * do autor, não havia o que destacar, e o leitor de tela recebia a conclusão
   * como rabo de frase em vez de começar por ela.
   */
  done?: boolean;
};

export type TreeStatus = "playing" | "done" | "failed";

/**
 * A foto do fim da etapa. Existe porque o lance que dá mate é terminal: ele não
 * tem nó de destino, então `nodeId` fica parado no nó **anterior** ao mate e a
 * posição final não está em lugar nenhum da árvore. Enquanto ela vivia só no
 * estado local do componente, sair da etapa e voltar ressuscitava a posição
 * pré-mate com a etapa já fechada para lances — parecia travada.
 */
export type TreeEnd = {
  fen: string;
  lastMove: [string, string];
  /** O feedback do nó terminal, para o painel reencontrar a conclusão. */
  text: string;
};

/**
 * Por que a tentativa acabou. A posição não precisa ser guardada como no `end`
 * — o nó parado já é a certa —, mas o texto sim: sem ele o aluno volta à etapa
 * e encontra o botão de recomeçar sem saber o que errou.
 */
export type TreeFailure = {
  tone: MessageTone;
  text: string;
};

export type TreeState = {
  nodeId: string;
  rootId: string;
  /** Lances do aluno aceitos nesta tentativa — é o que o `moveLimit` conta. */
  studentMoves: number;
  /**
   * Os lances que o aluno **tentou** nesta tentativa, em UCI, na ordem — os
   * aceitos e os recusados.
   *
   * Existe por causa da FN1/B4: o fim da etapa 4 vira linha em
   * `tentativas_aula`, e o que o servidor recebe são os lances, nunca um
   * "dominei" (`lib/finais/rejulgar.ts`). Sem esta lista, o navegador só teria
   * o contador `studentMoves` para mandar — e um número não se reconfere.
   *
   * **Inclusive os recusados**, e não é descuido: o `rejulgarSolo` reproduz a
   * tentativa pelo mesmo caminho que o `TreeStage` percorreu, e ali o lance
   * recusado não gasta lance do teto mas *aconteceu*. Uma lista só com os
   * aceitos não bateria com a que o juiz espera.
   *
   * O que **não** entra é o lance ilegal: o `handleMove` o recusa antes de
   * chegar ao juiz, e o servidor trata lance ilegal como lista inventada.
   */
  moves: string[];
  /**
   * Quando esta tentativa começou, em `Date.now()`. Vira o `tempo_ms` da linha.
   *
   * Medido do início da tentativa e não do primeiro lance: uma aula "dominada"
   * em onze segundos é justamente o que o relatório do professor precisa ver, e
   * começar o relógio no primeiro lance esconderia metade disso.
   */
  startedAt: number;
  /** Quantas vezes a etapa 4 recomeçou do zero. */
  attempt: number;
  status: TreeStatus;
  hintOpen: boolean;
  /** Preenchido só quando `status` é `done`. */
  end: TreeEnd | null;
  /** Preenchido só quando `status` é `failed`. */
  failure: TreeFailure | null;
};

function freshTree(rootId: string, attempt = 1): TreeState {
  return {
    nodeId: rootId,
    rootId,
    studentMoves: 0,
    moves: [],
    startedAt: Date.now(),
    attempt,
    status: "playing",
    hintOpen: false,
    end: null,
    failure: null,
  };
}

/**
 * A mensagem que a etapa reencontra ao ser remontada. `goToStage` apaga a
 * mensagem viva — é uma só para a aula inteira —, e sair de uma etapa desmonta
 * o componente dela. O que sobrevive é o desfecho guardado na árvore: a
 * conclusão do mate ou a explicação da tentativa encerrada.
 *
 * `seq` 0 porque não é evento novo: é o estado em que a etapa ficou. Quem
 * anuncia mudança é a mensagem viva, que tem precedência sobre esta.
 */
export function restingMessage(tree: TreeState | undefined): PanelMessage | null {
  if (!tree) return null;
  if (tree.end) return { tone: "good", text: tree.end.text, done: true, seq: 0 };
  if (tree.failure) return { tone: tree.failure.tone, text: tree.failure.text, seq: 0 };
  return null;
}

/* ------------------------------------------------------------------ *
 * Etapas 5 e 6 — a partida contra o motor
 * ------------------------------------------------------------------ */

/**
 * Qual partida. A etapa 5 tem uma; a etapa 6 tem uma por posição de revisão.
 * As duas jogam exatamente a mesma partida contra o mesmo motor, então
 * compartilham estado e ações — o que muda é a chave.
 */
export type PracticeKey = "practice" | `review:${string}`;

export function reviewKey(positionId: string): PracticeKey {
  return `review:${positionId}`;
}

export type PracticeEnd = {
  result: "win-white" | "win-black" | "draw";
  /** O texto já composto pelo `judgePractice`, com o fato e o conselho. */
  text: string;
  passed: boolean;
};

/**
 * A partida guardada como **origem mais lances**, e não como posição corrente.
 *
 * Não é preciosismo: a lista de lances reconstrói a posição final, o relógio da
 * regra dos 50 lances **e** o contador de repetição — que uma FEN não carrega.
 * Guardar só a FEN atual tornaria `isThreefoldRepetition` cego, e toda partida
 * arrastaria até os 50 lances. Ver o comentário em `lib/chess/status.ts`.
 *
 * É também o que faz a etapa sobreviver a sair e voltar sem a foto do desfecho
 * que a árvore precisou ter (`TreeEnd`): aqui o desfecho é derivado do replay.
 */
export type PracticeState = {
  positionId: string;
  startFen: string;
  /** Os lances da partida em UCI, dos dois lados, na ordem. */
  moves: string[];
  /** Quando esta partida começou, em `Date.now()`. Vira o `tempo_ms` da linha. */
  startedAt: number;
  attempt: number;
  status: "playing" | "passed" | "failed";
  end: PracticeEnd | null;
};

function freshPractice(positionId: string, startFen: string, attempt = 1): PracticeState {
  return {
    positionId,
    startFen,
    moves: [],
    startedAt: Date.now(),
    attempt,
    status: "playing",
    end: null,
  };
}

/** O espelho de `restingMessage` para a partida. */
export function restingPracticeMessage(practice: PracticeState | undefined): PanelMessage | null {
  if (!practice?.end) return null;
  const { end } = practice;
  return {
    tone: end.passed ? "good" : end.result === "draw" ? "warn" : "bad",
    text: end.text,
    done: end.passed,
    seq: 0,
  };
}

/**
 * O estado de **um** exercício do livro.
 *
 * Bem menor que `TreeState` e `PracticeState`, e é o desenho certo: aqui o
 * aluno não conduz uma técnica nem joga uma partida — ele responde uma pergunta
 * de um lance. Não há lista de lances a guardar, nem relógio de 50 lances, nem
 * repetição. O que existe é: já acertou? quantas vezes tentou? a dica está
 * aberta? e até onde a solução do livro já foi tocada.
 *
 * `tries` é contado porque ele é a diferença entre acertar de primeira e
 * acertar na quarta, e é essa diferença que a coluna `primeira` de
 * `tentativa_meiojogo` guarda — a nota do capítulo sai **só** da primeira
 * tentativa de cada item, que é como o Yusupov manda contar.
 */
export type ExerciseState = {
  /** `idle` é "ainda respondendo": só sai daqui por acerto ou por desistência. */
  status: "idle" | "done" | "failed";
  /** Quantos lances o aluno já tentou neste item, nesta tentativa. */
  tries: number;
  hintOpen: boolean;
  /** O último lance tentado, em UCI. Serve ao realce e a repor o tabuleiro. */
  lastMove: string | null;
  /**
   * Até que passo da solução do livro o aluno já viu. `0` = não começou, e a
   * solução só aparece depois de acertar ou desistir — antes disso ela seria a
   * resposta impressa embaixo da pergunta, que é justamente o defeito dos
   * livros de exposição que este módulo não quis copiar.
   */
  revealIndex: number;
  /** Quando este item foi aberto, em `Date.now()`. Vira o `tempo_ms` da linha. */
  startedAt: number;
  attempt: number;
};

function freshExercise(attempt = 1): ExerciseState {
  return {
    status: "idle",
    tries: 0,
    hintOpen: false,
    lastMove: null,
    revealIndex: 0,
    startedAt: Date.now(),
    attempt,
  };
}

/** A chave de um item no mapa de exercícios. Uma função para não haver duas. */
export function exerciseKey(itemId: string): string {
  return `ex:${itemId}`;
}

/**
 * O que o aluno já venceu nesta sessão, para o selo de domínio (§6 do plano).
 *
 * **Grudento de propósito:** recomeçar a etapa 4 depois de tê-la vencido não
 * tira o selo. Quem zera é `open()`, ou seja, trocar de aula — que é
 * exatamente o "na mesma sessão" que a definição de D1 pede.
 */
export type Cleared = {
  solo: boolean;
  practice: boolean;
  /**
   * Os ids dos exercícios já acertados nesta sessão, em ordem de acerto.
   *
   * Grudento pela mesma razão que os outros dois: refazer um exercício que já
   * saiu certo não tira o acerto. Lista e não conjunto porque o estado do
   * zustand atravessa a fronteira do React, e um `Set` mutado no lugar não
   * dispara render — a lista nova, sim.
   *
   * **Não é a nota.** A nota do capítulo é do servidor, somada sobre a primeira
   * tentativa de cada item (`lib/meiojogo/progresso.ts`); isto aqui é só o que
   * a tela precisa para marcar o item como feito sem ir ao banco.
   */
  exercises: string[];
};

type LessonStore = {
  lessonId: string | null;
  stage: StageKey;
  /**
   * Onde a etapa 2 está: em que cena, e quantos lances dela já rodaram
   * (0 = posição de partida da cena).
   *
   * Virou par em 2026-08-19, quando o exemplo passou a ter cenas — "como
   * termina" e depois "o caminho inteiro". Com um número só, sair da etapa e
   * voltar devolvia o aluno ao lance certo da cena errada.
   */
  example: { scene: number; step: number };
  trees: Partial<Record<TreeKey, TreeState>>;
  /** Indexado por `PracticeKey`; `Record<string, …>` porque chave de template é índice de string. */
  practices: Record<string, PracticeState | undefined>;
  /** Indexado por `exerciseKey(item.id)`. Vazio em aula de finais. */
  exercises: Record<string, ExerciseState | undefined>;
  /**
   * Qual dos exercícios está aberto — o índice na lista da etapa.
   *
   * Mora aqui, e não no componente, pelo mesmo motivo que `example`: sair para
   * outra etapa e voltar tem de devolver o aluno ao exercício em que ele
   * estava, e não ao primeiro.
   */
  exercise: { item: number };
  cleared: Cleared;
  message: PanelMessage | null;

  open: (
    lessonId: string,
    stage: StageKey,
    roots: Partial<Record<TreeKey, string>>,
    practices?: Array<{ key: PracticeKey; positionId: string; startFen: string }>,
  ) => void;
  goToStage: (stage: StageKey) => void;
  setExample: (scene: number, step: number) => void;
  say: (tone: MessageTone, text: string, square?: string) => void;
  /**
   * A mensagem de fim de etapa. Ação nomeada em vez de um quarto parâmetro
   * posicional no `say` — que tem ~20 chamadas e ficaria ilegível com um
   * booleano solto no fim.
   */
  celebrate: (text: string) => void;
  clearMessage: () => void;
  /** Apaga só o reforço visual; o texto do painel continua na tela. */
  fadeFlash: () => void;
  /**
   * Um lance que o aluno tentou, antes de saber se ele passa.
   *
   * Separada do `treeAdvance` porque as duas contam coisas diferentes: o avanço
   * conta os lances que o método aceitou (é o que o teto mede), e esta guarda o
   * que a mão do aluno fez — que é o que o servidor reconfere. Juntá-las
   * perderia justamente o lance recusado.
   */
  treeTry: (key: TreeKey, uci: string) => void;
  /**
   * Um lance do aluno aceito. `nextNodeId` `null` é o lance terminal — e aí o
   * `end` é obrigatório na prática, porque é a única cópia da posição do mate.
   */
  treeAdvance: (key: TreeKey, nextNodeId: string | null, end?: TreeEnd) => void;
  /** Encerra a tentativa. `reason` é o texto que o painel reencontra depois. */
  treeFail: (key: TreeKey, reason?: TreeFailure) => void;
  treeRestart: (key: TreeKey) => void;
  /**
   * Põe a árvore num nó **sem fingir que o aluno jogou até lá**. Só o modo
   * autor (B8) chama: o painel remonta o motor a cada salvamento, e sem isto o
   * lance que o autor acabou de jogar seria desfeito.
   */
  treeSeek: (key: TreeKey, nodeId: string, studentMoves: number) => void;
  toggleHint: (key: TreeKey) => void;

  /** Um lance aceito na partida — do aluno ou do motor, os dois entram aqui. */
  practiceMove: (key: PracticeKey, uci: string) => void;
  practiceFinish: (key: PracticeKey, end: PracticeEnd) => void;
  practiceRestart: (key: PracticeKey) => void;

  /** Abre um exercício da lista. Cria o estado dele se for a primeira vez. */
  openExercise: (itemId: string, index: number) => void;
  /**
   * Um lance tentado num exercício, **antes** de se saber se está certo.
   *
   * Igual ao `treeTry`: o que se guarda aqui é o que a mão do aluno fez, e é
   * isso que o servidor reconfere contra a aula em disco. Chamada em toda
   * tentativa, certa ou errada — é ela que faz `tries` andar, e `tries === 1`
   * no acerto é o que vale ponto.
   */
  exerciseTry: (itemId: string, uci: string) => void;
  /** O aluno acertou: fecha o item e credita o acerto na sessão. */
  exerciseDone: (itemId: string) => void;
  /** O aluno desistiu e pediu a solução. Fecha o item **sem** creditar. */
  exerciseGiveUp: (itemId: string) => void;
  exerciseRestart: (itemId: string) => void;
  exerciseHint: (itemId: string) => void;
  /** Anda um passo na solução do livro, depois que o item já fechou. */
  exerciseReveal: (itemId: string, index: number) => void;
};

export const useLessonStore = create<LessonStore>((set) => ({
  lessonId: null,
  stage: "objective",
  example: { scene: 0, step: 0 },
  trees: {},
  practices: {},
  exercises: {},
  exercise: { item: 0 },
  cleared: { solo: false, practice: false, exercises: [] },
  message: null,

  open: (lessonId, stage, roots, practices = []) =>
    set({
      lessonId,
      stage,
      example: { scene: 0, step: 0 },
      exercise: { item: 0 },
      exercises: {},
      message: null,
      cleared: { solo: false, practice: false, exercises: [] },
      trees: {
        ...(roots.guided ? { guided: freshTree(roots.guided) } : {}),
        ...(roots.solo ? { solo: freshTree(roots.solo) } : {}),
      },
      practices: Object.fromEntries(
        practices.map((p) => [p.key, freshPractice(p.positionId, p.startFen)]),
      ),
    }),

  goToStage: (stage) => set({ stage, message: null }),
  setExample: (scene, step) => set({ example: { scene, step } }),

  say: (tone, text, square) =>
    set((state) => ({
      message: { tone, text, square, seq: (state.message?.seq ?? 0) + 1 },
    })),

  celebrate: (text) =>
    set((state) => ({
      message: { tone: "good", text, done: true, seq: (state.message?.seq ?? 0) + 1 },
    })),

  clearMessage: () => set({ message: null }),
  fadeFlash: () =>
    set((state) => (state.message ? { message: { ...state.message, square: undefined } } : state)),

  treeTry: (key, uci) =>
    set((state) => {
      const tree = state.trees[key];
      // Etapa já encerrada não recebe lance: o `TreeStage` também barra, e as
      // duas guardas juntas impedem que um clique atrasado entre na lista
      // depois do mate — o servidor recusaria a tentativa inteira por isso.
      if (!tree || tree.status !== "playing") return state;
      return { trees: { ...state.trees, [key]: { ...tree, moves: [...tree.moves, uci] } } };
    }),

  treeAdvance: (key, nextNodeId, end) =>
    set((state) => {
      const tree = state.trees[key];
      if (!tree) return state;
      const finished = nextNodeId === null;
      return {
        // Chegar ao mate na etapa 4 é metade do critério de domínio (§6 do
        // plano). Nada mais precisa ser contado: um lance que joga a vitória
        // fora já encerra a tentativa por `treeFail`, o teto de lances também,
        // a etapa 4 roda sem dica nenhuma, e o gate de conteúdo prova que todo
        // nó terminal é mate de verdade — o que descarta afogamento. Portanto
        // `status: "done"` na etapa 4 **é** o critério, e basta lê-lo.
        cleared: key === "solo" && finished ? { ...state.cleared, solo: true } : state.cleared,
        trees: {
          ...state.trees,
          [key]: {
            ...tree,
            nodeId: nextNodeId ?? tree.nodeId,
            studentMoves: tree.studentMoves + 1,
            status: finished ? "done" : tree.status,
            hintOpen: false,
            // Só o lance terminal fecha a etapa; num avanço comum um `end`
            // solto seria ruído, então nem é lido.
            end: finished ? (end ?? null) : tree.end,
          },
        },
      };
    }),

  treeSeek: (key, nodeId, studentMoves) =>
    set((state) => {
      const tree = state.trees[key];
      if (!tree) return state;
      return {
        trees: {
          ...state.trees,
          // A FEN vem do próprio nó, então o tabuleiro se recompõe sozinho. O
          // que **não** volta é o realce do último lance e a mensagem do
          // painel: os dois pertencem ao lance que acabou de ser jogado, e
          // depois de uma carga limpa esse lance não aconteceu.
          [key]: { ...tree, nodeId, studentMoves, status: "playing", end: null, failure: null },
        },
      };
    }),

  treeFail: (key, reason) =>
    set((state) => {
      const tree = state.trees[key];
      if (!tree) return state;
      return {
        trees: {
          ...state.trees,
          [key]: { ...tree, status: "failed", failure: reason ?? null },
        },
      };
    }),

  treeRestart: (key) =>
    set((state) => {
      const tree = state.trees[key];
      if (!tree) return state;
      return {
        message: null,
        trees: { ...state.trees, [key]: freshTree(tree.rootId, tree.attempt + 1) },
      };
    }),

  toggleHint: (key) =>
    set((state) => {
      const tree = state.trees[key];
      if (!tree) return state;
      return { trees: { ...state.trees, [key]: { ...tree, hintOpen: !tree.hintOpen } } };
    }),

  practiceMove: (key, uci) =>
    set((state) => {
      const practice = state.practices[key];
      if (!practice || practice.status !== "playing") return state;
      return {
        practices: {
          ...state.practices,
          // Array novo, não `push`: é a referência que faz o `useMemo` do
          // replay recalcular a partida no componente.
          [key]: { ...practice, moves: [...practice.moves, uci] },
        },
      };
    }),

  practiceFinish: (key, end) =>
    set((state) => {
      const practice = state.practices[key];
      if (!practice) return state;
      return {
        cleared:
          key === "practice" && end.passed ? { ...state.cleared, practice: true } : state.cleared,
        practices: {
          ...state.practices,
          [key]: { ...practice, status: end.passed ? "passed" : "failed", end },
        },
      };
    }),

  practiceRestart: (key) =>
    set((state) => {
      const practice = state.practices[key];
      if (!practice) return state;
      return {
        message: null,
        practices: {
          ...state.practices,
          [key]: freshPractice(practice.positionId, practice.startFen, practice.attempt + 1),
        },
      };
    }),

  openExercise: (itemId, index) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      return {
        exercise: { item: index },
        message: null,
        // Só cria na primeira abertura: voltar a um item já respondido tem de
        // devolvê-lo como estava, com o acerto e a solução já vista.
        exercises: state.exercises[chave]
          ? state.exercises
          : { ...state.exercises, [chave]: freshExercise() },
      };
    }),

  exerciseTry: (itemId, uci) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      const item = state.exercises[chave];
      // Item fechado não recebe lance: o clique atrasado que chegasse depois do
      // acerto viraria uma segunda tentativa gravada, e `primeira` mediria
      // errado justamente no item que o aluno acertou.
      if (!item || item.status !== "idle") return state;
      return {
        exercises: {
          ...state.exercises,
          [chave]: { ...item, tries: item.tries + 1, lastMove: uci, hintOpen: false },
        },
      };
    }),

  exerciseDone: (itemId) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      const item = state.exercises[chave];
      if (!item) return state;
      return {
        cleared: state.cleared.exercises.includes(itemId)
          ? state.cleared
          : { ...state.cleared, exercises: [...state.cleared.exercises, itemId] },
        exercises: { ...state.exercises, [chave]: { ...item, status: "done", hintOpen: false } },
      };
    }),

  exerciseGiveUp: (itemId) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      const item = state.exercises[chave];
      if (!item) return state;
      // `failed`, e não `done`: a solução aparece igual nos dois casos, mas o
      // que a sessão credita é só o acerto. Desistir e ler a resposta é uma
      // coisa boa de se poder fazer, e não é a mesma coisa que acertar.
      return {
        exercises: { ...state.exercises, [chave]: { ...item, status: "failed", hintOpen: false } },
      };
    }),

  exerciseRestart: (itemId) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      const item = state.exercises[chave];
      if (!item) return state;
      return {
        message: null,
        exercises: { ...state.exercises, [chave]: freshExercise(item.attempt + 1) },
      };
    }),

  exerciseHint: (itemId) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      const item = state.exercises[chave];
      if (!item) return state;
      return {
        exercises: { ...state.exercises, [chave]: { ...item, hintOpen: !item.hintOpen } },
      };
    }),

  exerciseReveal: (itemId, index) =>
    set((state) => {
      const chave = exerciseKey(itemId);
      const item = state.exercises[chave];
      if (!item) return state;
      return { exercises: { ...state.exercises, [chave]: { ...item, revealIndex: index } } };
    }),
}));
