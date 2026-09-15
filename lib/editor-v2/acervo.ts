/**
 * O acervo de posições do curso (`content/positions/`) visto pelo editor — fatia 10.
 *
 * Serve a duas portas: "Posição do acervo" em Adicionar capítulo, e a posição da prática (§17.1).
 * O hash de cada posição é calculado **no servidor** (`hash.ts` usa `node:crypto`) e viaja pronto:
 * é ele que entra no registro de proveniência da aula, e é por ele que a conferência sabe, depois,
 * se o arquivo da posição mudou.
 */
import type { Position } from "../lesson/schema.ts";

export type PosicaoDoAcervoV2 = { position: Position; conteudoHash: string };

export const ROTULO_DO_RESULTADO: Record<Position["expectedResult"], string> = {
  "win-white": "brancas ganham",
  "win-black": "pretas ganham",
  draw: "empate",
};

export const ROTULO_DO_ESTADO: Record<Position["status"], string> = {
  approved: "aprovada",
  candidate: "candidata — aguarda conferência",
  fixture: "de teste — não publica",
};

/** Quantas peças há na posição. Desde 15/9/2026 não há limite de peças na prática (trava 1). */
export function pecasDaFen(fen: string): number {
  return (fen.split(" ")[0].match(/[prnbqk]/gi) ?? []).length;
}

/** Filtra pelo que o professor digitou: id, etiqueta, obra ou resultado. */
export function filtrarAcervo(acervo: PosicaoDoAcervoV2[], busca: string): PosicaoDoAcervoV2[] {
  const termos = busca.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").split(/\s+/).filter(Boolean);
  if (!termos.length) return acervo;
  return acervo.filter(({ position }) => {
    const texto = [position.id, ...position.tags, position.provenance.bibliographicSource ?? "", ROTULO_DO_RESULTADO[position.expectedResult]]
      .join(" ").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return termos.every((termo) => texto.includes(termo));
  });
}
