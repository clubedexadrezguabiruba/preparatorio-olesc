import { Chess } from "chess.js";
import type { Color, Square } from "chess.js";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { cutSquares, cuts } from "./technique.ts";

/**
 * Destaques pedagógicos derivados da posição — o que o Doug pediu depois do
 * primeiro teste da aula: "eu não vejo o corte acontecer".
 *
 * **Isto não avalia lance.** São dois fatos de regra, da mesma classe do
 * `legalDests` que já roda em runtime: que casas a peça maior tranca (o corte)
 * e se a peça que acabou de mexer está atacada e sem defesa. Quem diz se um
 * lance é bom continua sendo a lista certificada do arquivo (§3 do plano).
 *
 * Só as etapas 2 e 3 recebem estes destaques. A etapa 4 fica limpa de
 * propósito: é onde o domínio é aferido, e ajuda automática ali seria cola.
 */

/** A cor do rei em xeque já vem do chessground; aqui não se mexe nisso. */
const CUT_BRUSH = "paleRed";
const HANGING_BRUSH = "red";
const DEFENDED_BRUSH = "green";

export function teachingShapes(
  fen: string,
  lastMove?: readonly [string, string] | null,
): DrawShape[] {
  const shapes: DrawShape[] = [];

  // A parede: a linha inteira que o rei inimigo não atravessa.
  for (const cut of cuts(fen)) {
    for (const square of cutSquares(cut)) {
      shapes.push({ orig: square as Key, brush: CUT_BRUSH });
    }
  }

  const safety = movedPieceSafety(fen, lastMove);
  if (safety) shapes.push(safety);

  return shapes;
}

/**
 * Os desenhos que a **autoria** escreveu no arquivo: setas e casas acesas.
 *
 * Morava em `lib/lesson/example.ts` como `authoredShapes`, lendo um passo da
 * cena. A cena saiu do formato em 2026-09-08 e o desenho ficou: hoje ele é um
 * campo do objetivo, de cada regra dele e de cada nó da árvore. Mudou o dono,
 * não a função — e por isso ele veio para cá, ao lado dos desenhos que a
 * máquina deduz, em vez de morar na etapa que o usa.
 *
 * A distinção que os dois lados deste arquivo guardam: `teachingShapes`
 * **deduz** da posição (o corte, a peça pendurada), esta **lê** o que o autor
 * escreveu. Nenhuma das duas inventa.
 */
export function desenhoDaAutoria(desenho: {
  arrows?: readonly (readonly [string, string])[];
  highlights?: readonly string[];
} | null | undefined): DrawShape[] {
  if (!desenho) return [];
  return [
    ...(desenho.arrows ?? []).map(([from, to]) => ({
      orig: from as Key,
      dest: to as Key,
      brush: "blue",
    })),
    ...(desenho.highlights ?? []).map((square) => ({ orig: square as Key, brush: "green" })),
  ];
}

/**
 * A peça que acabou de mexer está pendurada?
 *
 * É a pergunta que o aluno da N0 mais erra: a torre chega perto do rei preto e
 * ninguém avisa. Vermelho = atacada e sem defesa. Verde = atacada, mas
 * defendida — a diferença entre "perdi a torre" e "isso é a técnica".
 */
function movedPieceSafety(
  fen: string,
  lastMove?: readonly [string, string] | null,
): DrawShape | null {
  if (!lastMove) return null;
  const destination = lastMove[1] as Square;

  const game = new Chess(fen);
  const piece = game.get(destination);
  if (!piece) return null;

  const enemy: Color = piece.color === "w" ? "b" : "w";
  if (!game.isAttacked(destination, enemy)) return null;

  return {
    orig: destination as Key,
    brush: game.isAttacked(destination, piece.color) ? DEFENDED_BRUSH : HANGING_BRUSH,
  };
}

/**
 * O caminho de volta: o que o professor desenhou no tabuleiro, virando arquivo.
 *
 * É o inverso exato de `desenhoDaAutoria`, e existe para o modo editor: o
 * chessground devolve a **lista inteira** de formas depois de cada traço (não um
 * delta, não uma seta só), e o que vai para o JSON tem de ser `arrows` e
 * `highlights` do `desenhoSchema`.
 *
 * ## Duas regras do schema que esta função obedece
 *
 * 1. **Lista vazia é inválida.** `desenhoSchema` declara `.min(1).optional()`
 *    (`lib/lesson/schema.ts:490`): a ausência de desenho se escreve **omitindo
 *    o campo**, nunca com `[]`. Apagar o último traço tem de devolver `{}`, e
 *    não `{ arrows: [] }` — senão o gate recusa a aula que o professor acabou
 *    de limpar.
 * 2. **O objeto é estrito.** Nada além de `arrows` e `highlights` sai daqui.
 *
 * ## O que se perde, de propósito
 *
 * O chessground guarda um pincel por forma (`green`, `red`, `blue`, `yellow`,
 * `paleRed` e o nosso `plano`), e o Lichess troca a cor com `Shift`/`Alt`. O
 * arquivo não tem onde guardar cor: uma seta é uma seta, uma casa acesa é uma
 * casa acesa, e é `desenhoDaAutoria` quem decide como elas aparecem (azul e
 * verde). Então a cor com que o professor desenhou **não volta** — e é por isso
 * que a ida e a volta são iguais só a partir do arquivo, que é o teste que
 * importa.
 *
 * As formas que o chessground cria e não cabem em nenhum dos dois campos
 * (uma peça fantasma arrastada, um pedaço de texto) são descartadas em silêncio:
 * elas não são desenho de autoria, são estado da interação.
 */
export function autoriaDoDesenho(shapes: readonly DrawShape[]): {
  arrows?: [string, string][];
  highlights?: string[];
} {
  const arrows: [string, string][] = [];
  const highlights: string[] = [];

  for (const shape of shapes) {
    if (typeof shape.orig !== "string") continue;
    if (shape.dest) {
      arrows.push([shape.orig, shape.dest]);
    } else {
      highlights.push(shape.orig);
    }
  }

  const desenho: { arrows?: [string, string][]; highlights?: string[] } = {};
  if (arrows.length > 0) desenho.arrows = arrows;
  if (highlights.length > 0) desenho.highlights = highlights;
  return desenho;
}
