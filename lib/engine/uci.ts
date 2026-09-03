/**
 * A língua do motor — UCI (*Universal Chess Interface*), o protocolo de texto
 * que motores de xadrez falam desde 2000: uma linha de comando entra, linhas de
 * resposta saem.
 *
 * Este arquivo é **puro**: nenhuma linha aqui toca Worker, WebAssembly ou DOM.
 * É o que permite ao `node --test` cobrir a parte do motor que de fato tem
 * lógica — o resto (carregar 7 MB de WebAssembly, medir tempo) não é alcançável
 * por teste automático neste projeto, e está declarado assim no plano da F1.
 *
 * A conversa que a etapa 5 tem com o motor, do início ao fim:
 *
 * ```text
 * → uci                                     ← id name Stockfish 18
 *                                           ← option name Skill Level type spin …
 *                                           ← uciok
 * → setoption name Skill Level value 3
 * → isready                                 ← readyok
 * → ucinewgame
 * → isready                                 ← readyok
 * → position fen 8/8/8/4k3/8/8/4K3/7R w - - 0 1
 * → go movetime 300                         ← info depth 1 …
 *                                           ← info depth 2 …
 *                                           ← bestmove h1h4 ponder e5d5
 * ```
 */

/** Uma linha de saída do motor, já classificada. */
export type EngineLine =
  | { kind: "uciok" }
  | { kind: "readyok" }
  /** `uci` é `null` quando o motor responde `bestmove (none)` — não há lance. */
  | { kind: "bestmove"; uci: string | null }
  /** Só interessa para conferir, na bancada, que a build expõe `Skill Level`. */
  | { kind: "option"; name: string }
  | { kind: "id"; name: string }
  /** Tudo o mais: `info depth …`, banner de copyright, linha vazia. */
  | { kind: "ignored" };

/**
 * Classifica uma linha de saída. Nunca lança: entrada estranha vira `ignored`,
 * porque um motor que imprime algo inesperado não pode derrubar a aula.
 */
export function parseLine(raw: string): EngineLine {
  const line = raw.trim();
  if (line === "uciok") return { kind: "uciok" };
  if (line === "readyok") return { kind: "readyok" };

  if (line.startsWith("bestmove")) {
    // "bestmove h1h4 ponder e5d5" → h1h4; "bestmove (none)" → null.
    const move = line.split(/\s+/)[1];
    return { kind: "bestmove", uci: move === undefined || move === "(none)" ? null : move };
  }

  // "option name Skill Level type spin default 20 min 0 max 20"
  // O nome vai de depois de "name" até antes de "type" — e pode ter espaços,
  // que é justamente o caso de "Skill Level".
  if (line.startsWith("option name ")) {
    const rest = line.slice("option name ".length);
    const typeAt = rest.indexOf(" type ");
    return { kind: "option", name: (typeAt === -1 ? rest : rest.slice(0, typeAt)).trim() };
  }

  // "id name Stockfish 18" — o que a bancada `/motor` mostra para provar qual
  // build está de fato rodando.
  if (line.startsWith("id name ")) {
    return { kind: "id", name: line.slice("id name ".length).trim() };
  }

  return { kind: "ignored" };
}

/**
 * Ajusta a força. O Stockfish aceita `Skill Level` de 0 a 20 (conferido no
 * fonte: `options.add("Skill Level", Option(20, 0, 20))`), e a aula escolhe o
 * valor por arquivo — o defensor de um mate elementar não precisa jogar como
 * campeão mundial.
 *
 * Esta função existir sozinha é um seguro barato: se uma build futura não
 * expuser `Skill Level`, o remapeamento para `UCI_LimitStrength`/`UCI_Elo` é
 * uma linha **aqui**, e nada mais no projeto muda.
 */
export function skillCommand(skill: number): string {
  const clamped = Math.max(0, Math.min(20, Math.round(skill)));
  return `setoption name Skill Level value ${clamped}`;
}

/** Zera o estado de busca entre partidas — sem isso o motor carrega lixo da anterior. */
export const NEW_GAME_COMMAND = "ucinewgame";

/** Pergunta se o motor terminou de digerir o que veio antes. Responde `readyok`. */
export const READY_COMMAND = "isready";

/** Abre o diálogo e faz o motor se apresentar. Responde `uciok`. */
export const UCI_COMMAND = "uci";

