import { Chess, type Move, type Square } from "chess.js";

/**
 * A notação descritiva dos livros de 1921 e 1930, convertida em lance legal.
 *
 * ## Por que este arquivo existe, e o que ele substitui
 *
 * As posições de livro do Bloco 3 precisam sair dos diagramas que o autor
 * escolheu — é o argumento inteiro da §3.2 do plano: um diagrama impresso tem o
 * traço **encenado**, e encenado é o certo enquanto o aluno ainda tem apoio.
 *
 * O caminho óbvio para trazer um diagrama é ler a imagem da página e transcrever
 * casa por casa. A sessão anterior fez isso trinta vezes, com dupla leitura
 * independente a 600 dpi, e o método funciona — mas ele é o único passo da
 * cadeia em que **nada confere o resultado**: um peão lido em b6 em vez de b7
 * produz uma FEN legal, plausível e errada.
 *
 * Só que os dois livros imprimem os diagramas **dentro de partidas anotadas**,
 * logo depois de um lance. Repetir os lances impressos desde a posição inicial
 * chega exatamente na mesma posição — e aí cada lance é conferido pela
 * `chess.js`. Um erro de leitura vira lance ilegal e estoura; não vira posição
 * errada. É a diferença entre transcrever e **reconstruir**.
 *
 * ## O que a notação descritiva tem de diferente, e onde ela morde
 *
 * 1. **As fileiras são contadas do lado de quem joga.** `Q4` é d4 para as
 *    brancas e d5 para as pretas. As **colunas**, ao contrário, são as mesmas
 *    para os dois: a coluna da dama é a d para ambos.
 * 2. **A coluna costuma vir sem a ala.** `B3` pode ser c3 ou f3, e quem decide é
 *    a legalidade: se só um dos dois é lance legal, era esse.
 * 3. **A captura nomeia a peça, não a casa.** `BxKt` é "o bispo toma o cavalo".
 * 4. **O peão é nomeado pela coluna onde mora.** `PxQP` é "o peão toma o peão da
 *    dama", e `RPxB` é "o peão da torre toma o bispo".
 * 5. **A ala qualifica a peça.** `QKt-Q2` é "o cavalo da dama para d2".
 *
 * Daí o desenho: **não se interpreta o lance, filtram-se os legais.** A
 * `chess.js` gera todos os lances legais da posição, e o texto descritivo é
 * usado como peneira.
 *
 * ## O que fazer quando sobra mais de um — e por que não é chute
 *
 * O OCR perde letras, e `B-KKt5` chega aqui como `B-Kt5`, que casa com `Bg5` e
 * com `Bb5+`. Escolher o mais provável seria inventar uma partida que ninguém
 * jogou, e ela sairia plausível — que é o pior resultado possível.
 *
 * A saída é a partida inteira: **tenta-se cada candidato e segue-se lendo.** O
 * ramo errado morre em poucos lances, porque a continuação impressa deixa de ser
 * legal nele. Se os dois ramos lerem a partida inteira, aí a ambiguidade é real
 * e `lerPartida` a **declara** em vez de escolher.
 */

/** As colunas, do jeito que o livro as chama. Iguais para os dois lados. */
const COLUNAS: Record<string, string[]> = {
  QR: ["a"],
  QKT: ["b"],
  QB: ["c"],
  Q: ["d"],
  K: ["e"],
  KB: ["f"],
  KKT: ["g"],
  KR: ["h"],
  // Sem a ala, a coluna é uma das duas — e a legalidade escolhe.
  R: ["a", "h"],
  KT: ["b", "g"],
  B: ["c", "f"],
};

const PECAS: Record<string, string> = { P: "p", KT: "n", N: "n", B: "b", R: "r", Q: "q", K: "k" };

/** Os tokens que fecham a partida e não são lance. */
const FIM = /^(RESIGNS|DRAWN|DRAW|RESIGN|ANDWINS|WHITEWINS|BLACKWINS|ANDBLACKWINS|ANDWHITEWINS)$/;

/** Tira espaços, anotações e normaliza o sinal de captura. */
export function normalizar(token: string): string {
  let t = token.replace(/\s+/g, "").replace(/!/g, "");
  // O `?` de um OCR é `×` quando tem letra ou dígito dos dois lados; solto, é
  // anotação de lance duvidoso e sai.
  t = t.replace(/(?<=[A-Za-z0-9)])\?(?=[A-Za-z0-9(])/g, "x");
  t = t.replace(/\?/g, "").replace(/×/g, "x");
  t = t.replace(/(dis\.ch|dbl\.ch|ch|mate|e\.p\.|\.)+$/gi, "");
  return t.toUpperCase();
}

/** As casas algébricas que um nome descritivo pode significar, para um lado. */
function casasDe(nome: string, brancas: boolean): Square[] {
  const m = nome.match(/^([A-Z]+)([1-8])$/);
  if (!m) return [];
  const colunas = COLUNAS[m[1]];
  if (!colunas) return [];
  const fileira = brancas ? Number(m[2]) : 9 - Number(m[2]);
  return colunas.map((c) => `${c}${fileira}` as Square);
}

