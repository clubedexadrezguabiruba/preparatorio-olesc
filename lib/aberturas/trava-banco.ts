import "server-only";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { cursosDeAbertura, todasAsAulasDeAbertura, type AulaDoCurso } from "./curso.ts";
import { linhasTrancadas, TRAVA_POR_AULA, type QuemPede } from "./trava.ts";

/**
 * A trava por aula com os dados do aluno — a leitura que `trava.ts` não faz.
 *
 * **Uma consulta só**, a `aula_rodada` do aluno nas aulas de abertura publicadas, e dela saem as
 * três respostas que as telas e o servidor pedem: quais aulas ele concluiu, quais têm rodada em
 * andamento (e quantas etapas feitas), e quais linhas estão trancadas no repertório inteiro.
 *
 * Quem pergunta pela trava é o servidor (`gravarTreino`) e as páginas — e as duas têm de ver o
 * mesmo número. Por isso a conta das trancadas mora aqui, e não em cada página.
 */

export type TravaDoAluno = {
  readonly quem: QuemPede;
  /** Todas as aulas de abertura publicadas, em ordem dentro de cada curso. */
  readonly aulas: readonly AulaDoCurso[];
  /** As aulas agrupadas por `cor/abertura`. */
  readonly cursos: ReadonlyMap<string, readonly AulaDoCurso[]>;
  /** Aulas concluídas ao menos uma vez, com quantas vezes. */
  readonly concluidas: ReadonlyMap<string, number>;
  /** Aulas com rodada em andamento, com as etapas já feitas nela. */
  readonly abertas: ReadonlyMap<string, readonly string[]>;
  /** As linhas trancadas, somando todos os cursos. Vazio para o professor e com a chave desligada. */
  readonly trancadas: ReadonlySet<string>;
};

type LinhaDaRodada = { aula: string; etapas_feitas: string[]; concluida_em: string | null };

export async function travaDoAluno(perfil: { id: string; papel: string }): Promise<TravaDoAluno> {
  const quem: QuemPede = { professor: perfil.papel === "professor" };
  const aulas = todasAsAulasDeAbertura();
  const cursos = cursosDeAbertura(aulas);
  const concluidas = new Map<string, number>();
  const abertas = new Map<string, string[]>();

  if (aulas.length > 0) {
    const { data, error } = await criarClienteAdmin()
      .from("aula_rodada")
      .select("aula, etapas_feitas, concluida_em")
      .eq("aluno", perfil.id)
      .in("aula", aulas.map((aula) => aula.id));
    // Sem a leitura não há como saber o que está concluído. Tratar como "nada concluído" trancaria
    // o aluno em silêncio; lançar mostra o erro — é a mesma escolha de `abrirRodada`.
    if (error) throw new Error(`não foi possível ler as rodadas das aulas: ${error.message}`);
    for (const linha of (data ?? []) as LinhaDaRodada[]) {
      if (linha.concluida_em !== null) concluidas.set(linha.aula, (concluidas.get(linha.aula) ?? 0) + 1);
      else abertas.set(linha.aula, linha.etapas_feitas);
    }
  }

  const feitas = new Set(concluidas.keys());
  const trancadas = new Set<string>();
  for (const doCurso of cursos.values()) {
    for (const id of linhasTrancadas(doCurso, feitas, quem, TRAVA_POR_AULA)) trancadas.add(id);
  }
  return { quem, aulas, cursos, concluidas, abertas, trancadas };
}
