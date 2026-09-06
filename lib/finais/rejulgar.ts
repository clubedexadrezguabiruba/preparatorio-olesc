import { Chess } from "chess.js";
import { readOutcome } from "../chess/status.ts";
import { judgePractice } from "../lesson/practice.ts";
import type { Lesson, MoveTree, Position } from "../lesson/schema.ts";
import { judgeMove, throwsWinAway } from "../lesson/tree.ts";

/**
 * O rejulgamento das etapas jogadas, no servidor (plano da FN1, §5).
 *
 * A aula inteira roda no navegador: a árvore de lances chega ao celular em
 * JSON, e o Stockfish da prática roda dentro da aba. Isso é o que faz a aula
 * responder na hora, e é o mesmo desenho da tática — e traz o mesmo problema:
 * **o navegador é do aluno**. Um `sucesso: true` vindo de lá seria "dominei as
 * 49 aulas" a uma chamada de rede de distância, e a coluna "Finais" do
 * relatório nasceria ficção.
 *
 * Então o que a server action recebe são **os lances**, e quem diz se eles
 * chegaram ao fim é este arquivo, rodando de novo o mesmo julgamento que o
 * tabuleiro rodou na tela: `judgeMove` na etapa sem ajuda, `judgePractice` na
 * prática. Um juiz só, dois lugares — a mesma regra de `lib/tatica/conferir.ts`.
 *
 * ## Puro, e é por isso que tem teste
 *
 * Nem `server-only`, nem Supabase, nem disco: entra a aula já lida, saem o
 * veredito e o motivo. Quem lê o arquivo e grava a linha é
 * `lib/finais/gravar.ts`, que só o `scripts/verificar-finais.ts` alcança. A
 * divisão é a mesma que separa `lib/tatica/conferir.ts` de
 * `lib/tatica/gravar.ts`, e ela existe para que a parte que **decide** caiba no
 * `node --test`.
 *
 * ## O que isto não resolve, dito com todas as letras
 *
 * Na prática (etapa 5) quem joga as pretas é o Stockfish **do navegador**.
 * Reproduzir a partida prova que ela é legal e que terminou como o aluno diz
 * que terminou; não prova que o computador jogou bem. Um aluno determinado
 * escreve os dois lados e entrega uma vitória em quatro lances.
 *
 * Contra isso não há servidor que dê jeito sem rodar o motor de novo no
 * servidor — e sobra o que sobrava na tática: o `tempo_ms` gravado ao lado. Uma
 * aula "dominada" em onze segundos aparece no relatório do professor como o que
 * é. A etapa sem ajuda, essa sim, é irrefutável: os lances do defensor estão
 * escritos na autoria e certificados pelo gate.
 */

export type EtapaDeAula = "solo" | "pratica";

/** As duas etapas que viram linha. A leitura é declaração e mora em `aula_lida`. */
export const ETAPAS_DE_AULA: readonly EtapaDeAula[] = ["solo", "pratica"];

/**
 * `erro` é o que **não vira linha**: aula que não existe, lance ilegal, arquivo
 * torto. É diferente de `sucesso: false`, que é uma tentativa de verdade que
 * não deu certo — essa é justamente a que o professor precisa ver.
 */
export type Rejulgamento = { sucesso: boolean; motivo: string } | { erro: string };

/**
 * Teto de lances numa tentativa. A etapa sem ajuda tem `moveLimit ≤ 50` e
 * aceita recusados por fora dele; a prática acaba pela regra dos 50 lances
 * muito antes disto. O número não é uma regra de xadrez — é o fim do laço para
 * uma lista que chegou pela rede.
 */
const LANCES_MAXIMOS = 400;

/**
 * Quantos nós a reprodução pode visitar antes de desistir.
 *
 * Existe por causa do retrocesso explicado em `seguir()`: com até quatro
 * variantes de defensor por nó, uma árvore inventada poderia ramificar sozinha.
 * As árvores reais têm dezenas de nós, então este teto nunca é atingido por uma
 * aula de verdade — ele existe para que uma lista de lances vinda da rede não
 * possa custar minutos de CPU do servidor.
 */
const VISITAS_MAXIMAS = 4000;

