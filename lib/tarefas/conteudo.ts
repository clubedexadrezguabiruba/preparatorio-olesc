import agendaJson from "../../content/agenda.json" with { type: "json" };
import tarefasJson from "../../content/tarefas.json" with { type: "json" };
import { validarAgenda, type ItemDaAgenda } from "./agenda.ts";
import { validarTarefas, type Tarefa } from "./tarefas.ts";

/**
 * As duas listas de casa, já conferidas, na forma em que as telas as usam.
 *
 * A conferência roda **na importação**: um JSON quebrado faz a build falhar,
 * em vez de o aluno abrir o painel no domingo e achar que o nível não tem
 * tarefa.
 *
 * São duas porque uma é do **degrau** e a outra é do **relógio** — ver o
 * cabeçalho de `agenda.ts`. O painel as mostra separadas, com os títulos "O seu
 * nível" e "A agenda", porque juntá-las faria a véspera do torneio aparecer no
 * meio da rotina permanente do clube.
 */
export const TAREFAS: readonly Tarefa[] = validarTarefas(tarefasJson);

export const AGENDA: readonly ItemDaAgenda[] = validarAgenda(agendaJson);
