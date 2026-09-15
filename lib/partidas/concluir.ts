import type { Momento } from "./momentos.ts";

/**
 * Quando uma partida modelo está **concluída** — a regra do Doug de 15/9/2026:
 * o aluno resolveu todos os momentos e acertou o Desafio final **de primeira**,
 * sem pedir a revelação.
 *
 * Pura, e sem disco nem banco: roda no `npm test`, no servidor que grava e no
 * relatório do professor. As linhas vêm de `tentativa_partida_momento`.
 *
 * ## "De primeira" é por série, e cabe numa linha só
 *
 * A primeira resposta de um momento tem `tentativa = 1` e `apoio = 0`. Uma
 * alternativa boa não gasta tentativa (é a decisão do Doug: não conta erro), então
 * o acerto que vem depois dela continua sendo `tentativa = 1`. Quem erra o
 * Desafio final pode refazer a série; a próxima série começa de novo em 1.
 *
 * **O limite, declarado:** a contagem da série mora no navegador. Um aluno que
 * recarrega a página depois de errar volta a ter `tentativa = 1` — e já viu a
 * ajuda. É o mesmo limite dos puzzles (a solução está no JSON servido); o
 * `tempo_ms` e o relatório do professor ficam como a defesa.
 */

export type LinhaDeMomento = {
  readonly momento: number;
  readonly versao: string;
  readonly acertou: boolean;
  readonly tentativa: number;
  readonly apoio: number;
};

export type SituacaoDoMomento = "pendente" | "com-ajuda" | "de-primeira";

export type SituacaoDaPartida = {
  /** Por `n` do momento. */
  readonly momentos: ReadonlyMap<number, SituacaoDoMomento>;
  readonly resolvidos: number;
  readonly dePrimeira: number;
  readonly desafioDePrimeira: boolean;
  readonly concluida: boolean;
};

/** A impressão digital de um momento: muda quando a posição ou a resposta mudam. */
export async function versaoDoMomento(m: Pick<Momento, "fen" | "uci">): Promise<string> {
  const bytes = new TextEncoder().encode(`${m.fen}|${m.uci}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function situacaoDaPartida(
  momentos: readonly (Pick<Momento, "n" | "desafioFinal"> & { versao: string })[],
  linhas: readonly LinhaDeMomento[],
): SituacaoDaPartida {
  const porMomento = new Map<number, SituacaoDoMomento>();
  let desafioDePrimeira = false;
  for (const m of momentos) {
    const deste = linhas.filter((l) => l.momento === m.n && l.versao === m.versao && l.acertou);
    const limpo = deste.some((l) => l.tentativa === 1 && l.apoio === 0);
    porMomento.set(m.n, limpo ? "de-primeira" : deste.length > 0 ? "com-ajuda" : "pendente");
    if (m.desafioFinal && limpo) desafioDePrimeira = true;
  }
  const valores = [...porMomento.values()];
  const resolvidos = valores.filter((s) => s !== "pendente").length;
  return {
    momentos: porMomento,
    resolvidos,
    dePrimeira: valores.filter((s) => s === "de-primeira").length,
    desafioDePrimeira,
    concluida: momentos.length > 0 && resolvidos === momentos.length && desafioDePrimeira,
  };
}
