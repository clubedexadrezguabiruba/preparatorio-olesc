import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import type { AnaliseV2, AulaV2, NoV2 } from "./modelo.ts";

export type QuadroV2 = { fen: string; san: string | null; ultimoLance: [string, string] | null };

export function analiseDaAula(aula: AulaV2, analiseId: string): AnaliseV2 {
  const analise = aula.analises.find((item) => item.id === analiseId);
  if (!analise) throw new Error(`análise inexistente: ${analiseId}`);
  return analise;
}

function paisDaAnalise(analise: AnaliseV2): Map<string, string> {
  const pais = new Map<string, string>();
  for (const no of Object.values(analise.nos)) for (const filho of no.filhos) pais.set(filho, no.id);
  return pais;
}

export function caminhoAte(analise: AnaliseV2, nodeId: string): NoV2[] {
  if (!analise.nos[nodeId]) throw new Error(`nó inexistente: ${nodeId}`);
  const pais = paisDaAnalise(analise);
  const ids: string[] = [];
  let atual: string | undefined = nodeId;
  while (atual) {
    ids.push(atual);
    if (atual === analise.raizId) break;
    atual = pais.get(atual);
  }
  if (ids.at(-1) !== analise.raizId) throw new Error(`nó órfão: ${nodeId}`);
  return ids.reverse().map((id) => analise.nos[id]);
}

export function fenInicialDaAnalise(aula: AulaV2, analise: AnaliseV2, positions: Record<string, Position>, pilha = new Set<string>()): string {
  if (pilha.has(analise.id)) throw new Error("ciclo entre posições iniciais");
  if (analise.inicio.tipo === "posicao") {
    const position = positions[analise.inicio.positionId];
    if (!position) throw new Error(`posição inexistente: ${analise.inicio.positionId}`);
    return position.fen;
  }
  pilha.add(analise.id);
  const origem = analiseDaAula(aula, analise.inicio.origem.analiseId);
  const fen = quadroDoNo(aula, origem.id, analise.inicio.origem.nodeId, positions, pilha).fen;
  pilha.delete(analise.id);
  return fen;
}

export function quadroDoNo(aula: AulaV2, analiseId: string, nodeId: string, positions: Record<string, Position>, pilha = new Set<string>()): QuadroV2 {
  const analise = analiseDaAula(aula, analiseId);
  const game = new Chess(fenInicialDaAnalise(aula, analise, positions, pilha));
  let san: string | null = null;
  let ultimoLance: [string, string] | null = null;
  for (const no of caminhoAte(analise, nodeId).slice(1)) {
    if (!no.uci) throw new Error(`nó sem lance fora da raiz: ${no.id}`);
    const jogado = game.move({ from: no.uci.slice(0, 2), to: no.uci.slice(2, 4), promotion: no.uci.slice(4) || undefined });
    if (!jogado) throw new Error(`lance ilegal no nó ${no.id}`);
    san = jogado.san;
    ultimoLance = [jogado.from, jogado.to];
  }
  return { fen: game.fen(), san, ultimoLance };
}

/** Tudo o que a tela precisa de uma análise, calculado numa passada só. */
export type MapaDaAnaliseV2 = {
  /** A posição, o SAN e o último lance de cada nó, inclusive a raiz. */
  quadros: Record<string, QuadroV2>;
  /** O SAN de cada nó que tem lance. Cai para o UCI se a chess.js não nomear. */
  sans: Record<string, string>;
  /** O número do lance como se lê num livro: `12.` para as brancas, `12…` para as pretas. */
  rotulos: Record<string, string>;
};

/**
 * Percorre a análise inteira **uma vez** e devolve posição, SAN e numeração de todos
 * os nós.
 *
 * ## Por que isto existe, com o número que o motivou
 *
 * A primeira versão calculava cada nó com `quadroDoNo`, que rejoga a partida desde a
 * raiz. Chamar isso para todos os nós custa o **quadrado** do tamanho da árvore. Numa
 * rodada de navegador em 10/09/2026, com uma partida real de 60 lances e 3 variantes
 * (124 nós), clicar num lance levava **1,1 s** — medido em três pontos da partida
 * (1093, 1065 e 1121 ms). O alvo do plano final (§17) é 100 ms; estávamos 11× acima.
 *
 * O tempo era igual no lance 11 e no lance 119, e foi isso que apontou a causa: não
 * era a profundidade do nó clicado, era a árvore inteira sendo recalculada a cada
 * render.
 *
 * Aqui o percurso é em profundidade com um tabuleiro só, desfazendo o lance ao voltar:
 * **cada lance é jogado uma vez**. É o mesmo desenho do portão de legalidade em
 * `modelo.ts`, pelo mesmo motivo.
 *
 * A numeração sai de graça: a profundidade do percurso já é o meio-lance, e não
 * precisa de uma segunda subida até a raiz por nó.
 */
export function mapaDaAnalise(aula: AulaV2, analiseId: string, positions: Record<string, Position>): MapaDaAnaliseV2 {
  const analise = analiseDaAula(aula, analiseId);
  const inicial = fenInicialDaAnalise(aula, analise, positions);
  const campos = inicial.split(" ");
  const primeiroPly = (Number(campos[5]) - 1) * 2 + (campos[1] === "b" ? 1 : 0);

  const jogo = new Chess(inicial);
  const quadros: Record<string, QuadroV2> = {};
  const sans: Record<string, string> = {};
  const rotulos: Record<string, string> = {};

  const andar = (id: string, san: string | null, ultimoLance: [string, string] | null, profundidade: number) => {
    quadros[id] = { fen: jogo.fen(), san, ultimoLance };
    if (profundidade > 0) {
      const ply = primeiroPly + profundidade - 1;
      rotulos[id] = `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? "." : "…"}`;
    }
    for (const filhoId of analise.nos[id].filhos) {
      const filho = analise.nos[filhoId];
      if (!filho.uci) throw new Error(`nó sem lance fora da raiz: ${filhoId}`);
      const jogado = jogo.move({ from: filho.uci.slice(0, 2), to: filho.uci.slice(2, 4), promotion: filho.uci.slice(4) || undefined });
      sans[filhoId] = jogado.san;
      andar(filhoId, jogado.san, [jogado.from, jogado.to], profundidade + 1);
      jogo.undo();
    }
  };
  andar(analise.raizId, null, null, 0);
  return { quadros, sans, rotulos };
}

export function sansDaAnalise(aula: AulaV2, analiseId: string, positions: Record<string, Position>): Record<string, string> {
  return mapaDaAnalise(aula, analiseId, positions).sans;
}

export function rotulosDaAnalise(aula: AulaV2, analiseId: string, positions: Record<string, Position>): Record<string, string> {
  return mapaDaAnalise(aula, analiseId, positions).rotulos;
}