/** O que um nome como `KBP`, `QKt` ou `R` diz: que peça, e em que colunas. */
type Nome = { peca: string; colunas: string[] | null };

function lerNome(nome: string): Nome | null {
  if (PECAS[nome]) return { peca: PECAS[nome], colunas: null };

  // `KBP`, `QP`, `RP`: peão, nomeado pela coluna onde mora.
  const peao = nome.match(/^([A-Z]+)P$/);
  if (peao && COLUNAS[peao[1]]) return { peca: "p", colunas: COLUNAS[peao[1]] };

  // `QKt`, `KB`, `QR`: a peça, qualificada pela ala em que está.
  const comAla = nome.match(/^([QK])(KT|B|R)$/);
  if (comAla && PECAS[comAla[2]]) {
    const daDama = ["a", "b", "c", "d"];
    return {
      peca: PECAS[comAla[2]],
      colunas: comAla[1] === "Q" ? daDama : ["e", "f", "g", "h"],
    };
  }
  return null;
}

/**
 * **Todos** os lances legais que casam com o texto descritivo.
 *
 * Devolver a lista, e não um lance, é o que permite a `lerPartida` resolver a
 * ambiguidade pela continuação em vez de pelo palpite.
 */
export function lancesDescritivos(jogo: Chess, token: string): { sans: string[] } | { erro: string } {
  const t = normalizar(token);
  if (t === "" || FIM.test(t)) return { sans: [] };

  const legais = jogo.moves({ verbose: true }) as Move[];
  const brancas = jogo.turn() === "w";

  if (/^(O-O-O|0-0-0|CASTLESQR|CASTLESQ)$/.test(t)) {
    return { sans: legais.filter((l) => l.san.startsWith("O-O-O")).map((l) => l.san) };
  }
  if (/^(O-O|0-0|CASTLES|CASTLESKR|CASTLESK)$/.test(t)) {
    return {
      sans: legais.filter((l) => l.san.startsWith("O-O") && !l.san.startsWith("O-O-O")).map((l) => l.san),
    };
  }

  // `R(Kt1)-B1` — a desambiguação que o próprio livro escreve.
  let dica: string | null = null;
  let semDica = t;
  // O parêntese só desambigua a **origem** quando vem antes da ligação:
  // `R(Kt1)-B1` é "a torre de Kt1"; `KtxP(B3)` é "o peão de B3", e esse é
  // destino, tratado adiante. Sem esta distinção o filtro de origem procura a
  // peça na casa do alvo e não acha nada.
  const comParenteses = t.match(/^([A-Z]+)\(([A-Z0-9]+)\)((?:X|-).*)$/);
  if (comParenteses) {
    dica = comParenteses[2];
    semDica = `${comParenteses[1]}${comParenteses[3]}`;
  }

  // `KtxP(B3)` — o parêntese aqui não desambigua a origem, e sim **a casa do
  // alvo**: "o cavalo toma o peão de B3". Ele entra como destino.
  let casaDoAlvo: string | null = null;
  const alvoEntreParenteses = semDica.match(/^(.*?)\(([A-Z]+[1-8])\)$/);
  if (alvoEntreParenteses) {
    semDica = alvoEntreParenteses[1];
    casaDoAlvo = alvoEntreParenteses[2];
  }

  // O OCR come o traço de vez em quando ("P K 4" por "P-K 4"). Sem ligação
  // nenhuma o lance é de deslocamento, que é o caso comum.
  const partes = semDica.match(/^([A-Z]+)(X|-)(.+)$/) ?? semDica.match(/^(P|KT|B|R|Q|K)()([A-Z]*[1-8])$/);
  if (!partes) return { erro: `não consigo separar "${t}" em peça, traço e destino` };
  const [, nomeDaPeca, ligacaoLida, destino] = partes;
  const ligacao = ligacaoLida === "" ? "-" : ligacaoLida;

  const quem = lerNome(nomeDaPeca);
  if (!quem) return { erro: `peça desconhecida em "${t}"` };

  let candidatos = legais.filter((l) => l.piece === quem.peca);
  if (quem.colunas !== null) {
    // A ala é **conselho**, não regra: "a torre do rei" continua sendo chamada
    // assim depois de atravessar o tabuleiro, e nesse caso o filtro zeraria a
    // lista. Zerou, o conselho estava velho e a continuação decide.
    const colunas = quem.colunas;
    const filtrados = candidatos.filter((l) => colunas.includes(l.from[0]));
    if (filtrados.length > 0) candidatos = filtrados;
  }
  candidatos =
    ligacao === "X"
      ? candidatos.filter((l) => l.captured !== undefined)
      : candidatos.filter((l) => l.captured === undefined);

  // O destino é uma casa (`Q4`, `KB3`) ou a peça capturada (`BxKt`, `PxQP`).
  if (casaDoAlvo !== null) {
    const casas = casasDe(casaDoAlvo, brancas);
    if (casas.length > 0) candidatos = candidatos.filter((l) => casas.includes(l.to));
  }
  const casas = casasDe(destino, brancas);
  if (casas.length > 0) {
    candidatos = candidatos.filter((l) => casas.includes(l.to));
  } else {
    const semFileira = destino.replace(/[1-8]$/, "");
    const alvo = lerNome(semFileira);
    if (!alvo) return { erro: `destino desconhecido em "${t}"` };
    candidatos = candidatos.filter((l) => l.captured === alvo.peca);
    if (alvo.colunas !== null) {
      const colunas = alvo.colunas;
      candidatos = candidatos.filter((l) => colunas.includes(l.to[0]));
    }
    // `KtxKt5`: o dígito no fim é a fileira da casa de destino.
    const fileira = destino.match(/([1-8])$/);
    if (fileira) {
      const linha = brancas ? Number(fileira[1]) : 9 - Number(fileira[1]);
      candidatos = candidatos.filter((l) => Number(l.to[1]) === linha);
    }
  }

  if (dica !== null) {
    const casasDaDica = casasDe(dica, brancas);
    const colunaDaDica = COLUNAS[dica];
    candidatos = candidatos.filter((l) =>
      casasDaDica.length > 0
        ? casasDaDica.includes(l.from)
        : (colunaDaDica ?? []).includes(l.from[0]),
    );
  }

  return { sans: [...new Set(candidatos.map((l) => l.san))] };
}

