import { Chess } from "chess.js";
import { applyUci } from "../chess/fen.ts";
import type { Puzzle } from "./puzzles.ts";

/**
 * O juiz do puzzle: este lance está certo?
 *
 * **Roda nos dois lados, e é por isso que este arquivo não é `server-only`.**
 * O navegador precisa dele para dizer "certo" no mesmo instante em que a peça
 * encosta na casa — meio segundo de espera por uma ida ao servidor mataria a
 * série. O servidor precisa dele porque o navegador é do aluno.
 *
 * Uma cópia só, então, e nenhuma chance de o tabuleiro dizer "certo" e o
 * relatório contar "errado".
 *
 * ## O puzzle começa um lance antes
 *
 * No banco do Lichess a FEN é a posição em que o adversário **ainda vai
 * errar**, e `lances[0]` é o erro dele. Quem resolve joga `lances[1]`, o
 * adversário responde `lances[2]`, e assim por diante. A cor do aluno é a
 * *oposta* à que está na vez na FEN.
 *
 * ## Mate alternativo conta
 *
 * Se o lance do aluno dá mate, o puzzle acabou — mesmo que o Lichess tenha
 * gravado outro mate. É a regra do próprio Lichess, e é a única honesta: dizer
 * "errado" para um xeque-mate ensinaria o aluno a desconfiar do acerto.
 */

/** O lance do aluno resolve este ponto da linha? */
export function lanceCerto(fen: string, uci: string, esperado: string): boolean {
  if (uci === esperado) return true;
  const aplicado = applyUci(fen, uci);
  return aplicado ? aplicado.game.isCheckmate() : false;
}

/**
 * A posição em que o aluno joga o primeiro lance: a FEN do arquivo já com o
 * erro do adversário em cima.
 */
export function posicaoInicial(p: Pick<Puzzle, "fen" | "lances">): Chess {
  const jogo = new Chess(p.fen);
  const erro = p.lances[0];
  jogo.move({
    from: erro.slice(0, 2),
    to: erro.slice(2, 4),
    promotion: erro.length > 4 ? erro.slice(4) : undefined,
  });
  return jogo;
}

/**
 * A sequência que o aluno jogou é a solução?
 *
 * **É o servidor quem responde isto, e a resposta do navegador é ignorada.**
 * A server action recebe os lances jogados — não um "acertei" — e deriva o
 * acerto daqui. Sem isso, "resolvi 300 puzzles" seria uma chamada de rede a
 * escrever.
 *
 * O que esta função **não** impede: o aluno abrir o JSON público do tema e
 * copiar a solução. Os puzzles são servidos ao navegador porque é assim que
 * eles chegam ao celular — no Lichess é igual. O que sobra contra isso é o
 * `tempo_ms`, que fica gravado ao lado: trinta puzzles a dois segundos cada
 * aparecem no relatório do professor.
 */
export function conferirSolucao(
  p: Pick<Puzzle, "fen" | "lances">,
  jogados: readonly string[],
): boolean {
  let fen = posicaoInicial(p).fen();
  let i = 1;
  let k = 0;

  while (i < p.lances.length) {
    const meu = jogados[k++];
    if (!meu) return false;
    if (!lanceCerto(fen, meu, p.lances[i])) return false;

    const depois = applyUci(fen, meu);
    // `lanceCerto` já garantiu que o lance é legal — ou igual ao esperado, ou
    // um mate. Este `if` é só para o TypeScript não precisar acreditar.
    if (!depois) return false;
    // Mate: a linha acabou aqui, mesmo que o arquivo tivesse mais lances.
    if (depois.game.isCheckmate()) return true;

    i++;
    if (i >= p.lances.length) return true;

    const resposta = applyUci(depois.fen, p.lances[i]);
    if (!resposta) return false;
    fen = resposta.fen;
    i++;
  }

  return true;
}
