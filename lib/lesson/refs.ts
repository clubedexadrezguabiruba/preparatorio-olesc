import type { Lesson } from "./schema";

/**
 * As posições que uma aula referencia, por id.
 *
 * Mora à parte de `content.ts` porque este arquivo precisa rodar **também no
 * navegador**: o painel do modo autor monta o pacote do preview a partir do
 * JSON que acabou de salvar, e `content.ts` importa `node:fs`.
 *
 * **Hoje as três etapas devolvem o MESMO id**, e o `lessonSchema` recusa o
 * arquivo em que não devolverem. A função continua devolvendo lista, e não um
 * id só, por dois motivos: a aula curta tem uma etapa só (a lista tem um
 * elemento, não três), e quem chama quer poder responder "quais posições esta
 * aula usa" sem saber quantas etapas ela tem. A deduplicação fica com o
 * chamador, como sempre ficou.
 *
 * A etapa 1 passou a citar posição própria em 2026-09-08: ela era um quadro da
 * animação da etapa 2, e virou tabuleiro parado com desenho por cima.
 */
export function referencedPositionIds(lesson: Lesson): string[] {
  const s = lesson.stages;
  return [s.objective?.positionId, s.guided?.positionId, s.practice?.positionId].filter(
    (id): id is string => typeof id === "string",
  );
}
