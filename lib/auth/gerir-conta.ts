/**
 * Excluir a conta de um aluno e gerar um PIN novo (Doug, 18/9/2026) — as regras, sem banco.
 *
 * ## Excluir é apagar tudo
 *
 * A conta sai do Auth do Supabase, e o resto vai junto sozinho: `perfis` aponta para
 * `auth.users` com `on delete cascade`, e todas as tabelas do aluno (tentativas, progresso,
 * selos, níveis, rating…) apontam para `perfis` do mesmo jeito. Conferido no banco em 18/9/2026:
 * 18 chaves, todas `cascade`, e nenhuma tabela guarda o id do aluno sem chave. Não há lixeira —
 * por isso a confirmação é digitar o usuário da conta, e não só um clique.
 *
 * ## Só conta de aluno
 *
 * Conta de professor não se exclui nem troca de PIN por esta tela: um clique errado deixaria o
 * site sem professor, e não há outra tela para criar um.
 */

export type ContaAlvo = { readonly id: string; readonly usuario: string; readonly papel: string };

/** Por que a conta não pode ser excluída, ou `null` se pode. */
export function problemaParaExcluir(conta: ContaAlvo | null, professorId: string, confirmacao: string): string | null {
  if (!conta) return "Essa conta não existe mais.";
  if (conta.id === professorId) return "Você não pode excluir a própria conta.";
  if (conta.papel !== "aluno") return "Só conta de aluno pode ser excluída por aqui.";
  if (confirmacao.trim().toLowerCase() !== conta.usuario.toLowerCase()) {
    return `Para confirmar, digite o usuário exatamente: ${conta.usuario}`;
  }
  return null;
}

/** Por que o PIN não pode ser trocado, ou `null` se pode. */
export function problemaParaNovoPin(conta: ContaAlvo | null): string | null {
  if (!conta) return "Essa conta não existe mais.";
  if (conta.papel !== "aluno") return "Só conta de aluno troca de PIN por aqui.";
  return null;
}
