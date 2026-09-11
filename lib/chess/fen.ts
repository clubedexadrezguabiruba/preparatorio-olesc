import { Chess, validateFen } from "chess.js";

/**
 * As operações de FEN que o gate, o gerador de ramos e o modo autor usam nos
 * dois lados.
 * Moram aqui porque duplicá-las já custou uma divergência sutil uma vez: se a
 * identidade de posição do gerador não for **exatamente** a do validador, uma
 * transposição funde num lugar e não funde no outro.
 */

/**
 * Identidade da posição: peças, vez, roque e en passant — sem os contadores.
 * É o critério de "mesma posição" que funde transposições no mesmo nó.
 */
export function samePosition(a: string, b: string): boolean {
  const key = (fen: string) => fen.trim().split(/\s+/).slice(0, 4).join(" ");
  return key(a) === key(b);
}

export type Applied = { fen: string; game: Chess };

/** Aplica um lance em UCI. `null` quando o lance não é legal ali. */
export function applyUci(fen: string, uci: string): Applied | null {
  const game = new Chess(fen);
  try {
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
  } catch {
    return null;
  }
  return { fen: game.fen(), game };
}

/* ------------------------------------------------------------------ *
 * A posição é possível?
 * ------------------------------------------------------------------ */

function squareDistance(a: string, b: string): number {
  return Math.max(
    Math.abs(a.charCodeAt(0) - b.charCodeAt(0)),
    Math.abs(a.charCodeAt(1) - b.charCodeAt(1)),
  );
}

/**
 * O problema da FEN em português, ou `null` se ela é jogável.
 *
 * **Mora aqui, e não no gate, porque tem de haver um juiz só.** O montador de
 * posição do modo autor (B8.4) precisa recusar reis colados *antes* de salvar,
 * e o gate precisa recusar a mesma coisa na hora de aplicar. Duas cópias desta
 * função seriam duas opiniões sobre o que é uma posição possível — e a
 * divergência apareceria no pior momento: com a posição já montada e salva.
 *
 * Os dois erros abaixo do `validateFen` são exatamente os que uma posição
 * montada à mão comete o tempo todo: reis adjacentes, e o lado que não está na
 * vez em xeque (o que significaria que o lance anterior deixou o próprio rei
 * atacado — ilegal).
 */
/**
 * As mensagens da chess.js que o montador faz aparecer o tempo todo, em
 * português. O resto passa como veio: traduzir tudo seria manter um dicionário
 * inteiro do pacote, e o que interessa é o punhado que uma posição em
 * construção produz a cada peça posta.
 */
const EM_PORTUGUES: Array<[RegExp, string]> = [
  [/missing white king/i, "falta o rei branco"],
  [/missing black king/i, "falta o rei preto"],
  [/too many white kings/i, "há mais de um rei branco"],
  [/too many black kings/i, "há mais de um rei preto"],
  // `six` por extenso, e não só o algarismo: é assim que a chess.js escreve
  // ("must contain six space-delimited fields"). Com o padrão só de algarismo a
  // mensagem passava crua, em inglês — e é a mais frequente do editor, porque é
  // a que aparece quando se cola no campo qualquer coisa que não seja uma FEN.
  [/must contain (6|six) space[- ]delimited fields/i, "a FEN precisa dos 6 campos"],
  [/piece data does not contain 8 '\/'-delimited rows/i, "a FEN não tem as 8 fileiras"],
  [/invalid piece/i, "há um caractere que não é peça"],
  [/consecutive numbers/i, "há dois números seguidos numa fileira"],
  [/side-to-move is invalid/i, "o campo de quem joga não é `w` nem `b`"],
  [/castling availability is invalid/i, "o campo de roque é inválido"],
  [/en-passant square is invalid/i, "a casa de en passant é inválida"],
  [/half moves must be/i, "o contador de meios-lances é inválido"],
  [/move number must be/i, "o número do lance é inválido"],
  // A que o montador produz assim que alguém arrasta um peão até o fim: a
  // chess.js recusa, mas em inglês, e a frase precisa dizer a fileira.
  [/pawns are on the edge rows/i, "há peão na primeira ou na oitava fileira"],
];

function emPortugues(mensagem: string): string {
  for (const [padrao, traducao] of EM_PORTUGUES) {
    if (padrao.test(mensagem)) return traducao;
  }
  return mensagem;
}

