import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { MinutosDoDia } from "@/lib/curso/hoje";

/**
 * Quanto tempo o aluno treinou, por dia — a leitura da view `minutos_por_dia`.
 *
 * A view soma `tempo_ms` de `tentativas_puzzle` e de `tentativas_aula` por
 * aluno, dia (no fuso de Guabiruba) e bloco. Ela existe porque agrupar por dia
 * é `group by`, e o supabase-js não faz `group by` — o mesmo argumento que
 * criou `progresso_tema` na 0002.
 *
 * Quem filtra por aluno é a RLS (`security_invoker`); o parâmetro escolhe
 * *qual* aluno o relatório do professor está olhando.
 */
export async function minutosPorDia(aluno?: string, desde?: string): Promise<MinutosDoDia[]> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("minutos_por_dia").select("dia, bloco, tempo_ms").order("dia");
  if (aluno) consulta = consulta.eq("aluno", aluno);
  if (desde) consulta = consulta.gte("dia", desde);
  const { data } = await consulta;
  return (data ?? []) as MinutosDoDia[];
}

/** O aluno já declarou a partida de hoje? */
export async function partidaDoDiaMarcada(aluno: string, dia: string): Promise<boolean> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("partida_do_dia")
    .select("dia")
    .eq("aluno", aluno)
    .eq("dia", dia)
    .maybeSingle();
  return data !== null;
}

/** Os dias em que o aluno declarou ter jogado, de `desde` para cá. */
export async function partidasDeclaradas(aluno?: string, desde?: string): Promise<Set<string>> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("partida_do_dia").select("dia").order("dia");
  if (aluno) consulta = consulta.eq("aluno", aluno);
  if (desde) consulta = consulta.gte("dia", desde);
  const { data } = await consulta;
  return new Set((data ?? []).map((l) => (l as { dia: string }).dia));
}
