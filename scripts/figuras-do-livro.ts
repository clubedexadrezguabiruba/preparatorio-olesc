import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { saldoDeMaterial, semelhancaDePosicoes, validarDicas } from "../lib/meiojogo/dicas.ts";
import { respostaDaTarefa, TAREFAS, type Lado } from "../lib/meiojogo/exercicios.ts";
import { porta1 } from "../lib/meiojogo/portas.ts";
import { lerPartida } from "../lib/meiojogo/descritiva.ts";
import { RAIZ } from "./env-local.ts";

/**
 * As posições de livro do meio-jogo, reconstruídas pelos lances impressos.
 *
 * Uso:
 *   node scripts/figuras-do-livro.ts                     o relatório por tarefa
 *   node scripts/figuras-do-livro.ts --tarefa posto      só as que servem a uma
 *   node scripts/figuras-do-livro.ts --exportar <arq>    grava tudo em JSON
 *   ... --min-pecas 20                                   piso de peças
 *
 * ## O que ele faz, e por que não é transcrição
 *
 * O *Chess Fundamentals* imprime catorze partidas anotadas, e dentro delas
 * cento e cinquenta diagramas — cada um logo depois de um lance. Repetir os
 * lances impressos desde a posição inicial chega **na mesma posição do
 * diagrama**, e nessa via a `chess.js` confere cada lance: um erro de leitura
 * vira lance ilegal e estoura, em vez de virar FEN plausível e errada.
 *
 * A conversão de notação descritiva mora em `lib/meiojogo/descritiva.ts`, e o
 * que este script acrescenta é a costura: achar os lances no HTML, saber depois
 * de qual deles cada figura foi impressa, e rodar as treze tarefas sobre a
 * posição resultante para dizer **a que ela serve**.
 *
 * ## A dependência que este cabeçalho existe para declarar
 *
 * A entrada é `.scratch/meio-jogo-extracao/capablanca.html`, e `.scratch/` está
 * no `.gitignore`. É a convenção do projeto para material de sessão, e foi
 * decidida no Bloco 0 — mas quer dizer que **este script não roda num clone
 * limpo**. Se o arquivo sumir, ele diz isso e sai; o caminho de recuperação é o
 * mesmo do Bloco 0, e a origem é o texto do Project Gutenberg da edição de 1921.
 *
 * O Znosko e o Nimzowitsch **não** entram aqui, e não é esquecimento: as
 * partidas do Znosko começam de um diagrama, não da posição inicial, e no OCR
 * do Nimzowitsch o dígito vira letra ("B-Qz" por B-Q2). Para esses dois o
 * caminho é ler o diagrama em imagem — `scripts/recortar-diagrama.py` e
 * `scripts/conferir-transcricao.ts`.
 */
const argv = process.argv.slice(2);

const valor = (bandeira: string): string | null => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? argv[onde + 1] : null;
};

const MIN_PECAS = Number(valor("--min-pecas") ?? 0);

const SO_TAREFA = valor("--tarefa");

const EXPORTAR = valor("--exportar");

const FONTE = path.join(RAIZ, ".scratch", "meio-jogo-extracao", "capablanca.html");

if (!existsSync(FONTE)) {
  console.error(
    `Falta ${path.relative(RAIZ, FONTE)}.\n` +
      `Ele é o texto do Project Gutenberg de Chess Fundamentals (1921), trazido no Bloco 0.\n` +
      `.scratch/ está no .gitignore de propósito: é material de sessão, não conteúdo.`,
  );
  process.exit(1);
}

// A edição é iso-8859-1, e ler como utf-8 transforma o "×" da captura em lixo.

const html = readFileSync(FONTE, "latin1");

const limpo = (s: string): string =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Partida = {
  titulo: string;
  evento: string | null;
  tokens: string[];
  figuras: { figura: string; depoisDe: number }[];
};

function lerPartidas(): Partida[] {
  const marcas = [...html.matchAll(/GAME\s+\d+\./g)].map((m) => m.index ?? 0);
  marcas.push(html.length);
  const partidas: Partida[] = [];
  for (let k = 0; k < marcas.length - 1; k += 1) {
    const trecho = html.slice(marcas[k], marcas[k + 1]);
    const titulo = limpo(trecho.slice(0, trecho.indexOf("</p>")));
    const evento = limpo(trecho.slice(0, 400)).match(/\(([^()]{3,60})\)/)?.[1] ?? null;
    const tokens: string[] = [];
    const figuras: { figura: string; depoisDe: number }[] = [];
    // Em ordem de documento: as linhas de lance moram em <tr>, as figuras em
    // <img>. É essa separação que o texto cru não tem, e é por isso que o
    // método funciona aqui e não no Lasker.
    const passo = /<tr>[\s\S]*?<\/tr>|<img[^>]*src="images\/(Fig\d+)\.jpg"[^>]*>/g;
    for (const m of trecho.matchAll(passo)) {
      if (m[1]) {
        figuras.push({ figura: m[1], depoisDe: tokens.length });
        continue;
      }
      for (const celula of m[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)) {
        let c = limpo(celula[1]);
        c = c.replace(/\{\d+\}/g, "").replace(/^\s*\d+\.\s*/, "").replace(/\.{4,}/g, "").trim();
        if (c === "" || /^[\d\s.]+$/.test(c)) continue;
        tokens.push(c);
      }
    }
    partidas.push({ titulo, evento, tokens, figuras });
  }
  return partidas;
}

