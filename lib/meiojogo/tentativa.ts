import type { ItemDeReconhecimento } from "./dicas.ts";
import { respostaDaTarefa, tarefaPorId, type Casa } from "./exercicios.ts";

/**
 * O que acontece entre o aluno tocar numa casa e a linha ir para o banco.
 *
 * ## O juiz é o mesmo do gate, e roda nos dois lados
 *
 * `casasAceitas` chama `respostaDaTarefa` — a função que `problemasDoTreino` já
 * usou para conferir a `resposta` escrita no conteúdo. A tela precisa de um
 * veredito **imediato** (o aluno tocou, a casa acende) e o servidor precisa de
 * um veredito **próprio** (a regra de `lib/tatica/gravar.ts:30-40`: o navegador
 * manda a casa, nunca um `acertou`). São dois lugares, um juiz só — a mesma
 * disciplina de `conferirSolucao` na tática.
 *
 * Rodar o juiz no navegador foi decisão medida, e não suposição: o comentário
 * de `exercicios.ts` avisa que varrer 64 casas custa 64 `Chess` montados, e por
 * isso a resposta também vem escrita no item. Medido nas 24 posições
 * publicadas: **0,18 ms de média e 0,75 ms na pior** (`m15-d2-a`, tarefa
 * `posto`). A alternativa — comparar com `item.resposta` — economizaria menos
 * de um milissegundo e criaria um segundo caminho de julgamento na tela.
 *
 * ## Por que o estado é uma função pura, e não `useState` solto na tela
 *
 * Porque três dos campos da tabela saem daqui — `tentativa`, `apoio` e a casa
 * tocada —, e "cinco cliques até acertar não são cinco exercícios" (§9 do
 * plano) só se sustenta se a contagem tiver teste. Um reducer de componente
 * seria contado por inspeção visual.
 */

/** O item, reduzido ao que o juiz precisa. */
export type ItemJulgavel = Pick<ItemDeReconhecimento, "fen" | "tarefa" | "lado">;

/**
 * O nível da escada de apoio, na ordem em que o aluno o pede — e é o número que
 * a coluna `apoio` guarda.
 *
 * 0 nenhum · 1 convite · 2 realce · 3 solução vista.
 */
export type Apoio = 0 | 1 | 2 | 3;

export const APOIO_MAXIMO: Apoio = 3;

export type EstadoDoItem = {
  readonly apoio: Apoio;
  /** Quantas respostas **diferentes** o aluno já deu neste item. */
  readonly tentativa: number;
  /** As casas tocadas, na ordem. A última é a que a tela está mostrando. */
  readonly tocadas: readonly Casa[];
  readonly acertou: boolean;
};

export const COMECO: EstadoDoItem = { apoio: 0, tentativa: 0, tocadas: [], acertou: false };

/**
 * As casas que o item aceita — perguntadas ao juiz, e não lidas do conteúdo.
 *
 * Vazio quer dizer que a posição não serve à tarefa (traço ausente, ou presente
 * duas vezes), e o gate impede que uma assim seja publicada. Não há tratamento
 * para isso aqui de propósito: um item vazio na tela é conteúdo quebrado, e
 * inventar um fallback esconderia justamente o que o gate existe para gritar.
 */
export function casasAceitas(item: ItemJulgavel): Casa[] {
  const tarefa = tarefaPorId(item.tarefa);
  if (!tarefa) throw new Error(`a tarefa "${item.tarefa}" não existe em exercicios.ts`);
  return respostaDaTarefa(item.fen, tarefa, item.lado);
}

/** Sobe um degrau da escada. No topo, fica no topo — pedir de novo não regride. */
export function comApoio(estado: EstadoDoItem): EstadoDoItem {
  if (estado.apoio >= APOIO_MAXIMO) return estado;
  return { ...estado, apoio: (estado.apoio + 1) as Apoio };
}

/**
 * O clique julgado.
 *
 * Duas coisas não mexem no estado, e as duas são o mesmo cuidado com o número
 * que o professor vai ler:
 *
 * - **casa já tocada** — o `events.select` do chessground dispara a cada toque,
 *   inclusive no segundo toque da mesma casa (que é o gesto de quem está
 *   apontando, não respondendo). Contá-lo dobraria `tentativa` sem que o aluno
 *   tivesse dado uma segunda resposta;
 * - **item já resolvido** — depois do acerto o tabuleiro continua clicável (é o
 *   mesmo tabuleiro que ele lê para entender o feedback), e um passeio pelas
 *   casas não pode virar tentativa errada.
 */
export function comClique(estado: EstadoDoItem, item: ItemJulgavel, casa: Casa): EstadoDoItem {
  if (estado.acertou || estado.tocadas.includes(casa)) return estado;
  return {
    ...estado,
    tentativa: estado.tentativa + 1,
    tocadas: [...estado.tocadas, casa],
    acertou: casasAceitas(item).includes(casa),
  };
}
