import { Chess } from "chess.js";
import type { Color, Key } from "@lichess-org/chessground/types";
import { toBoardColor } from "../chess/dests.ts";
import type { RoteiroPasso } from "./schema.ts";

/**
 * A aritmética da etapa 1 assistida, fora do componente.
 *
 * ## De onde ela veio
 *
 * Do git. Este arquivo é `lib/lesson/example.ts`, apagado em 2026-09-08 no
 * commit `aeb5ca1` junto com a animação — `git show aeb5ca1^:lib/lesson/example.ts`
 * traz o original. O `buildFrames` de lá já convertia "posição de partida +
 * lista de lances" na sequência de quadros, com `lastMove`, xeque, captura e o
 * lado matado para o pulso do rei, e já tinha teste. Nada disso precisou ser
 * pensado de novo.
 *
 * **O que mudou, e por que o arquivo trocou de nome.** Lá os quadros eram de
 * uma *cena* de uma etapa `example` que não existe mais, e metade do arquivo
 * (`sceneById`, `defaultFrame`, `phaseAt`, `pausesBefore`) servia a fases e a
 * quadros citados por outra etapa — tudo morto no formato de três etapas. O que
 * sobreviveu é o `buildFrames`, e a fonte dos passos agora é o roteiro da etapa
 * 1. Manter o nome `example.ts` seria manter o nome de uma etapa que saiu.
 *
 * **A contagem também mudou, e é a diferença que importa.** Lá havia um quadro
 * a mais que os lances, porque o quadro 0 era a posição de partida. Aqui **um
 * passo é um quadro**: o passo sem `lance` — o que só aponta — desenha a mesma
 * posição do passo anterior, e é assim que a fala "o rei preto quer chegar
 * aqui" acontece antes de qualquer peça se mexer.
 *
 * Nada aqui avalia lance. A chess.js só aplica o que está escrito no arquivo,
 * para saber desenhar cada posição; quem julga xadrez é a tablebase, na
 * autoria, e quem recusa roteiro que não fecha é a `lessonSchema`.
 */

/** Uma posição do roteiro, pronta para o tabuleiro. */
export type Quadro = {
  fen: string;
  lastMove: [Key, Key] | null;
  check: boolean;
  capture: boolean;
  mate: boolean;
  /** Lado matado, para o pulso do rei. `null` fora do mate. */
  matedColor: Color | null;
};

/**
 * Todos os quadros do roteiro, um por passo.
 *
 * `quadros.length === roteiro.length`, sempre. O passo sem `lance` repete a
 * posição do anterior e **zera o `lastMove`**: manter aceso o lance passado
 * enquanto o professor fala de outra coisa é apontar para o lugar errado.
 */
export function montarQuadros(fenInicial: string, roteiro: RoteiroPasso[]): Quadro[] {
  const game = new Chess(fenInicial);
  const quadros: Quadro[] = [];
  for (const passo of roteiro) {
    if (!passo.lance) {
      quadros.push({
        fen: game.fen(),
        lastMove: null,
        check: game.isCheck(),
        capture: false,
        mate: false,
        matedColor: null,
      });
      continue;
    }
    const jogado = game.move({
      from: passo.lance.slice(0, 2),
      to: passo.lance.slice(2, 4),
      promotion: passo.lance.length > 4 ? passo.lance.slice(4) : undefined,
    });
    const mate = game.isCheckmate();
    quadros.push({
      fen: game.fen(),
      lastMove: [passo.lance.slice(0, 2) as Key, passo.lance.slice(2, 4) as Key],
      check: game.isCheck(),
      capture: Boolean(jogado.captured),
      mate,
      // Quem está para jogar num mate é o lado matado.
      matedColor: mate ? toBoardColor(game.turn()) : null,
    });
  }
  return quadros;
}

/* ------------------------------------------------------------------ *
 * O relógio da aula assistida
 *
 * **O avanço é o relógio do TEXTO, não um intervalo fixo.** A fala termina de
 * ser digitada, o aluno tem tempo de lê-la, e só então a próxima posição entra.
 * Um `setInterval` de N segundos daria pressa na fala longa e vazio na curta.
 *
 * Os dois números moram aqui, juntos e num lugar só, pelo mesmo motivo que os
 * do `Comentario`: mudar a velocidade da aula é editar um número neste bloco.
 * ------------------------------------------------------------------ */

/**
 * Quanto tempo a fala fica na tela **depois** de terminar de aparecer, por
 * caractere.
 *
 * A conta fechada: o `Comentario` revela a 7 ms/caractere, então cada caractere
 * fica na tela 7 + 45 = 52 ms, o que dá ~19 caracteres por segundo. Nas 13
 * falas da KPK isso põe a etapa em ~47 s, dentro da faixa de 40 a 70 s que a
 * `/revisar-aula` cobra. Uma criança de 12 anos lê mais rápido que isso — a
 * folga é de propósito, porque ela está olhando o tabuleiro ao mesmo tempo.
 */
const MS_DE_LEITURA_POR_CARACTERE = 45;

/**
 * Piso da pausa de leitura. "Dama." tem 5 caracteres e não pode passar em 225
 * ms: o que se lê ali não é a palavra, é a posição no tabuleiro.
 */
const PAUSA_MINIMA_MS = 1000;

/**
 * Quanto o passo espera depois que a fala terminou de aparecer.
 *
 * `espera` é o ajuste do autor, somado por cima — o passo em que a posição
 * precisa ser olhada com calma pede mais tempo do que o tamanho da fala
 * justificaria.
 */
export function pausaDoPasso(passo: RoteiroPasso): number {
  const leitura = Math.max(PAUSA_MINIMA_MS, passo.fala.length * MS_DE_LEITURA_POR_CARACTERE);
  return leitura + (passo.espera ?? 0);
}

/**
 * Quanto o roteiro inteiro leva, em ms — a estimativa que a revisão mede contra
 * a faixa de 40 a 70 segundos.
 *
 * Conta a digitação (7 ms/caractere, o número do `Comentario`) mais a pausa de
 * leitura de cada passo. **Não** conta a animação da peça no chessground, que
 * corre por baixo da digitação, nem o tempo entre o clique do aluno e o
 * primeiro caractere.
 */
export const MS_POR_CARACTERE_DIGITADO = 7;

export function duracaoDoRoteiro(roteiro: RoteiroPasso[]): number {
  return roteiro.reduce(
    (total, passo) =>
      total + passo.fala.length * MS_POR_CARACTERE_DIGITADO + pausaDoPasso(passo),
    0,
  );
}
