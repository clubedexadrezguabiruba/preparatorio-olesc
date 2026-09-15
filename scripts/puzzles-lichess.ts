/**
 * O que os dois recortes do CSV do Lichess têm em comum — os filtros de
 * qualidade, a leitura de uma linha e a conferência da linha de lances.
 *
 * Dois scripts leem o mesmo CSV:
 *
 * - `scripts/filtrar-puzzles.ts` — os 36 temas, de 700 a 2100;
 * - `scripts/base-rating.ts` — os problemas de 400 a 700, só do modo rating
 *   (decisão do Doug de 15/9, `docs/TATICA-RATING.md`).
 *
 * A regra é a mesma nos dois: **mesmo formato e mesmos filtros**. Morava tudo
 * dentro de `filtrar-puzzles.ts`, e ele não pode ser importado — o arquivo roda
 * ao ser carregado e apaga `public/puzzles/` antes de regravar. Copiar os
 * números seria a segunda opinião sobre "o que é um puzzle bom" que a
 * `lib/tatica/blocos.ts` já recusa para a taxonomia.
 */

import { applyUci, fenProblem } from "../lib/chess/fen.ts";

/**
 * Os filtros de qualidade, e o que cada um tira de cima da mesa.
 *
 * `POPULARIDADE` e `JOGADAS`: o Lichess publica todo puzzle que o gerador
 * produziu, inclusive os que ninguém jogou e os que quem jogou reprovou. Um
 * puzzle com popularidade baixa costuma ser um de solução ambígua — duas
 * continuações igualmente boas, e o aluno acerta xadrez e leva errado.
 *
 * `DESVIO`: rating com desvio alto é rating que ainda não assentou. Numa série
 * "em rating crescente", ele é o degrau que não está onde diz estar — e no modo
 * rating ele é o adversário com a força errada.
 */
export const POPULARIDADE_MINIMA = 50;
export const JOGADAS_MINIMAS = 100;
export const DESVIO_MAXIMO = 100;

/** Um puzzle como sai da linha do CSV, antes da amostra. */
export type Bruto = {
  id: string;
  fen: string;
  lances: string[];
  rating: number;
  temas: string[];
};

/**
 * A linha do CSV, se ela passa nos filtros de qualidade e está em
 * `[ratingMinimo, ratingMaximo]`; senão `null`.
 *
 * Colunas, na ordem em que o Lichess as publica:
 *   0 PuzzleId · 1 FEN · 2 Moves · 3 Rating · 4 RatingDeviation
 *   5 Popularity · 6 NbPlays · 7 Themes · 8 GameUrl · 9+ OpeningTags
 *
 * O `9+` não é engano: `OpeningTags` traz várias etiquetas **separadas por
 * vírgula e sem aspas**, então um `split(",")` devolve mais de dez campos numa
 * linha com abertura marcada. Os nove primeiros continuam certos, que é o que
 * importa — e ficar no `split` cru em vez de um parser com aspas vale minutos
 * neste arquivo.
 */
export function lerLinha(linha: string, ratingMinimo: number, ratingMaximo: number): Bruto | null {
  if (!linha || linha.startsWith("PuzzleId")) return null;
  const campo = linha.split(",");
  if (campo.length < 8) return null;

  const rating = Number(campo[3]);
  if (!Number.isFinite(rating) || rating < ratingMinimo || rating > ratingMaximo) return null;
  if (Number(campo[4]) > DESVIO_MAXIMO) return null;
  if (Number(campo[5]) < POPULARIDADE_MINIMA) return null;
  if (Number(campo[6]) < JOGADAS_MINIMAS) return null;
  if (!campo[7]) return null;

  return {
    id: campo[0],
    fen: campo[1],
    lances: campo[2].split(" ").filter(Boolean),
    rating,
    temas: campo[7].split(" ").filter(Boolean),
  };
}

/**
 * A conferência: FEN possível e linha inteira legal.
 *
 * O puzzle do Lichess começa **um lance antes**: a FEN é a posição em que o
 * adversário ainda vai errar, e `lances[0]` é o erro dele. Quem resolve joga a
 * partir de `lances[1]`, e a cor do aluno é a *oposta* à da FEN.
 *
 * Conferir a linha inteira, e não só o primeiro lance, é o que impede um
 * puzzle truncado de chegar ao aluno como "sem solução".
 */
export function problemaDo(p: Pick<Bruto, "fen" | "lances">): string | null {
  const problema = fenProblem(p.fen);
  if (problema) return `FEN: ${problema}`;
  if (p.lances.length < 2) return "a linha tem menos de dois lances";
  let fen = p.fen;
  for (const [i, uci] of p.lances.entries()) {
    const aplicado = applyUci(fen, uci);
    if (!aplicado) return `lance ${i + 1} (${uci}) é ilegal`;
    fen = aplicado.fen;
  }
  return null;
}
