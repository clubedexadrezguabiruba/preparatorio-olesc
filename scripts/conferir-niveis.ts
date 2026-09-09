import { chromium, type Page } from "playwright";

/**
 * As telas da escada de níveis, medidas no navegador de verdade.
 *
 *     npm run dev
 *     node scripts/aluno-de-teste.ts criar
 *     npm run niveis:tela
 *
 * ## O que ele prova, e por que não dá para provar com `npm test`
 *
 * A regra do nível já tem teste puro (`lib/curso/nivel.test.ts`), e ele cobre a
 * escada inteira. O que aquele teste **não** alcança é o que o navegador
 * resolve: o painel ganhou uma faixa com três barras e um cartão de próximo
 * passo, e a `/trilha` passou de quatro degraus para cinco. As duas telas são
 * lidas no celular do aluno, e a promessa que elas fazem é **não rolar para o
 * lado**.
 *
 * Rolagem horizontal a 360 px é o defeito que ninguém vê no notebook e que
 * torna a tela inutilizável no celular: metade de cada linha some, e a criança
 * não sabe que pode arrastar. O `scrollWidth === 360` é a régua, e ela é
 * binária — não há "um pouquinho".
 *
 * ## Por que 360, e como se chega lá nesta máquina
 *
 * 360×740 é o celular do aluno. Este script usa `newContext({ viewport })` num
 * Chromium **headless**, que obedece; o `browser_resize` do Playwright MCP
 * numa janela visível não obedece (a janela do Chrome tem largura mínima de
 * ~540 px) — se você for medir à mão, é a emulação por CDP que funciona.
 *
 * ## Por que ele entra como aluno
 *
 * As duas telas leem o progresso e redirecionam quem não tem sessão. A conta é
 * a de ensaio (`scripts/aluno-de-teste.ts`), a mesma do ensaio de sábado.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const USUARIO = "alunoteste";
const PIN = "112233";

const TELAS = [
  { nome: "celular", width: 360, height: 740 },
  { nome: "notebook", width: 1366, height: 637 },
] as const;

const ROTAS = ["/painel", "/trilha", "/tatica", "/aberturas"] as const;

type Falha = { onde: string; o_que: string };

async function entrar(pagina: Page): Promise<void> {
  await pagina.goto(`${BASE}/entrar`);
  await pagina.fill('input[name="usuario"]', USUARIO);
  await pagina.fill('input[name="pin"]', PIN);
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 20_000 });
}

/**
 * Tudo o que interessa, numa leitura só do DOM.
 *
 * `maisLargo` existe porque `scrollWidth` diz **que** rolou e não **o quê**:
 * com 85 pastilhas na `/trilha`, achar o elemento culpado a olho é meia hora.
 * Ele devolve o primeiro elemento que ultrapassa a largura da janela, com o
 * texto para reconhecê-lo.
 */
async function medir(pagina: Page, largura: number) {
  return pagina.evaluate((largura) => {
    const raiz = document.documentElement;
    let culpado: { tag: string; classe: string; largura: number; texto: string } | null = null;

    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const caixa = el.getBoundingClientRect();
      if (caixa.right <= largura + 0.5 && caixa.left >= -0.5) continue;
      if (caixa.width === 0) continue;
      culpado = {
        tag: el.tagName.toLowerCase(),
        classe: el.className.toString().slice(0, 70),
        largura: Math.round(caixa.width),
        texto: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50),
      };
      break;
    }

    return {
      scrollWidth: raiz.scrollWidth,
      rolagemVertical: raiz.scrollHeight - raiz.clientHeight,
      culpado,
      titulo: document.querySelector("h1")?.textContent?.trim() ?? null,
      /*
       * O que o painel promete de novo: a faixa do nível e o cartão de passo.
       *
       * A busca é **sem caixa** porque o `innerText` do Chrome aplica o
       * `text-transform: uppercase` da classe `rotulo` — a primeira versão
       * deste script procurou "Próximo passo" e acusou uma falha que não
       * existia, contra uma tela que dizia "PRÓXIMO PASSO".
       */
      dizNivel: /n[ií]vel \d de 5/i.test(document.body.innerText),
      dizProximoPasso: /pr[oó]ximo passo/i.test(document.body.innerText),
      degraus: document.querySelectorAll("section[aria-current], main > section").length,
    };
  }, largura);
}

