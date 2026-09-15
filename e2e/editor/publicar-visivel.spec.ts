/**
 * Publicar sempre visível — achado do Doug no teste humano de 14/9/2026: "não achei o botão de publicar".
 *
 * Antes, o botão só existia depois de um Conferir verde. Agora ele está sempre na tela: clicado sem
 * conferência, ele confere sozinho — verde, segue para a pergunta de antes de publicar; com problema,
 * diz que ainda não dá e mostra a lista.
 */
import { criarAulaVazia, FIXTURE_DO_ESTUDO, abrirImportar } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";

async function importar(page: import("@playwright/test").Page, aula: string, textosMeus: boolean) {
  criarAulaVazia(aula, aula);
  await page.goto(`/editor/v2/finais/${aula}`);
  await abrirImportar(page);
  const janela = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await janela.locator('input[type="file"]').setInputFiles(FIXTURE_DO_ESTUDO);
  if (textosMeus) await janela.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await janela.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(janela).toBeHidden({ timeout: 30_000 });
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
}

test("com problema (textos sem direito declarado): Publicar está na tela, confere sozinho e diz o que impede", async ({ page }) => {
  await importar(page, "EX-E2E-PUBLICAR-PROBLEMA", false);
  const publicar = page.getByRole("button", { name: "Publicar", exact: true });
  await expect(publicar).toBeVisible();
  await publicar.click();
  await expect(page.getByRole("region", { name: "Resultado da conferência" })).toContainText("Ainda não dá para publicar", { timeout: 60_000 });
  
  await expect(page.getByRole("dialog", { name: "Publicar a aula" })).toHaveCount(0);

  // Achado 2: a declaração vale para todas as posições do mesmo estudo, numa janela só.
  const resultado = page.getByRole("region", { name: "Resultado da conferência" });
  await resultado.getByRole("button", { name: "Resolver" }).first().click();
  const origem = page.getByRole("dialog", { name: "De onde veio esta posição?" });
  await origem.getByRole("checkbox", { name: /Os textos que vieram com esta posição são meus/ }).check();
  await expect(origem.getByRole("checkbox", { name: /Registrar o mesmo para as outras \d+ posições/ })).toBeChecked();
  await origem.getByRole("button", { name: "Registrar revisão" }).click();
  await expect(origem).toBeHidden();

  // Achado 3: a lista se atualiza sozinha depois do conserto — sem clicar em Conferir.
  await expect(resultado).toContainText("Pode publicar", { timeout: 60_000 });
  await expect(resultado.getByText("impede", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" })).toBeVisible();
});

test("aula pronta: Publicar sem Conferir antes leva direto à pergunta", async ({ page }) => {
  await importar(page, "EX-E2E-PUBLICAR-PRONTA", true);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const pergunta = page.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" });
  await expect(pergunta).toBeVisible({ timeout: 60_000 });
  await pergunta.getByRole("button", { name: "Cancelar" }).click();
});
