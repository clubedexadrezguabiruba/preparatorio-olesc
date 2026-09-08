import { z } from "zod";
import { SEMANAS } from "../curso/calendario.ts";
import { CLASSES } from "../finais/trilha.ts";

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
 * ## Três tipos, e a diferença entre medir e declarar
 *
 * - `tatica` — o site **mede**. Quantos puzzles dos blocos combinados o aluno
 *   resolveu, contados de `tentativas_puzzle`. Não tem caixa para marcar:
 *   marcar seria o aluno opinando sobre um número que o servidor já sabe.
 * - `finais` — o site **mede** também, e pela mesma razão: quantas aulas das
 *   classes combinadas o aluno dominou, contadas de `tentativas_aula` e
 *   `aula_lida` pelo critério de formato da trilha. O que a torna um tipo
 *   próprio e não uma variação da de tática é a unidade do que se conta —
 *   puzzle resolvido e aula dominada não somam na mesma barra.
 * - `meiojogo` — o site **mede**: quantas dicas daquele degrau o aluno resolveu,
 *   contadas de `tentativa_meiojogo`. Uma dica conta quando ele acertou o lance
 *   de **todos** os exercícios dela. Era declaração até 2026-09-07 (contava
 *   `dica_lida`, a caixa "li"), e o Doug a trocou pela mesma razão que derrubou
 *   o exercício de clicar na casa: uma barra que sobe porque a criança rolou
 *   até o fim não mede nada.
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

/**
 * O que fecha uma tarefa de finais.
 *
 * `classes` e não uma lista de aulas: a tarefa da semana é "domine 6 finais da
 * classe E e D", e não "domine estas seis". A diferença importa porque o aluno
 * estuda no próprio ritmo — quem começou pelo mate da escada e quem começou
 * pela regra do quadrado fizeram a mesma tarefa. Nomear as aulas também
 * quebraria a tarefa no dia em que uma delas mudasse de formato ou de sábado.
 */
const MetaDeFinaisSchema = z
  .object({
    classes: z.array(z.enum(CLASSES)).min(1),
    /** Quantas aulas dessas classes fecham a tarefa. */
    dominar: z.number().int().min(1),
  })
  .strict();

/**
 * O que fecha uma tarefa de meio-jogo.
 *
 * `nivel` e não uma lista de dicas, pelo motivo de `MetaDeFinaisSchema`: a
 * tarefa é "resolva os exercícios de 6 dicas do degrau 1000–1200", e o aluno
 * escolhe quais. Nomear as seis quebraria a tarefa no dia em que uma delas
 * mudasse de degrau.
 *
 * **É medida, e não marcada**, e desde 2026-09-07 ela mede trabalho e não
 * declaração: o servidor confere cada lance com o mesmo juiz que a tela usou.
 * Uma caixa aqui pediria ao aluno que opinasse sobre um número que o servidor
 * já sabe.
 *
 * O preço da mudança está declarado e é o motivo de este tipo ter ficado só na
 * semana 2: uma dica **sem** exercício não pode fechar esta tarefa, porque não
 * há o que resolver. As semanas 1, 3 e 4 viraram tarefa de `marcar` até as
 * dicas dos degraus delas serem curadas.
 */
const MetaDeMeioJogoSchema = z
  .object({
    /** O id do degrau em `lib/curso/trilha.ts` (`ate-1000`, `1000-1200`…). */
    nivel: z.string().min(3),
    /** Quantas dicas daquele degrau, resolvidas por inteiro, fecham a tarefa. */
    resolver: z.number().int().min(1),
  })
  .strict();

export const TarefaSchema = z.discriminatedUnion("tipo", [
  z
    .object({
      ...Base,
      tipo: z.literal("meiojogo"),
      meta: MetaDeMeioJogoSchema,
      /**
       * As dicas que o `detalhe` nomeia — os ids, na ordem em que aparecem.
       *
       * **Não é a meta.** O que fecha a tarefa continua sendo "leia 6 dicas do
       * degrau", e o aluno escolhe quais; este campo existe para o gate poder
       * conferir a **prosa**, que é onde o erro real aconteceu. Os quatro
       * `detalhe` do painel prometiam conceitos que não são dica do degrau que
       * a tarefa aponta — "a coluna aberta" e "a dama sozinha" na semana 1,
       * "melhorar a pior peça" e "trocar quando se está na frente" na 2,
       * "posto avançado" e "bispo bom e bispo mau" na 3 (que são do degrau
       * anterior), "ataque de minoria" e "sacrifício de qualidade" na 4 (que
       * não são dica de degrau nenhum). O gate não pegava porque conferia só a
       * contagem.
       *
       * O teste cobra três coisas: que cada id exista, que ele seja **do
       * degrau declarado**, e que o `titulo` da dica apareça literalmente no
       * `detalhe`. A terceira é a que morde: ela obriga a prosa a chamar a
       * dica pelo nome que o aluno vai ver na tela, em vez de parafraseá-la.
       */
      dicas: z.array(z.string().regex(/^m[0-9]+$/)).min(1),
    })
    .strict(),
  z.object({ ...Base, tipo: z.literal("tatica"), meta: MetaSchema }).strict(),
  z.object({ ...Base, tipo: z.literal("finais"), meta: MetaDeFinaisSchema }).strict(),
  z.object({ ...Base, tipo: z.literal("marcar") }).strict(),
]);

