import type { ItemDeLance } from "./dicas.ts";
import { juizPorId, lancesQueAplicam, type ContratoDeLance, type LanceUci } from "./lances.ts";

/**
 * O que acontece entre o aluno arrastar uma peça e a linha ir para o banco.
 *
 * ## O juiz é o mesmo do gate, e roda nos dois lados
 *
 * `lancesDoItem` chama `lancesQueAplicam` — a função que `problemasDoTreino` já
 * usou para conferir os lances escritos no conteúdo. A tela precisa de um
 * veredito **imediato** (o aluno soltou a peça, a casa acende) e o servidor
 * precisa de um veredito **próprio** (a regra de `lib/tatica/gravar.ts:30-40`:
 * o navegador manda o lance, nunca um `acertou`). São dois lugares, um juiz só
 * — a mesma disciplina de `conferirSolucao` na tática.
 *
 * ## A exceção, e ela é declarada
 *
 * Nem todo tema tem juiz geométrico. Nas dicas de **camada autoral** quem
 * escolheu os lances foi uma pessoa, e `lancesQueAplicam` devolve vazio ali —
 * não porque a posição esteja errada, mas porque não há geometria a derivar. O
 * que a tela faz nesse caso é usar a lista escrita, e o que impede isso de ser
 * um segundo juiz é o gate: quando o juiz **fala**, a lista escrita tem de ser
 * idêntica à dele, e quando ele se cala o item é obrigado a escrever o porquê
 * (`CAMADA_AUTORAL_MUDA`).
 *
 * ## Por que o estado é uma função pura, e não `useState` solto na tela
 *
 * Porque três dos campos da tabela saem daqui — `tentativa`, `apoio` e o lance
 * jogado —, e "cinco lances até acertar não são cinco exercícios" (§9 do plano)
 * só se sustenta se a contagem tiver teste. Um reducer de componente seria
 * contado por inspeção visual.
 */

/** O item, reduzido ao que o juiz precisa. */
export type ItemJulgavel = Pick<
  ItemDeLance,
  "fen" | "tarefa" | "lado" | "lancesAceitos" | "lancesRecusados"
>;

/**
 * O nível da escada de apoio, na ordem em que o aluno o pede — e é o número que
 * a coluna `apoio` guarda.
 *
 * 0 nenhum · 1 convite · 2 realce · 3 solução vista.
 */
export type Apoio = 0 | 1 | 2 | 3;

export const APOIO_MAXIMO: Apoio = 3;

/**
 * O que a tela tem a dizer sobre o lance que o aluno acabou de jogar.
 *
 * Três, e não dois, e o terceiro é o que este módulo ganhou junto com o motor:
 *
 * - `certo` — aplica o tema e é são;
 * - `caro` — **aplica o tema** e o motor reprova. É o lance da dica jogado no
 *   pior lugar: a torre que ocupa a coluna aberta pendurando na casa de
 *   entrada. Chamar isso de "não é o lance desta dica" seria mentir para quem
 *   entendeu a dica;
 * - `fora` — não aplica o tema. Pode até ser o melhor lance da posição, e a
 *   tela não diz o contrário.
 */
export type Veredito = "certo" | "caro" | "fora";

export type EstadoDoItem = {
  readonly apoio: Apoio;
  /** Quantos lances **diferentes** o aluno já jogou neste item. */
  readonly tentativa: number;
  /** Os lances jogados, na ordem. O último é o que a tela está mostrando. */
  readonly jogados: readonly LanceUci[];
  /** O veredito de cada lance jogado, na mesma ordem. */
  readonly vereditos: readonly Veredito[];
  readonly acertou: boolean;
};

export const COMECO: EstadoDoItem = {
  apoio: 0,
  tentativa: 0,
  jogados: [],
  vereditos: [],
  acertou: false,
};

/**
 * Os lances que o item **aceita** — a geometria menos o que o motor reprovou.
 *
 * As duas subtrações importam e as duas já custaram um defeito:
 *
 * - o juiz geométrico devolve **todo** lance que aplica o tema, inclusive o que
 *   o pendura. Aceitar a lista dele inteira faria o site aprovar a torre que
 *   ocupa a coluna aberta e perde a partida — o contrário exato da dica;
 * - quando o juiz se cala (a camada autoral), quem manda é a lista escrita.
 *
 * Vazio quer dizer que a posição não serve ao tema **e** ninguém escreveu lance
 * nenhum, e o gate impede que uma assim seja publicada. Não há tratamento para
 * isso aqui de propósito: um item vazio na tela é conteúdo quebrado, e inventar
 * um fallback esconderia justamente o que o gate existe para gritar.
 */
