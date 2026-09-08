import type { TreeGoal } from "./schema";

/**
 * O que a aula responde ao aluno sobre a passada do dia.
 *
 * ## O que mudou em 2026-09-08, e por quê
 *
 * O critério era D1, e tinha duas metades: completar a **etapa 4** (a árvore
 * sem ajuda, numa posição nunca vista, dentro do teto de lances) **e** vencer
 * a **etapa 5** contra o Stockfish, na mesma sessão.
 *
 * A etapa 4 saiu do formato. No lugar dela, a etapa "sem ajuda" passou a ser a
 * própria partida contra a máquina, na mesma posição das outras duas — e a
 * decisão do Doug é curta: **uma passada = vencer essa partida, uma vez.** A
 * etapa "com ajuda" fica sempre disponível como aquecimento e **não entra na
 * conta**.
 *
 * Sobrou, portanto, **um** booleano onde havia dois. Esta função continua
 * existindo, e não virou um `if` solto no componente, por dois motivos que a
 * FN1/B2 já tinha descoberto e que continuam de pé:
 *
 * - **A aula diz quais etapas tem.** Das 49 da trilha, muitas são curtas. Uma
 *   aula sem partida não pode receber um selo que fale de vencer o computador.
 * - **O objetivo entra no texto.** Metade dos finais se ganha e a outra metade
 *   se segura. "Vencer o computador" dito a quem precisava empatar é a aula
 *   cobrando o que ela mesma não pediu.
 *
 * ## O que este módulo NÃO sabe mais
 *
 * Ele diz se a passada de **hoje** saiu, e nada além disso. Se a aula está
 * *aprendida* é outra pergunta, com outra resposta e outro dono: são três
 * passadas em dias espaçados, contadas pela escada em `lib/finais/` — e uma
 * aula pode perder posto lá sem que nada aqui mude.
 *
 * Puro: nem React, nem store, nem chess.js. É o que permite ao `node --test`
 * cobrir as combinações.
 */

export type MasteryReport = {
  /** A passada de hoje saiu — não "a aula está aprendida". Ver o cabeçalho. */
  mastered: boolean;
  headline: string;
  /** O que ainda falta. Vazio quando a passada saiu. */
  missing: Array<{ stage: "practice"; text: string }>;
};

export type MasteryInput = {
  /** A aula tem a etapa sem ajuda (a partida)? */
  hasPractice: boolean;
  practiceWon: boolean;
  /** O que a partida pede. Sem dizer, é ganhar — como sempre foi. */
  practiceGoal?: TreeGoal;
};

const FALTA_PRACTICE: Record<TreeGoal, string> = {
  win: "Vencer o computador aqui, sem ajuda. Saber a técnica e executá-la contra quem resiste são duas coisas.",
  draw: "Segurar o empate contra o computador aqui, sem ajuda. Saber a técnica e executá-la contra quem resiste são duas coisas.",
};

const SAIU: Record<TreeGoal, string> = {
  win: "Passada do dia feita. Você venceu o computador sem ajuda — volte noutro dia para a aula subir de degrau.",
  draw: "Passada do dia feita. Você segurou o empate sem ajuda — volte noutro dia para a aula subir de degrau.",
};

export function masteryReport({
  hasPractice,
  practiceWon,
  practiceGoal = "win",
}: MasteryInput): MasteryReport {
  // Aula que não joga — o formato "leitura" da trilha. O domínio dela é uma
  // declaração do aluno, e mora no banco (FN1/B3), não aqui. Devolver
  // `mastered: true` por não haver o que exigir seria dar o selo de graça a
  // qualquer aula mal montada que chegasse até esta função.
  if (!hasPractice) {
    return {
      mastered: false,
      headline: "Esta aula não afere passada por etapa jogada — ela é de leitura.",
      missing: [],
    };
  }

  if (practiceWon) {
    return { mastered: true, headline: SAIU[practiceGoal], missing: [] };
  }

  return {
    mastered: false,
    headline: "A passada de hoje ainda não saiu.",
    missing: [{ stage: "practice", text: FALTA_PRACTICE[practiceGoal] }],
  };
}
