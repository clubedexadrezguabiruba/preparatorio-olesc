import type { Lesson } from "./schema";

/**
 * As posições que uma aula referencia, por id.
 *
 * Mora à parte de `content.ts` porque este arquivo precisa rodar **também no
 * navegador**: o painel do modo autor monta o pacote do preview a partir do
 * JSON que acabou de salvar, e `content.ts` importa `node:fs`.
 *
 * A etapa 1 não cita posição própria: os diagramas dela são quadros das cenas
 * da etapa 2, e quem traz essas posições é a primeira linha da lista.
 */
export function referencedPositionIds(lesson: Lesson): string[] {
  const s = lesson.stages;
  return [
    ...(s.example?.scenes ?? []).map((scene) => scene.positionId),
    s.guided?.positionId,
    s.solo?.positionId,
    s.practice?.positionId,
    ...(s.review?.reviewPositionIds ?? []),
  ].filter((id): id is string => typeof id === "string");
}
