/**
 * O Glicko-2 do modo "tática com rating" — código puro, sem banco.
 *
 * ## De onde vem
 *
 * É o sistema do artigo do Mark Glickman ("Example of the Glicko-2 system",
 * glicko.net), no formato do artigo: um jogador e a lista de resultados de um
 * período. Um puzzle é o caso de **um resultado só** — o aluno "jogou" contra o
 * problema, e o placar é 1 se acertou e 0 se errou.
 *
 * O método (τ, limites e a correção do passo 5) é o do clube — o início não:
 * ver `INICIO` —,
 * portado de `recruta64-vtracer/supabase/migrations/
 * 20260217200000_fix_revanche_queue_definitive.sql:46-175`. Copiamos o método,
 * não o arquivo: lá ele é uma função SQL amarrada à RPC do puzzle; aqui o
 * servidor julga em TypeScript (`lib/tatica/gravar-rating.ts`), e esta função
 * precisa rodar num teste do `npm test`.
 *
 * A correção que o clube teve de fazer em 17/02 vem junto: quando
 * `Δ² ≤ φ² + v`, o artigo manda procurar o menor `k` com `f(a − kτ) < 0`.
 * A versão antiga de lá tirava `ln` de um número negativo e quebrava toda
 * derrota de um jogador em 400/350.
 *
 * ## O RD do puzzle é constante: 75
 *
 * O Lichess publica o `RatingDeviation` de cada puzzle, mas o nosso recorte não
 * o guarda (`lib/tatica/puzzles.ts`, tipo `Puzzle`): o filtro de qualidade já
 * exige RD ≤ 100 (`scripts/filtrar-puzzles.ts`), então todo puzzle servido está
 * entre ~50 e 100. Guardar o número exato custaria refazer os 36 MB do recorte
 * para mexer o delta em um ou dois pontos. 75 é o meio da faixa aceita.
 *
 * ## Casas decimais
 *
 * Esta função devolve os valores **sem arredondar** (só com os limites), e é
 * assim que o banco os guarda. Quem arredonda é a tela. Arredondar a cada
 * puzzle, como o clube faz com o rating, acumularia erro: um aluno que ganha
 * +0,4 cinquenta vezes seguidas ficaria parado.
 */

/** O τ do clube (e do exemplo do artigo): quanto a volatilidade pode mudar. */
export const TAU = 0.5;

/** A régua do Glicko-2: 173,7178 = 400 / ln(10). */
const ESCALA = 173.7178;

/** Tolerância da iteração de Illinois (passo 5). */
const EPSILON = 0.000001;

/** Os limites do clube. */
export const LIMITES = {
  rating: [100, 3000],
  rd: [30, 350],
  volatilidade: [0.01, 0.15],
} as const;

/**
 * Onde o aluno começa: **o rating de entrada que o professor anotou no perfil**
 * (`perfis.rating`), com piso de 600 — decisão do Doug de 15/9, depois de testar.
 *
 * ## Por que o RD começa em 80, e não nos 350 do clube
 *
 * O RD é a incerteza do Glicko sobre o aluno, e é ele que decide o tamanho do
 * salto. Com 350, o primeiro acerto valia +175 e o problema seguinte vinha 175
 * pontos mais difícil. O Doug pediu progressão de "20 em 20". Medido em 15/9, a
 * partir de 600 e com o problema na altura do aluno:
 *
 * | RD inicial | seis acertos seguidos            | acertos de 600 a 1000 |
 * |------------|----------------------------------|-----------------------|
 * | 350        | +175 +118 +88 +72 +59 +51        | 4                     |
 * | 100        | +26 +25 +23 +22 +22 +20          | 23                    |
 * | **80**     | **+17 +17 +16 +16 +16 +15**      | **31**                |
 * | 60         | +10 +10 +10 +10 +11 +10          | 40                    |
 *
 * Com o uso, o RD assenta sozinho perto de 61 e o salto em ~11 pontos (medido em
 * 300 respostas alternadas), sem descer disso: fica no "de 10 a 20" pedido.
 *
 * O salto pequeno é o que obriga o início pelo rating de entrada: sem ele, um
 * aluno de 1400 levaria ~50 acertos para chegar à altura dele. O piso de 600 é
 * o problema mais fácil do recorte (`scripts/base-rating.ts`) — começar abaixo
 * seria subir de graça contra problemas que não mudam.
 */
export const INICIO = { rd: 80, volatilidade: 0.06 } as const;

/** O menor rating de início: o problema mais fácil que o recorte tem. */
export const PISO_DO_INICIO = 600;

