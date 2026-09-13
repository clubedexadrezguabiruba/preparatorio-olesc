/**
 * O treino v2, traduzido para o runtime do aluno (§16.4 e plano final §9 e §16).
 *
 * ## O que este arquivo é, e o que ele não é
 *
 * Ele **não é um player**. Quem joga é o `TreeStage` — o mesmo componente em que o aluno
 * treina hoje —, com o mesmo juiz (`judgeMove`) e a mesma escolha de defesa
 * (`escolherResposta`). O plano final §16 é literal: *"não reproduzir o comportamento
 * pedagógico em um segundo player exclusivo do editor"*. Um segundo player seria
 * consertado uma vez e divergiria da aula na segunda.
 *
 * O que mora aqui é a **tradução**, do mesmo jeito que `previa.ts` traduz um capítulo
 * para o `ObjectiveStage`: cada pergunta vira um nó da árvore, cada resposta aceita vira
 * um lance esperado, e cada defesa vira uma resposta do defensor. É conta pura e roda
 * em Node.
 *
 * ## O defensor, e por que ele não ganha regra nova
 *
 * A garantia de `lib/lesson/defensor.ts` fica **intocada**: estável dentro da tentativa,
 * rotação entre tentativas, sem `Math.random()`. A chave do lugar é o id da pergunta, que
 * é estável, e a tentativa é o contador da store.
 *
 * A **escolha fixa** também não precisa mexer na conta: com `politica: "fixa"`, só a
 * primeira defesa de cada resposta chega ao runtime, e uma lista de um item devolve
 * sempre ele. É a mesma conta, com uma entrada que o professor decidiu.
 *
 * ## As duas pontas que a árvore v1 não tinha
 *
 * - **O defensor que começa** (`defesaInicial`): a raiz da árvore é a posição **depois**
 *   do lance dele, e `fenInicial` é a de antes. O `TreeStage` mostra uma, joga o lance e
 *   chega à outra.
 * - **O defensor que fecha** (`defesaFinal`): o lance terminal do aluno não tem nó de
 *   destino. A resposta final fica em `defesasFinais`, pela pergunta e pelo lance.
 *
 * ## O lance fora da linha
 *
 * Numa linha autoral não há tablebase dizendo que o lance perde, e §16.3 proíbe a
 * mentira objetiva. Os dois textos de reserva viram *"este lance não faz parte da linha
 * treinada"*, e todo lance legal conta como "não joga o objetivo fora" — exceto o erro
 * conhecido que o professor classificou como **perde o resultado**.
 */
import { Chess } from "chess.js";
import type { Expect, Lesson, MoveTree, Position, TreeNode } from "../lesson/schema.ts";
import { fenDaQuestaoDoTreino, fenInicialDoTreino } from "./propriedade-treino.ts";
import type { AulaV2, DesenhoV2, RespostaTreinoV2, TreinoV2 } from "./modelo.ts";

/** §16.3: o lance legal fora da linha autoral, sem inventar erro objetivo. */
export const FORA_DA_LINHA = "Este lance não faz parte da linha treinada. Tente outro.";

/** O elogio da correta fora do método, quando a aula não tem catálogo. */
const ALTERNATIVA_PADRAO = "Boa alternativa. Continue pela linha ensinada.";

/** O teto de variantes do defensor que o runtime aceita (`replySchema`: 2 a 4). */
export const MAXIMO_DE_DEFESAS = 4;

export type TreinoJogavel = {
  /** Só `errors` e `fallbacks` são lidos pelo juiz; o resto da aula não existe aqui. */
  lesson: Lesson;
  tree: MoveTree;
  orientacao: "white" | "black";
  /** A posição que o aluno vê antes de tudo — antes da defesa inicial, se houver. */
  fenInicial: string;
  /** O lance que o defensor joga antes da primeira pergunta. */
  defesaInicial?: string;
  /** A última resposta do defensor, por `perguntaId:lance` do aluno. */
  defesasFinais: Record<string, string>;
  /**
   * O que o painel diz depois que o defensor joga, por `chaveDaFalaDoDefensor`: o
   * feedback da resposta seguido do texto **daquela** defesa. Só existe onde a defesa tem
   * texto; sem ele, o painel continua com o feedback, como antes.
   */
  falasDoDefensor: Record<string, string>;
  /** O que o aluno lê quando o defensor abre a linha. */
  textoDaDefesaInicial?: string;
  /** Os desenhos de cada pergunta, com a cor da autoria. */
  desenhos: Record<string, DesenhoV2 | undefined>;
  /** `termino.limite` conta meios-lances; o runtime conta lances do aluno. */
  moveLimit?: number;
  politica: TreinoV2["defensor"]["politica"];
  intro: string;
};