export function fenProblem(fen: string): string | null {
  const basic = validateFen(fen);
  if (!basic.ok) return emPortugues(basic.error ?? "FEN recusada pela chess.js");

  let game: Chess;
  try {
    game = new Chess(fen);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  const whiteKing = game.findPiece({ type: "k", color: "w" })[0];
  const blackKing = game.findPiece({ type: "k", color: "b" })[0];
  if (!whiteKing || !blackKing) return "falta um dos reis";
  if (squareDistance(whiteKing, blackKing) <= 1) {
    return `reis adjacentes (${whiteKing} e ${blackKing})`;
  }

  const waiting = game.turn() === "w" ? blackKing : whiteKing;
  if (game.isAttacked(waiting, game.turn())) {
    return "o lado que não está na vez está em xeque";
  }
  return null;
}

/** Quantas peças a FEN tem. A tablebase Syzygy vai até 7. */
export function pieceCount(fen: string): number {
  return (fen.split(" ")[0].match(/[pnbrqkPNBRQK]/g) ?? []).length;
}

/* ------------------------------------------------------------------ *
 * A posição montada campo a campo
 * ------------------------------------------------------------------ */

/**
 * A peça de uma casa na parte de peças da FEN, ou `null` se a casa está vazia.
 *
 * Exportada porque o montador do editor precisa da mesma leitura para desmarcar
 * sozinho um roque que ficou sem torre. Duas leituras da mesma string seriam duas
 * chances de discordar sobre o que está em h1.
 */
export function pecaNaCasa(pecas: string, casa: string): string | null {
  const fileiras = pecas.split("/");
  const linha = fileiras[8 - Number(casa[1])];
  if (linha === undefined) return null;
  const coluna = casa.charCodeAt(0) - "a".charCodeAt(0);
  let x = 0;
  for (const caractere of linha) {
    const vazias = Number(caractere);
    if (Number.isNaN(vazias)) {
      if (x === coluna) return caractere;
      x += 1;
    } else {
      if (coluna < x + vazias) return null;
      x += vazias;
    }
  }
  return null;
}

/**
 * O que `fenProblem` não cobre e uma posição **montada** comete o tempo todo.
 *
 * ## Por que não está dentro de `fenProblem`
 *
 * Porque `fenProblem` responde "dá para jogar nesta posição?", e é ele que o gate
 * usa sobre as posições publicadas. Estas duas regras respondem outra pergunta —
 * "os seis campos combinam entre si?" — e endurecê-las dentro do juiz do gate
 * mudaria o veredicto sobre conteúdo já aprovado sem que ninguém tivesse pedido.
 * Aqui elas se somam ao juiz, não o substituem: o montador chama os dois.
 *
 * ## O que a chess.js deixa passar, medido em 11/09/2026
 *
 * `validateFen("4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1")` devolve `{ok:true}` — quatro
 * direitos de roque sem uma torre no tabuleiro. E
 * `validateFen("4k3/8/8/8/8/8/8/4K3 w - e6 0 1")` também — casa de en passant sem
 * peão nenhum que pudesse ter passado por ela. As duas são exatamente o que sai de
 * um montador em que o professor esqueceu de mexer nas opções avançadas.
 *
 * ## O que isto **não** afirma
 *
 * Não afirma que a posição é historicamente alcançável (§11 do plano final). Só diz
 * que os campos declarados contradizem as peças que estão no tabuleiro — e essa
 * contradição o projeto consegue provar.
 */
export function problemaDosCamposDaFen(fen: string): string | null {
  const [pecas, vez, roque, enPassant] = fen.trim().split(/\s+/);
  if (!pecas || !vez) return null;

  if (roque && roque !== "-") {
    const exigencias: Array<[string, string, string, string]> = [
      ["K", "e1", "h1", "o roque curto das brancas"],
      ["Q", "e1", "a1", "o roque longo das brancas"],
      ["k", "e8", "h8", "o roque curto das pretas"],
      ["q", "e8", "a8", "o roque longo das pretas"],
    ];
    for (const [letra, casaDoRei, casaDaTorre, nome] of exigencias) {
      if (!roque.includes(letra)) continue;
      const rei = letra === letra.toUpperCase() ? "K" : "k";
      const torre = letra === letra.toUpperCase() ? "R" : "r";
      if (pecaNaCasa(pecas, casaDoRei) !== rei || pecaNaCasa(pecas, casaDaTorre) !== torre) {
        return `${nome} está marcado, mas não há rei em ${casaDoRei} e torre em ${casaDaTorre}`;
      }
    }
  }

  if (enPassant && enPassant !== "-") {
    const coluna = enPassant[0];
    const fileira = enPassant[1];
    const esperada = vez === "w" ? "6" : "3";
    if (fileira !== esperada) {
      return `com ${vez === "w" ? "as brancas" : "as pretas"} na vez, a casa de en passant fica na ${esperada}ª fileira`;
    }
    const peao = vez === "w" ? "p" : "P";
    const casaDoPeao = `${coluna}${vez === "w" ? "5" : "4"}`;
    const casaDeOrigem = `${coluna}${vez === "w" ? "7" : "2"}`;
    if (pecaNaCasa(pecas, casaDoPeao) !== peao) {
      return `a casa de en passant é ${enPassant}, mas não há peão ${vez === "w" ? "preto" : "branco"} em ${casaDoPeao}`;
    }
    if (pecaNaCasa(pecas, enPassant) !== null || pecaNaCasa(pecas, casaDeOrigem) !== null) {
      return `a casa de en passant é ${enPassant}, mas ${enPassant} e ${casaDeOrigem} precisam estar vazias`;
    }
  }

  return null;
}

/**
 * O veredicto completo sobre uma posição composta pelo professor — no montador ou
 * numa FEN colada. É `fenProblem` mais as regras de campo acima, nesta ordem: sem
 * os seis campos válidos não há o que conferir entre eles.
 */
export function problemaDaPosicaoMontada(fen: string): string | null {
  return fenProblem(fen) ?? problemaDosCamposDaFen(fen);
}
