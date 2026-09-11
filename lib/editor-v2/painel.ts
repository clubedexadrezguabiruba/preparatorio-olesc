import type { AnaliseV2, NoV2 } from "./modelo.ts";

export type EntradaDoPainel = { nodeId: string; parentId: string; nivel: number; principal: boolean };

/** Achata a linha principal; só uma variante real aumenta o recuo. */
export function entradasVerticais(analise: AnaliseV2): EntradaDoPainel[] {
  const saida: EntradaDoPainel[] = [];
  const linha = (primeiro: string, paiInicial: string, nivel: number, principalInicial: boolean) => {
    let id: string | undefined = primeiro;
    let pai = paiInicial;
    let principal = principalInicial;
    while (id) {
      const no: NoV2 | undefined = analise.nos[id];
      if (!no) return;
      saida.push({ nodeId: id, parentId: pai, nivel, principal });
      no.filhos.slice(1).forEach((variante) => linha(variante, no.id, nivel + 1, false));
      pai = no.id;
      id = no.filhos[0];
      principal = true;
    }
  };
  const raiz = analise.nos[analise.raizId];
  if (raiz.filhos[0]) linha(raiz.filhos[0], raiz.id, 0, true);
  raiz.filhos.slice(1).forEach((variante) => linha(variante, raiz.id, 1, false));
  return saida;
}
