import { somarDias } from "./calendario.ts";

/**
 * O dia de treino, medido — a régua da obrigação de 2 horas.
 *
 * O Doug fixou 2 h por dia, 6 dias por semana, e uma obrigação que ninguém
 * mede é uma intenção. O banco já guardava tudo o que ela precisa desde a
 * primeira migration: cada tentativa de puzzle e cada etapa de aula têm
 * `tempo_ms` e `criada_em`. O que faltava era somá-las por dia — a view
 * `minutos_por_dia` (0005) faz isso no SQL, e este arquivo transforma as
 * linhas em números para a tela.
 *
 * ## Duas sessões, não 120 minutos seguidos
 *
 * Trinta minutos de puzzle já cansam o olho de uma criança de 11 anos, e uma
 * hora seguida vira chute. A meta do dia é 120 minutos; o mínimo que mantém a
 * **sequência** viva é 60, e é de propósito que os dois números sejam
 * diferentes: a sequência premia a constância, não o volume, e um dia curto
 * não pode zerar duas semanas de trabalho.
 *
 * ## Puro
 *
 * Sem Supabase e sem relógio: entram as linhas e o dia de hoje, saem os
 * números. Quem fala com o banco é `lib/curso/minutos.ts`.
 */

export type MinutosDoDia = {
  /** `AAAA-MM-DD` no fuso de Guabiruba, como a view devolve. */
  readonly dia: string;
  readonly bloco: string;
  readonly tempo_ms: number;
};

/** A obrigação combinada com a turma: 2 horas por dia, 6 dias por semana. */
export const META_DO_DIA_MIN = 120;

/** Abaixo disto o dia não conta para a sequência. */
export const MINIMO_DA_SEQUENCIA_MIN = 60;

export type MinutosDeHoje = {
  readonly tatica: number;
  readonly finais: number;
  readonly total: number;
};

function emMinutos(ms: number): number {
  return Math.round(ms / 60_000);
}

/**
 * Os minutos de hoje, por bloco.
 *
 * O arredondamento é **depois** da soma, e isso não é detalhe: dois puzzles de
 * 59,6 segundos são 2 minutos, e arredondando cada um seriam 1 + 1 = 2 por
 * acaso, mas vinte deles seriam 20 em vez de 20 — e trinta de 40 segundos,
 * 0 em vez de 20.
 */
export function minutosDeHoje(linhas: readonly MinutosDoDia[], hoje: string): MinutosDeHoje {
  let taticaMs = 0;
  let finaisMs = 0;
  for (const linha of linhas) {
    if (linha.dia !== hoje) continue;
    if (linha.bloco === "tatica") taticaMs += linha.tempo_ms;
    else if (linha.bloco === "finais") finaisMs += linha.tempo_ms;
  }
  return {
    tatica: emMinutos(taticaMs),
    finais: emMinutos(finaisMs),
    total: emMinutos(taticaMs + finaisMs),
  };
}

/**
 * Quantos dias seguidos o aluno treinou o mínimo, terminando hoje.
 *
 * Hoje entra na conta se já bateu o mínimo. Se ainda não bateu, a sequência
 * conta a partir de ontem e continua **viva**: às nove da manhã ninguém treinou
 * ainda, e zerar a sequência do aluno nesse momento seria puni-lo por acordar.
 */
export function sequenciaDeDias(
  linhas: readonly MinutosDoDia[],
  hoje: string,
  minimo: number = MINIMO_DA_SEQUENCIA_MIN,
): number {
  const porDia = new Map<string, number>();
  for (const linha of linhas) {
    porDia.set(linha.dia, (porDia.get(linha.dia) ?? 0) + linha.tempo_ms);
  }

  const bateu = (dia: string) => emMinutos(porDia.get(dia) ?? 0) >= minimo;

  let dia = bateu(hoje) ? hoje : somarDias(hoje, -1);
  let dias = 0;
  // Um mês é o horizonte do preparatório inteiro; a tela não precisa de mais.
  while (dias < 60 && bateu(dia)) {
    dias += 1;
    dia = somarDias(dia, -1);
  }
  return dias;
}

/** Um dia da série, já em minutos e por bloco. */
export type DiaDeTreino = {
  readonly dia: string;
  readonly tatica: number;
  readonly finais: number;
  readonly total: number;
  /** Bateu a meta de 120? E o mínimo de 60? */
  readonly bateuMeta: boolean;
  readonly bateuMinimo: boolean;
};

/**
 * Os últimos `dias` dias, do mais antigo ao de hoje — a série que o relatório
 * do professor desenha.
 *
 * **Os dias vazios entram na lista.** É a diferença entre um gráfico que mostra
 * catorze barras com quatro no chão e um que mostra dez barras encostadas umas
 * nas outras: o segundo esconde exatamente o que o professor abriu a tela para
 * ver. Um dia sem linha nenhuma é um dia em que o aluno não treinou, e ele
 * ocupa espaço.
 */
export function serieDeDias(
  linhas: readonly MinutosDoDia[],
  hoje: string,
  dias = 14,
  meta: number = META_DO_DIA_MIN,
  minimo: number = MINIMO_DA_SEQUENCIA_MIN,
): DiaDeTreino[] {
  const serie: DiaDeTreino[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    const dia = somarDias(hoje, -i);
    const { tatica, finais, total } = minutosDeHoje(linhas, dia);
    serie.push({
      dia,
      tatica,
      finais,
      total,
      bateuMeta: total >= meta,
      bateuMinimo: total >= minimo,
    });
  }
  return serie;
}
