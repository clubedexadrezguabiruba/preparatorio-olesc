import { Chess } from "chess.js";
import type { Color, Square } from "chess.js";

/**
 * A técnica do mate de peça maior, escrita como predicado.
 *
 * **O que este módulo é e o que ele não é.** Ele responde a perguntas de
 * *geometria*: quem corta o quê, que caixa sobrou para o rei inimigo, que
 * papel um lance cumpre na técnica. Ele **não** avalia lance — não diz se um
 * lance ganha, empata ou perde. Essa resposta continua vindo só da tablebase,
 * na autoria (§3 do plano da F1).
 *
 * Duas coisas o usam:
 *
 * - `lib/chess/annotations.ts`, em runtime, para pintar a linha de corte nas
 *   etapas 2 e 3 — é fato de regra, da mesma classe do `legalDests`;
 * - o gerador de ramos equivalentes do gate, na autoria, que roda offline e
 *   grava o resultado no arquivo da aula.
 *
 * `cuts` vale para qualquer posição. `boxArea`, `classify` e `isEquivalent`
 * só valem no escopo v0 — **dois reis e uma única peça maior** (KRK/KQK) — e
 * recusam o resto com `GERADOR_FORA_DE_ESCOPO` em vez de devolver lixo.
 *
 * **Limite conhecido do v0:** enquanto o rei inimigo está *em cima* da linha da
 * peça maior — isto é, no lance de xeque que vai empurrá-lo — não há corte, e
 * a caixa medida é a do tabuleiro inteiro. O xeque some do desenho por um
 * meio-lance e volta quando o rei recua. Modelar "a caixa depois do xeque
 * forçado" exigiria olhar as respostas do defensor, e isso é avaliação de
 * lance, não geometria. Fica para uma versão futura.
 */

/** Coluna (a=0 … h=7) ou fileira (1=0 … 8=7) de uma casa. */
function fileIndex(square: string): number {
  return square.charCodeAt(0) - "a".charCodeAt(0);
}
function rankIndex(square: string): number {
  return square.charCodeAt(1) - "1".charCodeAt(0);
}

/**
 * "Perto" para um rei é uma medida em dois níveis, e o segundo importa.
 *
 * De e2 até b8 são 6 lances; de d2 até b8 também são 6 — mas d2 está mais
 * perto de qualquer jeito, porque fechou uma coluna. Sem o segundo nível, a
 * caminhada diagonal do rei em direção ao canto seria classificada como "nem
 * aproximação", e o texto do ramo gerado mentiria para o aluno.
 */
function closeness(from: string, to: string): [number, number] {
  const files = Math.abs(fileIndex(from) - fileIndex(to));
  const ranks = Math.abs(rankIndex(from) - rankIndex(to));
  return [Math.max(files, ranks), files + ranks];
}

/** O primeiro rei ficou mais perto do segundo do que estava? */
function approaches(from: string, to: string, target: string): boolean {
  const [wasSteps, wasSum] = closeness(from, target);
  const [nowSteps, nowSum] = closeness(to, target);
  return nowSteps < wasSteps || (nowSteps === wasSteps && nowSum < wasSum);
}

export type Axis = "file" | "rank";

/** Um corte: a linha de uma peça maior que o rei inimigo não pode atravessar. */
export type Cut = {
  /** Casa da peça que segura a linha. */
  piece: string;
  /** Cor de quem corta. */
  color: Color;
  axis: Axis;
  /** Índice 0–7 da linha cortada (coluna a=0…h=7, fileira 1=0…8=7). */
  line: number;
  /** Onde ficou o rei inimigo: -1 abaixo/à esquerda, +1 acima/à direita. */
  side: -1 | 1;
};

const AXES: Axis[] = ["file", "rank"];
const COLORS: Color[] = ["w", "b"];

function coordinate(axis: Axis, square: string): number {
  return axis === "file" ? fileIndex(square) : rankIndex(square);
}

/**
 * Todos os cortes do tabuleiro.
 *
 * Uma peça maior corta quando o rei inimigo está **estritamente** de um lado
 * da linha dela e o rei dela **não está do mesmo lado**. A segunda metade da
 * regra é o que separa corte de coincidência: com a torre em h1 e o rei branco
 * em e2, a 1ª fileira não corta nada — o próprio rei branco está do lado de
 * cima, junto com o preto, e a "caixa" seria o tabuleiro inteiro.
 */