/** O rating de início de um aluno, a partir do rating de entrada do perfil (ou nenhum). */
export function ratingInicial(ratingDeEntrada: number | null | undefined): number {
  const entrada = typeof ratingDeEntrada === "number" && Number.isFinite(ratingDeEntrada) ? ratingDeEntrada : 0;
  return Math.min(LIMITES.rating[1], Math.max(PISO_DO_INICIO, Math.round(entrada)));
}

/** Ver o cabeçalho: o recorte não guarda o RD do puzzle. */
export const RD_DO_PUZZLE = 75;

export type Jogador = {
  readonly rating: number;
  readonly rd: number;
  readonly volatilidade: number;
};

export type Resultado = {
  /** O rating do adversário — aqui, do puzzle. */
  readonly rating: number;
  readonly rd: number;
  /** 1 vitória, 0 derrota (e 0,5 empate, que o puzzle não tem). */
  readonly placar: number;
};

function limitar(valor: number, [piso, teto]: readonly [number, number]): number {
  return Math.min(teto, Math.max(piso, valor));
}

/** g(φ) do passo 3. */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/** E(μ, μj, φj) do passo 3. */
function esperado(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * O novo rating, RD e volatilidade de `jogador` depois de `resultados`.
 *
 * Os oito passos do artigo, com os nomes de lá nos comentários.
 */
export function glicko2(jogador: Jogador, resultados: readonly Resultado[]): Jogador {
  // Passo 2: para a escala do Glicko-2.
  const mu = (jogador.rating - 1500) / ESCALA;
  const phi = jogador.rd / ESCALA;
  const sigma = jogador.volatilidade;

  // Período sem partida: só o RD cresce (o artigo, no fim do passo 6).
  if (resultados.length === 0) {
    return {
      rating: limitar(jogador.rating, LIMITES.rating),
      rd: limitar(Math.sqrt(phi * phi + sigma * sigma) * ESCALA, LIMITES.rd),
      volatilidade: limitar(sigma, LIMITES.volatilidade),
    };
  }

  const adversarios = resultados.map((r) => ({
    muJ: (r.rating - 1500) / ESCALA,
    phiJ: r.rd / ESCALA,
    placar: r.placar,
  }));

  // Passo 3: v, a variância estimada pelo resultado.
  let somaV = 0;
  // Passo 4: Δ, a melhora estimada.
  let somaDelta = 0;
  for (const { muJ, phiJ, placar } of adversarios) {
    const gj = g(phiJ);
    const ej = esperado(mu, muJ, phiJ);
    somaV += gj * gj * ej * (1 - ej);
    somaDelta += gj * (placar - ej);
  }
  const v = 1 / somaV;
  const delta = v * somaDelta;

  // Passo 5: a nova volatilidade σ', pelo método de Illinois.
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const denominador = phi * phi + v + ex;
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * denominador * denominador) - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    // A correção do clube: o menor k com f(a − kτ) < 0, e não um `ln` de negativo.
    let k = 1;
    while (f(a - k * TAU) >= 0 && k <= 100) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > EPSILON; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  const sigmaLinha = Math.exp(A / 2);

  // Passo 6: φ*, o RD de antes do período, alargado pela volatilidade.
  const phiEstrela = Math.sqrt(phi * phi + sigmaLinha * sigmaLinha);

  // Passo 7: o novo φ' e o novo μ'.
  const phiLinha = 1 / Math.sqrt(1 / (phiEstrela * phiEstrela) + 1 / v);
  const muLinha = mu + phiLinha * phiLinha * somaDelta;

  // Passo 8: de volta à escala de rating, e os limites do clube.
  return {
    rating: limitar(muLinha * ESCALA + 1500, LIMITES.rating),
    rd: limitar(phiLinha * ESCALA, LIMITES.rd),
    volatilidade: limitar(sigmaLinha, LIMITES.volatilidade),
  };
}

/**
 * O caso do modo rating: um aluno, um puzzle, acertou ou não.
 *
 * O `delta` é o que a tela mostra ("+8", "−12"): a diferença **arredondada** dos
 * ratings arredondados, para o aluno que soma os deltas na cabeça chegar ao
 * número que a tela mostra.
 */
export function aposPuzzle(
  jogador: Jogador,
  ratingDoPuzzle: number,
  acertou: boolean,
): Jogador & { readonly delta: number } {
  const depois = glicko2(jogador, [{ rating: ratingDoPuzzle, rd: RD_DO_PUZZLE, placar: acertou ? 1 : 0 }]);
  return { ...depois, delta: Math.round(depois.rating) - Math.round(jogador.rating) };
}
