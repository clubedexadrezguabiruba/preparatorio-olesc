"use server";

import { revalidatePath } from "next/cache";
import { perfilAtual } from "@/lib/auth/perfil";
import { hojeNoBrasil } from "@/lib/curso/calendario";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { AGENDA, TAREFAS } from "@/lib/tarefas/conteudo";

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
 * `tarefa_conclusao`": o aluno marcaria `n1-tatica`, que não tem caixa porque é
 * medida dos puzzles, e apareceria feita no relatório do professor sem um
 * puzzle resolvido.
 *
 * **Dois arquivos, uma coluna.** Desde 2026-09-09 a lista de casa tem duas
 * metades — a rotina do nível (`content/tarefas.json`) e a agenda datada
 * (`content/agenda.json`) — e as duas marcam na mesma `tarefa_conclusao`. Por
 * isso a conferência olha as duas listas, e por isso os ids da agenda têm
 * prefixo `agenda-`: sem ele, uma colisão faria marcar um item da agenda marcar
 * uma tarefa de nível, e ninguém depuraria isso olhando as telas.
 */
export async function alternarTarefa(id: string, marcar: boolean): Promise<void> {
  const perfil = await perfilAtual();

  const daRotina = TAREFAS.find((t) => t.id === id);
  const daAgenda = AGENDA.find((i) => i.id === id);
  if (!daAgenda && (!daRotina || daRotina.tipo !== "marcar")) return;

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

/**
 * Marca ou desmarca a **partida de hoje** — o último bloco da rotina de 2 h.
 *
 * O dia é calculado **aqui**, no servidor, com o fuso de Guabiruba: o cliente
 * não manda data. Sem isso, "joguei hoje" seria uma data digitável, e a
 * sequência do painel viraria ficção com dois cliques.
 *
 * É declaração, como as tarefas de marcar e como a leitura de uma aula: a
 * partida acontece no chess.com, e não há API aberta por nome de usuário para
 * reconferir. A regra editorial é a de `0003_tarefas.sql` — existe verdade no
 * servidor para reconferir? Aqui não existe, então quem grava é o aluno.
 */
export async function marcarPartidaDoDia(marcar: boolean): Promise<void> {
  const perfil = await perfilAtual();
  const dia = hojeNoBrasil();

  const supabase = await criarClienteServidor();

  if (marcar) {
    // A chave `(aluno, dia)` já recusa a segunda marcação; ignorar o conflito
    // é o que impede dois toques no celular de virarem erro na tela.
    await supabase
      .from("partida_do_dia")
      .upsert({ aluno: perfil.id, dia }, { onConflict: "aluno,dia", ignoreDuplicates: true });
  } else {
    await supabase.from("partida_do_dia").delete().eq("aluno", perfil.id).eq("dia", dia);
  }

  revalidatePath("/painel");
}
