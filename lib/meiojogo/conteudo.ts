import dicasJson from "../../content/meio-jogo.json" with { type: "json" };
import { NIVEIS } from "../curso/trilha.ts";
import { validarDicas, type Dica } from "./dicas.ts";

/**
 * As dicas de meio-jogo, já conferidas, na forma em que as telas as usam.
 *
 * A conferência roda **na importação**, como em `lib/tatica/conteudo.ts`: um
 * `content/meio-jogo.json` quebrado reprova a build, em vez de o aluno abrir a
 * dica e encontrar uma página sem diagrama.
 */
const LIDAS = validarDicas(dicasJson);

/** As dicas na ordem de leitura: por nível, e dentro dele pelo número do id. */
export const DICAS: readonly Dica[] = [...LIDAS].sort((a, b) => {
  const nivel = NIVEIS.findIndex((n) => n.id === a.nivel) - NIVEIS.findIndex((n) => n.id === b.nivel);
  return nivel !== 0 ? nivel : numeroDo(a.id) - numeroDo(b.id);
});

function numeroDo(id: string): number {
  return Number(id.slice(1));
}

const POR_ID = new Map(DICAS.map((d) => [d.id, d]));

export function dicaPorId(id: string): Dica | null {
  return POR_ID.get(id) ?? null;
}

/** As dicas de um nível, na ordem. */
export function dicasDoNivel(nivel: string): Dica[] {
  return DICAS.filter((d) => d.nivel === nivel);
}

/** A posição da dica na lista geral — o número que o aluno lê no cartão. */
export function ordemDaDica(id: string): number {
  return DICAS.findIndex((d) => d.id === id) + 1;
}
