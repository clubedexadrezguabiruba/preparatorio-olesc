import { somarDias } from "./calendario.ts";

/**
 * O dia de treino, medido — a régua da obrigação diária.
 *
 * O Doug fixou uma rotina por dia, 6 dias por semana, e uma obrigação que
 * ninguém mede é uma intenção. O banco já guardava tudo o que ela precisa desde
 * a primeira migration: cada tentativa de puzzle e cada etapa de aula têm
 * `tempo_ms` e `criada_em`. O que faltava era somá-las por dia — a view
 * `minutos_por_dia` (0005) faz isso no SQL, e este arquivo transforma as
 * linhas em números para a tela.
 *
 * ## A barra dizia um número que ela não media
 *
 * Até 2026-09-09 a meta era **120 min** e a soma pegava só `tatica` e `finais`.
 * O meio-jogo saiu com o módulo em 8/9; a partida do dia é uma declaração, sem
 * `tempo_ms`. A rotina do plano mestre vale hoje 45 + 30 + 30 = **105 min
 * reais, dos quais o site enxergava 75** — e o aluno que cumpria a rotina
 * inteira lia *"75 de 120"*. Não era defeito de layout: era a interface dizendo
 * um número que ela não mede.
 *
 * O conserto tem duas metades:
 *
 * 1. **A meta cai para {@link META_DO_DIA_MIN} = 90**, que é o que a rotina
 *    vigente de fato pede.
 * 2. **A partida entra no total**, valendo {@link MINUTOS_DA_PARTIDA} = 30 —
 *    *declarados*, não medidos, e a tela desenha esse pedaço diferente.
 *
 * ## Duas sessões, não noventa minutos seguidos
 *
 * Trinta minutos de puzzle já cansam o olho de uma criança de 11 anos, e uma
 * hora seguida vira chute. O mínimo que mantém a **sequência** viva é
 * {@link MINIMO_DA_SEQUENCIA_MIN} = 60, e é de propósito que os dois números
 * sejam diferentes: a sequência premia a constância, não o volume, e um dia
 * curto não pode zerar duas semanas de trabalho.
 *
 * ## A sequência conta só o tempo **medido** — e isto é uma escolha
 *
 * Com a partida valendo 30, deixá-la contar para a sequência derrubaria o
 * mínimo de 60 para **30 minutos reais mais uma caixa marcada**: metade do
 * esforço, pelo mesmo prêmio. A sequência é o número que premia constância, e
 * ela não pode ser mantida por declaração. Então:
 *
 * - a **barra do dia** vai a 90 e inclui a partida (`total`);
 * - a **sequência** e o selo "Uma hora" usam `medido`, que é tática + finais.
 *
 * Inverter isto é um argumento em {@link sequenciaDeDias} e um teste.
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

/**
 * A obrigação combinada com a turma: 45 de tática, 30 de finais, 30 de partida.
 *
 * São 105 na conta do plano mestre, e a meta é 90 porque um dia de rotina
 * cumprida tem de ser alcançável — uma meta que só o dia perfeito bate é uma
 * meta que ninguém bate duas vezes.
 */
export const META_DO_DIA_MIN = 90;

/** Abaixo disto o dia não conta para a sequência. Só tempo **medido**. */
export const MINIMO_DA_SEQUENCIA_MIN = 60;

/**
 * Quanto vale a partida do dia, declarada.
 *
 * É o bloco da rotina do plano mestre: uma partida de 15+10 anotada, com a
 * procura do lance que a decidiu, dá meia hora. O site não a mede porque ela
 * acontece no chess.com — e medir por fora exigiria a API deles e uma
 * conciliação de contas que ninguém pediu.
 */
export const MINUTOS_DA_PARTIDA = 30;

