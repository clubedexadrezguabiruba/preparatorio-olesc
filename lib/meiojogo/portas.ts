import { Chess, type Color, type Square } from "chess.js";

/**
 * As duas portas automáticas do funil — e o motivo de elas morarem aqui.
 *
 * Elas nasceram dentro de `scripts/escolher-exercicios.ts`, que é onde rodam
 * sobre milhares de posições. Só que o gate de conteúdo precisa das mesmas
 * portas sobre as poucas posições que viraram item: uma FEN que passou na porta
 * 1 em setembro e foi editada à mão em outubro tem de reprovar. Reimplementar a
 * porta no gate seria a segunda opinião que este módulo inteiro existe para não
 * ter — a mesma disciplina de `conferirAfirmacao` ser o juiz único da legenda.
 *
 * A porta 3 não está aqui, e nunca vai estar: ela é a curadoria humana, os seis
 * passos da §6 do plano. O que o gate cobra dela é o **registro** de que ela
 * aconteceu, não a decisão.
 */

/** Peça de cavalo para cima: é a partir daí que "pendurada" muda a posição. */
const PESADAS = "nbrq";

export type Reprovacao = "xeque" | "mate-em-1" | "pendurada" | null;

/**
 * A porta estática: `null` quando a posição passa.
 *
 * As três reprovações têm o mesmo alvo — uma posição em que existe **lance
 * urgente** não serve para procurar estrutura. O aluno mandado a achar o peão
 * sem vizinho, numa posição em que a dama está pendurada, aprende que o site
 * pergunta a coisa errada.
 */
export function porta1(fen: string): Reprovacao {
  const jogo = new Chess(fen);
  if (jogo.isCheck()) return "xeque";

  for (const lance of jogo.moves({ verbose: true })) {
    const tentativa = new Chess(fen);
    tentativa.move(lance);
    if (tentativa.isCheckmate()) return "mate-em-1";
  }

  for (const fileira of jogo.board()) {
    for (const casa of fileira) {
      if (casa === null || !PESADAS.includes(casa.type)) continue;
      const inimiga: Color = casa.color === "w" ? "b" : "w";
      const atacada = jogo.attackers(casa.square as Square, inimiga).length > 0;
      const defendida = jogo.attackers(casa.square as Square, casa.color).length > 0;
      if (atacada && !defendida) return "pendurada";
    }
  }
  return null;
}

/**
 * Quantos centésimos de peão de distância entre as duas melhores linhas ainda
 * deixam a posição quieta.
 *
 * É o padrão do funil e o teto que o conteúdo grava em `curadoria.portas`.
 * Acima disso há um lance a achar no tabuleiro, e quem foi mandado procurar
 * estrutura tropeça nele.
 */
export const SALTO_PADRAO = 100;

export type VereditoDoMotor = { passou: boolean; motivo: string; salto: number | null };

/**
 * A porta do motor, sobre as linhas candidatas que o Stockfish devolveu.
 *
 * Recebe as variantes já lidas em vez de falar UCI: assim ela é uma função
 * pura, testável sem processo filho, e o driver do motor continua num lugar só
 * (`scripts/motor.ts`).
 *
 * O que ela **não** reprova, de propósito: desequilíbrio de material. A posição
 * final de um puzzle nasce com ele — é o que a combinação produziu —, e recusá-lo
 * esvaziaria o estoque sem melhorar o exercício. O que ela procura é tática
 * pendente.
 */
export function julgarVariantes(
  variantes: { centesimos: number | null }[],
  salto = SALTO_PADRAO,
): VereditoDoMotor {
  if (variantes.length === 0) return { passou: false, motivo: "motor mudo", salto: null };
  if (variantes[0].centesimos === null) {
    return { passou: false, motivo: "melhor lance dá mate", salto: null };
  }
  if (variantes.length === 1) {
    // Lance único é posição forçada: não há o que decidir além dele.
    return { passou: false, motivo: "lance único", salto: null };
  }
  if (variantes[1].centesimos === null) {
    return { passou: false, motivo: "segunda linha é mate", salto: null };
  }
  const medido = Math.abs(variantes[0].centesimos - variantes[1].centesimos);
  return medido > salto
    ? { passou: false, motivo: `salta ${medido} centésimos`, salto: medido }
    : { passou: true, motivo: "", salto: medido };
}
