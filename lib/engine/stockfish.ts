"use client";

import { ENGINE_BUILD, engineWorkerUrl, type EngineBuild } from "./build.ts";
import {
  goCommand,
  goDepthCommand,
  multiPvCommand,
  NEW_GAME_COMMAND,
  parseInfo,
  parseLine,
  positionCommand,
  QUIT_COMMAND,
  READY_COMMAND,
  skillCommand,
  STOP_COMMAND,
  UCI_COMMAND,
  type InfoLine,
} from "./uci.ts";

/**
 * O motor de xadrez da etapa 5 (plano da F1, §5).
 *
 * **Este é o único arquivo do projeto com `Promise`, junto com o
 * `useEngine.ts` ao lado.** Todo o resto — componentes, store, as outras libs —
 * é síncrono, e a regra existe para continuar assim: quem quer um lance do
 * motor usa o hook, que entrega por callback. Nenhuma promessa atravessa a
 * fronteira de `lib/engine/`.
 *
 * O motor roda num **Web Worker**: um processo separado do navegador. Sem isso,
 * os 300 ms que ele passa pensando congelariam a página inteira — o aluno não
 * conseguiria nem rolar a tela.
 *
 * ## Instância única, com contagem de referências
 *
 * São 7,3 MB de WebAssembly. Carregar duas vezes é inaceitável, e recarregar ao
 * pular da etapa 5 para a 6 e voltar seria pior ainda. Por isso o worker é um
 * só na página, `acquire`/`release` contam quem o está usando, e a demolição
 * espera 30 segundos depois do último `release` — tempo de sobra para uma
 * navegação entre etapas, curto o bastante para não segurar memória à toa.
 *
 * A carga continua preguiçosa como o plano exige: nada acontece até a primeira
 * chamada de `acquireEngine`, que é a montagem da etapa 5.
 */

export type EngineStatus = "loading" | "ready" | "failed";

export type BestMoveRequest = {
  fen: string;
  /** 0 a 20. Vem do arquivo da aula (`engine.skill`). */
  skill: number;
  moveTimeMs: number;
};

export type EngineHandle = {
  status: () => EngineStatus;
  subscribe: (fn: (status: EngineStatus) => void) => () => void;
  /** Zera o estado de busca entre partidas. */
  newGame: () => void;
  bestMove: (req: BestMoveRequest) => Promise<string>;
  /** Análise por profundidade fixa, com linhas candidatas (B9/E7b). */
  analyse: (req: AnaliseRequest) => Promise<Analise>;
  /** Desiste da busca em voo. A resposta que vier depois é descartada. */
  cancel: () => void;
  /** Recria o worker depois de uma falha de carga. */
  retry: () => void;
  build: EngineBuild;
};

/** Teto entre `new Worker` e o primeiro `readyok`. WebAssembly que não compila nunca responde. */
const LOAD_TIMEOUT_MS = 30_000;
/** Folga sobre o `movetime` pedido, antes de considerar a busca perdida. */
const SEARCH_GRACE_MS = 5_000;
/** Quanto o worker sobrevive sem ninguém usando, para a navegação entre etapas não recarregar 7 MB. */
const DISPOSE_DELAY_MS = 30_000;
/** Teto de uma análise. `go depth` termina sozinho; isto é o guarda contra o motor mudo. */
const ANALYSIS_TIMEOUT_MS = 60_000;

/**
 * A análise de uma posição (B9/E7b): as linhas candidatas na profundidade
 * pedida, da melhor para a pior.
 */
export type Analise = {
  depth: number;
  linhas: InfoLine[];
};

export type AnaliseRequest = {
  fen: string;
  /** Profundidade fixa. **Nunca** `go infinite` — ver `goDepthCommand`. */
  depth: number;
  /** Quantas linhas candidatas (1 a 8). */
  multiPv: number;
};

/**
 * O pedido em voo. Duas formas, e o `bestmove` fecha as duas: a busca da etapa
 * 5, que quer um lance, e a análise do Estúdio, que quer as linhas `info` que a
 * primeira descarta. Uma só de cada vez — `bestMove` e `analyse` começam
 * cancelando o que houver.
 */
