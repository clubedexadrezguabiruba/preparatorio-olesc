/**
 * Pedido do Doug de 16/9/2026: depois de publicar, fechar a aula e voltar ao início do editor.
 * Sobre a `EX-E2E-BASE` (cópia da N0-LADDER).
 */
import { expect, test } from "../preparo/fixtures.ts";
import { AULA_BASE } from "../preparo/global-setup.ts";

test("«← Editor» no topo volta ao início do editor", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator("header span").filter({ hasText: /^✓ salvo$/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "← Editor" }).click();
  await expect(page).toHaveURL(/\/editor$/);
});

test("depois de publicar, o aviso leva ao início do editor", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator("header span").filter({ hasText: /^✓ salvo$/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const pergunta = page.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" });
  await expect(pergunta).toBeVisible({ timeout: 60_000 });
  await pergunta.getByRole("button", { name: "Publicar sem fazer" }).click();
  const publicar = page.getByRole("dialog", { name: "Publicar a aula" });
  await expect(publicar.getByRole("region", { name: "Impacto da publicação" })).toBeVisible({ timeout: 60_000 });
  await publicar.getByRole("button", { name: /^(Publicar|Republicar igual)$/ }).click();
  const aviso = page.getByRole("status").filter({ hasText: /^Publicada neste computador/ });
  await expect(aviso).toBeVisible({ timeout: 60_000 });
  await aviso.getByRole("link", { name: "Voltar ao início do editor" }).click();
  await expect(page).toHaveURL(/\/editor$/);
});
