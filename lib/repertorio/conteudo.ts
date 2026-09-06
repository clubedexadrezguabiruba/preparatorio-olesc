import notasJson from "../../content/repertorio/notas.json" with { type: "json" };
import { validarNotas, type Nota } from "./notas.ts";

/**
 * As notas de princípios, já conferidas, na forma em que a tela as usa.
 *
 * A conferência roda **na importação**: se `content/repertorio/notas.json`
 * estiver quebrado, a build falha em vez de o aluno abrir a página e ver texto
 * faltando. É a mesma forma de `lib/tatica/conteudo.ts`.
 *
 * Este arquivo **não** é `server-only`: as notas são texto público, sem nada de
 * aluno dentro, e um dia a apostila vai querer imprimi-las.
 */
const NOTAS: Nota[] = validarNotas(notasJson);
const POR_SLUG = new Map(NOTAS.map((nota) => [nota.slug, nota]));

/** Todas, na ordem do arquivo — que é a ordem de quanto o aluno vai encontrar. */
export function notas(): readonly Nota[] {
  return NOTAS;
}

export function nota(slug: string): Nota | null {
  return POR_SLUG.get(slug) ?? null;
}
