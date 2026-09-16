import type { LinhaDoIndice } from "./rating.ts";

/**
 * Qual puzzle o aluno de rating X recebe agora — código puro, sem disco.
 *
 * ## A janela: ±20, depois ±50, ±100, ±200 e ±400
 *
 * Primeiro um puzzle a até 20 pontos do aluno; se não sobrou nenhum que ele
 * não viu, até 50; e assim por diante. É o que mantém o placar esperado perto
 * de meio a meio — o ponto em que um acerto e um erro dizem mais ao Glicko.
 *
 * O clube (vtracer) começa em ±100. **Aqui começa em ±20 por decisão do Doug
 * (15/9):** com o salto do rating em ~16 pontos (`INICIO` em `glicko2.ts`), uma
 * janela de ±100 faria o problema pular até 100 pontos de um para o outro — o
 * rating subiria de 16 em 16 e a dificuldade, não. Há ~100 problemas por ponto
 * de rating no índice, então ±20 são milhares de candidatos.
 *
 * Dentro da janela o sorteio é uniforme: sem ele, o aluno em 1143 receberia
 * sempre o puzzle mais próximo de 1143, e dois alunos com o mesmo rating
 * receberiam a mesma sequência.
 *
 * ## A janela vazia
 *
 * Com todas vazias, vale o puzzle **mais próximo** que ele não viu, de qualquer
 * lado. Isso só acontece nas pontas do índice — o recorte vai de 600 a 2099,
 * então abaixo de 200 e acima de 2500 —, e o rating do aluno vai de 100 a 3000
 * (`LIMITES` de `glicko2.ts`). O teste cobre os dois lados.
 *
 * ## "Não repete nada que o aluno já viu, em qualquer modo" (Doug, 15/9)
 *
 * `vistos` são os ids de todas as tentativas do aluno, de todos os modos. Se
 * **todos** os 147 mil já foram vistos, devolve `null` e quem chama decide o
 * que dizer. Não há braço de "fim do banco" que repete.
 *
 * ## Nunca dois mates curtos seguidos (Doug, 16/9)
 *
 * O sorteio uniforme trata todo problema igual, e os problemas fáceis do Lichess
 * são quase todos mate: entre 600 e 900, dois em cada três do índice são mate em
 * 1 ou em 2. Medido com 100 problemas seguidos e o rating parado, o aluno em 600
 * recebia **81 mates, com 64 pares seguidos**; em 750, 87 e 74.
 *
 * Com `evitarMateCurto` (o problema anterior era mate curto), a escolha procura
 * primeiro um que **não** seja: na janela em que a escolha de sempre acharia
 * problema, e na seguinte. Para quem está no meio do índice isso é ±20 e ±50.
 * Achou, é ele. Não achou, a regra cede e vale a escolha de sempre — o mate
 * perto do rating é melhor que um não-mate muito longe, porque o salto pequeno
 * também é decisão do Doug. O mate não sai do modo: só deixa de vir em
 * sequência.
 *
 * "A janela em que acharia", e não "±20" fixo: o índice começa em 600, e o
 * aluno que errou muito e caiu para 560 não tem problema nenhum a ±20. Com a
 * janela fixa a regra desistia ali — medido contra o banco, 6 de 10 mates
 * respondidos abaixo de 600 serviam outro mate.
 */

export const JANELAS = [20, 50, 100, 200, 400] as const;

/** Quantas janelas além da primeira com problema a regra dos mates olha. */
export const JANELAS_A_MAIS_SEM_MATE = 1;

export type OpcoesDaEscolha = {
  /** O problema anterior era mate em 1 ou em 2: o próximo, se der, não é. */
  readonly evitarMateCurto?: boolean;
};

/** O primeiro índice cuja nota é `>= alvo`. */
function primeiroAPartirDe(indice: readonly LinhaDoIndice[], alvo: number): number {
  let lo = 0;
  let hi = indice.length;
  while (lo < hi) {
    const meio = (lo + hi) >>> 1;
    if (indice[meio][2] < alvo) lo = meio + 1;
    else hi = meio;
  }
  return lo;
}

/** O primeiro índice cuja nota é `> alvo`. */
function primeiroDepoisDe(indice: readonly LinhaDoIndice[], alvo: number): number {
  let lo = 0;
  let hi = indice.length;
  while (lo < hi) {
    const meio = (lo + hi) >>> 1;
    if (indice[meio][2] <= alvo) lo = meio + 1;
    else hi = meio;
  }
  return lo;
}

/**
 * @param indice  as linhas de `rating-indice.json`, **em rating crescente**
 * @param rating  o rating do aluno (com casas decimais, como o banco guarda)
 * @param vistos  os ids que o aluno já viu, em qualquer modo
 * @param sorteio devolve um número em [0, 1) — `Math.random` no servidor, fixo no teste
 */
export function escolherPorRating(
  indice: readonly LinhaDoIndice[],
  rating: number,
  vistos: ReadonlySet<string>,
  sorteio: () => number,
  { evitarMateCurto = false }: OpcoesDaEscolha = {},
): LinhaDoIndice | null {
  const livresNaJanela = (janela: number, aceita: (linha: LinhaDoIndice) => boolean): LinhaDoIndice[] => {
    const de = primeiroAPartirDe(indice, rating - janela);
    const ate = primeiroDepoisDe(indice, rating + janela);
    const livres: LinhaDoIndice[] = [];
    for (let i = de; i < ate; i++) {
      if (!vistos.has(indice[i][0]) && aceita(indice[i])) livres.push(indice[i]);
    }
    return livres;
  };
  const sortearEntre = (livres: readonly LinhaDoIndice[]) =>
    livres[Math.min(livres.length - 1, Math.floor(sorteio() * livres.length))];

  const qualquer = () => true;
  const primeira = JANELAS.findIndex((janela) => livresNaJanela(janela, qualquer).length > 0);

  if (evitarMateCurto && primeira >= 0) {
    for (const janela of JANELAS.slice(primeira, primeira + 1 + JANELAS_A_MAIS_SEM_MATE)) {
      const semMate = livresNaJanela(janela, (linha) => linha[3] !== 1);
      if (semMate.length > 0) return sortearEntre(semMate);
    }
  }

  if (primeira >= 0) return sortearEntre(livresNaJanela(JANELAS[primeira], qualquer));

  // Janela vazia: o mais próximo que ele não viu, andando para os dois lados.
  let esquerda = primeiroAPartirDe(indice, rating) - 1;
  let direita = esquerda + 1;
  while (esquerda >= 0 || direita < indice.length) {
    const distE = esquerda >= 0 ? rating - indice[esquerda][2] : Infinity;
    const distD = direita < indice.length ? indice[direita][2] - rating : Infinity;
    if (distE <= distD) {
      if (!vistos.has(indice[esquerda][0])) return indice[esquerda];
      esquerda--;
    } else {
      if (!vistos.has(indice[direita][0])) return indice[direita];
      direita++;
    }
  }
  return null;
}
