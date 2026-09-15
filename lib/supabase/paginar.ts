/**
 * Lê **todas** as linhas de uma consulta, de 1.000 em 1.000.
 *
 * A API do Supabase devolve no máximo 1.000 linhas por consulta, **sem erro e
 * sem aviso**: um `select` de 1.005 linhas volta com 1.000, e quem lê acha que
 * leu tudo. Medido em 15/9 contra o banco do projeto (com 1.005 tentativas,
 * `puzzlesJaVistos` e `linhasDeTentativas` leram 1.000 cada).
 *
 * Um aluno de 2 h por dia passa de mil tentativas em uns dois meses. Daí em
 * diante a série sortearia de novo problemas já vistos, e a revisão do dia
 * (que lê em ordem de data) perderia justamente as tentativas **mais novas**.
 *
 * `pagina(de, ate)` monta a consulta com `.range(de, ate)`. Ela precisa de uma
 * ordem **estável e sem empate** (termine o `order` em `id`), senão uma linha
 * pode cair em duas páginas e outra em nenhuma.
 */
export async function todasAsPaginas<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  tamanho = 1000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await pagina(de, de + tamanho - 1);
    if (error) throw new Error(error.message);
    const linhas = data ?? [];
    todas.push(...linhas);
    if (linhas.length < tamanho) return todas;
  }
}
