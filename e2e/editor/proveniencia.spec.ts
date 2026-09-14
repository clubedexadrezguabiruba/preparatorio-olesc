/**
 * Proveniência e acervo pela tela — fatia 10, parada 10B (§19.1, plano §12).
 *
 * Número da parada: na aula de ensaio, `FEN_IMPORTADA_SEM_REVISAO` **1 → 0** depois de registrar
 * a origem pela janela aberta por "Ir para o problema"; e o capítulo vindo do acervo não cria aviso.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const FEN = "8/8/8/4k3/8/8/8/3QK3 w - - 0 1";
const arquivo = () => readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8");
type AulaCrua = { analises: Array<{ id: string; inicio: { tipo: string; fen?: string; positionId?: string; revisao?: { origem: string; fenRevisada: string; professor: string } } }>; proveniencia: Array<{ positionId: string }> };

test.beforeEach(() => criarAulaBase());

test("FEN colada → aviso → Ir para o problema → Autoria própria → aviso some; capítulo do acervo sem aviso", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  const problemas = page.getByRole("region", { name: "Problemas desta aula" });

  await page.getByRole("button", { name: "+ Adicionar capítulo" }).click();
  const janela = page.getByRole("dialog", { name: "Adicionar capítulo" });
  await janela.getByLabel("Nome do capítulo").fill("O L e a caixa");
  await janela.getByRole("button", { name: /Colar FEN/ }).click();
  await janela.getByLabel("FEN da posição").fill(FEN);
  await janela.getByRole("button", { name: "Criar capítulo" }).click();
  await expect(janela).toBeHidden();

  const aviso = problemas.getByText(/ainda não passou por revisão de proveniência/);
  await expect(aviso).toHaveCount(1);
  await expect(page.getByRole("button", { name: /O L e a caixa/ })).toContainText("⚑");

  await problemas.getByRole("listitem").filter({ hasText: /ainda não passou por revisão de proveniência/ }).getByRole("button", { name: "Ir para o problema" }).click();
  const revisao = page.getByRole("dialog", { name: "De onde veio esta posição?" });
  await expect(revisao).toBeVisible();

  // O único campo obrigatório: registrar sem ele é recusado com a frase, e a janela fica.
  await revisao.getByRole("button", { name: "Registrar revisão" }).click();
  await expect(revisao.getByRole("alert")).toHaveText(/único campo obrigatório/);

  await revisao.getByRole("radio", { name: /Autoria própria/ }).check();
  await revisao.getByRole("button", { name: "Registrar revisão" }).click();
  await expect(revisao).toBeHidden();
  await expect(problemas.getByText(/ainda não passou por revisão de proveniência/)).toHaveCount(0);

  await expect.poll(() => {
    const aula = JSON.parse(arquivo()) as AulaCrua;
    return aula.analises.find((a) => a.inicio.fen === FEN)?.inicio.revisao?.origem;
  }).toBe("autoria-propria");
  const gravada = (JSON.parse(arquivo()) as AulaCrua).analises.find((a) => a.inicio.fen === FEN)!.inicio.revisao!;
  expect(gravada.fenRevisada).toBe(FEN);
  expect(gravada.professor).toBe("Professor de Ensaio");

  // Pelo ••• do capítulo a janela reabre, mostrando quem revisou.
  await page.getByRole("group").filter({ hasText: "•••" }).last().locator("summary").click();
  await page.getByRole("button", { name: "De onde veio a posição…" }).click();
  await expect(page.getByRole("dialog", { name: "De onde veio esta posição?" }).getByText(/Revisada em .* por Professor de Ensaio/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Ctrl+Z desfaz a revisão: o aviso volta.
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");
  await expect(problemas.getByText(/ainda não passou por revisão de proveniência/)).toHaveCount(1);
  await page.keyboard.press("Control+y");
  await expect(problemas.getByText(/ainda não passou por revisão de proveniência/)).toHaveCount(0);

  // Porta nova: posição do acervo.
  await page.getByRole("button", { name: "+ Adicionar capítulo" }).click();
  await janela.getByLabel("Nome do capítulo").fill("Mate em dois do Cook");
  await janela.getByRole("button", { name: /Posição do acervo/ }).click();
  await janela.getByLabel("Procurar no acervo").fill("cook");
  await janela.getByRole("radio", { name: /pos-n0-qmate-cook-d1/ }).check({ force: true });
  await janela.getByRole("button", { name: "Criar capítulo" }).click();
  await expect(janela).toBeHidden();
  await expect.poll(() => (JSON.parse(arquivo()) as AulaCrua).analises.some((a) => a.inicio.positionId === "pos-n0-qmate-cook-d1")).toBe(true);
  expect((JSON.parse(arquivo()) as AulaCrua).proveniencia.map((p) => p.positionId)).toContain("pos-n0-qmate-cook-d1");
  await expect(problemas.getByText(/não está no pacote|revisão de proveniência/)).toHaveCount(0);
});
