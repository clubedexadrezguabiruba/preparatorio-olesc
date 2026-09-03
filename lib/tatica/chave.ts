/**
 * O espalhador que dá a cada aluno uma sequência própria.
 *
 * Duas coisas precisam do mesmo número: o recorte do CSV
 * (`scripts/filtrar-puzzles.ts`, que amostra 2.000 de cada faixa) e o sorteio
 * da série (`lib/tatica/serie.ts`, que escolhe quais 24 daquele tema este
 * aluno vê). Ele mora aqui porque as duas cópias que existiam antes eram duas
 * chances de alguém "melhorar" uma e não a outra — e a diferença apareceria
 * como um recorte que muda de conteúdo sem ninguém ter mexido no filtro.
 *
 * Não é criptografia e não precisa ser: o que se pede dele é ser **estável**
 * (rodar de novo dá o mesmo) e **uniforme** (não favorecer ids antigos, que no
 * Lichess vêm em ordem). FNV-1a de 32 bits entrega as duas coisas em cinco
 * linhas.
 */
export function chaveDe(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
