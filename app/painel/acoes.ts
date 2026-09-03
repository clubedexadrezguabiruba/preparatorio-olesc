"use server";

import { revalidatePath } from "next/cache";
import { perfilAtual } from "@/lib/auth/perfil";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { TAREFAS } from "@/lib/tarefas/conteudo";

/**
 * Marca ou desmarca uma tarefa de casa.
 *
 * A casca é fina como a de `registrarTentativa`: confere quem pediu, confere
 * que a tarefa existe, e deixa a RLS fazer o resto. O `aluno` que vai para o
 * banco é o do cookie de sessão — a chamada não traz id de aluno nenhum, e por
 * isso não há id para forjar.
 *
 * **A conferência de que a tarefa existe e é do tipo `marcar` não é zelo.** Sem
 * ela, esta ação viraria "escreva qualquer texto na sua linha de
 * `tarefa_conclusao`": o aluno marcaria `s1-tatica`, que não tem caixa porque é
 * medida dos puzzles, e apareceria feita no relatório do professor sem um
 * puzzle resolvido.
 */
export async function alternarTarefa(id: string, marcar: boolean): Promise<void> {
  const perfil = await perfilAtual();

  const tarefa = TAREFAS.find((t) => t.id === id);
  if (!tarefa || tarefa.tipo !== "marcar") return;

  const supabase = await criarClienteServidor();

  if (marcar) {
    // Sem `upsert`: a chave primária `(aluno, tarefa)` já recusa a segunda
    // marcação, e ignorar o conflito é exatamente o que se quer aqui — dois
    // toques no celular não podem virar erro na tela.
    await supabase
      .from("tarefa_conclusao")
      .upsert({ aluno: perfil.id, tarefa: id }, { onConflict: "aluno,tarefa", ignoreDuplicates: true });
  } else {
    await supabase.from("tarefa_conclusao").delete().eq("tarefa", id).eq("aluno", perfil.id);
  }

  revalidatePath("/painel");
}
