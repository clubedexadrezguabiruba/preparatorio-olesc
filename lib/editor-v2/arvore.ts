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

export function sansDaAnalise(aula: AulaV2, analiseId: string, positions: Record<string, Position>): Record<string, string> {
  const analise = analiseDaAula(aula, analiseId);
  const sans: Record<string, string> = {};
  for (const no of Object.values(analise.nos)) {
    if (no.id !== analise.raizId) sans[no.id] = quadroDoNo(aula, analiseId, no.id, positions).san ?? no.uci ?? "?";
  }
  return sans;
}

export function rotulosDaAnalise(aula: AulaV2, analiseId: string, positions: Record<string, Position>): Record<string, string> {
  const analise = analiseDaAula(aula, analiseId);
  const campos = fenInicialDaAnalise(aula, analise, positions).split(" ");
  const primeiroPly = (Number(campos[5]) - 1) * 2 + (campos[1] === "b" ? 1 : 0);
  const rotulos: Record<string, string> = {};
  for (const no of Object.values(analise.nos)) {
    if (no.id === analise.raizId) continue;
    const ply = primeiroPly + caminhoAte(analise, no.id).length - 2;
    rotulos[no.id] = `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? "." : "…"}`;
  }
  return rotulos;
}
