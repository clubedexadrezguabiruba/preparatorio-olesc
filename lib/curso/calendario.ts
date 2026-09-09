/**
 * O calendário do preparatório: os quatro encontros presenciais, e a aritmética
 * de dias de que a revisão espaçada vive.
 *
 * **Uma data escrita num lugar só.** Antes disto, `12 de setembro` aparecia
 * como texto solto em `app/tatica/page.tsx`. Duas cópias da mesma data é uma
 * remarcação de sábado que conserta uma tela e esquece a outra.
 *
 * ## Este arquivo perdeu o poder de tranca em 2026-09-09
 *
 * Ele governava o curso: `semanaAtual()` lia o relógio e decidia o que o painel
 * listava e o que a `/trilha` mostrava como "ainda não chegou". O eixo passou a
 * ser o **nível** (`lib/curso/nivel.ts`), e a data virou o que ela sempre devia
 * ter sido: **agenda**. `SABADOS` e `COMECO_DO_TORNEIO` continuam aqui porque
 * os encontros presenciais continuam existindo, e `content/agenda.json` os
 * aponta pelo rótulo (`lib/tarefas/agenda.ts`) — remarcar um sábado continua
 * sendo mudar uma linha aqui.
 *
 * Saíram `Semana`, `SEMANAS`, `semanaAtual`, `sabadoDaSemana` e `fimDaSemana`:
 * eram as cinco que respondiam "em que semana o aluno está", que é a pergunta
 * que o site deixou de fazer. `Sabado.semana` ficou — ali ele é o **número do
 * encontro**, e é assim que a agenda o nomeia.
 *
 * ## Por que a comparação é de texto e não de `Date`
 *
 * O servidor da Vercel roda em UTC; o aluno está em UTC−3. Um `new Date()`
 * comparado direto viraria sábado às 21h de sexta para quem está em
 * Guabiruba — a semana trocaria na frente do aluno com um dia de
 * antecedência, e as tarefas da semana passada sumiriam antes de acabarem.
 *
 * Então o "hoje" é reduzido a `AAAA-MM-DD` **no fuso de São Paulo** e
 * comparado como texto contra as datas dos sábados, que são strings da mesma
 * forma. Data ISO nesse formato ordena alfabeticamente igual a
 * cronologicamente — a comparação de texto é a comparação de datas, sem
 * biblioteca e sem hora nenhuma no meio.
 */

export type Sabado = {
  /** O número do encontro: "Sábado 2". Não é mais uma semana de calendário. */
  readonly semana: 1 | 2 | 3 | 4;
  /** O dia do encontro, `AAAA-MM-DD`. Todos são sábados — há teste disso. */
  readonly data: string;
  /** O tema do dia, como no plano mestre. */
  readonly titulo: string;
};

export const SABADOS: readonly Sabado[] = [
  { semana: 1, data: "2026-09-12", titulo: "Como funciona o torneio e como eu penso" },
  { semana: 2, data: "2026-09-19", titulo: "Abertura sem susto e tática que ganha peça" },
  { semana: 3, data: "2026-09-26", titulo: "O que fazer quando não tem tática" },
  { semana: 4, data: "2026-10-03", titulo: "Simulado de torneio" },
];

/** O primeiro dia do xadrez na OLESC. A agenda tira a véspera daqui. */
export const COMECO_DO_TORNEIO = "2026-10-11";

const FUSO = "America/Sao_Paulo";

/** O dia de hoje em Guabiruba, como `AAAA-MM-DD`. */
export function hojeNoBrasil(agora: Date = new Date()): string {
  // `en-CA` porque é o único locale comum cujo formato curto já é ISO. A
  // alternativa seria montar a string de `formatToParts`, três linhas para o
  // mesmo resultado.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/**
 * `AAAA-MM-DD` mais `n` dias (ou menos, com `n` negativo).
 *
 * É a aritmética de que a revisão espaçada vive: "errou hoje, volta em 2
 * dias". Feita ao meio-dia UTC de propósito — a data já é um dia inteiro sem
 * fuso, e somar 24 h a partir do meio-dia nunca cruza uma meia-noite por
 * causa de horário de verão em lugar nenhum.
 */
export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Quantos dias de `de` até `ate` (negativo se `ate` vem antes). */
export function diasEntre(de: string, ate: string): number {
  const a = Date.UTC(Number(de.slice(0, 4)), Number(de.slice(5, 7)) - 1, Number(de.slice(8, 10)));
  const b = Date.UTC(Number(ate.slice(0, 4)), Number(ate.slice(5, 7)) - 1, Number(ate.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** `2026-09-12` → `12 de setembro`. Sem o ano: o preparatório inteiro é 2026. */
export function porExtenso(dia: string): string {
  const [, mes, data] = dia.split("-");
  return `${Number(data)} de ${MESES[Number(mes) - 1]}`;
}

/** `2026-09-12` e `2026-09-18` → `12 a 18 de setembro`. */
export function intervaloPorExtenso(de: string, ate: string): string {
  const mesmoMes = de.slice(0, 7) === ate.slice(0, 7);
  return mesmoMes
    ? `${Number(de.split("-")[2])} a ${porExtenso(ate)}`
    : `${porExtenso(de)} a ${porExtenso(ate)}`;
}
