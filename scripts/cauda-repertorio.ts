/**
 * A cauda de cada linha: onde ela para hoje, e o que existe para esticá-la.
 *
 * Uso:
 *   node scripts/cauda-repertorio.ts                a tabela das linhas
 *   node scripts/cauda-repertorio.ts --dossies      um arquivo por linha (a rede acontece aqui)
 *   node scripts/cauda-repertorio.ts <id-da-linha>  o dossiê de uma linha, na tela
 *   node scripts/cauda-repertorio.ts --sem-rede     só o que já está no cache
 *   ... --sem-motor                                 pula a avaliação (só explorer e fonte)
 *
 * ## Por que este script existe
 *
 * A §24 esticou as linhas até o roque e as peças menores fora — de 222 lances
 * nossos para cerca de 340. Sem esta ferramenta, **cada par de lances exigiria
 * uma ida à rede**: consultar o explorer, esperar, ler, decidir, escrever,
 * repetir. Com ela a rede é visitada uma vez, o resultado fica em disco, e
 * escrever o conteúdo passa a ser leitura e escrita.
 *
 * Ele **não decide nada**. O dossiê é material: o que a fonte joga e com que
 * palavras, o que as crianças jogam de verdade e em quantos jogos, o que o
 * motor acha dos mais jogados. Quem escolhe o lance é quem escreve o PGN.
 *
 * ## A escada dos lances DELE — os quatro degraus da §24
 *
 * | degrau | fonte | quando |
 * |---|---|---|
 * | 0 | o curso, com a prosa do autor | a fonte alcança a posição |
 * | 1 | explorer `lichess-1000-1999`, rapid+classical, >= 200 jogos | a fonte acabou |
 * | 2 | a mesma faixa **mais o blitz**, >= 200 jogos | menos de 200 no degrau 1 |
 * | 3 | a linha para, ou segue pelo lance da fonte mesmo raro | menos de 200 no degrau 2 |
 *
 * O degrau usado em cada meio-lance vai escrito no dossiê, e é ele que vira a
 * tag `[Fonte]` da linha depois.
 *
 * ## A caminhada, e o que ela é e não é
 *
 * O dossiê anda para a frente a partir da ponta de hoje, sempre pelo degrau
 * mais baixo disponível, até a linha fechar a régua ou bater no teto de 14
 * lances nossos. Essa caminhada é uma **sugestão** — a mais provável, medida —,
 * e a cada passo o dossiê imprime as alternativas que ela deixou de lado. Se
 * quem escreve escolher outra coisa num lance nosso, a cauda dali para a frente
 * muda, e é para isso que as alternativas estão impressas.
 *
 * ## O cache
 *
 * `content/repertorio/cache/explorer/lichess-1000-1999/`, o mesmo do
 * `explorer-repertorio.ts` — versionado, e é ele que faz `--sem-rede`
 * reproduzir a medição inteira sem tocar na rede. Um número que muda sozinho
 * entre duas rodadas não justifica escolha de conteúdo nenhuma.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { carregarEnv, RAIZ } from "./env-local.ts";
import { carregarCorpus, ondeEstaOCorpus, recadoSemCorpus, type Corpus } from "./corpus.ts";
import { Motor, prepararMotor } from "./motor.ts";
import { lerPgns } from "../lib/repertorio/pgn.ts";
import { expandir } from "../lib/repertorio/arvore.ts";
import {
  consultar,
  RECORTES,
  RITMOS,
  RITMOS_COM_BLITZ,
  JOGOS_MINIMOS,
  type Cache,
  type Posicao,
} from "../lib/repertorio/explorer.ts";
import {
  fechamentoDe,
  meiosLances,
  PROFUNDIDADE_MINIMA,
  CORES,
  NIVEIS,
  type Cor,
  type Linha,
  type Nivel,
} from "../lib/repertorio/linhas.ts";

carregarEnv();

const argv = process.argv.slice(2);
const DOSSIES = argv.includes("--dossies");
const SEM_REDE = argv.includes("--sem-rede");
const SEM_MOTOR = argv.includes("--sem-motor");
const ALVO = argv.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));

const numero = (bandeira: string, padrao: number): number => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : padrao;
};

/** Fundo o bastante para separar candidatos, raso o bastante para 160 buscas. */
const PROFUNDIDADE_DO_MOTOR = numero("--profundidade", 16);

const RECORTE = "lichess-1000-1999" as const;
const FAIXAS = RECORTES[RECORTE];
const PASTA_CACHE = path.join(RAIZ, "content", "repertorio", "cache", "explorer", RECORTE);
const PASTA_DOSSIES = path.join(RAIZ, "content", "repertorio", "caudas");

