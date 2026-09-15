/**
 * O passeio de experiência do editor — revisão pedida pelo Doug em 14/9/2026: "leigo tem de conseguir".
 *
 * Visita as telas de uma aula real (o estudo do Doug importado) e, em cada uma, guarda: a foto a
 * 1366×768, as palavras técnicas no texto visível, e medidas de layout — rolagem lateral, texto
 * cortado dentro de botão e alvos de clique menores que 24 px. Um passo que não abre vira achado
 * ("não consegui chegar"), e o passeio continua.
 *
 * Roda à parte: `npx playwright test --grep @tour`. As fotos vão para `.editor/e2e/tour/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { abrirImportar, criarAulaVazia, FIXTURE_DO_ESTUDO, maisAcoes } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const AULA = "EX-E2E-TOUR";
const PASTA = path.join(RAIZ, ".editor/e2e/tour");
test.setTimeout(600_000);

/** Palavras que um professor leigo não deveria precisar conhecer. */
const JARGAO = [
  "análise", "FEN", "PGN", "hash", "manifesto", "revisão de avaliação", "derivado", "personalizado", "percurso",
  "meios-lances", "meio-lance", "identificador", "série do identificador", "NAG", "UCI", "proveniência", "acervo",
  "política", "perfil", "linha autoral", "certific", "tablebase", "snapshot", "v2", "v1", "schema", "fluxo",
  "D1", "D2", "D3", "D4", "critério de domínio", "defensor", "término", "rascunho", "piloto", "formato novo",
];

type Achado = { tela: string; jargao: Record<string, number>; rolagemLateral: number; textoCortado: string[]; alvosPequenos: string[]; semNome: number; semNomeQuais?: string[]; erro?: string };
const achados: Achado[] = [];