export type PartidaLida = {
  /** Os SAN na ordem. */
  readonly sans: string[];
  /** A FEN depois de cada lance — `fens[i]` é a posição depois de `sans[i]`. */
  readonly fens: string[];
  /** O primeiro token que não fechou, e por quê. `null` quando a partida inteira leu. */
  readonly parou: { emQue: number; token: string; erro: string } | null;
  /** Quantas leituras completas e diferentes a partida admite. 1 é o normal. */
  readonly leiturasPossiveis: number;
};

/**
 * Lê a partida inteira, resolvendo as ambiguidades pela continuação.
 *
 * A busca é em profundidade e para na primeira leitura completa; `leiturasPossiveis`
 * é 2 quando existe uma segunda, e aí a partida **não** deve virar conteúdo —
 * a posição pode ser de qualquer um dos dois ramos.
 */
export function lerPartida(tokens: readonly string[], tetoDeRamos = 200000): PartidaLida {
  const jogo = new Chess();
  const sans: string[] = [];
  const completas: string[][] = [];
  // Num objeto, e não numa `let`: o TypeScript estreita uma `let` para `never`
  // quando só a atribui dentro do fecho da recursão, e a leitura lá embaixo
  // deixaria de compilar por uma razão que não é a do código.
  const parada: { pior: { emQue: number; token: string; erro: string } | null } = { pior: null };
  let ramos = 0;

  const descer = (i: number): void => {
    if (completas.length >= 2 || ramos > tetoDeRamos) return;
    if (i >= tokens.length) {
      completas.push([...sans]);
      return;
    }
    ramos += 1;

    const lido = lancesDescritivos(jogo, tokens[i]);
    if ("erro" in lido) {
      if (parada.pior === null || i > parada.pior.emQue) {
        parada.pior = { emQue: i, token: tokens[i], erro: lido.erro };
      }
      return;
    }
    if (lido.sans.length === 0) {
      const t = normalizar(tokens[i]);
      // Token que não é lance ("Resigns", uma sobra de OCR): passa adiante.
      if (t === "" || FIM.test(t)) return descer(i + 1);
      if (parada.pior === null || i > parada.pior.emQue) {
        parada.pior = { emQue: i, token: tokens[i], erro: "nenhum lance legal casa" };
      }
      return;
    }

    for (const san of lido.sans) {
      jogo.move(san);
      sans.push(san);
      descer(i + 1);
      jogo.undo();
      sans.pop();
      if (completas.length >= 2) return;
    }
  };

  descer(0);

  if (completas.length > 0) {
    const bom = new Chess();
    const fens: string[] = [];
    for (const san of completas[0]) {
      bom.move(san);
      fens.push(bom.fen());
    }
    return { sans: completas[0], fens, parou: null, leiturasPossiveis: completas.length };
  }

  // Sem leitura completa: devolve até onde a melhor tentativa chegou, para o
  // relatório dizer em que lance a partida travou.
  const ate = parada.pior?.emQue ?? 0;
  const parcial = new Chess();
  const sansParciais: string[] = [];
  const fensParciais: string[] = [];
  for (let i = 0; i < ate; i += 1) {
    const lido = lancesDescritivos(parcial, tokens[i]);
    if ("erro" in lido || lido.sans.length === 0) break;
    parcial.move(lido.sans[0]);
    sansParciais.push(lido.sans[0]);
    fensParciais.push(parcial.fen());
  }
  return { sans: sansParciais, fens: fensParciais, parou: parada.pior, leiturasPossiveis: 0 };
}
