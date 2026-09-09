import { chromium, type Page } from "playwright";

/**
 * A tela de tática no palco, medida no navegador de verdade.
 *
 *     npm run dev
 *     npm run tatica:tela            (mateIn1, nos dois viewports)
 *     node scripts/conferir-tatica.ts fork
 *
 * ## O que ele prova, e por que não dá para provar com `npm test`
 *
 * A fala do professor e o cartão de comando já têm teste puro em
 * `lib/tatica/fala.test.ts`. O que aquele teste **não** alcança é a única
 * promessa que o palco faz: **a página não rola**, e o tabuleiro é dimensionado
 * pela altura que sobra. Isso é layout resolvido pelo navegador a partir de
 * `100dvh`, e não existe fora dele.
 *
 * O comentário em `app/globals.css` registra que a conta do palco já foi errada
 * uma vez por 8 px, e que 8 px devolvem a rolagem. É esse erro que este script
 * pega.
 *
 * ## Por que ele entra como aluno
 *
 * `/tatica/[tema]` lê o progresso do aluno para escolher a etapa e os puzzles,
 * e redireciona quem não tem sessão. A conta é a de ensaio
 * (`scripts/aluno-de-teste.ts`), a mesma do ensaio geral de sábado.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const USUARIO = "alunoteste";
const PIN = "112233";

/**
 * Os dois viewports que decidem, e por que são estes.
 *
 * 360×740 é o celular do aluno, e é onde o piso de `36rem` do palco entra em
 * cena — ali a promessa de não rolar **cede de propósito**, e o que se mede é
 * quanto. 1366×768 é o notebook da escola; descontando o cromo do navegador
 * sobram ~637 px de viewport, que é a janela em que a coluna única de antes
 * rolava 315 px.
 */
const TELAS = [
  { nome: "celular", width: 360, height: 740, rolagemAceita: 90 },
  { nome: "notebook", width: 1366, height: 637, rolagemAceita: 0 },
] as const;

type Falha = { onde: string; o_que: string };

async function entrar(pagina: Page): Promise<void> {
  await pagina.goto(`${BASE}/entrar`);
  await pagina.fill('input[name="usuario"]', USUARIO);
  await pagina.fill('input[name="pin"]', PIN);
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 20_000 });
}

/**
 * O `<cg-board>` não vem do servidor: o `ChessBoard` entrega uma `<div>` vazia
 * e o chessground a preenche num efeito, no cliente. Medir antes disso mede o
 * HTML, e não a tela.
 *
 * Devolve `false` quando não há tabuleiro nenhum a esperar — o tema concluído,
 * ou a revisão do dia com a fila vazia. São telas legítimas, e sem palco: não
 * há o que medir, e estourar ali confundiria "não deu para conferir" com
 * "conferiu e está errado".
 */
async function tabuleiroPronto(pagina: Page): Promise<boolean> {
  try {
    await pagina.locator("cg-board").first().waitFor({ state: "attached", timeout: 15_000 });
  } catch {
    return false;
  }
  /*
   * O crachá do `next dev` fora do caminho.
   *
   * Ele é um `<nextjs-portal>` fixo no canto de baixo, e num viewport de 360 px
   * ele cobre o rodapé do painel — o Playwright recusa o clique dizendo que o
   * portal "intercepts pointer events". É artefato do servidor de
   * desenvolvimento e não existe em produção; escondê-lo devolve a tela que o
   * aluno vê. As medidas de altura não mudam: ele é `position: fixed`.
   */
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  // O palco resolve a largura do tabuleiro a partir de `--aula-teto`; um quadro
  // de folga evita medir o estado intermediário do primeiro layout.
  await pagina.waitForTimeout(250);
  return true;
}

/** Tudo o que interessa, numa leitura só do DOM. */
async function medir(pagina: Page) {
  return pagina.evaluate(() => {
    const caixa = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
    const palco = caixa(".aula-palco");
    const tabuleiro = caixa(".aula-tabuleiro");
    const balao = document.querySelector(".aula-painel .relative.min-h-0.flex-1");
    const cartao = document.querySelector<HTMLElement>('[aria-live="polite"]');
    /*
     * O retrato é escondido por CSS (`hidden lg:block`), e não removido do DOM.
     * Procurá-lo com `querySelector` diria "está lá" nos dois viewports — foi o
     * que a primeira versão deste script fez, e ela acusou uma falha que não
     * existia. Quem responde de verdade é a caixa desenhada.
     */
    const retrato = document.querySelector<HTMLElement>('img[src*="professor"]');
    const larguraDoRetrato = retrato ? Math.round(retrato.getBoundingClientRect().width) : 0;
    return {
      rolagem: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      palco: palco ? Math.round(palco.height) : null,
      tabuleiro: tabuleiro ? Math.round(tabuleiro.width) : null,
      balao: balao ? Math.round(balao.getBoundingClientRect().height) : null,
      cartao: cartao?.textContent?.trim() ?? null,
      /** O tom do cartão sai da borda, que é onde ele é pintado. */
      cartaoRuim: Boolean(cartao?.className.includes("border-erro-superficie")),
      professorVisivel: larguraDoRetrato > 0,
      botoes: [...document.querySelectorAll(".aula-painel button")]
        .map((b) => b.textContent?.trim() ?? "")
        .filter((t) => t.length > 0 && !t.includes("som")),
    };
  });
}