/** A chave de `defesasFinais`. Uma função só, para a tradução e a tela não divergirem. */
export function chaveDaDefesaFinal(perguntaId: string, uci: string): string {
  return `${perguntaId}:${uci}`;
}

/**
 * A chave de `falasDoDefensor`. O lance do aluno entra porque duas respostas da mesma
 * pergunta podem levar à mesma defesa, e cada uma tem o seu feedback.
 */
export function chaveDaFalaDoDefensor(perguntaId: string, uciDoAluno: string, uciDoDefensor: string): string {
  return `${perguntaId}:${uciDoAluno}:${uciDoDefensor}`;
}

/**
 * O feedback e o texto da defesa, como o aluno os lê: uma fala só. A régua de voz confere
 * esta mesma soma (`voz-do-treino.ts`), para a conta e a tela não divergirem.
 */
export function juntarFala(feedback: string, textoDaDefesa: string): string {
  return `${feedback} ${textoDaDefesa}`;
}

/**
 * As defesas que chegam ao runtime.
 *
 * `fixa` entrega só a primeira: é o professor quem ordena a lista, e a conta de
 * `escolherResposta` com um item devolve sempre ele.
 */
export function defesasEmJogo<T>(defesas: readonly T[], politica: TreinoV2["defensor"]["politica"]): T[] {
  return politica === "fixa" ? defesas.slice(0, 1) : [...defesas];
}

function aceita(resposta: RespostaTreinoV2): boolean {
  return resposta.julgamento !== "erro";
}

function esperado(resposta: RespostaTreinoV2, treino: TreinoV2): Expect | null {
  if (!aceita(resposta) || resposta.efeito.tipo === "repete") return null;
  const base = { moves: resposta.moves, feedback: resposta.feedback };
  if (resposta.efeito.tipo === "encerra") {
    const { condicao } = resposta.efeito;
    // `objetivo-autoral` não é uma afirmação que o formato v1 carregue, e o runtime não
    // lê `ends`: omitir é dizer menos, não dizer errado.
    return condicao === "objetivo-autoral" ? base : { ...base, ends: condicao };
  }
  const defesas = defesasEmJogo(resposta.efeito.defesas, treino.defensor.politica);
  if (defesas.length > MAXIMO_DE_DEFESAS) {
    throw new Error(`uma resposta tem ${defesas.length} defesas e o treino aceita até ${MAXIMO_DE_DEFESAS}`);
  }
  if (defesas.length === 1) return { ...base, reply: defesas[0].move, next: defesas[0].proximaQuestaoId };
  return { ...base, replies: defesas.map((defesa) => ({ reply: defesa.move, next: defesa.proximaQuestaoId })) };
}

function legais(fen: string): string[] {
  return new Chess(fen).moves({ verbose: true }).map((lance) => `${lance.from}${lance.to}${lance.promotion ?? ""}`);
}

