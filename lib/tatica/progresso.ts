import "server-only";
import { hojeNoBrasil } from "@/lib/curso/calendario";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { idsVistos, linhasDeTentativasCom } from "@/lib/tatica/leituras";
import { idsDoTema, origensDoBanco } from "@/lib/tatica/banco";
import { filaDeRevisao, filaServivel, type ItemDaFila, type LinhaDeTentativa } from "@/lib/tatica/revisao";
import { ETAPAS, type Etapa, type Feitos, type LinhaDoTema } from "@/lib/tatica/serie";

/**
 * A leitura do progresso, num lugar só.
 *
 * Três telas fazem a mesma pergunta — a lista de temas, a página do tema e o
 * relatório do professor. Três consultas escritas em três arquivos seriam três
 * chances de o painel dizer 18 e o relatório dizer 17, e o professor teria de
 * escolher em qual acreditar na frente do aluno.
 *
 * Quem filtra por aluno é a **RLS**, não este código: a view
 * `progresso_tema` roda com `security_invoker`, então o aluno logado só
 * enxerga as linhas dele e o professor enxerga as de todos. O parâmetro
 * `aluno` existe para o relatório escolher *qual* aluno olhar, e não para
 * proteger nada — se ele fosse a proteção, apagá-lo não mudaria nada na tela e
 * mudaria tudo na segurança.
 */

export type ProgressoDoTema = {
  /** Tentativas por etapa. */
  readonly feitos: Feitos;
  /** Acertos por etapa. */
  readonly acertos: Feitos;
  readonly tentativas: number;
  readonly certos: number;
  /** Tempo médio por puzzle em cada etapa, em ms; `null` onde não houve tentativa. */
  readonly tempoMedioMs: Record<Etapa, number | null>;
  /** Quando foi a última tentativa neste tema (ISO), ou `null`. */
  readonly ultima: string | null;
};

/**
 * Quantos puzzles um tema tem — reexportado de `lib/tatica/serie.ts`, onde ele
 * passou a morar na F2 para caber numa função pura (ver o comentário de lá).
 * As telas continuam importando daqui, como sempre importaram.
 */
export { PUZZLES_POR_TEMA } from "@/lib/tatica/serie";

export function temaZerado(): ProgressoDoTema {
  return {
    feitos: { aquecimento: 0, serie: 0, prova: 0 },
    acertos: { aquecimento: 0, serie: 0, prova: 0 },
    tentativas: 0,
    certos: 0,
    tempoMedioMs: { aquecimento: null, serie: null, prova: null },
    ultima: null,
  };
}

type LinhaDaView = {
  aluno: string;
  tema: string;
  modo: string;
  tentativas: number;
  acertos: number;
  tempo_medio_ms: number | null;
  ultima: string | null;
};

function ehEtapa(modo: string): modo is Etapa {
  return (ETAPAS as readonly string[]).includes(modo);
}

/**
 * O progresso por tema, do aluno pedido (ou de quem está logado).
 *
 * O modo `torneio` fica de fora de propósito: ele mistura temas e não pertence
 * ao caminho de nenhum deles. Contá-lo aqui faria a barra do tema andar sem o
 * aluno ter aberto o tema.
 */
export async function progressoPorTema(aluno?: string): Promise<Map<string, ProgressoDoTema>> {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("progresso_tema")
    .select("aluno, tema, modo, tentativas, acertos, tempo_medio_ms, ultima");
  if (aluno) consulta = consulta.eq("aluno", aluno);

  const { data } = await consulta;
  const mapa = new Map<string, ProgressoDoTema>();

  for (const linha of (data ?? []) as LinhaDaView[]) {
    if (!ehEtapa(linha.modo)) continue;
    const atual = mapa.get(linha.tema) ?? temaZerado();
    mapa.set(linha.tema, {
      feitos: { ...atual.feitos, [linha.modo]: linha.tentativas },
      acertos: { ...atual.acertos, [linha.modo]: linha.acertos },
      tentativas: atual.tentativas + linha.tentativas,
      certos: atual.certos + linha.acertos,
      tempoMedioMs: { ...atual.tempoMedioMs, [linha.modo]: linha.tempo_medio_ms },
      ultima:
        linha.ultima && (!atual.ultima || linha.ultima > atual.ultima) ? linha.ultima : atual.ultima,
    });
  }

  return mapa;
}

