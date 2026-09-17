import { createClient } from "@supabase/supabase-js";
import { Chess } from "chess.js";
import { chromium, type BrowserContext, type Page } from "playwright";
import { jogar } from "../e2e/preparo/tabuleiro.ts";
import { emailDoUsuario } from "../lib/auth/usuario.ts";
import { applyUci } from "../lib/chess/fen.ts";
import { hojeNoBrasil } from "../lib/curso/calendario.ts";
import { lerIndiceDoRating, puzzlePorId } from "../lib/tatica/banco.ts";
import { temaPorTag } from "../lib/tatica/blocos.ts";
import { lanceCerto } from "../lib/tatica/conferir.ts";
import { garantirPendente, responderRating } from "../lib/tatica/gravar-rating.ts";
import type { Puzzle } from "../lib/tatica/puzzles.ts";
import { eMateCurto, PROBLEMAS_POR_DIA } from "../lib/tatica/rating.ts";
import { MINIMO_POR_TEMA, temasDoProblema } from "../lib/tatica/rating-historico.ts";
import { RESPOSTA_MS } from "../lib/tatica/tempos.ts";
import { carregarEnv } from "./env-local.ts";

/**
 * A tela de jogo da tática rating, no navegador de verdade.
 *
 *     npm run dev -- -p 3001
 *     npm run tatica:rating:tela                    (todos os cenários)
 *     npm run tatica:rating:tela -- segunda-chance  (um só)
 *
 * Os testes puros provam as contas, e `db:tatica:rating` prova o servidor contra
 * o banco. O que só o navegador alcança é o que o aluno vive entre um e outro: o
 * lance errado que a tela percebe antes do servidor, a internet que cai no meio,
 * o F5, a solução jogada no tabuleiro e os botões que ela libera.
 *
 * Cada cenário cria uma **conta descartável** (apagada no fim, com a linha do
 * rating e as tentativas, por `on delete cascade`) — o rating da `alunoteste`
 * não se mexe.
 */

carregarEnv();

const BASE = process.env.BASE ?? "http://localhost:3001";
const PIN = "424242";
/** O tempo que o chessground leva animando um lance (`animacaoMs` do `ChessBoard`). */
const ANIMACAO_MS = 300;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const falhas: string[] = [];
let afirmacoes = 0;

function afirmar(condicao: boolean, oQue: string): void {
  afirmacoes++;
  console.log(`  ${condicao ? "ok  " : "FALHOU"} ${oQue}`);
  if (!condicao) falhas.push(oQue);
}

const contas: string[] = [];

/** O nome da conta descartável leva o usuário, para achar a linha dela na tabela do professor. */
const nomeDaConta = (usuario: string) => `Tela ${usuario.split(".").at(-1)}`;

async function criarConta(papel: "aluno" | "professor" = "aluno"): Promise<{ id: string; usuario: string }> {
  const usuario = `teste.tela.${Date.now().toString(36).slice(-6)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: emailDoUsuario(usuario),
    password: PIN,
    email_confirm: true,
    user_metadata: { usuario, nome: nomeDaConta(usuario), papel, equipe: "M" },
  });
  if (error || !data.user) throw new Error(`não criou a conta: ${error?.message}`);
  contas.push(data.user.id);
  return { id: data.user.id, usuario };
}

async function entrar(pagina: Page, usuario: string): Promise<void> {
  await pagina.goto(`${BASE}/entrar`);
  await pagina.fill('input[name="usuario"]', usuario);
  await pagina.fill('input[name="pin"]', PIN);
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 30_000 });
}

/** O crachá do `next dev` cobre o rodapé a 360 px; não existe em produção. */
async function semCracha(pagina: Page): Promise<void> {
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

/** O problema pendente do aluno, lido do banco e do disco, e a posição em que ele joga. */
async function pendente(aluno: string): Promise<{ puzzle: Puzzle; fen: string; origem: string }> {
  const { data, error } = await admin
    .from("rating_tatica")
    .select("puzzle_pendente, tema_pendente")
    .eq("aluno", aluno)
    .single();
  if (error || !data?.puzzle_pendente) throw new Error(`sem pendente: ${error?.message}`);
  const puzzle = await puzzlePorId(data.tema_pendente, data.puzzle_pendente);
  if (!puzzle) throw new Error(`o pendente ${data.puzzle_pendente} não está no disco`);
  return { puzzle, fen: applyUci(puzzle.fen, puzzle.lances[0])!.fen, origem: data.tema_pendente };
}

/** Um lance legal que o juiz não aceita: nem o esperado, nem mate, nem promoção. */
function lanceErrado(fen: string, esperado: string): string {
  const lance = new Chess(fen)
    .moves({ verbose: true })
    .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`)
    .find((uci) => uci.length === 4 && !lanceCerto(fen, uci, esperado));
  if (!lance) throw new Error(`nenhum lance errado em ${fen}`);
  return lance;
}

