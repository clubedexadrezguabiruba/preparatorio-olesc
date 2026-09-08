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
    // Um id por exercício. Sem esta linha a aula de meio-jogo carrega sem
    // nenhuma das posições dos exercícios, e a etapa 3 diz "esta aula ainda não
    // tem exercícios escritos" com os seis escritos no arquivo — que foi
    // exatamente o que aconteceu ao abrir a M103 no navegador pela primeira vez.
    ...(s.exercises?.items ?? []).map((item) => item.positionId),
    s.guided?.positionId,
    s.solo?.positionId,
    s.practice?.positionId,
    ...(s.review?.reviewPositionIds ?? []),
  ].filter((id): id is string => typeof id === "string");
}