export function cuts(fen: string): Cut[] {
  const game = new Chess(fen);
  const kings: Partial<Record<Color, Square>> = {
    w: game.findPiece({ type: "k", color: "w" })[0],
    b: game.findPiece({ type: "k", color: "b" })[0],
  };

  const found: Cut[] = [];
  for (const color of COLORS) {
    const own = kings[color];
    const enemy = kings[color === "w" ? "b" : "w"];
    if (!own || !enemy) continue;

    for (const type of ["r", "q"] as const) {
      for (const square of game.findPiece({ type, color })) {
        for (const axis of AXES) {
          const line = coordinate(axis, square);
          const enemySide = Math.sign(coordinate(axis, enemy) - line);
          if (enemySide === 0) continue; // o rei inimigo está na própria linha
          if (Math.sign(coordinate(axis, own) - line) === enemySide) continue;
          found.push({ piece: square, color, axis, line, side: enemySide as -1 | 1 });
        }
      }
    }
  }
  return found;
}

/** Todas as casas da linha de um corte, menos a casa da própria peça. */
export function cutSquares(cut: Cut): string[] {
  const squares: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const file = cut.axis === "file" ? cut.line : i;
    const rank = cut.axis === "file" ? i : cut.line;
    const square = `${String.fromCharCode(97 + file)}${rank + 1}`;
    if (square !== cut.piece) squares.push(square);
  }
  return squares;
}

/* ------------------------------------------------------------------ *
 * Escopo v0 — KRK / KQK
 * ------------------------------------------------------------------ */

export const OUT_OF_SCOPE = "GERADOR_FORA_DE_ESCOPO";

/**
 * A posição está fora do que o predicado v0 sabe modelar. Erro nomeado, não
 * palpite: o gate falha alto em vez de gerar ramo errado (§D.7 do plano).
 */
export class OutOfScopeError extends Error {
  readonly code = OUT_OF_SCOPE;

  constructor(message: string) {
    super(message);
    this.name = "OutOfScopeError";
  }
}

export type TechniqueScope = {
  /** Quem tem a peça maior. */
  attacker: Color;
  defender: Color;
  /** Casa da peça maior. */
  major: Square;
  /** Casa do rei que está sendo encurralado. */
  defenderKing: Square;
};

/** Confere o escopo v0 e devolve quem é quem. Fora dele, erro nomeado. */
export function techniqueScope(fen: string): TechniqueScope {
  const game = new Chess(fen);
  const board = game.board().flat().filter((cell) => cell !== null);
  if (board.length !== 3) {
    throw new OutOfScopeError(
      `o predicado v0 só modela dois reis e uma peça maior; esta posição tem ${board.length} peças: ${fen}`,
    );
  }

  const major = board.find((cell) => cell.type === "r" || cell.type === "q");
  const kings = board.filter((cell) => cell.type === "k");
  if (!major || kings.length !== 2) {
    throw new OutOfScopeError(`a posição não é KRK nem KQK: ${fen}`);
  }

  const attacker = major.color;
  const defender: Color = attacker === "w" ? "b" : "w";
  const defenderKing = kings.find((king) => king.color === defender);
  if (!defenderKing) throw new OutOfScopeError(`falta o rei do lado defensor: ${fen}`);

  return {
    attacker,
    defender,
    major: major.square,
    defenderKing: defenderKing.square,
  };
}

/**
 * Quantas casas sobraram para o rei inimigo: colunas disponíveis × fileiras
 * disponíveis. Corte nos dois eixos compõe — é o retângulo que a técnica
 * encolhe até não sobrar nada.
 *
 * Tabuleiro inteiro = 64. Depois de `h1b1` na posição da etapa 4 (rei preto em
 * a8), a coluna b corta e sobram 8: a coluna a inteira.
 */