/** §16.4: o treino como o `TreeStage` o joga. Não altera a aula. */
export function treinoJogavel(aula: AulaV2, treinoId: string, positions: Record<string, Position>): TreinoJogavel {
  const treino = aula.treinos.find((item) => item.id === treinoId);
  if (!treino) throw new Error(`treino inexistente: ${treinoId}`);
  const catalogo = new Map(aula.catalogo?.erros.map((erro) => [erro.id, erro]) ?? []);

  const errors: Lesson["errors"] = {};
  const nodes: MoveTree["nodes"] = {};
  const defesasFinais: Record<string, string> = {};
  const falasDoDefensor: Record<string, string> = {};
  const desenhos: Record<string, DesenhoV2 | undefined> = {};
  const fens = new Map(treino.questoes.map((questao) => [questao.id, fenDaQuestaoDoTreino(aula, treino, questao, positions)]));
  /**
   * O treino é julgado como final certificado só quando **toda** pergunta tem evidência da
   * própria posição. Metade certificado, metade linha autoral, daria ao aluno dois juízes
   * diferentes na mesma tentativa.
   */
  const certificado = treino.perfil === "final-certificado"
    && Boolean(aula.catalogo)
    && treino.questoes.every((questao) => treino.certificacao?.evidencias?.[questao.id]?.fen === fens.get(questao.id));

  for (const questao of treino.questoes) {
    const fen = fens.get(questao.id)!;
    const expects: Expect[] = [];
    const authorAlternatives: NonNullable<TreeNode["authorAlternatives"]> = [];
    const mistakes: NonNullable<TreeNode["mistakes"]> = [];
    const perdem = new Set<string>();

    for (const resposta of questao.respostas) {
      if (resposta.julgamento === "erro") {
        // O feedback é da **resposta**, não do catálogo: duas perguntas podem explicar o
        // mesmo erro de jeitos diferentes. O id da resposta é a chave do texto.
        const julgamento = resposta.erroId ? catalogo.get(resposta.erroId)?.julgamento : undefined;
        const verdict = julgamento === "fora-do-metodo" ? "off-method" : "loses-win";
        errors[resposta.id] = { verdict, text: resposta.feedback };
        mistakes.push({ moves: resposta.moves, errorId: resposta.id });
        if (verdict === "loses-win") resposta.moves.forEach((move) => perdem.add(move));
        continue;
      }
      const expect = esperado(resposta, treino);
      if (expect) {
        expects.push(expect);
        const { efeito } = resposta;
        for (const move of resposta.moves) {
          if (efeito.tipo === "avanca") {
            for (const defesa of efeito.defesas) {
              if (defesa.texto) falasDoDefensor[chaveDaFalaDoDefensor(questao.id, move, defesa.move)] = juntarFala(resposta.feedback, defesa.texto);
            }
          } else if (efeito.tipo === "encerra" && efeito.defesaFinal) {
            defesasFinais[chaveDaDefesaFinal(questao.id, move)] = efeito.defesaFinal;
            if (efeito.textoDaDefesaFinal) {
              falasDoDefensor[chaveDaFalaDoDefensor(questao.id, move, efeito.defesaFinal)] = juntarFala(resposta.feedback, efeito.textoDaDefesaFinal);
            }
          }
        }
      } else {
        // Aceita e repete: elogia, a peça volta, a pergunta continua.
        authorAlternatives.push({ moves: resposta.moves, feedback: resposta.feedback });
      }
    }

    // Com evidência da tablebase para esta mesma posição, o juiz é o do final certificado:
    // lance fora da linha que ainda ganha ouve o texto de "ainda ganha", e o que joga o
    // resultado fora ouve o de "perde". Sem evidência, a linha autoral não inventa erro.
    const evidencia = certificado ? treino.certificacao?.evidencias?.[questao.id] : undefined;
    nodes[questao.id] = {
      fen,
      ...(questao.dica ? { hint: questao.dica } : {}),
      expects,
      ...(mistakes.length ? { mistakes } : {}),
      ...(authorAlternatives.length ? { authorAlternatives } : {}),
      winningMoves: evidencia && evidencia.fen === fen
        ? evidencia.winningMoves
        : legais(fen).filter((move) => !perdem.has(move)),
    };
    desenhos[questao.id] = questao.desenhos;
  }

  const raiz = treino.defesaInicial?.primeiraQuestaoId
    ?? treino.questoes.find((questao) => questao.posicao.nodeId === treino.inicio.nodeId)?.id
    ?? treino.questoes[0].id;
  const fenInicial = fenInicialDoTreino(aula, treino, positions);

  return {
    lesson: {
      id: aula.id,
      errors,
      fallbacks: {
        winningOffMethod: certificado ? aula.catalogo!.mensagensPadrao.vitoriaForaDoMetodo : FORA_DA_LINHA,
        losesWin: certificado ? aula.catalogo!.mensagensPadrao.perdeResultado : FORA_DA_LINHA,
        methodAlternative: aula.catalogo?.mensagensPadrao.alternativaDoMetodo ?? ALTERNATIVA_PADRAO,
      },
    } as unknown as Lesson,
    tree: { positionId: treino.inicio.nodeId, root: raiz, goal: treino.certificacao?.resultado ?? "win", nodes },
    orientacao: treino.ladoAluno,
    fenInicial: treino.defesaInicial ? fenInicial : nodes[raiz].fen,
    ...(treino.defesaInicial ? { defesaInicial: treino.defesaInicial.move } : {}),
    ...(treino.defesaInicial?.texto ? { textoDaDefesaInicial: treino.defesaInicial.texto } : {}),
    defesasFinais,
    falasDoDefensor,
    desenhos,
    ...(treino.termino.tipo === "limite" && treino.termino.maxPlies
      ? { moveLimit: Math.ceil(treino.termino.maxPlies / 2) }
      : {}),
    politica: treino.defensor.politica,
    intro: treino.introducao ?? treino.objetivo,
  };
}
