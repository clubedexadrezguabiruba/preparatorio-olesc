import type { NextRequest } from "next/server";
import { renovarSessao } from "@/lib/supabase/sessao";

/**
 * O Next 16 chama este arquivo de `proxy.ts` — era `middleware.ts` até a
 * versão 15. Renomeá-lo de volta faz o guarda parar de rodar **em silêncio**:
 * as rotas continuam respondendo, só que sem sessão e sem barreira.
 */
export async function proxy(request: NextRequest) {
  return renovarSessao(request);
}

export const config = {
  matcher: [
    // Fora do guarda: os estáticos do Next, os ícones e — a entrada que
    // importa — `puzzles/`, que são 33 MB de JSON público (banco do Lichess,
    // CC0, sem nada de aluno dentro).
    //
    // `apostila/` entra pelo mesmo critério: são os cadernos em PDF, material
    // de aula sem nada de aluno dentro, e o link para eles sai impresso no
    // caderno e no painel. Atrás do guarda, um cookie vencido faria o aluno
    // clicar em "Caderno 1 em PDF" no domingo e cair na tela de login sem
    // entender por quê — e o professor não poderia mandar o mesmo link para os
    // pais.
    //
    // Sem essa isenção, **cada arquivo de tema baixado passaria por uma ida ao
    // Supabase**, e com um modo de falha feio: cookie vencendo no meio da
    // série vira 307 para `/entrar`, o `fetch` segue o redirecionamento, o
    // `.json()` recebe HTML e estoura — e o aluno vê "erro ao carregar" no
    // meio da tarefa.
    "/((?!_next/static|_next/image|favicon.ico|puzzles/|engine/|apostila/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|wasm)$).*)",
  ],
};
