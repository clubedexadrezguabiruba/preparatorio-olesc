/**
 * Importar o estudo do Doug, "Mate de Dama e Rei", com os modos — fatia 10, parada 10E (§13).
 *
 * Número da parada: 9/9 capítulos no destino certo pelo nome (1 quadro, 3 capítulos — o 01 parado —, 4 treinos,
 * 1 prática; até 16/9/2026 o 01 entrava como quadro),
 * as variantes `Qg6??`, os 3 mates do treino 07, as perdas listadas — e o Conferir sem erro.
 * A passada `@rede` cola o link real e confere que chega o mesmo estudo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { maisAcoes, abrirImportar } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

export const AULA_LICHESS = "EX-E2E-LICHESS";
const FIXTURE = path.join(RAIZ, "e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn");
const arquivo = () => JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_LICHESS}.json`), "utf8")) as {
  introducoes: Array<{ quadros: Array<{ texto: string }> }>;
  capitulos: Array<{ titulo: string; caminho: string[] }>;
  treinos: Array<{ titulo: string; questoes: Array<{ respostas: Array<{ moves: string[]; julgamento: string }> }> }>;
  praticas: Array<{ positionId: string; objetivo: string }>;
  fluxo: Array<{ tipo: string }>;
};

export function criarAulaVazia(id: string, titulo: string) {
  writeFileSync(path.join(RAIZ, ".editor/v2", `${id}.json`), JSON.stringify({
    schemaVersion: 2, id, titulo,
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  }, null, 2) + "\n");
}

test.beforeEach(() => criarAulaVazia(AULA_LICHESS, "Mate de Dama e Rei (importada)"));

test("o arquivo do estudo: seletor com as pistas, importar, e Conferir sem erro", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_LICHESS}`);
  await abrirImportar(page);
  const janela = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await janela.locator('input[type="file"]').setInputFiles(FIXTURE);

  const lista = janela.getByRole("list", { name: "Capítulos do estudo" });
  await expect(lista.getByRole("listitem")).toHaveCount(9);
  const destinos = await lista.getByRole("combobox", { name: /^O que «.*» vira$/ }).evaluateAll((selects) => selects.map((s) => (s as HTMLSelectElement).value));
  expect(destinos).toEqual(["introducao", "capitulo", "capitulo", "capitulo", "treino", "treino", "treino", "treino", "pratica"]);
  await expect(janela.getByText(/dicas e os textos de desvio da lição interativa/).first()).toBeVisible();
  await expect(janela.getByRole("status").filter({ hasText: "A aula ganha" })).toHaveText(/1 quadro\(s\) de introdução, 3 capítulo\(s\), 4 treino\(s\) e 1 prática\(s\)/);
  await expect(janela.getByText(/Qg7\+ não tem símbolo/)).toBeVisible();

  await janela.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await janela.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(janela).toBeHidden({ timeout: 30_000 });

  await expect.poll(() => arquivo().treinos.length).toBe(4);
  const aula = arquivo();
  expect(aula.introducoes[0].quadros).toHaveLength(1);
  expect(aula.introducoes[0].quadros[0].texto).toContain("\n");
  expect(aula.capitulos.map((c) => c.titulo)).toEqual(["AULA DIAGNÓSTICO - Como você começaria?", "AULA EXPLICADA - O L e a caixa", "AULA EXPLICADA - O método completo"]);
  expect(aula.capitulos[0].caminho).toEqual([]);
  expect(aula.fluxo.map((e) => e.tipo)).toEqual(["introducao", "capitulo", "capitulo", "capitulo", "treino", "treino", "treino", "treino", "pratica"]);
  const mates = aula.treinos[3].questoes.at(-1)!.respostas.filter((r) => r.julgamento === "correta").map((r) => r.moves[0]).sort();
  expect(mates).toEqual(["g4g6", "g4h3", "g4h4"]);
  // A posição nova da prática, ou — se o acervo já tem a mesma FEN, como depois que o Doug importou o
  // estudo dele (pos-ex-promocao-peao-1, 14/9/2026) — a que já existe: o acervo não duplica FEN.
  expect(aula.praticas[0].positionId).toMatch(/^pos-ex-[a-z0-9-]+-\d+$/);
  expect(aula.praticas[0].objetivo).toBe("win");

  // Importar de novo avisa, e não duplica.
  await abrirImportar(page);
  await janela.locator('input[type="file"]').setInputFiles(FIXTURE);
  await janela.getByRole("combobox", { name: /O que «PRÁTICA LIVRE/ }).selectOption("fora");
  await expect(janela.getByRole("alert")).toHaveText(/já ter sido importado/);
  await page.keyboard.press("Escape");

  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
  await maisAcoes(page, /Conferir sem publicar/);
  const resultado = page.getByRole("region", { name: "Resultado da conferência" });
  await expect(resultado).toBeVisible({ timeout: 60_000 });
  await expect(resultado).toContainText(/Pode publicar/);
  console.log(`[e2e] conferência do estudo importado: ${(await resultado.textContent())?.slice(0, 300)}`);
});

test("@rede o link real chega ao mesmo estudo", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_LICHESS}`);
  await abrirImportar(page);
  const janela = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await janela.getByLabel(/Endereço do Lichess/).fill("https://lichess.org/study/hf09xMzS");
  await janela.getByRole("button", { name: "Buscar no Lichess" }).click();
  const lista = janela.getByRole("list", { name: "Capítulos do estudo" });
  await expect(lista.getByRole("listitem")).toHaveCount(9, { timeout: 30_000 });
  const destinos = await lista.getByRole("combobox", { name: /^O que «.*» vira$/ }).evaluateAll((selects) => selects.map((s) => (s as HTMLSelectElement).value));
  expect(destinos).toEqual(["introducao", "capitulo", "capitulo", "capitulo", "treino", "treino", "treino", "treino", "pratica"]);

  // Endereço de fora é recusado sem busca.
  await janela.getByLabel(/Endereço do Lichess/).fill("https://evil.example/study/hf09xMzS");
  await janela.getByRole("button", { name: "Buscar no Lichess" }).click();
  await expect(janela.getByRole("alert").first()).toHaveText(/só endereços do lichess\.org/);
});
