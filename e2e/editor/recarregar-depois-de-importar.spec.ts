/**
 * Recarregar logo depois de importar — dúvida levantada no teste final de 15/9/2026 (§6.3).
 *
 * O gravar é assíncrono (600 ms depois da última mudança). Quem recarrega antes disso não pode ficar
 * com a aula vazia e sem saída: ou o disco já tem a importação, ou a tela oferece a recuperação local.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { abrirImportar, criarAulaVazia, FIXTURE_DO_ESTUDO } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const AULA = "EX-E2E-RECARGA";
const capitulosNoDisco = () => (JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA}.json`), "utf8")) as { capitulos: unknown[] }).capitulos.length;

test("recarregar assim que a importação termina não perde a aula", async ({ page }) => {
  criarAulaVazia(AULA, "Recarga depois de importar");
  await page.goto(`/editor/v2/finais/${AULA}`);
  const janela = await abrirImportar(page);
  await janela.locator('input[type="file"]').setInputFiles(FIXTURE_DO_ESTUDO);
  await janela.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await janela.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(janela).toBeHidden({ timeout: 30_000 });

  // Sem esperar o "✓ salvo": é o gesto de quem aperta F5 logo depois de ver os capítulos aparecerem.
  await page.goto(`/editor/v2/finais/${AULA}`);
  const recuperar = page.getByRole("button", { name: /Recuperar/ });
  const capitulos = page.getByRole("navigation", { name: "Capítulos na ordem da aula" }).getByRole("button");
  await expect
    .poll(async () => ({ recuperar: await recuperar.count(), capitulosNaTela: await capitulos.count(), noDisco: capitulosNoDisco() }), { timeout: 30_000 })
    .toMatchObject({ recuperar: expect.any(Number) });
  const estado = { recuperar: await recuperar.count(), capitulosNaTela: await capitulos.count(), noDisco: capitulosNoDisco() };
  console.log(`[e2e] depois da recarga: ${JSON.stringify(estado)}`);
  expect(estado.recuperar > 0 || estado.noDisco > 0, "a importação tem de estar no disco ou oferecida para recuperar").toBe(true);

  if (await recuperar.count()) await recuperar.first().click();
  await expect.poll(capitulosNoDisco, { timeout: 30_000 }).toBeGreaterThan(0);
  await expect(page.getByText(/Comece pelo primeiro capítulo/)).toHaveCount(0);
});
