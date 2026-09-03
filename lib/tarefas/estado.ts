import { BLOCOS } from "../tatica/blocos.ts";
import type { ProgressoDoTema } from "../tatica/progresso.ts";
import type { Tarefa } from "./tarefas.ts";

/**
 * Se a tarefa está feita — a pergunta, respondida num lugar só.
 *
 * Ela é feita em duas telas: o painel do aluno e, na B1.3, o relatório do
 * professor. Escrita duas vezes, é o painel dizendo "5 de 6" enquanto o
 * relatório diz 4, com o aluno na frente. Por isso o cálculo é **função pura**
 * — recebe conteúdo, marcações e progresso, e não fala com o banco. É o que
 * permite testá-lo sem Supabase nenhum, em `estado.test.ts`.
 */

export type MedidaDeTatica = {
  readonly feitos: number;
  readonly meta: number;
  /** Em porcento, ou `null` enquanto o aluno não resolveu nada. */
  readonly acerto: number | null;
  readonly acertoEsperado: number;
};

export type EstadoDaTarefa = {
  readonly tarefa: Tarefa;
  readonly feita: boolean;
  /** Só nas tarefas de tática. Nas outras, `null`. */
  readonly medida: MedidaDeTatica | null;
};

/** Quantos puzzles o aluno resolveu nos temas destes blocos, e quantos certos. */
export function somarBlocos(
  progresso: ReadonlyMap<string, ProgressoDoTema>,
  blocos: readonly number[],
): { feitos: number; certos: number } {
  const tags = new Set(
    BLOCOS.filter((b) => blocos.includes(b.id)).flatMap((b) => b.temas.map((t) => t.tag)),
  );

  let feitos = 0;
  let certos = 0;
  for (const [tag, p] of progresso) {
    if (!tags.has(tag)) continue;
    feitos += p.tentativas;
    certos += p.certos;
  }
  return { feitos, certos };
}

export function estadoDasTarefas(
  tarefas: readonly Tarefa[],
  marcadas: ReadonlySet<string>,
  progresso: ReadonlyMap<string, ProgressoDoTema>,
): EstadoDaTarefa[] {
  return tarefas.map((tarefa) => {
    if (tarefa.tipo !== "tatica") {
      return { tarefa, feita: marcadas.has(tarefa.id), medida: null };
    }

    const { feitos, certos } = somarBlocos(progresso, tarefa.meta.blocos);
    return {
      tarefa,
      // A contagem de puzzles fecha a tarefa; o acerto não. Ver o comentário
      // de `meta.acerto` em `tarefas.ts`: uma caixa que o aluno não consegue
      // marcar por mais que trabalhe é uma caixa que ensina a desistir.
      feita: feitos >= tarefa.meta.puzzles,
      medida: {
        feitos,
        meta: tarefa.meta.puzzles,
        acerto: feitos ? Math.round((100 * certos) / feitos) : null,
        acertoEsperado: tarefa.meta.acerto,
      },
    };
  });
}

export function quantasFeitas(estados: readonly EstadoDaTarefa[]): number {
  return estados.filter((e) => e.feita).length;
}