function lanceLegal(fen: string, uci: string): boolean {
  const jogo = new Chess(fen);
  try {
    jogo.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
    return true;
  } catch {
    // A chess.js lança em lance ilegal, e é o único lugar do rejulgamento em
    // que xadrez de verdade é calculado: legalidade. Se é *bom* continua sendo
    // pergunta para as listas do arquivo, nunca para o motor.
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Etapa 4 — sem ajuda
 * ------------------------------------------------------------------ */

type Desfecho =
  | { tipo: "done" }
  | { tipo: "falhou"; motivo: string }
  | { tipo: "erro"; motivo: string };

/**
 * Reproduz a tentativa a partir de um nó, e devolve como ela acabou.
 *
 * ## Por que retrocesso, e não a conta do defensor
 *
 * Quando um nó tem mais de uma resposta do defensor (B9/E1), quem escolhe na
 * tela é `escolherResposta(variantes, chave, tentativa)` — e o número da
 * tentativa só existe na store do navegador. Reproduzir a escolha exigiria
 * receber esse número junto e confiar nele.
 *
 * O caminho daqui é outro: **tenta todos os ramos e fica com o melhor
 * desfecho**. Não é frouxidão, porque cada variante do defensor é uma linha
 * escrita pela autoria e certificada pelo gate — chegar ao fim por qualquer uma
 * delas é a mesma competência. E o que se ganha é não ter mais um campo vindo
 * do navegador para conferir.
 *
 * A ordem de preferência é `done` > `falhou` > `erro`: um ramo em que os lances
 * não se encaixam não condena a tentativa se existe outro em que eles se
 * encaixam — ali é o ramo que está errado, não o aluno.
 */
function seguir(
  lesson: Lesson,
  arvore: MoveTree,
  moveLimit: number,
  lances: string[],
  nodeId: string,
  indice: number,
  usados: number,
  orcamento: { restante: number },
): Desfecho {
  if (orcamento.restante <= 0) return { tipo: "erro", motivo: "árvore grande demais para reconferir" };
  orcamento.restante -= 1;

  if (indice >= lances.length) {
    return { tipo: "falhou", motivo: "a tentativa parou no meio: a linha não chegou ao fim" };
  }

  const node = arvore.nodes[nodeId];
  // Nó apontado e inexistente é arquivo torto — o gate barra isso (NO_ORFAO).
  // Se chegou aqui, o deploy subiu sem o gate, e o aluno não paga por isso com
  // uma linha errada no histórico.
  if (!node) return { tipo: "erro", motivo: `a árvore não tem o nó "${nodeId}"` };

  const uci = lances[indice];
  if (!lanceLegal(node.fen, uci)) {
    return { tipo: "erro", motivo: `lance ilegal na posição: ${uci}` };
  }

  const verdict = judgeMove(lesson, node, uci);

  if (verdict.kind !== "method") {
    // O teto de lances existe na etapa 4, então jogar o objetivo fora encerra a
    // tentativa ali mesmo — é o `fatal` do TreeStage, na mesma ordem.
    if (throwsWinAway(verdict)) {
      return sobrou(lances, indice, {
        tipo: "falhou",
        motivo: `${uci} jogou o objetivo fora`,
      });
    }
    // Recusa que não é fatal: na tela a peça volta e o painel fala. Não gasta
    // lance do teto, e o nó não muda — o aluno joga de novo daqui.
    return seguir(lesson, arvore, moveLimit, lances, nodeId, indice + 1, usados, orcamento);
  }

  // Terminal antes do teto, como no TreeStage: o mate no último lance permitido
  // é mate, não estouro.
  if (verdict.respostas.length === 0) {
    return sobrou(lances, indice, { tipo: "done" });
  }

  const gastos = usados + 1;
  if (gastos >= moveLimit) {
    return sobrou(lances, indice, {
      tipo: "falhou",
      motivo: `o teto de ${moveLimit} lances acabou antes do fim`,
    });
  }

  let melhor: Desfecho | null = null;
  for (const { reply, next } of verdict.respostas) {
    const depoisDoLance = new Chess(node.fen);
    depoisDoLance.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4) : undefined,
    });
    // A resposta do defensor é escrita na autoria; ilegal ali é arquivo torto,
    // e o ramo não serve para reproduzir nada.
    if (!lanceLegal(depoisDoLance.fen(), reply)) {
      melhor ??= { tipo: "erro", motivo: `a resposta ${reply} do defensor é ilegal` };
      continue;
    }
    const desfecho = seguir(
      lesson,
      arvore,
      moveLimit,
      lances,
      next,
      indice + 1,
      gastos,
      orcamento,
    );
    if (desfecho.tipo === "done") return desfecho;
    if (desfecho.tipo === "falhou" && melhor?.tipo !== "falhou") melhor = desfecho;
    else melhor ??= desfecho;
  }
  return melhor ?? { tipo: "erro", motivo: "nó sem resposta de defensor utilizável" };
}

