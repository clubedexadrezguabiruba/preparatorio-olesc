/**
 * O ensaio curto da parada 10A: a estrutura inteira funciona de ponta a ponta?
 *
 * Professor entra no editor com a sessão guardada, abre a aula base `EX-E2E-BASE`, joga um lance
 * novo **por clique no tabuleiro** (evento confiável), vê o autosave gravar, desfaz com Ctrl+Z e vê
 * o documento voltar. O aluno abre o painel na sessão dele. Nenhum erro de console nas duas.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { AULA_BASE } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { jogar } from "../preparo/tabuleiro.ts";

type AulaCrua = { analises: Array<{ inicio: { positionId: string }; raizId: string; nos: Record<string, { uci?: string; filhos: string[] }> }> };

function lanceNovoDaRaiz(): string {
  const aula = JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as AulaCrua;
  const analise = aula.analises[0];
  const pacote = JSON.parse(readFileSync(path.join(RAIZ, "content/fixtures/aulas-v2/EX-FIXTURE-V2/publicacoes/pub-55947670bbcd7bd0.json"), "utf8")) as { posicoes: Record<string, { fen: string }> };
  const jogo = new Chess(pacote.posicoes[analise.inicio.positionId].fen);
  const existentes = new Set(analise.nos[analise.raizId].filhos.map((id) => analise.nos[id].uci));
  const lance = jogo.moves({ verbose: true }).find((m) => !existentes.has(m.from + m.to) && !m.promotion);
  if (!lance) throw new Error("a posição da aula base não tem lance novo");
  return lance.from + lance.to;
}

test("professor edita a aula base e desfaz; aluno abre o painel", async ({ page, aluno }) => {
  await page.goto("/editor");
  await expect(page.getByText("Ensaio automático — aula base").first()).toBeVisible();

  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await expect(page.getByRole("textbox", { name: "Título da aula" })).toHaveValue("Ensaio automático — aula base");
  const estado = page.locator("header span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ });
  await expect(estado).toHaveText("✓ salvo");
  const antes = readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8");

  await page.getByRole("button", { name: "Posição inicial", exact: true }).click();
  const uci = lanceNovoDaRaiz();
  await jogar(page, uci);
  // O "✓ salvo" de antes do lance ainda está na tela por alguns milissegundos (o autosave espera
  // 600 ms); o que prova a gravação é o arquivo, e só depois dele o rótulo.
  await expect.poll(() => readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")).toContain(`"uci": "${uci}"`);
  await expect(estado).toHaveText("✓ salvo");
  expect(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")).not.toBe(antes);

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");
  await expect(estado).toHaveText("✓ salvo");
  await expect.poll(() => readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")).not.toContain(`"uci": "${uci}"`);

  await aluno.goto("/painel");
  await expect(aluno).toHaveURL(/\/painel/);
});
