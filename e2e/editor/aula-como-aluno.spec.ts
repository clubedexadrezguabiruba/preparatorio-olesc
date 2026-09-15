/**
 * "Fazer a aula inteira como aluno" — pedido do Doug no teste humano de 14/9/2026.
 *
 * Número da parada: a aula do rascunho (o estudo importado, sem publicar) abre no player do aluno com
 * as 8 etapas; o treino 04 é jogado até o fim; o resumo mostra o tempo de cada etapa e o treino
 * "concluída · 1.ª tentativa"; "Continuar de onde parei" volta à mesma etapa; e **nenhuma tentativa**
 * chega ao banco. Depois, Publicar pergunta antes; "Publicar sem fazer" leva ao impacto.
 */
import { Chess } from "chess.js";
import { criarAulaVazia, FIXTURE_DO_ESTUDO, maisAcoes, abrirImportar } from "../preparo/aulas.ts";
import { PROFESSOR, tentativasDoAluno } from "../preparo/contas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { jogarEsperarResposta } from "../preparo/partida.ts";
import { jogar } from "../preparo/tabuleiro.ts";

const AULA = "EX-E2E-COMO-ALUNO";
test.setTimeout(300_000);

test.beforeEach(() => criarAulaVazia(AULA, "Mate de Dama e Rei (como aluno)"));

test("fazer a aula inteira como aluno: player do aluno, tempo por etapa, e nada no banco", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA}`);
  await abrirImportar(page);
  const importar = page.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
  await importar.locator('input[type="file"]').setInputFiles(FIXTURE_DO_ESTUDO);
  await importar.getByRole("checkbox", { name: /são meus, ou tenho direito/ }).check();
  await importar.getByRole("button", { name: "Importar o estudo" }).click();
  await expect(importar).toBeHidden({ timeout: 30_000 });

  // Conferir e Publicar: a pergunta aparece, porque esta versão ainda não foi feita como aluno.
  const salvo = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(salvo).toHaveText("✓ salvo");
  await maisAcoes(page, /Conferir sem publicar/);
  await expect(page.getByRole("region", { name: "Resultado da conferência" })).toContainText("Pode publicar", { timeout: 60_000 });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const pergunta = page.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" });
  await expect(pergunta.getByRole("button", { name: "Publicar sem fazer" })).toBeVisible();
  await pergunta.getByRole("button", { name: "Fazer a aula inteira" }).click();
  const tela = page.getByRole("dialog", { name: "Fazer a aula inteira como aluno" });
  await expect(tela.getByText(/Etapa 1 de 8/)).toBeVisible({ timeout: 30_000 });
  await expect(tela.getByText(/⏱ \d+:\d\d/)).toBeVisible({ timeout: 5_000 });

  // Decisão do Doug (14/9/2026): a aula v2 não tem marca automática — o corte roxo (`paleRed`) e o aro da
  // peça atacada, que o player antigo deduzia da posição. Só o que o professor desenhou aparece.
  const trilha = tela.getByRole("navigation", { name: "Etapas da aula" });
  const marcasAutomaticas = () => tela.locator('.cg-wrap svg g[cgHash$=",paleRed"]').count();
  await trilha.getByRole("button").nth(1).click();
  await expect(tela.getByText(/Etapa 2 de 8/)).toBeVisible();
  await page.waitForTimeout(2500);
  expect(await marcasAutomaticas(), "corte roxo no capítulo").toBe(0);

  // Treino 04, a quarta etapa: Dd5, (Rf6), De4 — jogado no tabuleiro do aluno.
  await trilha.getByRole("button").nth(3).click();
  await expect(tela.getByText(/Etapa 4 de 8/)).toBeVisible();
  const tabuleiro = tela.locator(".cg-wrap").first();
  await expect(tabuleiro).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await marcasAutomaticas(), "corte roxo no treino").toBe(0);
  const jogo = new Chess("8/4k3/8/8/2KQ4/8/8/8 w - - 25 13");
  expect(await jogarEsperarResposta(page, tabuleiro, jogo, "d4d5")).toBe("e7f6");
  await jogar(page, "d5e4", tabuleiro);
  await page.waitForTimeout(1500);

  // x vira o tabuleiro também aqui, por cima do editor.
  await tela.getByText(/Etapa 4 de 8/).click();
  await page.keyboard.press("x");
  await expect(tela.getByRole("status").filter({ hasText: "Tabuleiro virado" })).toBeAttached();

  // Esc leva ao resumo, e não direto ao editor.
  await page.keyboard.press("Escape");
  const resumo = tela.getByRole("region", { name: /Aula (concluída|interrompida)/ });
  await expect(resumo).toBeVisible();
  await expect(resumo.getByRole("row")).toHaveCount(8 + 2); // cabeçalho, 8 etapas, total
  await expect(resumo.getByRole("row").nth(4)).toContainText("concluída · 1.ª tentativa");
  await expect(resumo.getByRole("row").nth(1)).toContainText(/\d+:\d\d\s*vista/);
  await expect(resumo.getByRole("row").nth(8)).toContainText("não aberta");
  await expect(resumo).toContainText("Aula interrompida");

  await resumo.getByRole("button", { name: "Continuar de onde parei" }).click();
  await expect(tela.getByText(/Etapa 4 de 8/)).toBeVisible();
  await tela.getByRole("button", { name: "← Sair da aula" }).click();

  // Nada no banco: nem para o professor que fez a aula.
  await page.waitForTimeout(2000);
  expect(await tentativasDoAluno(AULA, PROFESSOR)).toEqual([]);

  // Do resumo, "Publicar agora" leva ao impacto; cancelado, o Publicar da mesma versão não pergunta de novo.
  await tela.getByRole("button", { name: "Publicar agora" }).click();
  const impacto = page.getByRole("dialog", { name: "Publicar a aula" });
  await expect(impacto).toBeVisible();
  await expect(tela).toBeHidden();
  await impacto.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(impacto).toBeVisible();
  await expect(pergunta).toHaveCount(0);
  await impacto.getByRole("button", { name: "Cancelar" }).click();
});
