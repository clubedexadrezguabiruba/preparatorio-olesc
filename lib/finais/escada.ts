import { hojeNoBrasil } from "../curso/calendario.ts";

/**
 * A escada de revisão das aulas de finais — **a mesma de `lib/repertorio/
 * treino.ts`**, aplicada a aulas em vez de linhas de abertura.
 *
 * ## O que ela substitui, e por quê
 *
 * Até 2026-09-08 `dominou()` era um booleano permanente: uma vitória, uma vez,
 * e a aula ficava dominada até o fim do curso. O banco reforçava com `bool_or`
 * e o comentário *"final não se desaprende"*. É bonito e é falso — o aluno de
 * 11 anos que deu o mate de torre na terça não sabe dá-lo no sábado.
 *
 * E havia **dois** sistemas de repetição espaçada rodando em paralelo e
 * desacoplados: este booleano, e o `INTERVALOS_DE_FINAIS = [3, 7, 14]` do
 * antigo `lib/finais/revisao.ts`, que derivava uma agenda lendo o log de
 * eventos. Passam a ser um só, com estado guardado em `finais_progresso`.
 *
 * ## O que "uma passada" quer dizer aqui
 *
 * **Vencer a etapa sem ajuda — a partida contra a máquina —, uma vez.**
 * Decisão do Doug. A etapa "com ajuda" fica sempre disponível como aquecimento
 * e **não entra na conta**: ela não grava linha no banco e não chega a esta
 * função.
 *
 * ## Por que é uma cópia, e não um módulo compartilhado
 *
 * A tentação seria extrair a escada para `lib/curso/` e importá-la dos dois
 * lados. Não foi feito, e a razão é o que os dois lados **não** têm em comum: o
 * repertório mede uma linha de lances decorada e este arquivo mede uma técnica
 * jogada contra um motor. As duas usam hoje os mesmos números por escolha
 * editorial, não por necessidade — e no dia em que os finais precisarem de
 * degraus mais largos (um final de torres não se revisa como uma Escandinava),
 * o módulo compartilhado teria de ganhar um parâmetro que ninguém pediu.
 *
 * O que garante que a cópia não divirja em silêncio é o teste: `escada.test.ts`
 * é `treino.test.ts` portado, caso por caso, e ele quebra se a aritmética
 * mudar de um lado só.
 */

/**
 * Quantos dias cada degrau compra. **O índice é o degrau**, e o zero é o
 * "fora da escada" — aula nunca vencida, ou derrubada por um erro.
 *
 * Os intervalos moram aqui e **não no banco**: quem faz a conta é o TypeScript
 * testado, e uma cópia em SQL seria uma segunda opinião sem teste. O `check` da
 * migration 0007 confere só a coerência entre `degrau` e `revisar_em`.
 *
 * O teto de 30 dias é deliberado: o preparatório inteiro dura quatro semanas,
 * então "30 dias" é o jeito de dizer "esta aula está pronta" com um número em
 * vez de com um estado especial.
 */
export const DEGRAUS_EM_DIAS = [0, 1, 3, 7, 14, 30] as const;

export const DEGRAU_MAXIMO = DEGRAUS_EM_DIAS.length - 1;

/**
 * O degrau em que a aula vira "aprendida".
 *
 * Três, e o que ele conta são **três passadas em dias distintos**: alcançá-lo
 * exige subir três vezes, e só se sobe numa aula vencida — vencer exige que a
 * data tenha passado, e a data mínima é amanhã.
 */
export const DEGRAU_APRENDIDA = 3;

/**
 * Quantos degraus um erro derruba **depois** de a aula estar aprendida.
 *
 * Dois, e não um nem tudo. Um só era pouco — o aluno que esqueceu uma técnica
 * de 30 dias voltaria a 14, e 14 dias é tempo demais para uma aula que ele
 * acabou de errar. Zerar apagaria um mês de intervalo por uma partida perdida,
 * e perder uma partida contra o Stockfish em skill 20 acontece.
 */
export const QUEDA_POR_ERRO = 2;

