"use server";

import { revalidatePath } from "next/cache";
import { gravacaoDoAvatar } from "@/lib/avatar/avatares";
import { idsParaMarcarVistos } from "@/lib/curso/selos-gravados";
import { perfilAtual } from "@/lib/auth/perfil";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type RespostaDoAvatar = { ok: true } | { ok: false; erro: string };

/**
 * Troca o avatar de quem está logado — e só o avatar.
 *
 * **A chave de serviço, e não a RLS.** Desde a 0016 `perfis` não tem política de
 * `update`: pela chave pública o aluno não muda nada no próprio perfil, nem o nome
 * nem o papel. Esta ação é a única porta, e ela fecha as três coisas que a chave
 * não sabe conferir:
 *
 * 1. **quem pede** — o id vem do cookie de sessão (`perfilAtual`), nunca do
 *    navegador, então não há id de outro aluno para forjar;
 * 2. **o que pede** — `gravacaoDoAvatar` aceita só um dos dez ids;
 * 3. **o que grava** — a linha que vai ao banco é montada lá, com uma chave só
 *    (`avatar`). O pedido nunca é repassado ao `update`.
 *
 * O banco ainda tem o `check` da lista, para o dia em que esta ação errar.
 */
export async function escolherAvatar(pedido: unknown): Promise<RespostaDoAvatar> {
  const perfil = await perfilAtual();

  const gravacao = gravacaoDoAvatar(pedido);
  if (!gravacao.ok) return { ok: false, erro: gravacao.erro };

  const { error } = await criarClienteAdmin().from("perfis").update(gravacao.linha).eq("id", perfil.id);
  if (error) return { ok: false, erro: "Não deu para salvar agora. Tente de novo." };

  // O avatar aparece no cabeçalho de toda página do aluno.
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Marca como vistos os selos que o aviso "Selo novo" acabou de mostrar — é o que faz o confete
 * sair **uma vez só** (0018).
 *
 * As mesmas três trancas de `escolherAvatar`: o aluno vem da sessão, os ids passam por
 * `idsParaMarcarVistos` (lista curta de ids bem formados), e o `update` grava só `visto_em`, só
 * nas linhas do aluno e só nas que ainda não tinham sido vistas — marcar duas vezes não mexe na
 * data da primeira.
 *
 * **Sem `revalidatePath`, de propósito.** Revalidar a página agora a redesenharia sem o aviso,
 * que sumiria da tela no mesmo instante em que apareceu. O aviso fica até o aluno fechá-lo ou
 * sair; a próxima visita já chega sem ele.
 */
export async function marcarSelosVistos(pedido: unknown): Promise<{ ok: boolean }> {
  const perfil = await perfilAtual();
  const ids = idsParaMarcarVistos(pedido);
  if (ids.length === 0) return { ok: false };

  const { error } = await criarClienteAdmin()
    .from("selo_conquistado")
    .update({ visto_em: new Date().toISOString() })
    .eq("aluno", perfil.id)
    .in("selo", ids)
    .is("visto_em", null);
  return { ok: !error };
}
