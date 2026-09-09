"use server";

import { revalidatePath } from "next/cache";
import { perfilAtual } from "@/lib/auth/perfil";
import { NIVEIS, prontoParaProva } from "@/lib/curso/nivel";
import { estadoParaONivel } from "@/lib/curso/estado";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ultimaProvaDeNivel } from "@/lib/tatica/prova";

/**
 * Encerra a prova de nível: reconfere, corrige, e concede se passou.
 *
 * ## O cliente manda "terminei a prova", nunca "me promova"
 *
 * É a mesma doutrina de `registrarTentativa`: o parâmetro é o nível, e tudo o
 * mais é lido do servidor. O acerto não vem do navegador — as 12 linhas já
 * foram julgadas uma a uma por `gravarTentativa`, contra o arquivo do puzzle no
 * disco. Aqui só se conta o que já está gravado.
 *
 * ## As três conferências, e o que cada uma fecha
 *
 * 1. **`prontoParaProva`**, recalculado no servidor. A prova é o selo, não o
 *    exame de admissão: quem não fechou as três trilhas do nível não a faz, e
 *    o botão escondido na tela não é a barreira — esta linha é.
 * 2. **A prova existe e é desta escada.** `ultimaProvaDeNivel` recusa 12 linhas
 *    que não sejam 12 puzzles distintos de temas deste nível ou anteriores.
 * 3. **A nota.** 9 de 12.
 *
 * ## Por que é o único lugar que escreve em `nivel_conquistado`
 *
 * Com a prova como último passo, nenhuma outra ação pode cruzar um nível:
 * `registrarTentativa` e o resto no máximo deixam o aluno **elegível**. Isso é
 * mais simples que o desenho sem prova, que precisaria de gancho em três ações
 * — e três ganchos é onde a monotonia do nível se perde.
 *
 * A escrita usa a **chave de serviço**, porque `nivel_conquistado` não tem
 * política de `insert` para ninguém (0008): uma política de escrita deixaria o
 * navegador do aluno se promover sozinho.
 */
export async function encerrarProvaDeNivel(nivel: number): Promise<void> {
  const perfil = await perfilAtual();

  const alvo = NIVEIS.find((n) => n === nivel);
  if (alvo === undefined) return;

  const progresso = await estadoParaONivel(perfil.id);
  if (prontoParaProva(progresso) < alvo) return;

  const resultado = await ultimaProvaDeNivel(perfil.id, alvo);
  if (!resultado?.passou) {
    // Reprovar não grava nada, e não pune: os 12 puzzles já entraram na fila de
    // revisão pela porta de sempre. Quem mostra os temas errados é a página.
    revalidatePath(`/nivel/${alvo}/prova`);
    return;
  }

  const admin = criarClienteAdmin();
  // `ignoreDuplicates` porque a tabela é log e a chave é `(aluno, nivel)`:
  // encerrar duas vezes a mesma prova não pode virar erro na tela do aluno.
  await admin
    .from("nivel_conquistado")
    .upsert({ aluno: perfil.id, nivel: alvo }, { onConflict: "aluno,nivel", ignoreDuplicates: true });

  revalidatePath("/painel");
  revalidatePath("/trilha");
  revalidatePath(`/nivel/${alvo}/prova`);
}
