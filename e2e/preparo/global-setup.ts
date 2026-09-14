/**
 * O preparo de uma rodada de ensaios — fatia 10, parada 10A.
 *
 * Na ordem, e cada passo só roda se o anterior deu certo:
 *
 * 1. **Recusa** se já houver resto `EX-E2E-…` no disco: uma rodada que morreu no meio deixou
 *    lixo, e começar por cima dele misturaria o que esta rodada criou com o que a outra deixou.
 *    O caminho é `npm run e2e:limpar`.
 * 2. **Impressão digital** (SHA-256) de `content/`, do repertório e dos dois rascunhos v2 que
 *    não são do ensaio — a N1-KPK conferida também pelo nome.
 * 3. **Contas**: professor de ensaio (PIN sorteado) e aluno de teste.
 * 4. **Sessões**: entra pela tela de login de verdade, uma vez por conta, e guarda o estado do
 *    navegador em `.editor/e2e/`.
 * 5. **A aula base** `EX-E2E-BASE`: a aula extra de fixture (`EX-FIXTURE-V2`, a N0-LADDER com
 *    outro id) copiada para `.editor/v2/`, para os ensaios curtos terem uma aula com capítulo,
 *    treino e prática sem nunca abrir uma aula do curso no editor.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { ALUNO, PIN_DO_ALUNO, PROFESSOR, criarContasDoEnsaio } from "./contas.ts";
import { PASTA_E2E, PREFIXO, RAIZ, guardarJson, impressaoDigital, restosDoEnsaio } from "./protecao.ts";

export const SESSAO_DO_PROFESSOR = path.join(PASTA_E2E, "sessao-professor.json");
export const SESSAO_DO_ALUNO = path.join(PASTA_E2E, "sessao-aluno.json");
export const AULA_BASE = `${PREFIXO}BASE`;
export const SHA_DA_N1_KPK = "4be602ca224f065f630efe11948b696e33dbaa95a5fdfc12c03a6c912eacb822";

async function entrar(baseURL: string, usuario: string, pin: string, destino: string, arquivo: string) {
  const navegador = await chromium.launch();
  try {
    const contexto = await navegador.newContext({ baseURL, locale: "pt-BR" });
    const pagina = await contexto.newPage();
    await pagina.goto(`/entrar?proxima=${encodeURIComponent(destino)}`);
    await pagina.locator('input[name="usuario"]').fill(usuario);
    await pagina.locator('input[name="pin"]').fill(pin);
    await pagina.locator('form button[type="submit"], form button').first().click();
    await pagina.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 60_000 });
    await contexto.storageState({ path: arquivo });
  } finally {
    await navegador.close();
  }
}

export function criarAulaBase() {
  const pasta = path.join(RAIZ, "content/fixtures/aulas-v2/EX-FIXTURE-V2");
  const { publicationId } = JSON.parse(readFileSync(path.join(pasta, "ativa.json"), "utf8")) as { publicationId: string };
  const pacote = JSON.parse(readFileSync(path.join(pasta, "publicacoes", `${publicationId}.json`), "utf8")) as { aula: Record<string, unknown> };
  const aula = { ...pacote.aula, id: AULA_BASE, titulo: "Ensaio automático — aula base" };
  const destino = path.join(RAIZ, ".editor/v2", `${AULA_BASE}.json`);
  writeFileSync(destino, JSON.stringify(aula, null, 2) + "\n");
}

export default async function globalSetup(config: FullConfig) {
  const restos = restosDoEnsaio();
  if (restos.length) {
    throw new Error(
      `Há restos de uma rodada anterior (${restos.join(", ")}). Rode \`npm run e2e:limpar\` e tente de novo — ` +
      "começar por cima deles misturaria o que esta rodada cria com o que a outra deixou.",
    );
  }

  const n1 = path.join(RAIZ, ".editor/v2/N1-KPK.json");
  const impressao = impressaoDigital();
  if (existsSync(n1) && impressao[".editor/v2/N1-KPK.json"] !== SHA_DA_N1_KPK) {
    console.warn(`[e2e] aviso: o SHA-256 da N1-KPK não é o registrado na memória (${impressao[".editor/v2/N1-KPK.json"]}); a rodada só confere que ele não muda.`);
  }
  guardarJson("sha-antes.json", impressao);

  const baseURL = String(config.projects[0]?.use.baseURL ?? "http://localhost:3000");
  const { pinDoProfessor } = await criarContasDoEnsaio();
  await entrar(baseURL, PROFESSOR, pinDoProfessor, "/editor", SESSAO_DO_PROFESSOR);
  await entrar(baseURL, ALUNO, PIN_DO_ALUNO, "/painel", SESSAO_DO_ALUNO);

  criarAulaBase();
  console.log(`[e2e] preparo: ${Object.keys(impressao).length} arquivos protegidos, contas ${PROFESSOR} e ${ALUNO}, aula ${AULA_BASE}.`);
}
