/**
 * A aula v2 sem prática — trava 9 de `docs/TRILHA-FINAIS.md` (15/9/2026).
 *
 * Importa o estudo do Doug com o capítulo de prática marcado como "Fora", confere (nada sobre prática
 * impede), publica, e o aluno de teste chega ao fim do fluxo: lá está o "assisti", e marcá-lo grava a
 * linha em `aula_lida` — é o que fecha a aula na trilha. Até 15/9 esta aula não publicava
 * (`PRATICA_AUSENTE`), e a marcação de uma aula v2 não gravava nada (`marcarLeitura` só lia a v1).
 */
import { abrirAulaPublicada, abrirPublicar, criarAulaVazia, FIXTURE_DO_ESTUDO, maisAcoes, abrirImportar } from "../preparo/aulas.ts";
import { leituraDoAluno } from "../preparo/contas.ts";
import { expect, test } from "../preparo/fixtures.ts";

const AULA = "EX-E2E-SEM-PRATICA";
test.setTimeout(300_000);
test.describe.configure({ mode: "serial" });

test.beforeAll(() => criarAulaVazia(AULA, "Mate de Dama e Rei, sem prática"));

test("importar sem a prática, conferir e publicar", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA}`);
  await abrirImportar(page);
  const janela = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await janela.locator('input[type="file"]').setInputFiles(FIXTURE_DO_ESTUDO);
  const vira = janela.getByRole("list", { name: "Capítulos do estudo" }).getByRole("combobox", { name: /^O que «.*» vira$/ });
  await expect(vira).toHaveCount(9);
  await vira.nth(8).selectOption("fora");
  await janela.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await expect(janela.getByRole("status").filter({ hasText: "A aula ganha" })).toHaveText(/0 prática\(s\)/);
  await janela.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(janela).toBeHidden({ timeout: 30_000 });

  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
  await expect(page.getByText(/Opcional\. Sem prática, o aluno fecha a aula marcando que assistiu/)).toBeVisible();
  await maisAcoes(page, /Conferir sem publicar/);
  await expect(page.getByRole("region", { name: "Resultado da conferência" })).toContainText("Pode publicar", { timeout: 60_000 });
  const publicar = await abrirPublicar(page);
  await publicar.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Publicada neste computador" })).toBeVisible({ timeout: 60_000 });
});

test("o aluno chega ao fim e fecha a aula marcando que assistiu", async ({ aluno }) => {
  await aluno.setViewportSize({ width: 1366, height: 768 });
  await abrirAulaPublicada(aluno, AULA);
  await expect(aluno.getByText(/Etapa 1 de 7/)).toBeVisible();
  const assisti = aluno.getByRole("checkbox", { name: "Marcar esta aula como lida" });
  // No meio do fluxo o controle não aparece; só no fim.
  await expect(assisti).toHaveCount(0);

  await aluno.getByRole("navigation", { name: "Etapas da aula" }).getByRole("button").nth(6).click();
  await expect(aluno.getByText(/Etapa 7 de 7/)).toBeVisible();
  await expect(aluno.getByText("Assisti à aula até o fim.")).toBeVisible();
  await expect(assisti).toBeEnabled({ timeout: 15_000 });
  expect(await leituraDoAluno(AULA)).toBe(false);
  await assisti.check();
  await expect(aluno.getByText("Aula feita.")).toBeVisible();
  await expect.poll(() => leituraDoAluno(AULA), { timeout: 30_000 }).toBe(true);
});
