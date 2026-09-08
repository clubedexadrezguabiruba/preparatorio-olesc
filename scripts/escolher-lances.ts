import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { COR, type Lado } from "../lib/meiojogo/exercicios.ts";
import { JUIZES, type LanceUci } from "../lib/meiojogo/lances.ts";
import { julgarVariantes, porta1, SALTO_PADRAO } from "../lib/meiojogo/portas.ts";
import { RAIZ } from "./env-local.ts";
import { Motor, prepararMotor } from "./motor.ts";

/**
 * O funil das posições em que o aluno **joga** o lance do tema.
 *
 * Uso:
 *   node scripts/escolher-lances.ts --amostra 40000 --exportar .scratch/lances.json
 *   node scripts/escolher-lances.ts --sem-motor            só geometria, em segundos
 *   ... --alvo 40                                          quantas guardar por juiz
 *   ... --profundidade 12 --salto 100
 *
 * ## Por que não é o `escolher-exercicios.ts` com um filtro a mais
 *
 * Porque a ordem das portas mudou, e a ordem é o que torna a varredura viável.
 * Lá o motor vinha antes de saber para que a posição servia, e por isso o teto
 * era 400 posições. Aqui a **porta geométrica** — existe lance legal que aplica
 * o tema? — roda em `chess.js`, custa microssegundos e derruba mais de 99% das
 * candidatas. O motor só vê o que sobrou, e com isso a amostra pode ser dez
 * vezes maior pelo mesmo tempo de parede.
 *
 * Medido no P1: das 24 posições curadas para o **clique**, 5 admitem lance pela
 * geometria e 4 sobrevivem ao motor. Uma posição boa para reconhecer o traço é
 * quase sempre ruim para aplicá-lo, porque ela mostra o traço **pronto** — a
 * torre já está na sétima, o bloqueio já está feito. É esse viés que este funil
 * existe para não repetir.
 *
 * ## As quatro portas, nesta ordem
 *
 * | porta | o que reprova | custo |
 * |---|---|---|
 * | 0 a linha do puzzle fecha | lance ilegal na linha | nada |
 * | 1 estática | xeque, mate em 1, peça pendurada | microssegundos |
 * | **G geométrica** | ninguém consegue aplicar o tema | microssegundos |
 * | 2 motor | posição com tática pendente, **e** lance do tema que perde | ~1s por posição |
 *
 * A porta 2 aqui faz duas perguntas, e não uma. A primeira é a de sempre — a
 * avaliação salta entre as duas melhores linhas? A segunda é a regra dura do
 * plano: **todo lance aceito tem de ser são**, dentro de {@link SALTO_PADRAO}
 * centésimos do melhor lance. "Ocupe a coluna aberta" com a torre pendurando na
 * casa de entrada aplica o padrão e perde a partida.
 *
 * Um lance do tema que o motor reprova **não derruba a posição** e **não some**:
 * ele vai para `lancesRecusados`, com o custo que o motor mediu. A posição só
 * cai quando sobra zero aceito.
 *
 * Sumir seria o pior dos três destinos. O aluno que jogasse a torre para a
 * coluna aberta pendurando-a leria "esse não é o lance desta dica" — e é, ele é
 * exatamente o lance da dica; o que ele não é é são. A tela precisa dessa
 * terceira frase, e para escrevê-la precisa da lista.
 */

const argv = process.argv.slice(2);
const numero = (bandeira: string, padrao: number): number => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : padrao;
};
const texto = (bandeira: string): string | null => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? argv[onde + 1] : null;
};

const AMOSTRA = numero("--amostra", 40000);
const PROFUNDIDADE = numero("--profundidade", 12);
const SALTO = numero("--salto", SALTO_PADRAO);
const SEM_MOTOR = argv.includes("--sem-motor");
const EXPORTAR = texto("--exportar");
/** Quantas posições aprovadas guardar por juiz antes de parar de gastar motor. */
const ALVO_POR_JUIZ = numero("--alvo", 40);
/**
 * Quantas peças, no mínimo, para a posição ainda ser **meio-jogo**.
 *
 * Medido na primeira execução deste funil: sem este piso, metade das posições
 * escolhidas para m9, m10 e m11 eram finais de cinco a oito peças — torre e rei
 * contra torre e três peões. Elas passam em todas as portas e aplicam o tema
 * ao pé da letra, e mesmo assim são o exercício errado: o módulo se chama
 * meio-jogo, e "leve a torre à sétima" com o tabuleiro vazio é uma técnica de
 * final, não a dica m11.
 *
 * O piso é a contagem que o funil antigo produzia por acidente — as posições
 * curadas no Bloco 3 têm ~20 peças —, escrita como regra.
 */
