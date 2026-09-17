/**
 * O desperado **em teste**: 39 puzzles escolhidos à mão do banco, para o Doug
 * conferir um por um antes de o tema entrar no currículo (16/9/2026).
 *
 * Uso:
 *   node scripts/desperado-teste.ts            (grava as faixas, o índice e a tabela)
 *   node scripts/desperado-teste.ts --forcar   (reescreve a tabela mesmo se já existir)
 *
 * Por que 39: é o que as três etapas de um tema consomem (5 + 24 + 10, ver
 * `lib/tatica/serie.ts`). Com menos, o aquecimento e a prova repetiriam puzzles.
 *
 * As regras da escolha:
 * - a tag `desperado` de `dados/etiquetas-nossas.tsv`, reconferida pelo detector
 *   como ele está hoje (80% na terceira auditoria), e os filtros de qualidade de
 *   sempre (`lerLinha`, `problemaDo`);
 * - **nenhum id de amostra já auditada**: todo id citado em `dados/auditoria*`
 *   (de qualquer tag) e, por garantia, todo desperado de
 *   `dados/etiquetas-amostra.tsv` — a amostra da primeira rodada foi
 *   sobrescrita pela terceira, e aquele arquivo é o universo de onde ela saiu;
 * - espalhados de 1100 a 2100, nas cinco faixas de 200 do bloco 7: 8, 8, 8, 8 e 7,
 *   sorteados por hash (reprodutível).
 *
 * Grava `public/puzzles/desperado/<faixa>.json`, a entrada no `index.json` (logo
 * depois de `counterCheck`, a ordem de `BLOCOS`) e `docs/DESPERADO-TESTE.md`. A
 * tabela não é reescrita se já existir, para não apagar a coluna do Doug.
 *
 * Depois disto, `npm run puzzles:filtrar` mantém exatamente estes 39: tema com
 * `emTeste` só aceita os ids que já estão em disco.
 */

import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Chess, type Move, type Square } from "chess.js";
import { chaveDe } from "../lib/tatica/chave.ts";
import { desperado } from "../lib/tatica/padroes/detectores.ts";
import { comEtiquetasNossas, lerEtiquetasNossas, lerLinha, problemaDo, type Bruto } from "./puzzles-lichess.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const TAG = "desperado";
const FAIXAS: [number, number, number][] = [
  [1100, 1300, 8],
  [1300, 1500, 8],
  [1500, 1700, 8],
  [1700, 1900, 8],
  [1900, 2100, 7],
];
const forcar = process.argv.includes("--forcar");

/* ------------------------------------------------------------------ *
 * O que não pode entrar
 * ------------------------------------------------------------------ */