/**
 * Força um `bestmove` imediato.
 *
 * **Cuidado — este comando não cancela uma busca, ele a interrompe e faz o
 * motor responder assim mesmo.** Quem manda `stop` para desistir de um lance
 * precisa descartar a resposta que vem depois, ou ela vira o lance da busca
 * seguinte. É o que `lib/engine/stockfish.ts` resolve com o carimbo de pedido.
 */
export const STOP_COMMAND = "stop";

/** Encerra o motor. Depois disto o worker pode ser terminado. */
export const QUIT_COMMAND = "quit";

export function positionCommand(fen: string): string {
  return `position fen ${fen}`;
}

/** Busca por tempo fixo — previsível na tela, ao contrário de busca por profundidade. */
export function goCommand(moveTimeMs: number): string {
  return `go movetime ${Math.max(1, Math.round(moveTimeMs))}`;
}

/* ------------------------------------------------------------------ *
 * Análise (B9/E7b) — o que o Estúdio pergunta, e a etapa 5 nunca
 *
 * **`parseLine` não muda, e isso é contrato escrito.** Ela classifica `info …`
 * como `ignored` de propósito — a etapa 5 quer um lance, não uma opinião —, e o
 * `uci.test.ts` cobra exatamente isso. O que a análise precisa entra **ao
 * lado**, em funções novas, e quem não as chamar continua com o motor de
 * antes, letra por letra.
 * ------------------------------------------------------------------ */

/** Uma linha `info` com avaliação, já lida. */
export type InfoLine = {
  depth: number;
  /** Qual das linhas candidatas (1 é a melhor). Sem `multipv`, é 1. */
  multipv: number;
  /** Centipeões, do ponto de vista de quem está na vez. `null` se é mate. */
  cp: number | null;
  /** Lances até o mate, com sinal. `null` se a avaliação é numérica. */
  mate: number | null;
  /** A variante principal, em UCI. */
  pv: string[];
};

/**
 * Lê uma linha `info` com pontuação, ou devolve `null`.
 *
 * `null` para tudo que não é avaliação utilizável: `info string …`, `info depth
 * 1 currmove …` (sem `score`), e — o caso que engana — as linhas marcadas
 * `lowerbound`/`upperbound`. Essas são avaliações **parciais**, publicadas no
 * meio de uma janela de aspiração; mostrá-las faz o número pular na tela e
 * parece defeito do motor.
 */
export function parseInfo(raw: string): InfoLine | null {
  const line = raw.trim();
  if (!line.startsWith("info ")) return null;
  if (/\b(lowerbound|upperbound)\b/.test(line)) return null;

  const palavras = line.split(/\s+/);
  const numeroDepois = (chave: string): number | null => {
    const i = palavras.indexOf(chave);
    if (i === -1) return null;
    const valor = Number(palavras[i + 1]);
    return Number.isFinite(valor) ? valor : null;
  };

  const depth = numeroDepois("depth");
  if (depth === null) return null;

  const scoreAt = palavras.indexOf("score");
  if (scoreAt === -1) return null;
  const tipo = palavras[scoreAt + 1];
  const valor = Number(palavras[scoreAt + 2]);
  if (!Number.isFinite(valor)) return null;

  const pvAt = palavras.indexOf("pv");
  return {
    depth,
    multipv: numeroDepois("multipv") ?? 1,
    cp: tipo === "cp" ? valor : null,
    mate: tipo === "mate" ? valor : null,
    pv: pvAt === -1 ? [] : palavras.slice(pvAt + 1),
  };
}

/**
 * Quantas linhas candidatas o motor publica.
 *
 * **Tem de voltar a 1 antes de qualquer `bestMove`.** Com `MultiPV` alto o
 * Stockfish busca todas as linhas com o mesmo cuidado, e o defensor da etapa 5
 * ficaria mais lento e mais fraco — sem erro nenhum, só um número pior. É o
 * risco declarado do plano, e quem o fecha é o `stockfish.ts`.
 */
export function multiPvCommand(linhas: number): string {
  return `setoption name MultiPV value ${Math.max(1, Math.min(8, Math.round(linhas)))}`;
}

/**
 * Busca por profundidade fixa — o comando da análise.
 *
 * **`go depth N`, e nunca `go infinite`.** Uma busca que termina sozinha não
 * precisa de `stop`, e `stop` no UCI não cancela nada: ele força um `bestmove`
 * imediato, que é exatamente o lance fantasma contra o qual o `stockfish.ts`
 * mantém quatro defesas. Menos um caminho para o fantasma é menos um bug.
 */
export function goDepthCommand(depth: number): string {
  return `go depth ${Math.max(1, Math.min(40, Math.round(depth)))}`;
}
