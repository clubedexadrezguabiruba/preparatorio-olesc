/**
 * As medidas da `/revisar-aula`, num script só.
 *
 *   node .claude/skills/revisar-aula/medir.mjs N1-KPK
 *
 * **Nenhuma imagem sai daqui.** Tudo o que ele devolve é número e texto, e é de
 * propósito: uma captura custa ~4.800 tokens e é relida a cada turno até o fim
 * da sessão. Quem precisar olhar a arte manda um subagente ler a folha de
 * contato, que a skill gera à parte.
 *
 * **Nenhum número mora aqui.** Os tetos vêm de `docs/VOZ-DO-CURSO.md` §3, pelo
 * `lerRegua`. Duas cópias de um teto seriam duas opiniões sobre a régua.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { lerRegua } from "../../../lib/lesson/voz.ts";
import { duracaoDoRoteiro } from "../../../lib/lesson/roteiro.ts";
import { cookiesDeEnsaio, lerEnv } from "./sessao.mjs";

const AULA = process.argv[2] ?? "N1-KPK";
const BASE = process.env.BASE_DA_REVISAO ?? "http://localhost:3000";
const USUARIO = process.env.USUARIO_DE_ENSAIO ?? "alunoteste";
const TELAS = [
  { nome: "notebook", width: 1366, height: 768 },
  { nome: "celular", width: 390, height: 844 },
];

const regua = lerRegua();
const lesson = JSON.parse(
  readFileSync(path.join(process.cwd(), "content/lessons", `${AULA}.json`), "utf8"),
);

const linhas = [];
const diz = (s) => {
  console.log(s);
  linhas.push(s);
};
const veredito = (ok, texto) => diz(`${ok ? "  ok " : "  ✗  "} ${texto}`);

/* ------------------------------------------------------------------ *
 * Estático — o que se mede no arquivo, sem abrir navegador
 * ------------------------------------------------------------------ */

const CASA = /\b[a-h][1-8]\b/g;

/** As casas que um desenho acende ou aponta. */
const casasDoDesenho = (d) => [
  ...(d.highlights ?? []),
  ...(d.arrows ?? []).flatMap(([de, para]) => [de, para]),
];

diz(`\n## ${AULA} — o que o arquivo diz\n`);

const objective = lesson.stages.objective;
if (objective) {
  // **Observação, e não veredito** (2026-09-09). A faixa de 40 a 70 s saiu da
  // régua a pedido do Doug: a aula dura o que precisar. O número continua
  // impresso porque quem revisa precisa saber se a aula ficou de dois minutos —
  // o que sumiu é a reprovação automática, não a informação.
  const segundos = duracaoDoRoteiro(objective.roteiro) / 1000;
  diz(`  ·   tempo: a aula assistida dura ${segundos.toFixed(1)} s`);

  // Toda casa citada na fala está desenhada NAQUELE passo, e todo desenho é
  // citado. É o quesito "flechas e casas", e é o que impede o texto de apontar
  // para um tabuleiro que não confirma.
  for (const [i, passo] of objective.roteiro.entries()) {
    const citadas = [...new Set(passo.fala.match(CASA) ?? [])];
    const desenhadas = new Set([
      ...casasDoDesenho(passo),
      // O lance do passo desenha a si mesmo: a peça anda, e o chessground acende
      // a origem e o destino como `lastMove`.
      ...(passo.lance ? [passo.lance.slice(0, 2), passo.lance.slice(2, 4)] : []),
    ]);
    const orfas = citadas.filter((c) => !desenhadas.has(c));
    const mudas = casasDoDesenho(passo).filter((c) => !citadas.includes(c));
    if (orfas.length) veredito(false, `passo ${i + 1}: cita ${orfas.join(", ")} e não desenha`);
    if (mudas.length)
      diz(`  ·   passo ${i + 1}: desenha ${mudas.join(", ")} sem citar — conferir no tabuleiro`);
  }
}

