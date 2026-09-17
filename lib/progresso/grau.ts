/**
 * O grau de cada item do site — pedido do Doug depois do feedback de 17/9/2026: "níveis visíveis por
 * item no site todo, mostrando o degrau atual (errou, desce)".
 *
 * ## Por que "grau", e por que estes nomes
 *
 * O site já tem três escadas com nome: o **Nível 1–5** do curso (`lib/curso/nivel.ts`), o **degrau**
 * da revisão espaçada (`lib/repertorio/treino.ts`, `lib/finais/escada.ts`) e o repertório **Avançado**.
 * Um quarto "nível" colidiria com o primeiro; por isso `Grau`, e por isso "Experiente" no lugar de
 * "Avançado" no quarto nome.
 *
 * ## Duas réguas, uma escala
 *
 * - **Linha do move trainer e aula de finais:** o grau **é** o degrau atual da escada (0 a 5). A
 *   escada já sobe só em dia vencido e já derruba no erro — inventar outra conta daria ao aluno dois
 *   números para a mesma memória. Aula de abertura é o menor grau das suas linhas.
 * - **Tema de tática:** não há escada por tema, então a conta é sobre `tentativas_puzzle` — ver
 *   {@link grauDoTema}.
 *
 * Módulo puro e sem `server-only`: a tela do fim da passada (cliente) diz "subiu para Intermediário"
 * com a mesma função que a página de progresso usa.
 */

export type Grau = 0 | 1 | 2 | 3 | 4 | 5;

export const GRAUS: readonly Grau[] = [0, 1, 2, 3, 4, 5];

export const NOME_DO_GRAU: Record<Grau, string> = {
  0: "Novato",
  1: "Aprendiz",
  2: "Intermediário",
  3: "Experiente",
  4: "Especialista",
  5: "Mestre",
};

const comoGrau = (n: number): Grau => Math.max(0, Math.min(5, Math.floor(n))) as Grau;

/* ------------------------------------------------------------------ *
 * A escada: linha do move trainer e aula de finais
 * ------------------------------------------------------------------ */

/**
 * O grau de algo que tem escada: o degrau **atual**. Nunca treinado é Novato; a linha aprendida
 * (degrau 3) é Experiente; o erro que derruba o degrau derruba o grau junto.
 */
export function grauDaEscada(progresso: { readonly degrau: number } | null | undefined): Grau {
  return comoGrau(progresso?.degrau ?? 0);
}

/**
 * A aula de finais. Com prática, o degrau da escada (`juntarEscadas` já juntou as várias práticas no
 * degrau da menos avançada). Sem prática não há escada: assistida até o fim é o "aprendida" dela
 * (`aprendeu` em `lib/finais/trilha.ts`), e vale Experiente — o mesmo grau da linha aprendida.
 */
export function grauDaAulaDeFinais(
  temPratica: boolean,
  progresso: { readonly escada: { readonly degrau: number }; readonly lida: boolean },
): Grau {
  if (temPratica) return grauDaEscada(progresso.escada);
  return progresso.lida ? 3 : 0;
}

/** A aula de abertura vale o que vale a sua linha mais fraca. Sem linha, Novato. */
export function grauDaAulaDeAbertura(graus: readonly Grau[]): Grau {
  return graus.length === 0 ? 0 : comoGrau(Math.min(...graus));
}

/** O grau novo, se subiu; `null` se ficou ou desceu. É o "subiu para Intermediário" do fim da passada. */
export function subiuPara(antes: Grau, depois: Grau): Grau | null {
  return depois > antes ? depois : null;
}

/* ------------------------------------------------------------------ *
 * A tática, por tema
 * ------------------------------------------------------------------ */

/** Uma tentativa num tema, em qualquer modo (aquecimento, série, prova, revisão, rating, prova de nível). */
export type TentativaDoTema = {
  readonly acertou: boolean;
  /** O rating do puzzle, quando o acervo o tem. */
  readonly rating: number | null;
  readonly criadaEm: string;
};

/**
 * A régua da tática. **Calibrada contra o acervo em 17/9/2026** (`public/puzzles/index.json` e
 * `rating-indice.json`, 233.897 puzzles):
 *
 * - cada tema tem de 212 a 7.230 puzzles, com piso entre 700 e 1100 e teto 2100; a mediana de rating
 *   de cada tema fica entre 1116 (blindSwineMate) e 1832 (underPromotion), e a do acervo é 1473;
 * - o caminho do tema no curso são **39 puzzles** (5 + 24 + 10), a ~1450 de média — um tema feito
 *   inteiro com 75 % de acerto soma ~40 pontos.
 *
 * Daí: **Aprendiz** são os primeiros acertos (3 pontos ≈ o aquecimento), **Intermediário** é meia
 * série (15), **Experiente** é o tema inteiro bem feito (35 e 70 % recente). **Especialista** e
 * **Mestre** pedem mais do que o curso exige — repetir, no modo rating ou na revisão — e, além dos
 * pontos, acerto alto **nos últimos 30** e acertos em puzzles difíceis do tema (rating no quartil de
 * cima do acervo daquele tema, entre 1184 e 1966 conforme o tema). Os pontos nunca diminuem; o que
 * derruba o grau é a janela recente piorar.
 */
