import { z } from "zod";
import { NIVEIS, type Nivel } from "../curso/nivel.ts";
import { CLASSES } from "../finais/trilha.ts";

/**
 * As tarefas de casa **do nível** — a rotina permanente do clube.
 *
 * ## Elas eram por semana até 2026-09-09
 *
 * Quatro semanas presas a datas viraram cinco níveis, e não por mapeamento: é
 * reescrita de conteúdo. Três tarefas eram genuinamente de **calendário** e não
 * de nível — a véspera do torneio, a partida longa do fim de semana, o torneio
 * do clube na quinta —, e forçá-las num degrau perderia a lista de véspera, que
 * é a mais importante das que existiam. Elas mudaram de arquivo, para
 * `content/agenda.json` (`lib/tarefas/agenda.ts`). O painel mostra as duas
 * listas: **"O seu nível"** e **"A agenda"**.
 *
 * ## O que ficou aqui, e o que saiu
 *
 * Ficou o que o **degrau** pede, e não o que o relógio pede. Saiu a tarefa de
 * repertório: o repertório agora tem alvo próprio no cartão do nível ("8 de 8
 * linhas"), e uma tarefa de casa dizendo a mesma coisa seria a segunda
 * contagem da mesma coisa na mesma tela.
 *
 * Saiu também, pela mesma régua, a tarefa de **finais** por nível. O cartão do
 * nível já mostra o requisito de finais com o clamp pelo publicado — *"1 de 4
 * aulas publicadas"* —, e um `dominar: 4` escrito num JSON não sabe encolher
 * para o que existe em disco. Escrito assim ele viraria uma caixa impossível de
 * marcar, que é exatamente o que o comentário de `meta.acerto` aqui embaixo
 * proíbe. O tipo `finais` continua no esquema: ele é do módulo, não do
 * conteúdo de hoje.
 *
 * A tarefa de **tática** ficou, e ganhou um porquê que ela não tinha: é onde
 * mora o **aviso de acerto**. A barra do nível conta temas fechados e recusa,
 * de propósito, cobrar piso de acerto — e o acerto tem de aparecer em algum
 * lugar como aviso. É aqui.
 *
 * **Conteúdo é dado, não código** — a mesma regra de `content/temas.json`.
 * Quem escreve a tarefa é o professor, e ele escreve prosa, não JSX. Em
 * componente elas virariam duas versões parecidas da mesma lista.
 *
 * ## Por que não existe tabela `tarefas` no banco
 *
 * O plano previa `tarefas` (semana, descrição, tipo, meta) como tabela, com
 * `/professor` lançando tarefa pela tela. Ela ficou de fora, e é decisão:
 *
 * - A tarefa é **conteúdo do curso**, decidida junto com o resto do módulo.
 *   Ela nasce no repositório, não numa caixa de texto às onze da noite de
 *   sexta.
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
   * escrito à mão e prefixado pelo nível (`n1-coordenadas`), e não gerado do
   * título — corrigir uma vírgula no título não pode desmarcar a turma
   * inteira.
   *
   * O prefixo era `s<semana>-` até 2026-09-09. A renomeação em massa foi
   * segura porque `tarefa_conclusao` estava **vazia** — conferido contra o
   * banco antes de escrever uma linha de código. Se não estivesse, isto seria
   * uma migration, e não um `find`/`replace`.
   */
  id: z
    .string()
    .regex(/^n[1-5]-[a-z0-9-]+$/, "o id é `n<nível>-<nome-curto>`, tudo minúsculo"),
  nivel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  /** Uma linha. É o que o aluno lê na lista, no celular. */
  titulo: z.string().min(8),
  /** A segunda linha, quando a primeira não basta. */
  detalhe: z.string().min(10).optional(),
  /**
   * Para onde a tarefa manda o aluno.
   *
   * `url` nula é um estado **previsto**: o clube do chess.com ainda não
   * existe quando a tarefa é escrita. A tarefa aparece com o destino em
   * branco e um aviso, em vez de um link que leva a lugar nenhum —
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
 * `classes` e não uma lista de aulas: a tarefa é "domine 6 finais da classe E e
 * D", e não "domine estas seis". A diferença importa porque o aluno estuda no
 * próprio ritmo — quem começou pelo mate da escada e quem começou pela regra do
 * quadrado fizeram a mesma tarefa. Nomear as aulas também quebraria a tarefa no
 * dia em que uma delas mudasse de formato.
 *
 * **Nenhuma tarefa usa este tipo hoje**, e o porquê está no cabeçalho: o cartão
 * do nível cobra finais com o clamp pelo publicado, e este número é estático.
 */
const MetaDeFinaisSchema = z
  .object({
    classes: z.array(z.enum(CLASSES)).min(1),
    /** Quantas aulas dessas classes fecham a tarefa. */
    dominar: z.number().int().min(1),
  })
  .strict();

export const TarefaSchema = z.discriminatedUnion("tipo", [
  z.object({ ...Base, tipo: z.literal("tatica"), meta: MetaSchema }).strict(),
  z.object({ ...Base, tipo: z.literal("finais"), meta: MetaDeFinaisSchema }).strict(),
  z.object({ ...Base, tipo: z.literal("marcar") }).strict(),
]);

export type Tarefa = z.infer<typeof TarefaSchema>;
export type MetaDeTatica = z.infer<typeof MetaSchema>;
export type MetaDeFinais = z.infer<typeof MetaDeFinaisSchema>;

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

    if (!tarefa.id.startsWith(`n${tarefa.nivel}-`)) {
      throw new Error(
        `content/tarefas.json: a tarefa "${tarefa.id}" diz nível ${tarefa.nivel}. ` +
          "O prefixo do id e o nível têm de bater.",
      );
    }
  }
  return lido.data;
}


/** As tarefas de um nível, na ordem em que foram escritas. */
export function doNivel(tarefas: readonly Tarefa[], nivel: Nivel): Tarefa[] {
  return tarefas.filter((t) => t.nivel === nivel);
}

/** Os níveis que já têm tarefa escrita. */
export function niveisEscritos(tarefas: readonly Tarefa[]): Nivel[] {
  return NIVEIS.filter((n) => tarefas.some((t) => t.nivel === n));
}
