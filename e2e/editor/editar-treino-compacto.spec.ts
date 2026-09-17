/**
 * Pedido do Doug de 16/9/2026, sobre a `EX-E2E-BASE` (cópia da N0-LADDER):
 *
 * 1. «Editar treino» crescia para baixo a cada resposta acrescentada — agora cabe na altura da tela,
 *    com uma resposta aberta por vez;
 * 2. o lance da resposta sai do tabuleiro, sem digitar `d6e5`.
 *
 * Nada é salvo: a janela fecha em «Cancelar».
 */
import type { Locator } from "@playwright/test";
import { expect, test } from "../preparo/fixtures.ts";
import { AULA_BASE } from "../preparo/global-setup.ts";
import { centroDaCasa, jogar } from "../preparo/tabuleiro.ts";

const CAMPO_DO_LANCE = "Lance(s) no formato de casas, como e2e4, separados por vírgula";

/** As casas com o pontinho de destino, lidas da posição de cada `square.move-dest`. */
async function destinosMarcados(alvo: Locator): Promise<string[]> {
  return alvo.evaluate((wrap) => {
    const tabuleiro = wrap.querySelector("cg-board")!;
    const lado = tabuleiro.getBoundingClientRect().width / 8;
    const preta = wrap.className.includes("orientation-black");
    return Array.from(tabuleiro.querySelectorAll<HTMLElement>("square.move-dest")).map((casa) => {
      const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(casa.style.transform);
      const x = Math.round(Number(m?.[1] ?? 0) / lado);
      const y = Math.round(Number(m?.[2] ?? 0) / lado);
      return `${"abcdefgh"[preta ? 7 - x : x]}${(preta ? y : 7 - y) + 1}`;
    });
  });
}

test("«Editar treino» cabe na tela e o lance da resposta sai do tabuleiro", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await page.getByRole("list", { name: "Treinos da aula" }).locator("[data-treino-id]").first().click();
  const janela = page.getByRole("dialog", { name: /^Editar treino — / });
  await expect(janela).toBeVisible();
  const altura = page.viewportSize()!.height;
  const respostas = janela.getByRole("region", { name: "Respostas da pergunta" }).locator("article");
  const alvo = janela.locator(".cg-wrap");

  // Uma resposta aberta: a primeira.
  await expect(janela.getByLabel("Feedback desta resposta")).toHaveCount(1);
  const primeira = respostas.first();
  const lanceDaPrimeira = await primeira.getByLabel(CAMPO_DO_LANCE).inputValue();
  expect(lanceDaPrimeira).toMatch(/^[a-h][1-8][a-h][1-8]/);

  // Quatro respostas novas: a janela continua do tamanho da tela.
  for (let i = 0; i < 4; i += 1) await janela.getByRole("button", { name: "+ Resposta correta" }).click();
  await expect(janela.getByLabel("Feedback desta resposta")).toHaveCount(1);
  const caixa = (await janela.boundingBox())!;
  console.log(`janela: ${Math.round(caixa.height)}px de altura numa tela de ${altura}px, ${await respostas.count()} respostas`);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(altura);
  await expect(janela.getByRole("button", { name: "Salvar treino" })).toBeInViewport();

  // A última (aberta, sem lance) recebe um lance jogado no tabuleiro: mesma peça da primeira, outra casa.
  const nova = respostas.last();
  await expect(nova.getByLabel(CAMPO_DO_LANCE)).toHaveValue("");
  const origem = lanceDaPrimeira.slice(0, 2);
  const ponto = await centroDaCasa(alvo, origem);
  await page.mouse.click(ponto.x, ponto.y);
  // O chessground desenha os pontinhos depois do clique: ler antes deles dá lista vazia.
  await expect(alvo.locator("square.move-dest").first()).toBeAttached();
  const outro = (await destinosMarcados(alvo)).find((casa) => casa !== lanceDaPrimeira.slice(2, 4));
  expect(outro, "a peça da primeira resposta precisa de outra casa legal").toBeTruthy();
  const destino = await centroDaCasa(alvo, outro!);
  await page.mouse.click(destino.x, destino.y);
  await expect(nova.getByLabel(CAMPO_DO_LANCE)).toHaveValue(`${origem}${outro}`);

  // O lance que já é da primeira resposta abre a primeira, em vez de repetir o lance.
  await jogar(page, lanceDaPrimeira, alvo);
  await expect(primeira.getByLabel(CAMPO_DO_LANCE)).toHaveValue(lanceDaPrimeira);
  await expect(nova.getByLabel(CAMPO_DO_LANCE)).toHaveCount(0);
  await expect(nova.getByRole("button", { name: /^Resposta \d+/ })).toContainText("Correta no método");

  await janela.getByRole("button", { name: "Cancelar" }).click();
  await expect(janela).toBeHidden();
});
