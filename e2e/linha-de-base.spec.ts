/**
 * @base — a medida de partida da fatia 10, tirada **antes** de consertar qualquer coisa.
 *
 * Não reprova nada: grava os números em `.editor/e2e/linha-de-base.json` e os imprime. As paradas
 * 10F e 10G comparam contra eles ("largura a 375 px 600→375", "axe X→0").
 */
import { AULA_BASE } from "./preparo/global-setup.ts";
import { conferirTamanho, expect, test } from "./preparo/fixtures.ts";
import { botoesCobertos, culpadosDaLargura, lancesInteirosVisiveis, larguraDaPagina, violacoesDoAxe, type Violacao } from "./preparo/medidas.ts";
import { guardarJson } from "./preparo/protecao.ts";

type Medida = Record<string, unknown>;
const medidas: Record<string, Medida> = {};
const resumoDoAxe = (v: Violacao[]) => v.map((x) => `${x.id} (${x.impacto}) ×${x.alvos.length}`);

test.describe.configure({ mode: "serial" });

test("@base editor em 1366×768", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  await page.waitForTimeout(800);
  const tamanho = await conferirTamanho(page, 1366, 768);
  const axe = await violacoesDoAxe(page);
  medidas["editor-1366"] = {
    tamanho,
    largura: await larguraDaPagina(page),
    lances: await lancesInteirosVisiveis(page),
    botoes: await botoesCobertos(page),
    axe: resumoDoAxe(axe),
    axeDetalhe: axe,
  };
});

test("@base editor em 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  await page.waitForTimeout(800);
  await conferirTamanho(page, 375, 812);
  medidas["editor-375"] = { largura: await larguraDaPagina(page), culpados: await culpadosDaLargura(page) };
});

const TELAS_DO_ALUNO = ["/painel", "/trilha", "/finais", "/finais/N0-LADDER", "/aberturas", "/tatica", "/tatica/rating/evolucao"];

for (const tela of TELAS_DO_ALUNO) {
  test(`@base aluno em 375 px: ${tela}`, async ({ aluno }) => {
    await aluno.goto(tela);
    await aluno.waitForLoadState("networkidle").catch(() => undefined);
    await aluno.waitForTimeout(600);
    await conferirTamanho(aluno, 375, 812);
    const axe = await violacoesDoAxe(aluno);
    medidas[`aluno-375 ${tela}`] = {
      url: aluno.url(),
      largura: await larguraDaPagina(aluno),
      culpados: await culpadosDaLargura(aluno, 3),
      axe: resumoDoAxe(axe),
      axeDetalhe: axe,
    };
  });
}

test("@base entrar em 375 px, sem sessão", async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: "pt-BR", baseURL: "http://localhost:3000" });
  const pagina = await contexto.newPage();
  await pagina.goto("/entrar");
  await pagina.waitForTimeout(400);
  const axe = await violacoesDoAxe(pagina);
  medidas["entrar-375"] = { largura: await larguraDaPagina(pagina), axe: resumoDoAxe(axe), axeDetalhe: axe };
  await contexto.close();
});

test.afterAll(() => {
  const destino = guardarJson("linha-de-base.json", { em: new Date().toISOString(), medidas });
  const semDetalhe = Object.fromEntries(Object.entries(medidas).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([c]) => c !== "axeDetalhe"))]));
  console.log(`[e2e] linha de base em ${destino}\n${JSON.stringify(semDetalhe, null, 2)}`);
});
