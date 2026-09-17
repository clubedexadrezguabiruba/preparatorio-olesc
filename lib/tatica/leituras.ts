import type { SupabaseClient } from "@supabase/supabase-js";
import { todasAsPaginas } from "../supabase/paginar.ts";
import type { LinhaDeTentativa } from "./revisao.ts";

/**
 * As duas leituras de `tentativas_puzzle` que precisam do histórico **inteiro**,
 * com o cliente recebido por parâmetro.
 *
 * Moram fora de `progresso.ts` (que é `server-only` e cria o cliente pelo cookie)
 * para um script poder chamá-las com o cliente de um aluno de verdade e provar,
 * contra o banco, que passam das 1.000 linhas — ver `lib/supabase/paginar.ts`.
 * Quem filtra o aluno continua sendo a RLS do cliente que chega.
 */

/** Todos os ids que o aluno já viu, em qualquer tema e modo. */
export async function idsVistos(cliente: SupabaseClient): Promise<Set<string>> {
  const linhas = await todasAsPaginas<{ puzzle_id: string }>((de, ate) =>
    cliente.from("tentativas_puzzle").select("puzzle_id").order("id").range(de, ate),
  );
  return new Set(linhas.map((l) => l.puzzle_id));
}

/** Todas as linhas do aluno, em ordem de data, nas colunas que a fila de revisão precisa. */
export async function linhasDeTentativasCom(cliente: SupabaseClient, aluno?: string): Promise<LinhaDeTentativa[]> {
  return todasAsPaginas<LinhaDeTentativa>((de, ate) => {
    let consulta = cliente.from("tentativas_puzzle").select("puzzle_id, tema, origem, modo, acertou, criada_em");
    if (aluno) consulta = consulta.eq("aluno", aluno);
    return consulta.order("criada_em").order("id").range(de, ate);
  });
}