/* ------------------------------------------------------------------ *
 * As linhas de hoje
 * ------------------------------------------------------------------ */

const ORIGEM = path.join(RAIZ, "content", "repertorio");

function linhasDeHoje(): Linha[] {
  const todas: Linha[] = [];
  for (const nome of readdirSync(ORIGEM).filter((n) => n.toLowerCase().endsWith(".pgn"))) {
    for (const jogo of lerPgns(readFileSync(path.join(ORIGEM, nome), "utf8"))) {
      const { Abertura: abertura, Nome: arvore, Fonte: fonte, Cor: cor, Nivel: nivel } = jogo.tags;
      if (!abertura || !arvore || !fonte) continue;
      if (!CORES.includes(cor as Cor) || !NIVEIS.includes(nivel as Nivel)) continue;
      todas.push(
        ...expandir(jogo, {
          abertura,
          nome: arvore,
          cor: cor as Cor,
          nivel: nivel as Nivel,
          fonte,
        }).linhas,
      );
    }
  }
  return todas;
}

const linhas = linhasDeHoje();

/* ------------------------------------------------------------------ *
 * O cache e as consultas
 * ------------------------------------------------------------------ */

const cacheEm = (pasta: string): Cache => {
  mkdirSync(pasta, { recursive: true });
  return {
    ler(chave) {
      const arquivo = path.join(pasta, `${chave}.json`);
      if (!existsSync(arquivo)) return undefined;
      try {
        return JSON.parse(readFileSync(arquivo, "utf8"));
      } catch {
        return undefined;
      }
    },
    gravar(chave, valor) {
      writeFileSync(
        path.join(pasta, `${chave}.json`),
        `${JSON.stringify(valor, null, 2)}\n`,
        "utf8",
      );
    },
  };
};

const cache = cacheEm(PASTA_CACHE);
const avisos: string[] = [];
let consultas = 0;
let semDados = 0;

async function explorer(
  play: readonly string[],
  ritmos: readonly string[],
): Promise<Posicao | null> {
  consultas += 1;
  const lido = await consultar(play, {
    cache,
    faixas: FAIXAS,
    ritmos,
    semRede: SEM_REDE,
    avisar: (m) => avisos.push(`${play.join(",") || "(início)"}: ${m}`),
  });
  if (lido === null && !SEM_REDE) semDados += 1;
  return lido;
}

/* ------------------------------------------------------------------ *
 * O motor
 * ------------------------------------------------------------------ */

// Numa caixa, e não numa variável solta: o TypeScript estreita uma `let` de
// módulo para `null` e depois recusa o `.fechar()` lá embaixo, porque não segue
// a atribuição para dentro de `abrirMotor`. A propriedade de objeto ele não
// estreita, e o tipo continua honesto.
const caixa: { motor: Motor | null } = { motor: null };

async function abrirMotor(): Promise<void> {
  if (SEM_MOTOR) return;
  caixa.motor = new Motor(prepararMotor());
  await caixa.motor.abrir(3);
}

/** A nota de cada candidato, em centésimos para quem tem a vez. */
async function notas(
  play: readonly string[],
  candidatos: readonly string[],
): Promise<Map<string, string>> {
  const fora = new Map<string, string>();
  if (!caixa.motor || candidatos.length === 0) return fora;
  const posicao = `startpos${play.length > 0 ? ` moves ${play.join(" ")}` : ""}`;
  for (const variante of await caixa.motor.pensar(posicao, PROFUNDIDADE_DO_MOTOR, candidatos)) {
    const primeiro = variante.pv.split(" ")[0];
    // O Stockfish fala sempre do ponto de vista de quem tem a vez, e é esse o
    // ponto de vista que interessa aqui: o candidato é lance de quem joga.
    fora.set(
      primeiro,
      variante.centesimos === null
        ? "mate"
        : `${variante.centesimos >= 0 ? "+" : "-"}${(Math.abs(variante.centesimos) / 100)
            .toFixed(2)
            .replace(".", ",")}`,
    );
  }
  return fora;
}

/* ------------------------------------------------------------------ *
 * A caminhada
 * ------------------------------------------------------------------ */

type Candidato = { san: string; uci: string; jogos: number; pct: number; nota?: string };

type Degrau = 0 | 1 | 2 | 3;

