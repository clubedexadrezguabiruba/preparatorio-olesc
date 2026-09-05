import type { Expect, Lesson, Reply, TreeNode } from "./schema";

/**
 * O julgamento de um lance do aluno nas etapas 3 e 4 (plano da F1, §3.2).
 *
 * **Zero xadrez calculado aqui.** A comparação é com três listas escritas e
 * certificadas na autoria: `expects` (o método), `mistakes` (os erros nomeados
 * do currículo) e `winningMoves` (gerada pela tablebase). O que a chess.js faz
 * em runtime é só o que sempre fez — dizer quais lances são legais e mover a
 * peça —, nunca dizer se um lance é bom.
 */

/** Lance em UCI a partir do que o tabuleiro devolve. */
export function toUci(orig: string, dest: string, promotion?: string): string {
  return `${orig}${dest}${promotion ?? ""}`;
}

/**
 * As variantes do defensor deste expect, na forma normalizada (B9/E1).
 *
 * **O normalizador mora aqui, e num lugar só.** O arquivo tem duas escritas
 * para a mesma coisa — `reply`+`next` para a resposta única, `replies` para
 * várias — e a alternativa a esta função seria cada leitor decidir sozinho o
 * que fazer com os dois campos. São oito leitores no projeto; oito opiniões
 * sobre o mesmo par de campos é como um formato novo vira bug antigo.
 *
 * Lista vazia quer dizer **nó terminal**: o lance deu mate e não há resposta. É
 * o mesmo caso que antes se lia como `reply === undefined`, agora com uma
 * pergunta só em vez de duas.
 */
export function respostasDe(expect: Expect): Reply[] {
  if (expect.replies) return expect.replies;
  if (expect.reply !== undefined && expect.next !== undefined) {
    return [{ reply: expect.reply, next: expect.next }];
  }
  return [];
}

export type MoveVerdict =
  /** Está em `expects`: é o método, a aula avança. */
  | {
      kind: "method";
      uci: string;
      feedback: string;
      /**
       * As variantes do defensor, escritas na autoria. **Lista vazia = o lance
       * deu mate**; uma entrada é o caso comum; mais de uma é a defesa que muda
       * de tentativa para tentativa (B9/E1). Quem escolhe qual é
       * `lib/lesson/defensor.ts`, não este julgamento.
       */
      respostas: Reply[];
    }
  /** Erro nomeado do currículo: texto próprio, veredito próprio. */
  | {
      kind: "named-error";
      uci: string;
      errorId: string;
      verdict: "off-method" | "loses-win";
      text: string;
      /** O lance ainda ganha? Vem de `winningMoves`, não do veredito. */
      preservesWin: boolean;
    }
  /**
   * A mesma técnica por outro caminho — só na etapa 3. O lance não é o do
   * roteiro, mas aplica a ideia da aula (o gerador provou isso na autoria, com
   * a caixa que ele deixa). O aluno é elogiado e a peça volta, para que a
   * linha escrita continue valendo. Na etapa 4 este mesmo lance é aceito e a
   * aula segue por um ramo gerado — lá ele nem chega aqui.
   */
  | { kind: "method-alternative"; uci: string; text: string; preservesWin: true }
  /**
   * O lance que a **autoria** declarou válido, com o texto dela (B8.2). Vale
   * nas duas etapas em que o aluno joga, com o mesmo comportamento: elogia e
   * devolve a peça, sem reforço vermelho e sem gastar lance do teto.
   *
   * A diferença para `method-alternative` não está na tela — está em quem
   * escreveu: aquele traz o elogio genérico da aula, este traz a frase que o
   * autor escreveu para **este** lance.
   */
  | { kind: "author-alternative"; uci: string; text: string; preservesWin: true }
  /** Fora das listas de autoria, mas a tablebase diz que ainda serve. */
  | { kind: "off-method"; uci: string; text: string; preservesWin: true }
  /** Fora das listas e fora de `winningMoves`: joga o objetivo fora. */
  | { kind: "loses-win"; uci: string; text: string; preservesWin: false };

