/**
 * As partidas modelo do nível 1, percorridas como o aluno (docs/PARTIDAS-MODELO.md, blocos 3 e 4).
 *
 * Roda no aluno a 375 px e no desktop a 1366. Confere a janela antes de medir (a memória do
 * zoom do Playwright), que a página não rola para o lado, e o caminho que conta no nível:
 * errar um momento (não avança, a ajuda cresce), acertar, e acertar o Desafio final de primeira —
 * até o servidor responder "concluída" e a lista mostrar o selo.
 *
 * `npm run dev` mostra o rascunho a todos (`podeVerRascunho`), e é por isso que o aluno de teste
 * vê as partidas que o Doug ainda não aprovou.
 */
import type { Page } from "@playwright/test";
import { conferirTamanho, expect, test } from "./preparo/fixtures.ts";
import { SESSAO_DO_ALUNO } from "./preparo/global-setup.ts";
import { culpadosDaLargura, larguraDaPagina } from "./preparo/medidas.ts";
import { jogar, tabuleiro } from "./preparo/tabuleiro.ts";

const PARTIDA = "morphy-isouard";

async function semRolagemLateral(pagina: Page) {
  const largura = await larguraDaPagina(pagina);
  expect(largura.transborda, JSON.stringify(await culpadosDaLargura(pagina))).toBe(0);
}

test("@partidas o nível 1: a lista, o erro que não avança, o Desafio de primeira e a partida concluída", async ({ browser }, info) => {
  const viewport = info.project.name === "aluno-375" ? { width: 375, height: 812 } : { width: 1366, height: 768 };
  const contexto = await browser.newContext({ storageState: SESSAO_DO_ALUNO, locale: "pt-BR", viewport, baseURL: info.project.use.baseURL });
  const pagina = await contexto.newPage();
  try {
    await pagina.goto("/partidas");
    await conferirTamanho(pagina, viewport.width, viewport.height);
    await expect(pagina.getByRole("heading", { name: "Partidas modelo" })).toBeVisible();
    const nivel1 = pagina.getByRole("region", { name: "Nível 1" });
    await expect(nivel1.getByRole("link")).toHaveCount(3);
    await semRolagemLateral(pagina);

    await pagina.goto(`/partidas/${PARTIDA}`);
    await conferirTamanho(pagina, viewport.width, viewport.height);
    await semRolagemLateral(pagina);
    await pagina.getByRole("button", { name: /Começar os momentos|Fazer os momentos de novo/ }).click();

    // Momento 1 (10.Cxb5): um lance errado não avança, e a ajuda aparece.
    await expect(tabuleiro(pagina)).toBeVisible();
    await expect(pagina.getByText("momento 1 de 4")).toBeVisible();
    await jogar(pagina, "c4d3");
    await expect(pagina.getByText(/não é o lance/)).toBeVisible();
    await expect(pagina.getByRole("button", { name: "Mostrar o lance" })).toBeVisible();
    await expect(pagina.getByText("momento 1 de 4")).toBeVisible();
    await semRolagemLateral(pagina);

    // Os lances de cada momento, na ordem da ficha: 10.Cxb5, 12.O-O-O, 13.Txd7, 16.Db8+ (Desafio).
    for (const [i, uci] of ["c3b5", "e1c1", "d1d7", "b3b8"].entries()) {
      await expect(pagina.getByText(`momento ${i + 1} de 4`)).toBeVisible();
      await jogar(pagina, uci);
      const seguir = pagina.getByRole("button", { name: i < 3 ? "Próximo momento →" : "Ver o resultado →" });
      await expect(seguir).toBeVisible();
      await seguir.click();
    }

    await expect(pagina.getByText("Partida concluída!")).toBeVisible({ timeout: 30_000 });
    await semRolagemLateral(pagina);
    await pagina.getByRole("button", { name: "Ler o desfecho" }).click();
    await expect(pagina.getByRole("heading", { name: "Se você lembrar de três coisas" })).toBeVisible();

    await pagina.goto("/partidas");
    await expect(pagina.getByRole("link", { name: /✓ concluída/ }).first()).toBeVisible();
    await expect(pagina.getByRole("link", { name: new RegExp(`concluída`) })).toHaveCount(1);
  } finally {
    await contexto.close();
  }
});
