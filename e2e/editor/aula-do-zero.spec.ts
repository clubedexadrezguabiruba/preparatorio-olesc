/**
 * A aula do zero, pela tela — fatia 10, parada 10G (pedido do Doug em 14/9/2026).
 *
 * Recria à mão o estudo "Mate de Dama e Rei" (`hf09xMzS`) na aula `EX-E2E-ZERO`, sem importar nada:
 * Nova aula → capítulos 02 (posição montada) e 03 (FEN) com os lances, símbolos, setas, casas,
 * narrações e as variantes `Qg6??` → os treinos 04–07, cada um num capítulo de rascunho → "Criar treino
 * daqui" → autoria com feedback, texto do defensor, o erro do afogamento, os mates alternativos e
 * `Qg7+` → o capítulo de rascunho excluído → a introdução com dois quadros → a prática → ordem,
 * Ctrl+Z/Ctrl+Y e recarregar → Conferir → Publicar. Depois o aluno faz a aula inteira, e o que ele
 * recebe é comparado com a `EX-E2E-LICHESS` (a importação do mesmo estudo, no ensaio anterior).
 *
 * O PGN da fixture é só a **folha de dados** do ensaio (lances, textos e cores dos desenhos): quem
 * escreve na aula é a tela.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { Chess } from "chess.js";
import { lerPgnsDoEstudo, type LancePgn, type PartidaPgn } from "../../lib/repertorio/pgn.ts";
import { textoComParagrafos } from "../../lib/editor-v2/importar-estudo.ts";
import { abrirAulaPublicada, abrirPublicar, FIXTURE_DO_ESTUDO, maisAcoes } from "../preparo/aulas.ts";
import { tentativasDoAluno } from "../preparo/contas.ts";
import { expect, test } from "../preparo/fixtures.ts";
import { jogarEsperarResposta, jogarPraticaComMotor } from "../preparo/partida.ts";
import { RAIZ } from "../preparo/protecao.ts";
import { acenderCasa, centroDaCasa, desenharSeta, jogar, tabuleiro } from "../preparo/tabuleiro.ts";

const AULA = "EX-E2E-ZERO";
const TITULO = "Mate de Dama e Rei (do zero)";
test.setTimeout(900_000);
test.describe.configure({ mode: "serial" });

// ---------------------------------------------------------------------------------------------------
// A folha de dados: o estudo lido do PGN.

const ESTUDO = lerPgnsDoEstudo(readFileSync(FIXTURE_DO_ESTUDO, "utf8"));
const [INTRO_00, INTRO_01, CAP_02, CAP_03, ...RESTO] = ESTUDO;
const TREINOS = RESTO.slice(0, 4);
const PRATICA = RESTO[4];

/** O texto que o aluno lê: sem `[%cal …]`, com os parágrafos. */
const prosa = (bruto: string | null) => textoComParagrafos(bruto);
const fenDe = (partida: PartidaPgn) => partida.tags.FEN;
/** "02 - AULA EXPLICADA - O L e a caixa" → "O L e a caixa". */
const nomeDe = (partida: PartidaPgn) => partida.tags.ChapterName.split(" - ").at(-1)!.trim();

type Desenho = { de: string; para: string; cor: string };
function desenhosDe(bruto: string | null): Desenho[] {
  const saida: Desenho[] = [];
  for (const [, tipo, corpo] of (bruto ?? "").matchAll(/\[%(cal|csl) ([^\]]+)\]/g)) {
    for (const item of corpo.split(",")) {
      const cor = item[0];
      const de = item.slice(1, 3);
      saida.push({ de, para: tipo === "cal" ? item.slice(3, 5) : de, cor });
    }
  }
  return saida;
}

/** As cores do Lichess, nos modificadores do botão direito (§10.2). */
const MODIFICADORES: Record<string, Array<"Shift" | "Alt">> = { G: [], R: ["Shift"], B: ["Alt"], Y: ["Shift", "Alt"] };

function uciDe(jogo: Chess, san: string): string {
  const lance = jogo.move(san);
  return lance.from + lance.to + (lance.promotion ?? "");
}

/** A primeira frase do texto, como o importador nomeia o erro conhecido. */
function primeiraFrase(texto: string): string {
  const frase = texto.split(/(?<=[.!?])\s/)[0]?.trim() ?? texto;
  return frase.length > 48 ? `${frase.slice(0, 45).trim()}…` : frase;
}

// ---------------------------------------------------------------------------------------------------
// Gestos na tela.

const arquivo = () => path.join(RAIZ, ".editor/v2", `${AULA}.json`);
type Crua = {
  titulo: string;
  analises: Array<{ id: string; inicio: { tipo: string; fen?: string }; raizId: string; nos: Record<string, { uci?: string; filhos: string[]; nags?: number[]; comentario?: string; desenhos?: unknown }> }>;
  capitulos: Array<{ id: string; titulo: string; analiseId: string; caminho: string[]; narracoes: unknown }>;
  introducoes: Array<{ quadros: Array<{ texto: string; titulo?: string }> }>;
  treinos: Array<{ id: string; titulo: string; propriedade: string }>;
  praticas: Array<{ positionId: string }>;
  fluxo: Array<{ tipo: string; entidadeId: string }>;
};
const lerAula = () => JSON.parse(readFileSync(arquivo(), "utf8")) as Crua;

