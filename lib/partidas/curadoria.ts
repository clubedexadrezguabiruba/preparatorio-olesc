/**
 * A curadoria aprovada pelo Doug em 15/9/2026: 15 partidas, 3 por nível, 80
 * momentos. Ver `docs/PARTIDAS-MODELO.md`, "Curadoria" e "Tabela de momentos".
 *
 * É a trava de contagem: `conferir.ts` compara o que está em `content/partidas/`
 * com esta lista, e uma partida a mais, a menos ou com um momento a mais reprova.
 * Mudar a curadoria é decisão do Doug, e muda aqui **e** no diário.
 *
 * Sem `import` de nada: `lib/curso/nivel.ts` lê esta lista, e ele roda no
 * `node --test` sem disco.
 */

export type ItemDaCuradoria = {
  readonly slug: string;
  readonly nivel: 1 | 2 | 3 | 4 | 5;
  /** A ordem dentro do nível. */
  readonly ordem: number;
  readonly momentos: number;
};

export const CURADORIA: readonly ItemDaCuradoria[] = [
  { slug: "morphy-isouard", nivel: 1, ordem: 1, momentos: 4 },
  { slug: "colle-delvaux", nivel: 1, ordem: 2, momentos: 4 },
  { slug: "polgar-mamedyarov", nivel: 1, ordem: 3, momentos: 5 },
  { slug: "spielmann-wahle", nivel: 2, ordem: 1, momentos: 4 },
  { slug: "alekhine-poindle", nivel: 2, ordem: 2, momentos: 4 },
  { slug: "tarrasch-mieses", nivel: 2, ordem: 3, momentos: 6 },
  { slug: "blackburne-blanchard", nivel: 3, ordem: 1, momentos: 5 },
  { slug: "porges-lasker", nivel: 3, ordem: 2, momentos: 6 },
  { slug: "marshall-tarrasch", nivel: 3, ordem: 3, momentos: 6 },
  { slug: "lasker-bauer", nivel: 4, ordem: 1, momentos: 6 },
  { slug: "chernev-hahlbohm", nivel: 4, ordem: 2, momentos: 6 },
  { slug: "pillsbury-mason", nivel: 4, ordem: 3, momentos: 6 },
  { slug: "averbakh-sarvarov", nivel: 5, ordem: 1, momentos: 5 },
  { slug: "paulsen-morphy", nivel: 5, ordem: 2, momentos: 6 },
  { slug: "capablanca-villegas", nivel: 5, ordem: 3, momentos: 7 },
];

/** Os slugs das partidas de um nível, na ordem da curadoria. */
export function partidasDoNivel(nivel: number): string[] {
  return CURADORIA.filter((p) => p.nivel === nivel)
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => p.slug);
}
