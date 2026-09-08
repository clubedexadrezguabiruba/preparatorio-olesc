import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { DICAS } from "./conteudo.ts";

/**
 * As dicas de meio-jogo que o aluno **resolveu** — e não as que ele declarou
 * ter lido.
 *
 * ## O que mudou, e por quê
 *
 * Até 2026-09-07 a unidade era `dica_lida`: uma caixa no pé da página, marcada
 * pelo aluno. O Doug a tirou junto com o quiz, e a razão é a mesma que derrubou
 * o exercício de clicar na casa — declaração não é medida. Uma criança que rola
 * a página até o fim e marca "li" produz o mesmo número que outra que leu,
 * pensou e jogou o lance.
 *
 * A tabela `dica_lida` **não** foi apagada: ela guarda o que os alunos já
 * declararam, e uma migration que a derrubasse jogaria fora histórico para não
 * ganhar nada. O que mudou é quem lê o quê.
 *
 * ## Todos os exercícios, e não o primeiro
 *
 * Uma dica conta quando o aluno acertou **cada um** dos exercícios dela pelo
 * menos uma vez — decisão do Doug em 2026-09-07. É o que "resolveu os
 * exercícios da dica" quer dizer em português, e a escada de apoio de três
 * níveis garante que dá para chegar lá: pedir ajuda não impede o acerto, só
 * fica registrado na coluna `apoio`.
 *
 * O efeito colateral é declarado: uma dica **sem** exercício não pode contar,
 * porque não há o que resolver. São 22 das 30 hoje, e é por isso que as tarefas
 * de meio-jogo das semanas 1, 3 e 4 viraram tarefa de marcar — não há medida a
 * fazer ali, e fingir que há seria repetir o defeito que este arquivo corrige.
 */
export async function dicasResolvidas(aluno?: string): Promise<Set<string>> {
  const supabase = await criarClienteServidor();
  // Quem filtra por aluno é a RLS de `tentativa_meiojogo`; o parâmetro existe
  // para o relatório do professor escolher *qual* aluno olhar.
  let consulta = supabase.from("tentativa_meiojogo").select("dica, item").eq("acertou", true);
  if (aluno) consulta = consulta.eq("aluno", aluno);
  const { data } = await consulta;

  const acertados = new Set((data ?? []).map((l) => (l as { item: string }).item));

  const resolvidas = new Set<string>();
  for (const dica of DICAS) {
    const exercicios = dica.treino?.exercicios ?? [];
    if (exercicios.length === 0) continue;
    if (exercicios.every((e) => acertados.has(e.id))) resolvidas.add(dica.id);
  }
  return resolvidas;
}

/**
 * Quantos exercícios de cada dica o aluno já resolveu.
 *
 * É a mesma consulta de {@link dicasResolvidas}, guardada em vez de reduzida a
 * um sim/não: a pastilha da trilha mostra "3 de 5", e sem o numerador o aluno
 * que resolveu quatro dos cinco veria a mesma coisa que quem não abriu a dica.
 */
export async function exerciciosResolvidos(aluno?: string): Promise<Map<string, number>> {
  const supabase = await criarClienteServidor();
  let consulta = supabase.from("tentativa_meiojogo").select("dica, item").eq("acertou", true);
  if (aluno) consulta = consulta.eq("aluno", aluno);
  const { data } = await consulta;

  const acertados = new Set((data ?? []).map((l) => (l as { item: string }).item));
  const conta = new Map<string, number>();
  for (const dica of DICAS) {
    const exercicios = dica.treino?.exercicios ?? [];
    if (exercicios.length === 0) continue;
    conta.set(dica.id, exercicios.filter((e) => acertados.has(e.id)).length);
  }
  return conta;
}