export type Tarefa = z.infer<typeof TarefaSchema>;
export type MetaDeTatica = z.infer<typeof MetaSchema>;
export type MetaDeFinais = z.infer<typeof MetaDeFinaisSchema>;
export type MetaDeMeioJogo = z.infer<typeof MetaDeMeioJogoSchema>;

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

/** O que a conferência do `detalhe` precisa saber de uma dica. */
export type DicaCitavel = {
  readonly id: string;
  readonly nivel: string;
  readonly titulo: string;
  /** Quantos exercícios a dica tem. Zero é dica que não pode fechar a tarefa. */
  readonly exercicios: number;
};

/**
 * Os problemas do `detalhe` das tarefas de meio-jogo, em português.
 *
 * Mora aqui, e não dentro de `validarTarefas`, porque a conferência precisa das
 * **dicas** — e `content/meio-jogo.json` é outro arquivo de conteúdo. Importá-lo
 * daqui faria o esquema das tarefas depender do conteúdo do meio-jogo para
 * conferir uma vírgula de tática. Recebendo a lista por parâmetro, quem junta
 * as duas pontas é quem já lê as duas: o `npm test` e o gate.
 *
 * As três regras, e o erro real que cada uma pega:
 *
 * 1. **o id existe** — `detalhe` prometendo dica que ninguém escreveu;
 * 2. **o id é do degrau declarado** — foi o que aconteceu: `s3-meiojogo` é do
 *    degrau 1200–1400 e prometia "posto avançado" e "bispo bom e bispo mau",
 *    que são m15 e m14, do degrau anterior;
 * 3. **o título aparece literalmente no `detalhe`** — sem isto a lista de ids
 *    ficaria certa e a prosa continuaria dizendo outra coisa, que é exatamente
 *    o estado em que o painel estava;
 * 4. **a dica tem exercício** — a regra que nasceu com o progresso medido: uma
 *    dica sem exercício nunca fecharia uma tarefa que conta exercício
 *    resolvido, e o aluno ficaria com uma caixa impossível no painel.
 */
export function problemasDoDetalheDeMeioJogo(
  tarefas: readonly Tarefa[],
  dicas: readonly DicaCitavel[],
): string[] {
  const problemas: string[] = [];
  for (const tarefa of tarefas) {
    if (tarefa.tipo !== "meiojogo") continue;
    if (tarefa.dicas.length !== tarefa.meta.resolver) {
      problemas.push(
        `${tarefa.id}: manda resolver ${tarefa.meta.resolver} dicas e nomeia ` +
          `${tarefa.dicas.length}`,
      );
    }
    for (const id of tarefa.dicas) {
      const dica = dicas.find((d) => d.id === id);
      if (!dica) {
        problemas.push(`${tarefa.id}: nomeia a dica "${id}", que não existe`);
        continue;
      }
      if (dica.nivel !== tarefa.meta.nivel) {
        problemas.push(
          `${tarefa.id}: é do degrau ${tarefa.meta.nivel} e nomeia "${id}", ` +
            `que é do degrau ${dica.nivel}`,
        );
      }
      if (!tarefa.detalhe?.includes(dica.titulo)) {
        problemas.push(
          `${tarefa.id}: nomeia "${id}" na lista e não escreve "${dica.titulo}" no detalhe`,
        );
      }
      // A regra nova, e a que impede a tarefa impossível: uma dica sem
      // exercício não pode fechar uma tarefa que conta exercício resolvido.
      // Sem ela, o aluno abriria o painel na segunda-feira do piloto com uma
      // caixa que nada que ele fizesse marcaria.
      if (dica.exercicios === 0) {
        problemas.push(
          `${tarefa.id}: nomeia "${id}", que não tem exercício — a tarefa conta exercício ` +
            `resolvido, e essa dica nunca fecharia`,
        );
      }
    }
  }
  return problemas;
}

/** As tarefas de uma semana, na ordem em que foram escritas. */
export function daSemana(tarefas: readonly Tarefa[], semana: number): Tarefa[] {
  return tarefas.filter((t) => t.semana === semana);
}

/** As semanas que já têm tarefa escrita. */
export function semanasEscritas(tarefas: readonly Tarefa[]): number[] {
  return SEMANAS.filter((s) => tarefas.some((t) => t.semana === s));
}
