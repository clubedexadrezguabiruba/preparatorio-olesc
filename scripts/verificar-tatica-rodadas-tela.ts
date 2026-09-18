/** Navegador real: F5, resposta sem conexão, prova sem dica e gravação lenta. */
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { criarClienteAdmin } from "../lib/supabase/admin.ts";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { puzzlesDoTema } from "../lib/tatica/banco.ts";
import { ultimaRodada, puzzlesPendentes } from "../lib/tatica/rodadas.ts";
import { gravarTentativa } from "../lib/tatica/gravar.ts";
import type { PuzzleServido } from "../lib/tatica/puzzles.ts";

process.loadEnvFile(".env.local");
const base = process.env.BASE ?? "http://localhost:3000";
const admin = criarClienteAdmin();
const usuario = `teste.tela.${randomUUID().slice(0, 8)}`;
const pin = String(randomInt(100000, 999999));
const { data, error } = await admin.auth.admin.createUser({
  email: emailDoUsuario(usuario), password: pin, email_confirm: true,
  user_metadata: { usuario, nome: "Ensaio de tática", papel: "aluno", equipe: "M" },
});
assert.equal(error, null);
const aluno = data.user!.id;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(90000);
const erros: string[] = [];
page.on("pageerror", (e) => erros.push(e.message));

async function pronto() {
  await page.locator("cg-board").first().waitFor();
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(900);
}

async function resolver(pagina: Page, p: PuzzleServido) {
  const caixa = (await pagina.locator("cg-board").first().boundingBox())!;
  const preto = p.fen.split(" ")[1] === "w";
  const centro = (casa: string) => {
    const col = casa.charCodeAt(0) - 97, lin = Number(casa[1]) - 1;
    return { x: caixa.x + ((preto ? 7 - col : col) + 0.5) * caixa.width / 8,
      y: caixa.y + ((preto ? lin : 7 - lin) + 0.5) * caixa.height / 8 };
  };
  for (const [i, uci] of p.lances.entries()) {
    if (i % 2 === 0) continue;
    const de = centro(uci.slice(0, 2)), para = centro(uci.slice(2, 4));
    await pagina.mouse.move(de.x, de.y);
    await pagina.mouse.down();
    await pagina.mouse.move(para.x, para.y, { steps: 8 });
    await pagina.mouse.up();
    if (uci.length > 4) {
      const nomes: Record<string, string> = { q: "Dama", r: "Torre", b: "Bispo", n: "Cavalo" };
      await pagina.getByRole("dialog").getByRole("button", { name: nomes[uci[4]], exact: true }).click();
    }
    if (i + 2 < p.lances.length) await pagina.waitForTimeout(800);
  }
}

try {
  const banco = await puzzlesDoTema("mateIn1");
  const { error: semeadura } = await admin.from("tentativas_puzzle").insert(banco.slice(0, 29).map((p, i) => ({
    aluno, puzzle_id: p.id, tema: "mateIn1", origem: "mateIn1", modo: i < 5 ? "aquecimento" : "serie",
    acertou: true, tempo_ms: 3000,
  })));
  assert.equal(semeadura, null);
  await page.goto(`${base}/entrar`);
  await page.locator('input[name="usuario"]').fill(usuario);
  await page.locator('input[name="pin"]').fill(pin);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
  await page.goto(`${base}/tatica/mateIn1`);
  await pronto();
  assert.equal(await page.getByRole("heading", { name: "Prova — temas misturados", exact: true }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Dica|Por que funciona/ }).count(), 0);
  const rodada = (await ultimaRodada(aluno, "tema:mateIn1:prova"))!;
  const lista = await puzzlesPendentes(rodada);
  await page.reload();
  await pronto();
  assert.deepEqual((await ultimaRodada(aluno, "tema:mateIn1:prova"))!.puzzles, rodada.puzzles);
  console.log("ok: prova sem dica temática; F5 preserva a lista");

  let abortou = false;
  await page.route("**/tatica/mateIn1", async (route) => {
    if (!abortou && route.request().method() === "POST") { abortou = true; await route.abort("internetdisconnected"); }
    else await route.continue();
  });
  await resolver(page, lista[0]);
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith("tatica:rodada:") && JSON.parse(localStorage.getItem(k) ?? "[]").length > 0));
  await page.getByRole("alert").filter({ hasText: "Não deu para gravar" }).waitFor();
  await page.unroute("**/tatica/mateIn1");
  await page.reload();
  await page.getByText("2 de 10 · tema 31/39", { exact: true }).waitFor();
  await pronto();
  const recuperada = (await ultimaRodada(aluno, "tema:mateIn1:prova"))!;
  assert.deepEqual(recuperada.respostas, [{ puzzle_id: lista[0].id, acertou: true }]);
  console.log("ok: resposta offline é reenviada antes de liberar o tabuleiro e conta uma vez");

  mkdirSync(".scratch/tatica-revisao", { recursive: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: ".scratch/tatica-revisao/prova-celular.png", fullPage: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const p of lista.slice(1, -1)) {
    assert.deepEqual(await gravarTentativa(aluno, { rodadaId: rodada.id, puzzleId: p.id, origem: p.origem,
      tema: "mateIn1", modo: "prova", lances: p.lances.filter((_, i) => i % 2 === 1), tempoMs: 1000 }), { acertou: true });
  }
  await page.reload();
  await pronto();
  await page.route("**/tatica/mateIn1", async (route) => {
    if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  await resolver(page, lista.at(-1)!);
  await page.waitForTimeout(2100);
  assert.equal(await page.getByText("Prova — fim", { exact: true }).count(), 0);
  await page.getByText("Prova — fim", { exact: true }).waitFor();
  await page.getByText("10 de 10 de primeira", { exact: true }).waitFor();
  assert.equal((await ultimaRodada(aluno, "tema:mateIn1:prova"))!.respostas.length, 10);
  await page.screenshot({ path: ".scratch/tatica-revisao/prova-concluida.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByText("Tema concluído", { exact: true }).waitFor();
  assert.deepEqual(erros, []);
  console.log("ok: final aguarda gravação lenta; placar inclui antes do F5; tema conclui em 39");
} finally {
  await browser.close();
  const limpeza = await admin.auth.admin.deleteUser(aluno);
  assert.equal(limpeza.error, null);
  console.log("Conta descartável removida.");
}