type Passo = {
  ply: number;
  meu: boolean;
  /** O lance escolhido pela caminhada. `null` quando ela não teve por onde seguir. */
  escolhido: { san: string; uci: string } | null;
  degrau: Degrau;
  /** O que a fonte joga daqui, com a prosa dela. */
  daFonte: { san: string; cursos: string[]; prosa: string[] }[];
  /** Os três mais jogados do degrau que valeu, já com a nota do motor. */
  candidatos: Candidato[];
  /** Quantos jogos a posição tem, no degrau que valeu. */
  jogosNaPosicao: number;
  ritmos: readonly string[];
  /** O estado da régua DEPOIS deste lance. */
  rocou: boolean;
  emCasa: string[];
};

type Dossie = {
  linha: Linha;
  /** O estado da régua na ponta de HOJE. */
  hoje: { nossos: number; rocou: boolean; emCasa: string[] };
  passos: Passo[];
  /** Por que a caminhada parou. */
  parou: "fechou" | "teto" | "sem-lance";
};

const rotulo = (ply: number): string => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? "." : "..."}`;

/** O que a fonte joga a partir desta posição, agrupado por lance. */
function daFonte(corpus: Corpus, fen: string): Passo["daFonte"] {
  const porSan = new Map<string, { cursos: Set<string>; prosa: Set<string> }>();
  for (const p of corpus.partem.get(corpus.chave(fen)) ?? []) {
    let alvo = porSan.get(p.san);
    if (!alvo) {
      alvo = { cursos: new Set(), prosa: new Set() };
      porSan.set(p.san, alvo);
    }
    alvo.cursos.add(p.curso);
    if (p.com) alvo.prosa.add(`${p.curso}: ${p.com.replace(/\s+/g, " ").trim()}`);
  }
  return [...porSan]
    .map(([san, { cursos, prosa }]) => ({ san, cursos: [...cursos], prosa: [...prosa] }))
    .sort((a, b) => b.cursos.length - a.cursos.length);
}

async function montarDossie(corpus: Corpus | null, linha: Linha): Promise<Dossie> {
  const jogo = new Chess(linha.fenInicial);
  for (const uci of linha.lances) {
    jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  }

  const fechamentoHoje = fechamentoDe(linha);
  const hoje = {
    nossos: linha.meus.length,
    rocou: fechamentoHoje.rocou,
    emCasa: fechamentoHoje.emCasa,
  };

  const teto = meiosLances(linha.nivel, linha.cor);
  const play = [...linha.lances];
  const sans = [...linha.sans];
  const meus = [...linha.meus];
  const passos: Passo[] = [];
  let parou: Dossie["parou"] = "teto";

  while (play.length < teto) {
    const ply = play.length;
    const meu = (ply % 2 === 0) === (linha.cor === "brancas");

    // Parar assim que a régua fechar, e nunca antes do lance 12: é a regra de
    // término da §24, e ela olha a posição depois do NOSSO lance.
    const agora = fechamentoDe({ cor: linha.cor, sans, meus, fenFinal: jogo.fen() });
    if (meus.length >= PROFUNDIDADE_MINIMA && agora.rocou && agora.emCasa.length === 0) {
      parou = "fechou";
      break;
    }

    const fonteAqui = corpus ? daFonte(corpus, jogo.fen()) : [];

    // Degrau 1, e o 2 quando o 1 não tem jogo bastante.
    let posicao = await explorer(play, RITMOS);
    let ritmos: readonly string[] = RITMOS;
    let degrau: Degrau = fonteAqui.length > 0 ? 0 : 1;
    if (!posicao || posicao.jogos < JOGOS_MINIMOS) {
      const comBlitz = await explorer(play, RITMOS_COM_BLITZ);
      if (comBlitz && (!posicao || comBlitz.jogos > posicao.jogos)) {
        posicao = comBlitz;
        ritmos = RITMOS_COM_BLITZ;
        if (degrau !== 0) degrau = 2;
      }
    }
    if (degrau !== 0 && (!posicao || posicao.jogos < JOGOS_MINIMOS)) degrau = 3;

    // O UCI vem da nossa `chess.js`, e NÃO do explorer — medido em 8/9/2026: o
    // explorer devolve o roque no estilo Chess960 (`e1h1`, `e8a8`, o rei sobre a
    // torre), e o Stockfish só aceita `e1g1`/`e8c8`. Passando o `uci` dele em
    // `searchmoves`, o motor descarta o lance em silêncio e a nota do roque some
    // do dossiê — justamente o lance que a régua da §24 mais cobra.
    const tres = (posicao?.respostas ?? []).slice(0, 3).flatMap((r) => {
      try {
        const feito = jogo.move(r.san);
        jogo.undo();
        return [{ ...r, uci: `${feito.from}${feito.to}${feito.promotion ?? ""}` }];
      } catch {
        return [];
      }
    });
    const notasDeles = meu
      ? await notas(
          play,
          tres.map((r) => r.uci),
        )
      : new Map<string, string>();
    const candidatos: Candidato[] = tres.map((r) => ({
      san: r.san,
      uci: r.uci,
      jogos: r.jogos,
      pct: r.pct,
      nota: notasDeles.get(r.uci),
    }));

    // A escolha da caminhada: o degrau mais baixo que tiver lance. A fonte
    // ganha do explorer sempre que alcança a posição — ela é a única que traz
    // motivo escrito, e motivo escrito é o que o repertório existe para dar.
    const sanDaFonte = fonteAqui[0]?.san;
    const escolhidoSan = sanDaFonte ?? candidatos[0]?.san;
    let escolhido: Passo["escolhido"] = null;
    if (escolhidoSan) {
      try {
        const feito = jogo.move(escolhidoSan);
        escolhido = { san: feito.san, uci: `${feito.from}${feito.to}${feito.promotion ?? ""}` };
      } catch {
        escolhido = null;
      }
    }
    if (!escolhido) {
      passos.push({
        ply,
        meu,
        escolhido: null,
        degrau: 3,
        daFonte: fonteAqui,
        candidatos,
        jogosNaPosicao: posicao?.jogos ?? 0,
        ritmos,
        rocou: agora.rocou,
        emCasa: agora.emCasa,
      });
      parou = "sem-lance";
      break;
    }

    play.push(escolhido.uci);
    sans.push(escolhido.san);
    if (meu) meus.push(ply);

    const depois = fechamentoDe({ cor: linha.cor, sans, meus, fenFinal: jogo.fen() });
    passos.push({
      ply,
      meu,
      escolhido,
      degrau,
      daFonte: fonteAqui,
      candidatos,
      jogosNaPosicao: posicao?.jogos ?? 0,
      ritmos,
      rocou: depois.rocou,
      emCasa: depois.emCasa,
    });
  }

  return { linha, hoje, passos, parou };
}

/* ------------------------------------------------------------------ *
 * A saída
 * ------------------------------------------------------------------ */

const pecas = (casas: readonly string[]): string => (casas.length === 0 ? "-" : casas.join(" "));

function escreverDossie(d: Dossie): string {
  const l = d.linha;
  const texto: string[] = [];
  const diz = (t = ""): number => texto.push(t);

  diz(`# ${l.id}`);
  diz();
  diz(`**${l.nome}**`);
  diz();
  diz(`- fonte de hoje: ${l.fonte.split(".")[0]}`);
  diz(`- nível: ${l.nivel} · cor: ${l.cor} · teto: ${meiosLances(l.nivel, l.cor)} meios-lances`);
  diz(
    `- lances de hoje: ${l.sans
      .map((s, i) => `${i % 2 === 0 ? `${i / 2 + 1}.` : ""}${s}`)
      .join(" ")}`,
  );
  diz(
    `- na ponta de hoje: ${d.hoje.nossos} lances nossos · ` +
      `${d.hoje.rocou ? "rocou" : "**sem roque**"} · em casa: ${pecas(d.hoje.emCasa)}`,
  );
  diz(
    `- a caminhada parou por: ${
      d.parou === "fechou"
        ? "**a régua fechou**"
        : d.parou === "teto"
          ? "**bateu no teto de 14**"
          : "**não achei lance** — degrau 3, o [%plano] resolve"
    }`,
  );
  diz();

  for (const p of d.passos) {
    const cabeca = p.escolhido
      ? `${rotulo(p.ply)}${p.escolhido.san}`
      : `${rotulo(p.ply)}??? — a caminhada parou aqui`;
    diz(`## ${cabeca}   ${p.meu ? "(NOSSO)" : "(dele)"}   degrau ${p.degrau}`);
    diz();
    diz(`régua depois deste lance: ${p.rocou ? "rocou" : "sem roque"} · em casa: ${pecas(p.emCasa)}`);
    diz();

    if (p.daFonte.length > 0) {
      diz("**a fonte joga:**");
      for (const f of p.daFonte) {
        diz(`- \`${f.san}\` — ${f.cursos.join(", ")}`);
        for (const prosa of f.prosa.slice(0, 3)) diz(`  > ${prosa}`);
      }
      diz();
    } else {
      diz("**a fonte não alcança esta posição.**");
      diz();
    }

    const faixa = `${RECORTE}, ${p.ritmos.join("+")}`;
    if (p.candidatos.length > 0) {
      diz(`**o explorer (${faixa}, ${p.jogosNaPosicao} jogos na posição):**`);
      for (const c of p.candidatos) {
        const pouco = c.jogos < JOGOS_MINIMOS ? "  [!] abaixo de 200" : "";
        diz(
          `- \`${c.san}\` — ${c.pct}% · ${c.jogos} jogos${c.nota ? ` · motor ${c.nota}` : ""}${pouco}`,
        );
      }
    } else {
      diz(`**o explorer não tem nada nesta posição** (${faixa}).`);
    }
    diz();
  }

  return `${texto.join("\n")}\n`;
}

