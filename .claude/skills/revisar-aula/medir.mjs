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
import { readFileSync, existsSync } from "node:fs";
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

/* ------------------------------------------------------------------ *
 * v1 ou v2 — a mesma medida, duas formas de arquivo (porte de 18/9/2026)
 *
 * Este script lia `lesson.stages.objective.roteiro`, `stages.intro` e
 * `stages.guided`, que são a forma **v1**. As 11 aulas de finais publicadas em
 * 17/9 são **v2**, e nelas nada disso existe — o script devolvia "sem
 * apresentação / sem treino" em todas, e a `/revisar-aula` estava cega para o
 * módulo inteiro.
 *
 * O porte não reescreve as medidas: ele traduz o pacote v2 para a mesma forma
 * que as medidas já sabiam ler, usando `lerPacoteDoAluno`, que é **a função que
 * o site usa** para montar a aula. Medir por uma tradução própria seria medir
 * uma aula que ninguém vê.
 * ------------------------------------------------------------------ */

/** Os nomes das abas da v1, onde há uma etapa de cada tipo e o rótulo é sempre o mesmo. */
const ABAS_V1 = { intro: ["Apresentação"], capitulo: ["Aula"], treino: ["Treino"], pratica: ["Prática real"] };

/** A aula na forma que as medidas leem: `{ orientation, intro, objective, guided, abas }`. */
async function lerAulaParaMedir(id) {
  const v1 = path.join(process.cwd(), "content/lessons", `${id}.json`);
  const temV2 = existsSync(path.join(process.cwd(), "content/aulas-v2", id));
  if (!temV2 && existsSync(v1)) {
    const lesson = JSON.parse(readFileSync(v1, "utf8"));
    return { versao: 1, orientation: lesson.orientation, ...lesson.stages, abas: ABAS_V1 };
  }

  /*
   * `conteudo.ts` (o `lerPacoteDoAluno` que a página usa) abre com `import "server-only"`, e
   * fora do Next isso estoura na hora. `conteudo-v2.ts` é o irmão dele sem essa importação,
   * escrito exatamente para este caso — e é o mesmo `pacoteAtivoDoAluno` que a página chama.
   */
  const { pacoteAtivoDoAluno } = await import("../../../lib/finais/conteudo-v2.ts");
  const { aulaDoAlunoV2 } = await import("../../../lib/editor-v2/fluxo-do-aluno.ts");
  const pacote = pacoteAtivoDoAluno(id);
  if (!pacote) throw new Error(`${id}: nem v1 em content/lessons/ nem v2 publicada em content/aulas-v2/`);
  const doAluno = aulaDoAlunoV2(pacote);

  const etapas = doAluno.etapas;
  const capitulos = etapas.filter((e) => e.tipo === "capitulo");
  const introducoes = etapas.filter((e) => e.tipo === "introducao");
  const treinos = etapas.filter((e) => e.tipo === "treino");

  /*
   * A v2 tem **vários** capítulos e **vários** treinos, e a v1 tinha um de cada. As medidas de
   * passo (casa citada, desenho mudo) valem para todos, então o `roteiro` é a concatenação, com
   * o nome do capítulo na frente de cada passo para o relatório dizer onde.
   */
  const roteiro = capitulos.flatMap((capitulo) => capitulo.passos.map((passo) => ({
    onde: capitulo.titulo,
    fala: passo.fala,
    ...(passo.lance ? { lance: passo.lance } : {}),
    ...(passo.espera ? { espera: passo.espera } : {}),
    arrows: (passo.desenhos?.arrows ?? []).map((s) => (Array.isArray(s) ? s : [s.de, s.para])),
    highlights: (passo.desenhos?.highlights ?? []).map((c) => (typeof c === "string" ? c : c.casa)),
  })));

  /*
   * Os treinos, na forma do `guided` da v1: `nodes[id] = { arrows, highlights, expects }`. A
   * **ordem** importa — é ela que diz qual é o treino 1 —, e por isso o id do nó leva o número
   * do treino na frente.
   */
  const nodes = {};
  const linhaDosTreinos = [];
  treinos.forEach((treino, n) => {
    const jogavel = treino.jogavel;
    const doTreino = [];
    for (const [questaoId, node] of Object.entries(jogavel.tree.nodes)) {
      const desenho = jogavel.desenhos?.[questaoId];
      nodes[`t${n + 1}/${questaoId}`] = {
        arrows: (desenho?.arrows ?? []).map((s) => (Array.isArray(s) ? s : [s.de, s.para])),
        highlights: (desenho?.highlights ?? []).map((c) => (typeof c === "string" ? c : c.casa)),
        expects: node.expects,
        treino: n + 1,
      };
    }
    // A linha do método deste treino, para o Playwright jogá-la com o mouse.
    let id = jogavel.tree.root;
    const vistos = new Set();
    while (id && jogavel.tree.nodes[id] && !vistos.has(id)) {
      vistos.add(id);
      const expect = jogavel.tree.nodes[id].expects[0];
      if (!expect) break;
      doTreino.push(expect.moves[0]);
      id = expect.next;
    }
    linhaDosTreinos.push({ rotulo: treino.rotulo, orientacao: jogavel.orientacao, lances: doTreino });
  });

  return {
    versao: 2,
    orientation: doAluno.orientacao,
    intro: introducoes.length ? { passos: introducoes.flatMap((i) => i.passos) } : undefined,
    objective: roteiro.length ? { roteiro } : undefined,
    guided: Object.keys(nodes).length ? { nodes, root: null } : undefined,
    linhaDosTreinos,
    /*
     * **Os rótulos das abas não são fixos na v2.** `rotuloDe` (em `fluxo-do-aluno.ts`) usa
     * "Aula"/"Treino"/"Prática real" só quando há **um** de cada; com vários, a aba leva o
     * título do capítulo. As 11 aulas de finais têm vários — procurar a aba "Aula" nelas não
     * acha nada. Então quem diz o nome da aba é a própria aula.
     */
    abas: {
      intro: introducoes.map((e) => e.rotulo),
      capitulo: capitulos.map((e) => e.rotulo),
      treino: treinos.map((e) => e.rotulo),
      pratica: etapas.filter((e) => e.tipo === "pratica").map((e) => e.rotulo),
    },
  };
}

