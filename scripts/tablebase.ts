import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Cliente da tablebase Syzygy (API pública do Lichess) com cache em disco.
 *
 * Regra de arquitetura do plano da F1 (§3.4): **a rede só é usada na autoria,
 * nunca no CI**. Toda resposta é gravada em `content/tablebase-cache/`, que é
 * versionado no repositório; o gate roda offline a partir dele. Cache faltando
 * é erro com instrução, não uma consulta silenciosa à rede.
 */

export const TABLEBASE_ENDPOINT = "https://tablebase.lichess.ovh/standard";
export const CACHE_SCHEMA_VERSION = 1;

export type TbCategory =
  | "win"
  | "cursed-win"
  | "maybe-win"
  | "draw"
  | "blessed-loss"
  | "maybe-loss"
  | "loss"
  | "unknown";

export type TbMove = {
  uci: string;
  /** Resultado visto por quem joga *depois* do lance — `loss` = o lance ganha. */
  category: TbCategory;
  /** Distância até o mate, em meios-lances (plies). `null` quando o lance dá mate. */
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
};

export type TbEntry = {
  /** Resultado visto por quem está na vez de jogar. */
  category: TbCategory;
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
  moves: TbMove[];
};

type CacheFile = {
  schema: number;
  source: string;
  fen: string;
  entry: TbEntry;
};

export class CacheMissError extends Error {
  readonly fen: string;

  constructor(fen: string) {
    super(
      `posição fora do cache da tablebase: "${fen}" — rode ` +
        `\`npm run validate:content -- --refresh-cache\` na sua máquina`,
    );
    this.name = "CacheMissError";
    this.fen = fen;
  }
}

/**
 * A chave do cache ignora os contadores de lance: o resultado da tablebase não
 * depende deles nos finais de 3–4 peças da N0 (a regra dos 50 lances só muda o
 * veredito em finais longuíssimos, que a N0 não tem).
 */
export function normalizeFen(fen: string): string {
  const [board, turn, castling, ep] = fen.trim().split(/\s+/);
  return `${board} ${turn} ${castling} ${ep} 0 1`;
}

/**
 * Nome do arquivo de cache: FEN legível + hash curto.
 *
 * O hash não é enfeite. O Windows não distingue maiúscula de minúscula em nome
 * de arquivo, e numa FEN `4k3` (rei preto) e `4K3` (rei branco) são posições
 * diferentes — sem o hash, as duas colidiriam no mesmo arquivo.
 */
