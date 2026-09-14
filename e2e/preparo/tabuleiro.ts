/**
 * Mexer no tabuleiro como uma pessoa mexe.
 *
 * O chessground recusa evento disparado por script (`if (!(s.trustAllEvents || e.isTrusted))
 * return`, em `drag.js:6`). `page.mouse` do Playwright passa pelo protocolo do navegador e gera
 * evento **confiável** — é por isso que jogar funciona aqui e não funcionaria com `dispatchEvent`.
 *
 * Isto prova clique-clique e o botão direito. **Não prova o arrasto humano** (memória "arrastar
 * só se prova com a mão"): o gesto de arrastar peça e soltar fora do tabuleiro continua no roteiro
 * do teste humano.
 */
import type { Locator, Page } from "@playwright/test";

export type Orientacao = "white" | "black";

/** O tabuleiro `n` da página (0 = o primeiro). */
export function tabuleiro(pagina: Page, n = 0): Locator {
  return pagina.locator(".cg-wrap").nth(n);
}

async function orientacaoDe(alvo: Locator): Promise<Orientacao> {
  const classe = (await alvo.getAttribute("class")) ?? "";
  return classe.includes("orientation-black") ? "black" : "white";
}

/** O centro de uma casa, em coordenadas da página. */
export async function centroDaCasa(alvo: Locator, casa: string): Promise<{ x: number; y: number }> {
  const caixa = await alvo.locator("cg-board").boundingBox();
  if (!caixa) throw new Error("o tabuleiro não está visível");
  const orientacao = await orientacaoDe(alvo);
  const coluna = casa.charCodeAt(0) - 97;
  const linha = Number(casa[1]) - 1;
  const x = orientacao === "white" ? coluna : 7 - coluna;
  const y = orientacao === "white" ? 7 - linha : linha;
  const lado = caixa.width / 8;
  return { x: caixa.x + lado * (x + 0.5), y: caixa.y + lado * (y + 0.5) };
}

/** Joga um lance em UCI (`e2e4`, `e7e8q`) por dois cliques confiáveis. */
export async function jogar(pagina: Page, uci: string, alvo: Locator = tabuleiro(pagina)) {
  const de = await centroDaCasa(alvo, uci.slice(0, 2));
  const para = await centroDaCasa(alvo, uci.slice(2, 4));
  await pagina.mouse.click(de.x, de.y);
  await pagina.mouse.click(para.x, para.y);
  const promocao = uci.slice(4);
  if (promocao) {
    const nome = { q: /dama/i, r: /torre/i, b: /bispo/i, n: /cavalo/i }[promocao];
    if (nome) await pagina.getByRole("button", { name: nome }).click();
  }
}

/** Joga vários lances seguidos, esperando o tabuleiro assentar entre um e outro. */
export async function jogarLinha(pagina: Page, ucis: string[], alvo: Locator = tabuleiro(pagina)) {
  for (const uci of ucis) {
    await jogar(pagina, uci, alvo);
    await pagina.waitForTimeout(120);
  }
}

type Modificador = "Shift" | "Alt";

/** Seta com o botão direito, com os modificadores de cor do Lichess. */
export async function desenharSeta(pagina: Page, de: string, para: string, modificadores: Modificador[] = [], alvo: Locator = tabuleiro(pagina)) {
  const a = await centroDaCasa(alvo, de);
  const b = await centroDaCasa(alvo, para);
  for (const tecla of modificadores) await pagina.keyboard.down(tecla);
  await pagina.mouse.move(a.x, a.y);
  await pagina.mouse.down({ button: "right" });
  await pagina.mouse.move(b.x, b.y, { steps: 6 });
  await pagina.mouse.up({ button: "right" });
  for (const tecla of modificadores) await pagina.keyboard.up(tecla);
}

/** Casa acesa: clique direito sem arrastar. */
export async function acenderCasa(pagina: Page, casa: string, modificadores: Modificador[] = [], alvo: Locator = tabuleiro(pagina)) {
  await desenharSeta(pagina, casa, casa, modificadores, alvo);
}