/**
 * Um lance **legal e errado**, que é o único que chega ao juiz.
 *
 * O caminho curto — arrastar uma peça para qualquer lugar — não serve: o
 * chessground só entrega lances que estão em `dests`, e um arrasto ilegal é
 * recusado por ele antes de a tela saber que houve tentativa. Foi o que a
 * primeira versão deste script fez, e ela mediu o cartão de repouso achando que
 * media o cartão de erro.
 *
 * Então se faz o que o aluno faz: seleciona uma peça, lê as casas que o próprio
 * tabuleiro acendeu (`.move-dest`) e joga numa delas. Como um puzzle tem uma
 * solução só, quase toda escolha é errada; se calhar de ser a certa, tenta a
 * peça seguinte.
 */
async function errarDePropósito(pagina: Page): Promise<boolean> {
  const board = await pagina.locator("cg-board").first().boundingBox();
  if (!board) return false;
  const lado = board.width / 8;
  const centro = (coluna: number, fileira: number) => ({
    x: board.x + lado * (coluna + 0.5),
    y: board.y + lado * (fileira + 0.5),
  });

  for (let fileira = 7; fileira >= 0; fileira -= 1) {
    for (let coluna = 0; coluna < 8; coluna += 1) {
      const origem = centro(coluna, fileira);
      await pagina.mouse.click(origem.x, origem.y);
      await pagina.waitForTimeout(80);

      const destinos = await pagina.evaluate(() =>
        [...document.querySelectorAll("cg-board .move-dest")].map((d) => {
          const t = getComputedStyle(d).transform;
          const m = /matrix\((?:[^,]+,){4}\s*([-\d.]+),\s*([-\d.]+)\)/.exec(t);
          return m ? { dx: Number(m[1]), dy: Number(m[2]) } : null;
        }),
      );
      const alvo = destinos.find((d) => d !== null);
      if (!alvo) continue;

      await pagina.mouse.click(board.x + alvo.dx + lado / 2, board.y + alvo.dy + lado / 2);
      await pagina.waitForTimeout(350);
      const { cartaoRuim } = await medir(pagina);
      if (cartaoRuim) return true;
    }
  }
  return false;
}

