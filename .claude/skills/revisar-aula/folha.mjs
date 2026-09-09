/**
 * A folha de contato: as três telas da aula lado a lado, **num arquivo só**.
 *
 *   node .claude/skills/revisar-aula/folha.mjs N1-KPK [destino.png]
 *
 * Uma folha, nunca N imagens soltas. Imagem é o que mais ocupa contexto e reler
 * não acrescenta nada: quem for olhar isto abre o arquivo, ou manda um
 * subagente descrevê-lo em texto. A montagem é feita pelo próprio navegador —
 * uma página com as três capturas embutidas, fotografada de uma vez —, para não
 * precisar de biblioteca de imagem nenhuma.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { cookiesDeEnsaio, lerEnv } from "./sessao.mjs";

const AULA = process.argv[2] ?? "N1-KPK";
const DESTINO = process.argv[3] ?? path.join(process.cwd(), `folha-${AULA}.png`);
const BASE = process.env.BASE_DA_REVISAO ?? "http://localhost:3000";
const USUARIO = process.env.USUARIO_DE_ENSAIO ?? "alunoteste";

const cookies = await cookiesDeEnsaio(lerEnv(".env.local"), USUARIO);
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } });
await ctx.addCookies(cookies);
const pg = await ctx.newPage();
await pg.goto(`${BASE}/finais/${AULA}`, { waitUntil: "networkidle" });
await pg.waitForSelector("cg-board piece");

const irParaAba = async (nome) => {
  const abas = pg.locator("nav[aria-label] button");
  for (let i = 0; i < (await abas.count()); i += 1) {
    if (((await abas.nth(i).textContent()) ?? "").includes(nome)) {
      await abas.nth(i).click();
      await pg.waitForTimeout(700);
      return;
    }
  }
};

const telas = [];
// A aula assistida no meio do roteiro, e não no primeiro quadro: é ali que ela
// mostra o que mudou — peça andada, seta, e o professor falando.
await pg.waitForTimeout(14000);
telas.push({ titulo: "1. Aula (assistida, ~14 s)", png: (await pg.screenshot()).toString("base64") });

await irParaAba("Treino");
telas.push({ titulo: "2. Treino (flecha sem clique, dica como fala)", png: (await pg.screenshot()).toString("base64") });

await irParaAba("Valendo");
await pg.waitForTimeout(2500);
telas.push({ titulo: "3. Valendo (nua: sem seta, sem casa acesa)", png: (await pg.screenshot()).toString("base64") });

const folha = await ctx.newPage();
await folha.setViewportSize({ width: 3 * 1366 + 4 * 24, height: 768 + 96 });
await folha.setContent(`
  <style>
    body { margin: 0; background: #1a1a1a; font: 20px/1.3 system-ui, sans-serif; color: #eee; }
    .fila { display: flex; gap: 24px; padding: 24px; }
    figure { margin: 0; }
    figcaption { padding: 0 0 10px; }
    img { display: block; border: 1px solid #444; }
  </style>
  <div class="fila">
    ${telas
      .map(
        (t) =>
          `<figure><figcaption>${t.titulo}</figcaption><img src="data:image/png;base64,${t.png}"></figure>`,
      )
      .join("")}
  </div>
`);
await folha.waitForTimeout(600);
writeFileSync(DESTINO, await folha.screenshot({ fullPage: true }));
console.log(`folha de contato: ${DESTINO}`);
await nav.close();
