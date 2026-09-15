import { z } from "zod";
import { MomentoSchema } from "./momentos.ts";

/**
 * A ficha de uma partida modelo: tudo o que o aluno lê fora dos lances.
 *
 * Mora em `content/partidas/<slug>.json`, ao lado do `<slug>.pgn`. O PGN guarda a
 * partida, os símbolos e a narração lance a lance; a ficha guarda o resto — e os
 * momentos, que são posições da partida com pergunta.
 *
 * **Todo texto de aluno é lista de falas curtas**, e não um parágrafo: a régua
 * de `docs/VOZ-DO-CURSO.md` cobra 200 caracteres por fala, e um parágrafo da
 * ficha de origem tem 400. Cada item é uma fala; a tela as empilha.
 */

const Falas = z.array(z.string().min(3)).min(1);

/** `!` e `$1` são o mesmo símbolo. Ver `AGENTS.md`, "Símbolos de lance". */
export const SIMBOLOS = ["!!", "!", "!?", "?!", "?", "??"] as const;
export type Simbolo = (typeof SIMBOLOS)[number];

export const NAG_DO_SIMBOLO: Record<Simbolo, string> = {
  "!": "$1",
  "?": "$2",
  "!!": "$3",
  "??": "$4",
  "!?": "$5",
  "?!": "$6",
};

/** `$1` vira `!`; o que não é um dos seis fica como veio (`$14`, `$16`…). */
export function normalizarNag(nag: string): string {
  const achado = (Object.entries(NAG_DO_SIMBOLO) as [Simbolo, string][]).find(([, n]) => n === nag);
  return achado ? achado[0] : nag;
}

export const FichaSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    /** A apresentação, em tom de professor. A primeira coisa da página. */
    intro: Falas,
    /** O que o aluno deve conseguir fazer ao fim. */
    objetivos: Falas,
    /** O fecho da partida: o golpe final explicado. Vem depois dos momentos. */
    momentoFinal: Falas,
    /** "Se você lembrar de apenas 3 coisas". */
    resumo: Falas,
    /** Perguntas de revisão, sem resposta na tela. */
    perguntas: Falas,
    fonte: z
      .object({
        /** O `slug` de `content/sources.json`. Tem de ser o mesmo da tag `[FonteSlug]`. */
        slug: z.string().regex(/^[a-z0-9-]+$/),
        /** Capítulo e páginas, como a ficha cita. */
        referencia: z.string().min(3),
      })
      .strict(),
    /**
     * Os símbolos que a ficha dá aos lances da partida — do "Lance esperado" e
     * dos lances da narração. É o que a trava de `conferir.ts` cobra no PGN:
     * **cortar um momento não corta o símbolo do lance**.
     */
    marcasDaFonte: z.array(
      z
        .object({
          /** `13.Rxd7` ou `12...O-O`, SAN inglês da partida, sem o símbolo. */
          lance: z.string().regex(/^\d+\.(\.\.)?\S+$/),
          simbolo: z.enum(SIMBOLOS),
        })
        .strict(),
    ),
    /** O que a ficha tinha de errado e a adaptação corrigiu. Registro, não tela. */
    correcoes: z.array(
      z
        .object({
          onde: z.string().min(3),
          ficha: z.string().min(3),
          correcao: z.string().min(3),
        })
        .strict(),
    ),
    momentos: z.array(MomentoSchema).min(1),
  })
  .strict();

export type Ficha = z.infer<typeof FichaSchema>;
