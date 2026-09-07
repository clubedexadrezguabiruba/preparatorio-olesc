import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Chess, type Square } from "chess.js";
import { chromium, type Page } from "playwright";
import { validarDicas, type ItemDeReconhecimento } from "../lib/meiojogo/dicas.ts";
import { casasAceitas } from "../lib/meiojogo/tentativa.ts";

/**
 * O treino de meio-jogo, dirigido no navegador de verdade.
 *
 *     npm run dev
 *     node scripts/conferir-treino.ts            (todas as dicas com treino)
 *     node scripts/conferir-treino.ts m12        (uma só)
 *
 * ## O que ele prova, e por que não dá para provar com `npm test`
 *
 * O juiz e a máquina de estado já têm teste em `lib/meiojogo/tentativa.test.ts`.
 * O que **não** tem, e é onde os defeitos deste bloco moram, é o caminho do
 * gesto: o toque numa casa vazia chegar ao `events.select` do chessground, o
 * realce do apoio virar círculo desenhado, a casa ser alcançável pelo teclado,
 * e o tabuleiro continuar à vista enquanto o aluno lê a solução num celular de
 * 360 px — que é o critério de aceite da §8 ("ausência de ida e volta").
 *
 * Nada disso existe fora do navegador: o `node --test` não tem DOM, e um teste
 * de componente com DOM de mentira provaria que o React renderizou, não que o
 * chessground ouviu o ponteiro.
 *
 * ## Por que ele entra como aluno
 *
 * `/meio-jogo/[dica]` lê `dica_lida` na renderização e redireciona quem não
 * tem sessão. A conta é a de ensaio (`scripts/aluno-de-teste.ts`), a mesma que
 * o Doug usa no ensaio geral de sábado.
 */

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const BASE = process.env.BASE ?? "http://localhost:3000";
const USUARIO = "alunoteste";
const PIN = "112233";

/** Celular de 360 px: é onde o tabuleiro grudado tem de provar que serve. */
const CELULAR = { width: 360, height: 740 };

const DICAS = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content/meio-jogo.json"), "utf8")),
);

/** Uma casa vazia que não é resposta — o clique que só o `select` entrega. */
function casaVaziaFora(item: ItemDeReconhecimento): string {
  const jogo = new Chess(item.fen);
  for (const coluna of "abcdefgh") {
    for (let fileira = 1; fileira <= 8; fileira += 1) {
      const casa = `${coluna}${fileira}`;
      if (!jogo.get(casa as Square) && !item.resposta.includes(casa)) return casa;
    }
  }
  throw new Error(`${item.id} não tem casa vazia fora da resposta`);
}

/**
 * O clique de mouse numa casa, pelas coordenadas da grade de teclado.
 *
 * A grade está exatamente sobre as casas e é `pointer-events: none`, então o
 * clique atravessa e quem o recebe é o chessground — que é justamente o caminho
 * que este script existe para provar. Daí `page.mouse.click` em vez de
 * `locator.click`: o segundo recusaria um elemento que não recebe ponteiro.
 */
function casaDoTabuleiro(pagina: Page, casa: string) {
  // Escopada na grade, e não solta na página: o texto de uma alternativa do
  // quiz pode começar com "a3, ..." e o `getByRole` casaria as duas.
  return pagina
    .getByRole("group", { name: /^Tabuleiro do exercício/ })
    .getByRole("button", { name: new RegExp(`^${casa},`) });
}