async function conferir(falhas: Falha[]): Promise<void> {
  const navegador = await chromium.launch();

  for (const tela of TELAS) {
    const contexto = await navegador.newContext({
      viewport: { width: tela.width, height: tela.height },
    });
    const pagina = await contexto.newPage();

    try {
      await entrar(pagina);

      for (const rota of ROTAS) {
        await pagina.goto(`${BASE}${rota}`);
        await pagina.waitForLoadState("networkidle");
        // O crachá do `next dev` é `position: fixed` e não muda medida nenhuma,
        // mas a 360 px ele cobre o rodapé e atrapalha a captura.
        await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await pagina.waitForTimeout(150);

        const m = await medir(pagina, tela.width);
        const onde = `${rota} @ ${tela.nome}`;

        console.log(
          `\n  ${onde}` +
            `\n    scrollWidth ........ ${m.scrollWidth} px (esperado ${tela.width})` +
            `\n    rolagem vertical ... ${m.rolagemVertical} px` +
            `\n    h1 ................. ${m.titulo}`,
        );

        if (m.scrollWidth !== tela.width) {
          const c = m.culpado;
          console.log(
            `    ESTOUROU: ${c ? `<${c.tag} class="${c.classe}"> ${c.largura} px — "${c.texto}"` : "não achei o elemento"}`,
          );
          falhas.push({
            onde,
            o_que: `scrollWidth ${m.scrollWidth} > ${tela.width}${c ? ` — <${c.tag}> "${c.texto}"` : ""}`,
          });
        }

        if (rota === "/painel") {
          console.log(`    faixa do nível ..... ${m.dizNivel ? "sim" : "NÃO"}`);
          console.log(`    próximo passo ...... ${m.dizProximoPasso ? "sim" : "NÃO"}`);
          if (!m.dizNivel) falhas.push({ onde, o_que: 'o painel não diz "Nível N de 5"' });
          if (!m.dizProximoPasso) falhas.push({ onde, o_que: 'o painel não tem "Próximo passo"' });
        }

        if (rota === "/tatica") await travaMole(pagina, tela.nome, falhas);
      }
    } finally {
      await contexto.close();
    }
  }

  await navegador.close();
}

/**
 * A trava é mole: um tema de nível acima **abre**.
 *
 * É a promessa que mais fácil se perde numa refatoração — basta alguém trocar
 * um `podeAbrir` por uma comparação à mão numa tela, e o aluno forte fica
 * preso sem que nenhum teste puro reclame. A prova é clicar.
 *
 * `quietMove` é do bloco 7, nível 5. Com a conta de ensaio zerada (nível 1),
 * ele é o caso extremo: quatro degraus acima.
 */
async function travaMole(pagina: Page, tela: string, falhas: Falha[]): Promise<void> {
  const onde = `trava mole @ ${tela}`;

  const pastilha = await pagina.evaluate(() =>
    /nível \d+ — você está no \d+/i.test(document.body.innerText),
  );
  console.log(`    pastilha "adiante" . ${pastilha ? "sim" : "NÃO"}`);
  if (!pastilha) {
    falhas.push({ onde, o_que: 'a /tatica não diz "Nível N — você está no M"' });
  }

  await pagina.goto(`${BASE}/tatica/quietMove`);
  await pagina.waitForLoadState("networkidle");
  const abriu = await pagina.evaluate(() => ({
    url: location.pathname,
    temTabuleiro: document.querySelector("cg-board, .aula-tabuleiro") !== null,
    texto: document.body.innerText.slice(0, 120).replace(/\s+/g, " "),
  }));

  console.log(
    `    /tatica/quietMove .. ${abriu.url}${abriu.temTabuleiro ? " (com tabuleiro)" : ""}`,
  );
  if (abriu.url !== "/tatica/quietMove") {
    falhas.push({ onde, o_que: `um tema do nível 5 redirecionou para ${abriu.url}` });
  }
  if (!abriu.temTabuleiro) {
    falhas.push({ onde, o_que: `um tema do nível 5 abriu sem tabuleiro: "${abriu.texto}"` });
  }
}

const falhas: Falha[] = [];
console.log(`\nMedindo as telas da escada em ${BASE}`);
await conferir(falhas);

if (falhas.length) {
  console.error(`\n${falhas.length} problema(s):`);
  for (const f of falhas) console.error(`  ${f.onde}: ${f.o_que}`);
  process.exit(1);
}
console.log("\nAs quatro telas cabem nos dois viewports, sem rolagem horizontal.");
