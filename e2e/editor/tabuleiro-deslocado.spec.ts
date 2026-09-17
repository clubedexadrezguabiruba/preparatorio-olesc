/**
 * O tabuleiro que muda de lugar na página sem rolagem — defeito achado na parada 10G.
 *
 * O chessground guarda o retângulo do tabuleiro (`state.dom.bounds`) e só o recalcula em rolagem,
 * redimensionamento da janela ou mudança de tamanho do próprio tabuleiro. Quando algo **acima** dele
 * muda de altura — o aviso de proveniência que some depois de "Registrar revisão", a lista de
 * problemas que cresce —, o tabuleiro desce ou sobe na tela e o clique continua sendo convertido em
 * casa pelo retângulo antigo: cai na casa errada, e o lance não entra. Pega o professor com o mouse
 * do mesmo jeito que pegou o ensaio da aula do zero.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { AULA_BASE, criarAulaBase } from "../preparo/global-setup.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { centroDaCasa, jogar, tabuleiro } from "../preparo/tabuleiro.ts";

type AulaCrua = { analises: Array<{ inicio: { positionId: string }; raizId: string; nos: Record<string, { uci?: string; filhos: string[] }> }> };

function lanceNovoDaRaiz(): string {
  const aula = JSON.parse(readFileSync(path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`), "utf8")) as AulaCrua;
  const analise = aula.analises[0];
  // A publicação ativa, e não um id escrito à mão: a fixture é republicada quando as regras mudam.
  const pasta = path.join(RAIZ, "content/fixtures/aulas-v2/EX-FIXTURE-V2");
  const { publicationId } = JSON.parse(readFileSync(path.join(pasta, "ativa.json"), "utf8")) as { publicationId: string };
  const pacote = JSON.parse(readFileSync(path.join(pasta, "publicacoes", `${publicationId}.json`), "utf8")) as { posicoes: Record<string, { fen: string }> };
  const jogo = new Chess(pacote.posicoes[analise.inicio.positionId].fen);
  const existentes = new Set(analise.nos[analise.raizId].filhos.map((id) => analise.nos[id].uci));
  const lance = jogo.moves({ verbose: true }).find((m) => !existentes.has(m.from + m.to) && !m.promotion);
  if (!lance) throw new Error("a posição da aula base não tem lance novo");
  return lance.from + lance.to;
}

test.beforeEach(() => criarAulaBase());

test("o lance entra depois que o conteúdo acima do tabuleiro muda de altura", async ({ page }) => {
  await page.goto(`/editor/v2/finais/${AULA_BASE}`);
  await page.getByRole("button", { name: "Posição inicial", exact: true }).click();
  const lances = page.getByRole("list", { name: "Lances da análise" }).getByRole("listitem");
  const antes = await lances.count();
  const alvo = tabuleiro(page);
  const topoAntes = (await alvo.boundingBox())!.y;

  // As colunas descem 60 px sem mudar de tamanho e sem rolagem — o mesmo que um aviso acima delas
  // aparecendo ou sumindo, sem o aperto de altura que o layout de tela cheia faria.
  await page.evaluate(() => {
    const colunas = document.querySelector<HTMLElement>("main > div.grid");
    if (colunas) colunas.style.transform = "translateY(60px)";
  });
  await expect.poll(async () => Math.round((await alvo.boundingBox())!.y - topoAntes)).toBe(60);
  const de = await centroDaCasa(alvo, lanceNovoDaRaiz().slice(0, 2));
  const noPonto = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, de);
  expect(noPonto?.toLowerCase()).toBe("cg-board");

  await jogar(page, lanceNovoDaRaiz(), alvo);
  await expect(lances).toHaveCount(antes + 1, { timeout: 5000 });
});
