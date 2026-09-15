import "server-only";
import { hojeNoBrasil } from "@/lib/curso/calendario";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { puzzlesDoTema } from "@/lib/tatica/banco";
import { ORIGEM_BASE, type EstadoDoRating } from "@/lib/tatica/rating";
import {
  historicoPorDia,
  resumo,
  semanaDoAluno,
  temasDaTentativa,
  temasFracos,
  type PontoDoRating,
  type Resumo,
  type SemanaDoAluno,
  type TemaFraco,
  type TentativaDoRating,
} from "@/lib/tatica/rating-historico";
import { tentativasDaSemanaDaTurma } from "@/lib/tatica/rating-turma";

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
 * Quantos problemas do modo rating o aluno respondeu hoje, no dia de Guabiruba.
 * É o "hoje 7 de 70" da tela de jogo (`PROBLEMAS_POR_DIA`).
 */
export async function problemasDeHoje(aluno: string, agora: Date = new Date()): Promise<number> {
  const supabase = await criarClienteServidor();
  // São Paulo não tem horário de verão desde 2019: a meia-noite de lá é −03:00
  // (a mesma conta de `lib/finais/escada.ts`).
  const meiaNoite = new Date(`${hojeNoBrasil(agora)}T00:00:00-03:00`).toISOString();
  const { count, error } = await supabase
    .from("tentativas_puzzle")
    .select("id", { count: "exact", head: true })
    .eq("aluno", aluno)
    .eq("modo", "rating")
    .gte("criada_em", meiaNoite);
  if (error) throw new Error(error.message);
  return count ?? 0;
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
      .select("puzzle_id, origem, acertou, rating_antes, rating_depois, temas, criada_em")
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
 * Os temas fracos de um aluno, cada problema contado por todos os temas que
 * traz (`temasDaTentativa`). Desde a 0014 os temas vêm gravados na tentativa;
 * só uma tentativa de 600–700 anterior a ela obriga a abrir os dois arquivos de
 * `rating-base/` — uma vez por processo, pelo cache de `lib/tatica/banco.ts`.
 */
export async function temasFracosDoAluno(linhas: readonly TentativaDoRating[]): Promise<TemaFraco[]> {
  const precisaDaBase = linhas.some((l) => l.temas === null && l.origem === ORIGEM_BASE);
  const base = precisaDaBase ? new Map((await puzzlesDoTema(ORIGEM_BASE)).map((p) => [p.id, p.temas])) : new Map();
  return temasFracos(
    linhas.map((l) => ({
      temas: temasDaTentativa(l.origem, l.temas, base.get(l.puzzle_id) ?? null),
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

export type RatingNaTurma = EstadoDoRating & {
  readonly semana: SemanaDoAluno;
  /** Quando ele respondeu o último problema (ISO), ou `null` se nunca respondeu. */
  readonly ultimaResposta: string | null;
};

/**
 * O rating de tática de cada aluno da turma, com a semana dele (variação,
 * problemas e acerto) e a última vez que jogou. Só o professor lê todas as
 * linhas — a RLS devolve ao aluno só a dele.
 */
export async function ratingsDaTurma(agora: Date = new Date()): Promise<Map<string, RatingNaTurma>> {
  const supabase = await criarClienteServidor();
  const [{ data: linhas }, porAluno] = await Promise.all([
    supabase.from("rating_tatica").select(`${COLUNAS}, atualizado_em`),
    tentativasDaSemanaDaTurma(supabase, agora),
  ]);
  return new Map(
    ((linhas ?? []) as (LinhaDoRating & { atualizado_em: string })[]).map((l) => [
      l.aluno,
      {
        ...estadoDe(l),
        semana: semanaDoAluno(porAluno.get(l.aluno) ?? [], l.rating, agora),
        // `atualizado_em` nasce com a linha, na primeira abertura do modo; só
        // conta como "jogou" depois de uma resposta.
        ultimaResposta: l.resolvidos > 0 ? l.atualizado_em : null,
      },
    ]),
  );
}
