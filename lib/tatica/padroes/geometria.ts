import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

/**
 * A geometria de um mate — o que os detectores de padrão perguntam à posição.
 *
 * ## Por que nossa, e não a do Lichess
 *
 * O Lichess etiqueta 18 padrões de mate e o Praticar ensina 29. Os que faltam
 * (Damiano, Lolli, Anderssen...) não têm tag no banco, então quem os reconhece
 * somos nós, olhando a posição final da linha do puzzle. O `cook.py` do
 * lichess-puzzler faz algo parecido, mas é AGPL: esta lógica foi escrita do
 * zero a partir das definições dos padrões (`docs/TATICA-PADROES.md`).
 *
 * ## O que é "atacar" aqui
 *
 * Toda pergunta de "quem cobre esta casa?" é feita **com o rei que levou mate
 * retirado do tabuleiro**. Sem isso, a torre que dá xeque pela fileira não
 * "cobriria" a casa atrás do rei — o rei está no caminho —, e o detector de
 * mate do corredor acharia uma fuga que não existe.
 *
 * As coordenadas são `[coluna, fileira]`, de 0 a 7: `a1` é `[0, 0]`.
 */

export type Peca = { readonly tipo: PieceSymbol; readonly cor: Color };
export type Coord = readonly [coluna: number, fileira: number];

export function coord(c: Square): Coord {
  return [c.charCodeAt(0) - 97, Number(c[1]) - 1];
}

export function casa(coluna: number, fileira: number): Square | null {
  if (coluna < 0 || coluna > 7 || fileira < 0 || fileira > 7) return null;
  return `${String.fromCharCode(97 + coluna)}${fileira + 1}` as Square;
}

/** Distância de rei: 1 é "colada", em linha reta ou na diagonal. */
export function distancia(a: Square, b: Square): number {
  const [ac, af] = coord(a);
  const [bc, bf] = coord(b);
  return Math.max(Math.abs(ac - bc), Math.abs(af - bf));
}

export function naBorda(c: Square): boolean {
  const [col, fil] = coord(c);
  return col === 0 || col === 7 || fil === 0 || fil === 7;
}

/**
 * Uma borda em que o rei encosta, vista de dentro: `frente` aponta do rei para
 * o meio do tabuleiro, `lado` corre ao longo da borda. Os padrões descritos
 * "na primeira fileira" valem em qualquer borda — o espelho e a rotação são o
 * mesmo desenho —, e quem não cabe (um peão não ataca de lado) cai sozinho na
 * pergunta de quem ataca a casa.
 */
export type Borda = { readonly frente: Coord; readonly lado: Coord };

export function bordasDo(rei: Square): Borda[] {
  const [col, fil] = coord(rei);
  const bordas: Borda[] = [];
  if (fil === 0) bordas.push({ frente: [0, 1], lado: [1, 0] });
  if (fil === 7) bordas.push({ frente: [0, -1], lado: [1, 0] });
  if (col === 0) bordas.push({ frente: [1, 0], lado: [0, 1] });
  if (col === 7) bordas.push({ frente: [-1, 0], lado: [0, 1] });
  return bordas;
}

/**
 * Só as bordas de fileira (1ª e 8ª) — a "primeira fileira" dos padrões que o
 * Praticar descreve assim (Damiano, Lolli, Anderssen). Na coluna a ou h, a
 * mesma figura com bispo é o Max Lange.
 */
export function fileirasDoRei(rei: Square): Borda[] {
  return bordasDo(rei).filter((b) => b.frente[0] === 0);
}

/** A casa `k` passos à frente e `j` de lado do rei, naquela borda. */
export function relativa(rei: Square, borda: Borda, k: number, j: number): Square | null {
  const [col, fil] = coord(rei);
  return casa(col + k * borda.frente[0] + j * borda.lado[0], fil + k * borda.frente[1] + j * borda.lado[1]);
}

export type Vizinha = {
  readonly casa: Square;
  readonly ocupante: Peca | null;
  /** As peças do vencedor que atacam a casa, com o rei retirado. */
  readonly atacantes: readonly Square[];
};

