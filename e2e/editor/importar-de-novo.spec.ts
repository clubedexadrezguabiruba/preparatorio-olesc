/**
 * Importar de novo na mesma aula — os achados do teste final de 15/9/2026.
 *
 * - A recusa ao importar deixa a janela aberta, com o texto que o professor colou (§8.3); antes a janela
 *   fechava e o PGN se perdia.
 * - Um segundo PGN com título que começa por número entra: os ids não colidem mais com os da aula.
 * - A mesma partida do Lichess é recusada pelo endereço, e não por coincidência de id.
 * - `@rede`: buscar o mesmo estudo duas vezes na mesma janela lê de novo, em vez de travar em
 *   "lendo o arquivo…" e oferecer o estudo como seis jogos soltos.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { abrirImportar, criarAulaVazia } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";

const AULA = "EX-E2E-DE-NOVO";
const capitulos = () => (JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA}.json`), "utf8")) as { capitulos: unknown[] }).capitulos.length;

test.beforeEach(() => criarAulaVazia(AULA, "Importar de novo"));

test("a recusa fica na janela com o texto, e outro PGN numerado entra depois", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA}`);
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  const partida = '[Event "2017 Torneio A"]\n[Site "https://lichess.org/q7ZvsdUF"]\n\n1. e4 e5 *\n';

  let janela = await abrirImportar(page);
  await janela.getByRole("textbox", { name: /Ou cole o PGN/ }).fill(partida);
  await janela.getByRole("button", { name: "Importar 1 capítulo(s)" }).click();
  await expect(janela).toBeHidden();
  await expect(salvo).toHaveText("✓ salvo");
  expect(capitulos()).toBe(1);

  janela = await abrirImportar(page);
  const caixa = janela.getByRole("textbox", { name: /Ou cole o PGN/ });
  await caixa.fill(partida);
  await janela.getByRole("button", { name: "Importar 1 capítulo(s)" }).click();
  await expect(janela.getByRole("alert").filter({ hasText: /já ter sido importado/ })).toBeVisible();
  await expect(janela).toBeVisible();
  await expect(caixa).toHaveValue(partida);
  expect(capitulos()).toBe(1);

  await caixa.fill('[Event "2018 Torneio B"]\n\n1. d4 d5 *\n');
  await expect(janela.getByText("lendo o arquivo…")).toHaveCount(0);
  await janela.getByRole("button", { name: "Importar 1 capítulo(s)" }).click();
  await expect(janela).toBeHidden();
  await expect(salvo).toHaveText("✓ salvo");
  expect(capitulos()).toBe(2);
});

test("@rede buscar o mesmo estudo duas vezes lê de novo, e não trava", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA}`);
  const janela = await abrirImportar(page);
  await janela.getByLabel(/Endereço do Lichess/).fill("https://lichess.org/study/hf09xMzS");
  const lista = janela.getByRole("list", { name: "Capítulos do estudo" });
  for (let vez = 1; vez <= 2; vez += 1) {
    // A lista da 1ª busca continua na tela até a 2ª responder: conferir antes da resposta não provaria nada.
    const resposta = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/editor/v2/finais/${AULA}`), { timeout: 30_000 });
    await janela.getByRole("button", { name: "Buscar no Lichess" }).click();
    await resposta;
    await page.waitForTimeout(1000);
    await expect(lista.getByRole("listitem"), `na ${vez}ª busca`).toHaveCount(9, { timeout: 30_000 });
    await expect(janela.getByText("lendo o arquivo…")).toHaveCount(0);
  }
  await expect(janela.getByRole("button", { name: /^Importar \d+ capítulo/ })).toBeHidden();
});
