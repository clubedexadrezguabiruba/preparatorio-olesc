/**
 * A prática pela tela — fatia 10, parada 10C (§17.1).
 *
 * Desde 15/9/2026 (trava 9) a prática é opcional: a aula de ensaio sem prática confere sem acusar nada
 * sobre prática (**0**), a lista diz "Opcional", e a prática criada pela janela — com a posição de um
 * capítulo adicionada ao acervo, o resultado declarado pelo professor — entra, e o botão continua lá.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { maisAcoes } from "../preparo/aulas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { jogar } from "../preparo/tabuleiro.ts";

const FEN_DA_PRATICA = "8/8/8/8/4k3/8/8/3QK3 w - - 0 1";
const arquivo = () => JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as { praticas: Array<{ id: string; titulo: string; positionId: string; engine: { skill: number } }>; fluxo: Array<{ tipo: string }> };

test.beforeEach(() => criarAulaBase());

test("editar avisa a versão nova; excluir → Conferir não acusa (trava 9); criar pela janela com posição nova no acervo", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });

  // 1. Editar: o título não muda a avaliação; a força do computador muda, e a janela diz antes de salvar.
  await page.getByRole("button", { name: /Prática contra o computador/ }).first().click();
  const janela = page.getByRole("dialog", { name: "Prática contra o computador" });
  await janela.getByLabel("Título").fill("Vença sem afogar");
  await expect(janela.getByText(/nova versão da avaliação/)).toHaveCount(0);
  await janela.getByLabel("Nível do computador (0 a 20)").fill("10");
  await expect(janela.getByRole("status").filter({ hasText: /Mudar adversário cria uma nova versão da avaliação/ })).toBeVisible();
  await janela.getByLabel("Nível do computador (0 a 20)").fill("20");
  await janela.getByRole("button", { name: "Salvar prática" }).click();
  await expect.poll(() => arquivo().praticas[0]?.titulo).toBe("Vença sem afogar");

  // 2. Excluir, com a confirmação do navegador.
  await page.getByRole("button", { name: /Vença sem afogar/ }).first().click();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("dialog", { name: "Prática contra o computador" }).getByRole("button", { name: "Excluir prática…" }).click();
  await expect.poll(() => arquivo().praticas.length).toBe(0);
  await expect(salvo).toHaveText("✓ salvo");

  // 3. Conferir: a aula sem prática não é mais acusada (trava 9, 15/9/2026), e a lista diz que é opcional.
  await maisAcoes(page, /Conferir sem publicar/);
  const resultado = page.getByRole("region", { name: "Resultado da conferência" });
  await expect(resultado).toBeVisible();
  await expect(resultado.getByRole("listitem").filter({ hasText: /não tem prática contra o computador/i })).toHaveCount(0);
  await expect(page.getByText(/Opcional\. Sem prática, o aluno fecha a aula marcando que assistiu/)).toBeVisible();

  // 4. Capítulo com a posição da prática livre do estudo, com a origem registrada.
  await page.getByRole("button", { name: "+ Adicionar capítulo" }).click();
  const novo = page.getByRole("dialog", { name: "Adicionar capítulo" });
  await novo.getByLabel("Nome do capítulo").fill("Prática livre — K+D×R");
  await novo.getByRole("button", { name: /Colar código da posição/ }).click();
  await novo.getByLabel("FEN da posição").fill(FEN_DA_PRATICA);
  await novo.getByRole("button", { name: "Criar capítulo" }).click();
  // Com a conferência aberta e só avisos, a lista começa fechada (revisão de experiência de 14/9); desde a
  // trava 7 a origem que falta é aviso, então é preciso abrir a lista para achar o "Resolver".
  const regiao = page.getByRole("region", { name: /Problemas desta aula|Resultado da conferência/ });
  const resolverOrigem = regiao.getByRole("listitem").filter({ hasText: /falta dizer de onde veio/i }).getByRole("button", { name: "Resolver" });
  await expect(async () => {
    const verLista = regiao.getByRole("button", { name: /Ver lista/ });
    if (await verLista.isVisible()) await verLista.click();
    await expect(resolverOrigem).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await resolverOrigem.click();
  const origem = page.getByRole("dialog", { name: "De onde veio esta posição?" });
  await origem.getByRole("radio", { name: /Autoria própria/ }).check();
  await origem.getByRole("button", { name: "Registrar revisão" }).click();

  // 5. "+ Criar prática" abre a prática nova; a posição vem do capítulo.
  await page.getByRole("button", { name: "+ Criar prática" }).click();
  const pratica = page.getByRole("dialog", { name: "Nova prática contra o computador" });
  await pratica.getByLabel("Título").fill("Vença sem afogar");
  await pratica.getByRole("button", { name: /De um capítulo desta aula/ }).click();
  await pratica.getByLabel("Capítulo").selectOption({ label: "Prática livre — K+D×R" });
  await expect(pratica.getByText(/Origem já registrada no capítulo: Autoria própria/)).toBeVisible();
  // O resultado é do professor (trava 2): escolhido antes de adicionar, sem consulta a tablebase.
  await pratica.getByLabel(/Resultado da posição/).selectOption({ label: "brancas ganham" });
  await pratica.getByRole("button", { name: "Adicionar ao acervo e usar" }).click();
  // A mesma FEN já no acervo (a importação do estudo, na mesma rodada) é reaproveitada, e não duplicada.
  const escolhida = pratica.getByText(/✓ pos-ex-[a-z0-9-]+-\d+ ·/); // ou a do acervo real com a mesma FEN (a do Doug, 14/9/2026)
  await expect(escolhida).toBeVisible();
  const positionId = ((await escolhida.textContent()) ?? "").match(/pos-ex-[a-z0-9-]+-\d+/)![0];
  expect(existsSync(path.join(RAIZ, `content/positions/EX/${positionId}.json`))).toBe(true);

  // 6. Jogar na prévia: o computador responde, e nada é gravado.
  await pratica.getByRole("button", { name: "⏵ Jogar na prévia" }).click();
  const previa = page.getByRole("dialog", { name: "Jogar a prática: Vença sem afogar" });
  await expect(previa).toBeVisible();
  const tabuleiroDaPrevia = previa.locator(".cg-wrap").first();
  await expect(tabuleiroDaPrevia).toBeVisible();
  // O motor carrega antes de o tabuleiro aceitar lance; o rei preto sai de e4 quando ele responde.
  const reiPretoEmE4 = () => page.evaluate(() => {
    const wrap = document.querySelector('[role="dialog"][aria-label^="Jogar a prática"] .cg-wrap');
    return Array.from(wrap?.querySelectorAll("piece.black.king") ?? []).map((p) => (p as HTMLElement).style.transform);
  });
  const antes = await reiPretoEmE4();
  await expect.poll(async () => { await jogar(page, "d1d4", tabuleiroDaPrevia); return JSON.stringify(await reiPretoEmE4()); }, { timeout: 60_000, intervals: [2000] }).not.toBe(JSON.stringify(antes));
  await previa.getByRole("button", { name: "Fechar prévia" }).click();

  await pratica.getByRole("button", { name: "Criar prática" }).click();
  await expect.poll(() => arquivo().praticas.map((p) => p.positionId)).toEqual([positionId]);
  expect(arquivo().fluxo.at(-1)?.tipo).toBe("pratica");
  await expect(salvo).toHaveText("✓ salvo");

  // 7. Com uma prática, o botão de criar outra continua (trava 9: nenhuma, uma ou várias).
  await expect(page.getByRole("button", { name: "+ Criar prática" })).toBeVisible();
});