export function boxArea(fen: string): number {
  const { attacker } = techniqueScope(fen);

  let fileLo = 0;
  let fileHi = 7;
  let rankLo = 0;
  let rankHi = 7;

  for (const cut of cuts(fen)) {
    if (cut.color !== attacker) continue;
    if (cut.axis === "file") {
      if (cut.side < 0) fileHi = Math.min(fileHi, cut.line - 1);
      else fileLo = Math.max(fileLo, cut.line + 1);
    } else if (cut.side < 0) {
      rankHi = Math.min(rankHi, cut.line - 1);
    } else {
      rankLo = Math.max(rankLo, cut.line + 1);
    }
  }

  return Math.max(0, fileHi - fileLo + 1) * Math.max(0, rankHi - rankLo + 1);
}

/* ------------------------------------------------------------------ *
 * A caixa desenhada — geometria pura, e por que ela não é `boxArea`
 * ------------------------------------------------------------------ */

/** Limites do retângulo, em índices 0–7 inclusivos nos dois eixos. */
export type BoxBounds = {
  fileLo: number;
  fileHi: number;
  rankLo: number;
  rankHi: number;
};

/**
 * Onde o rei inimigo ainda pode andar — a caixa que a etapa 2 **desenha**.
 *
 * **Por que isto não é `boxArea`, e a diferença importa.** `cuts` só conta um
 * corte quando a linha da peça maior fica *entre* os dois reis (a condição
 * está lá em cima, e o teste da técnica a documenta). Isso modela uma das duas
 * geometrias do mate — cortar a fileira à frente do próprio rei e depois
 * atravessá-la — e **não** modela a outra, que é a da caixa: ali o rei
 * atacante entra na caixa junto com o defensor, para empurrá-lo de ombro.
 *
 * Medido na linha de ensino da `N0-R-MATE` em 2026-08-19: no lance em que a
 * aula diz "corte feito, o rei preto está preso nas colunas a, b e c" (`Rd1`,
 * com os dois reis a oeste da coluna d), `boxArea` devolve 64 — tabuleiro
 * inteiro — e `classify` chama o lance de `other`.
 *
 * Para **desenhar**, a pergunta é outra e é puramente geométrica: de que casas
 * o rei defensor não consegue sair? A linha da peça maior o barra
 * independentemente de onde esteja o rei atacante, que é peça amiga e não
 * abre passagem. É isso que esta função responde.
 *
 * A régua da técnica (`cuts`, `classify`, `isEquivalent`) fica **como está**:
 * mexer nela reclassifica lance e regera ramo do conteúdo, e é decisão de
 * bloco próprio, não efeito colateral de desenhar uma caixa.
 */
/**
 * A linha barra o rei defensor **dentro da faixa em que ele anda**?
 *
 * Só é barreira se nenhuma casa da linha, no trecho que interessa, for pisável:
 * cada uma tem de estar atacada pelo lado atacante ou ocupada por peça dele.
 *
 * O "trecho que interessa" é a própria caixa, e por isso `boxBounds` itera: a
 * caixa que sai de uma passagem estreita o trecho conferido na seguinte, até
 * parar de mudar. Sem isso a conferência erra dos dois lados — larga demais
 * (a coluna b conta como barreira mesmo com o rei branco tapando-a) ou
 * estreita demais (a coluna b é descartada por causa de b1 e b2, casas onde o
 * rei defensor nunca poderia chegar).
 */
function lineSeals(
  game: Chess,
  attacker: Color,
  axis: Axis,
  line: number,
  from: number,
  to: number,
): boolean {
  for (let i = from; i <= to; i += 1) {
    const file = axis === "file" ? line : i;
    const rank = axis === "file" ? i : line;
    const square = `${"abcdefgh"[file]}${rank + 1}` as Square;
    if (game.get(square)?.color === attacker) continue; // a própria torre, ou o rei
    if (!game.isAttacked(square, attacker)) return false;
  }
  return true;
}

