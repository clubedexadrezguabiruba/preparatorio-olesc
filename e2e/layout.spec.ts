/**
 * @layout — cabe na tela, sem rolagem para o lado e sem botão coberto (fatia 10, 10F; §25 e §7).
 *
 * Roda nos quatro perfis: o editor em 1366, 1280 e 1920; o aluno a 375 px.
 */
import { AULA_BASE } from "./preparo/global-setup.ts";
import { conferirTamanho, expect, test } from "./preparo/fixtures.ts";
import { botoesCobertos, culpadosDaLargura, lancesInteirosVisiveis, larguraDaPagina } from "./preparo/medidas.ts";
import { guardarJson, lerJson } from "./preparo/protecao.ts";
import type { Page } from "@playwright/test";

const TELAS_DO_ALUNO = ["/painel", "/trilha", "/finais", "/finais/N0-LADDER", "/aberturas", "/aberturas/brancas/escocesa/aulas/a", "/tatica", "/tatica/damianoMate", "/tatica/revisao", "/tatica/rating/evolucao"];

async function conferirAulaSemRolagem(pagina: Page) {
  await expect(pagina.locator(".aula-tabuleiro").first()).toBeVisible();
  const falaAtiva = pagina.locator(".aula-fala:not(.aula-fala-vazia)").first();
  if (await falaAtiva.count()) {
    await expect(falaAtiva).toBeVisible();
    await expect(pagina.getByAltText("O professor Douglas").first()).toBeVisible();
  }
  const medidas = await pagina.evaluate(() => {
    const retangulo = (seletor: string) => {
      const elemento = document.querySelector(seletor);
      if (!elemento) return null;
      const r = elemento.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    const controles = [...document.querySelectorAll(".aula-rodape button, .aula-rodape a")]
      .filter((elemento) => {
        const estilo = getComputedStyle(elemento);
        return estilo.display !== "none" && estilo.visibility !== "hidden";
      })
      .map((elemento) => {
        const r = elemento.getBoundingClientRect();
        return { texto: elemento.textContent?.trim(), top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      });
    return {
      largura: innerWidth,
      altura: innerHeight,
      scroll: document.scrollingElement?.scrollHeight ?? 0,
      tabuleiro: retangulo(".aula-tabuleiro"),
      fala: retangulo(".aula-fala"),
      controles,
    };
  });
  expect(medidas.scroll, JSON.stringify(medidas)).toBeLessThanOrEqual(medidas.altura + 1);
  expect(medidas.tabuleiro, JSON.stringify(medidas)).not.toBeNull();
  expect(medidas.tabuleiro!.width, JSON.stringify(medidas)).toBeGreaterThanOrEqual(320);
  for (const area of [medidas.tabuleiro, medidas.fala, ...medidas.controles]) {
    if (!area) continue;
    expect(area.top, JSON.stringify(medidas)).toBeGreaterThanOrEqual(0);
    expect(area.bottom, JSON.stringify(medidas)).toBeLessThanOrEqual(medidas.altura + 1);
  }
}

test("@layout o editor cabe e não cobre botão", async ({ page }, info) => {
  test.skip(info.project.name === "aluno-375", "o editor é desktop (§3)");
  const tamanho = page.viewportSize()!;
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  await page.waitForTimeout(700);
  await conferirTamanho(page, tamanho.width, tamanho.height);
  const largura = await larguraDaPagina(page);
  const lances = await lancesInteirosVisiveis(page);
  const botoes = await botoesCobertos(page);
  const medidas = lerJson<Record<string, unknown>>("layout.json") ?? {};
  guardarJson("layout.json", { ...medidas, [`editor ${info.project.name}`]: { largura, lances, botoes } });
  expect(largura.transborda, JSON.stringify(await culpadosDaLargura(page))).toBe(0);
  expect(botoes.cobertos).toEqual([]);
  if (tamanho.height >= 768) expect(lances.inteiros).toBeGreaterThanOrEqual(5);
});

test("@layout o editor a 375 px não rola para o lado", async ({ page }, info) => {
  test.skip(info.project.name !== "aluno-375");
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  await page.waitForTimeout(700);
  await conferirTamanho(page, 375, 812);
  const largura = await larguraDaPagina(page);
  const medidas = lerJson<Record<string, unknown>>("layout.json") ?? {};
  guardarJson("layout.json", { ...medidas, "editor 375": { largura, culpados: await culpadosDaLargura(page) } });
  expect(largura.transborda, JSON.stringify(await culpadosDaLargura(page))).toBe(0);
});

for (const tela of [...TELAS_DO_ALUNO, "/entrar"]) {
  test(`@layout aluno a 375 px: ${tela}`, async ({ aluno, browser }, info) => {
    test.skip(info.project.name !== "aluno-375");
    let pagina = aluno;
    if (tela === "/entrar") pagina = await (await browser.newContext({ viewport: { width: 375, height: 812 }, baseURL: "http://localhost:3000" })).newPage();
    await pagina.goto(tela);
    await pagina.waitForTimeout(600);
    const largura = await larguraDaPagina(pagina);
    expect(largura.transborda, JSON.stringify(await culpadosDaLargura(pagina))).toBe(0);
    if (tela === "/finais/N0-LADDER") {
      await pagina.setViewportSize({ width: 360, height: 640 });
      await pagina.goto("/finais/N0-LADDER");
      const textoDaEtapa = (await pagina.locator(".aula-etapa-atual").textContent()) ?? "";
      const total = Number(textoDaEtapa.match(/de (\d+)/)?.[1]);
      expect(total).toBeGreaterThan(1);
      // O aluno no celular anda por todas as etapas pela trilha compacta. Em
      // cada uma, tabuleiro, professor e controles continuam na mesma janela.
      for (let i = 0; i < total; i += 1) {
        if (i > 0) {
          const trilha = pagina.locator('nav[aria-label="Etapas da aula"]:visible');
          await trilha.getByRole("button", { name: /^Etapas/ }).click();
          await trilha.locator("ol").last().getByRole("button").nth(i).click();
        }
        await expect(pagina.getByText(new RegExp(`Etapa ${i + 1} de ${total}`))).toBeVisible();
        expect((await larguraDaPagina(pagina)).transborda).toBe(0);
        const comecar = pagina.getByRole("button", { name: /Começar/ });
        if (await comecar.isVisible().catch(() => false)) await comecar.click();
        await conferirAulaSemRolagem(pagina);
      }
    }
    if (tela === "/aberturas/brancas/escocesa/aulas/a") {
      await pagina.setViewportSize({ width: 360, height: 640 });
      await pagina.goto(tela);
      const comecar = pagina.getByRole("button", { name: /Começar/ });
      if (await comecar.isVisible().catch(() => false)) await comecar.click();
      await conferirAulaSemRolagem(pagina);
    }
    if (tela === "/tatica/damianoMate") {
      await pagina.setViewportSize({ width: 360, height: 640 });
      await pagina.goto("/tatica/mateIn1");
      const entendi = pagina.getByRole("button", { name: "Entendi, começar" });
      if (await entendi.isVisible().catch(() => false)) await entendi.click();
      await conferirAulaSemRolagem(pagina);
    }
  });
}
