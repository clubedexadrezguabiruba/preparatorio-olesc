/**
 * O aluno de ensaio: abre a aula no navegador e **joga como um aluno que não sabe a resposta**.
 *
 *   node .claude/skills/aluno-de-ensaio/aluno.mjs N0-Q-MATE
 *
 * ## Por que ele existe, e o que só ele pega
 *
 * O `medir.mjs` mede a aula **do arquivo para a tela**: ele lê o pacote e confere que a tela
 * bate. Este aqui faz o contrário — ele **erra de propósito** e vê o que a tela responde.
 *
 * É o único teste que teria pego o cano furado de 17/9/2026: o PGN estava certo, o desenho
 * estava no nó, e quem perdia o desenho era a **montagem** (`treinos.ts` nunca preenchia
 * `questao.desenhos`). Nenhuma leitura de arquivo acusa isso, porque o arquivo está bom.
 *
 * **Nenhuma imagem sai daqui.** Só número e texto: uma captura custa ~4.800 tokens e é relida
 * a cada turno até o fim da sessão.
 */
import { chromium } from "playwright";
import { Chess } from "chess.js";
import { cookiesDeEnsaio, lerEnv } from "../revisar-aula/sessao.mjs";

const AULA = process.argv[2] ?? "N0-Q-MATE";
const BASE = process.env.BASE_DA_REVISAO ?? "http://localhost:3000";
const USUARIO = process.env.USUARIO_DE_ENSAIO ?? "alunoteste";
const LARGURA = Number(process.env.LARGURA_DO_ENSAIO ?? 1366);
const ALTURA = Number(process.env.ALTURA_DO_ENSAIO ?? 768);

const linhas = [];
const diz = (s) => { console.log(s); linhas.push(s); };
const veredito = (ok, texto) => diz(`${ok ? "  ok " : "  ✗  "} ${texto}`);

/* ------------------------------------------------------------------ *
 * O que a aula promete — lido do mesmo pacote que o site serve
 * ------------------------------------------------------------------ */

const { pacoteAtivoDoAluno } = await import("../../../lib/finais/conteudo-v2.ts");
const { aulaDoAlunoV2 } = await import("../../../lib/editor-v2/fluxo-do-aluno.ts");

const pacote = pacoteAtivoDoAluno(AULA);
if (!pacote) {
  console.error(`${AULA}: não há aula v2 publicada em content/aulas-v2/. Este ensaio é só para v2.`);
  process.exit(2);
}
const doAluno = aulaDoAlunoV2(pacote);
const treinos = doAluno.etapas.filter((e) => e.tipo === "treino");
const praticas = doAluno.etapas.filter((e) => e.tipo === "pratica");

const casasDe = (d) => [
  ...(d?.highlights ?? []).map((c) => (typeof c === "string" ? c : c.casa)),
  ...(d?.arrows ?? []).flatMap((s) => (Array.isArray(s) ? s : [s.de, s.para])),
];

/**
 * Um lance **legal e errado**: nem o certo, nem um que o autor catalogou como alternativa.
 * Preferimos um que a aula nomeou como erro (`mistakes`), porque é ele que tem de falar; sem
 * nenhum, qualquer legal fora da lista serve — e aí o que se cobra é a mensagem de reserva.
 */
function lanceErrado(node) {
  const certos = new Set((node.expects ?? []).flatMap((e) => e.moves));
  const nomeado = (node.mistakes ?? []).map((m) => (typeof m === "string" ? m : m.move ?? m.moves?.[0])).filter(Boolean).find((m) => !certos.has(m));
  if (nomeado) return { uci: nomeado, nomeado: true };
  const jogo = new Chess(node.fen);
  const legal = jogo.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`).find((m) => !certos.has(m));
  return legal ? { uci: legal, nomeado: false } : null;
}

diz(`\n# ${AULA} — o aluno de ensaio (${LARGURA}×${ALTURA})\n`);
diz(`  ·   ${treinos.length} treino(s), ${praticas.length} prática(s), publicação ${doAluno.publicationId}`);

/* ------------------------------------------------------------------ *
 * A régua do apoio, vista pelos olhos do aluno — não lida no arquivo
 * ------------------------------------------------------------------ */

const alvoPorTreino = treinos.map((treino, n) => {
  const nos = Object.entries(treino.jogavel.tree.nodes);
  const comAlvo = nos.filter(([id]) => casasDe(treino.jogavel.desenhos?.[id]).length > 0);
  return { n: n + 1, rotulo: treino.rotulo, total: nos.length, comAlvo: comAlvo.length };
});

/* ------------------------------------------------------------------ *
 * O navegador
 * ------------------------------------------------------------------ */

const cookies = await cookiesDeEnsaio(lerEnv(".env.local"), USUARIO);
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: LARGURA, height: ALTURA } });
await ctx.addCookies(cookies);
const pg = await ctx.newPage();
await pg.goto(`${BASE}/finais/${AULA}`, { waitUntil: "networkidle" });
await pg.waitForSelector("cg-board piece");

const centroDaCasa = async (casa, orientacao) => {
  const cx = await pg.locator("cg-board").boundingBox();
  const lado = cx.width / 8;
  const coluna = casa.charCodeAt(0) - 97;
  const linha = Number(casa[1]) - 1;
  const x = orientacao === "white" ? coluna : 7 - coluna;
  const y = orientacao === "white" ? 7 - linha : linha;
  return { x: cx.x + (x + 0.5) * lado, y: cx.y + (y + 0.5) * lado };
};