export function lancesDoItem(item: ItemJulgavel): LanceUci[] {
  const recusados = new Set(item.lancesRecusados.map((r) => r.lance));
  const doJuiz = lancesQueAplicam(item.fen, item.tarefa, item.lado).filter(
    (l) => !recusados.has(l),
  );
  return doJuiz.length > 0 ? doJuiz : [...item.lancesAceitos].sort();
}

/** Todo lance que **aplica** o tema — aceito ou caro. O que o gate confere. */
export function lancesDoTema(item: ItemJulgavel): LanceUci[] {
  return [...lancesDoItem(item), ...item.lancesRecusados.map((r) => r.lance)].sort();
}

/**
 * O contrato do juiz do item — o enunciado que o aluno lê, a linha do acerto e
 * a linha do erro.
 *
 * Ele vem daqui e não do conteúdo da dica de propósito: o enunciado é
 * propriedade do **tema**, e cinco itens do mesmo tema perguntando com palavras
 * diferentes seriam cinco exercícios medindo a mesma coisa.
 */
export function contratoDoItem(item: ItemJulgavel): ContratoDeLance {
  const juiz = juizPorId(item.tarefa);
  if (!juiz) throw new Error(`o juiz de lance "${item.tarefa}" não existe em lances.ts`);
  return juiz.contrato;
}

/** Sobe um degrau da escada. No topo, fica no topo — pedir de novo não regride. */
export function comApoio(estado: EstadoDoItem): EstadoDoItem {
  if (estado.apoio >= APOIO_MAXIMO) return estado;
  return { ...estado, apoio: (estado.apoio + 1) as Apoio };
}

/**
 * O lance que o aluno jogou, escrito em UCI.
 *
 * O tabuleiro entrega origem e destino, e só. Quando o lance é uma promoção, o
 * UCI aceito carrega a peça no fim (`e7e8q`) e o par origem-destino não casaria
 * com ele por comparação de texto. Então a casação é pelo prefixo de quatro
 * caracteres, e o que fica gravado é o **lance aceito inteiro** — assim o
 * registro guarda o lance de verdade, e não uma versão dele sem a promoção.
 */
export function uciDoToque(orig: string, dest: string, aceitos: readonly LanceUci[]): LanceUci {
  const curto = `${orig}${dest}`;
  return aceitos.find((l) => l.slice(0, 4) === curto) ?? curto;
}

/**
 * O lance julgado.
 *
 * Duas coisas não mexem no estado, e as duas são o mesmo cuidado com o número
 * que o professor vai ler:
 *
 * - **lance já jogado** — o aluno que desfaz e refaz o mesmo lance está
 *   apontando, não respondendo. Contá-lo dobraria `tentativa` sem que ele
 *   tivesse dado uma segunda resposta;
 * - **item já resolvido** — depois do acerto o tabuleiro continua vivo (é o
 *   mesmo tabuleiro que ele lê para entender o feedback), e um passeio pelas
 *   peças não pode virar tentativa errada.
 */
export function comLance(estado: EstadoDoItem, item: ItemJulgavel, lance: LanceUci): EstadoDoItem {
  if (estado.acertou || estado.jogados.includes(lance)) return estado;
  const veredito = julgar(item, lance);
  return {
    ...estado,
    tentativa: estado.tentativa + 1,
    jogados: [...estado.jogados, lance],
    vereditos: [...estado.vereditos, veredito],
    acertou: veredito === "certo",
  };
}

/** O veredito de um lance: aplica e é são, aplica e custa caro, ou não aplica. */
export function julgar(item: ItemJulgavel, lance: LanceUci): Veredito {
  if (lancesDoItem(item).includes(lance)) return "certo";
  if (item.lancesRecusados.some((r) => r.lance === lance)) return "caro";
  return "fora";
}

/** O que o motor mediu no lance caro, para a tela dizer o tamanho do estrago. */
export function custoDoRecusado(item: ItemJulgavel, lance: LanceUci): number | null {
  return item.lancesRecusados.find((r) => r.lance === lance)?.custo ?? null;
}
