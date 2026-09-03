import { z } from "zod";
import { SEMANAS } from "../curso/calendario.ts";

/**
 * As tarefas de casa: o que o aluno tem de fazer entre um sábado e o outro.
 *
 * **Conteúdo é dado, não código** — a mesma regra de `content/temas.json`.
 * Quem escreve a tarefa é o professor, e o caderno da apostila vai imprimir
 * exatamente estas frases. Em JSX elas virariam duas versões parecidas da
 * mesma lista.
 *
 * ## Por que não existe tabela `tarefas` no banco
 *
 * O plano previa `tarefas` (semana, descrição, tipo, meta) como tabela, com
 * `/professor` lançando tarefa pela tela. Ela ficou de fora, e é decisão:
 *
 * - A tarefa da semana é **conteúdo do curso**, decidido junto com o caderno
 *   daquele sábado. Ela nasce no repositório, não numa caixa de texto às onze
 *   da noite de sexta.
 * - A apostila imprime a mesma lista. Em tabela, o PDF teria de consultar o
 *   banco para saber o que mandar para casa — e o caderno impresso na quinta
 *   discordaria da tela no domingo, sem ninguém perceber.
 * - Uma tela de CRUD a menos é um dia a mais para a B1.4, que é o poste longo
 *   da F1.
 *
 * O que **é** do banco é a outra metade: quem marcou o quê. Isso muda por
 * aluno e por dia, e mora em `tarefa_conclusao`.
 *
 * ## Dois tipos, e a diferença entre medir e declarar
 *
 * - `tatica` — o site **mede**. Quantos puzzles dos blocos combinados o aluno
 *   resolveu, contados de `tentativas_puzzle`. Não tem caixa para marcar:
 *   marcar seria o aluno opinando sobre um número que o servidor já sabe.
 * - `marcar` — o aluno **declara**. "Assisti o vídeo", "joguei duas partidas".
 *   Não existe verdade no servidor para conferir isso, e fingir que existe
 *   (um botão que só o professor libera) transformaria a tarefa de casa em
 *   burocracia de sábado.
 */

const Base = {
  /**
   * O id que vai para o banco em `tarefa_conclusao.tarefa`.
   *
   * **Renomear um id apaga a marcação de quem já a fez.** Por isso ele é
   * escrito à mão e prefixado pela semana (`s1-coordenadas`), e não gerado do
   * título — corrigir uma vírgula no título não pode desmarcar a turma
   * inteira.
   */
  id: z
    .string()
    .regex(/^s[1-4]-[a-z0-9-]+$/, "o id é `s<semana>-<nome-curto>`, tudo minúsculo"),
  semana: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Uma linha. É o que o aluno lê na lista, no celular. */
  titulo: z.string().min(8),
  /** A segunda linha, quando a primeira não basta. */
  detalhe: z.string().min(10).optional(),
  /**
   * Para onde a tarefa manda o aluno.
   *
   * `url` nula é um estado **previsto**: o clube do chess.com e o caderno
   * em PDF ainda não existem quando a tarefa é escrita. A tarefa aparece com o
   * destino em branco e um aviso, em vez de um link que leva a lugar nenhum —
   * e o teste de conteúdo lista o que está em branco, para não passar batido
   * até a manhã do sábado.
   */
  onde: z
    .object({ rotulo: z.string().min(3), url: z.string().min(1).nullable() })
    .strict()
    .nullable()
    .default(null),
};

const MetaSchema = z
  .object({
    /** Os blocos do currículo que contam. */
    blocos: z.array(z.number().int().min(1).max(8)).min(1),
    /** Quantos puzzles fecham a tarefa. */
    puzzles: z.number().int().min(1),
    /**
     * O acerto que o professor espera, em porcento.
     *
     * Ele **não** decide se a tarefa está feita — quem decide é a contagem de
     * puzzles. Um aluno que resolveu os 60 com 64% fez a tarefa; a caixa que
     * ele não consegue marcar por mais que trabalhe é a caixa que ensina a
     * desistir. O número aparece ao lado, e é no relatório do professor que
     * ele vira conversa.
     */
    acerto: z.number().int().min(1).max(100),
  })
  .strict();

export const TarefaSchema = z.discriminatedUnion("tipo", [
  z.object({ ...Base, tipo: z.literal("tatica"), meta: MetaSchema }).strict(),
  z.object({ ...Base, tipo: z.literal("marcar") }).strict(),
]);

export type Tarefa = z.infer<typeof TarefaSchema>;
export type MetaDeTatica = z.infer<typeof MetaSchema>;

export const TarefasSchema = z.array(TarefaSchema).min(1);

/**
 * Confere as tarefas e devolve a lista, ou estoura com o caminho do erro.
 *
 * Estourar é o comportamento certo, como em `validarTemas`: isto roda na build
 * e no `npm test`. Um id repetido tem de reprovar ali — no banco ele viraria
 * duas tarefas compartilhando a mesma marcação, e marcar uma marcaria a outra.
 */
export function validarTarefas(dados: unknown): Tarefa[] {
  const lido = TarefasSchema.safeParse(dados);
  if (!lido.success) {
    const problemas = lido.error.issues
      .map((i) => `  content/tarefas.json [${i.path.join(".")}]: ${i.message}`)
      .join("\n");
    throw new Error(`O conteúdo das tarefas não passou na conferência:\n${problemas}`);
  }

  const vistos = new Set<string>();
  for (const tarefa of lido.data) {
    if (vistos.has(tarefa.id)) {
      throw new Error(`content/tarefas.json: o id "${tarefa.id}" aparece duas vezes.`);
    }
    vistos.add(tarefa.id);

    if (!tarefa.id.startsWith(`s${tarefa.semana}-`)) {
      throw new Error(
        `content/tarefas.json: a tarefa "${tarefa.id}" diz semana ${tarefa.semana}. ` +
          "O prefixo do id e a semana têm de bater.",
      );
    }
  }
  return lido.data;
}

/** As tarefas de uma semana, na ordem em que foram escritas. */
export function daSemana(tarefas: readonly Tarefa[], semana: number): Tarefa[] {
  return tarefas.filter((t) => t.semana === semana);
}

/** As semanas que já têm tarefa escrita. */
export function semanasEscritas(tarefas: readonly Tarefa[]): number[] {
  return SEMANAS.filter((s) => tarefas.some((t) => t.semana === s));
}