export type Lance = {
  readonly de: Square;
  readonly para: Square;
  readonly peca: PieceSymbol;
  readonly cor: Color;
  readonly captura?: PieceSymbol;
  readonly promocao?: PieceSymbol;
  readonly san: string;
};

/** A posição final de uma linha que termina em mate, e as perguntas sobre ela. */
export type Mate = {
  readonly fen: string;
  readonly vencedor: Color;
  readonly perdedor: Color;
  readonly rei: Square;
  /** Quem dá xeque. Dois itens é xeque duplo. */
  readonly xeque: readonly Square[];
  readonly ultimo: Lance;
  readonly vizinhas: readonly Vizinha[];
  peca(c: Square): Peca | null;
  /** As peças do vencedor que atacam `c`, com o rei que levou mate retirado. */
  atacantes(c: Square): Square[];
  /**
   * Continua mate só com as peças do vencedor que `fica` aceita (o rei dele fica
   * sempre)? É o teste de que o mate é **daquelas** peças: se a cravada de uma
   * torre é o que impede a captura do cavalo, tirar a torre desfaz o mate.
   */
  continuaMate(fica: (casa: Square, peca: Peca) => boolean): boolean;
};

/** Joga a linha em UCI a partir da FEN. `null` se algum lance for ilegal. */
export function jogarLinha(fen: string, lances: readonly string[]): { jogo: Chess; feitos: Lance[] } | null {
  const jogo = new Chess(fen);
  const feitos: Lance[] = [];
  for (const uci of lances) {
    try {
      const m = jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      feitos.push({
        de: m.from,
        para: m.to,
        peca: m.piece,
        cor: m.color,
        captura: m.captured,
        promocao: m.promotion,
        san: m.san,
      });
    } catch {
      return null;
    }
  }
  return { jogo, feitos };
}

export function lerPeca(jogo: Chess, c: Square): Peca | null {
  const p = jogo.get(c);
  return p ? { tipo: p.type, cor: p.color } : null;
}

/** O mate no fim da linha, ou `null` se a linha não termina em mate. */
export function mateFinal(fen: string, lances: readonly string[]): Mate | null {
  const jogada = jogarLinha(fen, lances);
  if (!jogada || !jogada.jogo.isCheckmate() || jogada.feitos.length === 0) return null;
  const { jogo, feitos } = jogada;

  const perdedor = jogo.turn();
  const vencedor: Color = perdedor === "w" ? "b" : "w";
  const rei = jogo.findPiece({ type: "k", color: perdedor })[0];
  const xeque = jogo.attackers(rei, vencedor);

  const semRei = new Chess(jogo.fen(), { skipValidation: true });
  semRei.remove(rei);
  const cache = new Map<Square, Square[]>();
  const atacantes = (c: Square): Square[] => {
    let lista = cache.get(c);
    if (!lista) {
      lista = semRei.attackers(c, vencedor);
      cache.set(c, lista);
    }
    return lista;
  };

  const [col, fil] = coord(rei);
  const vizinhas: Vizinha[] = [];
  for (let dc = -1; dc <= 1; dc++) {
    for (let df = -1; df <= 1; df++) {
      const c = (dc || df) && casa(col + dc, fil + df);
      if (c) vizinhas.push({ casa: c, ocupante: lerPeca(jogo, c), atacantes: atacantes(c) });
    }
  }

  const continuaMate = (fica: (casa: Square, peca: Peca) => boolean): boolean => {
    const so = new Chess(jogo.fen(), { skipValidation: true });
    for (const linha of so.board()) {
      for (const p of linha) {
        if (!p || p.color !== vencedor || p.type === "k") continue;
        if (!fica(p.square, { tipo: p.type, cor: p.color })) so.remove(p.square);
      }
    }
    return so.isCheckmate();
  };

  return {
    fen: jogo.fen(),
    vencedor,
    perdedor,
    rei,
    xeque,
    ultimo: feitos[feitos.length - 1],
    vizinhas,
    peca: (c) => lerPeca(jogo, c),
    atacantes,
    continuaMate,
  };
}
