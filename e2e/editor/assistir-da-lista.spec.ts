/**
 * Pedido do Doug de 16/9/2026: da lista de aulas, assistir uma aula como aluno — a versão do editor
 * ou a publicada —, com as duas opções dentro de um `⋯`.
 *
 * Só lê: a `EX-E2E-BASE` (cópia da N0-LADDER, nunca publicada) e a N0-LADDER, que é a aula do curso
 * que os ensaios podem abrir. A impressão digital do preparo confere que nada em `content/` mudou.
 */
import { expect, test } from "../preparo/fixtures.ts";
import { AULA_BASE } from "../preparo/global-setup.ts";

test("aula nunca publicada: assiste a versão do editor, a publicada fica apagada, e volta à lista", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Assistir «Ensaio automático — aula base» como aluno" }).click();
  await expect(page.getByRole("menuitem", { name: /^Assistir a versão publicada/ })).toBeDisabled();
  await expect(page.getByRole("menuitem", { name: /^Assistir a versão publicada/ })).toContainText("esta aula ainda não foi publicada");
  await page.getByRole("menuitem", { name: /^Assistir como aluno/ }).click();

  await expect(page).toHaveURL(new RegExp(`/editor/v2/assistir/${AULA_BASE}$`));
  const tela = page.getByRole("dialog", { name: "Fazer a aula inteira como aluno" });
  await expect(tela.getByRole("status").filter({ hasText: "Esta aula ainda não foi publicada" })).toBeVisible();
  await expect(tela.getByRole("button", { name: "← Sair da aula" })).toBeVisible({ timeout: 30_000 });
  await tela.getByRole("button", { name: "Terminar e ver o tempo" }).click();
  await tela.getByRole("button", { name: "Voltar à lista de aulas" }).click();
  await expect(page).toHaveURL(/\/editor$/);
});

test("aula publicada: a versão do editor sem aviso, a publicada no player do aluno, e volta à lista", async ({ page }) => {
  await page.goto("/editor");
  const menu = page.getByRole("button", { name: /^Assistir «.*» como aluno$/ });
  const nome = await page.locator("li", { hasText: "N0-LADDER" }).getByRole("button", { name: /^Assistir «/ }).getAttribute("aria-label");
  expect(nome).toBeTruthy();
  await page.getByRole("button", { name: nome!, exact: true }).click();
  await page.getByRole("menuitem", { name: /^Assistir como aluno/ }).click();
  await expect(page).toHaveURL(/\/editor\/v2\/assistir\/N0-LADDER$/);
  const tela = page.getByRole("dialog", { name: "Fazer a aula inteira como aluno" });
  await expect(tela.getByRole("button", { name: "← Sair da aula" })).toBeVisible({ timeout: 30_000 });
  // A N0-LADDER do editor é a publicada (medido em 16/9): nenhum aviso de mudança.
  await expect(tela.getByText("Esta versão tem mudanças que ainda não foram publicadas.")).toHaveCount(0);

  await page.goto("/editor");
  await expect(menu.first()).toBeVisible();
  await page.getByRole("button", { name: nome!, exact: true }).click();
  await page.getByRole("menuitem", { name: /^Assistir a versão publicada/ }).click();
  await expect(page).toHaveURL(/\/editor\/v2\/assistir\/N0-LADDER\/publicada$/);
  await expect(page.getByText("O que o aluno recebe hoje, do jeito que ele faz. Nada é gravado no progresso.")).toBeVisible();
  await expect(page.getByRole("button", { name: "← Sair da aula" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Voltar à lista de aulas" }).click();
  await expect(page).toHaveURL(/\/editor$/);
});
