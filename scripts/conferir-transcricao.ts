import { Chess } from "chess.js";
import { CAPITULO_CAP, semelhancaDePosicoes, saldoDeMaterial, validarDicas } from "../lib/meiojogo/dicas.ts";
import { respostaDaTarefa, TAREFAS, type Lado } from "../lib/meiojogo/exercicios.ts";
import { porta1 } from "../lib/meiojogo/portas.ts";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./env-local.ts";

/**
 * Confere uma posição transcrita de imagem, antes de ela virar item.
 *
 * Uso:
 *   node scripts/conferir-transcricao.ts "<campo de posição da FEN>" [vez]
 *
 * ## Por que este script existe
 *
 * As posições de livro do Bloco 3 são **reconstruídas** pelos lances impressos
 * (`lib/meiojogo/descritiva.ts`), e nessa via a `chess.js` confere cada lance:
 * um erro de leitura vira lance ilegal, e não FEN plausível e errada. Para os
 * dois conceitos cujo acervo não tinha partida com o traço — a torre na sétima
 * e o bloqueio —, não sobrou alternativa a **ler o diagrama em imagem**, e ali
 * essa rede de segurança não existe.
 *
 * O que substitui a rede: duas leituras independentes que têm de coincidir, e
 * este script, que roda sobre a FEN resultante tudo o que se pode rodar antes
 * de escrever uma linha de prosa —
 *
 * - a posição é legal, e a `chess.js` a aceita;
 * - ela passa na porta 1 (sem xeque, sem mate em 1, sem peça pendurada);
 * - **que tarefas ela serve**, com resposta única, e para que lado;
 * - o saldo de material, que decide se a legenda precisa declará-lo;
 * - a semelhança com cada posição de treino já publicada, contra o teto de 70%.
 *
 * Nada disso prova que a transcrição está certa. O que prova é a coincidência
 * das duas leituras; isto aqui é o que impede uma posição **certa e inútil** de
 * consumir meia hora de escrita antes de alguém descobrir que ela não serve.
 */

const [campo, vez = "w"] = process.argv.slice(2);
if (!campo) {
  console.error('Uso: node scripts/conferir-transcricao.ts "<posição da FEN>" [w|b]');
  process.exit(1);
}

const fen = campo.includes(" ") ? campo : `${campo} ${vez} - - 0 1`;

let jogo: Chess;
try {
  jogo = new Chess(fen);
} catch (erro) {
  console.log(`FEN ILEGAL: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
}

const pecas = fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
console.log(`FEN   ${jogo.fen()}`);
console.log(`peças ${pecas} · saldo de material ${saldoDeMaterial(fen)} (positivo = brancas)`);
console.log(`porta 1: ${porta1(fen) ?? "passou"}`);

console.log("\nSERVE A:");
const LADOS: Lado[] = ["brancas", "pretas"];
let alguma = false;
for (const tarefa of TAREFAS) {
  for (const lado of LADOS) {
    const resposta = respostaDaTarefa(fen, tarefa, lado);
    if (resposta.length === 0) continue;
    alguma = true;
    console.log(`  ${tarefa.id.padEnd(32)} ${lado.padEnd(8)} → ${resposta.join(", ")}`);
  }
}
if (!alguma) console.log("  nenhuma tarefa com resposta única — a posição não vira item");

const dicas = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content", "meio-jogo.json"), "utf8")),
);
const publicadas = dicas.flatMap((d) => (d.treino?.exercicios ?? []).map((i) => i));
let pior = { quanto: 0, id: "—" };
for (const item of publicadas) {
  const quanto = semelhancaDePosicoes(fen, item.fen);
  if (quanto > pior.quanto) pior = { quanto, id: item.id };
}
console.log(
  `\nsemelhança máxima com o que já está publicado: ${Math.round(pior.quanto * 100)}% (${pior.id})` +
    `${pior.quanto >= 0.7 ? "  ← PASSA DO TETO DE 70%" : ""}`,
);
console.log(`teto de posições por capítulo, hoje: ${CAPITULO_CAP}`);