async function tocar(pagina: Page, casa: string): Promise<void> {
  const botao = casaDoTabuleiro(pagina, casa);
  // A rolagem antes da medida, e não por zelo: `mouse.click` recebe coordenada
  // de **viewport**, e a caixa de um tabuleiro abaixo da dobra tem `y` maior
  // que a altura da tela — o clique cairia fora da janela.
  await botao.scrollIntoViewIfNeeded();
  await rodarDeVerdade(pagina);
  const caixa = await botao.boundingBox();
  if (!caixa) throw new Error(`a casa ${casa} não está na tela`);
  await pagina.mouse.click(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
}

/**
 * Um empurrãozinho de roda, e a razão dele — que custou uma medição.
 *
 * O chessground guarda o retângulo do tabuleiro em cache (`s.dom.bounds`, um
 * `memo`) e só o limpa quando ouve `scroll` ou `resize`. O
 * `scrollIntoViewIfNeeded` do Playwright rola pelo CDP e **não dispara
 * `scroll`** — medido nesta página: 0 eventos contra 2 de uma roda de verdade.
 * Com o cache velho, `getKeyAtDomPos` mapeia o clique para casa nenhuma e o
 * primeiro toque de cada página some sem erro no console.
 *
 * É defeito do arreio, e não da tela: dedo, roda e teclado disparam `scroll` de
 * verdade, e foi assim que a segunda tentativa sempre funcionou. A roda de 1 px
 * (e a volta) devolve o navegador ao estado em que um aluno o encontraria.
 */
async function rodarDeVerdade(pagina: Page): Promise<void> {
  await pagina.mouse.wheel(0, 1);
  await pagina.mouse.wheel(0, -1);
  await pagina.waitForTimeout(50);
}

/** Esperou aparecer, ou não apareceu. `isVisible` sozinho não espera o React. */
async function visivel(pagina: Page, texto: string): Promise<boolean> {
  try {
    await pagina.getByText(texto).first().waitFor({ state: "visible", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Quantos círculos o chessground está desenhando — esperando o número parar.
 *
 * O `setAutoShapes` redesenha a camada num quadro seguinte ao da mudança de
 * estado, então contar logo depois do texto do feedback aparecer devolve o
 * número de antes. Sem a espera, este script acusa "a casa errada não foi
 * acesa" com a casa acesa na tela.
 */
async function circulos(pagina: Page, esperado?: number): Promise<number> {
  const alvo = pagina.locator("svg.cg-shapes circle");
  let quantos = await alvo.count();
  for (let i = 0; i < 20 && esperado !== undefined && quantos !== esperado; i += 1) {
    await pagina.waitForTimeout(100);
    quantos = await alvo.count();
  }
  return quantos;
}

/**
 * O tabuleiro montado — que é o sinal de que o React hidratou aqui.
 *
 * O `<cg-board>` não vem do servidor: o `ChessBoard` entrega uma `<div>` vazia
 * e o chessground a preenche num efeito, no cliente. Esperar o cabeçalho do
 * treino prova só que o HTML chegou, e um clique entre o HTML e a hidratação
 * cai no vazio — foi o que fez a primeira posição de cada dica falhar.
 */
async function tabuleiroPronto(pagina: Page): Promise<void> {
  await pagina.locator("cg-board").first().waitFor({ state: "attached", timeout: 20_000 });
}

async function entrar(pagina: Page): Promise<void> {
  await pagina.goto(`${BASE}/entrar`);
  await pagina.fill('input[name="usuario"]', USUARIO);
  await pagina.fill('input[name="pin"]', PIN);
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 20_000 });
}

type Falha = { onde: string; o_que: string };

async function conferirDica(pagina: Page, dicaId: string, falhas: Falha[]): Promise<number> {
  const dica = DICAS.find((d) => d.id === dicaId);
  const treino = dica?.treino;
  if (!treino) throw new Error(`${dicaId} não tem treino`);

  const erro = (onde: string, o_que: string) => falhas.push({ onde, o_que });
  await pagina.goto(`${BASE}/meio-jogo/${dicaId}`);
  await pagina.getByRole("heading", { name: "Treino" }).waitFor({ timeout: 20_000 });
  await tabuleiroPronto(pagina);

  let itens = 0;
  for (const [i, item] of treino.reconhecimento.entries()) {
    const aceitas = casasAceitas(item);
    await pagina.getByText(`Exercício ${i + 1} de 3`).waitFor();

    // 1. O clique em casa vazia. É o gesto que o `movable.after` não entregaria.
    const vazia = casaVaziaFora(item);
    await tocar(pagina, vazia);
    if (!(await visivel(pagina, `${vazia} não é.`))) {
      erro(item.id, `o clique em ${vazia} (casa vazia) não foi julgado`);
    }
    if ((await circulos(pagina, 1)) < 1) erro(item.id, "a casa errada não foi acesa no tabuleiro");

    // 2. A escada, degrau a degrau, com o realce chegando ao tabuleiro.
    await pagina.getByRole("button", { name: "Pedir uma ajuda" }).click();
    if (!(await visivel(pagina, item.apoio.convite))) {
      erro(item.id, "o convite do apoio não apareceu");
    }
    const antes = await circulos(pagina);
    await pagina.getByRole("button", { name: "Pedir mais uma" }).click();
    const depois = await circulos(pagina, antes + item.apoio.realce.length);
    if (depois - antes !== item.apoio.realce.length) {
      erro(
        item.id,
        `o realce acendeu ${depois - antes} casa(s) e o conteúdo pede ${item.apoio.realce.length}`,
      );
    }
    const frase =
      item.apoio.modo === "contem" ? "A resposta está entre elas." : "Nenhuma delas é a resposta";
    if (!(await visivel(pagina, frase))) {
      erro(item.id, `o apoio "${item.apoio.modo}" não escreveu como ler o realce`);
    }
    await pagina.getByRole("button", { name: "Ver a resposta explicada" }).click();
    if (!(await visivel(pagina, item.apoio.solucao.slice(0, 40)))) {
      erro(item.id, "a solução do nível 3 não apareceu");
    }

    // 3. Sem ida e volta: com a solução na tela, o tabuleiro continua à vista.
    await pagina.getByText(item.apoio.solucao.slice(0, 40)).first().scrollIntoViewIfNeeded();
    const tabuleiro = await pagina.locator("cg-board").first().boundingBox();
    if (!tabuleiro || tabuleiro.y + tabuleiro.height < 0 || tabuleiro.y > CELULAR.height) {
      erro(item.id, "o tabuleiro saiu da tela enquanto a solução era lida");
    }

    // 4. A resposta. O segundo exercício responde pelo **teclado**, que é o
    //    caminho que nenhum outro passo deste script exercita.
    if (i === 1) {
      const casa = casaDoTabuleiro(pagina, aceitas[0]);
      await casa.focus();
      await pagina.keyboard.press("Enter");
    } else {
      await tocar(pagina, aceitas[0]);
    }
    if (!(await visivel(pagina, `Isso: ${aceitas.join(", ")}.`))) {
      erro(item.id, `a resposta ${aceitas[0]} não foi aceita`);
    }
    itens += 1;

    if (i < treino.reconhecimento.length - 1) {
      await pagina.getByRole("button", { name: "Próximo exercício" }).click();
      await tabuleiroPronto(pagina);
    }
  }

  // 5. A aplicação, na mesma tela e com o mesmo tabuleiro.
  const aplicacao = pagina.getByRole("heading", { name: "Agora a razão" });
  try {
    await aplicacao.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    erro(treino.aplicacao.id, "a aplicação não apareceu depois do terceiro acerto");
    return itens;
  }
  const boardsNaTela = await pagina.locator("cg-board").count();
  if (boardsNaTela !== 1) {
    erro(treino.aplicacao.id, `a aplicação apareceu com ${boardsNaTela} tabuleiros na tela`);
  }
  const certa = treino.aplicacao.opcoes.findIndex((o) => o.certa);
  await pagina.getByRole("button", { name: treino.aplicacao.opcoes[certa].texto }).click();
  if (!(await visivel(pagina, "É essa."))) {
    erro(treino.aplicacao.id, "a opção certa não foi reconhecida");
  }
  // A gravação sai sem `await` (a tela não espera a rede para dar o veredito),
  // e fechar o navegador no instante seguinte aborta a requisição. Este respiro
  // é do robô: o aluno de verdade lê o "É essa." antes de sair da página.
  await pagina.waitForTimeout(1500);
  return itens + 1;
}

async function principal(): Promise<void> {
  const alvos = process.argv[2]
    ? [process.argv[2]]
    : DICAS.filter((d) => d.treino !== null).map((d) => d.id);

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: CELULAR });
  const pagina = await contexto.newPage();

  const doConsole: string[] = [];
  pagina.on("console", (m) => {
    if (m.type() === "error") doConsole.push(m.text());
  });
  pagina.on("pageerror", (e) => doConsole.push(`pageerror: ${e.message}`));

  const falhas: Falha[] = [];
  let itens = 0;
  try {
    await entrar(pagina);
    for (const id of alvos) {
      itens += await conferirDica(pagina, id, falhas);
      console.log(`  ${id}: ok`);
    }
  } finally {
    await navegador.close();
  }

  console.log(
    `\n${alvos.length} dica(s), ${itens} item(ns) respondidos no navegador a ${CELULAR.width} px`,
  );
  console.log(`${doConsole.length} erro(s) de console`);
  for (const linha of doConsole) console.log(`  ! ${linha}`);
  for (const f of falhas) console.log(`  ✗ ${f.onde}: ${f.o_que}`);
  if (falhas.length > 0 || doConsole.length > 0) process.exitCode = 1;
}

await principal();
