import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * O que o aluno já marcou como feito.
 *
 * Quem filtra por aluno é a **RLS**, como em todo o resto: a política de
 * `tarefa_conclusao` só entrega as linhas de quem consulta (e todas, se for
 * professor). O parâmetro `aluno` existe para o relatório escolher *qual*
 * aluno olhar, e não para proteger nada.
 */
export async function tarefasMarcadas(aluno?: string): Promise<Set<string>> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("tarefa_conclusao").select("tarefa");
  if (aluno) consulta = consulta.eq("aluno", aluno);

  const { data } = await consulta;
  return new Set((data ?? []).map((l) => (l as { tarefa: string }).tarefa));
}
