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
    /**
     * A mesma citação em **uma linha**, e é ela que fica embaixo do diagrama.
     *
     * O teto de 90 é medido, não escolhido: os `bibliographicSource` das 30
     * dicas têm 204 caracteres de média e 765 de proveniência inteira, o que
     * punha ~17 linhas de letra miúda entre o tabuleiro e o primeiro parágrafo
     * da explicação num celular de 360 px. Nenhum dos 30 cabia em 90.
     *
     * A proveniência inteira não sai da página: ela desce para o `<details>` do
     * pé, onde continua aberta para o professor que abrir a dica no sábado. O
     * que muda é **onde**, não **se**.
     */
    citacaoCurta: z.string().min(10).max(90),
    /** O arquivo (ou slug) da obra em `content/sources.json`. */
    editionFile: z.string().min(3),
    /**
     * O capítulo ou seção de onde a posição saiu — **a unidade do teto de
     * citação no meio-jogo**.
     *
     * `PROTECTED_SOURCE_CAP` contava obra: no máximo duas posições da mesma
     * obra protegida por aula/dica. No meio-jogo o teto passa a contar
     * **capítulo**, por decisão editorial de 2026-09-07 (§3.1 do plano). O
     * raciocínio inteiro está em `content/sources.json`, e o resumo é: o que a
     * Lei 9.610 protege num livro de xadrez é o texto, as anotações e a
     * seleção/organização da coletânea (art. 7º, XIII) — não o arranjo das
     * peças. A FEN é fato. O que **é** reprodução de curadoria é esvaziar os
     * diagramas de um capítulo, e é isso que o teto novo mede.
     *
     * `null` é para fonte sem capítulo: partida do recorte CC0 do Lichess, ou
     * posição composta pela autoria. O gate recusa `null` quando a obra citada
     * tem PDF na biblioteca — livro sem capítulo é teto que não se cobra.
     */
    capitulo: z.string().min(4).nullable().default(null),
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

const CASA = z.string().regex(/^[a-h][1-8]$/, "casa no formato `e4`");

/**
 * Um passo da explicação, com o que ele acende no tabuleiro.
 *
 * ## Por que o realce é autoral, e por que ele é pequeno
 *
 * A prosa das 30 dicas é escrita em notação algébrica — 29 delas citam casa ou
 * lance, 4,5 referências por dica, 136 no total — e o tabuleiro não acompanhava
 * nada disso: nada na tela ligava "d5" à casa d5.
 *
 * A saída **não** é extrair as 136 com uma expressão regular. Um passo que cita
 * seis casas para dizer que uma delas importa acenderia as seis, e o aluno de
 * doze anos que abre a dica pela primeira vez leria um tabuleiro pintado —
 * carga maior, não menor. Quem escreve o passo diz o que ele cita, e o teto de
 * quatro casas é o que impede a tentação de acender tudo.
 *
 * Passo sem realce nenhum é estado previsto: o passo que fala do plano, e não
 * de uma casa, não tem o que acender.
 */
export const PassoSchema = z
  .object({
    texto: z.string().min(20),
    realce: z.array(CASA).max(4).default([]),
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
    explicacao: z.array(PassoSchema).min(1).max(3),
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
        /**
         * O que o vídeo **não** entrega, quando ele não entrega tudo.
         *
         * São 30 vídeos gratuitos em português para 30 dicas, e em dois casos
         * não sobrava escolha: o do `m11` é de finais de torre e o do `m22`
         * trata do ataque de minoria, tema que saiu da lista. A alternativa —
         * publicar o link calado — faria a tela afirmar que o vídeo é da dica,
         * e o aluno descobriria que não depois de dez minutos assistindo. A
         * ressalva vai na tela, ao lado do link, não num comentário de código.
         */
        ressalva: z.string().min(20).nullable().default(null),
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
 * Quantas posições do **mesmo capítulo** uma dica de meio-jogo pode usar.
 *
 * Não é o `PROTECTED_SOURCE_CAP` de `lib/lesson/schema.ts`, e a diferença é
 * deliberada. Aquele conta **obra** e continua valendo para as aulas de finais,
 * onde os livros são de autores vivos ou recentes (de la Villa, Silman,
 * Seirawan). Este conta **capítulo** e vale só aqui.
 *
 * A troca de unidade vem de uma premissa que não se sustentava. O teto por obra
 * foi escrito como se fosse restrição legal; é política editorial, e a coisa
 * que ela deveria proteger não é a que ela media:
 *
 * - **posição é fato, não obra.** Uma FEN é o arranjo das peças. O que a
 *   Lei 9.610 protege num livro de xadrez é o texto, as anotações e a
 *   seleção/organização da coletânea (art. 7º, XIII);
 * - **nestes dois livros a camada protegida não é a que se copia.** O texto de
 *   Nimzowitsch é livre no Brasil desde 2006 e o de Znosko-Borovsky desde 2025;
 *   o prazo em aberto era o da **tradução**, que é camada de texto. A FEN do
 *   diagrama CXLVIII não deve nada ao tradutor;
 * - **o que sobra de preocupação real é copiar a seleção** — esvaziar os
 *   diagramas do capítulo do peão isolado é reproduzir a curadoria do autor. É
 *   isso, e só isso, que este teto mede.
 *
 * Aprovado pelo Doug em 2026-09-07; o raciocínio inteiro está em
 * `content/sources.json`, ao lado das licenças.
 */
export const CAPITULO_CAP = 2;

/** O que a conferência de citação precisa saber de uma obra registrada. */
export type ObraCitada = { readonly slug: string; readonly temArquivo: boolean };

/**
 * Os problemas de citação de uma dica: capítulo faltando e teto estourado.
 *
 * Recebe a busca da obra por parâmetro para não puxar `content/sources.json`
 * para dentro do esquema — quem junta as duas pontas é o gate e o `npm test`,
 * que já leem os dois arquivos.
 */
export function problemasDeCitacao(
  dica: Dica,
  obraDe: (editionFile: string) => ObraCitada | undefined,
): { codigo: string; mensagem: string }[] {
  const problemas: { codigo: string; mensagem: string }[] = [];
  const porCapitulo = new Map<string, number>();

  for (const [i, posicao] of dica.posicoes.entries()) {
    const obra = obraDe(posicao.provenance.editionFile);
    if (!obra) continue; // já reportado como OBRA_NAO_REGISTRADA

    if (posicao.provenance.capitulo === null) {
      // Livro sem capítulo declarado é teto que não se cobra: a posição
      // passaria por todas as portas sem nunca contar para nenhuma.
      if (obra.temArquivo) {
        problemas.push({
          codigo: "CAPITULO_AUSENTE",
          mensagem:
            `posição ${i + 1} sai de "${obra.slug}", que é livro da biblioteca, e não diz de ` +
            `que capítulo — sem isso o teto por capítulo não tem o que contar`,
        });
      }
      continue;
    }

    const chave = `${obra.slug} · ${posicao.provenance.capitulo}`;
    const quantas = (porCapitulo.get(chave) ?? 0) + 1;
    porCapitulo.set(chave, quantas);
    if (quantas > CAPITULO_CAP) {
      problemas.push({
        codigo: "TETO_DE_CAPITULO",
        mensagem:
          `${quantas} posições saem de "${chave}" e o teto é ${CAPITULO_CAP} por capítulo — ` +
          `esvaziar um capítulo é reproduzir a seleção do autor, que é a camada protegida`,
      });
    }
  }
  return problemas;
}

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
