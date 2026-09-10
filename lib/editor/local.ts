/**
 * A tranca de ambiente do modo editor.
 *
 * O editor escreve **arquivos do repositório**. Isso é seguro na máquina do
 * professor e é um buraco em qualquer outro lugar: o disco da Vercel é somente
 * leitura (a escrita falharia, mas a *tela* existiria, e uma tela de edição
 * publicada é um convite), e um `next dev` aberto por um agente ou por um teste
 * não deveria abrir a porta sem que ninguém tenha pedido.
 *
 * Por isso são **três** condições, e não uma:
 *
 * - `NODE_ENV === "development"` — a build de produção não tem o editor. Este é
 *   o corte que o `next build` enxerga: a página chama `notFound()` e some.
 * - `VERCEL` ausente — a Vercel roda `next dev` em alguns fluxos de inspeção, e
 *   ela injeta `VERCEL=1` em todos eles. Cinto sobre a suspensória do primeiro.
 * - `EDITOR_LOCAL === "1"` — a chave que o Doug escreve no `.env.local` dele.
 *   É o que separa "o professor abriu o editor" de "alguém rodou `npm run dev`".
 *
 * Nada disto é autenticação. A tranca de verdade é o login de professor
 * (`professorAtual()`, conferido em `exigirEditor`); esta função só decide se a
 * porta existe. As duas são cobradas juntas, e nesta ordem, porque `next dev`
 * não restringe host: quem estiver na mesma rede alcança a porta 3000.
 *
 * O parâmetro `env` existe para o teste poder montar os quatro ambientes sem
 * mexer no `process.env` do processo que roda os testes — não para produção
 * passar outra coisa.
 */
export function editorLigado(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development" && !env.VERCEL && env.EDITOR_LOCAL === "1";
}

/**
 * Por que a porta está fechada, em português, para o terminal do Doug.
 *
 * Só é chamada quando `editorLigado()` deu `false`, e serve a um caso real: o
 * Doug abre `/editor`, leva 404, e não sabe se esqueceu a chave, se está numa
 * build de produção, ou se o editor nunca existiu. A página não conta nada
 * (404 é 404, e explicar a um estranho qual variável falta é dar mapa), mas o
 * log do servidor conta.
 */
export function motivoDoEditorFechado(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (editorLigado(env)) return null;
  if (env.NODE_ENV !== "development") {
    return `o editor só existe em desenvolvimento (NODE_ENV=${env.NODE_ENV ?? "ausente"})`;
  }
  if (env.VERCEL) return "o editor não existe na Vercel (VERCEL está definida)";
  return "falta EDITOR_LOCAL=1 no .env.local — o editor não abre sem pedido explícito";
}
