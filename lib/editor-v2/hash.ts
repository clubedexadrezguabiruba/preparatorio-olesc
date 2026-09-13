import { createHash } from "node:crypto";
import type { Position } from "../lesson/schema.ts";

/**
 * A impressão digital de um conteúdo, para a proveniência e a certificação.
 *
 * ## Por que é um módulo próprio
 *
 * Ela precisa ser **a mesma** dos dois lados: de quem registra a revisão
 * (`adaptar-v1.ts`) e de quem confere se a revisão ainda vale (`modelo.ts`, pelo
 * portão de proveniência). Duas cópias da mesma linha divergem no dia em que alguém
 * mexe numa delas, e o sintoma seria "toda posição está caduca" — um alarme falso
 * que ensina o professor a ignorar o alarme.
 *
 * Ela mora fora do `modelo.ts` porque usa `node:crypto`, e o modelo roda **também no
 * navegador**. Quem está no servidor importa daqui e injeta; a tela chama sem, e
 * simplesmente não afirma o que não pode conferir.
 *
 * ## O que ela promete, e o que não promete
 *
 * Promete: o mesmo objeto dá o mesmo hash dentro deste repositório. As posições
 * chegam dos dois lados já passadas pelo `positionSchema` do Zod, que devolve as
 * chaves na ordem do schema — então o `JSON.stringify` é estável.
 *
 * Não promete ser um identificador de conteúdo entre versões do schema: acrescentar
 * um campo ao `positionSchema` muda todos os hashes de uma vez. Isso é aceitável para
 * o que ela faz — dizer "mudou desde que foi conferido" —, mas não seria para guardar
 * hash em banco e comparar entre versões do programa.
 */
export function hashDoConteudo(valor: unknown): string {
  return createHash("sha256").update(JSON.stringify(valor)).digest("hex");
}

/**
 * JSON com as chaves em ordem alfabética em todos os níveis, e sem os campos `undefined`.
 *
 * ## Por que existe, se `hashDoConteudo` já serve à proveniência
 *
 * `hashDoConteudo` confia na ordem de chaves que o Zod devolve, e diz isso por escrito:
 * serve a "mudou desde que foi conferido", dentro do mesmo programa. A identidade de uma
 * publicação e de uma revisão de avaliação vai para o **banco** e é comparada entre
 * versões do programa (plano §10) — uma aba antiga, um retry, uma migração. Ali a ordem das
 * chaves não pode decidir nada, e `JSON.stringify` puro decidiria.
 */
export function jsonCanonico(valor: unknown): string {
  const ordenar = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map((elemento) => (elemento === undefined ? null : ordenar(elemento)));
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.keys(item).sort()
        .filter((chave) => (item as Record<string, unknown>)[chave] !== undefined)
        .map((chave) => [chave, ordenar((item as Record<string, unknown>)[chave])]));
    }
    return item;
  };
  return JSON.stringify(ordenar(valor));
}

/** SHA-256 em hexadecimal do JSON canônico. */
export function hashCanonico(valor: unknown): string {
  return createHash("sha256").update(jsonCanonico(valor)).digest("hex");
}

/** O mesmo hash, com o tipo que o validador espera receber injetado. */
export function hashDaPosicao(posicao: Position): string {
  return hashDoConteudo(posicao);
}