type Pending =
  | {
      kind: "bestmove";
      id: number;
      resolve: (uci: string) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  | {
      kind: "analise";
      id: number;
      resolve: (analise: Analise) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
      /** A última linha vista de cada candidata — a mais profunda vence. */
      linhas: Map<number, InfoLine>;
    };

let build = ENGINE_BUILD;
let worker: Worker | null = null;
let status: EngineStatus = "loading";
let refs = 0;
let disposeTimer: ReturnType<typeof setTimeout> | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Carimbo monotônico de pedido. É a primeira das quatro defesas contra o lance
 * fantasma: `stop` **não cancela** uma busca no protocolo UCI — ele força um
 * `bestmove` imediato. Sem o carimbo, essa resposta órfã seria entregue como se
 * fosse o lance da busca seguinte, e o aluno veria uma peça se mexendo sozinha.
 */
let requestId = 0;
let pending: Pending | null = null;

/**
 * Fila de quem espera `readyok`. O motor responde `readyok` a cada `isready`, e
 * mandamos `isready` em dois momentos diferentes (fim do aperto de mão e troca
 * de partida) — casar resposta com pedido por posição na fila é o que impede um
 * `readyok` de partida nova ser lido como o do aperto de mão.
 */
let readyWaiters: Array<() => void> = [];

/** A força já configurada no motor, para não remandar `setoption` a cada lance. */
let currentSkill: number | null = null;

/**
 * O `MultiPV` já configurado. Memoizado por um motivo medível: com ele acima de
 * 1 o Stockfish busca todas as linhas com o mesmo cuidado, e o defensor da
 * etapa 5 fica **mais lento e mais fraco** — sem erro nenhum, só um número
 * pior. É o risco declarado do plano do B9, e a volta forçada a 1 dentro do
 * `bestMove` é o que o fecha.
 */
let currentMultiPv = 1;

const listeners = new Set<(status: EngineStatus) => void>();

function setStatus(next: EngineStatus): void {
  if (status === next) return;
  status = next;
  for (const fn of listeners) fn(next);
}

function abortedError(): Error {
  const error = new Error("busca cancelada");
  error.name = "EngineAborted";
  return error;
}

/** Uma busca abandonada não é falha do motor — o `useEngine` engole silenciosamente. */
export function isAborted(error: unknown): boolean {
  return error instanceof Error && error.name === "EngineAborted";
}

function post(command: string): void {
  worker?.postMessage(command);
}

function settleFailure(reason: string): void {
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(new Error(reason));
    pending = null;
  }
  readyWaiters = [];
  setStatus("failed");
}

function handleLine(raw: string): void {
  // As linhas `info` só interessam a uma análise em voo. `parseLine` continua
  // chamando-as de ruído — é contrato escrito, coberto pelo `uci.test.ts` —, e
  // a leitura da avaliação entra **ao lado** dela, nunca dentro.
  if (pending?.kind === "analise" && pending.id === requestId) {
    const info = parseInfo(raw);
    if (info) {
      const anterior = pending.linhas.get(info.multipv);
      if (!anterior || info.depth >= anterior.depth) pending.linhas.set(info.multipv, info);
      return;
    }
  }

  const line = parseLine(raw);

  if (line.kind === "uciok") {
    post(READY_COMMAND);
    readyWaiters.push(() => {
      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = null;
      performance.mark("engine:ready");
      try {
        performance.measure("engine:load", "engine:load-start", "engine:ready");
      } catch {
        // Medição é diagnóstico, nunca requisito: marca ausente não derruba a aula.
      }
      setStatus("ready");
    });
    return;
  }

  if (line.kind === "readyok") {
    readyWaiters.shift()?.();
    return;
  }

  if (line.kind === "bestmove") {
    if (!pending) return; // resposta sem dono: busca já abandonada.
    if (pending.id !== requestId) {
      // O `bestmove` órfão que o `stop` forçou. Morre aqui.
      return;
    }

    if (pending.kind === "analise") {
      const { resolve, timer, linhas } = pending;
      clearTimeout(timer);
      pending = null;
      const ordenadas = [...linhas.values()].sort((a, b) => a.multipv - b.multipv);
      resolve({ depth: ordenadas[0]?.depth ?? 0, linhas: ordenadas });
      return;
    }

    performance.mark("engine:bestmove");
    try {
      performance.measure("engine:think", "engine:go", "engine:bestmove");
    } catch {
      // idem
    }
    const { resolve, reject, timer } = pending;
    clearTimeout(timer);
    pending = null;
    if (line.uci === null) reject(new Error("o motor não encontrou lance nesta posição"));
    else resolve(line.uci);
  }
}

