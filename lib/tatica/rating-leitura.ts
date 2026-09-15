import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { puzzlesDoTema } from "@/lib/tatica/banco";
import { ORIGEM_BASE, type EstadoDoRating } from "@/lib/tatica/rating";
import {
  historicoPorDia,
  resumo,
  temasDaTentativa,
  temasFracos,
  variacaoNaSemana,
  type PontoDoRating,
  type Resumo,
  type TemaFraco,
  type TentativaDoRating,
} from "@/lib/tatica/rating-historico";

/**
 * A leitura do modo rating para as telas — do cartão de `/tatica` à tabela da
 * turma do professor.
 *
 * Tudo aqui usa o cliente com o cookie de sessão, e **quem filtra é a RLS**
 * (`0011_tatica_rating.sql`): o aluno lê a própria linha, o professor lê todas.
 * O parâmetro `aluno` escolhe *qual* aluno o professor olha; não protege nada.
 * A escrita não mora aqui: é `lib/tatica/gravar-rating.ts`, com a chave de
 * serviço, depois de julgar.
 */

type LinhaDoRating = {
  aluno: string;
  rating: number;
  sequencia: number;
  melhor_sequencia: number;
  rating_maximo: number;
  rating_inicial: number | null;
  resolvidos: number;
};

function estadoDe(l: LinhaDoRating): EstadoDoRating {
  return {
    rating: l.rating,
    sequencia: l.sequencia,
    melhorSequencia: l.melhor_sequencia,
    ratingMaximo: l.rating_maximo,
    ratingInicial: l.rating_inicial ?? l.rating_maximo,
    resolvidos: l.resolvidos,
  };
}

const COLUNAS = "aluno, rating, sequencia, melhor_sequencia, rating_maximo, rating_inicial, resolvidos";

/** O rating do aluno, ou `null` se ele nunca abriu o modo. */
export async function ratingDoAluno(aluno: string): Promise<EstadoDoRating | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("rating_tatica").select(COLUNAS).eq("aluno", aluno).maybeSingle();
  return data ? estadoDe(data as LinhaDoRating) : null;
}

/**
 * Todas as tentativas do modo rating de um aluno, em ordem de data.
 *
 * Pagina, pelo motivo de `idsJaVistos` em `gravar-rating.ts`: a API devolve no
 * máximo 1.000 linhas por consulta, e um gráfico cortado em mil tentativas
 * pararia no meio da evolução sem erro nenhum.
 */
export async function tentativasDoRating(aluno: string): Promise<TentativaDoRating[]> {
  const supabase = await criarClienteServidor();
  const todas: TentativaDoRating[] = [];
  const PAGINA = 1000;
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("tentativas_puzzle")
      .select("puzzle_id, origem, acertou, rating_antes, rating_depois, criada_em")
      .eq("aluno", aluno)
      .eq("modo", "rating")
      .order("criada_em")
      .order("id")
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    const pagina = (data ?? []) as TentativaDoRating[];
    todas.push(...pagina.filter((l) => l.rating_antes !== null && l.rating_depois !== null));
    if (pagina.length < PAGINA) return todas;
  }
}

/**
 * Os temas fracos de um aluno, com os problemas de 600–700 contados pelos temas
 * que eles próprios trazem (`temasDaTentativa`). Por isso esta leitura abre os
 * dois arquivos de `rating-base/` — uma vez por processo, pelo cache de
 * `lib/tatica/banco.ts`.
 */
export async function temasFracosDoAluno(linhas: readonly TentativaDoRating[]): Promise<TemaFraco[]> {
  const precisaDaBase = linhas.some((l) => l.origem === ORIGEM_BASE);
  const base = precisaDaBase ? new Map((await puzzlesDoTema(ORIGEM_BASE)).map((p) => [p.id, p.temas])) : new Map();
  return temasFracos(
    linhas.map((l) => ({
      temas: temasDaTentativa(l.origem, l.origem === ORIGEM_BASE ? (base.get(l.puzzle_id) ?? null) : null),
      acertou: l.acertou,
    })),
  );
}

export type EvolucaoDoAluno = {
  readonly estado: EstadoDoRating;
  readonly pontos: readonly PontoDoRating[];
  readonly resumo: Resumo;
  readonly fracos: readonly TemaFraco[];
  /** As últimas tentativas, da mais recente para a mais antiga. */
  readonly ultimas: readonly TentativaDoRating[];
};

/** Tudo o que a evolução mostra — do aluno logado, ou do aluno que o professor abriu. */
export async function evolucaoDoAluno(aluno: string, quantasUltimas = 10): Promise<EvolucaoDoAluno | null> {
  const [estado, linhas] = await Promise.all([ratingDoAluno(aluno), tentativasDoRating(aluno)]);
  if (!estado) return null;
  return {
    estado,
    pontos: historicoPorDia(linhas),
    resumo: resumo(linhas),
    fracos: await temasFracosDoAluno(linhas),
    ultimas: linhas.slice(-quantasUltimas).reverse(),
  };
}

export type RatingNaTurma = EstadoDoRating & { readonly variacao7Dias: number };

/**
 * O rating de tática de cada aluno da turma, com a variação dos últimos 7 dias.
 * Só o professor lê todas as linhas — a RLS devolve ao aluno só a dele.
 */
export async function ratingsDaTurma(agora: Date = new Date()): Promise<Map<string, RatingNaTurma>> {
  const supabase = await criarClienteServidor();
  // Oito dias atrás cobre com folga os 7 dias de Guabiruba em qualquer fuso;
  // quem corta no dia certo é `variacaoNaSemana`.
  const desde = new Date(agora.getTime() - 8 * 24 * 3600 * 1000).toISOString();
  const [{ data: linhas }, { data: semana }] = await Promise.all([
    supabase.from("rating_tatica").select(COLUNAS),
    supabase
      .from("tentativas_puzzle")
      .select("aluno, rating_antes, criada_em")
      .eq("modo", "rating")
      .gte("criada_em", desde)
      .order("criada_em")
      .limit(10_000),
  ]);
  const porAluno = new Map<string, { rating_antes: number; criada_em: string }[]>();
  for (const l of (semana ?? []) as { aluno: string; rating_antes: number | null; criada_em: string }[]) {
    if (l.rating_antes === null) continue;
    const lista = porAluno.get(l.aluno) ?? [];
    lista.push({ rating_antes: l.rating_antes, criada_em: l.criada_em });
    porAluno.set(l.aluno, lista);
  }
  return new Map(
    ((linhas ?? []) as LinhaDoRating[]).map((l) => [
      l.aluno,
      { ...estadoDe(l), variacao7Dias: variacaoNaSemana(porAluno.get(l.aluno) ?? [], l.rating, agora) },
    ]),
  );
}