/** O progresso de uma aula, como `finais_progresso` o guarda. */
export type ProgressoDaEscada = {
  readonly tentativas: number;
  readonly erros: number;
  /** ISO, ou nulo se a aula ainda não chegou ao degrau 3. **Nunca volta a nulo.** */
  readonly aprendidaEm: string | null;
  readonly ultimaEm: string | null;
  /** O degrau da escada. **0 é "fora da escada"**, e é onde o erro joga a aula. */
  readonly degrau: number;
  /** Quando a aula volta a valer degrau. Nulo **se e só se** `degrau` é 0. */
  readonly revisarEm: string | null;
};

export function zerada(): ProgressoDaEscada {
  return {
    tentativas: 0,
    erros: 0,
    aprendidaEm: null,
    ultimaEm: null,
    degrau: 0,
    revisarEm: null,
  };
}

/**
 * A aula está aprendida?
 *
 * Lê `aprendidaEm`, e **não** `degrau >= DEGRAU_APRENDIDA`, de propósito: a
 * data nunca volta a nulo, então uma aula que caiu para o degrau 1 continua
 * aprendida — o aluno aprendeu aquilo um dia, e a tela mostra revisão, não
 * recomeço do zero. Quem quer saber onde ela está *agora* lê o degrau.
 */
export function aprendida(p: ProgressoDaEscada): boolean {
  return p.aprendidaEm !== null;
}

/** A meia-noite em Guabiruba do dia a que este instante pertence. */
function meiaNoiteNoBrasil(agora: string): number {
  return Date.parse(`${hojeNoBrasil(new Date(agora))}T00:00:00-03:00`);
}

/**
 * Quando uma aula neste degrau volta a valer.
 *
 * Conta a partir da **meia-noite de hoje no Brasil**, e não do instante em que
 * o aluno terminou. Sem isso, uma aula vencida às 22h de sábado com um dia de
 * intervalo venceria às 22h de domingo — e o aluno que abre o site depois do
 * almoço de domingo não a veria. O piso de um dia é o que impede uma aula
 * perdida de voltar a vencer na mesma sentada.
 */
function venceEm(degrau: number, agora: string): string {
  const dias = Math.max(1, DEGRAUS_EM_DIAS[degrau] ?? 1);
  return new Date(meiaNoiteNoBrasil(agora) + dias * 86_400_000).toISOString();
}

/**
 * A aula está vencida?
 *
 * A comparação é de **instantes** (`Date.parse`), e não de texto: o Postgres
 * devolve `2026-09-07T03:00:00+00:00` e o TypeScript escreve
 * `2026-09-07T03:00:00.000Z`. As duas strings são o mesmo momento e são
 * diferentes byte a byte — um `localeCompare` aqui erraria calado.
 */
export function vencida(p: ProgressoDaEscada, agora: string): boolean {
  if (p.degrau === 0 || p.revisarEm === null) return false;
  return Date.parse(p.revisarEm) <= Date.parse(agora);
}

/**
 * Quantos dias faltam para a próxima passada, ou nulo se a aula está fora da
 * escada. Zero quer dizer "vencida"; um, "na próxima vez que você abrir".
 */
export function diasAteRevisar(p: ProgressoDaEscada, agora: string): number | null {
  if (p.degrau === 0 || p.revisarEm === null) return null;
  const falta = Date.parse(p.revisarEm) - meiaNoiteNoBrasil(agora);
  return Math.max(0, Math.ceil(falta / 86_400_000));
}

/**
 * O degrau e a data depois de uma passada. É a regra inteira da memória.
 *
 * **Só sobe quem venceu numa aula vencida.** É isto que faz "três dias
 * distintos" sem comparar datas de calendário: vencer exige que a data tenha
 * passado, e a data mínima é amanhã. Jogar oito partidas numa tarde soma oito
 * tentativas e não move o degrau nem a data — o que é o comportamento certo,
 * porque repetir com a posição ainda na retina não é lembrar.
 */