const intro = lesson.stages.intro;
const guided = lesson.stages.guided;
if (guided) {
  // Flecha **ou** casa acesa: as duas apontam o alvo, e o passo que só precisa
  // dizer "olhe esta casa" não deve ser obrigado a inventar uma origem para a
  // seta sair de algum lugar. É a mesma régua que a `superRefine` cobra.
  const semDesenho = Object.entries(guided.nodes)
    .filter(([, n]) => !(n.arrows ?? []).length && !(n.highlights ?? []).length)
    .map(([id]) => id);
  veredito(
    semDesenho.length === 0,
    `desenho: ${semDesenho.length ? `sem seta nem casa acesa em ${semDesenho.join(", ")} — conserta-se em objective.roteiro[…].treino` : "toda posição do treino aponta o alvo"}`,
  );

  // A seta que liga a origem ao destino do lance certo é meio lance entregue.
  const entregam = Object.entries(guided.nodes).filter(([, n]) =>
    (n.arrows ?? []).some(([de, para]) =>
      n.expects.some((e) => e.moves.some((m) => m.startsWith(de + para))),
    ),
  );
  veredito(
    entregam.length === 0,
    `flechas: ${entregam.length ? `${entregam.map(([id]) => id).join(", ")} desenham o LANCE, não o alvo` : "nenhuma seta desenha o lance certo"}`,
  );
}

/* ------------------------------------------------------------------ *
 * Ao vivo — o que só a tela responde
 * ------------------------------------------------------------------ */

const cookies = await cookiesDeEnsaio(lerEnv(".env.local"), USUARIO);
const nav = await chromium.launch();

const posicaoNaTela = (pg) =>
  pg.evaluate(() =>
    [...document.querySelectorAll("cg-board piece")]
      .map((p) => `${p.className}@${p.style.transform}`)
      .sort()
      .join("|"),
  );

