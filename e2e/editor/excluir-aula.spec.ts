/**
 * "Excluir aula…" e a lixeira — pedido do Doug no teste humano de 14/9/2026.
 *
 * Número da parada: a aula extra sai da lista para a lixeira com o impacto na janela, o rascunho some
 * do disco, e "Restaurar" a devolve byte a byte. Aula do curso não tem o botão.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { criarAulaVazia } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const AULA = "EX-E2E-EXCLUIR";
const RASCUNHO = path.join(RAIZ, ".editor/v2", `${AULA}.json`);

test.beforeEach(() => criarAulaVazia(AULA, "Aula para excluir"));

test("excluir leva à lixeira, e restaurar devolve a aula", async ({ page }) => {
  const antes = readFileSync(RASCUNHO, "utf8");
  await page.goto("/editor");
  await expect(page.getByRole("link", { name: /Aula para excluir/ })).toBeVisible();
  // Aula do curso não se exclui pela tela.
  await expect(page.getByRole("button", { name: /Excluir a aula .*KPK|Excluir a aula .*Escada/i })).toHaveCount(0);

  await page.getByRole("button", { name: "Excluir a aula Aula para excluir" }).click();
  const janela = page.getByRole("dialog", { name: "Excluir «Aula para excluir»?" });
  await expect(janela.getByRole("region", { name: "O que sai junto" })).toContainText("A aula está vazia.");
  await janela.getByRole("button", { name: "Mover para a lixeira" }).click();
  await expect(janela).toBeHidden();
  await expect(page.getByRole("link", { name: /Aula para excluir/ })).toHaveCount(0);
  expect(existsSync(RASCUNHO)).toBe(false);

  const lixeira = page.getByRole("region", { name: "Lixeira" });
  await expect(lixeira).toContainText(AULA);
  await lixeira.getByRole("button", { name: "Restaurar a aula Aula para excluir" }).click();
  await expect(lixeira.getByRole("status")).toContainText("voltou para a lista");
  await expect(page.getByRole("link", { name: /Aula para excluir/ })).toBeVisible();
  expect(readFileSync(RASCUNHO, "utf8")).toBe(antes);
});
