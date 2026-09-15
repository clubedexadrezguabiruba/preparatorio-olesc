/**
 * O que o teste de uso das travas de 15/9 achou (16/9/2026), sobre a `EX-E2E-BASE` (cópia da N0-LADDER).
 */
import { expect, test } from "../preparo/fixtures.ts";
import { AULA_BASE } from "../preparo/global-setup.ts";

test("a janela «Editar treino» tem o nome do título", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  const cartao = page.getByRole("list", { name: "Treinos da aula" }).locator("[data-treino-id]").first();
  const titulo = (await cartao.getAttribute("title"))!.replace(/^Editar o treino «(.*)»$/, "$1");
  await cartao.click();
  await expect(page.getByRole("dialog", { name: `Editar treino — ${titulo}` })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Ações do treino «${titulo}»` }).click();
  await page.getByRole("menuitem", { name: "Editar treino" }).click();
  await expect(page.getByRole("dialog", { name: `Editar treino — ${titulo}` })).toBeVisible();
});

test("Publicar fica desligado enquanto o impacto é calculado, e liga quando ele aparece", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  // Segura as ações de servidor depois da pergunta, para "Calculando o impacto…" ficar na tela o tempo de medir.
  let segurar = false;
  let soltar: () => void = () => {};
  const solto = new Promise<void>((r) => { soltar = r; });
  await page.route(`**/editor/v2/finais/${AULA_BASE}`, async (rota) => {
    if (segurar && rota.request().method() === "POST" && rota.request().headers()["next-action"]) await solto;
    await rota.continue();
  });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const pergunta = page.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" });
  await expect(pergunta).toBeVisible({ timeout: 30_000 });
  segurar = true;
  await pergunta.getByRole("button", { name: "Publicar sem fazer" }).click();
  const janela = page.getByRole("dialog", { name: "Publicar a aula" });
  await expect(janela.getByText("Calculando o impacto…")).toBeVisible();
  // Todo botão "Publicar" da página: o da janela e o da barra do editor, atrás dela.
  const publicarLigado = page.getByRole("button", { name: "Publicar", exact: true }).and(page.locator(":enabled"));
  await page.waitForTimeout(1000);
  await expect(janela.getByText("Calculando o impacto…")).toBeVisible();
  expect(await publicarLigado.count(), "nenhum Publicar ligado enquanto calcula").toBe(0);
  soltar();
  segurar = false;
  await expect(janela.getByRole("region", { name: "Impacto da publicação" })).toBeVisible({ timeout: 30_000 });
  await expect(janela.getByRole("button", { name: /^(Publicar|Republicar igual)$/ })).toBeEnabled();
  // Fechar devolve o foco ao Publicar da barra, que volta a ligar.
  await janela.getByRole("button", { name: "Cancelar" }).click();
  await expect(janela).toBeHidden();
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeFocused();
});

test("treino que cobra empate na escada de torres: o cartão diz, a conferência avisa, e a aula publica", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  const cartao = page.getByRole("list", { name: "Treinos da aula" }).locator("[data-treino-id]").first();
  await expect(cartao).toContainText("Brancas · vencer");
  const titulo = (await cartao.getAttribute("title"))!.replace(/^Editar o treino «(.*)»$/, "$1");
  await cartao.click();
  const janela = page.getByRole("dialog", { name: `Editar treino — ${titulo}` });
  await janela.getByRole("combobox", { name: /^O treino cobra/ }).selectOption("draw");
  await janela.getByRole("button", { name: "Salvar treino" }).click();
  await expect(janela).toBeHidden();
  await expect(cartao).toContainText("Brancas · empate");
  await expect(page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ })).toHaveText("✓ salvo", { timeout: 30_000 });

  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const pergunta = page.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" });
  await expect(pergunta).toBeVisible({ timeout: 60_000 });
  const resultado = page.getByRole("region", { name: "Resultado da conferência" });
  await expect(resultado).toContainText(/Pode publicar\. (1 aviso, que não impede|\d+ avisos, que não impedem)\./);
  await pergunta.getByRole("button", { name: "Publicar sem fazer" }).click();
  const publicar = page.getByRole("dialog", { name: "Publicar a aula" });
  await expect(publicar.getByRole("region", { name: "Impacto da publicação" })).toBeVisible({ timeout: 60_000 });
  await publicar.getByRole("button", { name: /^(Publicar|Republicar igual)$/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Publicada neste computador/ })).toBeVisible({ timeout: 60_000 });

  if (await resultado.getByRole("button", { name: /Ver lista/ }).isVisible()) await resultado.getByRole("button", { name: /Ver lista/ }).click();
  const aviso = resultado.getByRole("listitem").filter({ hasText: /cobra segurar o empate/ });
  await expect(aviso).toHaveCount(1);
  await expect(aviso).toContainText("no acervo, a posição onde ele começa dá vitória das brancas");
  await expect(aviso).toContainText("a certificação antiga guarda vitória");
  console.log("aviso:", (await aviso.innerText()).replace(/\s+/g, " "));
});
