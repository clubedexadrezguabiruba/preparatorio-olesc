import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Chess, type Color, type Square } from "chess.js";
import { TAREFAS, respostaDaTarefa, type Lado } from "../lib/meiojogo/exercicios.ts";
import { RAIZ } from "./env-local.ts";
import { Motor, prepararMotor } from "./motor.ts";

/**
 * O funil que escolhe posições de partida real para os exercícios do meio-jogo.
 *
 * Uso:
 *   node scripts/escolher-exercicios.ts                    porta 1 + porta 2
 *   node scripts/escolher-exercicios.ts --sem-motor        só a porta 1, rápido
 *   node scripts/escolher-exercicios.ts --amostra 2000     quantos puzzles ler
 *   ... --profundidade 12 --salto 100                      padrões da porta 2
 *
 * ## De onde vêm as posições, e por que elas precisam de funil
 *
 * O recorte CC0 do Lichess já vive em `public/puzzles/`, e a FEN guardada ali é
 * a posição **antes** do erro do adversário; a que o solucionador vê sai depois
 * de `lances[0]`. Nos dois estados há tática forçada no tabuleiro — é a razão de
 * o puzzle existir. Jogar a linha inteira até o fim produz uma posição de
 * partida real, CC0, com ~20 peças, e **não** produz uma posição quieta: a
 * medição da sessão anterior achou 49,7% delas com o rei em xeque.
 *
 * Daí as três portas, e é por isso que a posição final é **candidata**, nunca
 * apropriada automaticamente:
 *
 * | porta | o que reprova | quem julga |
 * |---|---|---|
 * | 1 estática | rei em xeque, mate em 1, peça de cavalo ou mais pendurada | `chess.js`, aqui |
 * | 2 motor | melhor lance que dá mate, ou avaliação que salta entre as candidatas | Stockfish 18 offline |
 * | 3 humana | os seis passos da curadoria | a autoria, fora daqui |
 *
 * ## O que a porta 2 **não** reprova, de propósito
 *
 * Desequilíbrio de material. A posição final nasce com ele — é o que a
 * combinação produziu —, e recusá-lo esvaziaria o estoque sem melhorar o
 * exercício: para reconhecer um peão isolado não importa quem está ganhando, e
 * a legenda diz que o material está desigual. O que a porta 2 procura é
 * **tática pendente**: se a melhor linha ganha muito sobre a segunda, há um
 * lance a achar no tabuleiro, e o aluno mandado a procurar estrutura vai
 * tropeçar nele.
 *
 * ## O número que este script existe para imprimir
 *
 * Quantas posições sobram **por tarefa** depois do motor. Uma tarefa que sai do
 * funil com dez posições não sustenta um degrau de reconhecimento, e é melhor
 * saber disso antes de escrever a ficha do conceito do que depois.
 */

const argv = process.argv.slice(2);
const numero = (bandeira: string, padrao: number): number => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : padrao;
};

const AMOSTRA = numero("--amostra", 1200);
const PROFUNDIDADE = numero("--profundidade", 12);
/** Centésimos de peão entre a melhor linha e a segunda que denunciam tática. */
const SALTO = numero("--salto", 100);
const SEM_MOTOR = argv.includes("--sem-motor");
/** Quantas posições vão ao motor. Ele é a parte cara: ~1 posição por segundo. */
const TETO_DO_MOTOR = numero("--teto-motor", 400);

/* ------------------------------------------------------------------ *
 * A leitura do recorte
 * ------------------------------------------------------------------ */

type Puzzle = { id: string; fen: string; lances: string[]; rating: number };