async function medir(page: Page, tela: string, escopo?: Locator) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(PASTA, `${tela}.png`) });
  const alvo = escopo ?? page.locator("body");
  const texto = (await alvo.innerText().catch(() => "")) ?? "";
  const jargao: Record<string, number> = {};
  for (const palavra of JARGAO) {
    const quantos = texto.match(new RegExp(`(^|[^\\p{L}])${palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "giu"))?.length ?? 0;
    if (quantos) jargao[palavra] = quantos;
  }
  const layout = await page.evaluate(() => {
    const visivel = (el: Element) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && r.bottom > 0 && r.top < innerHeight; };
    const controles = [...document.querySelectorAll("button, a[href], input, select, summary, textarea")].filter(visivel);
    const nome = (el: Element) => (el.getAttribute("aria-label") || (el as HTMLElement).innerText || (el as HTMLInputElement).value || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return {
      rolagemLateral: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      textoCortado: controles.filter((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== "visible").map(nome).slice(0, 12),
      alvosPequenos: controles.filter((el) => { const r = el.getBoundingClientRect(); return (r.width < 24 || r.height < 24) && !(el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)); }).map((el) => `${nome(el) || el.tagName} (${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)})`).slice(0, 15),
      semNome: controles.filter((el) => !nome(el) && !el.getAttribute("aria-labelledby") && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest("label")).length,
      semNomeQuais: controles.filter((el) => !nome(el) && !el.getAttribute("aria-labelledby") && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest("label")).map((el) => el.outerHTML.slice(0, 140)).slice(0, 6),
    };
  });
  achados.push({ tela, jargao, ...layout });
}

async function passo(page: Page, tela: string, fazer: () => Promise<Locator | void>) {
  try {
    const escopo = await fazer();
    await medir(page, tela, escopo ?? undefined);
  } catch (erro) {
    achados.push({ tela, jargao: {}, rolagemLateral: 0, textoCortado: [], alvosPequenos: [], semNome: 0, erro: String(erro).split("\n")[0].slice(0, 200) });
    await page.screenshot({ path: path.join(PASTA, `${tela}--falhou.png`) }).catch(() => undefined);
    await page.keyboard.press("Escape").catch(() => undefined);
  }
}

test("@tour passeio de experiência do editor", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true });
  const dialogo = (nome: string | RegExp) => page.getByRole("dialog", { name: nome });

  await passo(page, "01-indice", async () => { await page.goto("/editor"); });
  await passo(page, "02-nova-aula", async () => { await page.goto("/editor/v2/nova"); });
  await passo(page, "03-nova-aula-importando", async () => { await page.getByRole("radio", { name: /Importando do Lichess/ }).check(); });

  criarAulaVazia(AULA, "Mate de Dama e Rei");
  await passo(page, "04-aula-vazia", async () => { await page.goto(`/editor/v2/finais/${AULA}`); await expect(page.getByRole("button", { name: "+ Adicionar capítulo" })).toBeVisible(); });
  await passo(page, "05-adicionar-capitulo", async () => { await page.getByRole("button", { name: "+ Adicionar capítulo" }).click(); return page.getByRole("dialog").first(); });
  await passo(page, "06-montador", async () => { await page.getByRole("button", { name: /Montar posição/ }).click(); return page.getByRole("dialog").first(); });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await passo(page, "07-importar", async () => {
    await abrirImportar(page);
    const janela = dialogo("Importar do Lichess ou PGN");
    await janela.locator('input[type="file"]').setInputFiles(FIXTURE_DO_ESTUDO);
    await expect(janela.getByRole("list", { name: "Capítulos do estudo" })).toBeVisible();
    return janela;
  });
  await dialogo("Importar do Lichess ou PGN").getByRole("button", { name: "Importar o estudo" }).click();
  await expect(dialogo("Importar do Lichess ou PGN")).toBeHidden({ timeout: 30_000 });

  await passo(page, "08-editor-depois-de-importar", async () => { await page.waitForTimeout(1500); });
  await passo(page, "08b-menu-mais-acoes", async () => { await page.getByRole("button", { name: "Mais ações" }).click(); return page.getByRole("menu", { name: "Mais ações" }); });
  await page.keyboard.press("Escape");
  await passo(page, "09-lance-selecionado", async () => {
    const lista = page.getByRole("tree").or(page.locator('[aria-label="Lances da análise"]')).first();
    await lista.getByRole("button").nth(3).click();
  });
  await passo(page, "10-menu-do-lance", async () => {
    await page.getByRole("button", { name: /Ações do lance|•••/ }).first().click();
    return page.getByRole("menu").or(page.getByRole("dialog")).first();
  });
  await page.keyboard.press("Escape");

  await passo(page, "11-menu-do-capitulo", async () => { await page.getByLabel(/^Ações do capítulo/).first().click(); });
  await passo(page, "12-de-onde-veio", async () => { await page.getByRole("button", { name: "De onde veio a posição…" }).click(); return dialogo("De onde veio esta posição?"); });
  await page.keyboard.press("Escape");

  await passo(page, "13-editar-treino", async () => {
    await page.getByRole("list", { name: "Treinos da aula" }).getByRole("button").first().click();
    return dialogo(/^Editar treino/);
  });
  await page.keyboard.press("Escape");
  await passo(page, "14-jogar-treino", async () => { await page.getByRole("button", { name: /^Testar o treino/ }).first().click(); return dialogo(/^Jogar o treino/); });
  await page.keyboard.press("Escape");

  await passo(page, "15-editar-pratica", async () => { await page.locator("[data-pratica]").first().click(); return page.getByRole("dialog").first(); });
  await page.keyboard.press("Escape");
  await passo(page, "16-editar-introducao", async () => { await page.locator("[data-introducao]").first().click(); return page.getByRole("dialog").first(); });
  await page.keyboard.press("Escape");
  await passo(page, "17-ordem-da-aula", async () => { await page.getByRole("button", { name: /Ordem da aula/ }).click(); return dialogo("Ordem da aula"); });
  await page.keyboard.press("Escape");

  await passo(page, "18-pre-visualizar", async () => { await page.getByRole("button", { name: "Ver como aluno" }).click(); return dialogo("Pré-visualizar"); });
  await passo(page, "19-como-aluno", async () => {
    await page.getByRole("button", { name: /Fazer a aula inteira como aluno/ }).click();
    await expect(dialogo("Fazer a aula inteira como aluno").getByText(/Etapa 1 de/)).toBeVisible({ timeout: 30_000 });
  });
  await passo(page, "20-como-aluno-treino", async () => {
    const tela = dialogo("Fazer a aula inteira como aluno");
    await tela.getByRole("navigation", { name: "Etapas da aula" }).getByRole("button").nth(3).click();
  });
  await passo(page, "21-resumo", async () => { await page.keyboard.press("Escape"); });
  await dialogo("Fazer a aula inteira como aluno").getByRole("button", { name: "Voltar ao editor" }).click().catch(() => undefined);

  await passo(page, "22-publicar-com-problema", async () => {
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByRole("region", { name: "Resultado da conferência" })).toBeVisible({ timeout: 60_000 });
  });
  await passo(page, "23-mais-opcoes", async () => { await maisAcoes(page, "Nível e publicações…"); return page.getByRole("dialog").first(); });
  await page.keyboard.press("Escape");
  await passo(page, "24-exportar", async () => { await maisAcoes(page, /^Exportar…/); return dialogo("Exportar"); });
  await page.keyboard.press("Escape");
  await passo(page, "25-motor", async () => { await page.locator("body").click({ position: { x: 2, y: 400 } }); await page.keyboard.press("l"); await page.waitForTimeout(2500); });
  await passo(page, "26-atalhos", async () => { await page.keyboard.press("Shift+?"); return page.getByRole("dialog").first(); });
  await page.keyboard.press("Escape");

  await passo(page, "27-excluir", async () => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Excluir a aula Mate de Dama e Rei", exact: true }).click();
    return page.getByRole("dialog").first();
  });

  writeFileSync(path.join(PASTA, "achados.json"), `${JSON.stringify(achados, null, 2)}\n`);
});
