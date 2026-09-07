import { readFileSync } from "node:fs";
import path from "node:path";
import { Chess, type Color, type Square } from "chess.js";
import { validarDicas } from "../lib/meiojogo/dicas.ts";
import { COR, type Lado } from "../lib/meiojogo/exercicios.ts";
import { juizDaDica, type JuizDeLance, type LanceUci } from "../lib/meiojogo/lances.ts";
import { SALTO_PADRAO } from "../lib/meiojogo/portas.ts";
import { RAIZ } from "./env-local.ts";
import { Motor, prepararMotor } from "./motor.ts";

/**
 * Mede o que o conteúdo de hoje aguenta quando o exercício deixa de ser clique
 * e passa a ser lance — o P1 do plano do meio-jogo.
 *
 * Uso:
 *   node scripts/medir-lances.ts                  geometria + motor (alguns minutos)
 *   node scripts/medir-lances.ts --sem-motor      só a geometria, em segundos
 *   node scripts/medir-lances.ts --profundidade 12
 *
 * ## As duas perguntas, e por que são duas
 *
 * 1. **Geometria** — existe lance legal que aplica o tema? Aqui reprovam as
 *    posições que foram curadas para o clique: `torre-na-setima` foi escolhida
 *    com a torre **já** na sétima, e `coluna-aberta` sem exigir que alguém
 *    consiga entrar na coluna.
 * 2. **Motor** — cada um desses lances é **são**? Um lance que aplica o tema e
 *    perde a partida ensina o contrário da dica, e é a regra dura do plano: só
 *    entra no conteúdo o que cabe em {@link SALTO_PADRAO} centésimos do melhor
 *    lance.
 *
 * A conta do motor é a mesma do repertório: avalia a posição (o melhor, do
 * ponto de vista de quem joga), avalia depois do lance (do ponto de vista do
 * adversário, e por isso invertida), e a diferença é o que o lance custou.
 */

const argv = process.argv.slice(2);
const onde = argv.indexOf("--profundidade");
const PROFUNDIDADE = onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : 12;
const SEM_MOTOR = argv.includes("--sem-motor");

type Alvo = {
  readonly dica: string;
  readonly item: string;
  readonly fen: string;
  readonly lado: Lado;
  readonly juiz: JuizDeLance;
};

const dicas = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content", "meio-jogo.json"), "utf8")),
);

const alvos: Alvo[] = [];
const semJuiz: string[] = [];
for (const dica of dicas) {
  const juiz = juizDaDica(dica.id);
  const itens = [...(dica.treino?.reconhecimento ?? []), ...(dica.treino?.reservas ?? [])];
  if (itens.length === 0) continue;
  if (!juiz) {
    semJuiz.push(`${dica.id} (${itens.length} posições, e nenhum juiz de lance escrito)`);
    continue;
  }
  for (const item of itens) {
    alvos.push({ dica: dica.id, item: item.id, fen: item.fen, lado: item.lado, juiz });
  }
}

/** A mesma posição com a vez trocada — ou `null` quando isso a torna ilegal. */
function comVezTrocada(fen: string): string | null {
  const partes = fen.split(" ");
  partes[1] = partes[1] === "w" ? "b" : "w";
  partes[3] = "-"; // en passant não sobrevive à troca de vez
  const trocada = partes.join(" ");
  try {
    const jogo = new Chess(trocada);
    const parado: Color = jogo.turn() === "w" ? "b" : "w";
    const rei = jogo.findPiece({ type: "k", color: parado })[0];
    if (rei && jogo.isAttacked(rei as Square, jogo.turn())) return null;
    return trocada;
  } catch {
    return null;
  }
}

type Geometria = {
  readonly alvo: Alvo;
  readonly vezCerta: boolean;
  readonly lances: LanceUci[];
  /** Os lances que existiriam se a vez fosse do outro lado — o diagnóstico. */
  readonly seTrocasseAVez: LanceUci[] | null;
};

