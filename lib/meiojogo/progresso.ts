import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * As dicas de meio-jogo que o aluno declarou ter lido.
 *
 * O gêmeo de `lib/tarefas/progresso.ts`, e pelo mesmo motivo: quem filtra por
 * aluno é a RLS de `dica_lida` (0005), e o parâmetro existe só para o relatório
 * escolher *qual* aluno olhar.
 */
export async function dicasLidas(aluno?: string): Promise<Set<string>> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("dica_lida").select("dica");
  if (aluno) consulta = consulta.eq("aluno", aluno);
  const { data } = await consulta;
  return new Set((data ?? []).map((l) => (l as { dica: string }).dica));
}