export function boxBounds(fen: string): BoxBounds {
  const { attacker, defenderKing } = techniqueScope(fen);
  const game = new Chess(fen);

  const barreiras: Array<{ axis: Axis; line: number; side: number }> = [];
  for (const type of ["r", "q"] as const) {
    for (const square of game.findPiece({ type, color: attacker })) {
      for (const axis of AXES) {
        const line = coordinate(axis, square);
        const side = Math.sign(coordinate(axis, defenderKing) - line);
        if (side === 0) continue; // o rei está em cima da linha: não há barreira
        barreiras.push({ axis, line, side });
      }
    }
  }

  let bounds: BoxBounds = { fileLo: 0, fileHi: 7, rankLo: 0, rankHi: 7 };
  for (let passagem = 0; passagem < 4; passagem += 1) {
    const proxima: BoxBounds = { fileLo: 0, fileHi: 7, rankLo: 0, rankHi: 7 };
    for (const { axis, line, side } of barreiras) {
      const de = axis === "file" ? bounds.rankLo : bounds.fileLo;
      const ate = axis === "file" ? bounds.rankHi : bounds.fileHi;
      if (!lineSeals(game, attacker, axis, line, de, ate)) continue;
      if (axis === "file") {
        if (side < 0) proxima.fileHi = Math.min(proxima.fileHi, line - 1);
        else proxima.fileLo = Math.max(proxima.fileLo, line + 1);
      } else if (side < 0) {
        proxima.rankHi = Math.min(proxima.rankHi, line - 1);
      } else {
        proxima.rankLo = Math.max(proxima.rankLo, line + 1);
      }
    }
    const igual =
      proxima.fileLo === bounds.fileLo &&
      proxima.fileHi === bounds.fileHi &&
      proxima.rankLo === bounds.rankLo &&
      proxima.rankHi === bounds.rankHi;
    bounds = proxima;
    if (igual) break;
  }

  return bounds;
}

/** Quantas casas a caixa desenhada tem. 64 = não há caixa que valha desenhar. */
export function boxSize({ fileLo, fileHi, rankLo, rankHi }: BoxBounds): number {
  return Math.max(0, fileHi - fileLo + 1) * Math.max(0, rankHi - rankLo + 1);
}


function applied(fen: string, uci: string): Chess {
  const game = new Chess(fen);
  try {
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
  } catch {
    throw new OutOfScopeError(`"${uci}" não é um lance legal em ${fen}`);
  }
  return game;
}

/** A caixa que sobra depois do lance. */
export function boxAfter(fen: string, uci: string): number {
  return boxArea(applied(fen, uci).fen());
}

/**
 * O papel do lance na técnica.
 *
 * - `mate` — dá mate;
 * - `cut` — peça maior que encolhe a caixa;
 * - `tempo` — peça maior que mantém a caixa e o corte (o lance de espera, ou o
 *   afastamento da torre para fora do alcance do rei);
 * - `approach` — rei que se aproxima do rei inimigo;
 * - `other` — o resto.
 */
export type MoveClass = "cut" | "approach" | "tempo" | "mate" | "other";

export function classify(fen: string, uci: string): MoveClass {
  const scope = techniqueScope(fen);
  const before = new Chess(fen);
  if (before.turn() !== scope.attacker) {
    throw new OutOfScopeError(`a classificação só vale com o atacante na vez: ${fen}`);
  }

  const game = applied(fen, uci);
  if (game.isCheckmate()) return "mate";

  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);

  if (from === scope.major) {
    const now = boxArea(game.fen());
    const was = boxArea(fen);
    if (now < was) return "cut";
    if (now === was && cuts(game.fen()).some((cut) => cut.color === scope.attacker)) return "tempo";
    return "other";
  }

  return approaches(from, to, scope.defenderKing) ? "approach" : "other";
}

/**
 * O candidato aplica a **mesma técnica** que o roteiro?
 *
 * Sim quando os dois são cortes e a caixa que o candidato deixa não é maior
 * que a do roteiro. A equivalência só é avaliada em nó cujo roteiro é corte —
 * sem isso, todo lance de espera da torre viraria "equivalente" a outro.
 *
 * O que **não** está aqui, de propósito: nada sobre a peça ficar pendurada. O
 * candidato só chega aqui se já estiver em `winningMoves`, e peça pendurada é
 * empate — a tablebase é o único juiz de segurança.
 */
export function isEquivalent(fen: string, scriptMoves: string[], candidate: string): boolean {
  const targets = scriptMoves
    .filter((move) => classify(fen, move) === "cut")
    .map((move) => boxAfter(fen, move));
  if (targets.length === 0) return false;

  if (classify(fen, candidate) !== "cut") return false;
  return boxAfter(fen, candidate) <= Math.min(...targets);
}