function estadoDoSalvamento(page: Page): Locator {
  return page.locator("header span, main span").filter({ hasText: /^(✓ salvo|alterado|salvando…|erro|conflito)$/ }).first();
}

async function esperarSalvo(page: Page) {
  // O autosave espera 600 ms antes de gravar: o "✓ salvo" de antes do gesto ainda está na tela.
  await page.waitForTimeout(900);
  await expect(estadoDoSalvamento(page)).toHaveText("✓ salvo", { timeout: 30_000 });
}

const lances = (page: Page) => page.getByRole("list", { name: "Lances da análise" }).getByRole("listitem");

/**
 * Joga um lance no tabuleiro do editor e espera ele aparecer na lista.
 *
 * Foi este passo que achou o defeito do retângulo velho do tabuleiro (ver
 * `tabuleiro-deslocado.spec.ts`): o aviso de proveniência sumia, o tabuleiro subia, e o clique virava
 * outra casa.
 */
async function jogarNoEditor(page: Page, uci: string) {
  const antes = await lances(page).count();
  await jogar(page, uci, tabuleiro(page));
  await expect(lances(page), `o lance ${uci} não entrou na lista`).toHaveCount(antes + 1);
}

/** Leva a seleção à posição depois de `meiosLances` da linha principal, pelo teclado (§7). */
async function irParaMeioLance(page: Page, meiosLances: number) {
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  await page.keyboard.press("Home");
  for (let i = 0; i < meiosLances; i += 1) await page.keyboard.press("ArrowRight");
}

async function simbolo(page: Page, nag: string) {
  await page.locator("#simbolos-do-lance").getByRole("button", { name: nag, exact: true }).click();
}

async function desenhar(page: Page, desenhos: Desenho[]) {
  for (const d of desenhos) {
    if (d.de === d.para) await acenderCasa(page, d.de, MODIFICADORES[d.cor]);
    else await desenharSeta(page, d.de, d.para, MODIFICADORES[d.cor]);
    await page.waitForTimeout(150);
  }
}

async function narrar(page: Page, texto: string) {
  const aba = page.getByRole("tab", { name: /^Fala para o aluno/ });
  if ((await aba.getAttribute("aria-selected")) !== "true") await aba.click();
  await page.getByRole("button", { name: "+ Escrever fala para o aluno" }).click();
  await page.getByPlaceholder("O que o aluno lê neste lance. Deixe vazio para desistir.").fill(texto);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Fala para o aluno", exact: true })).toHaveValue(texto);
}

async function comentar(page: Page, texto: string) {
  const aba = page.getByRole("tab", { name: /^Nota do professor/ });
  if ((await aba.getAttribute("aria-selected")) !== "true") await aba.click();
  const campo = page.getByRole("textbox", { name: "Nota do professor" });
  await campo.fill(texto);
  await page.keyboard.press("Tab");
}

async function novoCapituloPorFen(page: Page, nome: string, fen: string) {
  await page.getByRole("button", { name: "+ Adicionar capítulo" }).click();
  const janela = page.getByRole("dialog", { name: "Adicionar capítulo" });
  await janela.getByLabel("Nome do capítulo").fill(nome);
  await janela.getByRole("button", { name: /Colar código da posição/ }).click();
  await janela.getByLabel("FEN da posição").fill(fen);
  const lugar = janela.getByRole("combobox");
  if (await lugar.count()) await lugar.selectOption({ label: "no fim da aula" });
  await janela.getByRole("button", { name: "Criar capítulo" }).click();
  await expect(janela).toBeHidden();
}

/** "De onde veio a posição…" pelo ••• do capítulo → Autoria própria (§19.1). */
async function registrarAutoriaPropria(page: Page, nomeDoCapitulo: string) {
  await page.getByLabel(`Ações do capítulo ${nomeDoCapitulo}`).click();
  await page.getByRole("button", { name: "De onde veio a posição…" }).click();
  const janela = page.getByRole("dialog", { name: "De onde veio esta posição?" });
  await janela.getByRole("radio", { name: /Autoria própria/ }).check();
  await janela.getByRole("button", { name: "Registrar revisão" }).click();
  await expect(janela).toBeHidden();
}

/** A linha principal de um capítulo do estudo, com símbolo, desenho e narração em cada lance. */
async function escreverLinhaPrincipal(page: Page, partida: PartidaPgn) {
  const jogo = new Chess(fenDe(partida));
  if (partida.intro) await narrar(page, prosa(partida.intro));
  for (const lance of partida.lances) {
    await jogarNoEditor(page, uciDe(jogo, lance.san));
    for (const nag of lance.nags) await simbolo(page, nag);
    await desenhar(page, desenhosDe(lance.comentario));
    const texto = prosa(lance.comentario);
    if (texto) await narrar(page, texto);
  }
}

