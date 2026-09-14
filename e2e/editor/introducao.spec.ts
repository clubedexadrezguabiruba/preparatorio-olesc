/**
 * A introdução pela tela — fatia 10, parada 10D (§7.1).
 *
 * Na aula base (a N0-LADDER de fixture, com 3 quadros ligados à posição inicial do capítulo):
 * ← e →, título, quadro novo, duplicar, mover, desenhar com o botão direito, inserir lance, a
 * recusa da FEN repetida, excluir, Desfazer, prévia com o `IntroStage` do aluno e recarregar.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { desenharSeta, jogar } from "../preparo/tabuleiro.ts";

type QuadroCru = { id: string; titulo?: string; texto: string; lance?: string; desenhos?: unknown; posicao: { tipo: string; fen?: string } };
const quadros = () => (JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as { introducoes: Array<{ quadros: QuadroCru[] }> }).introducoes[0].quadros;

test.beforeEach(() => criarAulaBase());

test("editar os quadros da introdução, com teclado, desenho, lance inserido, recusa e prévia", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await page.getByRole("button", { name: /Apresentação.*3 quadros/ }).click();
  const tela = page.getByRole("dialog", { name: "Introdução: Apresentação" });
  await expect(tela.getByText("Quadro 1 de 3")).toBeVisible();

  // ← e → trocam de quadro fora dos campos.
  await tela.getByRole("button", { name: "Pré-visualizar a introdução" }).focus();
  await page.locator("body").press("ArrowRight").catch(() => undefined);
  await page.keyboard.press("ArrowRight");
  await expect(tela.getByText(/Quadro [23] de 3/)).toBeVisible();
  await tela.getByRole("navigation", { name: "Quadros da introdução" }).getByRole("button").nth(1).click();
  await expect(tela.getByText("Quadro 2 de 3")).toBeVisible();

  // Título do quadro 2.
  await tela.getByLabel("Título do quadro (opcional)").fill("Diagnóstico");
  await tela.getByLabel("Texto que o aluno lê").focus();
  await expect.poll(() => quadros()[1].titulo).toBe("Diagnóstico");

  // Quadro novo depois do 2, e duplicar.
  await tela.getByLabel("Texto do quadro novo").fill("Como você começaria?");
  await tela.getByRole("button", { name: "+ Acrescentar quadro depois deste" }).click();
  await expect(tela.getByText("Quadro 3 de 4")).toBeVisible();
  await tela.getByRole("button", { name: "Duplicar" }).click();
  await expect(tela.getByText("Quadro 4 de 5")).toBeVisible();
  await tela.getByRole("button", { name: "↑ Antes" }).click();
  await expect(tela.getByText("Quadro 3 de 5")).toBeVisible();
  await expect.poll(() => quadros().map((q) => q.texto)).toEqual(expect.arrayContaining(["Como você começaria?"]));

  // Desenho com o botão direito no quadro de agora.
  const tabuleiro = tela.locator(".cg-wrap").first();
  await desenharSeta(page, "g2", "g6", [], tabuleiro);
  await expect.poll(() => JSON.stringify(quadros()[2].desenhos ?? null)).toContain("g6");

  // Inserir lance: Tg1-a1 cria o quadro seguinte com a posição nova e o lance guardado.
  await jogar(page, "g1a1", tabuleiro);
  await expect(tela.getByText("Quadro 4 de 6")).toBeVisible();
  await expect.poll(() => quadros()[3].lance).toBe("g1a1");
  expect(quadros()[3].posicao.fen).toBe("8/8/8/8/8/4k3/6R1/R6K b - - 1 1");

  // FEN própria igual à posição inicial do capítulo é recusada com o nome dele.
  await tela.getByRole("button", { name: /FEN própria/ }).click();
  await tela.getByLabel("FEN", { exact: true }).fill("8/8/8/8/8/4k3/6R1/6RK w - - 0 1");
  await tela.getByRole("button", { name: "Usar esta FEN" }).click();
  await expect(tela.getByRole("alert")).toHaveText(/posição inicial do capítulo «Uma fileira de cada vez»/);

  // Excluir o quadro inserido; Ctrl+Z devolve.
  await tela.getByRole("button", { name: "Excluir quadro" }).click();
  await expect(tela.getByText(/de 5$/)).toBeVisible();
  await tela.getByRole("button", { name: "Duplicar" }).focus();
  await page.keyboard.press("Control+z");
  await expect(tela.getByText(/de 6$/)).toBeVisible();

  // Prévia com o IntroStage do aluno: o título do quadro aparece.
  await tela.getByRole("button", { name: "Pré-visualizar a introdução" }).click();
  const previa = page.getByRole("dialog", { name: "Prévia da introdução: Apresentação" });
  await previa.getByRole("button", { name: /Continuar/ }).click();
  await expect(previa.getByText("Diagnóstico")).toBeVisible();
  await previa.getByRole("button", { name: "Fechar prévia" }).click();
  await tela.getByRole("button", { name: "Fechar" }).click();

  // Recarregar: nada se perdeu.
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
  await page.reload();
  await expect(page.getByRole("button", { name: /Apresentação.*6 quadros/ })).toBeVisible();
});