async function conferir(tema: string, falhas: Falha[], naoMedidos: string[]): Promise<void> {
  const navegador = await chromium.launch();

  for (const tela of TELAS) {
    const contexto = await navegador.newContext({
      viewport: { width: tela.width, height: tela.height },
    });
    const pagina = await contexto.newPage();
    const erro = (o_que: string) => falhas.push({ onde: `${tema} @ ${tela.nome}`, o_que });

    try {
      await entrar(pagina);
      await pagina.goto(`${BASE}/tatica/${tema}`);
      if (!(await tabuleiroPronto(pagina))) {
        const oQueTem = await pagina.locator("main").innerText();
        console.log(
          `\n  ${tela.nome} ${tela.width}×${tela.height}` +
            `\n    SEM PALCO — a rota não serviu tabuleiro nenhum. A tela diz:` +
            `\n    ${oQueTem.replace(/\n+/g, " | ").slice(0, 160)}`,
        );
        naoMedidos.push(`${tema} @ ${tela.nome}`);
        continue;
      }

      const m = await medir(pagina);

      console.log(
        `\n  ${tela.nome} ${tela.width}×${tela.height}` +
          `\n    rolagem ............ ${m.rolagem} px (aceito até ${tela.rolagemAceita})` +
          `\n    palco .............. ${m.palco} px de altura` +
          `\n    tabuleiro .......... ${m.tabuleiro} px` +
          `\n    balão do professor . ${m.balao} px` +
          `\n    retrato ............ ${m.professorVisivel ? "na tela" : "oculto"}` +
          `\n    cartão ............. ${JSON.stringify(m.cartao)}` +
          `\n    botões ............. ${JSON.stringify(m.botoes)}`,
      );

      // 1. A promessa do palco.
      if (m.rolagem > tela.rolagemAceita) {
        erro(`a página rola ${m.rolagem} px (o teto é ${tela.rolagemAceita})`);
      }

      // 2. O tabuleiro existe e é dimensionado pela altura, não pela largura.
      if (m.tabuleiro === null) erro("não há `.aula-tabuleiro` na tela: o palco não montou");
      else if (m.tabuleiro < 240) erro(`o tabuleiro caiu para ${m.tabuleiro} px (o piso é 240)`);
      else if (tela.nome === "notebook" && m.tabuleiro < 500) {
        // Na coluna única de antes ele ficava travado em ~536 px por mais larga
        // que fosse a janela; abaixo de 500 o palco estaria pior que o defeito.
        erro(`o tabuleiro só tem ${m.tabuleiro} px num notebook`);
      }

      // 3. O professor: retrato só a partir de `lg`, como na aula de abertura.
      if (tela.nome === "notebook" && !m.professorVisivel) erro("o retrato não apareceu");
      if (tela.nome === "celular" && m.professorVisivel) {
        erro("o retrato apareceu no celular, onde ele custa um quarto da tela");
      }

      // 4. O balão tem espaço de verdade para a fala do professor.
      if (m.balao === null) erro("não há balão do professor no painel");
      else if (m.balao < 100) erro(`o balão ficou com ${m.balao} px: o texto sairia em tiras`);

      // 5. O rodapé nunca fica vazio num tema: é a condição em que a conta de
      //    altura do palco foi fechada.
      if (m.botoes.length === 0) erro("o rodapé do painel ficou sem botão nenhum");

      /*
       * 5b. O repouso NÃO pagina.
       *
       * A ordem de busca é o texto que fica na tela em todo puzzle de toda
       * rodada. Se ele nasce paginado, o aluno tem de clicar "Ler mais" para
       * ler o que deveria estar sempre à vista — e foi o que aconteceu na
       * primeira versão do palco magro, com o balão em 74 px.
       */
      if (m.botoes.includes("Ler mais →")) {
        erro(`a frase de repouso paginou (balão de ${m.balao} px)`);
      }

      /*
       * 5c. Os dois degraus da dica, pedidos como o aluno pede.
       *
       * A espera pela vez do aluno vem ANTES de guardar o cartão, e ela é a
       * correção de um falso positivo: o puzzle abre com a posição parada e o
       * adversário erra 600 ms depois, sozinho. Comparado através dessa
       * transição, o cartão muda de "Olhe a posição" para "Ache o melhor lance"
       * por conta da fase — e o teste acusava a dica de ter mexido nele.
       */
      await pagina.getByText("Ache o melhor lance").waitFor({ timeout: 10_000 });
      const antesDaDica = (await medir(pagina)).cartao;
      await pagina.getByRole("button", { name: /^Dica/ }).click();
      await pagina.waitForTimeout(600);
      const comDica = await medir(pagina);
      if (comDica.rolagem > tela.rolagemAceita) {
        erro(`a página passou a rolar ${comDica.rolagem} px com a dica aberta`);
      }
      if (!comDica.botoes.includes("Por que funciona")) {
        erro("o segundo degrau da dica não foi oferecido");
      }
      if (comDica.cartao !== antesDaDica) {
        // A dica é do balão; o cartão é do lance. Pedir ajuda não muda o
        // comando — e sobretudo não é cobrada no placar.
        erro("pedir a dica mexeu no cartão de comando");
      }
      await pagina.getByRole("button", { name: "Por que funciona" }).click();
      await pagina.waitForTimeout(600);
      const comAula = await medir(pagina);
      console.log(
        `    dica ............... 2 degraus, rolagem ${comDica.rolagem}/${comAula.rolagem} px, ` +
          `botões ${JSON.stringify(comAula.botoes)}`,
      );
      if (comAula.rolagem > tela.rolagemAceita) {
        erro(`a página passou a rolar ${comAula.rolagem} px com a aula aberta`);
      }
      if (comAula.botoes.includes("Por que funciona")) {
        erro("o botão do segundo degrau continuou na tela depois de usado");
      }
      if (comAula.tabuleiro !== m.tabuleiro) {
        erro(`o tabuleiro encolheu com a dica aberta (${m.tabuleiro} → ${comAula.tabuleiro})`);
      }

      // 6. O cartão reage ao erro, e a página continua sem rolar depois disso —
      //    que é o momento em que o painel tem MAIS texto para caber.
      const errou = await errarDePropósito(pagina);
      if (!errou) {
        erro("não foi possível errar de propósito: o cartão nunca ficou no tom de erro");
      }
      const depois = await medir(pagina);
      console.log(
        `    após um erro ....... rolagem ${depois.rolagem} px, ` +
          `balão ${depois.balao} px, cartão ${JSON.stringify(depois.cartao)}`,
      );
      if (depois.rolagem > tela.rolagemAceita) {
        erro(`a página passou a rolar ${depois.rolagem} px depois de um erro`);
      }
      if (depois.tabuleiro !== m.tabuleiro) {
        erro(`o tabuleiro mudou de tamanho com o erro (${m.tabuleiro} → ${depois.tabuleiro})`);
      }
    } finally {
      await contexto.close();
    }
  }

  await navegador.close();
}

async function principal(): Promise<void> {
  const tema = process.argv[2] ?? "mateIn1";
  console.log(`Conferindo /tatica/${tema}`);

  const falhas: Falha[] = [];
  const naoMedidos: string[] = [];
  await conferir(tema, falhas, naoMedidos);

  console.log("");
  for (const n of naoMedidos) console.log(`  – ${n}: não medido (sem palco na tela)`);
  for (const f of falhas) console.log(`  ✗ ${f.onde}: ${f.o_que}`);
  console.log(falhas.length === 0 ? "\nSem falhas." : `\n${falhas.length} falha(s).`);
  if (falhas.length > 0) process.exitCode = 1;
}

await principal();
