import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { TAREFAS, respostaDaTarefa, type Lado } from "../lib/meiojogo/exercicios.ts";
import { julgarVariantes, porta1, SALTO_PADRAO } from "../lib/meiojogo/portas.ts";
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
 *   ... --exportar .scratch/candidatos.json                grava o que passou
 *
 * O `--exportar` é o que faz o funil servir à curadoria, e não só à contagem:
 * ele grava, para cada posição aprovada, **o id do puzzle de onde ela saiu** —
 * que é a proveniência (`https://lichess.org/training/<id>`) — e, por tarefa e
 * por lado, a resposta que `respostaDaTarefa` devolve. Sem o id, uma FEN
 * aprovada é uma FEN órfã: passa nas três portas e não pode virar item, porque
 * não há o que escrever no `provenance`.
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
 * | 1 estática | rei em xeque, mate em 1, peça de cavalo ou mais pendurada | `chess.js`, em `lib/meiojogo/portas.ts` |
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
const SALTO = numero("--salto", SALTO_PADRAO);
const SEM_MOTOR = argv.includes("--sem-motor");
const EXPORTAR = argv.indexOf("--exportar") >= 0 ? argv[argv.indexOf("--exportar") + 1] : null;
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

/**
 * Uma posição candidata: a FEN do fim da linha, e **de onde ela veio**.
 *
 * O par anda junto do começo ao fim do funil porque separá-los é o erro que
 * torna o resultado inútil: uma lista de FENs aprovadas sem o id do puzzle não
 * pode virar `provenance.originalGame`, e refazer a ligação depois significa
 * rodar o funil de novo.
 */
type Candidato = { readonly id: string; readonly fen: string; readonly rating: number };

/** Um candidato que passou na porta 2, com o salto que o motor mediu nele. */
type Aprovada = Candidato & { readonly salto: number | null };

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
 * A varredura
 * ------------------------------------------------------------------ */

const LADOS: Lado[] = ["brancas", "pretas"];

/**
 * O que cada posição aprovada serve: tarefa, lado e a resposta única.
 *
 * `respostaDaTarefa` devolve vazio quando o traço não existe **ou** existe mais
 * de uma vez, e as duas coisas dão no mesmo aqui: a posição não vira item. O
 * que sobra é a lista do que ela **pode** ser, e é essa lista que a curadoria
 * lê para escolher.
 */
type Serventia = { tarefa: string; lado: Lado; resposta: string[] };

function serventias(fen: string): Serventia[] {
  const lista: Serventia[] = [];
  for (const tarefa of TAREFAS) {
    for (const lado of LADOS) {
      const resposta = respostaDaTarefa(fen, tarefa, lado);
      if (resposta.length > 0) lista.push({ tarefa: tarefa.id, lado, resposta });
    }
  }
  return lista;
}

function contarPorTarefa(candidatos: readonly { fen: string }[]): Map<string, number> {
  const conta = new Map<string, number>();
  for (const tarefa of TAREFAS) conta.set(tarefa.id, 0);
  for (const { fen } of candidatos) {
    for (const tarefa of TAREFAS) {
      const serve = LADOS.some((lado) => respostaDaTarefa(fen, tarefa, lado).length > 0);
      if (serve) conta.set(tarefa.id, (conta.get(tarefa.id) ?? 0) + 1);
    }
  }
  return conta;
}

const puzzles = amostrar(AMOSTRA);
console.log(`${puzzles.length} puzzles lidos do recorte.\n`);

const finais: Candidato[] = [];
let ilegais = 0;
for (const puzzle of puzzles) {
  const fen = fimDaLinha(puzzle);
  if (fen === null) ilegais += 1;
  else finais.push({ id: puzzle.id, fen, rating: puzzle.rating });
}

const motivos = new Map<string, number>();
const passaramNa1: Candidato[] = [];
for (const candidato of finais) {
  const motivo = porta1(candidato.fen);
  if (motivo === null) passaramNa1.push(candidato);
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

let passaramNa2: Aprovada[] = passaramNa1.map((c) => ({ ...c, salto: null }));

if (!SEM_MOTOR && passaramNa1.length > 0) {
  const aoMotor = passaramNa1.slice(0, TETO_DO_MOTOR);
  const motor = new Motor(prepararMotor());
  await motor.abrir(2);

  const motivosDoMotor = new Map<string, number>();
  const aprovadas: Aprovada[] = [];
  const comecou = Date.now();

  for (const [i, candidato] of aoMotor.entries()) {
    const variantes = await motor.pensar(`fen ${candidato.fen}`, PROFUNDIDADE);
    const veredito = julgarVariantes(variantes, SALTO);
    // O salto medido vai junto: é ele que a `curadoria.portas` de cada posição
    // grava, e re-medi-lo depois seria uma segunda opinião sobre o mesmo dado.
    if (veredito.passou) aprovadas.push({ ...candidato, salto: veredito.salto });
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
/* ------------------------------------------------------------------ *
 * A exportação
 * ------------------------------------------------------------------ */

if (EXPORTAR !== null) {
  const destino = path.isAbsolute(EXPORTAR) ? EXPORTAR : path.join(RAIZ, EXPORTAR);
  mkdirSync(path.dirname(destino), { recursive: true });
  const linhas = passaramNa2
    .map((c) => ({
      puzzle: c.id,
      origem: `https://lichess.org/training/${c.id}`,
      ratingDoPuzzle: c.rating,
      fen: c.fen,
      // `null` quando o motor não rodou (`--sem-motor`): a porta 2 não foi
      // atravessada, e escrever 0 aqui faria a curadoria acreditar que foi.
      saltoDaPorta2: c.salto,
      serve: serventias(c.fen),
    }))
    .filter((l) => l.serve.length > 0);
  writeFileSync(
    destino,
    `${JSON.stringify(
      {
        medido: {
          amostra: puzzles.length,
          profundidade: SEM_MOTOR ? null : PROFUNDIDADE,
          salto: SEM_MOTOR ? null : SALTO,
          passaramNaPorta1: passaramNa1.length,
          passaramNaPorta2: SEM_MOTOR ? null : passaramNa2.length,
        },
        posicoes: linhas,
      },
      null,
      1,
    )}\n`,
    "utf8",
  );
  console.log(
    `\n${linhas.length} posições gravadas em ${path.relative(RAIZ, destino)} ` +
      `(as ${passaramNa2.length - linhas.length} que não servem a nenhuma tarefa ficaram de fora).`,
  );
}
