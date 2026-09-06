import { z } from "zod";
import { AfirmacaoSchema } from "./afirmacoes.ts";
import { NIVEIS } from "../curso/trilha.ts";

/**
 * As dicas de meio-jogo: o módulo que faltava entre a abertura e o final.
 *
 * ## Por que "dica", e não "aula"
 *
 * Porque meio-jogo **não tem juiz de máquina**. As aulas de finais são
 * certificadas pela tablebase Syzygy, que para em 7 peças; uma posição de
 * meio-jogo tem 20 e mais, e ali não existe "o lance certo" conferível — existe
 * o plano que o livro ensina. Chamar isso de aula, com prática contra o
 * computador e selo de domínio, seria vender como fato o que é julgamento.
 *
 * Então a dica é: uma técnica em uma frase, um "o que procurar", de uma a três
 * posições com proveniência, um quiz de plano cujo juiz é **o autor** (e isso
 * está escrito na tela), e um vídeo gratuito. O aluno declara que leu, como na
 * aula de leitura — e pelo mesmo motivo: não há o que reconferir.
 *
 * ## As fontes, pela política que já existe
 *
 * Posição é fato e entra com proveniência; prosa é 100% nossa. Domínio público
 * primeiro (Capablanca 1921 é o que a `content/sources.json` já registra), e
 * obra protegida sob o teto de 2 posições por dica, como nas aulas. Curso pago
 * não entra — nem como fonte de posição, nem como link.
 *
 * ## O esquema mora aqui, a leitura do arquivo mora fora
 *
 * Como em `lib/tatica/temas.ts`: este arquivo só sabe conferir um objeto. O
 * teste lê o JSON do disco e chama `validarDicas`; o site importa o JSON do
 * jeito do Next (`lib/meiojogo/conteudo.ts`) e chama a mesma função.
 */

const NIVEIS_VALIDOS = NIVEIS.map((n) => n.id) as [string, ...string[]];

/**
 * A proveniência de uma posição de meio-jogo.
 *
 * É a mesma ideia dos nove campos de `lib/lesson/schema.ts`, reduzida ao que
 * uma posição sem tablebase pode afirmar: de onde ela veio, de que obra, e o
 * que foi conferido. `editionFile` tem de casar com uma obra registrada em
 * `content/sources.json` — quem cobra isso é o gate.
 */
export const ProvenienciaSchema = z
  .object({
    /** A obra, a página e o diagrama, em prosa. */
    bibliographicSource: z.string().min(10),
    /** O arquivo (ou slug) da obra em `content/sources.json`. */
    editionFile: z.string().min(3),
    /** A partida original, quando a posição vem de uma. */
    originalGame: z.string().min(3).nullable().default(null),
    /** Como a FEN foi obtida, e o que foi conferido. */
    fenMethod: z.string().min(10),
  })
  .strict();

export const PosicaoDaDicaSchema = z
  .object({
    fen: z
      .string()
      .regex(
        /^\S+ [wb] \S+ \S+ \d+ \d+$/,
        "a FEN precisa dos seis campos (posição, vez, roques, en passant, meios-lances, lance)",
      ),
    /**
     * A legenda, que é o que o aluno lê embaixo do diagrama.
     *
     * **Ela só pode afirmar, como fato, o que `afirma` mede.** Julgamento
     * ("o plano é atacar a base") vai para `explicacao` e `quiz`, onde a tela
     * diz que o juiz é o autor. O porquê está em `lib/meiojogo/afirmacoes.ts`.
     */
    legenda: z.string().min(10),
    /**
     * O que a legenda afirma, em forma conferível por chess.js.
     *
     * `.min(1)`: uma posição sem afirmação nenhuma é uma posição cuja legenda
     * ninguém mediu — e é exatamente esse silêncio que o campo existe para
     * impedir. A conferência roda no `npm test` e no gate de conteúdo.
     */
    afirma: z.array(AfirmacaoSchema).min(1),
    provenance: ProvenienciaSchema,
  })
  .strict();

export const QuizSchema = z
  .object({
    pergunta: z.string().min(10),
    /** Três planos plausíveis. Duas seriam sorteio; quatro não cabem no celular. */
    opcoes: z.array(z.string().min(3)).length(3),
    /** O índice da certa, de 0 a 2. */
    certa: z.number().int().min(0).max(2),
    /** Por que ela é a certa — é isto que ensina, não o acerto. */
    porque: z.string().min(20),
  })
  .strict();

export const DicaSchema = z
  .object({
    /** `m1`, `m2`… A ordem é a de leitura dentro do nível. */
    id: z.string().regex(/^m[0-9]+$/, "o id é `m` mais o número (`m1`)"),
    titulo: z.string().min(8),
    /** Em que nível de força ela entra (`lib/curso/trilha.ts`). */
    nivel: z.enum(NIVEIS_VALIDOS),
    /** A técnica em uma frase — o que a dica ensina. */
    resumo: z.string().min(20),
    explicacao: z.array(z.string().min(20)).min(1).max(3),
    procure: z.array(z.string().min(10)).min(2).max(4),
    cuidado: z.string().min(10).optional(),
    posicoes: z.array(PosicaoDaDicaSchema).min(1).max(3),
    /**
     * Obrigatório desde a F2. Uma dica sem pergunta é uma dica que o aluno lê
     * e não usa — e "li" vira o único registro que o professor tem dela.
     */
    quiz: QuizSchema,
    /**
     * O vídeo gratuito.
     *
     * `url` continua podendo ser nula — uma dica nova entra sem link, e a tela
     * escreve "ainda não há link conferido" em vez de fingir um. O que o
     * esquema **não** aceita é uma string que não seja um endereço de vídeo do
     * YouTube: o link é a única coisa neste arquivo que leva a criança para
     * fora do site, e um id errado dá uma página de erro no meio da tarefa de
     * casa.
     *
     * O `titulo` é o título canônico do vídeo mais o canal, copiados do oEmbed
     * do YouTube — e não da página de busca, que **traduz** o título de vídeo
     * em inglês para o idioma de quem procura. Foi assim que dois vídeos em
     * inglês quase entraram aqui como se fossem em português.
     */
    video: z
      .object({
        titulo: z.string().min(5),
        url: z
          .string()
          .regex(
            /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/,
            "o link tem de ser `https://www.youtube.com/watch?v=` mais os 11 caracteres do id",
          )
          .nullable(),
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();

export type Dica = z.infer<typeof DicaSchema>;
export type PosicaoDaDica = z.infer<typeof PosicaoDaDicaSchema>;

export const DicasSchema = z.array(DicaSchema).min(1);

/**
 * Confere as dicas e devolve a lista, ou estoura com o caminho do erro.
 *
 * Estourar é o certo, como em `validarTemas`: isto roda na build e no
 * `npm test`. Uma dica sem posição tem de reprovar ali, e não virar uma página
 * sem diagrama no celular do aluno na manhã do sábado.
 */
export function validarDicas(dados: unknown): Dica[] {
  const lido = DicasSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues
      .map((i) => `  content/meio-jogo.json [${i.path.join(".")}]: ${i.message}`)
      .join("\n");
    throw new Error(`O conteúdo do meio-jogo não passou na conferência:\n${problemas}`);
  }

  const vistos = new Set<string>();
  for (const dica of lido.data) {
    if (vistos.has(dica.id)) {
      throw new Error(`content/meio-jogo.json: o id "${dica.id}" aparece duas vezes.`);
    }
    vistos.add(dica.id);
  }
  return lido.data;
}
