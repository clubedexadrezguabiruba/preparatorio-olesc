import "server-only";
import { notFound } from "next/navigation";
import { professorAtual, type Perfil } from "@/lib/auth/perfil";
import { editorLigado, motivoDoEditorFechado } from "./local.ts";

/**
 * A porta do modo editor. Toda página de `app/editor/**` e toda ação de
 * `app/editor/acoes.ts` começam por esta linha.
 *
 * ## Duas trancas, nesta ordem
 *
 * 1. **A porta existe?** `editorLigado()` — desenvolvimento, fora da Vercel, e
 *    `EDITOR_LOCAL=1` no `.env.local` do Doug. Se não, `notFound()`: a rota
 *    responde 404 como qualquer endereço inventado. Não é 403, e a diferença
 *    importa — um 403 diria a um estranho que existe um editor ali.
 * 2. **Quem é?** `professorAtual()`, a mesma tranca de `/professor`. `next dev`
 *    não restringe host: quem estiver na mesma rede alcança a porta 3000, e a
 *    primeira trava não sabe disso. Esta é a tranca de verdade.
 *
 * `professorAtual()` **não devolve `false`**: ele faz `redirect("/painel")`
 * quando o papel não é professor, e `redirect` lança. Então esta função ou
 * devolve o perfil do professor, ou nunca devolve — não existe caminho em que
 * quem chamou precise conferir o retorno para saber se pode escrever.
 *
 * ## Por que o marcador `server-only` está aqui, e não na camada de disco
 *
 * `server-only` só é inofensivo sob a condição `react-server`, e `npm test`
 * roda sem ela. Pôr o marcador em `lib/editor/rascunhos.ts` custaria os testes
 * de concorrência e de interrupção, que são o que impede o editor de estragar
 * conteúdo em silêncio. Aqui não custa nada: este arquivo não tem teste, porque
 * o que ele faz é chamar duas funções que já têm o seu.
 */
export async function exigirEditor(): Promise<Perfil> {
  if (!editorLigado()) {
    // A página não conta nada a quem bateu (404 é 404), mas o terminal do Doug
    // conta: o caso real é ele abrir `/editor`, levar 404, e não saber se
    // esqueceu a chave ou se está numa build de produção.
    console.warn(`[editor] porta fechada — ${motivoDoEditorFechado()}`);
    notFound();
  }
  return professorAtual();
}
