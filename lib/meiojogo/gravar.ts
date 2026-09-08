import "server-only";
import { createHash } from "node:crypto";
import { hojeNoBrasil } from "../curso/calendario.ts";
import { lerAula } from "../finais/conteudo.ts";
import { capituloDaAula, moduloDaAula, volumeDaAula, type ExerciseItem, type Lesson } from "../lesson/schema.ts";
import { judgeMove } from "../lesson/tree.ts";
import { criarClienteAdmin } from "../supabase/admin.ts";

/**
 * A gravação de uma resposta de exercício de meio-jogo.
 *
 * ## O navegador manda o lance, nunca o acerto
 *
 * É a regra de `lib/tatica/gravar.ts:30-40`, e aqui ela pesa mais que em
 * qualquer outro lugar: o conteúdo da etapa é servido ao navegador — tem de
 * ser, para a tela responder no instante do lance —, então o gabarito do livro
 * viaja junto. Com um `acertou` vindo de fora, "acertei os doze" seria uma
 * chamada de rede a escrever, e a nota do capítulo que o professor lê viraria
 * ficção.
 *
 * O juiz é o **mesmo** das etapas de final: `judgeMove` sobre o nó do
 * exercício, relido do arquivo em disco. Um juiz, e nenhuma segunda opinião
 * sobre o que o livro aceita.
 *
 * ## O que o servidor deriva, e por quê cada um
 *
 * `tentativa` e `inedita` **não** vêm do navegador, embora só ele pareça
 * saber: os dois se recuperam do próprio histórico, e derivá-los aqui é o que
 * impede que cinco lances até acertar cheguem ao relatório como cinco
 * exercícios — ou como um. `versao` é a impressão digital do item: um exercício
 * corrigido no meio do piloto deixa de se comparar com o de antes, e sem essa
 * coluna as duas metades entram na mesma porcentagem.
 *
 * ## O que mudou em 2026-09-08
 *
 * A função inteira, por dentro. Antes ela julgava um clique numa casa contra
 * `lib/meiojogo/dicas.ts`; agora julga um lance contra o gabarito impresso de
 * um capítulo do Yusupov. As colunas da tabela não mudaram nenhuma — a
 * `tentativa_meiojogo` nasceu agnóstica de origem, e é por isso que a
 * reformulação do módulo não precisou de migration. `dica` passou a guardar o
 * id da aula (`M103-PRINCIPIOS-DE-ABERTURA`) e `item` o do exercício
 * (`ex-3-1`); os dois são `text` sem `check` de formato, conferido contra o
 * banco de produção em 2026-09-08.
 */

/** O que o navegador manda: o que foi **jogado**, e o que só ele sabe. */
export type RespostaDoExercicio = {
  /** O id da aula (`M103-PRINCIPIOS-DE-ABERTURA`). Vai para a coluna `dica`. */
  aula: string;
  /** O id do exercício no arquivo da aula (`ex-3-1`). */
  item: string;
  /** O lance jogado, em UCI (`f1d1`, e `e7e8q` quando promove). */
  lance: string;
  /** A dica do exercício estava aberta quando o lance foi jogado. */
  apoio: boolean;
  tempo_ms: number;
};

export type Resultado = { acertou: boolean } | { erro: string };

/** Meia hora, como na tática: acima disso é aba esquecida aberta. */
const TEMPO_MAXIMO_MS = 30 * 60 * 1000;

const LANCE = /^[a-h][1-8][a-h][1-8][nbrq]?$/;

/**
 * A impressão digital do item — as oito primeiras casas do sha256 sobre o que
 * define a resposta.
 *
 * Só entra o que, mudando, torna as respostas incomparáveis: a posição, o lado
 * e **todos os lances que o livro aceita**, com os pontos deles. Corrigir uma
 * vírgula do feedback em português **não** invalida o histórico, e é por isso
 * que o texto fica de fora; acrescentar uma alternativa creditada invalida, e é
 * por isso que os pontos entram.
 */
function versaoDoItem(item: ExerciseItem): string {
  const material = [
    "m2",
    item.node.fen,
    item.orientation ?? "",
    String(item.pontos),
    item.node.expects.flatMap((e) => e.moves).sort().join(","),
    (item.node.authorAlternatives ?? [])
      .map((a) => `${[...a.moves].sort().join("|")}=${a.pontos ?? 0}`)
      .sort()
      .join(","),
  ];
  return createHash("sha256").update(material.join(" ")).digest("hex").slice(0, 8);
}