/** As variantes (`8.Qg6??`), cada uma a partir da posição do lance que ela substitui. */
async function escreverVariantes(page: Page, partida: PartidaPgn) {
  const jogo = new Chess(fenDe(partida));
  for (const [indice, lance] of partida.lances.entries()) {
    for (const variante of lance.variacoes) {
      await irParaMeioLance(page, indice);
      const ramo = new Chess(jogo.fen());
      for (const lanceDaVariante of variante as LancePgn[]) {
        await jogarNoEditor(page, uciDe(ramo, lanceDaVariante.san));
        for (const nag of lanceDaVariante.nags) await simbolo(page, nag);
        await desenhar(page, desenhosDe(lanceDaVariante.comentario));
        // A variante fica fora do percurso do capítulo: o texto dela é comentário, não narração.
        const texto = prosa(lanceDaVariante.comentario);
        if (texto) await comentar(page, texto);
      }
    }
    jogo.move(lance.san);
  }
}

// ---------------------------------------------------------------------------------------------------
// 1. O professor.

test("criar a aula do zero pela tela, conferir e publicar", async ({ page }) => {
  // Nova aula extra (§5.2): o id sai do título, e depois o título vira o do estudo.
  await page.goto("/editor/v2/nova");
  await page.getByLabel("Título da aula").fill("E2E ZERO");
  await page.getByLabel("Tipo").selectOption({ label: "Aula extra (EX-)" });
  await page.getByLabel("Nível").selectOption({ label: "Nível 1" });
  await page.getByLabel("Classe").selectOption({ label: "Classe E" });
  await page.getByText("Opções avançadas").click();
  await expect(page.getByText(AULA, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Criar aula" }).click();
  await page.waitForURL(`**/editor/v2/finais/${AULA}`);
  await expect(page.getByRole("button", { name: "+ Adicionar capítulo" })).toBeVisible();
  const titulo = page.getByRole("textbox", { name: "Título da aula" }).first();
  await titulo.fill(TITULO);
  await titulo.press("Enter");
  await expect.poll(() => lerAula().titulo).toBe(TITULO);

  // Capítulo 02, com a posição montada peça por peça (clique na paleta e na casa).
  await page.getByRole("button", { name: "+ Adicionar capítulo" }).click();
  const janela = page.getByRole("dialog", { name: "Adicionar capítulo" });
  await janela.getByLabel("Nome do capítulo").fill(nomeDe(CAP_02));
  await janela.getByRole("button", { name: /Montar posição/ }).click();
  await janela.getByRole("button", { name: "Limpar" }).click();
  const montador = janela.locator(".cg-wrap:not(.paleta-de-pecas)").first();
  for (const [peca, casa] of [["rei preto", "e5"], ["rei branco", "e1"], ["dama branca", "d1"]] as const) {
    await janela.getByRole("button", { name: peca, exact: true }).click();
    const alvo = await centroDaCasa(montador, casa);
    await page.mouse.click(alvo.x, alvo.y);
  }
  await janela.getByRole("button", { name: "Criar capítulo" }).click();
  await expect(janela).toBeHidden();
  await expect.poll(() => lerAula().analises[0]?.inicio.fen).toBe(fenDe(CAP_02));
  await registrarAutoriaPropria(page, nomeDe(CAP_02));

  await escreverLinhaPrincipal(page, CAP_02);
  await escreverVariantes(page, CAP_02);
  await esperarSalvo(page);

  // Capítulo 03, por FEN.
  await novoCapituloPorFen(page, nomeDe(CAP_03), fenDe(CAP_03));
  await registrarAutoriaPropria(page, nomeDe(CAP_03));
  await escreverLinhaPrincipal(page, CAP_03);
  await escreverVariantes(page, CAP_03);
  await esperarSalvo(page);

  {
    const aula = lerAula();
    expect(aula.capitulos.map((c) => c.caminho.length)).toEqual([CAP_02.lances.length, CAP_03.lances.length]);
    const variantes = aula.analises.flatMap((a) => Object.values(a.nos).filter((no) => no.nags?.includes(4)).map((no) => no.uci));
    expect(variantes).toEqual(["g5g6", "g4g6"]);
  }

  // Treinos 04–07: capítulo de rascunho → Criar treino daqui → autoria → excluir o rascunho.
  for (const partida of TREINOS) await escreverTreino(page, partida);
  {
    const aula = lerAula();
    expect(aula.capitulos.map((c) => c.titulo)).toEqual([nomeDe(CAP_02), nomeDe(CAP_03)]);
    expect(aula.treinos.map((t) => t.titulo)).toEqual(TREINOS.map(nomeDe));
  }

  // Introdução: os quadros 00 e 01, ligados à posição inicial do capítulo 03 (a mesma FEN).
  await escreverIntroducao(page);

  // Prática 08: a posição do capítulo 03 vai para o acervo.
  await page.getByRole("button", { name: "+ Criar prática" }).click();
  const pratica = page.getByRole("dialog", { name: "Nova prática contra o computador" });
  await pratica.getByLabel("Título").fill(nomeDe(PRATICA));
  await pratica.getByRole("button", { name: /De um capítulo desta aula/ }).click();
  await pratica.getByLabel("Capítulo").selectOption({ label: nomeDe(CAP_03) });
  await pratica.getByRole("button", { name: "Adicionar ao acervo e usar" }).click();
  const pedeResultado = pratica.getByLabel("Resultado esperado");
  const escolhida = pratica.getByText(/✓ pos-ex-[a-z0-9-]+-\d+ ·/); // reaproveita a posição do acervo com a mesma FEN, se houver
  await expect(escolhida.or(pedeResultado)).toBeVisible();
  if (await pedeResultado.isVisible()) {
    await pedeResultado.selectOption({ label: "brancas ganham" });
    await pratica.getByRole("button", { name: "Adicionar ao acervo e usar" }).click();
  }
  await expect(escolhida).toBeVisible();
  await pratica.getByRole("button", { name: "Criar prática" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`${nomeDe(PRATICA)}.*Brancas · vencer`) })).toBeVisible();

  await expect.poll(() => lerAula().fluxo.map((e) => e.tipo)).toEqual(["introducao", "capitulo", "capitulo", "treino", "treino", "treino", "treino", "pratica"]);
  await esperarSalvo(page);

  // Ordem da aula: subir e descer um treino.
  await page.getByRole("button", { name: /Ordem da aula · 8 etapas/ }).click();
  const ordem = page.getByRole("dialog", { name: "Ordem da aula" });
  const ordemAntes = lerAula().fluxo.map((e) => e.entidadeId);
  await ordem.getByRole("button", { name: `Subir treino «${nomeDe(TREINOS[2])}»` }).click();
  await expect.poll(() => lerAula().fluxo.map((e) => e.entidadeId)).not.toEqual(ordemAntes);
  await ordem.getByRole("button", { name: `Descer treino «${nomeDe(TREINOS[2])}»` }).click();
  await expect.poll(() => lerAula().fluxo.map((e) => e.entidadeId)).toEqual(ordemAntes);
  await ordem.getByRole("button", { name: "Fechar" }).first().click();
  await esperarSalvo(page);

  // Ctrl+Z cinco vezes e Ctrl+Y cinco vezes: o documento volta byte a byte.
  const antesDoDesfazer = readFileSync(arquivo(), "utf8");
  await page.locator("body").click({ position: { x: 3, y: 3 } });
  for (let i = 0; i < 5; i += 1) await page.keyboard.press("Control+z");
  await esperarSalvo(page);
  expect(readFileSync(arquivo(), "utf8")).not.toBe(antesDoDesfazer);
  for (let i = 0; i < 5; i += 1) await page.keyboard.press("Control+y");
  await esperarSalvo(page);
  await expect.poll(() => readFileSync(arquivo(), "utf8")).toBe(antesDoDesfazer);

  // Recarregar: nada se perdeu.
  await page.reload();
  await expect(page.getByRole("button", { name: /Ordem da aula · 8 etapas/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Introdução.*2 quadros/ })).toBeVisible();
  expect(readFileSync(arquivo(), "utf8")).toBe(antesDoDesfazer);

  // A prévia de um capítulo e a de um treino, com `x` e `?` (§25 e a tabela de atalhos).
  await page.getByRole("button", { name: "Ver como aluno" }).click();
  await page.getByRole("dialog", { name: "Ver como aluno" }).getByRole("button", { name: /Só este capítulo/ }).click();
  const previa = page.getByRole("dialog", { name: /^Prévia: / });
  await expect(previa.locator(".cg-wrap").first()).toBeVisible();
  await conferirXeInterrogacao(page, previa);
  await previa.getByRole("button", { name: /Fechar/ }).first().click();

  await page.locator(`[data-jogar-treino-id]`).nth(2).click();
  const treinoNaPrevia = page.getByRole("dialog", { name: `Jogar o treino: ${nomeDe(TREINOS[2])}` });
  await expect(treinoNaPrevia.locator(".cg-wrap").first()).toBeVisible();
  await conferirXeInterrogacao(page, treinoNaPrevia);
  await page.keyboard.press("Escape");
  await expect(treinoNaPrevia).toBeHidden();

  // Conferir e publicar.
  await maisAcoes(page, /Conferir sem publicar/);
  const resultado = page.getByRole("region", { name: "Resultado da conferência" });
  await expect(resultado).toBeVisible({ timeout: 60_000 });
  await expect(resultado, `a conferência não liberou:\n${await resultado.innerText().catch(() => "")}`).toContainText("Pode publicar", { timeout: 60_000 });
  const publicar = await abrirPublicar(page);
  await expect(publicar).toContainText(/Aula extra/);
  await publicar.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Publicada neste computador" })).toBeVisible({ timeout: 60_000 });
});

