/**
 * Jogar lance no editor — os achados do teste final de 15/9/2026 (§10.1).
 *
 * - A promoção pergunta a peça, como no aluno; Esc desiste sem gravar nada. Antes o editor gravava dama.
 * - Um lance novo onde já havia continuação cria uma variante, e a tela diz isso.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { AULA_BASE } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { centroDaCasa, jogar, tabuleiro } from "../preparo/tabuleiro.ts";

const NOME = "Promoção no editor";
type Aula = { capitulos: Array<{ titulo: string; analiseId: string }>; analises: Array<{ id: string; raizId: string; nos: Record<string, { uci?: string; filhos: string[] }> }> };

/** Os lances que saem da posição inicial do capítulo, em UCI. */
function lancesDaRaiz(): string[] {
  const aula = JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as Aula;
  const capitulo = aula.capitulos.find((c) => c.titulo === NOME);
  if (!capitulo) return [];
  const analise = aula.analises.find((a) => a.id === capitulo.analiseId)!;
  return analise.nos[analise.raizId].filhos.map((id) => analise.nos[id].uci!);
}

async function criarCapituloFen(page: Page, fen: string) {
  await page.getByRole("button", { name: "+ Adicionar capítulo" }).first().click();
  const janela = page.getByRole("dialog", { name: "Adicionar capítulo" });
  await janela.getByLabel("Nome do capítulo").fill(NOME);
  await janela.getByRole("button", { name: /Colar código da posição/ }).click();
  await janela.getByLabel("FEN da posição").fill(fen);
  await janela.getByRole("button", { name: "Criar capítulo" }).click();
  await expect(janela).toBeHidden();
}

test("a promoção pergunta a peça, Esc desiste, e o lance novo avisa que nasceu uma variante", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
  await criarCapituloFen(page, "4k3/1P6/8/8/8/8/8/4K3 w - - 0 1");
  const posicaoInicial = page.getByRole("button", { name: "Posição inicial", exact: true });

  // Esc na escolha: nada entra.
  const de = await centroDaCasa(tabuleiro(page), "b7");
  const para = await centroDaCasa(tabuleiro(page), "b8");
  await page.mouse.click(de.x, de.y);
  await page.mouse.click(para.x, para.y);
  const escolha = page.getByRole("dialog", { name: "Escolha a peça da promoção" });
  await expect(escolha).toBeVisible();
  await expect(escolha.getByRole("button", { name: "Dama" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(escolha).toBeHidden();
  await expect(salvo).toHaveText("✓ salvo");
  expect(lancesDaRaiz()).toEqual([]);

  // Cavalo escolhido: é o que fica gravado.
  await jogar(page, "b7b8n");
  await expect.poll(lancesDaRaiz).toEqual(["b7b8n"]);
  await expect(page.getByRole("status").filter({ hasText: /variante/ })).toHaveCount(0);

  // Da posição inicial, outro lance: nasce uma variante, e a tela diz.
  await posicaoInicial.click();
  await jogar(page, "e1e2");
  await expect.poll(lancesDaRaiz).toEqual(["b7b8n", "e1e2"]);
  await expect(page.getByRole("status").filter({ hasText: /Nasceu uma variante/ })).toBeVisible();
  await expect(salvo).toHaveText("✓ salvo");
});
