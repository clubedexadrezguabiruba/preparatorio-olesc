import { Chess } from "chess.js";
import { readOutcome } from "../chess/status.ts";
import { judgePractice } from "../lesson/practice.ts";
import type { Lesson, Position } from "../lesson/schema.ts";

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

export type EtapaDeAula = "pratica" | "revisao";

/**
 * As etapas que viram linha. A leitura é declaração e mora em `aula_lida`.
 *
 * `revisao` entrou na F2, com a repetição espaçada: é a **mesma partida**,
 * jogada dias depois. Ela não afere domínio — o que ela produz é a data que a
 * fila lê.
 *
 * **`solo` saiu daqui em 2026-09-08, e NÃO saiu do banco.** A etapa 4 deixou de
 * existir no formato, então uma tentativa `solo` que chegasse hoje não teria
 * árvore contra a qual ser reproduzida — aceitar seria gravar sem reconferir,
 * que é exatamente o que este módulo existe para não fazer. As linhas
 * históricas continuam lá, e o `check` da `0004_finais.sql` continua
 * aceitando-as: apagar o passado do aluno para arrumar o presente do código
 * seria caro e mentiroso.
 */
export const ETAPAS_DE_AULA: readonly EtapaDeAula[] = ["pratica", "revisao"];

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

/*
 * **O julgamento por ÁRVORE saiu inteiro daqui em 2026-09-08.**
 *
 * Eram quatro peças, e todas serviam à etapa 4: `lanceLegal` (a legalidade na
 * chess.js), o tipo `Desfecho`, `seguir()` (que reproduzia os lances do aluno
 * contra a árvore roteirizada, com teto de visitas para uma lista vinda da
 * rede não custar minutos de CPU) e `sobrou()` (que recusava lance depois do
 * fim da tentativa).
 *
 * A etapa 4 saiu do formato: a etapa sem ajuda virou partida contra o
 * Stockfish, e uma partida o servidor reconfere jogando os lances, não
 * seguindo roteiro — é o que `rejulgarPratica` faz logo abaixo. As peças estão
 * inteiras no histórico do git, se a árvore voltar.
 */



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
  return rejulgarPartida(lesson, posicao, lances);
}

/**
 * As posições que a **revisão** aceita.
 *
 * É a posição da prática, e é **uma só** — a mesma da aula inteira.
 *
 * A etapa 6 dava posições novas para a revisão, e o gate cobrava que fossem
 * diferentes das de ensino (`POSICAO_REAPROVEITADA`). Ela saiu em 2026-09-08:
 * revisar passou a ser jogar de novo a MESMA posição, noutro dia, e o que
 * separa a segunda passada da primeira não é a posição — é o dia. Era o braço
 * de fallback desta função; virou o único caminho.
 */
export function posicoesDeRevisao(lesson: Lesson): string[] {
  const pratica = lesson.stages.practice;
  return pratica ? [pratica.positionId] : [];
}

/**
 * Uma partida de **revisão**: a mesma prática, noutra posição.
 *
 * A conferência que muda é só a da posição — e ela não é zelo: sem ela a
 * chamada viraria "jogue qualquer posição do acervo e diga que revisou a
 * aula", e a fila de revisão passaria a contar uma revisão que não houve.
 */
export function rejulgarRevisao(
  lesson: Lesson,
  posicao: Position,
  lances: string[],
): Rejulgamento {
  if (!lesson.stages.practice) return { erro: "a aula não tem prática" };
  if (!posicoesDeRevisao(lesson).includes(posicao.id)) {
    return { erro: "a posição não é de revisão desta aula" };
  }
  return rejulgarPartida(lesson, posicao, lances);
}

/** O corpo comum da prática e da revisão: a partida reproduzida e julgada. */
function rejulgarPartida(lesson: Lesson, posicao: Position, lances: string[]): Rejulgamento {
  // O `!` é seguro: os dois chamadores conferem a existência da prática antes.
  const pratica = lesson.stages.practice!;
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
