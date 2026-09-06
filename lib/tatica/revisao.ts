import { hojeNoBrasil, somarDias } from "../curso/calendario.ts";

/**
 * A fila de revisão espaçada da tática — derivada das linhas, sem tabela.
 *
 * ## A regra, em três intervalos
 *
 * - **Errou** um puzzle (em qualquer modo): ele volta em **2 dias**.
 * - **Acertou** um puzzle devido: volta em **7 dias**; acertou de novo, em
 *   **14**; na terceira vez ele sai da fila.
 * - Errou na revisão: volta a 2 dias, do zero.
 *
 * Os intervalos 2-7-14 são os que cabem em quatro semanas: um puzzle errado no
 * primeiro sábado é revisto três vezes antes do torneio, e a última revisão cai
 * na semana de manutenção, quando não há tema novo para estudar.
 *
 * ## Por que derivada, e não uma tabela `fila_revisao`
 *
 * Porque uma tabela com `devido_em` e `nivel` seria uma segunda verdade que o
 * servidor teria de manter sincronizada a cada gravação — e um bug ali não se
 * consertaria relendo o histórico. Aqui a fila é uma função das linhas de
 * `tentativas_puzzle` do aluno: entra a lista, sai a fila. Mudar a regra (os
 * intervalos, o que conta como "no prazo") é mudar este arquivo e o teste
 * dele, sem migration e sem reescrever linha de ninguém.
 *
 * ## O acerto fora do prazo não conta
 *
 * O aluno erra na série e acerta o mesmo puzzle na prova do mesmo tema, na
 * mesma tarde. Isso não prova que ele **reteve** o padrão — prova que lembrou
 * de meia hora atrás. Então o acerto só sobe o nível se veio no dia devido ou
 * depois. A revisão do dia só serve puzzles devidos, e por isso todo acerto
 * nela está no prazo por construção; é a prova que pode chegar cedo demais.
 */

/** Uma linha de `tentativas_puzzle`, no que a fila precisa saber. */
export type LinhaDeTentativa = {
  readonly puzzle_id: string;
  readonly tema: string;
  /** Nula em linhas anteriores à 0005; aí vale `tema`. */
  readonly origem: string | null;
  readonly modo: string;
  readonly acertou: boolean;
  /** ISO, como o Supabase devolve `criada_em`. */
  readonly criada_em: string;
};

export type ItemDaFila = {
  readonly puzzleId: string;
  /** O tema em que o aluno estava quando errou pela última vez. */
  readonly tema: string;
  /** O arquivo de onde o puzzle sai (`puzzlePorId(origem, id)`). */
  readonly origem: string;
  /** `AAAA-MM-DD` em que ele volta a ser devido. */
  readonly devidoEm: string;
  /** 1 = errou e ainda não acertou no prazo; 2 = acertou uma vez; 3 = duas. */
  readonly nivel: 1 | 2 | 3;
};

/** Dias até a próxima revisão depois de errar, do 1º acerto e do 2º acerto. */
export const INTERVALOS_DA_REVISAO: readonly [number, number, number] = [2, 7, 14];

/** O dia de Guabiruba em que a linha foi gravada. */
function diaDe(linha: LinhaDeTentativa): string {
  return hojeNoBrasil(new Date(linha.criada_em));
}

/**
 * A fila inteira, devida ou não, um item por puzzle que está "em aberto" —
 * ordenada pelo dia em que vence e, no empate, pelo id.
 */
export function filaCompleta(linhas: readonly LinhaDeTentativa[]): ItemDaFila[] {
  const emOrdem = [...linhas].sort((a, b) =>
    a.criada_em < b.criada_em ? -1 : a.criada_em > b.criada_em ? 1 : 0,
  );

  const estado = new Map<string, ItemDaFila | null>();

  for (const linha of emOrdem) {
    const dia = diaDe(linha);
    const atual = estado.get(linha.puzzle_id) ?? null;

    if (!linha.acertou) {
      estado.set(linha.puzzle_id, {
        puzzleId: linha.puzzle_id,
        tema: linha.tema,
        origem: linha.origem ?? linha.tema,
        devidoEm: somarDias(dia, INTERVALOS_DA_REVISAO[0]),
        nivel: 1,
      });
      continue;
    }

    // Acerto de um puzzle que não está em aberto: nunca errou, ou já saiu.
    if (!atual) continue;
    // Acerto antes do prazo não prova retenção; a fila não mexe.
    if (dia < atual.devidoEm) continue;

    if (atual.nivel === 3) {
      // Terceiro acerto no prazo: sai da fila. `null` guarda que ele já saiu,
      // para um acerto posterior não o ressuscitar.
      estado.set(linha.puzzle_id, null);
      continue;
    }

    const nivel = (atual.nivel + 1) as 2 | 3;
    estado.set(linha.puzzle_id, {
      ...atual,
      devidoEm: somarDias(dia, INTERVALOS_DA_REVISAO[nivel - 1]),
      nivel,
    });
  }

  return [...estado.values()]
    .filter((item): item is ItemDaFila => item !== null)
    .sort((a, b) =>
      a.devidoEm < b.devidoEm
        ? -1
        : a.devidoEm > b.devidoEm
          ? 1
          : a.puzzleId < b.puzzleId
            ? -1
            : 1,
    );
}

/** O que está devido até `hoje`: o mais atrasado primeiro, depois por id. */
export function filaDeRevisao(linhas: readonly LinhaDeTentativa[], hoje: string): ItemDaFila[] {
  return filaCompleta(linhas).filter((item) => item.devidoEm <= hoje);
}
