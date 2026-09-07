"use server";

import { revalidatePath } from "next/cache";
import { perfilAtual } from "@/lib/auth/perfil";
import { dicaPorId } from "@/lib/meiojogo/conteudo";
import { gravarTreino, type RespostaDoTreino } from "@/lib/meiojogo/gravar";
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

/**
 * Grava uma resposta do treino.
 *
 * A casca é fina de propósito: quem julga e quem escreve é
 * `lib/meiojogo/gravar.ts`, que roda fora de uma requisição do Next e por isso
 * pode ser provado contra o banco de verdade por `scripts/verificar-meiojogo.ts`.
 * O que só existe aqui é o **quem** — tirado do cookie de sessão, nunca do
 * corpo da chamada, porque a chave de serviço que grava ignora toda a RLS e não
 * tem como perguntar quem pediu.
 *
 * Sem `revalidatePath`: a página da dica não mostra número nenhum de tentativa,
 * e revalidá-la a cada clique jogaria fora o estado do treino em curso.
 */
export async function gravarTentativaDeTreino(dado: RespostaDoTreino): Promise<void> {
  const perfil = await perfilAtual();
  const resultado = await gravarTreino(perfil.id, dado);
  // O erro fica no servidor: a tela do aluno já mostrou o veredito no instante
  // do toque, e uma linha que não gravou é problema do professor, não dele.
  if ("erro" in resultado) console.error(`meio-jogo: ${dado.item} não gravou — ${resultado.erro}`);
}
