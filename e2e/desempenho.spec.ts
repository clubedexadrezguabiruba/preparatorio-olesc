/**
 * @desempenho — as metas de §24 no navegador (fatia 10, parada 10G).
 *
 * - **Abertura:** 1 aquecimento e 5 medidas, até a última linha da lista de lances existir, com o fim
 *   marcado por dois `requestAnimationFrame` (o quadro pintado). Árvore de 1.000 nós e linha de 500
 *   meios-lances (`lib/editor-v2/corpus.ts`). Meta: ≤ 2 s.
 * - **Interação:** 40 navegações por tecla, 20 comentários confirmados, 20 Ctrl+Z e 20 desenhos com o
 *   botão direito. Cada medida vai do `timeStamp` do evento real (teclado ou mouse do Playwright) até o
 *   segundo quadro depois dele. Meta: p95 ≤ 100 ms.
 *
 * Em `next dev` (sem otimização de produção): o número é um teto, não o do site publicado.
 */
import os from "node:os";
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { arvoreLargaV2, linhaLongaV2 } from "../lib/editor-v2/corpus.ts";
import { FEN_INICIAL_PADRAO, type AulaV2 } from "../lib/editor-v2/modelo.ts";
import { conferirTamanho, expect, test } from "./preparo/fixtures.ts";
import { guardarJson, RAIZ } from "./preparo/protecao.ts";
import { desenharSeta } from "./preparo/tabuleiro.ts";

function comoEnsaio(aula: AulaV2, id: string): AulaV2 {
  // A posição do corpus é uma fixture fora de `content/positions/`: no ensaio a análise começa na FEN
  // inicial do xadrez, que é a mesma e não pede revisão.
  return {
    ...aula, id, metadados: { ...aula.metadados!, nivel: 1, classe: "E" }, proveniencia: [],
    analises: aula.analises.map((a) => ({ ...a, inicio: { tipo: "fen" as const, fen: FEN_INICIAL_PADRAO } })),
  };
}

const estatistica = (valores: number[]) => {
  const ordenados = [...valores].sort((a, b) => a - b);
  const p = (q: number) => ordenados[Math.min(ordenados.length - 1, Math.ceil(q * ordenados.length) - 1)];
  return { n: valores.length, mediana: Math.round(p(0.5) * 10) / 10, p95: Math.round(p(0.95) * 10) / 10, max: Math.round(ordenados.at(-1)! * 10) / 10 };
};

async function instalarRelogio(pagina: Page) {
  await pagina.evaluate(() => {
    const janela = window as unknown as { __medidas: number[] };
    janela.__medidas = [];
    const marcar = (evento: Event) => {
      const inicio = evento.timeStamp;
      requestAnimationFrame(() => requestAnimationFrame(() => janela.__medidas.push(performance.now() - inicio)));
    };
    window.addEventListener("keydown", marcar, true);
    window.addEventListener("mouseup", marcar, true);
    window.addEventListener("focusout", marcar, true);
  });
}
const lerMedidas = (pagina: Page) => pagina.evaluate(() => { const j = window as unknown as { __medidas: number[] }; const m = j.__medidas; j.__medidas = []; return m; });

const resultado: Record<string, unknown> = { em: new Date().toISOString(), servidor: "next dev", cpu: os.cpus()[0]?.model, nucleos: os.cpus().length };

/** Grava a aula de medida no rascunho e devolve quantos lances ela tem. */
function gravarAulaDeMedida(nome: "arvore-1000" | "linha-500"): { id: string; lances: number } {
  const id = nome === "arvore-1000" ? "EX-E2E-ARVORE" : "EX-E2E-LINHA";
  const aula = comoEnsaio(nome === "arvore-1000" ? arvoreLargaV2(1000) : linhaLongaV2(500), id);
  writeFileSync(path.join(RAIZ, ".editor/v2", `${id}.json`), JSON.stringify(aula, null, 2) + "\n");
  return { id, lances: Object.keys(aula.analises[0].nos).length - 1 };
}

