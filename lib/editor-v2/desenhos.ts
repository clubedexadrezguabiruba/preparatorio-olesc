/**
 * Desenhar com o mouse no Editor v2: a tradução entre o que o tabuleiro devolve e o
 * que o arquivo guarda (plano §6).
 *
 * ## Por que a conta mora aqui, e não dentro do componente
 *
 * O tabuleiro não aceita desenho por evento simulado — o botão direito é teste humano
 * (plano §19). Então a parte que dá para provar sozinha fica num arquivo puro: dada
 * uma lista de formas do chessground, qual é o `desenhos` do nó; e dado o nó, o que
 * muda no arquivo. Isso roda em Node, sem tela.
 *
 * ## O caminho de volta do pincel
 *
 * `PINCEL_POR_COR` leva a cor do professor até o pincel da tela. Aqui é o contrário:
 * o chessground entrega `green`, `red`, `blue` ou `yellow` — são os quatro que ele
 * escolhe pelas teclas — e cada um volta a ser o nome da cor que o arquivo guarda.
 * `plano` também entra na tabela porque é o pincel com que o azul é *desenhado* neste
 * site (o tabuleiro é azul; a explicação inteira está em `annotations.ts`): uma forma
 * que já estava na tela com ele precisa voltar como `azul`, e não sumir.
 *
 * Pincel desconhecido é **descartado, não adivinhado**. Guardar uma cor inventada num
 * arquivo do professor é pior que perder um traço que ele pode redesenhar.
 */
import type { CasaAcesaV2, CorDesenhoV2, DesenhoV2, NoV2, SetaV2 } from "./modelo.ts";

/** O mínimo que precisamos saber de uma forma do chessground — assim o teste dispensa DOM. */
export type FormaCrua = { orig: string; dest?: string; brush?: string };

export const COR_POR_PINCEL: Record<string, CorDesenhoV2> = {
  green: "verde",
  red: "vermelho",
  yellow: "amarelo",
  blue: "azul",
  plano: "azul",
};

/**
 * As formas do tabuleiro viram o `desenhos` de um nó.
 *
 * Devolve `undefined` quando não sobrou nada: um nó sem desenho não deve carregar
 * `{ arrows: [], highlights: [] }` no arquivo — campo vazio é ruído no diff e
 * acabaria fazendo o editor gravar arquivos que ninguém pediu.
 */
export function desenhoDeFormas(formas: readonly FormaCrua[]): DesenhoV2 | undefined {
  const arrows: SetaV2[] = [];
  const highlights: CasaAcesaV2[] = [];
  for (const forma of formas) {
    const cor = COR_POR_PINCEL[forma.brush ?? ""];
    if (!cor || !forma.orig) continue;
    if (forma.dest) arrows.push({ de: forma.orig, para: forma.dest, cor });
    else highlights.push({ casa: forma.orig, cor });
  }
  if (!arrows.length && !highlights.length) return undefined;
  const desenho: DesenhoV2 = {};
  if (arrows.length) desenho.arrows = arrows;
  if (highlights.length) desenho.highlights = highlights;
  return desenho;
}

/** Dois desenhos são o mesmo? É o que impede um gesto sem efeito de entrar no Desfazer. */
export function mesmosDesenhos(a: DesenhoV2 | undefined, b: DesenhoV2 | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * As diretivas cruas que sobram quando o desenho do nó é reescrito.
 *
 * `[%cal …]` e `[%csl …]` são o **mesmo desenho** guardado duas vezes: uma em
 * `desenhos`, para a tela, e outra no texto cru, para o round-trip do PGN (§11). Se o
 * professor apaga uma seta e o texto cru fica, a exportação ressuscita a seta apagada.
 * Então estas duas saem — e só estas. `[%clk]`, `[%anno]` e qualquer diretiva que o
 * próximo exportador inventar continuam opacas e intactas, porque não são desenho e
 * nada aqui as interpreta.
 */
export function diretivasSemDesenho(diretivas: readonly string[] | undefined): string[] | undefined {
  if (!diretivas?.length) return diretivas ? [...diretivas] : undefined;
  const restantes = diretivas.filter((d) => !/^\[%(cal|csl)\b/i.test(d.trim()));
  return restantes.length ? restantes : undefined;
}

/** O nó com o desenho novo — e sem a cópia crua do desenho velho. */
export function noComDesenhos(no: NoV2, desenhos: DesenhoV2 | undefined): NoV2 {
  const editado: NoV2 = { ...no };
  if (desenhos) editado.desenhos = desenhos; else delete editado.desenhos;
  const diretivas = diretivasSemDesenho(no.diretivas);
  if (diretivas) editado.diretivas = diretivas; else delete editado.diretivas;
  return editado;
}
