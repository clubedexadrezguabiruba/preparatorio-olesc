"use server";

import { perfilAtual } from "@/lib/auth/perfil";
import { podeVerRascunho } from "@/lib/partidas/carregar";
import { gravarLance, type Gravado, type LanceJogado } from "@/lib/partidas/gravar";

export type { Gravado, LanceJogado } from "@/lib/partidas/gravar";

/**
 * Grava um lance jogado num momento de decisão das partidas modelo.
 *
 * A casca é fina de propósito, como `app/aberturas/acoes.ts`: a primeira linha
 * confere **quem** pede (`perfilAtual` redireciona quem não tem sessão), e o
 * `aluno` que segue é o do cookie, nunca um id do corpo da chamada. Validar o
 * pedido, julgar o lance e derivar "concluída" é de `lib/partidas/gravar.ts`, e a
 * resposta devolve só o que a tela usa.
 */
export async function registrarLance(lance: LanceJogado): Promise<Gravado> {
  const perfil = await perfilAtual();
  return gravarLance(perfil.id, lance, podeVerRascunho(perfil.papel));
}
