import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { applyUci } from "../lib/chess/fen.ts";
import { lerPartidas } from "../lib/partidas/ler.ts";
import { prepararMotor } from "./motor.ts";

/**
 * O Stockfish do projeto nos momentos das partidas modelo: quais lances valem
 * **o mesmo** que o lance jogado.
 *
 *     npm run partidas:motor -- morphy-isouard 1
 *     npm run partidas:motor -- paulsen-morphy          (todos os momentos)
 *     npm run partidas:motor -- paulsen-morphy --gravar (e grava no JSON)
 *
 * `--gravar` **acrescenta** os lances achados em `alternativasBoas` — nunca tira:
 * uma transposição conferida à mão, que o motor não marca, fica.
 *
 * Existe pelo risco 2 de `docs/PARTIDAS-MODELO.md`: um momento cobrado "de
 * primeira" pune quem joga um lance tão bom quanto o da partida. Lance que o
 * motor avalia igual vai para `alternativasBoas` — **depois** de o Doug aprovar a
 * lista, porque "igual para o motor" nem sempre é "a mesma lição".
 *
 * ## O critério: "não é pior que o lance da partida"
 *
 * Do ponto de vista de quem joga:
 *
 * - o jogado dá mate: o outro também dá, e não mais lento;
 * - o jogado não dá mate: o outro dá mate a favor, ou fica **no máximo**
 *   {@link MARGEM_CP} centésimos abaixo — e nenhum limite para cima. Até 15/9 a
 *   margem valia para os dois lados, e um lance melhor que o da partida era
 *   recusado (achado no Averbakh–Sarvarov, momento 1: O-O +0,46 contra O-O-O +0,11).
 *
 * ## A lista inteira, e não as seis primeiras
 *
 * O motor olha {@link MULTIPV} lances. Se o último deles ainda passa no critério, a
 * lista pode ter mais: a análise é refeita com **todos** os lances legais.
 *
 * Não usa `Motor` de `scripts/motor.ts` porque ele guarda mate como `null`, sem
 * a distância nem o lado — e aqui a distância é justamente o que decide.
 */

const MARGEM_CP = 30;
const PROFUNDIDADE = Number(process.env.PROFUNDIDADE ?? 22);
const MULTIPV = 12;

type Nota = { cp: number } | { mate: number };
type Variante = { uci: string; nota: Nota };

const texto = (n: Nota): string =>
  "mate" in n ? `#${n.mate}` : `${n.cp >= 0 ? "+" : ""}${(n.cp / 100).toFixed(2)}`;

/** Mais é melhor para quem joga. Mate a favor vale mais quanto mais curto. */
const valor = (n: Nota): number =>
  "mate" in n ? (n.mate > 0 ? 100000 - n.mate : -100000 - n.mate) : n.cp;

function igual(jogado: Nota, outro: Nota): boolean {
  if ("mate" in jogado && jogado.mate > 0) return "mate" in outro && outro.mate > 0 && outro.mate <= jogado.mate;
  if ("mate" in outro) return outro.mate > 0;
  if ("mate" in jogado) return true; // o jogado leva mate; qualquer lance sem mate contra não é pior.
  return outro.cp >= jogado.cp - MARGEM_CP;
}