/**
 * As linhas cruas deste aluno num tema — o que a prova precisa para cumprir a
 * promessa de "os errados voltam". Quem filtra o aluno é a RLS.
 */
export async function linhasDoTema(tema: string): Promise<LinhaDoTema[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("tentativas_puzzle")
    .select("puzzle_id, modo, acertou")
    .eq("tema", tema)
    .order("criada_em");
  return (data ?? []) as LinhaDoTema[];
}

/**
 * Todas as linhas do aluno, nas colunas que a fila de revisão precisa.
 *
 * É a lista inteira de propósito: a fila é derivada do histórico, e um
 * histórico pela metade daria uma fila errada em silêncio (um acerto de
 * ontem que não veio "ressuscita" um puzzle que já tinha saído). Com 2 h por
 * dia são umas 500 linhas por mês, de seis colunas curtas — cabe.
 */
export async function linhasDeTentativas(aluno?: string): Promise<LinhaDeTentativa[]> {
  // Paginada (`lib/tatica/leituras.ts`): uma consulta só parava em 1.000 linhas
  // e, em ordem de data, as que sumiam eram as mais novas.
  return linhasDeTentativasCom(await criarClienteServidor(), aluno);
}

/**
 * O que está devido hoje na revisão espaçada, do aluno pedido (ou de quem está
 * logado) — só o que o disco ainda serve (`filaServivel`).
 *
 * A revisão, o painel e a próxima ação leem daqui, e por isso contam a mesma
 * fila: o painel não manda revisar um puzzle que a revisão não consegue abrir.
 */
export async function revisaoDeHoje(aluno?: string): Promise<ItemDaFila[]> {
  return soOServivel(filaDeRevisao(await linhasDeTentativas(aluno), hojeNoBrasil()));
}

/**
 * A fila sem os puzzles que saíram do banco, e com a origem corrigida dos que
 * mudaram de arquivo. Lê os ids dos temas que a fila cita; o índice do modo
 * rating só é aberto se algum item não estiver nem na origem nem no tema.
 */
export async function soOServivel(fila: readonly ItemDaFila[]): Promise<ItemDaFila[]> {
  if (fila.length === 0) return [];
  const tags = [...new Set(fila.flatMap((item) => [item.origem, item.tema]))];
  const ids = new Map(await Promise.all(tags.map(async (tag) => [tag, await idsDoTema(tag)] as const)));
  const estaEm = (tag: string, id: string) => ids.get(tag)?.has(id) ?? false;

  const perdidos = fila.some((i) => !estaEm(i.origem, i.puzzleId) && !estaEm(i.tema, i.puzzleId));
  const origens = perdidos ? await origensDoBanco() : null;

  return filaServivel(fila, { estaEm, outraOrigem: (id) => origens?.get(id) });
}

/**
 * Todos os ids que este aluno já viu, em qualquer tema.
 *
 * Global e não por tema, porque a **prova** mistura temas: um garfo que caiu
 * na prova do mate do corredor não pode voltar como novidade quando o aluno
 * abrir o tema "garfo". Filtrar por tema deixaria essa repetição passar.
 *
 * Quem limita ao próprio aluno é a RLS, como em toda consulta daqui.
 */
export async function puzzlesJaVistos(): Promise<Set<string>> {
  // Paginada pelo mesmo motivo: passado de 1.000, a série repetia problema.
  return idsVistos(await criarClienteServidor());
}