const lesson = await lerAulaParaMedir(AULA);

const linhas = [];
const diz = (s) => {
  console.log(s);
  linhas.push(s);
};
const veredito = (ok, texto) => diz(`${ok ? "  ok " : "  ✗  "} ${texto}`);

/* ------------------------------------------------------------------ *
 * Estático — o que se mede no arquivo, sem abrir navegador
 * ------------------------------------------------------------------ */

/**
 * A casa citada numa fala — **inclusive dentro de um lance escrito em português**.
 *
 * `\b[a-h][1-8]\b` não lê `Re7`: entre o `R` e o `e` não há fronteira de palavra. Numa aula
 * que escreve os lances em português, isso acusava a fala de não citar a casa que ela citou.
 * É a mesma expressão de `lib/editor-v2/regua-de-desenho.ts`, pelo mesmo motivo.
 */
const CASA = /(?<![\p{L}\p{N}])(?:[RDTBCKQN]|[a-h])?x?([a-h][1-8])(?![\p{L}\p{N}])/gu;
const casasCitadas = (fala) => [...new Set([...fala.matchAll(CASA)].map((m) => m[1]))];

/** As casas que um desenho acende ou aponta. */
const casasDoDesenho = (d) => [
  ...(d.highlights ?? []),
  ...(d.arrows ?? []).flatMap(([de, para]) => [de, para]),
];

diz(`\n## ${AULA} — o que o arquivo diz (aula v${lesson.versao})\n`);

