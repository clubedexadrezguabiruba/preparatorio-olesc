/**
 * A marca de revisão do quadro da introdução — achado do teste final de 15/9/2026 (§19.2).
 *
 * O comentário e a narração já avisam "a posição inicial mudou depois que isto foi escrito" e oferecem
 * "Já reli" no próprio lugar em que o texto se edita. O quadro da introdução não avisava: quem chegava
 * pelo "Resolver" da conferência reescrevia o texto e a marca continuava lá, e a aula seguia acusada.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { maisAcoes } from "../preparo/aulas.ts";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const ID = "EX-E2E-REVISAO-QUADRO";
const arquivo = path.join(RAIZ, ".editor/v2", `${ID}.json`);
type Aula = { id: string; titulo: string; introducoes: Array<{ quadros: Array<{ id: string; texto: string; revisao?: unknown }> }> };
const disco = () => JSON.parse(readFileSync(arquivo, "utf8")) as Aula;

test("o quadro marcado para revisão avisa e oferece «Já reli» na janela da introdução", async ({ page }) => {
  criarAulaBase();
  const base = JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as Aula;
  base.id = ID;
  base.titulo = "Ensaio da revisão do quadro";
  base.introducoes[0].quadros[1].revisao = { motivo: "posicao-inicial-trocada" };
  writeFileSync(arquivo, JSON.stringify(base, null, 2) + "\n");

  await page.goto(`/editor/v2/finais/${ID}`);
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");

  // O caminho do professor: a conferência acusa, e "Resolver" abre o quadro certo.
  await maisAcoes(page, /Conferir sem publicar/);
  const resultado = page.getByRole("region", { name: "Resultado da conferência" });
  await expect(resultado.getByRole("status")).toContainText(/publicar/i, { timeout: 60_000 });
  const verLista = resultado.getByRole("button", { name: /Ver lista/ });
  if (await verLista.isVisible()) await verLista.click();
  await resultado.getByRole("listitem").filter({ hasText: /quadro da introdução/ }).getByRole("button", { name: "Resolver" }).first().click();

  const janela = page.getByRole("dialog", { name: /^Introdução: / });
  await expect(janela).toBeVisible();
  await expect(janela.getByText(/Quadro 2 de/)).toBeVisible();
  const aviso = janela.getByText(/posição inicial .* mudou/i);
  await expect(aviso).toBeVisible();

  await janela.getByRole("button", { name: "Já reli" }).click();
  await expect(aviso).toHaveCount(0);
  await expect(salvo).toHaveText("✓ salvo", { timeout: 30_000 });
  expect(disco().introducoes[0].quadros[1].revisao).toBeUndefined();

  // A conferência, sem recarregar, deixa de acusar o quadro.
  await page.keyboard.press("Escape");
  await maisAcoes(page, /Conferir sem publicar/);
  await expect(resultado.getByRole("status")).toContainText(/publicar/i, { timeout: 60_000 });
  await expect(resultado.getByRole("listitem").filter({ hasText: /quadro da introdução/ })).toHaveCount(0);
});