/* ------------------------------------------------------------------ *
 * A linha de comando
 * ------------------------------------------------------------------ */

const corpus = carregarCorpus();
if (!corpus) console.log(`${recadoSemCorpus(ondeEstaOCorpus().procurei)}\n(sigo sem o degrau 0.)\n`);

// A tabela não precisa da rede nem do motor: ela lê a régua na ponta de hoje.
if (!DOSSIES && !ALVO) {
  console.log(`${linhas.length} linhas — onde elas param hoje, e o que falta para fechar a régua\n`);
  console.log(
    `  ${"id".padEnd(30)}${"nossos".padEnd(8)}${"roque".padEnd(8)}${"em casa".padEnd(18)}fonte`,
  );
  let semRoque = 0;
  let emCasa = 0;
  for (const l of [...linhas].sort((a, b) => a.id.localeCompare(b.id))) {
    const f = fechamentoDe(l);
    if (!f.rocou) semRoque += 1;
    emCasa += f.emCasa.length;
    const alcanca = corpus ? (corpus.chegam.has(corpus.chave(l.fenFinal)) ? "sim" : "não") : "?";
    console.log(
      `  ${l.id.padEnd(30)}${String(l.meus.length).padEnd(8)}${(f.rocou ? "sim" : "NÃO").padEnd(8)}` +
        `${pecas(f.emCasa).padEnd(18)}${alcanca}`,
    );
  }
  console.log(
    `\nfaltam ${PROFUNDIDADE_MINIMA} lances nossos no mínimo. ` +
      `Hoje: ${semRoque} linhas sem roque, ${emCasa} peças menores em casa.`,
  );
  console.log("A coluna 'fonte' diz se o curso alcança a posição final de hoje.");
  process.exit(0);
}