export type MinutosDeHoje = {
  readonly tatica: number;
  readonly finais: number;
  /** {@link MINUTOS_DA_PARTIDA} se o aluno declarou a partida; 0 se não. */
  readonly partida: number;
  /** O que o site **mediu**: tática + finais. É o número da sequência. */
  readonly medido: number;
  /** O dia inteiro: medido + partida. É o número da barra de 90. */
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
export function minutosDeHoje(
  linhas: readonly MinutosDoDia[],
  hoje: string,
  jogouAPartida = false,
): MinutosDeHoje {
  let taticaMs = 0;
  let finaisMs = 0;
  for (const linha of linhas) {
    if (linha.dia !== hoje) continue;
    if (linha.bloco === "tatica") taticaMs += linha.tempo_ms;
    else if (linha.bloco === "finais") finaisMs += linha.tempo_ms;
  }
  const medido = emMinutos(taticaMs + finaisMs);
  const partida = jogouAPartida ? MINUTOS_DA_PARTIDA : 0;
  return {
    tatica: emMinutos(taticaMs),
    finais: emMinutos(finaisMs),
    partida,
    medido,
    total: medido + partida,
  };
}

/**
 * Quantos dias seguidos o aluno treinou o mínimo, terminando hoje.
 *
 * Hoje entra na conta se já bateu o mínimo. Se ainda não bateu, a sequência
 * conta a partir de ontem e continua **viva**: às nove da manhã ninguém treinou
 * ainda, e zerar a sequência do aluno nesse momento seria puni-lo por acordar.
 *
 * **Só tempo medido entra aqui** — ver a §"A sequência conta só o tempo medido"
 * no topo do arquivo. Como esta função soma `tempo_ms` das linhas da view, e a
 * partida não gera linha nenhuma, isso sai de graça: não há nada a excluir.
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

/**
 * A **maior** sequência já atingida, em qualquer ponto do histórico.
 *
 * `sequenciaDeDias` responde *"quantos dias seguidos ele está fazendo agora?"* —
 * um número que sobe e **zera**. Isso serve à tela, e não serve a um selo: um
 * selo é permanente por definição, e um selo que some quando o aluno falta um
 * dia é o site tirando dele uma coisa que ele fez.
 *
 * Daí as duas funções. Esta varre o histórico inteiro e devolve o recorde.
 *
 * **Hoje não é tratado com indulgência aqui**, ao contrário da outra: um dia que
 * ainda não bateu o mínimo simplesmente não entra. A indulgência da outra existe
 * para não punir quem acordou; um recorde não precisa dela, porque ele já conta
 * o passado.
 */
export function maiorSequenciaDeDias(
  linhas: readonly MinutosDoDia[],
  minimo: number = MINIMO_DA_SEQUENCIA_MIN,
): number {
  const porDia = new Map<string, number>();
  for (const linha of linhas) {
    porDia.set(linha.dia, (porDia.get(linha.dia) ?? 0) + linha.tempo_ms);
  }

  const bons = [...porDia.entries()]
    .filter(([, ms]) => emMinutos(ms) >= minimo)
    .map(([dia]) => dia)
    .sort();

  let maior = 0;
  let corrente = 0;
  let anterior: string | null = null;
  for (const dia of bons) {
    corrente = anterior !== null && somarDias(anterior, 1) === dia ? corrente + 1 : 1;
    if (corrente > maior) maior = corrente;
    anterior = dia;
  }
  return maior;
}

/**
 * Em quantos dias distintos o aluno já treinou pelo menos `minimo` minutos
 * **medidos**. É o dado do selo "Uma hora", que acende no primeiro deles.
 */
export function diasComOMinimo(
  linhas: readonly MinutosDoDia[],
  minimo: number = MINIMO_DA_SEQUENCIA_MIN,
): number {
  const porDia = new Map<string, number>();
  for (const linha of linhas) {
    porDia.set(linha.dia, (porDia.get(linha.dia) ?? 0) + linha.tempo_ms);
  }
  return [...porDia.values()].filter((ms) => emMinutos(ms) >= minimo).length;
}

/** Um dia da série, já em minutos e por bloco. */
export type DiaDeTreino = {
  readonly dia: string;
  readonly tatica: number;
  readonly finais: number;
  readonly partida: number;
  /** Tática + finais. É o que decide `bateuMinimo`. */
  readonly medido: number;
  /** Medido + partida. É o que decide `bateuMeta`. */
  readonly total: number;
  /** Bateu a meta de 90 com o dia inteiro? E o mínimo de 60 com o medido? */
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
 *
 * **`partidas` não é opcional por preguiça de quem chama.** Sem ela o gráfico do
 * professor somaria um total e a barra do aluno somaria outro para o mesmo dia
 * — que é exatamente o defeito que esta rodada veio matar. O padrão é o conjunto
 * vazio só para que um teste de série sem partida não precise escrevê-lo.
 */
export function serieDeDias(
  linhas: readonly MinutosDoDia[],
  hoje: string,
  dias = 14,
  partidas: ReadonlySet<string> = new Set(),
  meta: number = META_DO_DIA_MIN,
  minimo: number = MINIMO_DA_SEQUENCIA_MIN,
): DiaDeTreino[] {
  const serie: DiaDeTreino[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    const dia = somarDias(hoje, -i);
    const { tatica, finais, partida, medido, total } = minutosDeHoje(
      linhas,
      dia,
      partidas.has(dia),
    );
    serie.push({
      dia,
      tatica,
      finais,
      partida,
      medido,
      total,
      bateuMeta: total >= meta,
      bateuMinimo: medido >= minimo,
    });
  }
  return serie;
}
