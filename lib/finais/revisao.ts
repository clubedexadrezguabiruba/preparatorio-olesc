import { hojeNoBrasil, somarDias } from "../curso/calendario.ts";
import type { AulaDaTrilha, Formato } from "./trilha.ts";

/**
 * A revisão espaçada das aulas de finais — o gêmeo de `lib/tatica/revisao.ts`,
 * e derivada pelo mesmo motivo: o banco guarda o que aconteceu, e o que isso
 * significa é lido em cima, por função pura com teste.
 *
 * ## A regra, em três intervalos
 *
 * Dominou uma aula no dia D? Ela volta como "revisar" em **D+3**. Revisão
 * vencida no prazo: volta em **7 dias**; de novo, em **14**; depois sai.
 *
 * Os intervalos são maiores que os da tática (2-7-14) porque a unidade é
 * outra: um puzzle é um lance, uma aula é uma técnica de dez lances contra o
 * computador. Revisar um final dois dias depois de dominá-lo é repetir, não
 * recordar.
 *
 * ## Por que a data importa, e a view não bastava
 *
 * `progresso_aula.ultima` é o máximo de `criada_em` por aula: ela responde
 * "quando ele mexeu nisto pela última vez", e não "quando ele dominou" nem
 * "quantas revisões já fez". A fila precisa das duas, então ela lê os eventos
 * — uma linha por etapa jogada, com data.
 *
 * ## O que conta como dominar, aqui
 *
 * O mesmo critério de `dominou()` na trilha, com data: aula curta é o primeiro
 * `pratica` com sucesso; aula completa é o **mais tardio** entre o primeiro
 * `solo` e o primeiro `pratica` com sucesso, porque é aí que ela passou a
 * valer. Aula de leitura não entra: não há tabuleiro para revisar.
 */

/** Uma linha de `tentativas_aula`, no que a agenda precisa saber. */
export type EventoDeAula = {
  readonly etapa: string;
  readonly sucesso: boolean;
  /** ISO, como o Supabase devolve `criada_em`. */
  readonly criada_em: string;
};

export type Agenda = {
  /** `AAAA-MM-DD` em que a aula volta a ser devida. */
  readonly devidoEm: string;
  /** 1 = primeira revisão pendente; 2 = já revisou uma vez; 3 = duas. */
  readonly rodada: 1 | 2 | 3;
};

export type RevisaoDevida = Agenda & { readonly aula: string };

/** Dias até a 1ª revisão depois de dominar, e depois de cada revisão vencida. */
export const INTERVALOS_DE_FINAIS: readonly [number, number, number] = [3, 7, 14];

const diaDe = (evento: EventoDeAula) => hojeNoBrasil(new Date(evento.criada_em));

/** O dia do primeiro evento bem-sucedido de uma etapa, ou `null`. */
function primeiroSucesso(eventos: readonly EventoDeAula[], etapa: string): string | null {
  const acertos = eventos.filter((e) => e.etapa === etapa && e.sucesso).map(diaDe);
  return acertos.length > 0 ? acertos.reduce((a, b) => (a < b ? a : b)) : null;
}

/**
 * Quando esta aula volta, ou `null`: não dominada, de leitura, ou já saiu da
 * fila depois de três revisões.
 */
export function agendaDeRevisao(
  formato: Formato,
  eventos: readonly EventoDeAula[],
): Agenda | null {
  // Leitura não tem partida: revisar seria reabrir o texto, e para isso a
  // trilha já está ali.
  if (formato === "leitura") return null;

  const emOrdem = [...eventos].sort((a, b) =>
    a.criada_em < b.criada_em ? -1 : a.criada_em > b.criada_em ? 1 : 0,
  );

  const pratica = primeiroSucesso(emOrdem, "pratica");
  if (!pratica) return null;

  let dominouEm = pratica;
  if (formato === "completa") {
    const solo = primeiroSucesso(emOrdem, "solo");
    if (!solo) return null;
    dominouEm = solo > pratica ? solo : pratica;
  }

  let agenda: Agenda | null = {
    devidoEm: somarDias(dominouEm, INTERVALOS_DE_FINAIS[0]),
    rodada: 1,
  };

  for (const evento of emOrdem) {
    if (evento.etapa !== "revisao" || !evento.sucesso || agenda === null) continue;
    const dia = diaDe(evento);
    // Revisão jogada na mesma sessão da aula, antes de vencer: é o botão "Ir
    // para a revisão" no fim da prática. Não é recordar — é continuar.
    if (dia < agenda.devidoEm) continue;

    if (agenda.rodada === 3) {
      agenda = null;
      break;
    }
    const rodada = (agenda.rodada + 1) as 2 | 3;
    agenda = {
      // A partir do dia da revisão, e não do dia devido: revisar atrasado não
      // pode nascer vencido de novo.
      devidoEm: somarDias(dia, INTERVALOS_DE_FINAIS[rodada - 1]),
      rodada,
    };
  }

  return agenda;
}

/** As aulas devidas até `hoje`: a mais atrasada primeiro, depois pela trilha. */
export function revisoesDevidas(
  aulas: readonly Pick<AulaDaTrilha, "id" | "formato" | "ordem">[],
  eventos: ReadonlyMap<string, readonly EventoDeAula[]>,
  hoje: string,
): RevisaoDevida[] {
  const devidas: Array<RevisaoDevida & { ordem: number }> = [];

  for (const aula of aulas) {
    const agenda = agendaDeRevisao(aula.formato, eventos.get(aula.id) ?? []);
    if (agenda && agenda.devidoEm <= hoje) {
      devidas.push({ aula: aula.id, ...agenda, ordem: aula.ordem });
    }
  }

  devidas.sort((a, b) =>
    a.devidoEm < b.devidoEm ? -1 : a.devidoEm > b.devidoEm ? 1 : a.ordem - b.ordem,
  );
  // A `ordem` serviu para desempatar e não é do contrato: quem lê a lista quer
  // saber qual aula e quando, não em que posição da trilha ela está.
  return devidas.map((devida) => ({
    aula: devida.aula,
    devidoEm: devida.devidoEm,
    rodada: devida.rodada,
  }));
}
