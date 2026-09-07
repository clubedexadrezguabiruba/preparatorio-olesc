import { z } from "zod";
import { CORES } from "./linhas.ts";
import { sanEmPortugues } from "./treino.ts";

/**
 * As aberturas que não viram linha: princípios em vez de lances decorados.
 *
 * São cinco, e elas chegam aqui por **dois motivos opostos**:
 *
 * - **Quatro por raridade.** Pirc, Nimzowitsch, Alekhine e Owen, defesas contra
 *   o nosso 1.e4, ficaram fora pela frequência (§2.10 do `docs/REPERTORIO.md`).
 *   Juntas somam menos de 8 % das partidas, e escrevê-las como linha custaria
 *   ~16 das 42 vagas do orçamento.
 * - **Uma por ausência de teoria.** O bispo em c4 contra a nossa Siciliana
 *   (§2.6) é o contrário: **~31 % das sicilianas**, o lance mais frequente do
 *   repertório inteiro. Ele sai daqui não por ser raro, mas porque **não há o
 *   que decorar** — depois de `2.Bc4 Cc6` as quatro respostas mais comuns das
 *   brancas somam só 73,2 %, o número mais espalhado da tabela da §6, e nenhum
 *   dos onze cursos do corpus entra nele: os autores escrevem para 1200+, e
 *   nessa faixa o lance quase não aparece.
 *
 * É por isso que existe o campo `porque`. Sem ele a página teria de escolher
 * uma moldura só — "as raras" — e ela seria falsa para a linha que o aluno mais
 * vai encontrar.
 *
 * ## Por que princípio e não linha
 *
 * Nos dois casos, decorar não paga. Na abertura rara porque a partida demora a
 * chegar e até lá o aluno esqueceu; no bispo em c4 porque não existe sequência
 * estável para decorar — o adversário joga qualquer coisa. O que sobrevive é a
 * **ideia**, e ela também serve para a próxima abertura estranha que ninguém
 * previu.
 *
 * ## Um arquivo, e não um por abertura
 *
 * O plano falava em `content/repertorio/notas/<abertura>.json`. É um arquivo só,
 * pelo mesmo motivo de `content/temas.json`: cinco arquivos seriam cinco
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
    /**
     * De que lado o aluno está.
     *
     * Não é decoração: a página inteira fala em "ele" e "você", e sem esta
     * palavra o aluno abre a nota do bispo em c4 achando que é ele quem joga
     * `2.Bc4`. As quatro raras são das brancas; a do bispo em c4 é das pretas.
     */
    cor: z.enum(CORES),
    /** Os lances que identificam a abertura, em SAN: "1.e4 d6". */
    lances: z.string().min(4),
    /** Quanto ela aparece, em palavras que o aluno entende. */
    frequencia: z.string().min(10),
    /**
     * Por que esta abertura não tem linha no treinador.
     *
     * Uma frase, dita ao aluno. Ela existe porque o motivo **não é o mesmo para
     * todas**: quatro saíram por raridade, e a do bispo em c4 por não haver
     * teoria. Um rodapé fixo na tela mentiria para uma das duas.
     */
    porque: z.string().min(20),
    /** O que o adversário está querendo. Um a três parágrafos. */
    explicacao: z.array(z.string().min(20)).min(1).max(3),
    /** O que fazer, em ordem. É a página inteira, do ponto de vista do aluno. */
    faca: z.array(z.string().min(10)).min(3).max(5),
    /** O erro que este tipo de posição provoca. */
    cuidado: z.string().min(10),
  })
  .strict();

/**
 * O campo `lances` na língua do aluno: `1.e4 c5 2.Nf3 Nc6 3.Bc4` sai
 * `1.e4 c5 2.Cf3 Cc6 3.Bc4`.
 *
 * **O JSON guarda SAN inglês de propósito, e a tela é que traduz.** Inglês é o
 * que a `chess.js` joga, e é só por isso que o teste consegue provar que o texto
 * no alto da página é lance legal de verdade — um `Cf3` digitado errado passaria
 * batido. Traduzir na leitura dá as duas coisas: dado conferido e tela em
 * português, que é a mesma escolha do cartão de comando do treinador
 * (`sanEmPortugues`, em `treino.ts`).
 *
 * O prefixo sai da frente antes da troca e volta depois. `sanEmPortugues` só
 * olha a **primeira** letra, e em `2.Nf3` a primeira letra é o `2`; em `(ou` é o
 * parênteses.
 */
export function lancesEmPortugues(lances: string): string {
  return lances
    .split(" ")
    .map((pedaco) => {
      const prefixo = /^[^A-Za-z]*/.exec(pedaco)?.[0] ?? "";
      return prefixo + sanEmPortugues(pedaco.slice(prefixo.length));
    })
    .join(" ");
}

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
