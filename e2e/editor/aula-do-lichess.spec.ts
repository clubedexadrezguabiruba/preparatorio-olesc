/**
 * O estudo do Doug importado, publicado e feito pelo aluno — fatia 10, parada 10G.
 *
 * Importa `lichess-mate-dama-hf09xMzS.pgn` (exportação de 14/9/2026) na aula `EX-E2E-LICHESS`,
 * confere, publica, e o aluno de teste faz as etapas: a introdução, os capítulos, os quatro treinos (com
 * o erro do afogamento no 06, `Qg7+` e `Qh4#` no 07) e a prática contra o computador até o mate, com os
 * lances do aluno escolhidos pelo Stockfish em Node. No fim, as tentativas no banco com a publicação.
 */
import { Chess } from "chess.js";
import { abrirAulaPublicada, criarAulaVazia, FIXTURE_DO_ESTUDO } from "../preparo/aulas.ts";
import { tentativasDoAluno } from "../preparo/contas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { jogarEsperarResposta, jogarPraticaComMotor } from "../preparo/partida.ts";
import { jogar } from "../preparo/tabuleiro.ts";

const AULA = "EX-E2E-LICHESS";
test.setTimeout(600_000);
test.describe.configure({ mode: "serial" });

test.beforeAll(() => criarAulaVazia(AULA, "Mate de Dama e Rei (do Lichess)"));

test("importar, conferir e publicar o estudo", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA}`);
  await page.getByRole("button", { name: "Importar PGN" }).click();
  const janela = page.getByRole("dialog", { name: "Importar PGN" });
  await janela.locator('input[type="file"]').setInputFiles(FIXTURE_DO_ESTUDO);
  await janela.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await janela.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(janela).toBeHidden({ timeout: 30_000 });

  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
  await page.getByRole("button", { name: "Conferir" }).click();
  await expect(page.getByRole("region", { name: "Resultado da conferência" })).toContainText("Pode publicar", { timeout: 60_000 });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const publicar = page.getByRole("dialog", { name: "Publicar a aula" });
  await expect(publicar).toContainText(/primeira publicação|Aula extra/);
  await publicar.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Publicada neste computador" })).toBeVisible({ timeout: 60_000 });
});

test("o aluno faz a aula inteira, e as tentativas chegam ao banco", async ({ aluno }) => {
  await aluno.setViewportSize({ width: 1366, height: 768 });
  await abrirAulaPublicada(aluno, AULA);
  await expect(aluno.getByText(/Etapa 1 de 8/)).toBeVisible();
  const trilha = aluno.getByRole("navigation", { name: "Etapas da aula" });
  const tabuleiro = () => aluno.locator(".cg-wrap").first();
  const irPara = async (indice: number) => {
    await trilha.getByRole("button").nth(indice).click();
    await expect(aluno.getByText(new RegExp(`Etapa ${indice + 1} de 8`))).toBeVisible();
    await expect(tabuleiro()).toBeVisible();
    await aluno.waitForTimeout(1200);
  };

  // Introdução: dois quadros, ← e →.
  await expect(aluno.getByText(/Nesta aula, você vai aprender/).last()).toBeVisible();
  await expect(aluno.getByText("Quadro 1 de 2")).toBeAttached();
  await aluno.locator("body").click({ position: { x: 3, y: 3 } });
  await aluno.keyboard.press("ArrowRight");
  await expect(aluno.getByText("Quadro 2 de 2")).toBeAttached();

  // Capítulos: abrem com o título.
  await irPara(1);
  await expect(aluno.getByRole("heading", { name: "AULA EXPLICADA - O L e a caixa" })).toBeVisible();
  await irPara(2);

  // Treino 04: Dd5, (Rf6), De4.
  await irPara(3);
  let jogo = new Chess("8/4k3/8/8/2KQ4/8/8/8 w - - 25 13");
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "d4d5")).toBe("e7f6");
  await jogar(aluno, "d5e4", tabuleiro());
  await aluno.waitForTimeout(1500);

  // Treino 05: Df5, (Rh6), Dg4.
  await irPara(4);
  jogo = new Chess("8/6k1/8/3K4/5Q2/8/8/8 w - - 25 13");
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "f4f5")).toBe("g7h6");
  await jogar(aluno, "f5g4", tabuleiro());
  await aluno.waitForTimeout(1500);

  // Treino 06: Dg5, (Rh8); Dg6?? afoga — o erro nomeado com a mensagem, e o tabuleiro volta; Re5, (Rh7), Rf6, (Rh8), Dg7#.
  await irPara(5);
  jogo = new Chess("8/7k/8/8/3K1Q2/8/8/8 w - - 25 13");
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "f4g5")).toBe("h7h8");
  await jogar(aluno, "g5g6", tabuleiro());
  await expect(aluno.getByText(/Afogamento/).first()).toBeVisible();
  await aluno.waitForTimeout(1500);
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "d4e5")).toBe("h8h7");
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "e5f6")).toBe("h7h8");
  await jogar(aluno, "g5g7", tabuleiro());
  await aluno.waitForTimeout(1500);

  // Treino 07: Re5, (Rh7), Rf6, (Rh6); Dg7+ é o erro "tente de novo"; Dh4# é aceito.
  await irPara(6);
  jogo = new Chess("8/8/7k/8/3K2Q1/8/8/8 w - - 25 13");
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "d4e5")).toBe("h6h7");
  expect(await jogarEsperarResposta(aluno, tabuleiro(), jogo, "e5f6")).toBe("h7h6");
  await jogar(aluno, "g4g7", tabuleiro());
  await expect(aluno.getByText(/tente de novo/i).first()).toBeVisible();
  await aluno.waitForTimeout(1500);
  await jogar(aluno, "g4h4", tabuleiro());
  await expect(aluno.getByText(/Parabéns/).first()).toBeVisible();
  await aluno.waitForTimeout(1500);

  // Prática: contra o computador, até o mate.
  await irPara(7);
  await aluno.waitForTimeout(4000);
  const partida = await jogarPraticaComMotor(aluno, tabuleiro(), "8/8/8/8/4k3/8/8/3QK3 w - - 0 1");
  console.log(`[e2e] prática do estudo: ${partida.fim} em ${partida.lances.length} meios-lances — ${partida.lances.join(" ")}`);
  expect(partida.fim).toBe("mate");
  await aluno.waitForTimeout(3000);

  // No banco: uma linha por treino (e a prática), todas com a publicação.
  await expect.poll(async () => (await tentativasDoAluno(AULA)).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(5);
  const linhas = await tentativasDoAluno(AULA);
  console.log(`[e2e] tentativas no banco: ${JSON.stringify(linhas.map((l) => ({ etapa: l.etapa, sucesso: l.sucesso, publication_id: l.publication_id })))}`);
  expect(linhas.every((l) => l.publication_id?.startsWith("pub-"))).toBe(true);
  expect(linhas.filter((l) => l.etapa === "treino").length).toBeGreaterThanOrEqual(4);
  expect(linhas.some((l) => l.etapa === "pratica" && l.sucesso)).toBe(true);
});