async function tentativas(aluno: string) {
  const { data } = await admin
    .from("tentativas_puzzle")
    .select("*")
    .eq("aluno", aluno)
    .order("criada_em");
  return (data ?? []) as { puzzle_id: string; acertou: boolean; tempo_ms: number; temas: string[] | null }[];
}

const cartao = (pagina: Page) => pagina.locator('[aria-live="polite"].rounded-lg').first();

async function esperarCartao(pagina: Page, texto: string | RegExp, timeout = 20_000): Promise<boolean> {
  try {
    await cartao(pagina).filter({ hasText: texto }).waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function abrirModo(pagina: Page): Promise<void> {
  await pagina.goto(`${BASE}/tatica/rating`);
  await semCracha(pagina);
  if (!(await esperarCartao(pagina, "Encontre o melhor lance", 60_000))) {
    throw new Error(`a tela não chegou ao "Encontre o melhor lance" (cartão: ${await cartao(pagina).textContent().catch(() => "?")})`);
  }
  // O cartão troca quando o lance do adversário **começa**; o chessground ainda
  // o está animando, e um clique no meio da animação é engolido. A pessoa que
  // olha a posição antes de jogar nunca esbarra nisso; um script, sim.
  await pagina.waitForTimeout(ANIMACAO_MS);
}

type Tela = { width: number; height: number };
type Cenario = {
  nome: string;
  tela?: Tela;
  rodar: (contexto: BrowserContext, pagina: Page, aluno: { id: string; usuario: string }) => Promise<void>;
};

const NOTEBOOK: Tela = { width: 1366, height: 768 };
const CELULAR: Tela = { width: 360, height: 740 };

const rolagem = (pagina: Page) =>
  pagina.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight);

/** Espera um botão ficar habilitado, até `ms`. */
async function habilitado(pagina: Page, nome: string | RegExp, ms: number): Promise<boolean> {
  const botao = pagina.getByRole("button", { name: nome });
  for (const fim = Date.now() + ms; Date.now() < fim; await pagina.waitForTimeout(100)) {
    if (await botao.isEnabled().catch(() => false)) return true;
  }
  return false;
}

const setas = (pagina: Page) => pagina.locator(".cg-wrap svg.cg-shapes line").count();

/** Quantas setas há, depois de a animação do tabuleiro assentar. */
async function setasAssentadas(pagina: Page, esperadas: number, ms = 2000): Promise<number> {
  let quantas = await setas(pagina);
  for (const fim = Date.now() + ms; quantas !== esperadas && Date.now() < fim; await pagina.waitForTimeout(100)) {
    quantas = await setas(pagina);
  }
  return quantas;
}

/** Tira o foco de qualquer botão: a tecla vai para o atalho, e não ativa o botão focado. */
const semFoco = (pagina: Page) => pagina.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

/** O nome das táticas que a tela deve mostrar depois do erro — a mesma conta de `Rodada.tsx`. */
function taticaEsperada(origem: string, temas: readonly string[]): string | null {
  const nomes = temasDoProblema(origem, temas).flatMap((t) => temaPorTag(t)?.nome ?? []);
  return nomes.length ? `A tática: ${nomes.slice(0, 2).join(" · ")}.` : null;
}

/** O erro, a tática, a solução revista com ◀ ▶ e as setas, o Próximo travado até o fim. */
async function erroESolucao(pagina: Page, aluno: { id: string }, tela: string): Promise<void> {
  await abrirModo(pagina);
  afirmar(
    (await pagina.getByText(/errou um lance|encerra o problema/i).count()) === 0,
    `[${tela}] a frase "errou um lance, o problema acaba" não aparece`,
  );
  const contagem = (feitos: number) => `hoje ${feitos} de ${PROBLEMAS_POR_DIA}`;
  afirmar((await pagina.getByText(contagem(0)).count()) === 1, `[${tela}] a contagem do dia começa em "${contagem(0)}"`);

  const { puzzle, fen, origem } = await pendente(aluno.id);
  const errado = lanceErrado(fen, puzzle.lances[1]);
  await jogar(pagina, errado);
  afirmar(await esperarCartao(pagina, "Incorreto"), `[${tela}] o lance errado ${errado} dá "Incorreto"`);
  // Menos que o passo da solução (2 × RESPOSTA_MS): passado ele, o quadro troca
  // e a seta sai de cena de propósito.
  const setasNoErro = await setasAssentadas(pagina, 1, RESPOSTA_MS);
  const proximoTravado = await pagina.getByRole("button", { name: "Próximo →" }).isDisabled();

  const texto = ((await cartao(pagina).textContent()) ?? "").trim();
  const esperada = taticaEsperada(origem, puzzle.temas);
  afirmar(
    esperada ? texto.includes(esperada) : texto.includes("Veja a solução"),
    `[${tela}] o cartão diz a tática (${JSON.stringify(texto)}; esperado ${JSON.stringify(esperada)})`,
  );
  afirmar((await pagina.locator(".aula-painel a", { hasText: /Garfo|Cravada|Mate|tema/ }).count()) === 0, `[${tela}] e sem link para o tema`);
  afirmar(setasNoErro > 0, `[${tela}] a seta vermelha marca o lance jogado (${setasNoErro} traço(s))`);
  afirmar(proximoTravado, `[${tela}] "Próximo" travado enquanto a solução corre`);
  const rolagemNoErro = await rolagem(pagina);

  const lancesDaSolucao = puzzle.lances.length - 1;
  afirmar(
    await habilitado(pagina, "Próximo →", lancesDaSolucao * 2 * RESPOSTA_MS + 3000),
    `[${tela}] e liberado quando a linha termina (${lancesDaSolucao} lance(s))`,
  );
  const anterior = pagina.getByRole("button", { name: "Lance anterior da solução" });
  const seguinte = pagina.getByRole("button", { name: "Lance seguinte da solução" });
  afirmar(await seguinte.isDisabled(), `[${tela}] no fim da linha, ▶ desliga`);

  let voltas = 0;
  while (await anterior.isEnabled()) {
    await anterior.click();
    voltas++;
    if (voltas > 20) break;
  }
  afirmar(voltas === lancesDaSolucao, `[${tela}] ◀ volta um lance por clique, até a posição do erro (${voltas} de ${lancesDaSolucao})`);
  afirmar((await setasAssentadas(pagina, 1)) > 0, `[${tela}] de volta à posição do erro, a seta vermelha reaparece`);

  await semFoco(pagina);
  await pagina.keyboard.press("ArrowRight");
  afirmar(await anterior.isEnabled(), `[${tela}] a seta → do teclado avança`);
  afirmar((await setasAssentadas(pagina, 0)) === 0, `[${tela}] e a seta vermelha some fora da posição do erro`);
  await pagina.keyboard.press("ArrowLeft");
  afirmar(await anterior.isDisabled(), `[${tela}] a seta ← do teclado volta`);

  await semFoco(pagina);
  await pagina.keyboard.press("Enter");
  afirmar(await esperarCartao(pagina, /Olhe a posição|Encontre o melhor lance/), `[${tela}] Enter leva ao próximo problema`);
  afirmar((await pagina.getByText(contagem(1)).count()) === 1, `[${tela}] e a contagem vai a "${contagem(1)}"`);

  if (tela === "notebook") {
    // A conta deste cenário tem duas tentativas: é a única com poucos problemas
    // por tema, e por isso é aqui que o mínimo dos temas fracos se vê.
    await pagina.goto(`${BASE}/tatica/rating/evolucao`);
    afirmar(
      (await pagina.getByText(`Nenhum tema ainda com ${MINIMO_POR_TEMA} problemas`).count()) === 1,
      `a evolução pede ${MINIMO_POR_TEMA} problemas por tema`,
    );
  }

  console.log(`  (rolagem da página no erro, a ${tela}: ${rolagemNoErro} px)`);
  if (tela === "notebook") afirmar(rolagemNoErro === 0, `[${tela}] o palco não rola no erro (${rolagemNoErro} px)`);
  else afirmar(rolagemNoErro <= 0, `[${tela}] o palco não rola no erro (${rolagemNoErro} px)`);
}

const CENARIOS: Cenario[] = [
  {
    /*
     * Defeito 3 da revisão de 15/9: a tela percebe o lance errado antes do
     * servidor. Sem internet nessa hora, a resposta não chega; um F5 trazia o
     * mesmo problema zerado, e o aluno jogava de novo, já sabendo que errou.
     */
    nome: "segunda-chance",
    rodar: async (contexto, pagina, aluno) => {
      await abrirModo(pagina);
      const { puzzle, fen } = await pendente(aluno.id);
      const errado = lanceErrado(fen, puzzle.lances[1]);

      await contexto.setOffline(true);
      await jogar(pagina, errado);
      afirmar(await esperarCartao(pagina, "Sem conexão"), `sem internet, o lance errado ${errado} para em "Sem conexão"`);
      await contexto.setOffline(false);

      await pagina.reload();
      await semCracha(pagina);
      const incorreto = await esperarCartao(pagina, "Incorreto", 30_000);
      const texto = (await cartao(pagina).textContent()) ?? "";
      afirmar(incorreto, `depois do F5 o erro guardado é enviado e a tela diz "Incorreto" (cartão: "${texto.trim()}")`);
      const gravadas = await tentativas(aluno.id);
      afirmar(
        gravadas.some((t) => t.puzzle_id === puzzle.id && !t.acertou),
        `e o banco tem o erro em ${puzzle.id} (${gravadas.length} tentativa(s))`,
      );
      afirmar(await habilitado(pagina, "Próximo →", 15_000), "e a solução corre até liberar o Próximo");
    },
  },
  { nome: "erro-e-solucao", tela: NOTEBOOK, rodar: (_c, pagina, aluno) => erroESolucao(pagina, aluno, "notebook") },
  { nome: "erro-e-solucao-celular", tela: CELULAR, rodar: (_c, pagina, aluno) => erroESolucao(pagina, aluno, "celular") },
  {
    /* O 15º problema do dia: a tela sugere parar, e não trava. */
    nome: "acerto-e-contagem",
    rodar: async (_contexto, pagina, aluno) => {
      const meiaNoite = new Date(`${hojeNoBrasil()}T00:00:00-03:00`).getTime();
      const { error } = await admin.from("tentativas_puzzle").insert(
        Array.from({ length: PROBLEMAS_POR_DIA - 1 }, (_, i) => ({
          aluno: aluno.id,
          puzzle_id: `falso${i}`,
          tema: "fork",
          origem: "fork",
          acertou: true,
          tempo_ms: 1000,
          modo: "rating",
          rating_antes: 600,
          rating_depois: 600,
          rd_depois: 80,
          criada_em: new Date(Math.max(meiaNoite + 60_000, Date.now() - (i + 1) * 60_000)).toISOString(),
        })),
      );
      if (error) throw new Error(`não inseriu as 14 de hoje: ${error.message}`);

      await abrirModo(pagina);
      const aUmDoTeto = `hoje ${PROBLEMAS_POR_DIA - 1} de ${PROBLEMAS_POR_DIA}`;
      afirmar((await pagina.getByText(aUmDoTeto).count()) === 1, `a um problema do teto, a tela diz "${aUmDoTeto}"`);
      const { puzzle } = await pendente(aluno.id);
      console.log(`  (${puzzle.id}, ${puzzle.lances.length - 1} lance(s) de solução)`);
      for (let i = 1; i < puzzle.lances.length; i += 2) {
        await jogar(pagina, puzzle.lances[i]);
        if (i + 2 >= puzzle.lances.length) break;
        // O adversário responde ao lance certo, e o tabuleiro fica travado
        // enquanto isso (é a regra: `podeMover` só na fase "jogando"). Esperar o
        // cartão "Encontre o melhor lance" não basta — ele é o mesmo texto de
        // antes do lance, e o script seguia jogando contra o tabuleiro travado.
        if (!(await esperarCartao(pagina, "Certo — continue", 5000))) break;
        if (!(await esperarCartao(pagina, "Encontre o melhor lance", 5000))) break;
        await pagina.waitForTimeout(ANIMACAO_MS);
      }
      afirmar(await esperarCartao(pagina, "Correto!"), `a linha certa de ${puzzle.id} dá "Correto!"`);
      const texto = ((await cartao(pagina).textContent()) ?? "").trim();
      afirmar(
        texto.includes(`${PROBLEMAS_POR_DIA} hoje: bom lugar para parar.`),
        `o ${PROBLEMAS_POR_DIA}º diz que é bom lugar para parar (${JSON.stringify(texto)})`,
      );
      afirmar(
        (await pagina.getByText(`${PROBLEMAS_POR_DIA} hoje · já pode parar`).count()) === 1,
        `e o cabeçalho troca para "${PROBLEMAS_POR_DIA} hoje · já pode parar"`,
      );
      afirmar(await esperarCartao(pagina, /Olhe a posição|Encontre o melhor lance/, 5000), "e não trava: o próximo entra sozinho");

      await pagina.goto(`${BASE}/tatica`);
      afirmar(
        (await pagina.getByText(`Depois da revisão e da série do tema: até ${PROBLEMAS_POR_DIA} problemas por dia.`).count()) === 1,
        "o cartão de /tatica diz quando jogar",
      );
    },
  },
  {
    /* Doug, 16/9: depois de um mate em 1 ou em 2, a tela não serve outro. */
    nome: "mistura-dos-mates",
    rodar: async (_contexto, pagina, aluno) => {
      const servido = await garantirPendente(aluno.id);
      if ("erro" in servido) throw new Error(servido.erro);
      const indice = await lerIndiceDoRating();
      const vezes: string[] = [];
      for (let vez = 0; vez < 3; vez++) {
        const { data } = await admin.from("rating_tatica").select("rating").eq("aluno", aluno.id).single();
        const vistos = new Set((await tentativas(aluno.id)).map((t) => t.puzzle_id));
        // O mais próximo: cada erro de propósito desce o rating, e abaixo de 600 o índice acaba.
        const mate = indice
          .filter((l) => l[3] === 1 && !vistos.has(l[0]))
          .sort((a, b) => Math.abs(a[2] - data!.rating) - Math.abs(b[2] - data!.rating))[0];
        if (!mate) throw new Error(`nenhum mate curto perto de ${data!.rating}`);
        await admin.from("rating_tatica").update({ puzzle_pendente: mate[0], tema_pendente: mate[1] }).eq("aluno", aluno.id);

        await abrirModo(pagina);
        const { puzzle, fen } = await pendente(aluno.id);
        afirmar(puzzle.id === mate[0] && eMateCurto(puzzle.temas), `a tela abriu o mate curto ${mate[0]} (${puzzle.temas.join(" ")})`);
        await jogar(pagina, lanceErrado(fen, puzzle.lances[1]));
        if (!(await esperarCartao(pagina, "Incorreto"))) throw new Error("o erro de propósito não voltou Incorreto");
        const proximo = await pendente(aluno.id);
        vezes.push(`${proximo.puzzle.id}: ${proximo.puzzle.temas.filter((t) => t.startsWith("mate")).join(" ") || "sem mate"}`);
        afirmar(!eMateCurto(proximo.puzzle.temas), `e o próximo não é mate curto (${vezes.at(-1)})`);
      }
    },
  },
  {
    /* A tabela da turma: a semana de cada aluno, e "—" para quem nunca jogou. */
    nome: "professor",
    rodar: async (contexto, pagina, aluno) => {
      // A conta do cenário vira aluno com duas respostas de verdade (um erro e um acerto), pela porta do servidor.
      const primeiro = await garantirPendente(aluno.id);
      if ("erro" in primeiro) throw new Error(primeiro.erro);
      const erro = await responderRating(aluno.id, primeiro.puzzle.id, ["a1a1"]);
      if ("erro" in erro || !erro.proximo) throw new Error("o erro de preparo não voltou julgado");
      const lances = erro.proximo.lances.filter((_, j) => j % 2 === 1);
      const acerto = await responderRating(aluno.id, erro.proximo.id, lances);
      if ("erro" in acerto || !acerto.acertou) throw new Error("o acerto de preparo não voltou acerto");

      const professor = await criarConta("professor");
      await contexto.clearCookies();
      await entrar(pagina, professor.usuario);
      await pagina.goto(`${BASE}/professor`);
      const tabela = pagina.locator("table", { has: pagina.getByRole("columnheader", { name: "Rating de tática" }) });
      await tabela.waitFor({ timeout: 60_000 });
      const cabecalhos = (await tabela.locator("th").allTextContents()).map((t) => t.trim());
      afirmar(
        JSON.stringify(cabecalhos) ===
          JSON.stringify(["Aluno", "Rating de tática", "7 dias", "Na semana", "Acerto na semana", "Última vez", "Resolvidos"]),
        `as colunas da turma (${cabecalhos.join(" | ")})`,
      );
      const celulas = async (nome: string) =>
        (await tabela.locator("tr", { hasText: nome }).first().locator("td").allTextContents()).map((t) => t.trim());
      const doAluno = await celulas(nomeDaConta(aluno.usuario));
      afirmar(
        doAluno[3] === "2" && doAluno[4] === "50%" && doAluno[5] === "hoje" && doAluno[6] === "2",
        `quem jogou: 2 na semana, 50%, hoje, 2 resolvidos (${doAluno.join(" | ")})`,
      );
      const doProfessor = await celulas(nomeDaConta(professor.usuario));
      afirmar(
        doProfessor.length === 0 || doProfessor.slice(1).every((c) => c === "—"),
        `quem nunca jogou: só "—" (${doProfessor.join(" | ") || "fora da lista de alunos"})`,
      );
    },
  },
];

const pedidos = process.argv.slice(2);
const escolhidos = pedidos.length ? CENARIOS.filter((c) => pedidos.includes(c.nome)) : CENARIOS;

const navegador = await chromium.launch();
try {
  for (const cenario of escolhidos) {
    console.log(`\n${cenario.nome}`);
    const contexto = await navegador.newContext({
      viewport: cenario.tela ?? NOTEBOOK,
      hasTouch: cenario.tela === CELULAR,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    const pagina = await contexto.newPage();
    try {
      const aluno = await criarConta();
      await entrar(pagina, aluno.usuario);
      await cenario.rodar(contexto, pagina, aluno);
    } catch (erro) {
      falhas.push(`${cenario.nome}: ${erro instanceof Error ? erro.message : String(erro)}`);
      console.error(`  ERRO ${erro instanceof Error ? erro.message : erro}`);
    } finally {
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
  for (const id of contas) await admin.auth.admin.deleteUser(id);
  if (contas.length) console.log(`\n${contas.length} conta(s) descartável(is) apagada(s).`);
}

if (falhas.length) {
  console.error(`\n${falhas.length} de ${afirmacoes} afirmação(ões) falharam:`);
  for (const f of falhas) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log(`\n${afirmacoes} afirmações. A tela da tática rating se comporta.`);
}
