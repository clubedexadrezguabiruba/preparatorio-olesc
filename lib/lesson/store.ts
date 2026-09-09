"use client";

import { create } from "zustand";

import { TRILHA } from "./falas.ts";

/**
 * O estado da aula (plano da F1, §4). Uma store só, porque só existe uma aula
 * aberta por vez: a rota `app/aula/[id]` a inicializa em `open()` e todo o
 * resto — etapa atual, passo da etapa 2, nó da árvore, mensagem do painel —
 * mora aqui, fora dos componentes.
 *
 * O que **não** mora aqui: a posição desenhada no tabuleiro durante a animação
 * de um lance. Essa é efêmera e vive no componente da etapa.
 */

/**
 * **Três etapas, numa posição só** (2026-09-08). Eram seis: saíram `example`
 * (a animação, absorvida pelo objetivo estático), `solo` (a árvore sem ajuda,
 * cujo papel a partida contra a máquina faz) e `review` (a fila de posições
 * novas, substituída pela escada em dias espaçados). Ver `lessonSchema`.
 */
export type StageKey = "objective" | "guided" | "practice";
/** Só uma árvore roteirizada sobrou, e ela é a etapa do meio. */
export type TreeKey = "guided";

export const STAGE_ORDER: StageKey[] = ["objective", "guided", "practice"];

/**
 * Os três rótulos, e eles moram em `lib/lesson/falas.ts` como toda fala de
 * tela. Eram "Objetivo / Com ajuda / Sem ajuda": três nomes que descreviam o
 * desenho do sistema em vez do que o aluno faz em cada um. Ver a §4 de
 * `docs/VOZ-DO-CURSO.md`.
 */
export const STAGE_LABEL: Record<StageKey, string> = TRILHA;

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
 * Qual partida. Hoje há uma só — a etapa 3 —, e o tipo continua sendo um tipo
 * em vez de virar a constante `"practice"` porque a store é indexada por ele e
 * a forma "uma tabela de partidas" é a que serve à escada: no dia em que uma
 * aula quiser mais de uma partida, entra chave nova sem mexer no estado.
 *
 * Era `"practice" | `review:${string}``, com uma partida por posição de
 * revisão. A etapa 6 saiu em 2026-09-08: quem revisa agora é a escada de
 * `lib/finais/`, na MESMA posição, em dias espaçados.
 */
export type PracticeKey = "practice";

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
 * O que o aluno já venceu nesta sessão, para o selo de domínio (§6 do plano).
 *
 * **Grudento de propósito:** recomeçar a etapa 4 depois de tê-la vencido não
 * tira o selo. Quem zera é `open()`, ou seja, trocar de aula — que é
 * exatamente o "na mesma sessão" que a definição de D1 pede.
 */
export type Cleared = { practice: boolean };

type LessonStore = {
  lessonId: string | null;
  stage: StageKey;
  trees: Partial<Record<TreeKey, TreeState>>;
  /** Indexado por `PracticeKey`; `Record<string, …>` porque chave de template é índice de string. */
  practices: Record<string, PracticeState | undefined>;
  cleared: Cleared;
  message: PanelMessage | null;

  open: (
    lessonId: string,
    stage: StageKey,
    roots: Partial<Record<TreeKey, string>>,
    practices?: Array<{ key: PracticeKey; positionId: string; startFen: string }>,
  ) => void;
  goToStage: (stage: StageKey) => void;
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

  /** Um lance aceito na partida — do aluno ou do motor, os dois entram aqui. */
  practiceMove: (key: PracticeKey, uci: string) => void;
  practiceFinish: (key: PracticeKey, end: PracticeEnd) => void;
  practiceRestart: (key: PracticeKey) => void;

};

export const useLessonStore = create<LessonStore>((set) => ({
  lessonId: null,
  stage: "objective",
  trees: {},
  practices: {},
  cleared: { practice: false },
  message: null,

  open: (lessonId, stage, roots, practices = []) =>
    set({
      lessonId,
      stage,
      message: null,
      cleared: { practice: false },
      trees: {
        ...(roots.guided ? { guided: freshTree(roots.guided) } : {}),
      },
      practices: Object.fromEntries(
        practices.map((p) => [p.key, freshPractice(p.positionId, p.startFen)]),
      ),
    }),

  goToStage: (stage) => set({ stage, message: null }),

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
        // **A árvore não afere domínio nenhum, e isso mudou em 2026-09-08.**
        // Era a etapa 4 (`solo`) que fechava metade do critério ao chegar no
        // mate. Ela saiu do formato, e a árvore que sobrou é a etapa *com*
        // ajuda: terminá-la prova que o aluno soube seguir o roteiro com a
        // dica à mão, e isso é aquecimento, não passada. Quem afere é a etapa
        // 3, contra a máquina — ver `Cleared`.
        trees: {
          ...state.trees,
          [key]: {
            ...tree,
            nodeId: nextNodeId ?? tree.nodeId,
            studentMoves: tree.studentMoves + 1,
            status: finished ? "done" : tree.status,
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

}));
