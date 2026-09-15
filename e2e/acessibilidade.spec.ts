/**
 * @a11y — axe sem violação séria ou crítica, em cada tela e em cada janela aberta (fatia 10, 10F; §25).
 */
import { AULA_BASE, criarAulaBase } from "./preparo/global-setup.ts";
import { expect, test } from "./preparo/fixtures.ts";
import { violacoesDoAxe, type Violacao } from "./preparo/medidas.ts";
import { guardarJson, lerJson } from "./preparo/protecao.ts";

const resumo = (v: Violacao[]) => v.map((x) => `${x.id} (${x.impacto}): ${x.alvos.join(" | ")}`);
function registrar(onde: string, v: Violacao[]) {
  const atual = lerJson<Record<string, string[]>>("axe.json") ?? {};
  guardarJson("axe.json", { ...atual, [onde]: resumo(v) });
}

test.beforeEach(() => criarAulaBase());

test("@a11y editor e as janelas", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  const falhas: string[] = [];
  const medir = async (onde: string, seletor?: string) => {
    const v = await violacoesDoAxe(page, seletor);
    registrar(onde, v);
    falhas.push(...resumo(v).map((linha) => `${onde}: ${linha}`));
  };
  await medir("editor");

  const janelas: Array<[string, () => Promise<void>, string]> = [
    ["Adicionar capítulo", () => page.getByRole("button", { name: "+ Adicionar capítulo" }).click(), '[role="dialog"]'],
    ["Importar", async () => { await page.getByRole("button", { name: "Mais ações" }).click(); await page.getByRole("menuitem", { name: /Importar do Lichess ou PGN/ }).click(); }, '[role="dialog"]'],
    ["Prática", () => page.getByRole("button", { name: /Prática contra o computador/ }).first().click(), '[role="dialog"]'],
    ["Ordem da aula", () => page.getByRole("button", { name: /Ordem da aula/ }).click(), '[role="dialog"]'],
    ["Introdução", () => page.getByRole("button", { name: /Apresentação/ }).first().click(), '[role="dialog"]'],
    ["Pré-visualizar", () => page.getByRole("button", { name: "Ver como aluno" }).click(), '[role="dialog"]'],
    ["Atalhos", async () => { await page.locator("body").click({ position: { x: 3, y: 3 } }); await page.keyboard.press("Shift+?"); }, '[role="dialog"]'],
  ];
  for (const [nome, abrir, seletor] of janelas) {
    await abrir();
    await expect(page.locator(seletor).first()).toBeVisible();
    await page.waitForTimeout(300);
    await medir(`janela ${nome}`, seletor);
    await page.keyboard.press("Escape");
    await expect(page.locator(seletor)).toHaveCount(0);
  }
  expect(falhas).toEqual([]);
});

test("@a11y telas do aluno", async ({ aluno }) => {
  const falhas: string[] = [];
  for (const tela of ["/painel", "/trilha", "/finais", "/finais/N0-LADDER", "/aberturas", "/tatica"]) {
    await aluno.goto(tela);
    await aluno.waitForTimeout(600);
    const v = await violacoesDoAxe(aluno);
    registrar(`aluno ${tela}`, v);
    falhas.push(...resumo(v).map((linha) => `${tela}: ${linha}`));
  }
  expect(falhas).toEqual([]);
});

test("@a11y entrar, sem sessão", async ({ browser }) => {
  const pagina = await (await browser.newContext({ viewport: { width: 375, height: 812 }, baseURL: "http://localhost:3000" })).newPage();
  await pagina.goto("/entrar");
  await pagina.waitForTimeout(400);
  const v = await violacoesDoAxe(pagina);
  registrar("entrar", v);
  expect(resumo(v)).toEqual([]);
});
