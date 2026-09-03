/**
 * O formato do puzzle e do índice — **só os tipos**.
 *
 * Eles moram fora de `lib/tatica/banco.ts` porque o banco é `server-only`: ele
 * lê o disco, e um `import` dele num componente de cliente faz a build falhar
 * de propósito. Mas o tabuleiro do aluno, que roda no navegador, precisa saber
 * o que é um `Puzzle`.
 *
 * `import type` seria apagado na compilação e não arrastaria nada — só que
 * isso é uma sutileza de compilador, e depender dela é deixar a barreira de
 * pé por acidente. Um arquivo de tipos separado torna a fronteira visível: o
 * que é forma vem daqui, o que lê disco vem de lá.
 */

/** Um puzzle como ele está no arquivo do recorte. */
export type Puzzle = {
  readonly id: string;
  /** A posição **antes** do erro do adversário. Ver `lib/tatica/conferir.ts`. */
  readonly fen: string;
  /** A linha inteira em UCI: `lances[0]` é o erro dele; o aluno joga a partir do 1. */
  readonly lances: readonly string[];
  readonly rating: number;
  /** Todas as tags do Lichess, não só aquela pela qual o puzzle foi servido. */
  readonly temas: readonly string[];
};

/**
 * Um puzzle junto do tema **por cujo arquivo ele foi servido**.
 *
 * Os dois nem sempre coincidem, e é a prova que os separa: ela mistura o tema
 * atual com os que o aluno já viu, e um garfo servido dentro da prova de
 * "mate do corredor" continua morando no arquivo de `fork`. Sem a origem, o
 * servidor procuraria a solução no arquivo errado e recusaria a tentativa.
 */
export type PuzzleServido = Puzzle & { readonly origem: string };

export type FaixaNoIndice = {
  readonly de: number;
  readonly ate: number;
  readonly arquivo: string;
  readonly total: number;
};

export type TemaNoIndice = {
  readonly tag: string;
  readonly bloco: number;
  readonly faixas: readonly FaixaNoIndice[];
  readonly total: number;
  /** Quantos existiam no banco do Lichess antes do teto por arquivo. */
  readonly noBanco: number;
};

export type Indice = {
  readonly fonte: string;
  readonly geradoEm: string;
  readonly totalNoSite: number;
  readonly temas: readonly TemaNoIndice[];
};