const rolagem = (pg) =>
  pg.evaluate(() => {
    const r = document.documentElement;
    const dentro = [...document.querySelectorAll("*")]
      .filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1)
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`);
    return { pagina: r.scrollHeight - r.clientHeight, dentro };
  });

/**
 * O centro de uma casa, em pixels da janela. O `cg-board` é o quadrado de 8×8;
 * `a1` fica embaixo à esquerda quando as brancas estão embaixo.
 */
const centroDaCasa = async (pg, casa, orientacao) => {
  const cx = await pg.locator("cg-board").boundingBox();
  const lado = cx.width / 8;
  const coluna = casa.charCodeAt(0) - 97;
  const linha = Number(casa[1]) - 1;
  const x = orientacao === "white" ? coluna : 7 - coluna;
  const y = orientacao === "white" ? 7 - linha : linha;
  return { x: cx.x + (x + 0.5) * lado, y: cx.y + (y + 0.5) * lado };
};

/** Arrasta uma peça de uma casa para outra, como o aluno faz com o dedo. */
const jogar = async (pg, uci, orientacao) => {
  const de = await centroDaCasa(pg, uci.slice(0, 2), orientacao);
  const para = await centroDaCasa(pg, uci.slice(2, 4), orientacao);
  await pg.mouse.move(de.x, de.y);
  await pg.mouse.down();
  await pg.mouse.move(para.x, para.y, { steps: 8 });
  await pg.mouse.up();
  // A promoção abre um seletor: sem escolher a peça, o lance não acontece.
  if (uci.length > 4) {
    const nome = { q: "Dama", r: "Torre", b: "Bispo", n: "Cavalo" }[uci[4]];
    await pg.getByRole("button", { name: nome }).click();
  }
  await pg.waitForTimeout(900);
};

/** A linha do método, do nó raiz até a ponta: só os lances do aluno. */
function lancesDoAluno(guided) {
  const lances = [];
  let id = guided.root;
  while (id) {
    const expect = guided.nodes[id].expects[0];
    lances.push(expect.moves[0]);
    id = expect.next;
  }
  return lances;
}

const irParaAba = async (pg, nome) => {
  const abas = pg.locator("nav[aria-label] button");
  for (let i = 0; i < (await abas.count()); i += 1) {
    if (((await abas.nth(i).textContent()) ?? "").includes(nome)) {
      await abas.nth(i).click();
      await pg.waitForTimeout(500);
      return;
    }
  }
  throw new Error(`aba "${nome}" não encontrada`);
};

for (const tela of TELAS) {
  const ctx = await nav.newContext({ viewport: { width: tela.width, height: tela.height } });
  await ctx.addCookies(cookies);
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/finais/${AULA}`, { waitUntil: "networkidle" });
  await pg.waitForSelector("cg-board piece");

  diz(`\n## ${tela.nome} — ${tela.width}×${tela.height}\n`);
  diz(`  abas: ${(await pg.$$eval("nav[aria-label] button", (b) => b.map((x) => x.textContent.trim()))).join(" | ")}`);

  /*
   * --- etapa 1: a apresentação, a única que o ALUNO faz andar ---
   *
   * Ela não tem relógio: quem avança é a seta. O que se mede aqui é que ela
   * anda com `→` e volta com `←`, e que a tela não rola — que é onde os
   * rótulos de quatro abas em 390 px costumam quebrar a promessa da §5.1.
   */
  if (intro) {
    const larguraDaTrilha = await pg.evaluate(() => {
      const nav = document.querySelector("nav[aria-label]");
      return nav ? { rola: nav.scrollWidth - nav.clientWidth, alt: Math.round(nav.getBoundingClientRect().height) } : null;
    });
    const r0 = await rolagem(pg);
    veredito(
      r0.pagina === 0 && r0.dentro.length === 0,
      `experiência: rolagem na apresentação ${r0.pagina} px${r0.dentro.length ? ` · rola por dentro: ${r0.dentro.join(", ")}` : ""}`,
    );
    diz(`  ·   a trilha das abas ocupa ${larguraDaTrilha?.alt} px de altura e transborda ${larguraDaTrilha?.rola} px de largura`);

    /*
     * A fala da apresentação sai do **Comentário**, e não do `FeedbackPanel`:
     * `[role="status"]` é do painel do treino, e ali ele nem existe — lido na
     * apresentação, ele devolvia string vazia nas duas leituras e o quesito
     * reprovava sempre, sem nunca ter olhado a fala. A página invisível do
     * balão é a que carrega o texto INTEIRO, pronto, antes de a máquina de
     * escrever terminar; é ela que responde à pergunta "mudou de passo?".
     */
    const falaDoBalao = () =>
      pg.evaluate(
        () => document.querySelector("span.invisible")?.textContent?.trim() ?? "",
      );
    const esperarFala = async (diferenteDe) => {
      for (let i = 0; i < 30; i += 1) {
        const agora = await falaDoBalao();
        if (agora && agora !== diferenteDe) return agora;
        await pg.waitForTimeout(100);
      }
      return falaDoBalao();
    };
    const primeiraFala = await falaDoBalao();
    await pg.keyboard.press("ArrowRight");
    const segundaFala = await esperarFala(primeiraFala);
    await pg.keyboard.press("ArrowLeft");
    const deVolta = await esperarFala(segundaFala);
    veredito(primeiraFala !== segundaFala, "a apresentação anda com `→`");
    veredito(deVolta === primeiraFala, "a apresentação volta com `←`");

    await irParaAba(pg, "Aula");
  } else {
    diz("  ·   sem apresentação: a aula declara a ausência dela no arquivo");
  }

  // --- etapa 2: ela anda sozinha, e ninguém clicou ---
  const antes = await posicaoNaTela(pg);
  const r1 = await rolagem(pg);
  await pg.waitForTimeout(20000);
  const depois = await posicaoNaTela(pg);
  veredito(antes !== depois, "a aula assistida anda sozinha (posição diferente em 0 s e 20 s)");
  veredito(r1.pagina === 0 && r1.dentro.length === 0,
    `experiência: rolagem na aula ${r1.pagina} px${r1.dentro.length ? ` · rola por dentro: ${r1.dentro.join(", ")}` : ""}`);

  // O comentário nunca pagina: se paginou, a fala passou do teto da régua.
  const paginou = await pg.$$eval('p[class*="text-tinta-muda"] span.sr-only', (n) => n.length > 0);
  veredito(!paginou, `tempo: o comentário ${paginou ? "PAGINOU — a fala passou do teto" : "nunca paginou"}`);

  // Pausar segura de verdade.
  await pg.getByRole("button", { name: "Pausar" }).click();
  const parado = await posicaoNaTela(pg);
  await pg.waitForTimeout(10000);
  veredito((await posicaoNaTela(pg)) === parado, "\"Pausar\" segura por 10 s");

  /*
   * --- etapa 3: nasce com flecha, e sem botão de dica ---
   *
   * **A aula que não tiver esta etapa declara a ausência dela no arquivo, e a
   * ausência não é falta.** Os formatos `completa`/`curta`/`leitura` saíram da
   * trilha em 9/9/2026: um formato só, quatro etapas, e a exceção se escreve.
   * Medir o que a aula não tem é reprová-la por não ser outra aula.
   *
   * Com a etapa 3 **derivada** do roteiro (`lib/lesson/derivar-treino.ts`), a
   * ausência dela passou a ser rara: ela existe sempre que a aula tiver aula.
   */
  if (guided) {
    await irParaAba(pg, "Treino");
    const setas = await pg.$$eval("cg-container svg line", (n) => n.length);
    const dica = await pg.$$eval("button", (b) => b.filter((x) => /dica/i.test(x.textContent ?? "")).length);
    const r2 = await rolagem(pg);
    veredito(setas > 0, `flechas: ${setas} seta(s) no DOM sem nenhum clique`);
    veredito(dica === 0, `um caminho só: ${dica} botão(ões) com a palavra "dica"`);
    veredito(r2.pagina === 0 && r2.dentro.length === 0,
      `experiência: rolagem no treino ${r2.pagina} px${r2.dentro.length ? ` · rola por dentro: ${r2.dentro.join(", ")}` : ""}`);
    diz(`  ·   a fala do professor: "${await pg.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim().slice(0, 120))}"`);

    /*
     * **O treino é jogado até o fim, com a mão.** Nenhuma medida de DOM prova que
     * a linha do arquivo é jogável na tela: o defensor responde, a promoção abre
     * um seletor, e um `expects` mal escrito só aparece quando alguém arrasta a
     * peça. Aqui alguém arrasta.
     */
    for (const uci of lancesDoAluno(guided)) await jogar(pg, uci, lesson.orientation);
    const fim = await pg.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? "");
    veredito(
      fim.startsWith("Pronto."),
      `coerência: o treino foi jogado até o fim — "${fim.slice(0, 100)}"`,
    );
  } else {
    diz("  ·   sem treino: a aula é curta — objetivo e prática, e a aba não existe");
  }

  // --- etapa 4: continua nua ---
  await irParaAba(pg, "Prática real");
  await pg.waitForTimeout(1500);
  const nua = await pg.$$eval("cg-container svg line, cg-container svg circle", (n) => n.length);
  const r3 = await rolagem(pg);
  veredito(nua === 0, `flechas: ${nua} desenho(s) na prática real — tem de ser zero`);
  veredito(r3.pagina === 0 && r3.dentro.length === 0,
    `experiência: rolagem na prática real ${r3.pagina} px${r3.dentro.length ? ` · rola por dentro: ${r3.dentro.join(", ")}` : ""}`);

  /*
   * Alvos: **só botão, e o mínimo muda com o que aponta**. 44 px onde há dedo
   * (WCAG 2.5.5, AAA), 24 onde há ponteiro (2.5.8, AA) — os dois números vêm da
   * régua. Link de texto no meio de uma linha de texto é a exceção "inline" da
   * própria norma; cobrar 44 px do "← Finais" empurraria o cabeçalho para fora
   * do palco, que é trocar uma regra por outra.
   */
  const minimo = tela.width < 1024 ? regua.alvoDeToquePx : regua.alvoDePonteiroPx;
  const pequenos = await pg.evaluate((m) => {
    return [...document.querySelectorAll("button")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ t: e.textContent.trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) }))
      .filter((x) => x.h < m && x.h > 0);
  }, minimo);
  veredito(
    pequenos.length === 0,
    `experiência: botões abaixo de ${minimo} px — ${pequenos.length ? pequenos.map((p) => `"${p.t}" ${p.h}px`).join(", ") : "nenhum"}`,
  );

  await ctx.close();
}
await nav.close();

diz(`\n${linhas.filter((l) => l.startsWith("  ✗")).length} quesito(s) reprovado(s).`);