export const REGUA_DA_TATICA = {
  /** Quantas tentativas recentes a janela olha. */
  janela: 30,
  /** O peso de um acerto é o rating do puzzle / 1000, entre estes limites; sem rating, 1. */
  pesoMinimo: 0.6,
  pesoMaximo: 2.1,
  graus: {
    1: { pontos: 3, acertoRecente: 0, minimoNaJanela: 0, dificeis: 0 },
    2: { pontos: 15, acertoRecente: 0, minimoNaJanela: 0, dificeis: 0 },
    3: { pontos: 35, acertoRecente: 0.7, minimoNaJanela: 20, dificeis: 0 },
    4: { pontos: 60, acertoRecente: 0.8, minimoNaJanela: 30, dificeis: 8 },
    5: { pontos: 100, acertoRecente: 0.9, minimoNaJanela: 30, dificeis: 20 },
  },
} as const;

export function pesoDoPuzzle(rating: number | null): number {
  if (rating === null || !Number.isFinite(rating)) return 1;
  return Math.min(REGUA_DA_TATICA.pesoMaximo, Math.max(REGUA_DA_TATICA.pesoMinimo, rating / 1000));
}

export type MedidaDoTema = {
  /** Acertos pesados pela dificuldade. */
  readonly pontos: number;
  readonly tentativas: number;
  /** A janela recente: quantas tentativas ela tem e quantas acertou. */
  readonly janela: { readonly tentativas: number; readonly acertos: number };
  /** Acertos em puzzles com rating ≥ o limiar de difícil do tema. */
  readonly dificeis: number;
};

/** As contas de um tema, sobre as tentativas dele em qualquer ordem. */
export function medidaDoTema(
  tentativas: readonly TentativaDoTema[],
  { dificil }: { dificil: number },
): MedidaDoTema {
  const emOrdem = [...tentativas].sort((a, b) => Date.parse(a.criadaEm) - Date.parse(b.criadaEm));
  const recentes = emOrdem.slice(-REGUA_DA_TATICA.janela);
  let pontos = 0;
  let dificeis = 0;
  for (const t of emOrdem) {
    if (!t.acertou) continue;
    pontos += pesoDoPuzzle(t.rating);
    if (t.rating !== null && t.rating >= dificil) dificeis += 1;
  }
  return {
    pontos: Math.round(pontos * 100) / 100,
    tentativas: emOrdem.length,
    janela: { tentativas: recentes.length, acertos: recentes.filter((t) => t.acertou).length },
    dificeis,
  };
}

/** A medida cumpre o grau `g`? */
function cumpre(medida: MedidaDoTema, g: Exclude<Grau, 0>): boolean {
  const regra = REGUA_DA_TATICA.graus[g];
  if (medida.pontos < regra.pontos || medida.dificeis < regra.dificeis) return false;
  if (regra.acertoRecente === 0) return true;
  const { tentativas, acertos } = medida.janela;
  return tentativas >= regra.minimoNaJanela && acertos / tentativas >= regra.acertoRecente;
}

/** O grau do tema a partir da medida: o mais alto cujas condições **todas** valem hoje. */
export function grauDaMedida(medida: MedidaDoTema): Grau {
  for (const g of [5, 4, 3, 2, 1] as const) if (cumpre(medida, g)) return g;
  return 0;
}

/**
 * O grau de um tema de tática.
 *
 * **Todos os modos contam**, e é de propósito: o aluno que resolve garfo no modo rating está
 * praticando garfo. Quem decide a que tema uma tentativa pertence é quem chama (os temas gravados do
 * problema, ou o arquivo de onde ele foi servido — `temasDaTentativa` em
 * `lib/tatica/rating-historico.ts`).
 */
export function grauDoTema(tentativas: readonly TentativaDoTema[], opcoes: { dificil: number }): Grau {
  return grauDaMedida(medidaDoTema(tentativas, opcoes));
}

/** O que falta para o grau seguinte, em palavras curtas. `null` em Mestre. */
export function faltaNoTema(medida: MedidaDoTema): string | null {
  const atual = grauDaMedida(medida);
  if (atual === 5) return null;
  const proximo = (atual + 1) as Exclude<Grau, 0>;
  const regra = REGUA_DA_TATICA.graus[proximo];
  const partes: string[] = [];
  const pontos = Math.ceil(regra.pontos - medida.pontos);
  if (pontos > 0) partes.push(`${pontos} ${pontos === 1 ? "ponto" : "pontos"}`);
  if (regra.acertoRecente > 0) {
    const { tentativas, acertos } = medida.janela;
    const ok = tentativas >= regra.minimoNaJanela && acertos / tentativas >= regra.acertoRecente;
    if (!ok) partes.push(`${Math.round(regra.acertoRecente * 100)}% nos últimos ${regra.minimoNaJanela}`);
  }
  const dificeis = regra.dificeis - medida.dificeis;
  if (dificeis > 0) partes.push(`${dificeis} ${dificeis === 1 ? "acerto difícil" : "acertos difíceis"}`);
  return partes.length ? `Para ${NOME_DO_GRAU[proximo]}: ${partes.join(", ")}.` : null;
}