const LADOS: Lado[] = ["brancas", "pretas"];

type Achado = {
  figura: string;
  partida: string;
  evento: string | null;
  lance: string;
  fen: string;
  san: string;
  pecas: number;
  saldo: number;
  porta1: string;
  serve: { tarefa: string; lado: Lado; resposta: string[] }[];
};

const partidas = lerPartidas();

const achados: Achado[] = [];

let lidos = 0;

let total = 0;

for (const p of partidas) {
  total += p.tokens.length;
  const lido = lerPartida(p.tokens);
  lidos += lido.sans.length;
  if (lido.parou) {
    console.log(
      `  ${p.titulo.slice(0, 34).padEnd(35)} parou no lance ${lido.parou.emQue + 1}: ${lido.parou.erro}`,
    );
  }
  for (const f of p.figuras) {
    const i = f.depoisDe - 1;
    if (i < 0 || i >= lido.fens.length) continue;
    const fen = lido.fens[i];
    const pecas = fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
    if (pecas < MIN_PECAS) continue;
    const serve: Achado["serve"] = [];
    for (const tarefa of TAREFAS) {
      for (const lado of LADOS) {
        const resposta = respostaDaTarefa(fen, tarefa, lado);
        if (resposta.length > 0) serve.push({ tarefa: tarefa.id, lado, resposta });
      }
    }
    if (serve.length === 0) continue;
    if (SO_TAREFA && !serve.some((s) => s.tarefa === SO_TAREFA)) continue;
    achados.push({
      figura: f.figura,
      partida: p.titulo,
      evento: p.evento,
      lance: `${Math.ceil(f.depoisDe / 2)} (${f.depoisDe % 2 === 1 ? "brancas" : "pretas"})`,
      fen,
      san: lido.sans.slice(0, f.depoisDe).join(" "),
      pecas,
      saldo: saldoDeMaterial(fen),
      porta1: porta1(fen) ?? "passou",
      serve,
    });
  }
}

console.log(`\n${lidos} de ${total} lances descritivos convertidos em lance legal.`);

console.log(`${achados.length} figura(s) servem a alguma tarefa${SO_TAREFA ? ` (${SO_TAREFA})` : ""}.\n`);

// O que já está publicado, para o relatório dizer o que ainda dá para usar.

const publicadas = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content", "meio-jogo.json"), "utf8")),
).flatMap((d) => (d.treino?.exercicios ?? []).map((i) => ({ id: i.id, fen: i.fen })));

if (SO_TAREFA) {
  for (const a of achados) {
    let pior = { q: 0, id: "—" };
    for (const p of publicadas) {
      const q = semelhancaDePosicoes(a.fen, p.fen);
      if (q > pior.q) pior = { q, id: p.id };
    }
    const serve = a.serve.filter((s) => s.tarefa === SO_TAREFA);
    console.log(
      `${a.figura.padEnd(7)} ${a.partida.replace(/GAME (\d+)\..*/, "G$1").padEnd(5)} ` +
        `lance ${a.lance.padEnd(13)} peças ${String(a.pecas).padStart(2)} saldo ${String(a.saldo).padStart(3)} ` +
        `${a.porta1.padEnd(10)} ${serve.map((s) => `${s.lado}->${s.resposta.join("")}`).join(" | ").padEnd(24)} ` +
        `semelhança ${String(Math.round(pior.q * 100)).padStart(3)}% (${pior.id})`,
    );
    console.log(`        ${a.fen}`);
  }
} else {
  for (const tarefa of TAREFAS) {
    const quantas = achados.filter((a) => a.serve.some((s) => s.tarefa === tarefa.id));
    const quietas = quantas.filter((a) => a.porta1 === "passou");
    console.log(
      `  ${tarefa.id.padEnd(32)} ${String(quantas.length).padStart(3)} figuras · ` +
        `${quietas.length} passam na porta 1`,
    );
  }
}

if (EXPORTAR) {
  const destino = path.isAbsolute(EXPORTAR) ? EXPORTAR : path.join(RAIZ, EXPORTAR);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, `${JSON.stringify(achados, null, 1)}\n`, "utf8");
  console.log(`\ngravado em ${path.relative(RAIZ, destino)}`);
}
