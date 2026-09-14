/**
 * Os atalhos de teclado pela tabela única — fatia 10, parada 10F.
 *
 * Teclas reais pelo teclado do Playwright (eventos confiáveis): `x` só vira a vista, `?` abre a ajuda
 * gerada da tabela, `L` liga o motor mas não com o menu `•••` aberto nem digitando, setas andam na
 * lista, Esc fecha a janela e devolve o foco, Tab não sai da janela.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ATALHOS, conflitosDaTabela } from "../../lib/atalhos/tabela.ts";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const arquivo = () => readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8");
const orientacao = (pagina: import("@playwright/test").Page) => pagina.locator(".cg-wrap").first().getAttribute("class");

test.beforeEach(() => criarAulaBase());

test("editor: x, ?, L, setas, Esc e Tab", async ({ page }) => {
  expect(conflitosDaTabela()).toEqual([]);
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  const antes = arquivo();
  await page.locator("body").click({ position: { x: 3, y: 3 } });

  // x vira só a vista.
  await page.keyboard.press("x");
  await expect.poll(() => orientacao(page)).toContain("orientation-black");
  await page.keyboard.press("x");
  await expect.poll(() => orientacao(page)).toContain("orientation-white");
  await page.waitForTimeout(900);
  expect(arquivo()).toBe(antes);

  // ? mostra a ajuda gerada da tabela; Esc fecha.
  await page.keyboard.press("Shift+?");
  const ajuda = page.getByRole("dialog", { name: "Atalhos de teclado" });
  await expect(ajuda).toBeVisible();
  for (const item of ATALHOS.filter((a) => a.escopo === "editor" || a.escopo === "tabuleiro")) await expect(ajuda.getByText(item.descricao, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ajuda).toBeHidden();

  // L liga e desliga o motor; digitando "l" num campo, não.
  await page.keyboard.press("l");
  await expect(page.getByText("desligado · tecla L liga")).toHaveCount(0);
  await page.keyboard.press("l");
  await expect(page.getByText("desligado · tecla L liga").first()).toBeVisible();
  await page.getByLabel("Comentário desta posição").click();
  await page.keyboard.type("l");
  await expect(page.getByText("desligado · tecla L liga").first()).toBeVisible();
  await page.getByLabel("Comentário desta posição").fill("");

  // Com o menu ••• de um lance aberto, o L fica mudo, e Esc devolve o foco ao •••.
  await page.getByRole("button", { name: /Ações do lance/ }).first().click();
  await page.keyboard.press("l");
  await expect(page.getByText("desligado · tecla L liga").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Ações do lance/ }).first()).toBeFocused();

  // Setas andam na lista.
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("list", { name: "Lances da análise" }).locator('[aria-current="true"]')).toHaveCount(1);

  // Janela: Tab não escapa, Esc fecha e devolve o foco a quem abriu.
  const abrir = page.getByRole("button", { name: "+ Adicionar capítulo" });
  await abrir.click();
  const janela = page.getByRole("dialog", { name: "Adicionar capítulo" });
  for (let i = 0; i < 30; i += 1) await page.keyboard.press("Tab");
  expect(await janela.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  // Com a janela aberta, as setas não mudam o lance atrás dela.
  const lanceAntes = await page.getByRole("list", { name: "Lances da análise" }).locator('[aria-current="true"]').textContent();
  await page.keyboard.press("Escape");
  await expect(janela).toBeHidden();
  await expect(abrir).toBeFocused();
  expect(await page.getByRole("list", { name: "Lances da análise" }).locator('[aria-current="true"]').textContent()).toBe(lanceAntes);
});

test("aluno: x vira a vista, ? mostra os atalhos, e a etapa aparece em texto", async ({ aluno }) => {
  await aluno.setViewportSize({ width: 1366, height: 768 });
  await aluno.goto("/finais/N0-LADDER");
  await expect(aluno.getByText(/Etapa 1 de \d+/)).toBeVisible();
  await expect(aluno.locator(".cg-wrap").first()).toBeVisible();
  await aluno.locator("body").click({ position: { x: 3, y: 3 } });
  await aluno.keyboard.press("x");
  await expect.poll(() => orientacao(aluno)).toContain("orientation-black");
  await aluno.keyboard.press("Shift+?");
  await expect(aluno.getByRole("dialog", { name: "Atalhos de teclado" })).toBeVisible();
  await aluno.keyboard.press("Escape");
  await aluno.getByRole("navigation", { name: "Etapas da aula" }).getByRole("button").nth(1).click();
  await expect(aluno.getByText(/Etapa 2 de \d+/)).toBeVisible();
  await aluno.getByRole("button", { name: "← Etapa anterior" }).click();
  await expect(aluno.getByText(/Etapa 1 de \d+/)).toBeVisible();
});
