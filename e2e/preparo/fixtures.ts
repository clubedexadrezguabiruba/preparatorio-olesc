/**
 * O `test` de todos os ensaios, com três guardas que ninguém precisa lembrar de ligar.
 *
 * 1. **Console limpo.** Qualquer erro de console ou exceção solta na página reprova o ensaio, com
 *    a mensagem. Um ensaio verde com a página gritando não é verde.
 * 2. **Aulas do curso fechadas.** A rota do editor de qualquer aula `N…` (v1 e v2) é recusada na
 *    rede: nenhum ensaio abre a N0-LADDER nem a N1-KPK no editor, nem por pré-carregamento de
 *    link. É a regra das proteções de ensaio virando código.
 * 3. **Aluno em outra sessão.** A fixture `aluno` abre um contexto separado, com a sessão do aluno
 *    de teste — a do professor e a do aluno nunca se misturam.
 */
import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { SESSAO_DO_ALUNO, SESSAO_DO_PROFESSOR } from "./global-setup.ts";

/** A rota do editor de uma aula do curso: `/editor/finais/N0-…` ou `/editor/v2/finais/N1-…`. */
export const ROTA_DE_AULA_DO_CURSO = /\/editor\/(v2\/)?finais\/N\d/;

/** O que o console do `next dev` diz e não é defeito da página. */
const RUIDO_DO_DEV = [
  /Download the React DevTools/,
  /\[HMR\]/,
  /\[Fast Refresh\]/,
];

export function vigiarConsole(pagina: Page): () => string[] {
  const erros: string[] = [];
  pagina.on("console", (mensagem) => {
    if (mensagem.type() !== "error") return;
    const texto = mensagem.text();
    if (RUIDO_DO_DEV.some((ruido) => ruido.test(texto))) return;
    erros.push(`console: ${texto}`);
  });
  pagina.on("pageerror", (erro) => erros.push(`exceção: ${erro.message}`));
  return () => erros;
}

async function fecharAulasDoCurso(contexto: BrowserContext) {
  await contexto.route(ROTA_DE_AULA_DO_CURSO, (rota) => rota.abort("blockedbyclient"));
}

async function contextoDoAluno(browser: Browser, viewport = { width: 375, height: 812 }) {
  const contexto = await browser.newContext({ storageState: SESSAO_DO_ALUNO, locale: "pt-BR", viewport, baseURL: `http://localhost:${process.env.E2E_PORTA ?? "3000"}` });
  await fecharAulasDoCurso(contexto);
  return contexto;
}

type Fixtures = {
  /** Uma página do aluno de teste, em sessão separada (375 px por padrão). */
  aluno: Page;
};

export const test = base.extend<Fixtures>({
  storageState: SESSAO_DO_PROFESSOR,
  context: async ({ context }, entregar) => {
    await fecharAulasDoCurso(context);
    await entregar(context);
  },
  page: async ({ page }, entregar, testInfo) => {
    const erros = vigiarConsole(page);
    await entregar(page);
    // O bloqueio das aulas do curso gera "Failed to load resource" de propósito; não é defeito.
    const reais = erros().filter((erro) => !/ERR_BLOCKED_BY_CLIENT/.test(erro));
    if (reais.length && testInfo.status === testInfo.expectedStatus) {
      throw new Error(`O console da página do professor teve ${reais.length} erro(s):\n- ${reais.join("\n- ")}`);
    }
  },
  aluno: async ({ browser }, entregar, testInfo) => {
    const contexto = await contextoDoAluno(browser);
    const pagina = await contexto.newPage();
    const erros = vigiarConsole(pagina);
    await entregar(pagina);
    await contexto.close();
    const reais = erros().filter((erro) => !/ERR_BLOCKED_BY_CLIENT/.test(erro));
    if (reais.length && testInfo.status === testInfo.expectedStatus) {
      throw new Error(`O console da página do aluno teve ${reais.length} erro(s):\n- ${reais.join("\n- ")}`);
    }
  },
});

export { expect };

/**
 * A medida só vale no tamanho pedido (memória "zoom do Playwright": o `devicePixelRatio` desta
 * máquina já mudou sozinho no meio de uma sessão). Toda medida de geometria passa por aqui antes.
 */
export async function conferirTamanho(pagina: Page, largura: number, altura: number) {
  const real = await pagina.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
  expect(real, `a janela deveria ter ${largura}×${altura} de CSS`).toMatchObject({ w: largura, h: altura });
  return real;
}
