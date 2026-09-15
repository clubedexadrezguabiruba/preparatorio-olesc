/**
 * "Nova aula → Importando do Lichess ou de um PGN" — pedido do Doug no teste humano de 14/9/2026.
 *
 * Número da parada: o título chega do arquivo ("Capitulo 0.3 Mate de Dama e Rei"), os 9 capítulos
 * aparecem antes de criar, e a aula criada abre **já** na janela de importar com os 9 capítulos do
 * estudo — uma vez só: recarregar não reabre a janela.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const FIXTURE = path.join(RAIZ, "e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn");
const AULA = "EX-E2E-NOVA-IMPORTANDO";

test("nova aula importando: o título vem do estudo e a aula abre na janela de importar", async ({ page }) => {
  await page.goto("/editor/v2/nova");
  const criar = page.getByRole("button", { name: "Traga o PGN primeiro" });

  await page.getByRole("radio", { name: /Importando do Lichess ou de um PGN/ }).check();
  await expect(criar).toBeDisabled();
  await page.getByLabel("Escolher um arquivo PGN do computador").setInputFiles(FIXTURE);

  await expect(page.getByRole("status").filter({ hasText: "9 capítulos" })).toBeVisible();
  const titulo = page.getByRole("textbox", { name: "Título da aula" });
  await expect(titulo).toHaveValue("Capitulo 0.3 Mate de Dama e Rei");

  // Tipo, nível e classe o arquivo não sabe. O título muda para cair no nome que a limpeza apaga.
  await page.getByRole("combobox", { name: /^Tipo/ }).selectOption("extra");
  await page.getByRole("combobox", { name: /^Classe/ }).selectOption("E");
  await titulo.fill("E2E Nova importando");
  await page.getByText("Opções avançadas").click();
  await expect(page.getByText(AULA)).toBeVisible();

  await page.getByRole("button", { name: "Criar aula e importar" }).click();
  await expect(page).toHaveURL(new RegExp(`/editor/v2/finais/${AULA}$`), { timeout: 30_000 });
  expect(existsSync(path.join(RAIZ, ".editor/v2", `${AULA}.json`))).toBe(true);

  const janela = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await expect(janela).toBeVisible({ timeout: 30_000 });
  await expect(janela.getByRole("list", { name: "Capítulos do estudo" }).getByRole("listitem")).toHaveCount(9);

  // Uma vez só: fechar e recarregar deixa a aula vazia, sem reabrir a janela.
  await janela.getByRole("button", { name: "Fechar" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "+ Adicionar capítulo" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("dialog", { name: "Importar do Lichess ou PGN" })).toHaveCount(0);
});