/**
 * O rótulo que agrupa exercícios do mesmo assunto na fila de revisão.
 *
 * No meio-jogo o conceito **é** o capítulo: o Yusupov escreve um capítulo por
 * ideia, e os doze exercícios dele treinam essa ideia. `yusupov1-cap14` — a
 * série, o volume e o capítulo. Sai do id da aula e não de um campo, pela mesma
 * razão de sempre: um segundo lugar dizendo a mesma coisa um dia diria outra.
 */
export function conceitoDaAula(id: string): string {
  return `yusupov${volumeDaAula(id)}-cap${capituloDaAula(id)}`;
}

/** O exercício, ou `null` — com a aula já validada como de meio-jogo. */
function acharItem(aula: Lesson, itemId: string): ExerciseItem | null {
  return aula.stages.exercises?.items.find((i) => i.id === itemId) ?? null;
}

export async function gravarExercicio(
  aluno: string,
  dado: RespostaDoExercicio,
): Promise<Resultado> {
  const { aula: aulaId, item: itemId, lance } = dado;
  if (typeof aulaId !== "string" || typeof itemId !== "string" || typeof lance !== "string") {
    return { erro: "tentativa malformada" };
  }
  // Sem isto, esta função seria "escreva qualquer texto na tabela de
  // tentativas". O id vem da rota do aluno, e rota é entrada de fora.
  if (moduloDaAula(aulaId) !== "meio-jogo") return { erro: "id de aula não é de meio-jogo" };

  const aula = lerAula(aulaId);
  if (!aula) return { erro: "aula desconhecida" };

  const item = acharItem(aula, itemId);
  if (!item) return { erro: "exercício desconhecido" };

  if (!LANCE.test(lance)) return { erro: "lance malformado" };

  // O veredito, do servidor. `method` é o lance do livro e `author-alternative`
  // é o segundo lance que o livro também credita: os dois **resolvem** o
  // exercício, e a diferença entre eles é de pontos, não de estar certo. Quem
  // soma os pontos é `lib/meiojogo/progresso.ts`, relendo estas linhas.
  const veredito = judgeMove(aula, item.node, lance);
  const acertou = veredito.kind === "method" || veredito.kind === "author-alternative";

  // `habilidade` continua com os dois valores do `check` da migration 0006, e o
  // exercício grava `aplicacao`: jogar o lance que o capítulo pede é aplicar o
  // conceito dele.
  const habilidade: "reconhecimento" | "aplicacao" = "aplicacao";
  // `curado`, e não `fato`: quem decide o certo aqui é o autor do livro, não
  // uma função que mede o tabuleiro. A coluna existe justamente para que o
  // relatório do professor possa escrever os dois com palavras diferentes.
  const nivel: "fato" | "curado" = "curado";

  const supabase = criarClienteAdmin();

  // Uma consulta só para as duas colunas derivadas. São poucas linhas por
  // aluno e item — o teto é quantas vezes ele respondeu aquele exercício.
  const { data: anteriores, error: erroDeLeitura } = await supabase
    .from("tentativa_meiojogo")
    .select("criada_em")
    .eq("aluno", aluno)
    .eq("dica", aulaId)
    .eq("item", itemId);
  if (erroDeLeitura) return { erro: erroDeLeitura.message };

  const hoje = hojeNoBrasil();
  const dias = (anteriores ?? []).map((linha) => hojeNoBrasil(new Date(linha.criada_em)));
  const tentativa = dias.filter((dia) => dia === hoje).length + 1;
  // Inédita é sobre **dia**, e não sobre tentativa: as três respostas de hoje
  // são a mesma primeira vez. É esta coluna que a revisão espaçada vai ler, e
  // ela não se recalcula depois.
  const inedita = !dias.some((dia) => dia < hoje);

  const { error } = await supabase.from("tentativa_meiojogo").insert({
    aluno,
    dica: aulaId,
    item: itemId,
    conceito: conceitoDaAula(aulaId),
    habilidade,
    nivel_evidencia: nivel,
    versao: versaoDoItem(item),
    resposta: lance,
    acertou,
    tentativa,
    // A dica do exercício é o único apoio que esta etapa tem, e por isso a
    // coluna de 0 a 3 da migration 0006 usa só dois dos quatro degraus. Fica
    // com a escala inteira porque estreitá-la exigiria migration, e um degrau
    // não usado não custa nada.
    apoio: dado.apoio ? 1 : 0,
    inedita,
    tempo_ms: Math.min(Math.max(0, Math.round(dado.tempo_ms) || 0), TEMPO_MAXIMO_MS),
  });

  if (error) return { erro: error.message };
  return { acertou };
}
