/**
 * A ordem da aula — fatia 10, parada 10D (§18).
 *
 * Mover etapas pela janela "Ordem da aula", o aviso da prática fora do fim, Desfazer, excluir um
 * treino pelo cartão, e o capítulo novo sem lugar escolhido entrando **antes** da prática.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const fluxo = () => (JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as { fluxo: Array<{ tipo: string }> }).fluxo.map((e) => e.tipo);

test.beforeEach(() => criarAulaBase());

test("mover etapas, desfazer, excluir treino e capítulo novo antes da prática", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  expect(fluxo()).toEqual(["introducao", "capitulo", "treino", "pratica"]);

  await page.getByRole("button", { name: /Ordem da aula · 4 etapas/ }).click();
  const ordem = page.getByRole("dialog", { name: "Ordem da aula" });
  const linhas = ordem.getByRole("list", { name: "Etapas na ordem da aula" }).getByRole("listitem");
  await expect(linhas).toHaveCount(4);
  await expect(linhas.nth(2)).toContainText("depois do capítulo «Uma fileira de cada vez»");

  await ordem.getByRole("button", { name: /Subir prática/ }).click();
  await expect.poll(fluxo).toEqual(["introducao", "capitulo", "pratica", "treino"]);
  await expect(ordem.getByRole("status")).toHaveText(/A prática não é a última etapa/);

  await page.keyboard.press("Control+z");
  await expect.poll(fluxo).toEqual(["introducao", "capitulo", "treino", "pratica"]);
  await expect(ordem.getByRole("status")).toHaveCount(0);
  await ordem.getByRole("button", { name: "Fechar" }).first().click();
  await expect(page.getByRole("button", { name: /Ordem da aula/ })).toBeFocused();

  // Capítulo novo "no fim da aula" entra antes da prática.
  await page.getByRole("button", { name: "+ Adicionar capítulo" }).click();
  const novo = page.getByRole("dialog", { name: "Adicionar capítulo" });
  await novo.getByLabel("Nome do capítulo").fill("Capítulo extra");
  await novo.getByRole("combobox").selectOption({ label: "no fim da aula" });
  await novo.getByRole("button", { name: "Criar capítulo" }).click();
  await expect.poll(fluxo).toEqual(["introducao", "capitulo", "treino", "capitulo", "pratica"]);

  // Excluir o treino pelo cartão, com confirmação.
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Excluir treino…" }).click();
  await expect.poll(fluxo).toEqual(["introducao", "capitulo", "capitulo", "pratica"]);
  await expect(page.getByText("Nenhum treino nesta aula.")).toBeVisible();
});