async function conferirXeInterrogacao(page: Page, janela: Locator) {
  const wrap = janela.locator(".cg-wrap").first();
  const antes = (await wrap.getAttribute("class")) ?? "";
  await janela.locator(".cg-wrap").first().hover();
  await page.keyboard.press("x");
  await expect.poll(async () => (await wrap.getAttribute("class"))?.includes("orientation-black")).toBe(!antes.includes("orientation-black"));
  await page.keyboard.press("x");
  await expect.poll(async () => (await wrap.getAttribute("class"))?.includes("orientation-black")).toBe(antes.includes("orientation-black"));
  await page.keyboard.press("?");
  const ajuda = page.getByRole("dialog", { name: "Atalhos de teclado" });
  await expect(ajuda).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ajuda).toBeHidden();
}

async function escreverTreino(page: Page, partida: PartidaPgn) {
  const nome = nomeDe(partida);
  const rascunho = `Rascunho — ${nome}`;
  const fen = fenDe(partida);
  await novoCapituloPorFen(page, rascunho, fen);
  await registrarAutoriaPropria(page, rascunho);

  // A linha principal, dos dois lados.
  const jogo = new Chess(fen);
  for (const lance of partida.lances) await jogarNoEditor(page, uciDe(jogo, lance.san));
  await esperarSalvo(page);

  // Criar treino daqui, da posição inicial.
  await irParaMeioLance(page, 0);
  await page.getByLabel("Ações do lance posição inicial").click();
  await page.getByRole("menuitem", { name: "Criar treino daqui" }).click();
  const criar = page.getByRole("dialog", { name: "Criar treino daqui" });
  await criar.getByLabel("Título").fill(nome);
  await criar.getByLabel("Objetivo para o aluno").fill(prosa(partida.intro));
  await criar.getByLabel("Lugar na aula").selectOption({ label: "No fim, antes das práticas finais" });
  await criar.getByRole("button", { name: "Criar treino" }).click();
  await expect(criar).toBeHidden();

  // A autoria: o feedback de cada resposta, o texto do defensor, e as variantes do estudo.
  await page.getByRole("list", { name: "Treinos da aula" }).getByRole("button", { name: new RegExp(`^${nome}`) }).first().click();
  const autoria = page.getByRole("dialog", { name: `Editar treino — ${nome}` });
  await autoria.getByLabel("Texto de abertura").fill(prosa(partida.intro));
  const perguntas = autoria.getByRole("navigation", { name: "Perguntas do treino" }).getByRole("button");
  const doAluno = partida.lances.filter((_, i) => i % 2 === 0);
  const doDefensor = partida.lances.filter((_, i) => i % 2 === 1);
  await expect(perguntas).toHaveCount(doAluno.length);
  const ramo = new Chess(fen);
  for (const [i, lance] of doAluno.entries()) {
    await perguntas.nth(i).click();
    const antesDoLance = new Chess(ramo.fen());
    ramo.move(lance.san);
    const primeira = autoria.locator("article").first();
    await primeira.getByLabel("Feedback desta resposta").fill(prosa(lance.comentario));
    const defesa = doDefensor[i];
    if (defesa?.comentario) {
      await primeira.getByLabel(/^O que o aluno lê quando o adversário joga/).fill(prosa(defesa.comentario));
    }
    if (i === doAluno.length - 1 && !ramo.isCheckmate()) {
      await autoria.getByLabel("Explicação ao concluir").fill(prosa(lance.comentario));
    }
    for (const variante of lance.variacoes) {
      const [alternativo] = variante as LancePgn[];
      const texto = prosa(alternativo.comentario);
      const teste = new Chess(antesDoLance.fen());
      const uci = uciDe(teste, alternativo.san);
      const errado = alternativo.nags.some((n) => ["?", "??", "?!"].includes(n)) || !teste.isCheckmate();
      await autoria.getByRole("button", { name: errado ? "+ Erro conhecido" : "+ Resposta correta" }).click();
      const nova = autoria.locator("article").last();
      await nova.getByLabel("Lance(s) no formato de casas, como e2e4, separados por vírgula").fill(uci);
      await nova.getByLabel("Feedback desta resposta").fill(texto);
      if (errado) {
        await nova.getByLabel("Nome do erro conhecido").fill(primeiraFrase(texto));
        await nova.getByLabel("Explicação do erro").fill(texto);
      }
    }
    if (defesa) ramo.move(defesa.san);
  }
  await expect(autoria.getByText("Todas as respostas levam a outra pergunta ou a um fim.")).toBeVisible();
  await autoria.getByRole("button", { name: "Salvar treino" }).click();
  await expect(autoria).toBeHidden();
  await esperarSalvo(page);

  // O capítulo de rascunho sai; o treino fica, independente dele.
  await page.getByLabel(`Ações do capítulo ${rascunho}`).click();
  await page.getByRole("button", { name: "Excluir capítulo…" }).click();
  const excluir = page.getByRole("dialog", { name: `Excluir «${rascunho}»?` });
  const independentes = excluir.getByRole("button", { name: "Tornar independente" });
  for (let i = 0; i < await independentes.count(); i += 1) await independentes.nth(i).click();
  await excluir.getByRole("button", { name: "Excluir o capítulo" }).click();
  await expect(excluir).toBeHidden();
  await esperarSalvo(page);
  expect(lerAula().capitulos.some((c) => c.titulo === rascunho)).toBe(false);
}

