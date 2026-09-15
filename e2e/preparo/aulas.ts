/** As aulas de ensaio: as que nascem vazias no disco (sem passar por "Nova aula") e a abertura da publicada. */
import type { Page } from "@playwright/test";
import { utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./protecao.ts";

export const FIXTURE_DO_ESTUDO = path.join(RAIZ, "e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn");

export function criarAulaVazia(id: string, titulo: string) {
  writeFileSync(path.join(RAIZ, ".editor/v2", `${id}.json`), JSON.stringify({
    schemaVersion: 2, id, titulo,
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  }, null, 2) + "\n");
}

/**
 * `/finais/[aula]` tem `dynamicParams = false`, e o `next dev` guarda a lista de aulas da primeira vez
 * que compilou a rota: a aula publicada depois dá 404 até a rota recompilar. Tocar a data do arquivo (sem
 * mudar um byte) faz o `dev` recompilar. No site isto não existe — a lista sai do build.
 */
export async function abrirAulaPublicada(pagina: Page, aula: string) {
  const agora = new Date();
  utimesSync(path.join(RAIZ, "app/finais/[aula]/page.tsx"), agora, agora);
  // A espera é por requisição fora da página: um 404 dentro dela vira erro de console, e o guarda de
  // console reprovaria o ensaio por um comportamento do `dev`, não da aula.
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    const sondagem = await pagina.request.get(`/finais/${aula}`);
    if (sondagem.status() !== 404) {
      await pagina.goto(`/finais/${aula}`);
      return;
    }
    await pagina.waitForTimeout(1500);
  }
  throw new Error(`a aula ${aula} continuou 404 depois de publicada`);
}

/**
 * Clica em Publicar e chega à janela do impacto. Desde 14/9/2026 o Publicar pergunta antes se o professor
 * quer fazer a aula inteira como aluno; os ensaios que publicam respondem "Publicar sem fazer" — quem
 * prova a pergunta é `aula-como-aluno.spec.ts`.
 */
export async function abrirPublicar(pagina: Page) {
  await pagina.getByRole("button", { name: "Publicar", exact: true }).click();
  const pergunta = pagina.getByRole("dialog", { name: "Antes de publicar, quer fazer a aula inteira como aluno?" });
  await pergunta.getByRole("button", { name: "Publicar sem fazer" }).click();
  const publicar = pagina.getByRole("dialog", { name: "Publicar a aula" });
  await publicar.waitFor();
  return publicar;
}

/**
 * Abre "Importar do Lichess ou PGN". Na aula vazia é um botão da tela; na aula com capítulos, desde a
 * revisão de experiência de 14/9/2026, mora no menu "Mais ações".
 */
export async function abrirImportar(pagina: Page) {
  const direto = pagina.getByRole("button", { name: "Importar do Lichess ou PGN" });
  if (await direto.isVisible()) await direto.click();
  else {
    await pagina.getByRole("button", { name: "Mais ações" }).click();
    await pagina.getByRole("menuitem", { name: /Importar do Lichess ou PGN/ }).click();
  }
  return pagina.getByRole("dialog", { name: "Importar do Lichess ou PGN" });
}

/** Um item do menu "Mais ações" da barra do topo. */
export async function maisAcoes(pagina: Page, item: string | RegExp) {
  await pagina.getByRole("button", { name: "Mais ações" }).click();
  await pagina.getByRole("menuitem", { name: item }).click();
}