/** Uma amostra uniforme do recorte, atravessando temas e faixas de rating. */
function amostrar(quantos: number): Puzzle[] {
  const raiz = path.join(RAIZ, "public", "puzzles");
  const arquivos: string[] = [];
  for (const tema of readdirSync(raiz)) {
    if (tema === "index.json") continue;
    for (const faixa of readdirSync(path.join(raiz, tema))) {
      arquivos.push(path.join(raiz, tema, faixa));
    }
  }
  arquivos.sort();

  // Uniforme por construção: um passo fixo dentro de cada arquivo, e o mesmo
  // número de puzzles de cada um. Sem sorteio, a amostra é reproduzível — duas
  // execuções do funil comparam os mesmos números.
  const porArquivo = Math.max(1, Math.ceil(quantos / arquivos.length));
  const amostra: Puzzle[] = [];
  for (const arquivo of arquivos) {
    const lista = JSON.parse(readFileSync(arquivo, "utf8")) as Puzzle[];
    const passo = Math.max(1, Math.floor(lista.length / porArquivo));
    for (let i = 0; i < lista.length && amostra.length < quantos; i += passo) {
      amostra.push(lista[i]);
    }
    if (amostra.length >= quantos) break;
  }
  return amostra;
}

/** A posição no fim da linha do puzzle, ou `null` se algum lance for ilegal. */
function fimDaLinha(puzzle: Puzzle): string | null {
  const jogo = new Chess(puzzle.fen);
  for (const lance of puzzle.lances) {
    try {
      jogo.move({ from: lance.slice(0, 2), to: lance.slice(2, 4), promotion: lance[4] });
    } catch {
      return null;
    }
  }
  return jogo.fen();
}

/* ------------------------------------------------------------------ *
 * Porta 1 — estática
 * ------------------------------------------------------------------ */

/** Peça de cavalo para cima: é a partir daí que "pendurada" muda a posição. */
const PESADAS = "nbrq";

type Reprovacao = "xeque" | "mate-em-1" | "pendurada" | null;

