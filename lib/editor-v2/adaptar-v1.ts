import { createHash } from "node:crypto";
import { Chess } from "chess.js";
import type { Lesson, Position } from "../lesson/schema.ts";
import { validarAulaV2, type AulaV2, type NoV2 } from "./modelo.ts";

const id = (parte: string) => parte.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Adaptador de leitura. Não modifica nem reserializa o arquivo v1.
 * Os IDs posicionais são temporários e determinísticos; a migração explícita os materializa.
 */
export function adaptarLessonV1(lesson: Lesson, positions: Record<string, Position>): AulaV2 {
  const objective = lesson.stages.objective;
  if (!objective) {
    return { schemaVersion: 2, id: lesson.id, titulo: lesson.title, analises: [], capitulos: [], treinos: [], fluxo: [], origem: { formato: "lesson-v1", hash: hash(lesson) } };
  }
  const position = positions[objective.positionId];
  if (!position) throw new Error(`posição ${objective.positionId} não foi carregada`);

  const analiseId = id(`analise-${lesson.id}-objetivo`);
  const raizId = id(`node-${lesson.id}-objetivo-raiz`);
  const capituloId = id(`capitulo-${lesson.id}-objetivo`);
  const nos: Record<string, NoV2> = { [raizId]: { id: raizId, filhos: [] } };
  const caminho: string[] = [];
  const narracoes: AulaV2["capitulos"][number]["narracoes"] = [];
  const game = new Chess(position.fen);
  let atual = raizId;

  for (const [indice, passo] of objective.roteiro.entries()) {
    if (passo.lance) {
      try {
        game.move({ from: passo.lance.slice(0, 2), to: passo.lance.slice(2, 4), promotion: passo.lance.slice(4) || undefined });
      } catch {
        throw new Error(`aula ${lesson.id}: lance ${passo.lance} é ilegal no passo ${indice + 1}`);
      }
      const nodeId = id(`node-${lesson.id}-objetivo-passo-${indice + 1}`);
      nos[nodeId] = { id: nodeId, uci: passo.lance, filhos: [] };
      nos[atual] = { ...nos[atual], filhos: [...nos[atual].filhos, nodeId] };
      atual = nodeId;
      caminho.push(nodeId);
    }
    narracoes.push({ id: id(`narracao-${lesson.id}-${indice + 1}`), nodeId: atual, texto: passo.fala, pausa: "temporizada" });
  }

  const aula: AulaV2 = {
    schemaVersion: 2,
    id: lesson.id,
    titulo: lesson.title,
    analises: [{ id: analiseId, inicio: { tipo: "posicao", positionId: objective.positionId }, raizId, nos }],
    capitulos: [{ id: capituloId, titulo: objective.technique.name, analiseId, inicioNodeId: raizId, caminho, orientacao: lesson.orientation, narracoes }],
    treinos: [],
    fluxo: [{ id: id(`etapa-${lesson.id}-objetivo`), tipo: "capitulo", entidadeId: capituloId }],
    origem: { formato: "lesson-v1", hash: hash(lesson) },
  };
  const valida = validarAulaV2(aula);
  if (!valida.ok) throw new Error(`adaptação v1 inválida: ${valida.problemas.join("; ")}`);
  return aula;
}

function hash(valor: unknown): string {
  return createHash("sha256").update(JSON.stringify(valor)).digest("hex");
}