await abrirMotor();

const alvos = ALVO ? linhas.filter((l) => l.id === ALVO) : linhas;
if (alvos.length === 0) {
  console.error(`Não achei a linha ${ALVO}. Os ids saem de npm run repertorio:cauda.`);
  process.exit(1);
}

if (DOSSIES) mkdirSync(PASTA_DOSSIES, { recursive: true });

let fechou = 0;
for (const linha of alvos) {
  const dossie = await montarDossie(corpus, linha);
  if (dossie.parou === "fechou") fechou += 1;
  const texto = escreverDossie(dossie);
  if (DOSSIES) {
    writeFileSync(path.join(PASTA_DOSSIES, `${linha.id}.md`), texto, "utf8");
    console.log(`  ${linha.id}: ${dossie.passos.length} meios-lances de cauda (${dossie.parou})`);
  } else {
    console.log(texto);
  }
}

caixa.motor?.fechar();

if (DOSSIES) {
  console.log(
    `\n${alvos.length} dossiês em content/repertorio/caudas/ — ` +
      `${consultas} consultas ao explorer, ${fechou} caminhadas fecharam a régua sozinhas.`,
  );
}
if (avisos.length > 0) {
  console.log(`
${avisos.length} aviso(s) do explorer — 429 é adiamento, não furo:`);
  for (const a of [...new Set(avisos)].slice(0, 10)) console.log(`  ${a}`);
}

// Só reprova quando alguma posição ficou SEM DADO. Um 429 que a retentativa
// resolveu não é furo: a medição saiu inteira, só demorou. Reprovar por causa
// dele mandaria refazer 442 consultas que já estão certas — e, pior, ensinaria
// quem roda o script a ignorar a saída vermelha, que é como um furo de verdade
// passa despercebido depois.
if (semDados > 0) {
  console.error(`
${semDados} posição(ões) ficaram sem dado do explorer. A medição está furada.`);
  process.exit(1);
}
