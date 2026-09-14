/**
 * As réguas de tela da fatia 10, iguais em toda parada para os números serem comparáveis.
 *
 * - `larguraDaPagina`: quanto a página passa da janela para o lado (a dívida dos 600 px a 375).
 * - `violacoesDoAxe`: o axe-core injetado na página, contando só as violações **sérias** e
 *   **críticas** (a régua do plano: "axe sem violação séria").
 * - `lancesInteirosVisiveis`: quantos lances da lista cabem inteiros dentro da área que rola.
 * - `botoesCobertos`: botão visível cujo centro, pelo `elementFromPoint`, é de outro elemento. A
 *   medida recorta cada botão pelos ancestrais com rolagem e ignora `<details>` fechado — as duas
 *   armadilhas que a parada 9D registrou.
 */
import { createRequire } from "node:module";
import type { Page } from "@playwright/test";

const require = createRequire(import.meta.url);
const CAMINHO_DO_AXE = require.resolve("axe-core/axe.min.js");

export async function larguraDaPagina(pagina: Page): Promise<{ janela: number; conteudo: number; transborda: number }> {
  return pagina.evaluate(() => {
    const conteudo = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return { janela: innerWidth, conteudo, transborda: Math.max(0, conteudo - innerWidth) };
  });
}

/** Os elementos mais largos que a janela — é por eles que se acha a causa de uma rolagem lateral. */
export async function culpadosDaLargura(pagina: Page, limite = 5): Promise<Array<{ elemento: string; direita: number }>> {
  return pagina.evaluate((max) => {
    const largura = innerWidth;
    const achados: Array<{ elemento: string; direita: number }> = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const caixa = el.getBoundingClientRect();
      if (caixa.right <= largura + 1 || caixa.width === 0) continue;
      // Só o mais externo de cada galho: o filho de quem já transborda repete o mesmo culpado.
      const pai = el.parentElement?.getBoundingClientRect();
      if (pai && pai.right > largura + 1) continue;
      const nome = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + (el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 4).join(".")}` : "");
      achados.push({ elemento: nome, direita: Math.round(caixa.right) });
    }
    return achados.sort((a, b) => b.direita - a.direita).slice(0, max);
  }, limite);
}

export type Violacao = { id: string; impacto: string; alvos: string[]; ajuda: string };

export async function violacoesDoAxe(pagina: Page, contexto?: string): Promise<Violacao[]> {
  const temAxe = await pagina.evaluate(() => "axe" in window);
  if (!temAxe) await pagina.addScriptTag({ path: CAMINHO_DO_AXE });
  const resultado = await pagina.evaluate(async (seletor) => {
    const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null; help: string; nodes: Array<{ target: string[] }> }> }> } }).axe;
    const alvo = seletor ? document.querySelector(seletor) ?? document : document;
    const r = await axe.run(alvo, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impacto: v.impact ?? "?", ajuda: v.help, alvos: v.nodes.slice(0, 5).map((n) => n.target.join(" ")) }));
  }, contexto ?? null);
  return resultado.filter((v) => v.impacto === "serious" || v.impacto === "critical");
}

export async function lancesInteirosVisiveis(pagina: Page): Promise<{ lista: number; inteiros: number; total: number }> {
  return pagina.evaluate(() => {
    const lista = document.querySelector<HTMLElement>('ol[aria-label="Lances da análise"]');
    if (!lista) return { lista: 0, inteiros: 0, total: 0 };
    const caixa = lista.getBoundingClientRect();
    // A área útil é a interseção da lista com a janela: lista maior que a tela não conta lance fora dela.
    const topo = Math.max(caixa.top, 0);
    const base = Math.min(caixa.bottom, innerHeight);
    const botoes = Array.from(lista.querySelectorAll<HTMLElement>("li > button:first-of-type"))
      .filter((b, i, todos) => todos.indexOf(b) === i && b.getBoundingClientRect().height > 0);
    const inteiros = botoes.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= topo - 0.5 && r.bottom <= base + 0.5;
    }).length;
    return { lista: Math.round(base - topo), inteiros, total: botoes.length };
  });
}

export async function botoesCobertos(pagina: Page): Promise<{ visiveis: number; cobertos: string[] }> {
  return pagina.evaluate(() => {
    const cobertos: string[] = [];
    let visiveis = 0;
    const rolagens = (el: HTMLElement) => {
      const lista: DOMRect[] = [];
      for (let p = el.parentElement; p; p = p.parentElement) {
        const estilo = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(estilo.overflowY + estilo.overflowX)) lista.push(p.getBoundingClientRect());
      }
      return lista;
    };
    for (const botao of Array.from(document.querySelectorAll<HTMLElement>("button, a[href], [role=button], input, select, textarea"))) {
      if (botao.closest("details:not([open])")) continue;
      const r = botao.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      let x0 = Math.max(r.left, 0), x1 = Math.min(r.right, innerWidth), y0 = Math.max(r.top, 0), y1 = Math.min(r.bottom, innerHeight);
      for (const c of rolagens(botao)) { x0 = Math.max(x0, c.left); x1 = Math.min(x1, c.right); y0 = Math.max(y0, c.top); y1 = Math.min(y1, c.bottom); }
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      visiveis++;
      const topo = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
      if (topo && (topo === botao || botao.contains(topo) || topo.contains(botao))) continue;
      const nome = (botao.getAttribute("aria-label") ?? botao.textContent ?? botao.tagName).trim().slice(0, 40);
      cobertos.push(`${nome} ← ${topo ? topo.tagName.toLowerCase() : "nada"}`);
    }
    return { visiveis, cobertos };
  });
}
