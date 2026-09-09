import { Chess } from "chess.js";
import type {
  Expect,
  GuidedStage,
  Lesson,
  RoteiroPasso,
  TerminalEnd,
  TreeGoal,
  TreeNode,
} from "./schema.ts";

/**
 * **A etapa 3 derivada da etapa 2.**
 *
 * ## Por que isto existe
 *
 * O projeto já exigia, em teste, que a linha da aula assistida e a linha do
 * treino fossem a **mesma** — `lib/lesson/roteiro.test.ts`, "o que a etapa 1
 * mostra e o que a etapa 2 pede têm de ser a MESMA linha". Sendo a mesma,
 * escrevê-la duas vezes era transcrever à mão o que a máquina sabe derivar: as
 * FEN de cada nó, quem responde o quê, para onde cada expect aponta, onde a
 * linha acaba. Era essa transcrição que fazia a etapa custar 6 a 8 horas por
 * aula — e é por isso que 39 das 49 aulas da trilha não a teriam nunca.
 *
 * O que sobra para o autor é o que nenhuma máquina sabe: para onde apontar a
 * flecha **antes** do lance, o que dizer enquanto o aluno pensa, quais erros
 * têm nome. Isso mora em `objective.roteiro[i].treino` (ver `passoTreinoSchema`)
 * e em `objective.treino`.
 *
 * ## As regras de casa deste arquivo
 *
 * **Puro.** Sem `node:fs` e sem rede. Ele ganha teste em `node --test` e, no dia
 * do modo autor, roda no navegador com `pedir` devolvendo `null`.
 *
 * **Ele devolve problemas; quem chama `fail()` é o gate.** Um módulo que
 * soubesse reprovar teria opinião sobre o processo de autoria, e o processo é do
 * gate.
 *
 * **Ele nunca julga xadrez.** A chess.js entra só para aplicar o que está
 * escrito e dizer de quem é a vez. Quem diz se um lance ganha é a tablebase, e
 * ela chega por `pedir`.
 */

/** Um problema do roteiro, no vocabulário de código do gate. */
export type ProblemaDoRoteiro = {
  code:
    | "ROTEIRO_ILEGAL"
    | "ROTEIRO_COMECA_ERRADO"
    | "ROTEIRO_NAO_FECHA"
    | "TREINO_SEM_NO";
  /** Índice do passo no roteiro; `null` quando o problema é da etapa inteira. */
  passo: number | null;
  message: string;
};

export type DerivacaoDoTreino = {
  /**
   * A etapa 3 pronta, ou `null` quando não há o que derivar — aula sem etapa 2,
   * ou roteiro em que o aluno nunca joga.
   */
  tree: GuidedStage | null;
  problemas: ProblemaDoRoteiro[];
};

/**
 * O que a derivação precisa saber da posição da aula.
 *
 * **Divergência declarada em relação ao plano**, que passava só a FEN: o `goal`
 * da árvore sai de `expectedResult`, e sem ele a derivação teria de adivinhar
 * entre "ganhar" e "empatar" — que é justamente a incoerência que o
 * `OBJETIVO_INCOERENTE` do gate existe para pegar. Adivinhar aqui seria plantar
 * o erro e depois cobrá-lo.
 */
export type PosicaoDaAula = {
  fen: string;
  expectedResult: string;
};

/** Todos os lances que preservam o objetivo, ou `null` quando não se sabe. */
export type PedirLances = (fen: string) => readonly string[] | null;

/** O id do k-ésimo nó do aluno. Nunca `g<n>`, que é do gerador de ramos. */
function idDoNo(k: number): string {
  return `n${k}`;
}