export function porta1(fen: string): Reprovacao {
  const jogo = new Chess(fen);
  if (jogo.isCheck()) return "xeque";

  for (const lance of jogo.moves({ verbose: true })) {
    const tentativa = new Chess(fen);
    tentativa.move(lance);
    if (tentativa.isCheckmate()) return "mate-em-1";
  }

  for (const fileira of jogo.board()) {
    for (const casa of fileira) {
      if (casa === null || !PESADAS.includes(casa.type)) continue;
      const inimiga: Color = casa.color === "w" ? "b" : "w";
      const atacada = jogo.attackers(casa.square as Square, inimiga).length > 0;
      const defendida = jogo.attackers(casa.square as Square, casa.color).length > 0;
      if (atacada && !defendida) return "pendurada";
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Porta 2 — o motor
 * ------------------------------------------------------------------ */

type VereditoDoMotor = { passou: boolean; motivo: string; salto: number | null };

export function julgarVariantes(
  variantes: { centesimos: number | null }[],
): VereditoDoMotor {
  if (variantes.length === 0) return { passou: false, motivo: "motor mudo", salto: null };
  if (variantes[0].centesimos === null) {
    return { passou: false, motivo: "melhor lance dá mate", salto: null };
  }
  if (variantes.length === 1) {
    // Lance único é posição forçada: não há o que decidir além dele.
    return { passou: false, motivo: "lance único", salto: null };
  }
  if (variantes[1].centesimos === null) {
    return { passou: false, motivo: "segunda linha é mate", salto: null };
  }
  const salto = Math.abs(variantes[0].centesimos - variantes[1].centesimos);
  return salto > SALTO
    ? { passou: false, motivo: `salta ${salto} centésimos`, salto }
    : { passou: true, motivo: "", salto };
}

/* ------------------------------------------------------------------ *
 * A varredura
 * ------------------------------------------------------------------ */

const LADOS: Lado[] = ["brancas", "pretas"];

function contarPorTarefa(fens: readonly string[]): Map<string, number> {
  const conta = new Map<string, number>();
  for (const tarefa of TAREFAS) conta.set(tarefa.id, 0);
  for (const fen of fens) {
    for (const tarefa of TAREFAS) {
      const serve = LADOS.some((lado) => respostaDaTarefa(fen, tarefa, lado).length > 0);
      if (serve) conta.set(tarefa.id, (conta.get(tarefa.id) ?? 0) + 1);
    }
  }
  return conta;
}

const puzzles = amostrar(AMOSTRA);
console.log(`${puzzles.length} puzzles lidos do recorte.\n`);

const finais: string[] = [];
let ilegais = 0;
for (const puzzle of puzzles) {
  const fen = fimDaLinha(puzzle);
  if (fen === null) ilegais += 1;
  else finais.push(fen);
}

const motivos = new Map<string, number>();
const passaramNa1: string[] = [];
for (const fen of finais) {
  const motivo = porta1(fen);
  if (motivo === null) passaramNa1.push(fen);
  else motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1);
}

const pct = (n: number, de: number) => `${((n / de) * 100).toFixed(1).replace(".", ",")}%`;

console.log("PORTA 0 — a linha fecha");
console.log(`  ${finais.length} de ${puzzles.length} linhas fecham sem lance ilegal (${ilegais} ilegais)\n`);
console.log("PORTA 1 — estática");
for (const [motivo, quantas] of [...motivos].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(quantas).padStart(5)} reprovadas por ${motivo}  (${pct(quantas, finais.length)})`);
}
console.log(
  `  ${String(passaramNa1.length).padStart(5)} passam                    (${pct(passaramNa1.length, finais.length)})\n`,
);

let passaramNa2 = passaramNa1;

if (!SEM_MOTOR && passaramNa1.length > 0) {
  const aoMotor = passaramNa1.slice(0, TETO_DO_MOTOR);
  const motor = new Motor(prepararMotor());
  await motor.abrir(2);

  const motivosDoMotor = new Map<string, number>();
  const aprovadas: string[] = [];
  const comecou = Date.now();

  for (const [i, fen] of aoMotor.entries()) {
    const variantes = await motor.pensar(`fen ${fen}`, PROFUNDIDADE);
    const veredito = julgarVariantes(variantes);
    if (veredito.passou) aprovadas.push(fen);
    else {
      const chave = veredito.motivo.startsWith("salta") ? "avaliação salta" : veredito.motivo;
      motivosDoMotor.set(chave, (motivosDoMotor.get(chave) ?? 0) + 1);
    }
    if ((i + 1) % 50 === 0) {
      const porSegundo = ((i + 1) / ((Date.now() - comecou) / 1000)).toFixed(1);
      console.log(`  … ${i + 1} de ${aoMotor.length} (${porSegundo}/s)`);
    }
  }
  motor.fechar();

  console.log(`\nPORTA 2 — Stockfish 18 offline, profundidade ${PROFUNDIDADE}, salto > ${SALTO}`);
  for (const [motivo, quantas] of [...motivosDoMotor].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(quantas).padStart(5)} reprovadas: ${motivo}  (${pct(quantas, aoMotor.length)})`);
  }
  console.log(
    `  ${String(aprovadas.length).padStart(5)} passam                    (${pct(aprovadas.length, aoMotor.length)} de ${aoMotor.length})\n`,
  );
  passaramNa2 = aprovadas;
}

console.log(
  SEM_MOTOR
    ? `QUANTAS SOBRAM POR TAREFA — depois da porta 1, em ${passaramNa2.length} posições`
    : `QUANTAS SOBRAM POR TAREFA — depois do motor, em ${passaramNa2.length} posições`,
);
const porTarefa = contarPorTarefa(passaramNa2);
for (const [id, quantas] of [...porTarefa].sort((a, b) => b[1] - a[1])) {
  const barra = "█".repeat(Math.round((quantas / Math.max(1, passaramNa2.length)) * 30));
  console.log(
    `  ${id.padEnd(30)} ${String(quantas).padStart(4)}  ${pct(quantas, Math.max(1, passaramNa2.length)).padStart(6)}  ${barra}`,
  );
}
console.log(
  "\nResposta única, e um lado só. Uma tarefa com poucas posições aqui não sustenta um " +
    "degrau de reconhecimento — o conceito sai da fatia antes de virar ficha.",
);