// Cada ensaio grava a aula que usa: sem modo serial, a abertura reprovada não impede a medida das
// interações — os números saem todos, e cada meta reprova no próprio ensaio.
for (const nome of ["arvore-1000", "linha-500"] as const) {
  test(`@desempenho abrir a ${nome}`, async ({ page }) => {
    const { id, lances } = gravarAulaDeMedida(nome);
    await page.setViewportSize({ width: 1366, height: 768 });
    const tempos: number[] = [];
    const servidor: number[] = [];
    const tela: number[] = [];
    for (let rodada = 0; rodada < 6; rodada += 1) {
      const inicio = Date.now();
      await page.goto(`/editor/v2/finais/${id}`);
      await page.waitForFunction((total) => document.querySelectorAll('ol[aria-label="Lances da análise"] > li').length >= total, lances, { timeout: 60_000 });
      // Onde o tempo foi: até a resposta do servidor terminar de chegar, e dali até o quadro pintado.
      const partes = await page.evaluate(() => new Promise<{ resposta: number; pronto: number }>((r) => requestAnimationFrame(() => requestAnimationFrame(() => {
        const navegacao = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        r({ resposta: navegacao.responseEnd, pronto: performance.now() });
      }))));
      if (rodada > 0) {
        tempos.push(Date.now() - inicio);
        servidor.push(partes.resposta);
        tela.push(partes.pronto - partes.resposta);
      }
    }
    await conferirTamanho(page, 1366, 768);
    const medida = { ...estatistica(tempos), servidor: estatistica(servidor), tela: estatistica(tela) };
    resultado[`abrir ${nome} (${lances} lances)`] = medida;
    guardarJson(`medidas-${new Date().toISOString().slice(0, 10)}-abrir-${nome}.json`, { ...resultado });
    console.log(`[e2e] abrir ${nome}: ${JSON.stringify(medida)}`);
    expect(medida.mediana).toBeLessThanOrEqual(2000);
  });
}

test("@desempenho interações na árvore de 1.000 nós", async ({ page }) => {
  gravarAulaDeMedida("arvore-1000");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/editor/v2/finais/EX-E2E-ARVORE");
  await expect(page.locator(".cg-wrap").first()).toBeVisible();
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  await page.keyboard.press("Home");
  await instalarRelogio(page);

  for (let i = 0; i < 40; i += 1) await page.keyboard.press(i % 10 < 8 ? "ArrowRight" : "ArrowDown");
  await page.waitForTimeout(300);
  resultado["navegar (40 teclas)"] = estatistica(await lerMedidas(page));

  await page.getByRole("tab", { name: /^Nota do professor/ }).click();
  const campo = page.getByRole("textbox", { name: "Nota do professor" });
  const comentarios: number[] = [];
  for (let i = 0; i < 20; i += 1) {
    await campo.click();
    await campo.fill(`Comentário de medida ${i}.`);
    await lerMedidas(page);
    await page.locator("body").click({ position: { x: 3, y: 3 } });
    await page.waitForTimeout(80);
    comentarios.push(...(await lerMedidas(page)).slice(0, 1));
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
    await lerMedidas(page);
  }
  resultado["confirmar comentário (20)"] = estatistica(comentarios);

  await lerMedidas(page);
  for (let i = 0; i < 20; i += 1) await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  resultado["Ctrl+Z (20)"] = estatistica(await lerMedidas(page));

  const desenhos: number[] = [];
  const casas = ["a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2"];
  for (let i = 0; i < 20; i += 1) {
    await lerMedidas(page);
    await desenharSeta(page, casas[i % 8], `${casas[(i + 3) % 8][0]}5`);
    await page.waitForTimeout(60);
    desenhos.push(...(await lerMedidas(page)).slice(-1));
  }
  resultado["desenhar seta (20)"] = estatistica(desenhos);

  const nome = `medidas-${new Date().toISOString().slice(0, 10)}.json`;
  guardarJson(nome, resultado);
  console.log(`[e2e] desempenho:\n${JSON.stringify(resultado, null, 2)}`);
  for (const chave of ["navegar (40 teclas)", "confirmar comentário (20)", "Ctrl+Z (20)", "desenhar seta (20)"]) {
    expect((resultado[chave] as { p95: number }).p95, chave).toBeLessThanOrEqual(100);
  }
});