const MINIMO_DE_PECAS = numero("--minimo-pecas", 14);

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

const LADOS: Lado[] = ["brancas", "pretas"];

/** Uma posição que passou na porta geométrica, com o juiz que a aprovou. */
type Candidata = {
  readonly puzzle: string;
  readonly rating: number;
  readonly fen: string;
  readonly juiz: string;
  readonly lado: Lado;
  readonly quemJoga: Lado;
  readonly lances: LanceUci[];
};

/* ------------------------------------------------------------------ *
 * Portas 0, 1 e G
 * ------------------------------------------------------------------ */

const puzzles = amostrar(AMOSTRA);
console.log(`${puzzles.length} puzzles lidos do recorte.\n`);

let ilegais = 0;
let reprovadasNa1 = 0;
let poucasPecas = 0;
const vistas = new Set<string>();
const candidatas: Candidata[] = [];

for (const puzzle of puzzles) {
  const fen = fimDaLinha(puzzle);
  if (fen === null) {
    ilegais += 1;
    continue;
  }
  // A mesma posição pode sair de dois puzzles do recorte; guardar as duas
  // encheria o alvo de um juiz com uma posição só, contada duas vezes.
  const chave = fen.split(" ").slice(0, 4).join(" ");
  if (vistas.has(chave)) continue;
  vistas.add(chave);

  if (porta1(fen) !== null) {
    reprovadasNa1 += 1;
    continue;
  }

  const pecas = fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
  if (pecas < MINIMO_DE_PECAS) {
    poucasPecas += 1;
    continue;
  }

  const jogo = new Chess(fen);
  for (const juiz of JUIZES) {
    for (const lado of LADOS) {
      if (jogo.turn() !== COR[juiz.quemJoga(lado)]) continue;
      const lances = juiz.lances(fen, lado);
      if (lances.length === 0) continue;
      candidatas.push({
        puzzle: puzzle.id,
        rating: puzzle.rating,
        fen,
        juiz: juiz.id,
        lado,
        quemJoga: juiz.quemJoga(lado),
        lances,
      });
    }
  }
}

const porJuiz = (lista: readonly { juiz: string }[]): Map<string, number> => {
  const conta = new Map<string, number>();
  for (const j of JUIZES) conta.set(j.id, 0);
  for (const c of lista) conta.set(c.juiz, (conta.get(c.juiz) ?? 0) + 1);
  return conta;
};

