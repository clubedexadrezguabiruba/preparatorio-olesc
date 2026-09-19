/** As métricas factuais que um aluno pode ver dos colegas da própria turma. */
export type ResumoDeAtividade = {
  readonly puzzlesFeitos: number;
  readonly puzzlesCertos: number;
  readonly puzzlesErrados: number;
  /** Tempo realmente medido pelas atividades, nunca tempo de aba aberta. */
  readonly tempoMs: number;
  /** Linhas distintas que receberam ao menos uma passada. */
  readonly linhasEstudadas: number;
  /** Linhas que chegaram ao terceiro degrau, em dias distintos. */
  readonly linhasDominadas: number;
  /** Rating atual da Tática Rating; nulo enquanto o aluno não abriu o modo. */
  readonly ratingTatica: number | null;
};

export const ATIVIDADE_ZERADA: ResumoDeAtividade = {
  puzzlesFeitos: 0,
  puzzlesCertos: 0,
  puzzlesErrados: 0,
  tempoMs: 0,
  linhasEstudadas: 0,
  linhasDominadas: 0,
  ratingTatica: null,
};

export type LinhaDePuzzle = { aluno: string; tentativas: number; acertos: number };
export type LinhaDeTempo = { aluno: string; tempo_ms: number };
export type LinhaDeAbertura = { aluno: string; tentativas: number; aprendida_em: string | null };
export type LinhaDeRating = { aluno: string; rating: number };

export function resumirAtividades(
  alunos: readonly string[],
  puzzles: readonly LinhaDePuzzle[],
  tempos: readonly LinhaDeTempo[],
  aberturas: readonly LinhaDeAbertura[],
  ratings: readonly LinhaDeRating[],
): Map<string, ResumoDeAtividade> {
  type Mutavel = { -readonly [K in keyof ResumoDeAtividade]: ResumoDeAtividade[K] };
  const permitidos = new Set(alunos);
  const mutavel = new Map<string, Mutavel>(alunos.map((id) => [id, { ...ATIVIDADE_ZERADA }]));
  const de = (id: string) => {
    const atual = mutavel.get(id) ?? { ...ATIVIDADE_ZERADA };
    mutavel.set(id, atual);
    return atual;
  };

  for (const linha of puzzles) {
    if (!permitidos.has(linha.aluno)) continue;
    const atual = de(linha.aluno);
    atual.puzzlesFeitos += linha.tentativas;
    atual.puzzlesCertos += linha.acertos;
    atual.puzzlesErrados += Math.max(0, linha.tentativas - linha.acertos);
  }
  for (const linha of tempos) {
    if (permitidos.has(linha.aluno)) de(linha.aluno).tempoMs += Math.max(0, linha.tempo_ms);
  }
  for (const linha of aberturas) {
    if (!permitidos.has(linha.aluno)) continue;
    const atual = de(linha.aluno);
    if (linha.tentativas > 0) atual.linhasEstudadas += 1;
    if (linha.aprendida_em !== null) atual.linhasDominadas += 1;
  }
  for (const linha of ratings) {
    if (permitidos.has(linha.aluno)) de(linha.aluno).ratingTatica = linha.rating;
  }

  return mutavel;
}

/** Mais tempo medido primeiro; empate estritamente alfabético. Não há pontos nem posição. */
export function ordenarPorTempo<T extends { readonly id: string; readonly nome: string; readonly atividade: ResumoDeAtividade }>(
  pessoas: readonly T[],
): T[] {
  const nomes = new Intl.Collator("pt-BR", { sensitivity: "base" });
  return [...pessoas].sort(
    (a, b) => b.atividade.tempoMs - a.atividade.tempoMs || nomes.compare(a.nome, b.nome) || a.id.localeCompare(b.id),
  );
}

export function percentualDeAcerto(atividade: Pick<ResumoDeAtividade, "puzzlesFeitos" | "puzzlesCertos">): number | null {
  return atividade.puzzlesFeitos > 0 ? Math.round((100 * atividade.puzzlesCertos) / atividade.puzzlesFeitos) : null;
}

export function formatarTempoEstudo(tempoMs: number): string {
  const minutos = Math.max(0, Math.floor(tempoMs / 60_000));
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}