function start(): void {
  if (worker || typeof window === "undefined") return;

  setStatus("loading");
  currentSkill = null;
  readyWaiters = [];
  performance.mark("engine:load-start");

  try {
    /*
     * O script é servido cru de `public/engine/` e **não** passa pelo
     * empacotador. Dois motivos: a cola é artefato pré-compilado que localiza o
     * próprio `.wasm` a partir da própria URL — empacotá-la renomearia o script
     * para um chunk com hash e quebraria essa derivação —, e não há nada a
     * ganhar, são 21 KB já minificados. O `turbopackIgnore` é a forma
     * documentada de dizer isso ao Turbopack, que é o empacotador padrão desta
     * versão do Next (e que ignora em silêncio qualquer config de `webpack()`,
     * então a rota dos tutoriais de internet não funcionaria aqui).
     *
     * Sem `{ type: "module" }`: a cola é um script clássico, não um módulo.
     */
    worker = new Worker(/* turbopackIgnore: true */ engineWorkerUrl(build));
  } catch {
    settleFailure("não foi possível criar o worker do motor");
    return;
  }

  worker.onmessage = (event: MessageEvent<string>) => {
    if (typeof event.data === "string") handleLine(event.data);
  };
  // A cola relança a falha de instanciação do WebAssembly num `setTimeout`, o
  // que a transforma em erro não capturado dentro do worker — e chega aqui.
  worker.onerror = () => settleFailure("o motor falhou ao carregar");
  worker.onmessageerror = () => settleFailure("o motor enviou uma mensagem ilegível");

  loadTimer = setTimeout(() => settleFailure("o motor demorou demais para carregar"), LOAD_TIMEOUT_MS);

  post(UCI_COMMAND);
}

function dispose(): void {
  if (loadTimer) clearTimeout(loadTimer);
  loadTimer = null;
  cancel();
  if (worker) {
    try {
      worker.postMessage(QUIT_COMMAND);
    } catch {
      // Worker já morto: nada a encerrar.
    }
    worker.terminate();
    worker = null;
  }
  readyWaiters = [];
  currentSkill = null;
  currentMultiPv = 1;
  status = "loading";
}

function cancel(): void {
  // Incrementar **antes** de mandar `stop` é o que faz o `bestmove` forçado
  // chegar com id vencido e ser descartado em `handleLine`.
  requestId += 1;
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(abortedError());
    pending = null;
  }
  if (worker && status === "ready") post(STOP_COMMAND);
}

/**
 * Espera o motor ficar **ocioso** — não só carregado.
 *
 * Sem isto o motor morre, e a morte é feia: `RuntimeError: unreachable` dentro
 * do WebAssembly, worker inerte e tabuleiro parado sem explicação. O `stop` do
 * UCI é assíncrono: quando ele é enviado, a busca ainda está desenrolando, e
 * qualquer `ucinewgame` ou `go` que chegue nesse intervalo pega o motor em
 * estado inconsistente. Foi exatamente o que aconteceu ao recomeçar a partida
 * enquanto o computador pensava.
 *
 * `isready` é a barreira que o protocolo oferece: o motor só responde `readyok`
 * depois de digerir tudo o que veio antes, busca inclusive. Custa um ida e
 * volta de microssegundos e transforma a corrida inteira em fila.
 */
function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    post(READY_COMMAND);
    readyWaiters.push(resolve);
  });
}

function whenReady(): Promise<void> {
  if (status === "ready") return Promise.resolve();
  if (status === "failed") return Promise.reject(new Error("o motor não está disponível"));
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribe((next) => {
      if (next === "ready") {
        unsubscribe();
        resolve();
      } else if (next === "failed") {
        unsubscribe();
        reject(new Error("o motor não está disponível"));
      }
    });
  });
}

function subscribe(fn: (status: EngineStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Assinatura e leitura do estado para `useSyncExternalStore` — o mesmo padrão
 * que a preferência de som usa. Valem antes de qualquer `acquireEngine`, o que
 * permite ao componente ler o estado sem `setState` dentro de efeito.
 */
export function subscribeEngineStatus(fn: () => void): () => void {
  return subscribe(fn);
}

export function getEngineStatus(): EngineStatus {
  return status;
}

async function bestMove(req: BestMoveRequest): Promise<string> {
  start();
  cancel();
  // Capturado logo depois do `cancel`, que acabou de incrementar: este número é
  // *o nosso* pedido. Se outro `bestMove` ou um `cancel` entrar durante as
  // esperas abaixo, o número muda e nós desistimos — sem isso, dois pedidos
  // simultâneos mandariam dois `go` e o motor receberia comandos entrelaçados.
  const id = requestId;
  await whenReady();
  await whenIdle();
  if (id !== requestId) throw abortedError();

  const promise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending?.id !== id) return;
      pending = null;
      reject(new Error("o motor não respondeu a tempo"));
    }, req.moveTimeMs + SEARCH_GRACE_MS);
    pending = { kind: "bestmove", id, resolve, reject, timer };
  });

  if (req.skill !== currentSkill) {
    post(skillCommand(req.skill));
    currentSkill = req.skill;
  }
  // **`MultiPV` volta a 1 antes de todo lance.** Uma análise anterior o deixou
  // alto, e o defensor herdaria uma busca mais lenta e mais fraca sem que nada
  // reclamasse. Memoizado: com uma partida inteira sem análise, isto não manda
  // comando nenhum.
  if (currentMultiPv !== 1) {
    post(multiPvCommand(1));
    currentMultiPv = 1;
  }
  post(positionCommand(req.fen));
  performance.mark("engine:go");
  post(goCommand(req.moveTimeMs));

  return promise;
}