async function analisar(fen: string, searchmoves?: string[], quantas = MULTIPV): Promise<Variante[]> {
  const processo = spawn(process.execPath, [prepararMotor()], { stdio: ["pipe", "pipe", "inherit"] });
  const achadas = new Map<number, { prof: number; v: Variante }>();
  let resto = "";
  const fim = new Promise<void>((resolver) => {
    processo.stdout.on("data", (pedaco: Buffer) => {
      resto += pedaco.toString();
      let corte = resto.indexOf("\n");
      while (corte >= 0) {
        const linha = resto.slice(0, corte).trim();
        resto = resto.slice(corte + 1);
        corte = resto.indexOf("\n");
        const casou = /^info depth (\d+) .*?multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/.exec(linha);
        if (casou) {
          const prof = Number(casou[1]);
          const pv = Number(casou[2]);
          const antes = achadas.get(pv);
          if (!antes || antes.prof <= prof) {
            const nota: Nota = casou[3] === "mate" ? { mate: Number(casou[4]) } : { cp: Number(casou[4]) };
            achadas.set(pv, { prof, v: { uci: casou[5], nota } });
          }
        }
        if (linha.startsWith("bestmove")) resolver();
      }
    });
  });
  const manda = (c: string) => processo.stdin.write(`${c}\n`);
  manda("uci");
  manda(`setoption name MultiPV value ${searchmoves ? searchmoves.length : quantas}`);
  manda("ucinewgame");
  manda(`position fen ${fen}`);
  manda(`go depth ${PROFUNDIDADE}${searchmoves ? ` searchmoves ${searchmoves.join(" ")}` : ""}`);
  await fim;
  manda("quit");
  processo.stdin.end();
  return [...achadas.values()].map((a) => a.v).sort((a, b) => valor(b.nota) - valor(a.nota));
}

const gravar = process.argv.includes("--gravar");
const [slug, qual] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!slug) {
  console.error("uso: npm run partidas:motor -- <slug> [n do momento]");
  process.exit(2);
}
const partida = lerPartidas().partidas.find((p) => p.slug === slug);
if (!partida) {
  console.error(`partida "${slug}" não encontrada em content/partidas/`);
  process.exit(2);
}

const san = (fen: string, uci: string) => applyUci(fen, uci)?.game.history().at(-1) ?? uci;

const achadasPorMomento = new Map<number, string[]>();

for (const m of partida.ficha.momentos.filter((x) => !qual || x.n === Number(qual))) {
  let melhores = await analisar(m.fen);
  const legais = new Chess(m.fen).moves().length;
  const doJogadoAntes = melhores.find((v) => v.uci === m.uci) ?? (await analisar(m.fen, [m.uci]))[0];
  if (melhores.length < legais && igual(doJogadoAntes.nota, melhores.at(-1)!.nota)) {
    // O último da lista ainda empata: pode haver mais. Refaz com todos.
    melhores = await analisar(m.fen, undefined, Math.min(legais, 80));
  }
  const doJogado = melhores.find((v) => v.uci === m.uci) ?? (await analisar(m.fen, [m.uci]))[0];
  console.log(`\n${slug} · momento ${m.n} · ${m.san} (ply ${m.ply}) · profundidade ${PROFUNDIDADE}`);
  console.log(`  jogado   ${m.san.padEnd(8)} ${texto(doJogado.nota)}`);
  const iguais: string[] = [];
  for (const v of melhores) {
    if (v.uci === m.uci) continue;
    const eh = igual(doJogado.nota, v.nota);
    if (eh) iguais.push(v.uci);
    console.log(`  ${eh ? "IGUAL " : "      "}   ${san(m.fen, v.uci).padEnd(8)} ${texto(v.nota)}  (${v.uci})`);
  }
  console.log(`  alternativasBoas sugeridas: ${JSON.stringify(iguais)} (${iguais.length} de ${legais - 1} lances)`);
  achadasPorMomento.set(m.n, iguais);
}

if (gravar) {
  const arquivo = path.join(process.cwd(), "content", "partidas", `${slug}.json`);
  const ficha = JSON.parse(readFileSync(arquivo, "utf8")) as { momentos: { n: number; alternativasBoas: string[] }[] };
  for (const m of ficha.momentos) {
    const novas = achadasPorMomento.get(m.n);
    if (novas) m.alternativasBoas = [...new Set([...m.alternativasBoas, ...novas])];
  }
  writeFileSync(arquivo, `${JSON.stringify(ficha, null, 2)}\n`);
  console.log(`\ngravado em ${path.relative(process.cwd(), arquivo)}`);
}