const auditados = new Set<string>();
for (const pasta of readdirSync(path.join(RAIZ, "dados")).filter((n) => n.startsWith("auditoria"))) {
  for (const arquivo of readdirSync(path.join(RAIZ, "dados", pasta))) {
    const texto = readFileSync(path.join(RAIZ, "dados", pasta, arquivo), "utf8");
    for (const m of texto.matchAll(/^### (\S+) \(rating/gm)) auditados.add(m[1]);
  }
}
const citadosNosTxt = auditados.size;
for (const id of lerEtiquetasNossas(path.join(RAIZ, "dados/etiquetas-amostra.tsv")).porId.entries()) {
  if (id[1].includes(TAG)) auditados.add(id[0]);
}

/* ------------------------------------------------------------------ *
 * A varredura
 * ------------------------------------------------------------------ */

const nossas = lerEtiquetasNossas(path.join(RAIZ, "dados/etiquetas-nossas.tsv"));
const baldes = FAIXAS.map(([de, ate, quantos]) => ({ de, ate, quantos, vistos: 0, candidatos: [] as Bruto[] }));
let comTag = 0;
let excluidos = 0;
let recusadosPeloDetector = 0;

const leitor = createInterface({
  input: createReadStream(path.join(RAIZ, "dados/lichess_db_puzzle.csv"), { encoding: "utf8" }),
  crlfDelay: Infinity,
});
for await (const linha of leitor) {
  const cru = lerLinha(linha, 1100, 2100);
  if (!cru) continue;
  const p = comEtiquetasNossas(cru, nossas);
  if (!p.temas.includes(TAG)) continue;
  const balde = baldes.find((b) => p.rating >= b.de && p.rating < b.ate);
  if (!balde) continue;
  comTag++;
  balde.vistos++;
  if (auditados.has(p.id)) {
    excluidos++;
    continue;
  }
  if (problemaDo(p)) continue;
  if (!desperado(p.fen, p.lances)) {
    recusadosPeloDetector++;
    continue;
  }
  balde.candidatos.push(p);
}

const escolhidos = baldes.map((b) => ({
  ...b,
  puzzles: [...b.candidatos]
    .sort((x, y) => chaveDe(`desperado-teste:${x.id}`) - chaveDe(`desperado-teste:${y.id}`))
    .slice(0, b.quantos)
    .sort((x, y) => x.rating - y.rating || (x.id < y.id ? -1 : 1)),
}));

for (const b of escolhidos) {
  if (b.puzzles.length < b.quantos) throw new Error(`faixa ${b.de}-${b.ate}: só ${b.puzzles.length} candidatos`);
}

/* ------------------------------------------------------------------ *
 * Gravar as faixas e o índice
 * ------------------------------------------------------------------ */

const pasta = path.join(RAIZ, "public/puzzles", TAG);
if (existsSync(pasta)) rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
const faixas = escolhidos.map((b) => {
  const arquivo = `${TAG}/${b.de}-${b.ate}.json`;
  const bons = b.puzzles.map(({ id, fen, lances, rating, temas }) => ({ id, fen, lances, rating, temas }));
  writeFileSync(path.join(RAIZ, "public/puzzles", arquivo), JSON.stringify(bons), "utf8");
  return { de: b.de, ate: b.ate, arquivo, total: bons.length };
});

const caminhoDoIndice = path.join(RAIZ, "public/puzzles/index.json");
const indice = JSON.parse(readFileSync(caminhoDoIndice, "utf8")) as {
  totalNoSite: number;
  temas: { tag: string; total: number }[];
};
const antigo = indice.temas.find((t) => t.tag === TAG);
if (antigo) {
  indice.totalNoSite -= antigo.total;
  indice.temas = indice.temas.filter((t) => t.tag !== TAG);
}
const entrada = {
  tag: TAG,
  bloco: 7,
  origem: "nosso",
  faixas,
  total: faixas.reduce((s, f) => s + f.total, 0),
  noBanco: baldes.reduce((s, b) => s + b.vistos, 0),
};
indice.temas.splice(indice.temas.findIndex((t) => t.tag === "counterCheck") + 1, 0, entrada);
indice.totalNoSite += entrada.total;
writeFileSync(caminhoDoIndice, `${JSON.stringify(indice, null, 2)}\n`, "utf8");

/* ------------------------------------------------------------------ *
 * A tabela para o Doug
 * ------------------------------------------------------------------ */

const NOME: Record<string, [string, "o" | "a"]> = {
  p: ["peão", "o"],
  n: ["cavalo", "o"],
  b: ["bispo", "o"],
  r: ["torre", "a"],
  q: ["dama", "a"],
  k: ["rei", "o"],
};
const VALOR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const nome = (tipo: string) => `${NOME[tipo][1]} ${NOME[tipo][0]}`;
const peloNome = (tipo: string) => `${NOME[tipo][1] === "a" ? "pela" : "pelo"} ${NOME[tipo][0]}`;
const sufixo = (tipo: string) => (NOME[tipo][1] === "a" ? "a" : "o");

function jogar(jogo: Chess, uci: string): Move {
  return jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

/** A linha em notação numerada, a partir do lance dele. */
function linhaEmSan(p: Bruto): string {
  const jogo = new Chess(p.fen);
  let numero = Number(p.fen.split(" ")[5]);
  const partes: string[] = [];
  for (const [i, uci] of p.lances.entries()) {
    const brancas = jogo.turn() === "w";
    const m = jogar(jogo, uci);
    const texto = brancas ? `${numero}.${m.san}` : i === 0 || i === 1 ? `${numero}...${m.san}` : m.san;
    partes.push(i === 0 ? `(${texto})` : texto);
    if (!brancas) numero++;
  }
  return partes.join(" ");
}

/** A frase do detector: a peça perdida, o que ela vendeu e o que foi colhido. */
function porQue(p: Bruto): string {
  const jogo = new Chess(p.fen);
  const erro = jogar(jogo, p.lances[0]);
  const inicio = new Chess(jogo.fen());
  const de = p.lances[1].slice(0, 2) as Square;
  const quem = inicio.get(de)!;
  const inimigo = quem.color === "w" ? "b" : "w";
  const atacantes = inicio.attackers(de, inimigo).map((c) => inicio.get(c)!.type);
  const defendida = inicio.attackers(de, quem.color).length > 0;
  const menor = atacantes.filter((t) => VALOR[t] < VALOR[quem.type]).sort((a, b) => VALOR[a] - VALOR[b])[0];
  const motivo = !defendida ? `atacad${sufixo(quem.type)} e sem defesa` : `atacad${sufixo(quem.type)} ${peloNome(menor)}`;

  const feitos: Move[] = [];
  for (const uci of p.lances.slice(1)) feitos.push(jogar(jogo, uci));
  const [vende] = feitos;
  const colheita = feitos.find(
    (m, j) =>
      j >= 2 &&
      j % 2 === 0 &&
      m.captured &&
      VALOR[m.captured] >= 3 &&
      inicio.get(m.to)?.type === m.captured &&
      inicio.get(m.from)?.type === m.piece &&
      inicio.attackers(m.to, quem.color).includes(m.from),
  )!;
  const s = sufixo(quem.type);
  return (
    `${erro.san} deixou ${nome(quem.type)} de ${de} perdid${s} (${motivo}); ` +
    `em vez de salvá-l${s}, ${vende.san} come ${nome(vende.captured!)} de ${vende.to} e é tomad${s}; ` +
    `depois ${colheita.san} colhe ${nome(colheita.captured!)} de ${colheita.to}, que já estava pendurad${sufixo(colheita.captured!)}.`
  );
}

const todos = escolhidos.flatMap((b) => b.puzzles);
const linhas = todos.map(
  (p, i) =>
    `| ${i + 1} | ${p.id} | ${p.rating} | [lichess.org/training/${p.id}](https://lichess.org/training/${p.id}) | ${linhaEmSan(p)} | ${porQue(p)} | |`,
);

const tabela = path.join(RAIZ, "docs/DESPERADO-TESTE.md");
if (existsSync(tabela) && !forcar) {
  console.log(`\n${path.relative(RAIZ, tabela)} já existe — não reescrevi (use --forcar).`);
} else {
  writeFileSync(
    tabela,
    [
      "# Desperado em teste — as 39 posições para conferir",
      "",
      `> 16/9/2026. Geradas por \`node scripts/desperado-teste.ts\`, com o detector \`desperado\` como está`,
      "> hoje (80% na 3ª auditoria, sem as duas travas propostas). O tema está no site em",
      "> `/tatica/desperado` marcado **Em teste**, fora dos níveis, selos, tarefas, trilha, prova de",
      "> nível e modo rating.",
      "",
      "## Como marcar",
      "",
      "Na última coluna, escreva **certo** (a ideia do puzzle é vender caro a peça que já estava",
      "perdida) ou **errado** (é outra tática: garfo, desvio, troca comum...). Se quiser, uma palavra",
      "do motivo depois do errado — é por ela que os erros vão ser agrupados.",
      "",
      "A régua é a de sempre, 90%: com 39 posições, **36 certas ou mais**.",
      "",
      "Na coluna da solução, o lance entre parênteses é o do adversário; quem resolve joga a partir do",
      "seguinte. O link abre o puzzle no Lichess já na vez de quem resolve.",
      "",
      "## De onde vieram",
      "",
      `- ${comTag.toLocaleString("pt-BR")} puzzles de 1100 a 2100 com a tag e os filtros de qualidade do site.`,
      `- ${excluidos.toLocaleString("pt-BR")} fora por já estarem numa amostra auditada (${citadosNosTxt.toLocaleString("pt-BR")} ids citados em \`dados/auditoria*\`, mais os desperados de \`dados/etiquetas-amostra.tsv\`).`,
      `- ${recusadosPeloDetector} fora porque o detector de hoje não os confirma mais.`,
      "- Sorteio por hash dentro de cada faixa de 200 pontos: 8, 8, 8, 8 e 7.",
      "",
      "## As posições",
      "",
      "| nº | id | rating | link | linha da solução | por que o detector achou que é desperado | Doug: certo / errado |",
      "|---:|---|---:|---|---|---|---|",
      ...linhas,
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`\nTabela: ${path.relative(RAIZ, tabela)}`);
}

console.log(
  `Com a tag (1100–2100): ${comTag}. Auditados excluídos: ${excluidos}. ` +
    `Recusados pelo detector: ${recusadosPeloDetector}.`,
);
for (const b of escolhidos) {
  console.log(`  ${b.de}-${b.ate}: ${b.puzzles.length} de ${b.candidatos.length} candidatos (${b.vistos} com a tag)`);
}