const geometria: Geometria[] = alvos.map((alvo) => {
  const jogo = new Chess(alvo.fen);
  const vezCerta = jogo.turn() === COR[alvo.juiz.quemJoga(alvo.lado)];
  const lances = alvo.juiz.lances(alvo.fen, alvo.lado);
  let seTrocasseAVez: LanceUci[] | null = null;
  if (!vezCerta) {
    const trocada = comVezTrocada(alvo.fen);
    seTrocasseAVez = trocada === null ? null : alvo.juiz.lances(trocada, alvo.lado);
  }
  return { alvo, vezCerta, lances, seTrocasseAVez };
});

console.log(`\n=== Geometria: existe lance que aplica o tema? (${alvos.length} posições) ===\n`);
for (const g of geometria) {
  const motivo = g.vezCerta
    ? g.lances.length > 0
      ? `${g.lances.length} lance(s): ${g.lances.join(" ")}`
      : "NENHUM — o alvo existe mas ninguém chega nele, ou a tarefa não serve"
    : `VEZ ERRADA (o tema é de ${g.alvo.juiz.quemJoga(g.alvo.lado)})` +
      (g.seTrocasseAVez === null
        ? "; trocar a vez deixa a posição ilegal"
        : `; trocando a vez seriam ${g.seTrocasseAVez.length} lance(s)`);
  console.log(`${g.alvo.item.padEnd(10)} ${g.alvo.juiz.id.padEnd(32)} ${motivo}`);
}

const comLance = geometria.filter((g) => g.vezCerta && g.lances.length > 0);
console.log(
  `\n${comLance.length} de ${alvos.length} têm lance do tema pela geometria; ` +
    `${alvos.length - comLance.length} não têm.`,
);
if (semJuiz.length > 0) console.log(`Fora da conta: ${semJuiz.join("; ")}.`);

if (SEM_MOTOR) process.exit(0);

/* ------------------------------------------------------------------ *
 * O portão do motor
 * ------------------------------------------------------------------ */

console.log(`\n=== Motor: cada lance do tema é são? (profundidade ${PROFUNDIDADE}) ===\n`);

const motor = new Motor(prepararMotor());
await motor.abrir(1);

/** A avaliação da posição em centésimos, do ponto de vista de quem joga. */
async function avaliar(posicao: string): Promise<number | null> {
  const variantes = await motor.pensar(posicao, PROFUNDIDADE);
  if (variantes.length === 0) return null;
  return variantes[0].centesimos;
}

type Julgado = { lance: LanceUci; custo: number | null; sao: boolean };

let posicoesSas = 0;
const relatorio: { item: string; julgados: Julgado[]; nota: string }[] = [];

for (const g of comLance) {
  const melhor = await avaliar(`fen ${g.alvo.fen}`);
  const julgados: Julgado[] = [];
  let nota = "";
  if (melhor === null) {
    nota = "motor mudo ou mate na linha principal — não medível";
  } else {
    for (const lance of g.lances) {
      const depois = await avaliar(`fen ${g.alvo.fen} moves ${lance}`);
      if (depois === null) {
        // Mate depois do lance: pode ser mate **a favor**, e aí o lance é ótimo.
        // Sem centésimos não há como comparar, e o que sobra é declarar.
        julgados.push({ lance, custo: null, sao: false });
        continue;
      }
      const custo = melhor - -depois;
      julgados.push({ lance, custo, sao: custo <= SALTO_PADRAO });
    }
  }
  const sos = julgados.filter((j) => j.sao);
  if (sos.length > 0) posicoesSas += 1;
  const linha = julgados
    .map((j) => `${j.lance}=${j.custo === null ? "mate" : j.custo}${j.sao ? "" : " RUIM"}`)
    .join(" ");
  relatorio.push({ item: g.alvo.item, julgados, nota });
  console.log(`${g.alvo.item.padEnd(10)} ${nota || linha}`);
}

motor.fechar();

console.log(
  `\n=== O número do P1 ===\n` +
    `${posicoesSas} das ${alvos.length} admitem lance são que aplica o tema; ` +
    `${alvos.length - posicoesSas} precisam de posição nova.`,
);
console.log(
  `Dos ${comLance.length} com lance pela geometria, ${comLance.length - posicoesSas} ` +
    `só oferecem lance que o motor reprova.`,
);
console.log(
  `Aceito é custo <= ${SALTO_PADRAO} centésimos do melhor lance, medido na ` +
    `profundidade ${PROFUNDIDADE}.`,
);
void relatorio;
