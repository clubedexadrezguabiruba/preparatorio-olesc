"use server";

import { revalidatePath } from "next/cache";
import { perfilAtual } from "@/lib/auth/perfil";
import { dicaPorId } from "@/lib/meiojogo/conteudo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * Marca ou desmarca a leitura de uma dica de meio-jogo.
 *
 * É o molde de `marcarLeitura` (`app/finais/acoes.ts`), e pela mesma razão: em
 * meio-jogo não há lance para reconferir, então quem grava é o aluno, com a
 * RLS de `dica_lida` valendo, e o cliente é o do servidor com o cookie dele —
 * **não** o de serviço.
 *
 * A conferência de que a dica existe não é zelo: sem ela, esta ação viraria
 * "escreva qualquer texto na sua linha de `dica_lida`".
 */
export async function marcarDica(id: string, lida: boolean): Promise<void> {
  const perfil = await perfilAtual();
  if (!dicaPorId(id)) return;

  const supabase = await criarClienteServidor();

  if (lida) {
    await supabase
      .from("dica_lida")
      .upsert({ aluno: perfil.id, dica: id }, { onConflict: "aluno,dica", ignoreDuplicates: true });
  } else {
    await supabase.from("dica_lida").delete().eq("dica", id).eq("aluno", perfil.id);
  }

  revalidatePath("/meio-jogo");
  revalidatePath(`/meio-jogo/${id}`);
}
