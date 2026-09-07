import { readFileSync } from "node:fs";
import path from "node:path";
import { validarDicas } from "../lib/meiojogo/dicas.ts";
import { julgarVariantes, porta1, SALTO_PADRAO } from "../lib/meiojogo/portas.ts";
import { RAIZ } from "./env-local.ts";
import { Motor, prepararMotor } from "./motor.ts";

/**
 * Re-mede as portas 1 e 2 nas posições de treino que já viraram conteúdo.
 *
 * Uso:
 *   node scripts/medir-portas.ts                      todas as do conteúdo
 *   node scripts/medir-portas.ts "<fen>" "<fen>"      posições soltas, antes de virarem item
 *   ... --profundidade 12                             a mesma do funil
 *
 * ## Por que isto não mora dentro do `validate:content`
 *
 * A porta 1 mora — ela é `chess.js` e custa milissegundos, e o gate a re-roda em
 * toda posição de treino. A porta 2 é o Stockfish: sete segundos por posição num
 * dia bom, e um binário WebAssembly de 7 MB que precisa carregar. Pendurar isso
 * no gate faria a conferência de conteúdo depender do motor para rodar, e um
 * gate que demora ninguém roda.
 *
 * Então o conteúdo **grava o número medido** (`curadoria.portas.salto`) e o gate
 * cobra que ele exista e caiba no teto. Este script é quem produz esse número, e
 * quem o confere quando alguém mexe numa FEN — a diferença entre o gravado e o
 * medido aparece aqui, com o nome do item ao lado.
 */

const argv = process.argv.slice(2);
const onde = argv.indexOf("--profundidade");
const PROFUNDIDADE = onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : 12;
const soltas = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));

type Alvo = { nome: string; fen: string; gravado: { profundidade: number; salto: number } | null };

const alvos: Alvo[] = [];

if (soltas.length > 0) {
  for (const [i, fen] of soltas.entries()) alvos.push({ nome: `solta ${i + 1}`, fen, gravado: null });
} else {
  const dicas = validarDicas(
    JSON.parse(readFileSync(path.join(RAIZ, "content", "meio-jogo.json"), "utf8")),
  );
  for (const dica of dicas) {
    for (const item of [...(dica.treino?.reconhecimento ?? []), ...(dica.treino?.reservas ?? [])]) {
      alvos.push({
        nome: item.id,
        fen: item.fen,
        gravado: {
          profundidade: item.curadoria.portas.profundidade,
          salto: item.curadoria.portas.salto,
        },
      });
    }
  }
}

if (alvos.length === 0) {
  console.log("Nenhuma posição de treino no conteúdo, e nenhuma FEN na linha de comando.");
  process.exit(0);
}

const motor = new Motor(prepararMotor());
await motor.abrir(2);

let divergencias = 0;
for (const alvo of alvos) {
  const estatica = porta1(alvo.fen);
  const variantes = await motor.pensar(`fen ${alvo.fen}`, PROFUNDIDADE);
  const veredito = julgarVariantes(variantes, SALTO_PADRAO);

  const linha1 = estatica === null ? "porta 1 passou" : `PORTA 1 REPROVA (${estatica})`;
  const linha2 = veredito.passou
    ? `porta 2 passou, salto ${veredito.salto}`
    : `PORTA 2 REPROVA (${veredito.motivo})`;
  let nota = "";
  if (alvo.gravado !== null) {
    if (alvo.gravado.profundidade !== PROFUNDIDADE) {
      nota = `  — gravado na profundidade ${alvo.gravado.profundidade}, medido nesta`;
    } else if (alvo.gravado.salto !== veredito.salto) {
      nota = `  — GRAVADO ${alvo.gravado.salto}, MEDIDO ${veredito.salto}`;
      divergencias += 1;
    }
  }
  if (estatica !== null || !veredito.passou) divergencias += 1;
  console.log(`${alvo.nome.padEnd(12)} ${linha1.padEnd(26)} ${linha2}${nota}`);
}
motor.fechar();

console.log(
  `\n${alvos.length} posição(ões) medida(s) na profundidade ${PROFUNDIDADE}; ` +
    `${divergencias} divergência(s) ou reprovação(ões).`,
);
process.exit(divergencias > 0 ? 1 : 0);
