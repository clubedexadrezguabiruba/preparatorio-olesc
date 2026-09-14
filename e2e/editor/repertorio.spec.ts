/**
 * O modo abertura (repertório) pelo editor — fatia 10, parada 10G (§21).
 *
 * Abre um PGN do repertório, comenta o fim da linha (o rascunho nasce), desfaz, vira a vista com `x` e
 * descarta o rascunho. "Aplicar" não é exercitado aqui: a aplicação real tem ensaio próprio desde a 8F e
 * mexeria no publicado. Prova que nada publicado mudou: os 11 PGN e o
 * compilado ficam byte a byte iguais (a limpeza do ensaio confere por SHA-256) e o `--check` do
 * repertório dá o mesmo resultado antes e depois.
 *
 * Usa a `pretas-colle.pgn`: em 15/9 outra sessão estava editando outros arquivos do repertório.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { tabuleiro } from "../preparo/tabuleiro.ts";

const ARQUIVO = "pretas-colle";
const rascunho = path.join(RAIZ, ".editor/repertorio", `${ARQUIVO}.pgn`);
const conferirCompilado = () => {
  try {
    return execFileSync(process.execPath, ["scripts/compilar-repertorio.ts", "--check"], { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\n").slice(-4).join("\n");
  } catch (erro) {
    return `falhou: ${(erro as { stdout?: string }).stdout?.split("\n").slice(-4).join("\n")}`;
  }
};

test("jogar, comentar, desfazer, ver o impacto e descartar, sem mudar o publicado", async ({ page }) => {
  test.skip(existsSync(rascunho), "já existe um rascunho desta abertura — não é do ensaio, e o ensaio não mexe nele");
  const antes = conferirCompilado();
  await page.goto(`/editor/repertorio/${ARQUIVO}`);
  await expect(tabuleiro(page)).toBeVisible();
  const estado = page.getByRole("status").first();

  // Um lance nosso na posição inicial da linha: nasce linha nova ou alternativa.
  await page.getByRole("button", { name: "Posição inicial", exact: true }).click();
  const lances = page.getByRole("list", { name: "Lances da análise" });
  await lances.getByRole("button").first().click();
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  await page.keyboard.press("End");
  const comentario = page.getByLabel("Comentário");
  await comentario.fill("Comentário de ensaio — será desfeito.");
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  await expect(estado).toContainText("rascunho", { timeout: 15_000 });
  expect(existsSync(rascunho)).toBe(true);

  await page.keyboard.press("Control+z");
  await expect(comentario).not.toHaveValue("Comentário de ensaio — será desfeito.");

  // x vira a vista também aqui (tabela de atalhos).
  await page.keyboard.press("x");
  await expect.poll(() => tabuleiro(page).getAttribute("class")).toContain("orientation-");

  // Descartar o rascunho devolve o arquivo ao publicado.
  page.once("dialog", (d) => void d.accept());
  const descartar = page.getByRole("button", { name: "Descartar rascunho" });
  if (await descartar.isVisible()) await descartar.click();
  await expect.poll(() => existsSync(rascunho), { timeout: 15_000 }).toBe(false);
  expect(conferirCompilado()).toBe(antes);
});
