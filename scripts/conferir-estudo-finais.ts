/**
 * Confere um estudo de finais com o motor, antes de publicar — `node scripts/conferir-estudo-finais.ts <arquivo.pgn>`.
 *
 * É **aviso, não trava** (decisão do Doug de 15/9/2026: o professor tem a última palavra; sem
 * tablebase). Para cada capítulo:
 *
 * 1. a posição de partida é legal (`problemaDaPosicaoMontada`, a mesma régua do acervo);
 * 2. o resultado que o motor vê nela: vitória das Brancas, das Pretas, ou empate;
 * 3. cada lance marcado — `!`/`!!` e `?`/`??`/`?!` — na linha principal e nas variantes: o `!` que
 *    muda o resultado da posição e o `??` que não muda nada viram aviso, com o lance nomeado. `?` e
 *    `?!` só são impressos: o erro de jeito ("xeque à toa") costuma não mudar o resultado.
 *
 * A tabela sai no terminal. O motor é o Stockfish offline de `scripts/motor.ts`, o mesmo da prática.
 */
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { problemaDaPosicaoMontada } from "../lib/chess/fen.ts";
import { lerEstudo } from "../lib/editor-v2/importar-estudo.ts";
import type { AnaliseV2 } from "../lib/editor-v2/modelo.ts";
import { Motor, prepararMotor } from "./motor.ts";

type Resultado = "brancas" | "pretas" | "empate";
const PROFUNDIDADE = Number(process.env.PROFUNDIDADE ?? 22);
const NOME: Record<Resultado, string> = { brancas: "Brancas ganham", pretas: "Pretas ganham", empate: "empate" };
const CERTO = new Set([1, 3]);
const ERRADO = new Set([2, 4, 6]);
const GRAFIA: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

/** O resultado que o motor vê, pela nota da melhor linha. Mate: quem dá é quem fez o último lance da linha. */
async function resultado(motor: Motor, fen: string): Promise<{ resultado: Resultado; nota: string }> {
  const jogo = new Chess(fen);
  if (jogo.isCheckmate()) return { resultado: jogo.turn() === "w" ? "pretas" : "brancas", nota: "mate" };
  if (jogo.isStalemate() || jogo.isInsufficientMaterial()) return { resultado: "empate", nota: "0.00" };
  const [melhor] = await motor.pensar(`fen ${fen}`, PROFUNDIDADE);
  if (!melhor) return { resultado: "empate", nota: "?" };
  const vez = fen.split(" ")[1];
  if (melhor.centesimos === null) {
    const plies = melhor.pv.trim().split(/\s+/).length;
    const quemDa = plies % 2 === 1 ? vez : vez === "w" ? "b" : "w";
    return { resultado: quemDa === "w" ? "brancas" : "pretas", nota: `mate (${Math.ceil(plies / 2)})` };
  }
  const brancas = vez === "w" ? melhor.centesimos : -melhor.centesimos;
  const nota = (brancas / 100).toFixed(2);
  return { resultado: brancas > 250 ? "brancas" : brancas < -250 ? "pretas" : "empate", nota };
}

type Linha = { capitulo: string; onde: string; tipo: "ok" | "aviso" | "erro"; texto: string };

async function conferirAnalise(motor: Motor, titulo: string, analise: AnaliseV2, saida: Linha[]) {
  if (analise.inicio.tipo !== "fen") return;
  const inicial = analise.inicio.fen;
  const problema = problemaDaPosicaoMontada(inicial);
  if (problema) { saida.push({ capitulo: titulo, onde: "posição", tipo: "erro", texto: `posição ilegal: ${problema}` }); return; }
  const doInicio = await resultado(motor, inicial);
  saida.push({ capitulo: titulo, onde: "posição", tipo: "ok", texto: `${NOME[doInicio.resultado]} (${doInicio.nota}), ${inicial.split(" ")[1] === "w" ? "Brancas" : "Pretas"} jogam` });

  const andar = async (noId: string, fen: string) => {
    const no = analise.nos[noId];
    for (const filhoId of no?.filhos ?? []) {
      const filho = analise.nos[filhoId];
      if (!filho?.uci) continue;
      const jogo = new Chess(fen);
      const [, vez, , , , numero] = fen.split(" ");
      let san: string;
      try { san = jogo.move({ from: filho.uci.slice(0, 2), to: filho.uci.slice(2, 4), promotion: filho.uci.slice(4) || undefined }).san; } catch { continue; }
      const marcas = filho.nags ?? [];
      if (marcas.some((n) => CERTO.has(n) || ERRADO.has(n))) {
        const antes = await resultado(motor, fen);
        const depois = await resultado(motor, jogo.fen());
        const lance = `${numero}${vez === "w" ? "." : "..."} ${san}${marcas.map((n) => GRAFIA[n] ?? `$${n}`).join("")}`;
        const mudou = antes.resultado !== depois.resultado;
        if (marcas.some((n) => CERTO.has(n)) && mudou) saida.push({ capitulo: titulo, onde: lance, tipo: "aviso", texto: `marcado como bom, mas muda o resultado: antes ${NOME[antes.resultado]} (${antes.nota}), depois ${NOME[depois.resultado]} (${depois.nota})` });
        // `??` diz "joga o resultado fora"; `?` e `?!` também servem ao erro de jeito, que não muda o resultado.
        else if (marcas.includes(4) && !mudou) saida.push({ capitulo: titulo, onde: lance, tipo: "aviso", texto: `marcado ?? (perde o resultado), mas o resultado não muda: ${NOME[antes.resultado]} (${antes.nota} → ${depois.nota})` });
        else saida.push({ capitulo: titulo, onde: lance, tipo: "ok", texto: `${NOME[antes.resultado]} → ${NOME[depois.resultado]} (${depois.nota})` });
      }
      await andar(filhoId, jogo.fen());
    }
  };
  await andar(analise.raizId, inicial);
}

async function main() {
  const arquivo = process.argv[2];
  if (!arquivo) { console.error("uso: node scripts/conferir-estudo-finais.ts <arquivo.pgn>"); process.exit(2); }
  const leitura = lerEstudo(readFileSync(arquivo, "utf8"));
  const motor = new Motor(prepararMotor());
  await motor.abrir(1);
  const saida: Linha[] = [];
  try {
    for (const c of leitura.capitulos) {
      const titulo = `${String(c.numero).padStart(2, "0")} ${c.titulo}`;
      const analise = c.jogo.analise ?? c.parado?.analise;
      if (!analise) {
        const problema = problemaDaPosicaoMontada(c.fen);
        saida.push({ capitulo: titulo, onde: "posição", tipo: problema ? "erro" : "ok", texto: problema ? `posição ilegal: ${problema}` : "sem lances" });
        if (!problema) { const r = await resultado(motor, c.fen); saida[saida.length - 1].texto = `${NOME[r.resultado]} (${r.nota}), sem lances`; }
        continue;
      }
      await conferirAnalise(motor, titulo, analise, saida);
    }
  } finally {
    motor.fechar();
  }
  const marca = { ok: " ", aviso: "!", erro: "X" };
  for (const linha of saida) console.log(`${marca[linha.tipo]} ${linha.capitulo} | ${linha.onde} | ${linha.texto}`);
  const avisos = saida.filter((l) => l.tipo === "aviso").length;
  const erros = saida.filter((l) => l.tipo === "erro").length;
  console.log(`\n${leitura.capitulos.length} capítulos, ${saida.length} conferências: ${erros} erro(s), ${avisos} aviso(s).`);
}

await main();
