import type { SupabaseClient } from "@supabase/supabase-js";
import { todasAsPaginas } from "../supabase/paginar.ts";
import type { TentativaDoRating } from "./rating-historico.ts";

/**
 * As tentativas do modo rating da turma nos últimos 8 dias, por aluno.
 *
 * Mora fora de `rating-leitura.ts` para receber o cliente de fora: a página do
 * professor passa o cliente com cookie (a RLS deixa o professor ler todas), e
 * `scripts/verificar-tatica-rating.ts` passa a chave de serviço para provar a
 * leitura contra o banco com mais de mil linhas.
 */
export type TentativaDaSemana = Pick<TentativaDoRating, "acertou" | "rating_antes" | "criada_em">;

export async function tentativasDaSemanaDaTurma(
  db: Pick<SupabaseClient, "from">,
  agora: Date = new Date(),
): Promise<Map<string, TentativaDaSemana[]>> {
  // Oito dias atrás cobre com folga os 7 dias de Guabiruba em qualquer fuso;
  // quem corta no dia certo é `semanaDoAluno`.
  const desde = new Date(agora.getTime() - 8 * 24 * 3600 * 1000).toISOString();
  // Paginada: uma turma de 12 que treina todo dia passa de mil respostas na
  // semana, e a API corta em 1.000 sem aviso (`lib/supabase/paginar.ts`).
  const semana = await todasAsPaginas<{ aluno: string; acertou: boolean; rating_antes: number | null; criada_em: string }>(
    (de, ate) =>
      db
        .from("tentativas_puzzle")
        .select("aluno, acertou, rating_antes, criada_em")
        .eq("modo", "rating")
        .gte("criada_em", desde)
        .order("criada_em")
        .order("id")
        .range(de, ate),
  );
  const porAluno = new Map<string, TentativaDaSemana[]>();
  for (const l of semana) {
    if (l.rating_antes === null) continue;
    const lista = porAluno.get(l.aluno) ?? [];
    lista.push({ acertou: l.acertou, rating_antes: l.rating_antes, criada_em: l.criada_em });
    porAluno.set(l.aluno, lista);
  }
  return porAluno;
}
