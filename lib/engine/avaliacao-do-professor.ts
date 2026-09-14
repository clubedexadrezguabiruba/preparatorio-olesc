import { Chess } from "chess.js";
import { applyUci } from "../chess/fen.ts";
import { readOutcome } from "../chess/status.ts";
import { paraBrancas } from "../repertorio/motor.ts";

/**
 * O que a faixa do motor do professor escreve, a partir do que o motor disse (fatia 9,
 * §23.1 da especificação).
 *
 * Tudo aqui é puro: nenhuma linha toca Worker, e o `npm test` cobre as contas que um
 * número invertido ou uma numeração errada estragariam em silêncio.
 */

/** Uma avaliação como o UCI a publica: centipeões **ou** mate, nunca os dois. */
export type Avaliacao = { cp: number | null; mate: number | null };

/**
 * Do ponto de vista de quem joga para o das **brancas**.
 *
 * A troca de sinal é a de `lib/repertorio/motor.ts`, reaproveitada e não copiada: foi
 * trocar esse sinal de cabeça que quase pôs uma avaliação invertida num documento. O
 * mate troca junto — "as pretas dão mate em 3" é `−#3` para quem lê pelas brancas.
 */
export function avaliacaoParaBrancas(avaliacao: Avaliacao, vez: "w" | "b"): Avaliacao {
  const lado = vez === "w" ? "brancas" : "pretas";
  return { cp: paraBrancas(avaliacao.cp, lado), mate: paraBrancas(avaliacao.mate, lado) };
}

/** O sinal de menos tipográfico: o hífen fica curto demais ao lado de um número grande. */
const MENOS = "−";

/**
 * A avaliação **já do lado das brancas**, curta para a faixa e por extenso para o leitor
 * de tela: `+0,5` / "vantagem das brancas de 0,5 peão", `−#3` / "as pretas dão mate em 3
 * lances".
 *
 * Uma casa decimal, como o Lichess: centésimo de peão é ruído que pisca a cada
 * profundidade sem mudar nada para quem ensina. Por isso `+0,04` escreve `0,0`, sem sinal.
 */
export function formatarAvaliacao(avaliacao: Avaliacao): { curto: string; extenso: string } {
  if (avaliacao.mate !== null) {
    const lances = Math.abs(avaliacao.mate);
    const brancas = avaliacao.mate > 0;
    return {
      curto: `${brancas ? "" : MENOS}#${lances}`,
      extenso: `as ${brancas ? "brancas" : "pretas"} dão mate em ${lances} ${lances === 1 ? "lance" : "lances"}`,
    };
  }
  const peoes = Math.round(Math.abs(avaliacao.cp ?? 0) / 10) / 10;
  const numero = peoes.toFixed(1).replace(".", ",");
  if (peoes === 0) return { curto: "0,0", extenso: "posição igual" };
  const brancas = (avaliacao.cp ?? 0) > 0;
  return {
    curto: `${brancas ? "+" : MENOS}${numero}`,
    extenso: `vantagem das ${brancas ? "brancas" : "pretas"} de ${numero} ${peoes < 2 ? "peão" : "peões"}`,
  };
}

/**
 * Quanto da barra é branco, de 0 a 100.
 *
 * A curva é a de chances de vitória do Lichess, `2/(1+e^(−0,00368·cp)) − 1`: perto do zero
 * cada décimo de peão se vê, e longe dele a barra satura sem encostar no fim — quem
 * encosta é só o mate. O centipeão é preso em ±1000 antes, como lá.
 */
export function alturaDaBarra(avaliacao: Avaliacao): number {
  if (avaliacao.mate !== null) return avaliacao.mate > 0 ? 100 : 0;
  const cp = Math.max(-1000, Math.min(1000, avaliacao.cp ?? 0));
  const chances = 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
  return 50 + 50 * chances;
}

/**
 * A linha do motor em SAN, **a partir da FEN**: `3…a6 4.Ba4 Nf6`.
 *
 * O `pvEmSan` do repertório parte da posição inicial e conta os lances pelo tamanho do
 * caminho; aqui a posição pode ser o meio de uma partida, e a numeração vem do sexto
 * campo da FEN. As reticências são as do painel de lances (`12…`), para as duas colunas
 * falarem igual. O primeiro lance que não for legal corta a linha: o motor não inventa
 * lance, mas uma resposta de outra posição que escapasse do carimbo inventaria.
 */
export function pvEmSanDaFen(fen: string, pv: readonly string[], maximo: number): string {
  const campos = fen.trim().split(/\s+/);
  let numero = Number(campos[5]) || 1;
  let brancas = campos[1] !== "b";
  let atual = fen;
  const partes: string[] = [];

  for (const lance of pv.slice(0, maximo)) {
    const feito = applyUci(atual, lance);
    if (!feito) break;
    const san = feito.game.history().at(-1);
    if (!san) break;
    if (brancas) partes.push(`${numero}.${san}`);
    else {
      partes.push(partes.length === 0 ? `${numero}…${san}` : san);
      numero += 1;
    }
    brancas = !brancas;
    atual = feito.fen;
  }
  return partes.join(" ");
}

/**
 * O fim de partida pela regra do jogo, ou `null`. Numa posição dessas não há o que
 * calcular: o motor responderia `bestmove (none)` e a faixa ficaria esperando.
 */
export function estadoTerminal(fen: string): string | null {
  return resultadoTerminal(fen)?.texto ?? null;
}

/**
 * O fim de partida com a barra que ele merece: cheia do lado de quem deu mate, no meio
 * no empate. Sem isto, a barra de uma posição de mate ficava vazia — igual à do motor
 * desligado —, e o professor não sabia se o motor tinha parado ou se a partida acabou.
 */
export function resultadoTerminal(fen: string): { texto: string; barra: number } | null {
  let jogo: Chess;
  try {
    jogo = new Chess(fen);
  } catch {
    return null;
  }
  const fim = readOutcome(jogo);
  if (!fim.over) return null;
  return { texto: fim.reason, barra: fim.result === "win-white" ? 100 : fim.result === "win-black" ? 0 : 50 };
}

/** Quantas peças há no tabuleiro, reis incluídos. É o critério da nota da tablebase. */
export function contaPecas(fen: string): number {
  return (fen.split(" ")[0]?.match(/[prnbqk]/gi) ?? []).length;
}

/**
 * Quantas linhas o motor vai de fato publicar: as pedidas, ou os lances legais, o que
 * for menor. Esperar a terceira linha numa posição com um lance só seria esperar para
 * sempre por uma profundidade "completa".
 */
export function linhasEsperadas(fen: string, pedidas: number): number {
  try {
    return Math.max(1, Math.min(pedidas, new Chess(fen).moves().length));
  } catch {
    return pedidas;
  }
}
