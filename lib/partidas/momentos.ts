import { z } from "zod";
import { applyUci } from "../chess/fen.ts";

/**
 * Os momentos de decisão de uma partida modelo — o que a ficha chama de *move
 * trainer*: uma posição, uma pergunta, um lance esperado.
 *
 * **Sem `fs` e sem `server-only`.** O schema e a decisão da resposta rodam nos
 * dois lados: o `Desafio.tsx` usa {@link julgarResposta} para reagir na hora, e
 * `app/partidas/acoes.ts` usa a mesma função para gravar — é o servidor quem
 * decide o que conta, e as duas decisões não podem discordar.
 *
 * ## O que saiu do piloto, e por quê
 *
 * - **`nivel`** (`essencial | clube | avancado`). Era a profundidade da ficha, e
 *   o curso tem uma escada só — a de `lib/curso/nivel.ts`. O nível agora é da
 *   **partida**, na tag `[Nivel]` do PGN.
 * - **`fonte` por momento.** A obra é da partida; o momento guarda só a autoria
 *   do texto (`autoria`), copiada do rótulo da ficha.
 *
 * ## `alternativasBoas`, a decisão do Doug de 15/9
 *
 * Um lance tão bom quanto o da partida **não é erro**: a tela diz "bom lance, mas
 * na partida foi outro — tente achar", não conta erro, não quebra o "de
 * primeira" e não avança. Só entra aqui o que o Stockfish do projeto avaliou
 * igual ao lance jogado, ou uma transposição conferida — nunca um palpite.
 */

const UCI = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

export const MomentoSchema = z
  .object({
    /** A ordem na partida, a partir de 1. */
    n: z.number().int().positive(),
    /** O nome da ideia. Aparece **depois** do acerto — antes entregaria a resposta. */
    titulo: z.string().min(3),
    /** Meios-lances jogados antes desta posição: o lance 1 das brancas é o ply 0. */
    ply: z.number().int().min(0),
    fen: z.string().min(10),
    lado: z.enum(["brancas", "pretas"]),
    pergunta: z.string().min(5),
    /** O lance da partida, em SAN inglês canônico. A tela traduz. */
    san: z.string().min(2),
    uci: UCI,
    /** O critério de "concluída": exatamente um por partida. */
    desafioFinal: z.boolean(),
    /** O que o aluno lê depois de acertar. */
    ideia: z.string().min(5),
    /** O que o aluno lê quando erra. */
    feedback: z.string().min(5),
    /** Texto sobre outros lances, lido depois do acerto. Vazio quando não há o que dizer. */
    alternativas: z.string(),
    /** Lances igualmente bons, em UCI. Ver o cabeçalho. */
    alternativasBoas: z.array(UCI),
    /** O rótulo de autoria da ficha: `ANÁLISE DO PROJETO`, `PARÁFRASE FIEL — Chernev`… */
    autoria: z.string().min(3),
  })
  .strict();

export type Momento = z.infer<typeof MomentoSchema>;

/** O veredito de um lance jogado num momento. */
export type Resposta = "certo" | "boa" | "errado";

/**
 * Certo é o lance da partida; boa é uma alternativa aceita; o resto é erro.
 * Um lance ilegal também é erro — o tabuleiro não o deixa acontecer, e o
 * servidor não precisa de uma quarta resposta para um pedido forjado.
 */
export function julgarResposta(momento: Pick<Momento, "uci" | "alternativasBoas">, uci: string): Resposta {
  if (uci === momento.uci) return "certo";
  if (momento.alternativasBoas.includes(uci)) return "boa";
  return "errado";
}

/**
 * O que um momento tem de errado **sozinho**, sem olhar a partida: o lado da
 * FEN, o lance legal, o SAN que casa com o UCI, as alternativas legais e
 * diferentes do esperado. A conferência contra a partida (FEN no ply, lance
 * jogado) é de `lib/partidas/conferir.ts`, que tem a partida na mão.
 */
export function problemasDoMomento(m: Momento, onde: string): string[] {
  const problemas: string[] = [];
  const lado = m.fen.split(" ")[1];
  if (lado !== (m.lado === "brancas" ? "w" : "b")) {
    problemas.push(`${onde}: o momento diz ${m.lado} e a FEN diz "${lado}"`);
  }
  const depois = applyUci(m.fen, m.uci);
  if (!depois) {
    problemas.push(`${onde}: "${m.uci}" não é lance legal na posição`);
  } else {
    const san = depois.game.history().at(-1);
    if (san !== m.san) problemas.push(`${onde}: o UCI "${m.uci}" é "${san}", não "${m.san}"`);
  }
  for (const alt of m.alternativasBoas) {
    if (alt === m.uci) problemas.push(`${onde}: a alternativa boa "${alt}" é o próprio lance esperado`);
    else if (!applyUci(m.fen, alt)) problemas.push(`${onde}: a alternativa boa "${alt}" não é lance legal`);
  }
  if (new Set(m.alternativasBoas).size !== m.alternativasBoas.length) {
    problemas.push(`${onde}: alternativa boa repetida`);
  }
  return problemas;
}
