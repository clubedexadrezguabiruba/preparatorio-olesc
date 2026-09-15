/**
 * O vocabulário do modo "tática com rating", num lugar só e sem `server-only`.
 *
 * Quem lê: o script que recorta o CSV (`scripts/base-rating.ts`), o banco de
 * puzzles do servidor (`lib/tatica/banco.ts`), a escolha
 * (`lib/tatica/rating-escolher.ts`) e as telas, inclusive as de cliente — por
 * isso este arquivo não importa nada.
 */

/**
 * A origem dos problemas de 600 a 700, que não pertencem a tema nenhum.
 * (O plano dizia 400; o Lichess não tem puzzle bom abaixo de 600 — ver
 * `scripts/base-rating.ts`.)
 *
 * É gravada em `tentativas_puzzle.tema` e `.origem` como qualquer tag, e
 * `puzzlePorId(ORIGEM_BASE, id)` a acha em `public/puzzles/rating-base/`. Com
 * isso a revisão do dia e a conferência funcionam sem caminho especial.
 */
export const ORIGEM_BASE = "rating-base";

/** O nome que o aluno lê onde uma tela mostraria o tema: a revisão do dia. */
export const NOME_DA_BASE = "Tática rating";

/**
 * Uma linha de `public/puzzles/rating-indice.json`: o id, o arquivo de onde ele
 * é lido (uma tag de tema ou `ORIGEM_BASE`) e o rating.
 *
 * Tupla e não objeto porque são ~120 mil linhas: repetir `"id":`, `"origem":`
 * e `"rating":` em cada uma quase dobraria o arquivo.
 */
export type LinhaDoIndice = readonly [id: string, origem: string, rating: number];
