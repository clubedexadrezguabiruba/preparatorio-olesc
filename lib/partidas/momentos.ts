import { z } from "zod";
import { applyUci } from "../chess/fen.ts";
import momentosJson from "../../content/partidas/momentos.json" with { type: "json" };

/**
 * **TESTE.** Os momentos de decisão das fichas-piloto — o que a ficha chama de
 * *move trainer*: uma posição, uma pergunta, um lance esperado.
 *
 * É outra coisa do treinador de linha inteira que mora em `lib/partidas/
 * carregar.ts`, e a diferença é de tamanho: a Marshall–Tarrasch tem 44 lances
 * das pretas e 10 momentos. O número de momentos não cresce com a partida, e é
 * por isso que a ficha os desenhou.
 *
 * ## A conferência roda na importação
 *
 * Mesma forma de `lib/repertorio/conteudo.ts` e `lib/tatica/conteudo.ts`: se o
 * JSON estiver quebrado, a build falha — em vez de o aluno abrir a tela e
 * encontrar um lance que não entra. Aqui a conferência vai além do schema e
 * **aplica cada lance no tabuleiro**, porque o erro que este arquivo pode
 * cometer não é de formato: é uma FEN e um lance que não conversam. Zod não
 * enxerga isso; a chess.js sim.
 *
 * ## O campo de en passant, que já mordeu
 *
 * As FENs da ficha usam a convenção "o peão andou duas casas" e escrevem
 * `b6`/`h3` onde a `chess.js` escreve `-`, porque ela só registra a casa quando
 * a captura é de fato legal. São a **mesma posição** com duas escritas. As FENs
 * daqui já vêm reemitidas pela chess.js — normalizadas na geração, e não na
 * leitura —, e é por isso que a comparação abaixo pode ser byte a byte.
 */

export const NIVEIS = ["essencial", "clube", "avancado"] as const;
export type Nivel = (typeof NIVEIS)[number];

const MomentoSchema = z
  .object({
    /** O slug da partida de onde a posição saiu — o mesmo de `content/partidas/`. */
    partida: z.string().regex(/^[a-z0-9-]+$/),
    n: z.number().int().positive(),
    titulo: z.string().min(3),
    nivel: z.enum(NIVEIS),
    fen: z.string().min(10),
    lado: z.enum(["brancas", "pretas"]),
    /** Em que meio-lance da partida esta posição acontece. */
    ply: z.number().int().min(0),
    pergunta: z.string().min(5),
    san: z.string().min(2),
    /** O que a tela compara quando a peça encosta na casa. */
    uci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
    ideia: z.string(),
    /** O que o aluno lê quando erra. É o campo mais caro da ficha. */
    feedback: z.string(),
    /** Texto solto da ficha sobre outros lances. **Não** é lance aceito. */
    alternativas: z.string(),
    fonte: z.string(),
  })
  .strict();

export type Momento = z.infer<typeof MomentoSchema>;

function conferir(dados: unknown): Momento[] {
  const lido = z.array(MomentoSchema).safeParse(dados);
  if (!lido.success) {
    const lista = lido.error.issues.map((i) => `  [${i.path.join(".")}]: ${i.message}`);
    throw new Error(`content/partidas/momentos.json não passou:\n${lista.join("\n")}`);
  }

  const problemas: string[] = [];
  for (const m of lido.data) {
    const onde = `${m.partida} #${m.n} ("${m.titulo}")`;
    const lado = m.fen.split(" ")[1];
    if (lado !== (m.lado === "brancas" ? "w" : "b")) {
      problemas.push(`${onde}: a ficha diz ${m.lado} e a FEN diz "${lado}"`);
    }
    const depois = applyUci(m.fen, m.uci);
    if (!depois) {
      problemas.push(`${onde}: "${m.uci}" não é lance legal na posição`);
      continue;
    }
    const san = depois.game.history().at(-1);
    if (san !== m.san) problemas.push(`${onde}: o UCI "${m.uci}" é "${san}", não "${m.san}"`);
  }
  if (problemas.length > 0) {
    throw new Error(`content/partidas/momentos.json não passou:\n  ${problemas.join("\n  ")}`);
  }
  return lido.data;
}

const MOMENTOS = conferir(momentosJson);

/** Os momentos de uma partida, na ordem em que acontecem nela. */
export function momentosDa(partida: string): Momento[] {
  return MOMENTOS.filter((m) => m.partida === partida).sort((a, b) => a.n - b.n);
}

/** Quantos momentos cada partida tem, sem abrir a lista. */
export function quantosMomentos(partida: string): number {
  return MOMENTOS.reduce((n, m) => n + (m.partida === partida ? 1 : 0), 0);
}
