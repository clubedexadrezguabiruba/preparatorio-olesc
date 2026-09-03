import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { ETAPAS, METAS, type Etapa, type Feitos } from "@/lib/tatica/serie";

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
};

/** Quantos puzzles um tema tem, do aquecimento ao fim da prova. */
export const PUZZLES_POR_TEMA = ETAPAS.reduce((soma, etapa) => soma + METAS[etapa], 0);

export function temaZerado(): ProgressoDoTema {
  return {
    feitos: { aquecimento: 0, serie: 0, prova: 0 },
    acertos: { aquecimento: 0, serie: 0, prova: 0 },
    tentativas: 0,
    certos: 0,
  };
}

type LinhaDaView = {
  aluno: string;
  tema: string;
  modo: string;
  tentativas: number;
  acertos: number;
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
  let consulta = supabase.from("progresso_tema").select("aluno, tema, modo, tentativas, acertos");
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
    });
  }

  return mapa;
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
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("tentativas_puzzle").select("puzzle_id");
  return new Set((data ?? []).map((l) => (l as { puzzle_id: string }).puzzle_id));
}
