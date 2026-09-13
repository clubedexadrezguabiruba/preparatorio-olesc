/**
 * Quem conta como **aluno** numa contagem de progresso.
 *
 * As tabelas de progresso (`repertorio_progresso`, `finais_progresso`, `avaliacoes_progresso`)
 * guardam o que **qualquer conta** fez — inclusive a do professor, que joga as linhas para
 * testar. No roteiro da fatia 8 do Editor v2 o impacto de aplicar o repertório disse "2
 * registros de 2 alunos", e um dos dois era a conta `professorteste`. Decisão do Doug em
 * 13/9/2026: o impacto conta **só alunos**.
 *
 * Puro: recebe as linhas lidas e o papel de cada conta (de `perfis.papel`), e devolve as
 * contagens. Conta sem papel conhecido não entra — uma conta apagada no meio do caminho não é
 * aluno de ninguém.
 */
export type PapelDaConta = "aluno" | "professor";

export function contarSoAlunos(
  linhas: ReadonlyArray<{ aluno: string }>,
  papelPorConta: ReadonlyMap<string, string>,
): { registros: number; alunos: number } {
  const deAlunos = linhas.filter((linha) => papelPorConta.get(linha.aluno) === "aluno");
  return { registros: deAlunos.length, alunos: new Set(deAlunos.map((linha) => linha.aluno)).size };
}

/** As contas distintas das linhas — é o que se pergunta a `perfis`. */
export function contasDasLinhas(linhas: ReadonlyArray<{ aluno: string }>): string[] {
  return [...new Set(linhas.map((linha) => linha.aluno))].sort();
}
