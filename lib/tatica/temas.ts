import { z } from "zod";

/**
 * O texto de cada tema: a explicação que o aluno lê antes de resolver.
 *
 * **Conteúdo é dado, não código.** Ele mora em `content/temas.json` porque
 * quem o escreve é o professor, e porque a apostila vai imprimir exatamente
 * estas frases — se elas estivessem espalhadas em JSX, o caderno e o site
 * diriam coisas parecidas mas não iguais.
 *
 * ## Por que o esquema mora aqui e a leitura do arquivo mora fora
 *
 * Este arquivo não importa o JSON. Ele só sabe **conferir** um objeto qualquer.
 * Assim o teste (`temas.test.ts`) lê o arquivo do disco pelo `node:fs` e chama
 * `validarTemas`, e o site importa o JSON do jeito do Next
 * (`lib/tatica/conteudo.ts`) e chama a mesma função. Um juiz só, dois leitores.
 *
 * ## Markdown ficou de fora, e é uma decisão
 *
 * O plano previa `content/temas/<tema>.md`. Markdown exigiria um renderizador
 * — mais uma dependência, e uma superfície de HTML vindo de arquivo. Como o
 * texto é sempre a mesma forma (parágrafos, uma lista de "procure", uma linha
 * de "cuidado"), um JSON com campos nomeados diz a mesma coisa, valida sozinho
 * e imprime igual na apostila.
 */

export const TemaEscritoSchema = z
  .object({
    /** A tag do Lichess. Tem de existir em `lib/tatica/blocos.ts`. */
    tag: z.string().min(1),
    /** Um a três parágrafos. É o que abre a página do tema. */
    explicacao: z.array(z.string().min(20)).min(1).max(3),
    /** O que olhar no tabuleiro. Vira lista com marcador. */
    procure: z.array(z.string().min(10)).min(2).max(4),
    /** O erro que o aluno comete neste tema. Opcional. */
    cuidado: z.string().min(10).optional(),
    /**
     * O id de um puzzle do próprio banco para servir de diagrama-exemplo.
     *
     * Nulo é o normal: sem ele, o exemplo é o primeiro puzzle da faixa mais
     * fácil do tema — sempre válido, e escolhido pelo mesmo critério para
     * todos. O campo existe para o professor **fixar** um exemplo melhor
     * quando encontrar um, sem mexer em código.
     */
    exemplo: z.string().min(1).nullable().default(null),
  })
  .strict();

export type TemaEscrito = z.infer<typeof TemaEscritoSchema>;

export const TemasEscritosSchema = z.array(TemaEscritoSchema).min(1);

/**
 * Confere o conteúdo e devolve os temas, ou estoura com o caminho do erro.
 *
 * Estourar é o comportamento certo: isto roda na build e no `npm test`. Um
 * tema com a explicação faltando tem de reprovar ali, e não virar uma página
 * em branco no celular do aluno na manhã do sábado.
 */
export function validarTemas(dados: unknown): TemaEscrito[] {
  const lido = TemasEscritosSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues
      .map((i) => `  content/temas.json [${i.path.join(".")}]: ${i.message}`)
      .join("\n");
    throw new Error(`O conteúdo dos temas não passou na conferência:\n${problemas}`);
  }

  const vistos = new Set<string>();
  for (const tema of lido.data) {
    if (vistos.has(tema.tag)) {
      throw new Error(`content/temas.json: a tag "${tema.tag}" aparece duas vezes.`);
    }
    vistos.add(tema.tag);
  }
  return lido.data;
}