/** Arrasta a peça com o mouse — o chessground recusa evento de script. */
const jogar = async (uci, orientacao) => {
  const de = await centroDaCasa(uci.slice(0, 2), orientacao);
  const para = await centroDaCasa(uci.slice(2, 4), orientacao);
  await pg.mouse.move(de.x, de.y);
  await pg.mouse.down();
  await pg.mouse.move(para.x, para.y, { steps: 8 });
  await pg.mouse.up();
  if (uci.length > 4) {
    const nome = { q: "Dama", r: "Torre", b: "Bispo", n: "Cavalo" }[uci[4]];
    await pg.getByRole("button", { name: nome }).click();
  }
  await pg.waitForTimeout(900);
};

const fala = () => pg.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? "");
const desenhosNaTela = () => pg.$$eval("cg-container svg line, cg-container svg circle, cg-board square.selected, cg-board square[class*='highlight']", (n) => n.length);

/**
 * Vai para uma etapa da aula v2.
 *
 * **A aula v2 não tem abas.** A v1 tinha uma linha de quatro abas ("Apresentação · Aula ·
 * Treino · Prática real"); a v2 tem um **passo a passo** com um botão "Etapas N/M" que abre a
 * lista inteira — "1.Apresentação", "7.TREINO 1 - Feche a caixa", "11.Prática real". Foi este
 * ensaio que descobriu isso: procurando aba, ele não achava etapa nenhuma nas 11 aulas.
 *
 * Os itens da lista **não têm `role="menuitem"`** — são `<button>` dentro de `<li>`, com o
 * número da etapa na frente. Quem manda abrir é o `aria-expanded` do botão "Etapas".
 */
const irParaEtapa = async (nome) => {
  const abridor = pg.locator("nav[aria-label] button").first();
  if (!(await abridor.count())) return false;
  if ((await abridor.getAttribute("aria-expanded")) !== "true") await abridor.click();
  await pg.waitForTimeout(400);
  const itens = pg.locator("nav[aria-label] li button, nav[aria-label] [role='menuitem']");
  for (let i = 0; i < (await itens.count()); i += 1) {
    const texto = (await itens.nth(i).textContent()) ?? "";
    if (texto.includes(nome)) {
      await itens.nth(i).click();
      await pg.waitForTimeout(1500);
      return true;
    }
  }
  if ((await abridor.getAttribute("aria-expanded")) === "true") await abridor.click();
  return false;
};

/* ------------------------------------------------------------------ *
 * Treino a treino: o alvo, o erro de propósito, e a linha até o fim
 * ------------------------------------------------------------------ */

for (const [n, treino] of treinos.entries()) {
  diz(`\n## ${n + 1}º treino — «${treino.rotulo}»\n`);
  if (!(await irParaEtapa(treino.rotulo))) { veredito(false, `a etapa «${treino.rotulo}» não aparece no menu Etapas`); continue; }

  const jogavel = treino.jogavel;
  const orientacao = jogavel.orientacao;
  const prometidos = alvoPorTreino[n];

  // 1. O alvo, na tela. O que se mede é o SVG do chessground, não o arquivo.
  const naTela = await desenhosNaTela();
  const esperado = n === 0;
  veredito(
    esperado ? naTela > 0 : naTela === 0,
    `apoio: ${naTela} desenho(s) na tela antes do primeiro lance — ${esperado
      ? `no treino 1 tem de haver alvo (o pacote promete ${prometidos.comAlvo} de ${prometidos.total} nós com desenho)`
      : "do treino 2 em diante o alvo não é apontado"}`,
  );

  // 2. Errar de propósito, e ver se o erro tem nome.
  const raiz = jogavel.tree.root;
  const node = jogavel.tree.nodes[raiz];
  const errado = node ? lanceErrado(node) : null;
  if (!errado) {
    diz("  ·   sem lance errado possível nesta posição: nada a provar aqui");
  } else {
    const antes = await fala();
    await jogar(errado.uci, orientacao);
    const depois = await fala();
    veredito(depois !== antes && depois.length > 0, `erro com nome: depois de ${errado.uci}${errado.nomeado ? " (erro catalogado)" : " (erro qualquer)"} o professor diz "${depois.slice(0, 110)}"`);
    veredito(!/^\s*$/.test(depois), "o aluno que erra não fica no silêncio");
    // A posição não pode ter andado: errar não avança a lição.
    const pecas = await pg.$$eval("cg-board piece", (n2) => n2.length);
    veredito(pecas > 0, `o tabuleiro continua de pé depois do erro (${pecas} peças)`);
  }

  // 3. A linha inteira, com a mão.
  let id = raiz;
  const vistos = new Set();
  const lances = [];
  while (id && jogavel.tree.nodes[id] && !vistos.has(id)) {
    vistos.add(id);
    const expect = jogavel.tree.nodes[id].expects[0];
    if (!expect) break;
    lances.push(expect.moves[0]);
    id = expect.next;
  }
  for (const uci of lances) await jogar(uci, orientacao);
  const fim = await fala();
  veredito(fim.startsWith("Pronto."), `a linha de ${lances.length} lance(s) foi jogada até o fim — "${fim.slice(0, 100)}"`);
}

/* ------------------------------------------------------------------ *
 * A prática: nua, porque ali o juiz é o resultado
 * ------------------------------------------------------------------ */

for (const pratica of praticas) {
  diz(`\n## prática — «${pratica.rotulo}»\n`);
  if (!(await irParaEtapa(pratica.rotulo))) { veredito(false, `a etapa «${pratica.rotulo}» não aparece no menu Etapas`); continue; }
  await pg.waitForTimeout(1500);
  const nua = await pg.$$eval("cg-container svg line, cg-container svg circle", (n) => n.length);
  veredito(nua === 0, `a prática está nua: ${nua} desenho(s) — tem de ser zero`);
}

await ctx.close();
await nav.close();

const reprovados = linhas.filter((l) => l.startsWith("  ✗")).length;
diz(`\n${reprovados} quesito(s) reprovado(s).`);
process.exit(0);
