import { aulaDaTrilha, type Classe } from "../finais/trilha.ts";
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
  readonly tipo: "tatica";
  readonly feitos: number;
  readonly meta: number;
  /** Em porcento, ou `null` enquanto o aluno não resolveu nada. */
  readonly acerto: number | null;
  readonly acertoEsperado: number;
};

/**
 * A medida da tarefa de finais. Sem acerto, e não por esquecimento: a aula
 * dominada já é o acerto — não existe "dominou 6 aulas com 64% de acerto".
 */
export type MedidaDeFinais = {
  readonly tipo: "finais";
  readonly feitos: number;
  readonly meta: number;
};

/**
 * As duas medidas carregam a etiqueta do seu tipo porque a tela desenha a mesma
 * barra para as duas e escreve palavras diferentes embaixo — "puzzles" de um
 * lado, "aulas dominadas" do outro. Sem a etiqueta, a tela teria de reabrir a
 * tarefa para descobrir o que a barra está medindo.
 */
export type Medida = MedidaDeTatica | MedidaDeFinais;

export type EstadoDaTarefa = {
  readonly tarefa: Tarefa;
  readonly feita: boolean;
  /** Só nas tarefas medidas. Nas de marcar, `null`. */
  readonly medida: Medida | null;
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

/**
 * Quantas das aulas dominadas pertencem a estas classes.
 *
 * `dominadas` já vem calculada — é `dominadas()` da trilha, aplicada às aulas
 * **abertas**. Aqui só resta a filtragem por classe, e ela consulta a trilha
 * pelo id: a classe de uma aula é dado do curso, não algo que a tarefa repita.
 */
export function somarFinais(
  dominadas: ReadonlySet<string>,
  classes: readonly Classe[],
): number {
  let total = 0;
  for (const id of dominadas) {
    const aula = aulaDaTrilha(id);
    if (aula && classes.includes(aula.classe)) total += 1;
  }
  return total;
}

export function estadoDasTarefas(
  tarefas: readonly Tarefa[],
  marcadas: ReadonlySet<string>,
  progresso: ReadonlyMap<string, ProgressoDoTema>,
  /**
   * As aulas de finais que o aluno dominou, entre as abertas. Vazio por padrão
   * para que as telas que não têm finais nenhum — a apostila, um teste de
   * tática — não tenham de inventar um conjunto.
   */
  finais: ReadonlySet<string> = new Set(),
): EstadoDaTarefa[] {
  return tarefas.map((tarefa) => {
    if (tarefa.tipo === "marcar") {
      return { tarefa, feita: marcadas.has(tarefa.id), medida: null };
    }

    if (tarefa.tipo === "finais") {
      const feitos = somarFinais(finais, tarefa.meta.classes);
      return {
        tarefa,
        feita: feitos >= tarefa.meta.dominar,
        medida: { tipo: "finais", feitos, meta: tarefa.meta.dominar },
      };
    }

    const { feitos, certos } = somarBlocos(progresso, tarefa.meta.blocos);
    return {
      tarefa,
      // A contagem de puzzles fecha a tarefa; o acerto não. Ver o comentário
      // de `meta.acerto` em `tarefas.ts`: uma caixa que o aluno não consegue
      // marcar por mais que trabalhe é uma caixa que ensina a desistir.
      feita: feitos >= tarefa.meta.puzzles,
      medida: {
        tipo: "tatica",
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