async function escreverIntroducao(page: Page) {
  const [texto00, texto01] = [prosa(INTRO_00.intro), prosa(INTRO_01.intro)];
  await page.getByRole("button", { name: "+ Criar introdução" }).click();
  const criar = page.getByRole("dialog", { name: "Criar a introdução" });
  await criar.getByLabel("Título da introdução").fill("Introdução");
  await criar.getByLabel("Texto do primeiro quadro").fill(texto00);
  await criar.getByLabel("Capítulo").selectOption({ label: nomeDe(CAP_03) });
  await criar.getByLabel("Lance").selectOption({ label: "a posição inicial" });
  await criar.getByRole("button", { name: "Criar introdução" }).click();

  const tela = page.getByRole("dialog", { name: "Introdução: Introdução" });
  await expect(tela.getByText("Quadro 1 de 1")).toBeVisible();
  await tela.getByLabel("Título do quadro (opcional)").fill(nomeDe(INTRO_00));
  await tela.getByLabel("Texto que o aluno lê").focus();

  await tela.getByLabel("Texto do quadro novo").fill(texto01);
  await tela.getByRole("button", { name: "+ Acrescentar quadro depois deste" }).click();
  await expect(tela.getByText("Quadro 2 de 2")).toBeVisible();
  await tela.getByLabel("Título do quadro (opcional)").fill(nomeDe(INTRO_01));
  await tela.getByLabel("Texto que o aluno lê").focus();

  // Um quadro de sobra: título, duplicar, reordenar, desenhar, inserir lance — e sai tudo.
  await tela.getByLabel("Texto do quadro novo").fill("Quadro de sobra");
  await tela.getByRole("button", { name: "+ Acrescentar quadro depois deste" }).click();
  await expect(tela.getByText("Quadro 3 de 3")).toBeVisible();
  await tela.getByLabel("Título do quadro (opcional)").fill("Sobra");
  await tela.getByLabel("Texto que o aluno lê").focus();
  await tela.getByRole("button", { name: "Duplicar" }).click();
  await expect(tela.getByText("Quadro 4 de 4")).toBeVisible();
  await tela.getByRole("button", { name: "↑ Antes" }).click();
  await expect(tela.getByText("Quadro 3 de 4")).toBeVisible();
  const tabuleiroDoQuadro = tela.locator(".cg-wrap").first();
  await desenharSeta(page, "d1", "d8", [], tabuleiroDoQuadro);
  await jogar(page, "e1f2", tabuleiroDoQuadro);
  await expect(tela.getByText("Quadro 4 de 5")).toBeVisible();
  for (const resta of [4, 3, 2]) {
    await tela.getByRole("navigation", { name: "Quadros da introdução" }).getByRole("button").nth(2).click();
    await tela.getByRole("button", { name: "Excluir quadro" }).click();
    await expect(tela.getByText(new RegExp(`de ${resta}$`))).toBeVisible();
  }
  await expect.poll(() => lerAula().introducoes[0]?.quadros.map((q) => q.texto)).toEqual([texto00, texto01]);

  // A prévia da introdução, com o IntroStage do aluno.
  await tela.getByRole("button", { name: "Pré-visualizar a introdução" }).click();
  const previa = page.getByRole("dialog", { name: "Prévia da introdução: Introdução" });
  await expect(previa.getByText(/Nesta aula, você vai aprender/).last()).toBeVisible();
  await previa.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(previa.getByText(/COMO fazer isso com segurança/).last()).toBeVisible();
  await previa.getByRole("button", { name: "Fechar prévia" }).click();
  await tela.getByRole("button", { name: "Fechar" }).click();
  await expect(tela).toBeHidden();
}