export function cacheFileName(fen: string): string {
  const normalized = normalizeFen(fen);
  const readable = normalized
    .replace(/\//g, "-")
    .replace(/ /g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 8);
  return `${readable}__${hash}.json`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function trimResponse(raw: unknown): TbEntry {
  const r = raw as {
    category: TbCategory;
    dtm: number | null;
    checkmate: boolean;
    stalemate: boolean;
    moves: Array<{
      uci: string;
      category: TbCategory;
      dtm: number | null;
      checkmate: boolean;
      stalemate: boolean;
    }>;
  };
  return {
    category: r.category,
    dtm: r.dtm ?? null,
    checkmate: Boolean(r.checkmate),
    stalemate: Boolean(r.stalemate),
    moves: (r.moves ?? []).map((m) => ({
      uci: m.uci,
      category: m.category,
      dtm: m.dtm ?? null,
      checkmate: Boolean(m.checkmate),
      stalemate: Boolean(m.stalemate),
    })),
  };
}

export class Tablebase {
  private readonly memory = new Map<string, TbEntry>();
  private readonly used = new Set<string>();
  fetched = 0;
  hits = 0;

  private readonly cacheDir: string;
  private readonly allowNetwork: boolean;

  constructor(cacheDir: string, allowNetwork: boolean) {
    this.cacheDir = cacheDir;
    this.allowNetwork = allowNetwork;
  }

  /** Nomes de arquivo que este processo chegou a usar — para achar cache órfão. */
  usedFiles(): ReadonlySet<string> {
    return this.used;
  }

  existingFiles(): string[] {
    if (!existsSync(this.cacheDir)) return [];
    return readdirSync(this.cacheDir).filter((f) => f.endsWith(".json"));
  }

  async lookup(fen: string): Promise<TbEntry> {
    const normalized = normalizeFen(fen);
    const file = cacheFileName(normalized);
    this.used.add(file);

    const cached = this.memory.get(normalized);
    if (cached) return cached;

    const filePath = path.join(this.cacheDir, file);
    if (existsSync(filePath)) {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as CacheFile;
      if (parsed.schema === CACHE_SCHEMA_VERSION && normalizeFen(parsed.fen) === normalized) {
        this.memory.set(normalized, parsed.entry);
        this.hits += 1;
        return parsed.entry;
      }
    }

    if (!this.allowNetwork) throw new CacheMissError(normalized);

    const entry = await this.fetchWithRetry(normalized);
    this.memory.set(normalized, entry);
    mkdirSync(this.cacheDir, { recursive: true });
    const payload: CacheFile = {
      schema: CACHE_SCHEMA_VERSION,
      source: TABLEBASE_ENDPOINT,
      fen: normalized,
      entry,
    };
    writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    this.fetched += 1;
    return entry;
  }

  private async fetchWithRetry(fen: string): Promise<TbEntry> {
    const url = `${TABLEBASE_ENDPOINT}?fen=${encodeURIComponent(fen)}`;
    let lastError = "";
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "laboratorio-finais/validate-content" },
        });
        if (response.ok) {
          // Gentileza com um serviço gratuito: uma consulta por vez, com pausa.
          await sleep(120);
          return trimResponse(await response.json());
        }
        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      await sleep(500 * attempt);
    }
    throw new Error(`tablebase falhou para "${fen}": ${lastError}`);
  }
}

/**
 * Todos os lances legais que preservam o **objetivo** de quem está na vez.
 *
 * A categoria de um lance é o resultado visto por quem joga *depois* dele — o
 * adversário. Daí a assimetria das duas listas:
 *
 * | objetivo | categorias que contam | por quê |
 * |---|---|---|
 * | `win` | `loss` | o adversário perde, isto é: o lance ganha |
 * | `draw` | `loss`, `draw`, `blessed-loss` | não perder é o pedido; ganhar é mais do que o pedido, e `blessed-loss` é o teórico perdido que a regra dos 50 lances salva — do lado de lá, empate |
 *
 * **`cursed-win` não conta em objetivo nenhum**, e é a única exclusão que
 * precisa de argumento: é a vitória teórica que a regra dos 50 lances tira. Num
 * objetivo `win` ela não ganha de verdade; num objetivo `draw` ela é o
 * adversário ganhando, e chamar isso de empate seguro seria mentir para o
 * aluno sobre uma posição em que ele está teoricamente perdido.
 */
export function goalMovesOf(entry: TbEntry, goal: "win" | "draw"): string[] {
  const conta =
    goal === "win"
      ? (c: TbCategory) => c === "loss"
      : (c: TbCategory) => c === "loss" || c === "draw" || c === "blessed-loss";
  return entry.moves
    .filter((m) => conta(m.category))
    .map((m) => m.uci)
    .sort();
}

/**
 * Todos os lances legais que preservam a vitória de quem está na vez.
 * É `goalMovesOf(entry, "win")` com o nome antigo: o gerador de ramos
 * (`branches.ts`) só trabalha em KRK/KQK, onde objetivo nenhum além de ganhar
 * faz sentido.
 */
export function winningMovesOf(entry: TbEntry): string[] {
  return goalMovesOf(entry, "win");
}

/** Plies até o mate depois de um lance. Lance que dá mate conta 0. */
export function pliesAfter(move: TbMove): number | null {
  if (move.checkmate) return 0;
  if (move.dtm === null) return null;
  return Math.abs(move.dtm);
}