/**
 * Analisa uma posição e devolve as linhas candidatas (B9/E7b).
 *
 * Mesmo carimbo de pedido do `bestMove`, mesma fila do `whenIdle`: as duas
 * conversas com o motor passam pelo mesmo funil, e por isso não se atropelam.
 * A busca é por **profundidade fixa** — ela termina sozinha, e o `stop`, que no
 * UCI não cancela nada, deixa de ser necessário.
 *
 * Quem chama é o Estúdio, e só acima de 7 peças: abaixo disso a tablebase dá o
 * fato em vez da opinião, e sem carregar 7,3 MB de WebAssembly.
 */
async function analyse(req: AnaliseRequest): Promise<Analise> {
  start();
  cancel();
  const id = requestId;
  await whenReady();
  await whenIdle();
  if (id !== requestId) throw abortedError();

  const promise = new Promise<Analise>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending?.id !== id) return;
      pending = null;
      reject(new Error("o motor não terminou a análise a tempo"));
    }, ANALYSIS_TIMEOUT_MS);
    pending = { kind: "analise", id, resolve, reject, timer, linhas: new Map() };
  });

  const linhas = Math.max(1, Math.min(8, Math.round(req.multiPv)));
  if (linhas !== currentMultiPv) {
    post(multiPvCommand(linhas));
    currentMultiPv = linhas;
  }
  post(positionCommand(req.fen));
  post(goDepthCommand(req.depth));

  return promise;
}

function newGame(): void {
  if (!worker || status !== "ready") return;
  cancel();
  // `ucinewgame` **só** depois de o motor confirmar que parou. Mandá-lo logo
  // atrás do `stop` é o que matava o WebAssembly — ver `whenIdle`.
  post(READY_COMMAND);
  readyWaiters.push(() => {
    post(NEW_GAME_COMMAND);
    post(READY_COMMAND);
    readyWaiters.push(() => {
      // Ocioso e com a memória de busca limpa. O próximo `position` é seguro.
    });
  });
}

const handle: EngineHandle = {
  status: () => status,
  subscribe,
  newGame,
  bestMove,
  analyse,
  cancel,
  retry: () => {
    dispose();
    start();
  },
  build,
};

/**
 * Toma uma referência ao motor, criando-o se for a primeira. Chamar de um
 * `useEffect` — nunca no corpo do componente.
 */
export function acquireEngine(nextBuild: EngineBuild = ENGINE_BUILD): EngineHandle {
  build = nextBuild;
  refs += 1;
  if (disposeTimer) {
    clearTimeout(disposeTimer);
    disposeTimer = null;
  }
  start();
  return handle;
}

/** Devolve a referência. O worker só morre 30 s depois da última. */
export function releaseEngine(): void {
  refs = Math.max(0, refs - 1);
  cancel();
  if (refs > 0 || disposeTimer) return;
  disposeTimer = setTimeout(() => {
    disposeTimer = null;
    if (refs === 0) dispose();
  }, DISPOSE_DELAY_MS);
}

/**
 * Lê a última medição de carga e de busca, em milissegundos.
 *
 * É por aqui que o subagente com Playwright transforma "parece rápido" numa
 * tabela — e é como o alvo de ≤ 2 s por lance no celular é verificado, já que
 * nenhum teste automático deste projeto alcança Worker nem WebAssembly.
 */
export function readEngineTimings(): { loadMs: number | null; thinkMs: number | null } {
  const last = (name: string) => {
    const entries = performance.getEntriesByName(name);
    return entries.length ? Math.round(entries[entries.length - 1].duration) : null;
  };
  return { loadMs: last("engine:load"), thinkMs: last("engine:think") };
}
