import { z } from "zod";

/**
 * As aberturas que não viram linha: princípios em vez de lances decorados.
 *
 * Quatro defesas contra o nosso 1.e4 — Pirc, Nimzowitsch, Alekhine e Owen —
 * ficaram fora do repertório pela frequência (§2.10 do `docs/REPERTORIO.md`).
 * Juntas elas somam menos de 8 % das partidas, e cada uma sozinha aparece menos
 * que qualquer linha que o aluno já decorou. Escrevê-las como linha custaria
 * ~16 das 42 vagas do orçamento — que é exatamente o que a Escocesa e o Bowdler
 * precisaram.
 *
 * **Mas "fora do repertório" não pode virar "o aluno abre a partida e não sabe
 * o que fazer".** Ele vai encontrar um `1…d6` uma vez por torneio, e um aluno
 * de 11 anos que não reconhece a posição joga qualquer coisa. A saída é a dos
 * livros: uma página de princípios, escrita, sem exercício no treinador.
 *
 * ## Por que princípio e não linha
 *
 * Decorar oito meios-lances de uma abertura que aparece uma vez por torneio é o
 * pior negócio de memória que existe: até a partida chegar, o aluno esqueceu. O
 * que sobrevive é a **ideia** — "ele te deu o centro, ocupe-o e não empurre
 * peão sem terminar de desenvolver" —, e ela também serve para a próxima
 * abertura estranha que ninguém previu.
 *
 * ## Um arquivo, e não um por abertura
 *
 * O plano falava em `content/repertorio/notas/<abertura>.json`. É um arquivo só,
 * pelo mesmo motivo de `content/temas.json`: quatro arquivos seriam quatro
 * importações, e a conferência de "não há slug repetido" precisa vê-los juntos.
 *
 * Markdown ficou de fora pelo motivo já escrito em `lib/tatica/temas.ts` — o
 * texto tem sempre a mesma forma, e um JSON com campos nomeados valida sozinho.
 */

export const NotaSchema = z
  .object({
    /** O pedaço da URL: `/aberturas/notas/pirc`. */
    slug: z.string().regex(/^[a-z0-9-]+$/),
    /** "Defesa Pirc". */
    nome: z.string().min(3),
    /** Os lances que identificam a abertura, em SAN: "1.e4 d6". */
    lances: z.string().min(4),
    /** Quanto ela aparece, em palavras que o aluno entende. */
    frequencia: z.string().min(10),
    /** O que o adversário está querendo. Um a três parágrafos. */
    explicacao: z.array(z.string().min(20)).min(1).max(3),
    /** O que fazer, em ordem. É a página inteira, do ponto de vista do aluno. */
    faca: z.array(z.string().min(10)).min(3).max(5),
    /** O erro que este tipo de posição provoca. */
    cuidado: z.string().min(10),
  })
  .strict();

export type Nota = z.infer<typeof NotaSchema>;

export const NotasSchema = z.array(NotaSchema).min(1);

/**
 * Confere as notas e as devolve, ou estoura com o caminho do erro.
 *
 * Estourar é o comportamento certo: isto roda na build e no `npm test`. Uma
 * nota sem texto tem de reprovar ali, e não virar uma página em branco no
 * celular do aluno na manhã do sábado — a mesma regra de `validarTemas`.
 */
export function validarNotas(dados: unknown): Nota[] {
  const lido = NotasSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues
      .map((i) => `  content/repertorio/notas.json [${i.path.join(".")}]: ${i.message}`)
      .join("\n");
    throw new Error(`As notas de abertura não passaram na conferência:\n${problemas}`);
  }

  const vistos = new Set<string>();
  for (const nota of lido.data) {
    if (vistos.has(nota.slug)) {
      throw new Error(`As notas de abertura têm dois "${nota.slug}".`);
    }
    vistos.add(nota.slug);
  }
  return lido.data;
}