const objective = lesson.objective;
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
    const citadas = casasCitadas(passo.fala);
    const desenhadas = new Set([
      ...casasDoDesenho(passo),
      // O lance do passo desenha a si mesmo: a peça anda, e o chessground acende
      // a origem e o destino como `lastMove`.
      ...(passo.lance ? [passo.lance.slice(0, 2), passo.lance.slice(2, 4)] : []),
    ]);
    const onde = passo.onde ? `${passo.onde}, passo ${i + 1}` : `passo ${i + 1}`;
    const orfas = citadas.filter((c) => !desenhadas.has(c));
    // Só a casa **acesa** paga o teto da citação: uma seta é uma linha, e a fala que diz
    // "a torre fecha a coluna b" não tem de soletrar b1 e b8 (medido em 18/9, ver
    // `lib/editor-v2/regua-de-desenho.ts`).
    const mudas = (passo.highlights ?? []).filter((c) => !citadas.includes(c));
    if (orfas.length) veredito(false, `${onde}: cita ${orfas.join(", ")} e não desenha`);
    if (mudas.length)
      diz(`  ·   ${onde}: acende ${mudas.join(", ")} sem citar — conferir no tabuleiro`);
  }
}

const intro = lesson.intro;
const guided = lesson.guided;
if (guided) {
  /*
   * **O apoio cai por degraus** (`COMO-FAZER` §1.1, 17/9/2026), e esta medida mudou com ele.
   * Antes ela cobrava "todo nó do treino aponta o alvo", que foi escrito quando a aula tinha um
   * treino só. Hoje: treino 1 aponta em todo nó; do treino 2 em diante, nenhum aponta.
   *
   * Flecha **ou** casa acesa: as duas apontam o alvo, e o passo que só precisa dizer "olhe esta
   * casa" não deve ser obrigado a inventar uma origem para a seta sair de algum lugar.
   */
  const aponta = (n) => (n.arrows ?? []).length > 0 || (n.highlights ?? []).length > 0;
  const nos = Object.entries(guided.nodes);
  const numeros = [...new Set(nos.map(([, n]) => n.treino ?? 1))].sort((a, b) => a - b);
  const primeiro = numeros[0] ?? 1;

  const nusNoPrimeiro = nos.filter(([, n]) => (n.treino ?? 1) === primeiro && !aponta(n)).map(([id]) => id);
  veredito(
    nusNoPrimeiro.length === 0,
    `desenho: ${nusNoPrimeiro.length ? `no treino 1, sem seta nem casa acesa em ${nusNoPrimeiro.join(", ")} — o desenho mora no comentário daquele lance no PGN` : "no treino 1, toda posição aponta o alvo"}`,
  );

  const apontamDepois = nos.filter(([, n]) => (n.treino ?? 1) !== primeiro && aponta(n)).map(([id]) => id);
  veredito(
    apontamDepois.length === 0,
    `desenho: ${apontamDepois.length ? `do treino 2 em diante o alvo não é apontado, e ${apontamDepois.join(", ")} apontam` : "do treino 2 em diante, o aluno busca sem alvo aceso"}`,
  );

  // A seta que liga a origem ao destino do lance certo é meio lance entregue.
  const entregam = nos.filter(([, n]) =>
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

/**
 * A linha do método de cada treino, do nó raiz até a ponta: só os lances do aluno.
 *
 * Na v2 ela já vem montada em `lesson.linhaDosTreinos` (a aula tem vários treinos, e cada um
 * tem a sua orientação). Na v1 há um treino só, e ele nasce aqui.
 */
function linhasParaJogar(lesson) {
  if (lesson.linhaDosTreinos) return lesson.linhaDosTreinos;
  const guided = lesson.guided;
  if (!guided?.root) return [];
  const lances = [];
  let id = guided.root;
  while (id) {
    const expect = guided.nodes[id].expects[0];
    lances.push(expect.moves[0]);
    id = expect.next;
  }
  return [{ rotulo: "Treino", orientacao: lesson.orientation, lances }];
}

/**
 * Vai para a primeira etapa cujo rótulo esteja em `nomes`. Recebe uma **lista** porque na v2 o
 * rótulo é o título do capítulo quando há mais de um (ver `abas`, acima).
 *
 * **A v2 não tem abas, e isto quase passou em branco.** A v1 tem uma linha de quatro abas
 * ("Apresentação · Aula · Treino · Prática real"); a v2 tem um **passo a passo** com um botão
 * "Etapas N/M" que abre a lista inteira. Quem descobriu foi o `aluno-de-ensaio`, em 18/9: ele
 * procurava aba e não achava etapa nenhuma em nenhuma das 11 aulas. Os itens da lista não têm
 * `role="menuitem"` — são `<button>` dentro de `<li>`.
 */
const irParaAba = async (pg, nomes) => {
  const lista = Array.isArray(nomes) ? nomes : [nomes];
  const abridor = pg.locator("nav[aria-label] button").first();
  if (!(await abridor.count())) { diz(`  ·   sem navegação de etapas na tela — "${lista.join(" / ")}" não foi medida`); return false; }

  // v1: as abas são os próprios botões do `nav`, sem menu para abrir.
  const direto = pg.locator("nav[aria-label] button");
  for (const nome of lista) {
    for (let i = 0; i < (await direto.count()); i += 1) {
      const texto = (await direto.nth(i).textContent()) ?? "";
      if (texto.includes(nome) && !/^Etapas\s/.test(texto.trim())) {
        await direto.nth(i).click();
        await pg.waitForTimeout(700);
        return true;
      }
    }
  }

  // v2: abrir o menu "Etapas" e escolher lá dentro.
  if ((await abridor.getAttribute("aria-expanded")) !== "true") await abridor.click();
  await pg.waitForTimeout(400);
  const itens = pg.locator("nav[aria-label] li button, nav[aria-label] [role='menuitem']");
  for (const nome of lista) {
    for (let i = 0; i < (await itens.count()); i += 1) {
      if (((await itens.nth(i).textContent()) ?? "").includes(nome)) {
        await itens.nth(i).click();
        await pg.waitForTimeout(1500);
        return true;
      }
    }
  }
  if ((await abridor.getAttribute("aria-expanded")) === "true") await abridor.click();
  diz(`  ·   etapa "${lista.join(" / ")}" não encontrada — esta etapa não foi medida`);
  return false;
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

    await irParaAba(pg, lesson.abas.capitulo);
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
    await irParaAba(pg, lesson.abas.treino);
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
    const linhas = linhasParaJogar(lesson);
    const primeira = linhas[0];
    if (primeira) {
      for (const uci of primeira.lances) await jogar(pg, uci, primeira.orientacao ?? lesson.orientation);
      const fim = await pg.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? "");
      veredito(
        fim.startsWith("Pronto."),
        `coerência: «${primeira.rotulo}» foi jogado até o fim — "${fim.slice(0, 100)}"`,
      );
    }
    // Os outros treinos existem e têm linha montada; quem os joga com a mão é o
    // `aluno-de-ensaio`, que erra de propósito. Aqui fica o número, para o relatório.
    if (linhas.length > 1) diz(`  ·   a aula tem ${linhas.length} treinos; este script joga o 1º — o resto é do /aluno-de-ensaio`);
  } else {
    diz("  ·   sem treino: a aula é curta — objetivo e prática, e a aba não existe");
  }

  // --- etapa 4: continua nua ---
  // Desde 15/9 a aula pode não ter prática (trava 9): etapa ausente não é defeito.
  if (await irParaAba(pg, lesson.abas.pratica)) {
    await pg.waitForTimeout(1500);
    const nua = await pg.$$eval("cg-container svg line, cg-container svg circle", (n) => n.length);
    const r3 = await rolagem(pg);
    veredito(nua === 0, `flechas: ${nua} desenho(s) na prática real — tem de ser zero`);
    veredito(r3.pagina === 0 && r3.dentro.length === 0,
      `experiência: rolagem na prática real ${r3.pagina} px${r3.dentro.length ? ` · rola por dentro: ${r3.dentro.join(", ")}` : ""}`);
  }

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
