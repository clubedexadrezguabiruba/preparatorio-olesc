import { hojeNoBrasil, somarDias } from "../curso/calendario.ts";
import { TEMAS } from "./blocos.ts";
import { INICIO } from "./glicko2.ts";
import { ORIGEM_BASE } from "./rating.ts";

/**
 * O que as telas de evolução leem do histórico do modo rating — funções puras,
 * com teste, em cima das linhas de `tentativas_puzzle` com `modo = 'rating'`.
 *
 * O banco guarda o que aconteceu (o rating de antes e o de depois, em cada
 * tentativa); o gráfico, o recorde, a variação da semana e os temas fracos são
 * lidos em cima, aqui. É a mesma doutrina da fila de revisão
 * (`lib/tatica/revisao.ts`): nenhuma tabela de "histórico" que pudesse discordar
 * das linhas.
 */

/** Uma tentativa do modo rating, no que estas funções precisam. */
export type TentativaDoRating = {
  readonly puzzle_id: string;
  readonly origem: string;
  readonly acertou: boolean;
  readonly rating_antes: number;
  readonly rating_depois: number;
  /** ISO, como o Supabase devolve. */
  readonly criada_em: string;
};

/** Um ponto do gráfico: o dia, o último rating dele, e o recorde até ali. */
export type PontoDoRating = {
  readonly dia: string;
  readonly rating: number;
  readonly recorde: number;
};

function emOrdem<T extends { criada_em: string }>(linhas: readonly T[]): T[] {
  return [...linhas].sort((a, b) => (a.criada_em < b.criada_em ? -1 : a.criada_em > b.criada_em ? 1 : 0));
}

/**
 * O último rating de cada dia (de Guabiruba), e o recorde até o fim daquele dia.
 *
 * O recorde é o **máximo de todas as tentativas** até ali, e não o máximo dos
 * pontos do gráfico: o aluno que foi a 900 às 15h e terminou o dia em 850 bateu
 * 900, e é o 900 que `rating_tatica.rating_maximo` guarda. Começa em 400, o
 * rating de todo aluno antes do primeiro problema.
 */
export function historicoPorDia(linhas: readonly TentativaDoRating[]): PontoDoRating[] {
  const pontos: PontoDoRating[] = [];
  let recorde: number = INICIO.rating;
  for (const linha of emOrdem(linhas)) {
    const dia = hojeNoBrasil(new Date(linha.criada_em));
    recorde = Math.max(recorde, linha.rating_depois);
    const ultimo = pontos.at(-1);
    if (ultimo?.dia === dia) pontos[pontos.length - 1] = { dia, rating: linha.rating_depois, recorde };
    else pontos.push({ dia, rating: linha.rating_depois, recorde });
  }
  return pontos;
}

/** Só os pontos dos últimos `dias` dias, contando hoje. A minicurva do painel. */
export function ultimosDias(pontos: readonly PontoDoRating[], dias: number, hoje: string): PontoDoRating[] {
  const desde = somarDias(hoje, -(dias - 1));
  return pontos.filter((p) => p.dia >= desde && p.dia <= hoje);
}

export type Resumo = {
  readonly resolvidos: number;
  readonly acertos: number;
  /** 0 a 100, arredondado; `null` sem tentativa. */
  readonly acerto: number | null;
};

export function resumo(linhas: readonly Pick<TentativaDoRating, "acertou">[]): Resumo {
  const acertos = linhas.filter((l) => l.acertou).length;
  return {
    resolvidos: linhas.length,
    acertos,
    acerto: linhas.length ? Math.round((100 * acertos) / linhas.length) : null,
  };
}

/**
 * Quanto o rating andou nos últimos 7 dias: o atual menos o rating de antes da
 * primeira tentativa desses dias. Sem tentativa na semana, andou zero.
 *
 * É a coluna "7 dias" da tabela da turma do professor.
 */
export function variacaoNaSemana(
  linhas: readonly Pick<TentativaDoRating, "rating_antes" | "criada_em">[],
  ratingAtual: number,
  agora: Date = new Date(),
): number {
  const desde = somarDias(hojeNoBrasil(agora), -6);
  const primeira = emOrdem(linhas).find((l) => hojeNoBrasil(new Date(l.criada_em)) >= desde);
  return primeira ? Math.round(ratingAtual) - Math.round(primeira.rating_antes) : 0;
}

/* ------------------------------------------------------------------ *
 * Os temas fracos
 * ------------------------------------------------------------------ */

/** Abaixo disto, um tema não entra na conta: 1 de 2 é sorte, não fraqueza. */
export const MINIMO_POR_TEMA = 5;

/** Quantos temas fracos a tela mostra. */
export const TEMAS_FRACOS = 3;

const TAGS = new Set(TEMAS.map((t) => t.tag));
const ORDEM = new Map(TEMAS.map((t, i) => [t.tag, i]));

/**
 * Por quais temas do currículo uma tentativa conta.
 *
 * - Problema servido do arquivo de um tema: conta por **aquele** tema, o mesmo
 *   que a tentativa grava em `tema`.
 * - Problema de 600–700 (`rating-base`), que não mora em tema nenhum: conta
 *   pelos temas que o **próprio problema** traz (`temas[]` do Lichess), dos que
 *   o currículo tem. Um "mateIn1 hangingPiece" errado conta nos dois.
 */
export function temasDaTentativa(origem: string, temasDoProblema: readonly string[] | null): string[] {
  if (origem !== ORIGEM_BASE) return TAGS.has(origem) ? [origem] : [];
  return (temasDoProblema ?? []).filter((t) => TAGS.has(t));
}

export type TemaFraco = {
  readonly tag: string;
  readonly tentativas: number;
  readonly acertos: number;
  /** 0 a 100, arredondado. */
  readonly acerto: number;
};

/**
 * Os temas com pior acerto no modo rating — só os que têm ao menos
 * `MINIMO_POR_TEMA` tentativas.
 *
 * Empate no acerto: primeiro o tema com **mais** tentativas (a mesma taxa sobre
 * mais problemas é evidência mais firme), e depois a ordem do currículo, para a
 * lista não mudar de um F5 para outro.
 */
export function temasFracos(
  tentativas: readonly { readonly temas: readonly string[]; readonly acertou: boolean }[],
  minimo = MINIMO_POR_TEMA,
  quantos = TEMAS_FRACOS,
): TemaFraco[] {
  const conta = new Map<string, { tentativas: number; acertos: number }>();
  for (const t of tentativas) {
    for (const tag of new Set(t.temas)) {
      const atual = conta.get(tag) ?? { tentativas: 0, acertos: 0 };
      conta.set(tag, { tentativas: atual.tentativas + 1, acertos: atual.acertos + (t.acertou ? 1 : 0) });
    }
  }
  return [...conta.entries()]
    .filter(([, c]) => c.tentativas >= minimo)
    .map(([tag, c]) => ({ tag, ...c, taxa: c.acertos / c.tentativas }))
    .sort(
      (a, b) =>
        a.taxa - b.taxa ||
        b.tentativas - a.tentativas ||
        (ORDEM.get(a.tag) ?? 99) - (ORDEM.get(b.tag) ?? 99),
    )
    .slice(0, quantos)
    .map(({ tag, tentativas: n, acertos }) => ({ tag, tentativas: n, acertos, acerto: Math.round((100 * acertos) / n) }));
}
