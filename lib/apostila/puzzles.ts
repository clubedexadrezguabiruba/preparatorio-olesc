import { posicaoInicial } from "../tatica/conferir.ts";
import { lerFaixa, lerIndice } from "../tatica/banco.ts";
import type { Puzzle } from "../tatica/puzzles.ts";
import type { BlocoDiagrama } from "./caderno.ts";

/**
 * Os puzzles que vão impressos no caderno, tirados do **mesmo banco** que o
 * site serve.
 *
 * Nada de uma lista de FENs escolhidas à mão e coladas num arquivo da apostila:
 * ela envelheceria sozinha no dia em que o recorte fosse refeito, e o caderno
 * passaria a mostrar um problema que o site não tem mais.
 *
 * ## A posição impressa é a posição que o aluno vê
 *
 * A FEN do arquivo do Lichess é de **antes do erro do adversário** — a
 * convenção do banco deles. Quem imprimisse essa FEN direto poria no papel uma
 * posição em que o lance da solução ainda não existe. A conversão é a mesma
 * função que a tela usa (`posicaoInicial`), então o diagrama do caderno e o
 * tabuleiro do site mostram a mesma coisa.
 *
 * ## A escolha é estável
 *
 * O caderno é impresso, distribuído em papel e conferido pelo professor: dois
 * `build` do mesmo caderno têm de dar o mesmo PDF. Então aqui não há sorteio —
 * há um passo fixo dentro da faixa, que espalha os escolhidos em vez de pegar
 * os primeiros (que no arquivo em rating crescente seriam os mais fáceis de
 * todos, e todos parecidos entre si).
 */

export type PuzzleImpresso = BlocoDiagrama & {
  readonly id: string;
  readonly rating: number;
  /**
   * O puzzle de onde a posição saiu, inteiro.
   *
   * Ele viaja junto porque o gabarito precisa da **linha da solução**, e a linha
   * mora no puzzle, não no diagrama. A alternativa seria o gabarito ir buscar o
   * puzzle de novo pelo id — uma segunda leitura do banco para responder sobre a
   * mesma posição, com a chance de as duas leituras discordarem no dia em que o
   * recorte for refeito.
   */
  readonly puzzle: Puzzle;
};

/** Um puzzle do banco vira um diagrama com a vez e a proveniência. */
export function paraDiagrama(p: Puzzle): PuzzleImpresso {
  const jogo = posicaoInicial(p);
  const brancasJogam = jogo.turn() === "w";
  return {
    fen: jogo.fen(),
    // O diagrama se olha do lado de quem resolve, como no site — mas aí metade
    // deles sai virado, e um aluno que já automatizou "a1 embaixo à esquerda"
    // lê a coordenada errada sem perceber. O aviso é escrito, curto, e mora
    // colado na borda de baixo do tabuleiro.
    orientacao: brancasJogam ? "brancas" : "pretas",
    vez: brancasJogam ? "Brancas jogam." : "Pretas jogam — tabuleiro virado.",
    // Sem crédito por diagrama. Os puzzles do Lichess são CC0, que não exige
    // atribuição, e a capa já credita a fonte inteira. Uma linha de crédito
    // debaixo de cada um dos sessenta custava mais de uma página do caderno —
    // papel que sai da impressora da escola doze vezes.
    pauta: true,
    id: p.id,
    rating: p.rating,
    puzzle: p,
  };
}

/**
 * `quantos` puzzles de um tema, da faixa mais fácil que ele tiver, espalhados
 * por ela e sempre os mesmos.
 */
export async function puzzlesDoTema(tag: string, quantos: number): Promise<PuzzleImpresso[]> {
  const indice = await lerIndice();
  const tema = indice.temas.find((t) => t.tag === tag);
  if (tema === undefined) throw new Error(`o tema "${tag}" não está no índice do banco`);

  const faixa = tema.faixas[0];
  if (faixa === undefined) throw new Error(`o tema "${tag}" está no índice sem nenhuma faixa`);

  const banco = await lerFaixa(faixa.arquivo);
  if (banco.length < quantos) {
    throw new Error(`"${tag}" tem ${banco.length} puzzles na faixa, e o caderno pede ${quantos}`);
  }

  const passo = Math.floor(banco.length / quantos);
  return Array.from({ length: quantos }, (_, i) => paraDiagrama(banco[i * passo]));
}
