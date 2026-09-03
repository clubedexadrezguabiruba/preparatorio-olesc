import tarefasJson from "../../content/tarefas.json" with { type: "json" };
import { validarTarefas, type Tarefa } from "./tarefas.ts";

/**
 * As tarefas de casa, já conferidas, na forma em que as telas as usam.
 *
 * A conferência roda **na importação**: `content/tarefas.json` quebrado faz a
 * build falhar, em vez de o aluno abrir o painel no domingo e achar que a
 * semana não tem tarefa.
 *
 * Só a semana 1 está escrita. As outras entram com o caderno do sábado delas —
 * e o painel sabe dizer que a semana ainda não foi lançada, o que é a verdade,
 * e não um erro.
 */
export const TAREFAS: readonly Tarefa[] = validarTarefas(tarefasJson);