// ---------------------------------------------------------------------------------------------------
// 2. O aluno.

test("o aluno faz a aula do zero, e as tentativas chegam ao banco", async ({ aluno }) => {
  await aluno.setViewportSize({ width: 1366, height: 768 });
  await abrirAulaPublicada(aluno, AULA);
  await expect(aluno.getByText(/Etapa 1 de 8/)).toBeVisible();
  const trilha = aluno.getByRole("navigation", { name: "Etapas da aula" });
  const tabuleiroDoAluno = () => aluno.locator(".cg-wrap").first();
  const irPara = async (indice: number) => {
    await trilha.getByRole("button").nth(indice).click();
    await expect(aluno.getByText(new RegExp(`Etapa ${indice + 1} de 8`))).toBeVisible();
    await expect(tabuleiroDoAluno()).toBeVisible();
    await aluno.waitForTimeout(1200);
  };

  await expect(aluno.getByText(/Nesta aula, você vai aprender/).last()).toBeVisible();
  await expect(aluno.getByText("Quadro 1 de 2")).toBeAttached();
  await aluno.locator("body").click({ position: { x: 3, y: 3 } });
  await aluno.keyboard.press("ArrowRight");
  await expect(aluno.getByText("Quadro 2 de 2")).toBeAttached();

  await irPara(1);
  await expect(aluno.getByRole("heading", { name: nomeDe(CAP_02) })).toBeVisible();
  await irPara(2);
  await expect(aluno.getByRole("heading", { name: nomeDe(CAP_03) })).toBeVisible();

  await irPara(3);
  let jogo = new Chess(fenDe(TREINOS[0]));
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "d4d5")).toBe("e7f6");
  await jogar(aluno, "d5e4", tabuleiroDoAluno());
  await aluno.waitForTimeout(1500);

  await irPara(4);
  jogo = new Chess(fenDe(TREINOS[1]));
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "f4f5")).toBe("g7h6");
  await jogar(aluno, "f5g4", tabuleiroDoAluno());
  await aluno.waitForTimeout(1500);

  await irPara(5);
  jogo = new Chess(fenDe(TREINOS[2]));
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "f4g5")).toBe("h7h8");
  await jogar(aluno, "g5g6", tabuleiroDoAluno());
  await expect(aluno.getByText(/Afogamento/).first()).toBeVisible();
  await aluno.waitForTimeout(1500);
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "d4e5")).toBe("h8h7");
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "e5f6")).toBe("h7h8");
  await jogar(aluno, "g5g7", tabuleiroDoAluno());
  await aluno.waitForTimeout(1500);

  await irPara(6);
  jogo = new Chess(fenDe(TREINOS[3]));
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "d4e5")).toBe("h6h7");
  expect(await jogarEsperarResposta(aluno, tabuleiroDoAluno(), jogo, "e5f6")).toBe("h7h6");
  await jogar(aluno, "g4g7", tabuleiroDoAluno());
  await expect(aluno.getByText(/tente de novo/i).first()).toBeVisible();
  await aluno.waitForTimeout(1500);
  await jogar(aluno, "g4h4", tabuleiroDoAluno());
  await expect(aluno.getByText(/Parabéns/).first()).toBeVisible();
  await aluno.waitForTimeout(1500);

  await irPara(7);
  await aluno.waitForTimeout(4000);
  const partida = await jogarPraticaComMotor(aluno, tabuleiroDoAluno(), fenDe(PRATICA));
  console.log(`[e2e] prática da aula do zero: ${partida.fim} em ${partida.lances.length} meios-lances — ${partida.lances.join(" ")}`);
  expect(partida.fim).toBe("mate");
  await aluno.waitForTimeout(3000);

  await expect.poll(async () => (await tentativasDoAluno(AULA)).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(5);
  const linhas = await tentativasDoAluno(AULA);
  console.log(`[e2e] tentativas no banco: ${JSON.stringify(linhas.map((l) => ({ etapa: l.etapa, sucesso: l.sucesso, publication_id: l.publication_id })))}`);
  expect(linhas.every((l) => l.publication_id?.startsWith("pub-"))).toBe(true);
  expect(linhas.filter((l) => l.etapa === "treino").length).toBeGreaterThanOrEqual(4);
  expect(linhas.some((l) => l.etapa === "pratica" && l.sucesso)).toBe(true);
});

