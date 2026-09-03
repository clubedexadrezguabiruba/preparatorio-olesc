/**
 * O calendário do preparatório: quatro sábados e as quatro semanas entre eles.
 *
 * **Uma data escrita num lugar só.** Antes disto, `12 de setembro` aparecia
 * como texto solto em `app/tatica/page.tsx`, para dizer quando um bloco
 * trancado abre. O painel precisa da mesma data para dizer em que semana o
 * aluno está, e a apostila vai precisar dela para imprimir o cabeçalho do
 * caderno. Três cópias da mesma data é uma remarcação de sábado que conserta
 * duas telas e esquece a terceira.
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

export type Semana = 1 | 2 | 3 | 4;

export const SEMANAS: readonly Semana[] = [1, 2, 3, 4];

export type Sabado = {
  readonly semana: Semana;
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

/** O primeiro dia do xadrez na OLESC. A semana 4 termina na véspera. */
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
 * Em que semana o preparatório está.
 *
 * Antes do primeiro sábado a resposta é **1**, e não "nenhuma": quem entra no
 * site em 10 de setembro é o Doug ensaiando a semana 1, e uma tela vazia
 * esconderia justamente o que ele foi conferir. Depois do último sábado a
 * resposta é 4, que é a semana de manutenção e vai até o torneio.
 */
export function semanaAtual(dia: string = hojeNoBrasil()): Semana {
  let semana: Semana = 1;
  for (const sabado of SABADOS) {
    if (dia >= sabado.data) semana = sabado.semana;
  }
  return semana;
}

export function sabadoDaSemana(semana: Semana): Sabado {
  // O `!` é seguro por construção: `SEMANAS` e `SABADOS` são a mesma lista de
  // quatro, e o tipo `Semana` não deixa passar um quinto número.
  return SABADOS.find((s) => s.semana === semana)!;
}

/** O último dia da semana: a véspera do sábado seguinte, ou do torneio. */
export function fimDaSemana(semana: Semana): string {
  const seguinte = SABADOS.find((s) => s.semana === semana + 1);
  return vespera(seguinte?.data ?? COMECO_DO_TORNEIO);
}

function vespera(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
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