/** O desfecho vale só se ele foi o **último** lance da lista. */
function sobrou(lances: string[], indice: number, desfecho: Desfecho): Desfecho {
  if (indice + 1 < lances.length) {
    // Lance depois do fim da tentativa: a lista não descreve uma tentativa que
    // aconteceu. Não vira linha — nem de sucesso nem de fracasso.
    return { tipo: "erro", motivo: "a lista tem lances depois do fim da tentativa" };
  }
  return desfecho;
}

/**
 * A etapa 4 do aluno, reproduzida. `lances` são os lances **dele**, na ordem,
 * inclusive os recusados: na tela a peça voltou, mas ele os jogou, e é isso que
 * o histórico guarda.
 */
export function rejulgarSolo(lesson: Lesson, lances: string[]): Rejulgamento {
  const solo = lesson.stages.solo;
  if (!solo) return { erro: "a aula não tem etapa sem ajuda" };
  if (lances.length === 0) return { erro: "tentativa sem lance nenhum" };
  if (lances.length > LANCES_MAXIMOS) return { erro: "lances demais para uma tentativa" };

  const desfecho = seguir(lesson, solo, solo.moveLimit, lances, solo.root, 0, 0, {
    restante: VISITAS_MAXIMAS,
  });

  if (desfecho.tipo === "erro") return { erro: desfecho.motivo };
  if (desfecho.tipo === "falhou") return { sucesso: false, motivo: desfecho.motivo };
  return { sucesso: true, motivo: "chegou ao fim da linha dentro do teto" };
}

/* ------------------------------------------------------------------ *
 * Etapa 5 — prática contra o computador
 * ------------------------------------------------------------------ */

/**
 * A partida da etapa 5, reproduzida do começo. `lances` são os **dos dois
 * lados**, alternados — sem os do computador a posição final não existe.
 *
 * A partida é reconstruída inteira, e não lance a lance a partir de uma FEN,
 * pelo motivo que `lib/chess/status.ts` explica: `isThreefoldRepetition()` conta
 * posições no histórico da instância, e uma FEN não carrega histórico. Quem
 * reconstrói com `new Chess(fenAtual)` nunca enxerga repetição.
 */
export function rejulgarPratica(
  lesson: Lesson,
  posicao: Position,
  lances: string[],
): Rejulgamento {
  const pratica = lesson.stages.practice;
  if (!pratica) return { erro: "a aula não tem prática" };
  if (posicao.id !== pratica.positionId) return { erro: "a posição não é a da prática" };
  if (lances.length === 0) return { erro: "partida sem lance nenhum" };
  if (lances.length > LANCES_MAXIMOS) return { erro: "lances demais para uma partida" };

  const leitura = { balancedPawnlessIsDraw: pratica.goal === "draw" };
  const jogo = new Chess(posicao.fen);

  for (const [i, uci] of lances.entries()) {
    // A partida já tinha acabado e a lista continua: ou é outra partida colada
    // na primeira, ou é lista inventada. Nos dois casos não vira linha.
    if (readOutcome(jogo, leitura).over) {
      return { erro: "a lista tem lances depois do fim da partida" };
    }
    try {
      jogo.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
    } catch {
      return { erro: `lance ilegal no lance ${i + 1}: ${uci}` };
    }
  }

  const outcome = readOutcome(jogo, leitura);
  const verdict = judgePractice(outcome, pratica.goal, lesson.orientation);

  // Partida em andamento não tem o que julgar. O aluno que fecha a aba no meio
  // não fracassou — ele não terminou, e um fracasso gravado seria o servidor
  // inventando um resultado que não houve.
  if (verdict.kind === "playing") return { erro: "a partida não terminou" };

  return { sucesso: verdict.kind === "passed", motivo: outcome.over ? outcome.reason : "" };
}
