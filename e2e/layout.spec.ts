/**
 * @layout — cabe na tela, sem rolagem para o lado e sem botão coberto (fatia 10, 10F; §25 e §7).
 *
 * Roda nos quatro perfis: o editor em 1366, 1280 e 1920; o aluno a 375 px.
 */
import { AULA_BASE } from "./preparo/global-setup.ts";
import { conferirTamanho, expect, test } from "./preparo/fixtures.ts";
import { botoesCobertos, culpadosDaLargura, lancesInteirosVisiveis, larguraDaPagina } from "./preparo/medidas.ts";
import { guardarJson, lerJson } from "./preparo/protecao.ts";

const TELAS_DO_ALUNO = ["/painel", "/trilha", "/finais", "/finais/N0-LADDER", "/aberturas", "/tatica", "/tatica/damianoMate", "/tatica/revisao", "/tatica/rating/evolucao"];

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
      // O aluno no celular anda por todas as etapas pela trilha.
      const botoes = pagina.getByRole("navigation", { name: "Etapas da aula" }).getByRole("button");
      const total = await botoes.count();
      for (let i = 0; i < total; i += 1) {
        await botoes.nth(i).click();
        await expect(pagina.getByText(new RegExp(`Etapa ${i + 1} de ${total}`))).toBeVisible();
        expect((await larguraDaPagina(pagina)).transborda).toBe(0);
      }

      // O caso relatado pelos alunos: num telefone baixo, o professor e a fala
      // precisam continuar visíveis junto do tabuleiro, sem rolar a página.
      await pagina.setViewportSize({ width: 360, height: 640 });
      await pagina.goto("/finais/N0-LADDER");
      await expect(pagina.locator(".aula-tabuleiro").first()).toBeVisible();
      await expect(pagina.locator(".aula-fala").first()).toBeVisible();
      await expect(pagina.getByAltText("O professor Douglas").first()).toBeVisible();
      const simultaneos = await pagina.evaluate(() => {
        const tabuleiro = document.querySelector(".aula-tabuleiro")?.getBoundingClientRect();
        const fala = document.querySelector(".aula-fala")?.getBoundingClientRect();
        return {
          tabuleiro: tabuleiro ? { top: tabuleiro.top, bottom: tabuleiro.bottom } : null,
          fala: fala ? { top: fala.top, bottom: fala.bottom } : null,
          altura: innerHeight,
        };
      });
      expect(simultaneos.tabuleiro).not.toBeNull();
      expect(simultaneos.fala).not.toBeNull();
      expect(simultaneos.tabuleiro!.top).toBeGreaterThanOrEqual(0);
      expect(simultaneos.tabuleiro!.bottom).toBeLessThanOrEqual(simultaneos.altura);
      expect(simultaneos.fala!.top).toBeLessThan(simultaneos.altura);
      expect(simultaneos.fala!.bottom).toBeLessThanOrEqual(simultaneos.altura);
    }
  });
}