// ---------------------------------------------------------------------------------------------------
// 3. A comparação com a importação do mesmo estudo.

type Pacote = {
  aula: {
    analises: Array<{ id: string; inicio: { tipo: string; fen?: string; positionId?: string }; raizId: string; nos: Record<string, { uci?: string; filhos: string[] }> }>;
    introducoes: Array<{ quadros: Array<{ texto: string; posicao: { tipo: string; fen?: string; origem?: { analiseId: string; nodeId: string } } }> }>;
    capitulos: Array<{ id: string; analiseId: string; inicioNodeId: string; caminho: string[]; narracoes: Array<{ nodeId: string; texto: string }> | Record<string, { nodeId: string; texto: string }> }>;
    treinos: Array<{ id: string; introducao?: string; objetivo: string; ladoAluno: string; inicio: { analiseId: string; nodeId: string }; questoes: Array<{ posicao: { analiseId: string; nodeId: string }; respostas: Array<{ moves: string[]; julgamento: string; feedback: string; efeito: { tipo: string; defesas?: Array<{ move: string; texto?: string }>; condicao?: string } }> }> }>;
    praticas: Array<{ id: string; positionId: string; ladoAluno: string; objetivo: string }>;
    fluxo: Array<{ tipo: string; entidadeId: string }>;
  };
  posicoes: Record<string, { fen: string }>;
};

function pacotePublicado(aula: string): Pacote | null {
  const pasta = path.join(RAIZ, "content/aulas-v2", aula);
  if (!existsSync(path.join(pasta, "ativa.json"))) return null;
  const { publicationId } = JSON.parse(readFileSync(path.join(pasta, "ativa.json"), "utf8")) as { publicationId: string };
  return JSON.parse(readFileSync(path.join(pasta, "publicacoes", `${publicationId}.json`), "utf8")) as Pacote;
}

