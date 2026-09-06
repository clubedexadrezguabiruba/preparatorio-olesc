import type { TreeGoal } from "./schema";

/**
 * O critério de domínio, D1 (plano da F1, §6).
 *
 * > **Dominado** numa competência de N0 = na mesma sessão: completar a etapa 4
 * > numa posição nunca vista, sem dica, sem nenhum lance que jogue a vitória
 * > fora, sem afogamento e dentro do teto de lances; **e** vencer a etapa 5
 * > contra o Stockfish.
 *
 * A etapa 1 já mostra esse critério por extenso ao aluno, desde o B3. Sem esta
 * função a aula abria com uma promessa que ela mesma nunca respondia.
 *
 * ## Por que dois booleanos bastam
 *
 * "Sem dica, sem jogar a vitória fora, sem afogamento, dentro do teto" parece
 * exigir contabilidade nova, e não exige — porque a etapa 4 **já** encerra a
 * tentativa em cada um desses casos: um lance que joga a vitória fora chama
 * `treeFail`, estourar o teto também, a etapa roda com `allowHelp={false}` (não
 * existe dica para pedir), e o gate de conteúdo prova que todo nó terminal
 * entrega o que declara. Logo `status === "done"` na etapa 4 **é** o critério
 * inteiro, e o que falta é lê-lo.
 *
 * ## O que a FN1/B2 mudou aqui
 *
 * Duas coisas, e as duas por causa das 49 aulas que vêm:
 *
 * - **A aula diz quais etapas tem.** O critério deixou de ser sempre "as duas
 *   metades": das 49 aulas da trilha, 8 são completas (etapa 4 + etapa 5) e ~39
 *   são curtas (só a etapa 5). Exigir de uma aula curta uma etapa que ela não
 *   tem deixaria o selo dizendo "falta a etapa sem ajuda" com o aluno olhando
 *   uma aula que nunca teve essa aba.
 * - **O objetivo entra no texto.** Metade dos finais do curso se ganha e a
 *   outra metade se segura. "Vencer o computador" dito a quem precisava empatar
 *   é a aula cobrando o que ela mesma não pediu.
 *
 * Puro: nem React, nem store, nem chess.js. É o que permite ao `node --test`
 * cobrir as combinações.
 */

export type MasteryReport = {
  mastered: boolean;
  headline: string;
  /** O que ainda falta, na ordem em que o aluno deve atacar. Vazio se dominado. */
  missing: Array<{ stage: "solo" | "practice"; text: string }>;
};

export type MasteryInput = {
  /**
   * A aula tem etapa 4? Quando não tem, ela não é cobrada — e o critério da
   * aula passa a ser só a prática (o formato "curta" da trilha).
   */
  hasSolo: boolean;
  /** A aula tem etapa 5? */
  hasPractice: boolean;
  soloCleared: boolean;
  practiceWon: boolean;
  /** O que cada etapa pede. Sem dizer, é ganhar — como sempre foi. */
  soloGoal?: TreeGoal;
  practiceGoal?: TreeGoal;
};

const FALTA_SOLO: Record<TreeGoal, string> = {
  win: "Completar a etapa sem ajuda até o mate, numa posição que você não viu nas etapas anteriores. É lá que o domínio é aferido.",
  draw: "Completar a etapa sem ajuda até segurar o empate, numa posição que você não viu nas etapas anteriores. É lá que o domínio é aferido.",
};

const FALTA_PRACTICE: Record<TreeGoal, string> = {
  win: "Vencer o computador aqui na prática real. Saber a técnica e executá-la contra quem resiste são duas coisas.",
  draw: "Segurar o empate contra o computador aqui na prática real. Saber a técnica e executá-la contra quem resiste são duas coisas.",
};

export function masteryReport({
  hasSolo,
  hasPractice,
  soloCleared,
  practiceWon,
  soloGoal = "win",
  practiceGoal = "win",
}: MasteryInput): MasteryReport {
  const missing: MasteryReport["missing"] = [];
  if (hasSolo && !soloCleared) missing.push({ stage: "solo", text: FALTA_SOLO[soloGoal] });
  if (hasPractice && !practiceWon) {
    missing.push({ stage: "practice", text: FALTA_PRACTICE[practiceGoal] });
  }

  const exigidas = (hasSolo ? 1 : 0) + (hasPractice ? 1 : 0);

  // Aula que não joga — o formato "leitura" da trilha, objetivo + exemplo. O
  // domínio dela é uma declaração do aluno, e mora no banco (FN1/B3), não aqui.
  // Devolver `mastered: true` por não haver o que exigir seria dar o selo de
  // graça a qualquer aula mal montada que chegasse até esta função.
  if (exigidas === 0) {
    return {
      mastered: false,
      headline: "Esta aula não afere domínio por etapa jogada — ela é de leitura.",
      missing,
    };
  }

  if (missing.length === 0) {
    return {
      mastered: true,
      headline:
        exigidas === 2
          ? "Dominado. Etapa sem ajuda completada e computador enfrentado, na mesma sessão — é o critério inteiro."
          : hasPractice
            ? "Dominado. Esta aula não tem etapa sem ajuda: o critério inteiro é a prática, e ela saiu."
            : "Dominado. Esta aula não tem prática contra o computador: o critério inteiro é a etapa sem ajuda, e ela saiu.",
      missing,
    };
  }

  return {
    mastered: false,
    headline:
      exigidas === 1
        ? "Ainda não dominado. Falta o único critério desta aula."
        : missing.length === 2
          ? "Ainda não dominado. Faltam as duas metades do critério."
          : "Quase. Falta uma metade do critério.",
    missing,
  };
}