function aplicar(game: Chess, uci: string): boolean {
  try {
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Como a linha acaba, na ordem em que as afirmações se excluem.
 *
 * A derivação **propõe**; quem julga é o `checkTerminal` do gate, contra a
 * tablebase e de forma independente. Duas conclusões sobre o mesmo lance é o
 * desenho: a segunda existe para pegar a primeira errada.
 *
 * `"mate"` não é escrito no arquivo — o `expectSchema` diz que a ausência de
 * `ends` significa mate, e escrever o padrão encheria as 49 aulas de uma linha
 * que não informa nada.
 */
function fimDaLinha(game: Chess, uci: string, goal: TreeGoal): TerminalEnd {
  if (game.isCheckmate()) return "mate";
  if (uci.length === 5) return "promotion";
  if (goal === "draw") return "draw-secured";
  return "tablebase-win";
}

/**
 * A costura: a fala do passo do aluno seguida da fala do passo do defensor.
 *
 * É o que a N1-KPK fez à mão, um nó de cada vez — "Isso. De c7 o rei branco
 * tira c8 e b8 do preto. Agora o preto vai por cima, atrás do peão." é o passo
 * do aluno e o do defensor, um atrás do outro. A costura é o padrão; o autor
 * que quiser outra redação escreve `treino.feedback`.
 */
function costurar(doAluno: string, doDefensor: string | null): string {
  return doDefensor === null ? doAluno : `${doAluno} ${doDefensor}`;
}

/** Um passo do aluno já casado com a resposta do defensor, se houver. */
type NoEmConstrucao = {
  id: string;
  fen: string;
  uci: string;
  passo: RoteiroPasso;
  indice: number;
  resposta: { uci: string; fala: string } | null;
  proximo: string | null;
};

export function derivarTreino(
  lesson: Lesson,
  posicao: PosicaoDaAula,
  pedir: PedirLances,
): DerivacaoDoTreino {
  const problemas: ProblemaDoRoteiro[] = [];
  const objective = lesson.stages.objective;
  if (!objective) return { tree: null, problemas };

  const goal: TreeGoal = posicao.expectedResult === "draw" ? "draw" : "win";
  const ladoDoAluno = lesson.orientation === "white" ? "w" : "b";

  const game = new Chess();
  try {
    game.load(posicao.fen);
  } catch {
    // FEN da posição malformada já é reprovada pelo `checkPosition` do gate;
    // acusar duas vezes a mesma coisa em nome de campos diferentes não ajuda
    // ninguém a consertar nada.
    return { tree: null, problemas };
  }

  const emConstrucao: NoEmConstrucao[] = [];
  let ultimoFoiDoDefensor = false;

  for (const [i, passo] of objective.roteiro.entries()) {
    if (!passo.lance) {
      if (passo.treino) {
        problemas.push({
          code: "TREINO_SEM_NO",
          passo: i,
          message:
            "o passo não tem `lance`, então não vira nó da etapa 3 — o bloco `treino` " +
            "ficaria sem quem o lesse",
        });
      }
      continue;
    }

    /*
     * **A vez sai do tabuleiro, nunca da paridade do índice.** Um roteiro que
     * abrisse com o defensor na vez — a N0-MATING-MATERIAL joga de pretas —
     * trocaria os dois lados em silêncio, e o treino pediria ao aluno os lances
     * do adversário.
     */
    const doAluno = game.turn() === ladoDoAluno;

    if (!doAluno && emConstrucao.length === 0) {
      problemas.push({
        code: "ROTEIRO_COMECA_ERRADO",
        passo: i,
        message:
          `o primeiro lance do roteiro ("${passo.lance}") é do defensor — a etapa 3 começa ` +
          "com o aluno jogando, e um roteiro que abre pelo outro lado não tem nó de partida",
      });
      return { tree: null, problemas };
    }

    const fenAntes = game.fen();
    if (!aplicar(game, passo.lance)) {
      problemas.push({
        code: "ROTEIRO_ILEGAL",
        passo: i,
        message:
          `"${passo.lance}" não é legal em "${fenAntes}" — o roteiro é encadeado a partir ` +
          "da posição da aula, e ele parou aqui",
      });
      return { tree: null, problemas };
    }

    if (doAluno) {
      emConstrucao.push({
        id: idDoNo(emConstrucao.length + 1),
        fen: fenAntes,
        uci: passo.lance,
        passo,
        indice: i,
        resposta: null,
        proximo: null,
      });
      ultimoFoiDoDefensor = false;
      continue;
    }

    if (passo.treino) {
      problemas.push({
        code: "TREINO_SEM_NO",
        passo: i,
        message:
          "o lance deste passo é do defensor, e passo do defensor não vira nó — o que a " +
          "etapa 3 mostra antes dele mora no `treino` do passo do ALUNO anterior",
      });
    }
    const anterior = emConstrucao[emConstrucao.length - 1];
    anterior.resposta = { uci: passo.lance, fala: passo.fala };
    ultimoFoiDoDefensor = true;
  }

  if (emConstrucao.length === 0) return { tree: null, problemas };

  if (ultimoFoiDoDefensor) {
    const ultimo = emConstrucao[emConstrucao.length - 1];
    problemas.push({
      code: "ROTEIRO_NAO_FECHA",
      passo: ultimo.resposta === null ? null : objective.roteiro.length - 1,
      message:
        `o último lance do roteiro é do defensor ("${ultimo.resposta?.uci}") — a linha ` +
        "termina com o adversário jogando, e a etapa 3 ficaria sem nó terminal",
    });
    return { tree: null, problemas };
  }

  // O `next` de cada nó é o nó seguinte; o último não tem.
  for (const [k, no] of emConstrucao.entries()) {
    no.proximo = k + 1 < emConstrucao.length ? emConstrucao[k + 1].id : null;
  }

  const nodes: Record<string, TreeNode> = {};
  for (const no of emConstrucao) {
    const treino = no.passo.treino;

    const expect: Expect = { moves: [no.uci] } as Expect;
    if (no.resposta && no.proximo) {
      (expect as { reply?: string }).reply = no.resposta.uci;
      (expect as { next?: string }).next = no.proximo;
    } else {
      // O fim da linha é conferido no tabuleiro que a própria derivação andou.
      const ate = new Chess(no.fen);
      aplicar(ate, no.uci);
      const ends = fimDaLinha(ate, no.uci, goal);
      if (ends !== "mate") (expect as { ends?: TerminalEnd }).ends = ends;
    }
    (expect as { feedback: string }).feedback =
      treino?.feedback ?? costurar(no.passo.fala, no.resposta?.fala ?? null);

    // A ordem das chaves é a do arquivo escrito à mão, e ela importa: o
    // `--write` regrava o JSON inteiro, e uma ordem diferente viraria um diff
    // de dezenas de linhas que não trocou lance nenhum de lugar.
    const node: TreeNode = { fen: no.fen } as TreeNode;
    if (treino?.dica !== undefined) (node as { hint?: string }).hint = treino.dica;
    if (treino?.arrows) (node as { arrows?: unknown }).arrows = treino.arrows;
    if (treino?.highlights) (node as { highlights?: unknown }).highlights = treino.highlights;
    (node as { expects: Expect[] }).expects = [expect];
    if (treino?.erros) (node as { mistakes?: unknown }).mistakes = treino.erros;
    if (treino?.alternativas) {
      (node as { authorAlternatives?: unknown }).authorAlternatives = treino.alternativas;
    }
    (node as { winningMoves: string[] }).winningMoves = [...(pedir(no.fen) ?? [])];
    (node as { generated?: true }).generated = true;

    nodes[no.id] = node;
  }

  const tree = { positionId: objective.positionId, goal, root: idDoNo(1) } as GuidedStage;
  if (objective.treino?.intro !== undefined) {
    (tree as { intro?: string }).intro = objective.treino.intro;
  }
  if (objective.treino?.showBox !== undefined) {
    (tree as { showBox?: boolean }).showBox = objective.treino.showBox;
  }
  (tree as { nodes: Record<string, TreeNode> }).nodes = nodes;

  return { tree, problemas };
}

/**
 * O que a comparação "o arquivo bate com o derivado?" olha.
 *
 * **Fora ficam `winningMoves` e `methodAlternatives`**, e o motivo é o mesmo
 * dos dois: eles têm juiz próprio — `WINNING_MOVES_DESATUALIZADO` e
 * `ALTERNATIVAS_DESATUALIZADAS` —, e um segundo juiz sobre a mesma pergunta só
 * produz dois vermelhos para um conserto. Também ficam fora os expects que o
 * gerador de ramos escreveu (`generated: true` no expect) e os nós `g<n>`, pela
 * mesma razão.
 *
 * O que sobra é exatamente o que a derivação decide: a linha, as FEN, os
 * ponteiros entre nós, o desenho, as falas e os erros.
 */
export function esqueletoDoTreino(tree: GuidedStage): unknown {
  const nodes: Record<string, unknown> = {};
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (/^g[0-9]+$/.test(id)) continue;
    nodes[id] = {
      fen: node.fen,
      hint: node.hint ?? null,
      arrows: node.arrows ?? null,
      highlights: node.highlights ?? null,
      expects: node.expects
        .filter((e) => e.generated !== true)
        .map((e) => ({
          moves: e.moves,
          reply: e.reply ?? null,
          next: e.next ?? null,
          replies: e.replies ?? null,
          ends: e.ends ?? null,
          feedback: e.feedback,
        })),
      mistakes: node.mistakes ?? null,
      authorAlternatives: node.authorAlternatives ?? null,
    };
  }
  return {
    positionId: tree.positionId,
    goal: tree.goal,
    root: tree.root,
    intro: tree.intro ?? null,
    showBox: tree.showBox ?? null,
    nodes,
  };
}
