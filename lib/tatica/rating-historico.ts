import { diasEntre, hojeNoBrasil, somarDias } from "../curso/calendario.ts";
import { contaNoCurso, TEMAS } from "./blocos.ts";
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
  /** Os temas do currículo que o problema traz; `null` antes da 0014. */
  readonly temas: readonly string[] | null;
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
 * 900, e é o 900 que `rating_tatica.rating_maximo` guarda. Começa no rating de
 * antes do primeiro problema, o início do aluno: 600, e 400 para quem jogou
 * pela regra do primeiro dia.
 */
export function historicoPorDia(linhas: readonly TentativaDoRating[]): PontoDoRating[] {
  const pontos: PontoDoRating[] = [];
  const ordenadas = emOrdem(linhas);
  let recorde = ordenadas[0]?.rating_antes ?? 0;
  for (const linha of ordenadas) {
    const dia = hojeNoBrasil(new Date(linha.criada_em));
    recorde = Math.max(recorde, linha.rating_depois);
    const ultimo = pontos.at(-1);
    if (ultimo?.dia === dia) pontos[pontos.length - 1] = { dia, rating: linha.rating_depois, recorde };
    else pontos.push({ dia, rating: linha.rating_depois, recorde });
  }
  return pontos;
}

/**
 * O rating antes do primeiro problema, e depois de cada um — o eixo por
 * problema do gráfico, para quem ainda tem poucos dias de jogo. O recorde segue
 * a regra de `historicoPorDia`: começa no início e nunca desce.
 */
export function historicoPorTentativa(linhas: readonly TentativaDoRating[]): PontoDoRating[] {
  const ordenadas = emOrdem(linhas);
  const primeira = ordenadas[0];
  if (!primeira) return [];
  let recorde = primeira.rating_antes;
  const pontos: PontoDoRating[] = [
    { dia: hojeNoBrasil(new Date(primeira.criada_em)), rating: primeira.rating_antes, recorde },
  ];
  for (const linha of ordenadas) {
    recorde = Math.max(recorde, linha.rating_depois);
    pontos.push({ dia: hojeNoBrasil(new Date(linha.criada_em)), rating: linha.rating_depois, recorde });
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

export type SemanaDoAluno = {
  /** A coluna "7 dias": quanto o rating andou (`variacaoNaSemana`). */
  readonly variacao: number;
  /** Quantos problemas ele respondeu nos últimos 7 dias. */
  readonly problemas: number;
  readonly acertos: number;
  /** 0 a 100, arredondado; `null` sem problema na semana. */
  readonly acerto: number | null;
};

/**
 * A semana de um aluno na tabela da turma: a variação, quantos problemas e o
 * acerto. Sem os problemas ao lado, um "±0" não separa quem ficou parado de
 * quem jogou cinquenta e empatou — e é essa a pergunta do professor.
 *
 * Os mesmos 7 dias de `variacaoNaSemana`, contando hoje, no dia de Guabiruba.
 */
export function semanaDoAluno(
  linhas: readonly Pick<TentativaDoRating, "acertou" | "rating_antes" | "criada_em">[],
  ratingAtual: number,
  agora: Date = new Date(),
): SemanaDoAluno {
  const desde = somarDias(hojeNoBrasil(agora), -6);
  const daSemana = linhas.filter((l) => hojeNoBrasil(new Date(l.criada_em)) >= desde);
  const { resolvidos, acertos, acerto } = resumo(daSemana);
  return { variacao: variacaoNaSemana(daSemana, ratingAtual, agora), problemas: resolvidos, acertos, acerto };
}

/**
 * "hoje", "ontem", "há 3 dias" — quando o aluno respondeu o último problema, no
 * dia de Guabiruba. A coluna "Última vez" da tabela da turma.
 */
export function ultimaVez(quando: string, agora: Date = new Date()): string {
  const dias = diasEntre(hojeNoBrasil(new Date(quando)), hojeNoBrasil(agora));
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/* ------------------------------------------------------------------ *
 * Os temas fracos
 * ------------------------------------------------------------------ */

/**
 * Abaixo disto, um tema não entra na conta.
 *
 * Era 5 até a revisão de 15/9: com 5 problemas, 2 acertos contra 3 é ruído, e o
 * aluno era mandado estudar um tema por causa de um dia ruim. Foi para 15 naquele
 * dia, e para **10** em 17/9/2026 (Doug): 15 demorava a mostrar qualquer tema, e
 * como o problema conta por todos os temas que traz, 10 já separa tema de sorte.
 */
export const MINIMO_POR_TEMA = 10;

/** Quantos temas fracos a tela mostra. */
export const TEMAS_FRACOS = 3;

// Sem os temas em teste: o modo rating não os nomeia nem os mede.
const TAGS = new Set(TEMAS.filter(contaNoCurso).map((t) => t.tag));
const ORDEM = new Map(TEMAS.map((t, i) => [t.tag, i]));

/**
 * Os temas do currículo que um problema traz: o tema do arquivo de onde ele foi
 * servido primeiro, depois os outros do Lichess que o currículo tem, sem
 * repetir. `middlegame`, `short`, `crushing` e afins ficam fora — não são tema
 * que o aluno estude.
 *
 * É o que `responderRating` grava em `tentativas_puzzle.temas`, e o que a tela
 * de jogo diz depois de um erro ("Era: Garfo").
 */
export function temasDoProblema(origem: string, temas: readonly string[]): string[] {
  return [...new Set([origem, ...temas])].filter((t) => TAGS.has(t));
}

/**
 * Por quais temas do currículo uma tentativa conta.
 *
 * - Com `temas` gravados (desde a 0014): por **todos** eles. Um problema de
 *   garfo e cravada errado conta nos dois.
 * - Tentativa antiga, sem `temas`, servida do arquivo de um tema: por aquele
 *   tema, o mesmo que ela grava em `tema`.
 * - Tentativa antiga de 600–700 (`rating-base`), que não mora em tema nenhum:
 *   pelos temas que o próprio problema traz no arquivo (`temasDaBase`).
 */
export function temasDaTentativa(
  origem: string,
  temasGravados: readonly string[] | null,
  temasDaBase: readonly string[] | null = null,
): string[] {
  if (temasGravados) return [...new Set(temasGravados)].filter((t) => TAGS.has(t));
  if (origem !== ORIGEM_BASE) return TAGS.has(origem) ? [origem] : [];
  return (temasDaBase ?? []).filter((t) => TAGS.has(t));
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