/** `true` quando o lance não avança a aula — a peça volta e o painel fala. */
export function isRejection(verdict: MoveVerdict): boolean {
  return verdict.kind !== "method";
}

/**
 * O lance não avança a aula, mas **não é erro**: elogia, devolve a peça, e não
 * há flash vermelho na casa nem lance gasto do teto.
 *
 * Os dois casos são o mesmo gesto por origens diferentes — a máquina
 * (`methodAlternatives`, gerado) e o autor (`authorAlternatives`, escrito). O
 * predicado existe para que a tela pergunte "isto é elogio?" em vez de listar
 * as origens: uma origem nova amanhã entra aqui, e não em cada componente.
 */
export function isPraise(verdict: MoveVerdict): boolean {
  return verdict.kind === "method-alternative" || verdict.kind === "author-alternative";
}

/**
 * Classifica o lance do aluno no nó. A ordem é a da tabela da §3.2: método,
 * erro nomeado, e só então os dois fallbacks honestos.
 */
export function judgeMove(lesson: Lesson, node: TreeNode, uci: string): MoveVerdict {
  for (const expect of node.expects) {
    if (expect.moves.includes(uci)) {
      return {
        kind: "method",
        uci,
        feedback: expect.feedback,
        respostas: respostasDe(expect),
      };
    }
  }

  const preservesWin = node.winningMoves.includes(uci);

  for (const mistake of node.mistakes ?? []) {
    if (!mistake.moves.includes(uci)) continue;
    const declared = lesson.errors[mistake.errorId];
    // Erro nomeado sem texto declarado é arquivo torto — o gate recusa isso
    // (ERRO_NAO_DECLARADO). Em runtime, cai no fallback honesto em vez de
    // travar a aula do aluno.
    if (!declared) break;
    return {
      kind: "named-error",
      uci,
      errorId: mistake.errorId,
      verdict: declared.verdict,
      text: declared.text,
      preservesWin,
    };
  }

  // Antes de `methodAlternatives` e depois de `mistakes`, de propósito: o autor
  // manda sobre a geometria, mas o gate já garante que estas duas listas nunca
  // contêm o mesmo lance (ALTERNATIVA_E_ERRO) — a ordem aqui é só disciplina.
  for (const alternativa of node.authorAlternatives ?? []) {
    if (!alternativa.moves.includes(uci)) continue;
    return { kind: "author-alternative", uci, text: alternativa.feedback, preservesWin: true };
  }

  // Depois do erro nomeado, de propósito: se a autoria marcou o lance como
  // erro, o autor manda — mesmo que a geometria o aprove.
  if (node.methodAlternatives?.includes(uci)) {
    return {
      kind: "method-alternative",
      uci,
      text: lesson.fallbacks.methodAlternative,
      preservesWin: true,
    };
  }

  return preservesWin
    ? { kind: "off-method", uci, text: lesson.fallbacks.winningOffMethod, preservesWin: true }
    : { kind: "loses-win", uci, text: lesson.fallbacks.losesWin, preservesWin: false };
}

/**
 * O lance recusado joga **o objetivo da aula** fora? É este — e não o veredito
 * escrito — que encerra a tentativa na etapa 4 (§3.3): a fonte é a tablebase.
 *
 * O nome ficou de quando só existiam aulas de mate. Desde a FN1/B2 a lista
 * `winningMoves` do arquivo guarda os lances que preservam o `goal` da árvore
 * — a vitória numa aula de mate, o empate numa de Filidor —, e este predicado
 * mudou de sentido junto com ela, sem mudar de linha. Renomeá-lo custaria um
 * diff em toda a etapa 4 para não dizer nada de novo; o que precisava mudar de
 * palavra foi o que o aluno lê, e isso está em `TreeStage`.
 */
export function throwsWinAway(verdict: MoveVerdict): boolean {
  return verdict.kind !== "method" && !verdict.preservesWin;
}
