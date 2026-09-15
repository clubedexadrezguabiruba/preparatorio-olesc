import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoDoRating } from "@/lib/tatica/rating";

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
  resolvidos: number;
};

function estadoDe(l: LinhaDoRating): EstadoDoRating {
  return {
    rating: l.rating,
    sequencia: l.sequencia,
    melhorSequencia: l.melhor_sequencia,
    ratingMaximo: l.rating_maximo,
    resolvidos: l.resolvidos,
  };
}

const COLUNAS = "aluno, rating, sequencia, melhor_sequencia, rating_maximo, resolvidos";

/** O rating do aluno, ou `null` se ele nunca abriu o modo. */
export async function ratingDoAluno(aluno: string): Promise<EstadoDoRating | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("rating_tatica").select(COLUNAS).eq("aluno", aluno).maybeSingle();
  return data ? estadoDe(data as LinhaDoRating) : null;
}
