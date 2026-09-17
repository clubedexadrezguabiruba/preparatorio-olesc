/**
 * "Mudar para…" — introdução, capítulo ou treino depois de importar (pedido do Doug, 15/9/2026).
 *
 * Sobre o estudo real "Mate de Dama e Rei", importado sem a prática (ela escreveria no acervo):
 * capítulo → treino pelo `•••` da lista, treino → capítulo pelo `•••` do treino, quadro sem lances →
 * treino recusado com motivo e → capítulo aceito, e um Ctrl+Z que devolve o quadro.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { abrirImportar } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const AULA = "EX-E2E-MODO";
// Não importado de `importar-estudo.spec.ts`: importar um spec registraria os testes dele aqui também.
const criarAulaVazia = (id: string, titulo: string) => writeFileSync(path.join(RAIZ, ".editor/v2", `${id}.json`), JSON.stringify({
  schemaVersion: 2, id, titulo,
  metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
  proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
}, null, 2) + "\n");
const FIXTURE = path.join(RAIZ, "e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn");
const arquivo = () => JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA}.json`), "utf8")) as {
  introducoes: Array<{ quadros: Array<{ texto: string }> }>;
  capitulos: Array<{ id: string; titulo: string; caminho: string[] }>;
  treinos: Array<{ id: string; titulo: string }>;
  fluxo: Array<{ tipo: string; entidadeId: string }>;
};

test.beforeEach(() => criarAulaVazia(AULA, "Mudar o modo (ensaio)"));

test("capítulo ↔ treino e quadro → capítulo pelo «Mudar para…», com o que sai à vista e Desfazer", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA}`);
  await abrirImportar(page);
  const importar = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await importar.locator('input[type="file"]').setInputFiles(FIXTURE);
  await importar.getByRole("combobox", { name: /O que «PRÁTICA LIVRE/ }).selectOption("fora");
  // O 01 ("AULA DIAGNÓSTICO", sem lances) como quadro: é o quadro sem lances do passo 3; pelo nome, viria capítulo parado.
  await importar.getByRole("combobox", { name: /O que «AULA DIAGNÓSTICO/ }).selectOption("introducao");
  await importar.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await importar.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(importar).toBeHidden({ timeout: 30_000 });
  await expect.poll(() => arquivo().treinos.length).toBe(4);
  const antes = arquivo();
  const original = antes.capitulos[0];
  const lugar = antes.fluxo.findIndex((e) => e.entidadeId === original.id);

  // 1. Capítulo → treino, pelo ••• da lista de capítulos.
  await page.getByRole("button", { name: `Ações do capítulo ${original.titulo}` }).or(page.getByLabel(`Ações do capítulo ${original.titulo}`)).first().click();
  await page.locator(`[data-mudar-modo-capitulo="${original.id}"]`).click();
  let janela = page.getByRole("dialog", { name: `Mudar «${original.titulo}» para…` });
  await expect(janela).toBeVisible();
  await janela.locator('[data-mudar-modo="treino"]').click();
  await expect(janela.getByRole("region", { name: "O que fica" })).toContainText(/perguntas para o aluno jogar com as brancas/);
  await expect(janela.getByRole("region", { name: "O que sai" })).toBeVisible();
  await janela.getByRole("button", { name: "Mudar para treino" }).click();
  await expect(janela).toBeHidden();
  await expect.poll(() => arquivo().treinos.length).toBe(5);
  const comTreino = arquivo();
  expect(comTreino.capitulos.map((c) => c.id)).not.toContain(original.id);
  expect(comTreino.fluxo[lugar].tipo).toBe("treino");
  const treinoId = comTreino.fluxo[lugar].entidadeId;

  // 2. Treino → capítulo, pelo ••• do treino: volta o mesmo capítulo, no mesmo lugar.
  await page.getByRole("button", { name: `Ações do treino «${original.titulo}»` }).click();
  await page.getByRole("menuitem", { name: /Mudar para…/ }).click();
  janela = page.getByRole("dialog", { name: `Mudar «${original.titulo}» para…` });
  await janela.locator('[data-mudar-modo="capitulo"]').click();
  await expect(janela.getByRole("region", { name: "O que sai" })).toContainText(/fora da linha principal/);  await janela.getByRole("button", { name: "Mudar para capítulo" }).click();
  await expect.poll(() => arquivo().treinos.some((t) => t.id === treinoId)).toBe(false);
  const deVolta = arquivo();
  const capitulo = deVolta.capitulos.find((c) => c.id === original.id);
  expect(capitulo?.caminho).toEqual(original.caminho);
  expect(deVolta.fluxo[lugar].entidadeId).toBe(original.id);

  // 3. Quadro sem lances: treino recusado com o motivo; capítulo aceito.
  await page.locator("[data-introducao]").first().click();
  const introducao = page.getByRole("dialog", { name: /^Introdução:/ });
  await introducao.locator("[data-mudar-modo-quadro]").click();
  janela = page.getByRole("dialog", { name: /^Mudar «.+» para…$/ });
  await expect(janela.locator('[data-mudar-modo="treino"]')).toContainText(/não tem lances guardados/);
  await expect(janela.locator('[data-mudar-modo="treino"] input')).toBeDisabled();
  await janela.locator('[data-mudar-modo="capitulo"]').click();
  await janela.getByRole("button", { name: "Mudar para capítulo" }).click();
  await expect.poll(() => arquivo().introducoes[0]?.quadros.length).toBe(1);
  expect(arquivo().capitulos).toHaveLength(3);

  // 4. Ctrl+Z devolve o quadro.
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");
  await expect.poll(() => arquivo().introducoes[0]?.quadros.length).toBe(2);
  expect(arquivo().capitulos).toHaveLength(2);
});