console.log("PORTA 0 — a linha fecha");
console.log(`  ${puzzles.length - ilegais} de ${puzzles.length} (${ilegais} com lance ilegal)\n`);
console.log("PORTA 1 — estática");
console.log(`  ${vistas.size - reprovadasNa1} de ${vistas.size} posições distintas passam`);
console.log(
  `  ${poucasPecas} reprovadas depois dela por ter menos de ${MINIMO_DE_PECAS} peças\n`,
);
console.log("PORTA G — existe lance legal que aplica o tema");
for (const [id, quantas] of [...porJuiz(candidatas)].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${id.padEnd(32)} ${String(quantas).padStart(5)}`);
}
console.log(`  ${"total de pares posição×juiz".padEnd(32)} ${String(candidatas.length).padStart(5)}\n`);

if (SEM_MOTOR) {
  if (EXPORTAR !== null) {
    gravar(candidatas.map((c) => ({ ...c, salto: null, custos: null, recusados: [] })));
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * Porta 2 — o motor, e a regra dura do lance são
 * ------------------------------------------------------------------ */

type Recusado = { readonly lance: LanceUci; readonly custo: number };

type Aprovada = Candidata & {
  readonly salto: number | null;
  /** O custo em centésimos de cada lance aceito, na ordem de `lances`. */
  readonly custos: number[] | null;
  /** Os lances que aplicam o tema e o motor reprovou, com o custo de cada um. */
  readonly recusados: Recusado[];
};

const motor = new Motor(prepararMotor());
await motor.abrir(2);

/** A avaliação em centésimos do ponto de vista de quem joga, e o salto. */
async function pensar(posicao: string): Promise<{ melhor: number | null; salto: number | null }> {
  const variantes = await motor.pensar(posicao, PROFUNDIDADE);
  const veredito = julgarVariantes(variantes, SALTO);
  return {
    melhor: variantes[0]?.centesimos ?? null,
    salto: veredito.passou ? veredito.salto : null,
  };
}

const aprovadas: Aprovada[] = [];
const motivos = new Map<string, number>();
const conta = (motivo: string) => motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1);
const cheios = new Map<string, number>();
const comecou = Date.now();
let medidas = 0;

for (const c of candidatas) {
  if ((cheios.get(c.juiz) ?? 0) >= ALVO_POR_JUIZ) continue;
  medidas += 1;

  const { melhor, salto } = await pensar(`fen ${c.fen}`);
  if (salto === null) {
    conta("posição com tática pendente");
    continue;
  }
  if (melhor === null) {
    conta("melhor linha dá mate");
    continue;
  }

  const aceitos: LanceUci[] = [];
  const custos: number[] = [];
  const recusados: Recusado[] = [];
  let incomparavel = false;
  for (const lance of c.lances) {
    const depois = await motor.pensar(`fen ${c.fen} moves ${lance}`, PROFUNDIDADE);
    const centesimos = depois[0]?.centesimos ?? null;
    // Mate depois do lance não é comparável em centésimos. A posição inteira
    // sai: um lance do tema que não dá para medir não pode ser nem aceito nem
    // recusado com número, e a lista tem de cobrir **todos** os lances do tema.
    if (centesimos === null) {
      incomparavel = true;
      break;
    }
    const custo = melhor - -centesimos;
    // O teto é dos dois lados. Acima de +100 o lance perde a partida; abaixo de
    // -100 o motor está se contradizendo na mesma profundidade — quase sempre
    // porque há mate na conta —, e um número que não se explica não pode virar
    // a prova de que o lance é são.
    if (custo <= SALTO_PADRAO && custo >= -SALTO_PADRAO) {
      aceitos.push(lance);
      custos.push(custo);
    } else {
      recusados.push({ lance, custo });
    }
  }

  if (incomparavel) {
    conta("lance do tema com mate na conta — não medível");
    continue;
  }
  if (aceitos.length === 0) {
    conta("todo lance do tema perde");
    continue;
  }

  aprovadas.push({ ...c, lances: aceitos, salto, custos, recusados });
  cheios.set(c.juiz, (cheios.get(c.juiz) ?? 0) + 1);

  if (medidas % 25 === 0) {
    const porSegundo = (medidas / ((Date.now() - comecou) / 1000)).toFixed(1);
    const faltam = JUIZES.filter((j) => (cheios.get(j.id) ?? 0) < ALVO_POR_JUIZ).length;
    console.log(
      `  … ${medidas} medidas, ${aprovadas.length} aprovadas (${porSegundo}/s); ` +
        `${faltam} juízes ainda sem o alvo de ${ALVO_POR_JUIZ}`,
    );
  }
}

motor.fechar();

console.log(`\nPORTA 2 — profundidade ${PROFUNDIDADE}, salto > ${SALTO}, lance são <= ${SALTO_PADRAO}`);
for (const [motivo, quantas] of [...motivos].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(quantas).padStart(5)} reprovadas: ${motivo}`);
}
console.log(`  ${String(aprovadas.length).padStart(5)} aprovadas de ${medidas} medidas\n`);

console.log("QUANTAS POSIÇÕES POR JUIZ — o que a curadoria tem para escolher");
for (const j of JUIZES) {
  const quantas = porJuiz(aprovadas).get(j.id) ?? 0;
  const veredito = quantas >= 5 ? "dá para 5" : quantas >= 2 ? "dá para o piso de 2" : "NÃO CHEGA A 2";
  console.log(
    `  ${j.dicas.join("/").padEnd(6)} ${j.id.padEnd(32)} ${String(quantas).padStart(4)}  ${veredito}`,
  );
}

if (EXPORTAR !== null) gravar(aprovadas);

function gravar(lista: readonly Aprovada[]): void {
  const destino = path.isAbsolute(EXPORTAR!) ? EXPORTAR! : path.join(RAIZ, EXPORTAR!);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(
    destino,
    `${JSON.stringify(
      {
        medido: {
          amostra: puzzles.length,
          posicoesDistintas: vistas.size,
          profundidade: SEM_MOTOR ? null : PROFUNDIDADE,
          salto: SEM_MOTOR ? null : SALTO,
          lanceSaoAte: SEM_MOTOR ? null : SALTO_PADRAO,
        },
        posicoes: lista.map((c) => ({
          juiz: c.juiz,
          dicas: JUIZES.find((j) => j.id === c.juiz)?.dicas ?? [],
          puzzle: c.puzzle,
          origem: `https://lichess.org/training/${c.puzzle}`,
          ratingDoPuzzle: c.rating,
          fen: c.fen,
          lado: c.lado,
          quemJoga: c.quemJoga,
          lancesAceitos: c.lances,
          custos: c.custos,
          lancesRecusados: c.recusados,
          saltoDaPorta2: c.salto,
        })),
      },
      null,
      1,
    )}\n`,
    "utf8",
  );
  console.log(`\n${lista.length} posições gravadas em ${path.relative(RAIZ, destino)}.`);
}