/** O que o aluno recebe, sem ids: posições, lances, respostas aceitas, erros e textos. */
function oQueOAlunoRecebe(pacote: Pacote) {
  const { aula, posicoes } = pacote;
  const fenDoNo = (analiseId: string, nodeId: string): string => {
    const analise = aula.analises.find((a) => a.id === analiseId)!;
    const pai: Record<string, string> = {};
    for (const [id, no] of Object.entries(analise.nos)) for (const filho of no.filhos) pai[filho] = id;
    const caminho: string[] = [];
    for (let atual = nodeId; atual !== analise.raizId; atual = pai[atual]) caminho.unshift(analise.nos[atual].uci!);
    const jogo = new Chess(analise.inicio.fen ?? posicoes[analise.inicio.positionId!].fen);
    for (const uci of caminho) jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    return jogo.fen();
  };
  const narracoesDe = (c: Pacote["aula"]["capitulos"][number]) => (Array.isArray(c.narracoes) ? c.narracoes : Object.values(c.narracoes));
  return {
    etapas: aula.fluxo.map((e) => e.tipo),
    introducao: aula.introducoes.flatMap((i) => i.quadros.map((q) => ({
      texto: q.texto,
      fen: q.posicao.tipo === "fen" ? new Chess(q.posicao.fen).fen() : fenDoNo(q.posicao.origem!.analiseId, q.posicao.origem!.nodeId),
    }))),
    capitulos: aula.fluxo.filter((e) => e.tipo === "capitulo").map((e) => {
      const c = aula.capitulos.find((item) => item.id === e.entidadeId)!;
      const analise = aula.analises.find((a) => a.id === c.analiseId)!;
      const percurso = [c.inicioNodeId, ...c.caminho];
      const narracoes = narracoesDe(c).filter((n) => percurso.includes(n.nodeId));
      return {
        fen: fenDoNo(c.analiseId, c.inicioNodeId),
        lances: c.caminho.map((id) => analise.nos[id].uci),
        variantes: percurso.flatMap((id, i) => analise.nos[id].filhos.filter((f) => f !== percurso[i + 1]).map((f) => `${i}:${analise.nos[f].uci}`)).sort(),
        narracoes: narracoes.map((n) => `${percurso.indexOf(n.nodeId)}:${n.texto}`).sort(),
      };
    }),
    treinos: aula.fluxo.filter((e) => e.tipo === "treino").map((e) => {
      const t = aula.treinos.find((item) => item.id === e.entidadeId)!;
      return {
        fen: fenDoNo(t.inicio.analiseId, t.inicio.nodeId),
        lado: t.ladoAluno,
        objetivo: t.objetivo,
        abertura: t.introducao ?? null,
        questoes: t.questoes.map((q) => ({
          fen: fenDoNo(q.posicao.analiseId, q.posicao.nodeId),
          respostas: q.respostas.map((r) => ({
            moves: r.moves.join(","), julgamento: r.julgamento === "alternativa" ? "correta" : r.julgamento, feedback: r.feedback,
            fim: r.efeito.tipo === "encerra" ? `encerra:${r.efeito.condicao}` : r.efeito.tipo,
            defesas: (r.efeito.defesas ?? []).map((d) => `${d.move}${d.texto ? `:${d.texto}` : ""}`),
          })).sort((a, b) => a.moves.localeCompare(b.moves)),
        })),
      };
    }),
    praticas: aula.praticas.map((p) => ({ fen: posicoes[p.positionId].fen, lado: p.ladoAluno, objetivo: p.objetivo })),
  };
}

test("o aluno recebe da aula do zero o mesmo que da importação do estudo", async () => {
  const zero = pacotePublicado(AULA);
  const lichess = pacotePublicado("EX-E2E-LICHESS");
  expect(zero, "a aula do zero não foi publicada").not.toBeNull();
  test.skip(!lichess, "a EX-E2E-LICHESS não foi publicada nesta rodada — rode aula-do-lichess.spec.ts antes, na mesma rodada");
  const a = oQueOAlunoRecebe(zero!);
  const b = oQueOAlunoRecebe(lichess!);
  console.log(`[e2e] comparação — zero: ${JSON.stringify({ ...a, capitulos: a.capitulos.map((c) => ({ ...c, narracoes: c.narracoes.length })) })}`);
  console.log(`[e2e] comparação — lichess: ${JSON.stringify({ ...b, capitulos: b.capitulos.map((c) => ({ ...c, narracoes: c.narracoes.length })) })}`);

  // O que o plano exige igual: etapas, posições, lances, respostas aceitas e erros nomeados.
  expect(a.etapas).toEqual(b.etapas);
  expect(a.introducao).toEqual(b.introducao);
  expect(a.capitulos.map(({ fen, lances: l, variantes }) => ({ fen, l, variantes }))).toEqual(b.capitulos.map(({ fen, lances: l, variantes }) => ({ fen, l, variantes })));
  // A importação junta os parágrafos de um comentário numa linha só (o leitor de PGN normaliza os
  // espaços); a tela guarda as quebras. Pendência registrada no diário: compara-se o texto, e conta-se
  // quantas narrações diferem só nisso.
  const semQuebras = (texto: string) => texto.replace(/\s+/g, " ").trim();
  expect(a.capitulos.map((c) => c.narracoes.map(semQuebras))).toEqual(b.capitulos.map((c) => c.narracoes.map(semQuebras)));
  const soQuebras = a.capitulos.flatMap((c, i) => c.narracoes.filter((n, j) => n !== b.capitulos[i].narracoes[j])).length;
  console.log(`[e2e] narrações que diferem só em quebras de linha (a importação as perde): ${soQuebras}`);
  const semTexto = (t: ReturnType<typeof oQueOAlunoRecebe>["treinos"][number]) => ({
    fen: t.fen, lado: t.lado,
    questoes: t.questoes.map((q) => ({ fen: q.fen, respostas: q.respostas.map((r) => ({ moves: r.moves, julgamento: r.julgamento, fim: r.fim, defesas: r.defesas.map((d) => d.split(":")[0]) })) })),
  });
  expect(a.treinos.map(semTexto)).toEqual(b.treinos.map(semTexto));
  expect(a.treinos.map((t) => t.questoes.map((q) => q.respostas.map((r) => r.feedback)))).toEqual(b.treinos.map((t) => t.questoes.map((q) => q.respostas.map((r) => r.feedback))));
  expect(a.praticas).toEqual(b.praticas);
  // O texto de abertura do treino: a importação o escreve, e desde a 10G a janela de autoria também.
  expect(a.treinos.map((t) => t.abertura)).toEqual(b.treinos.map((t) => t.abertura));
});