function escadaDepois(
  anterior: ProgressoDaEscada,
  venceu: boolean,
  agora: string,
): { degrau: number; revisarEm: string | null } {
  if (!venceu) {
    // Antes de aprendida, perder é recomeçar. Depois, é descer dois com piso no
    // 1: o aluno aprendeu aquilo um dia, e a aula volta como revisão curta.
    const degrau =
      anterior.degrau >= DEGRAU_APRENDIDA ? Math.max(1, anterior.degrau - QUEDA_POR_ERRO) : 0;
    return { degrau, revisarEm: degrau === 0 ? null : venceEm(degrau, agora) };
  }

  if (anterior.degrau === 0) return { degrau: 1, revisarEm: venceEm(1, agora) };

  // Vitória adiantada: o degrau e a data ficam onde estavam. A guarda do
  // `revisarEm` não nulo conserta um estado impossível — degrau acima de zero
  // sem data —, que aqui se cura sozinho reagendando em vez de propagar.
  if (anterior.revisarEm !== null && !vencida(anterior, agora)) {
    return { degrau: anterior.degrau, revisarEm: anterior.revisarEm };
  }

  // Vencida e ganha: sobe. No teto, o número não muda e a data anda — é a
  // diferença entre "esta aula está pronta" e "esta aula saiu da rotação".
  const degrau = Math.min(DEGRAU_MAXIMO, anterior.degrau + 1);
  return { degrau, revisarEm: venceEm(degrau, agora) };
}

/**
 * Os contadores depois de uma passada pela aula. **É a única aritmética do
 * progresso de finais**, e o servidor a usa: a alternativa seria escrevê-la em
 * SQL dentro de uma função do banco, e aí ela ficaria em dois lugares — um
 * testado e um não.
 *
 * `aprendidaEm` marca a primeira vez que a aula chegou ao `DEGRAU_APRENDIDA`,
 * e fica. Perder depois derruba o degrau, não a data.
 */
export function depoisDaPassada(
  anterior: ProgressoDaEscada,
  venceu: boolean,
  agora: string,
): ProgressoDaEscada {
  const { degrau, revisarEm } = escadaDepois(anterior, venceu, agora);
  return {
    tentativas: anterior.tentativas + 1,
    erros: anterior.erros + (venceu ? 0 : 1),
    aprendidaEm: anterior.aprendidaEm ?? (degrau >= DEGRAU_APRENDIDA ? agora : null),
    ultimaEm: agora,
    degrau,
    revisarEm,
  };
}

/* ------------------------------------------------------------------ *
 * A fila do dia
 * ------------------------------------------------------------------ */

type Progresso = ReadonlyMap<string, ProgressoDaEscada>;

function progressoDe(progresso: Progresso, id: string): ProgressoDaEscada {
  return progresso.get(id) ?? zerada();
}

/**
 * As aulas cuja data de revisão já passou, da mais vencida para a menos.
 *
 * É o que o cartão do painel mostra, e substitui o `revisoesDevidas` do antigo
 * `revisao.ts`. A diferença que importa: aquele derivava a agenda relendo o log
 * de eventos a cada tela, este lê um estado que o servidor já escreveu.
 */
export function aulasVencidas(
  aulas: readonly string[],
  progresso: Progresso,
  agora: string,
): string[] {
  return aulas
    .filter((id) => vencida(progressoDe(progresso, id), agora))
    .sort(
      (a, b) =>
        Date.parse(progressoDe(progresso, a).revisarEm!) -
        Date.parse(progressoDe(progresso, b).revisarEm!),
    );
}

/**
 * As aulas que o aluno já aprendeu, entre as que lhe foram dadas.
 *
 * Substitui `dominadas()` da trilha, e a diferença é toda a mudança deste
 * bloco: aquilo era "venceu uma vez, para sempre"; isto é "chegou ao degrau 3,
 * com três passadas em dias distintos".
 */
export function aprendidas(aulas: readonly string[], progresso: Progresso): Set<string> {
  const feitas = new Set<string>();
  for (const id of aulas) {
    if (aprendida(progressoDe(progresso, id))) feitas.add(id);
  }
  return feitas;
}
