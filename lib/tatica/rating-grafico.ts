import { hojeNoBrasil, somarDias } from "../curso/calendario.ts";
import { historicoPorDia, historicoPorTentativa, type PontoDoRating, type TentativaDoRating } from "./rating-historico.ts";

/**
 * As contas do desenho da evolução — funções puras, com teste, para o
 * `GraficoRating` só desenhar.
 *
 * ## A linha tem de subir "em 90°, não em 180°" (Doug, 16/9)
 *
 * Até ali o eixo abria no mínimo 100 pontos, com 20 de folga e marcas de 50 em
 * 50. Um aluno que foi de 600 a 630 via uma reta quase deitada: o ganho existia
 * e o desenho o escondia. Agora o eixo **abraça os dados** (6% de folga, faixa
 * mínima de 20) e as marcas são as redondas que caem dentro dele.
 *
 * Não é truque: os números do eixo continuam na tela, e uma queda também fica
 * íngreme — o desenho mostra o movimento que houve, na escala em que ele houve.
 */

/** Com menos dias de jogo que isto, o eixo X é por problema, e não por dia. */
export const MINIMO_DE_DIAS = 3;

export type Escala = {
  readonly menor: number;
  readonly maior: number;
  /** Os valores redondos que o eixo marca, de baixo para cima; vazio na compacta. */
  readonly marcas: readonly number[];
};

const PASSOS = [5, 10, 20, 25, 50, 100, 200, 250, 500];

export function escalaDoRating(valores: readonly number[], { compacto = false }: { compacto?: boolean } = {}): Escala {
  let menor = Math.min(...valores);
  let maior = Math.max(...valores);
  const faixaMinima = compacto ? 12 : 20;
  if (maior - menor < faixaMinima) {
    const meio = (maior + menor) / 2;
    menor = meio - faixaMinima / 2;
    maior = meio + faixaMinima / 2;
  }
  const folga = (maior - menor) * 0.06;
  menor -= folga;
  maior += folga;
  if (compacto) return { menor, maior, marcas: [] };

  const faixa = maior - menor;
  const passo = PASSOS.find((p) => faixa / p <= 4) ?? PASSOS[PASSOS.length - 1];
  const marcas: number[] = [];
  for (let m = Math.ceil(menor / passo) * passo; m <= maior; m += passo) marcas.push(m);
  return { menor, maior, marcas };
}

export type SerieDoGrafico = {
  /** `dia`: um ponto por dia. `problema`: o início e um ponto por problema. */
  readonly eixo: "dia" | "problema";
  readonly pontos: readonly PontoDoRating[];
};

/**
 * Os pontos que o gráfico desenha. Com `MINIMO_DE_DIAS` dias de jogo, o último
 * rating de cada dia; antes disso, um ponto por problema — o aluno que jogou 20
 * problemas no primeiro dia vê a curva deles, e não um ponto solto.
 *
 * `dias` recorta a janela (a minicurva dos últimos 30 dias), contando hoje.
 * **O recorte vem depois da conta**, nos dois eixos: o recorde de cada ponto
 * conta o pico de antes da janela (a regra que o painel já seguia).
 */
export function serieDoGrafico(
  linhas: readonly TentativaDoRating[],
  { dias, hoje = hojeNoBrasil(new Date()) }: { dias?: number; hoje?: string } = {},
): SerieDoGrafico {
  const desde = dias === undefined ? "" : somarDias(hoje, -(dias - 1));
  const porDia = historicoPorDia(linhas).filter((p) => p.dia >= desde);
  if (porDia.length >= MINIMO_DE_DIAS) return { eixo: "dia", pontos: porDia };

  // `historicoPorTentativa` tem o início na posição 0 e o problema k na k: o
  // primeiro problema da janela é o k, e o ponto k−1 é o rating antes dele.
  const todos = historicoPorTentativa(linhas);
  const ordenadas = [...linhas].sort((a, b) => (a.criada_em < b.criada_em ? -1 : a.criada_em > b.criada_em ? 1 : 0));
  const k = ordenadas.findIndex((l) => hojeNoBrasil(new Date(l.criada_em)) >= desde);
  return { eixo: "problema", pontos: k === -1 ? [] : todos.slice(k) };
}
