import { Chess } from "chess.js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./env-local.ts";
import { Motor, prepararMotor } from "./motor.ts";

/**
 * Confere um capítulo transcrito do Yusupov antes de ele virar aula.
 *
 * Uso:
 *   node scripts/conferir-transcricao.ts                 # todos os JSONs da pasta
 *   node scripts/conferir-transcricao.ts M103            # um capítulo
 *   node scripts/conferir-transcricao.ts M103 --motor    # com a medida do Stockfish
 *
 * ## Por que este script existe
 *
 * A transcrição lê um diagrama impresso **por imagem**, e ali um erro não faz
 * barulho: uma torre lida uma casa ao lado vira uma FEN perfeitamente legal e
 * perfeitamente errada. O aluno estudaria uma posição que não existe em livro
 * nenhum, e nada no sistema reclamaria.
 *
 * A rede de segurança é o próprio livro, e é mecânica: o autor imprime, junto
 * com o diagrama, **a linha da solução**. Replicá-la inteira sobre a FEN
 * transcrita é a conferência mais dura que existe sem um segundo par de olhos —
 * uma peça no lugar errado quase sempre torna algum lance da linha ilegal.
 *
 * A segunda rede é aritmética: o autor imprime o **máximo de pontos do
 * capítulo**, e ele tem de bater com a soma dos pontos dos doze exercícios. É
 * uma conta que fecha ou não fecha, e quando não fecha o script diz de quanto é
 * a diferença.
 *
 * A terceira, opcional (`--motor`), é o Stockfish: se o lance que o autor dá
 * como certo perde material a olho nu, isso quase nunca é o autor errado — é
 * uma peça no lugar errado. **É aviso, nunca bloqueio.** O livro manda.
 *
 * O que este script NÃO faz: dizer se a transcrição está certa. Ele diz que ela
 * é *consistente* — o que basta para nada ser publicado com replicação ilegal,
 * que é a regra dura do passo F do plano.
 *
 * O formato do JSON conferido está em `docs/MEIO-JOGO-TRANSCRICAO.md`.
 */

/* ------------------------------------------------------------------ *
 * O formato lido, declarado à mão
 * ------------------------------------------------------------------ *
 * Sem zod de propósito: isto roda **antes** de a transcrição virar conteúdo, e
 * um esquema estrito recusaria o arquivo inteiro por um campo a mais quando o
 * que se quer é justamente a lista dos problemas, todos de uma vez.
 */

type Alternativa = { lance: string; pontos?: number | null; nota?: string | null };

type Exercicio = {
  id: string;
  pagina?: number;
  fen: string;
  lado: "white" | "black";
  estrelas?: number | null;
  pontos: number;
  partida?: string | null;
  solucao: string[];
  alternativas?: Alternativa[];
  erros?: Alternativa[];
};

type Diagrama = { id: string; fen: string; lado: "white" | "black"; linha?: string[] };

type Capitulo = {
  aula: string;
  obra: string;
  volume: number;
  capitulo: number;
  aprovacao: { maximo: number; excelente?: number; bom?: number; minimo: number };
  teoria?: Diagrama[];
  exercicios: Exercicio[];
  avisos?: string[];
};

const PASTA = path.join(RAIZ, "content", "transcricao");

/* ------------------------------------------------------------------ *
 * O relato
 * ------------------------------------------------------------------ */

type Achado = { grave: boolean; onde: string; texto: string };

const achados: Achado[] = [];
const erro = (onde: string, texto: string): void => {
  achados.push({ grave: true, onde, texto });
};
const aviso = (onde: string, texto: string): void => {
  achados.push({ grave: false, onde, texto });
};

/* ------------------------------------------------------------------ *
 * As conferências
 * ------------------------------------------------------------------ */

/**
 * Replica uma linha de lances a partir de uma FEN.
 *
 * Devolve a posição final, ou o índice do lance que não foi legal. A `chess.js`
 * lança em lance impossível, e é esse lance que interessa: ele é a coordenada do
 * erro de leitura no diagrama.
 */
function replicar(fen: string, lances: string[]): { ok: true; fim: Chess } | { ok: false; passo: number; lance: string } {
  const jogo = new Chess(fen);
  for (const [i, lance] of lances.entries()) {
    try {
      jogo.move(lance);
    } catch {
      return { ok: false, passo: i + 1, lance };
    }
  }
  return { ok: true, fim: jogo };
}

/** A FEN é legal? Devolve a posição, ou `null` com o motivo já relatado. */
function abrirFen(onde: string, fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch (e) {
    erro(onde, `FEN recusada pela chess.js: ${(e as Error).message}`);
    return null;
  }
}

function conferirExercicio(cap: Capitulo, item: Exercicio, ordem: number): void {
  const onde = `${cap.aula} / ${item.id}`;

  // O id carrega a numeração do livro, e ela é o que liga o exercício à página
  // impressa. Um id fora de ordem é sinal de exercício pulado ou repetido.
  const esperado = `ex-${cap.capitulo}-${ordem}`;
  if (item.id !== esperado) {
    erro(onde, `o id devia ser "${esperado}" — os exercícios entram na ordem do livro`);
  }

  const jogo = abrirFen(onde, item.fen);
  if (!jogo) return;

  // O glifo impresso ao lado do diagrama diz quem joga, e a FEN também. Duas
  // fontes para o mesmo fato: quando divergem, uma das duas foi lida errada, e
  // é barato descobrir agora.
  const ladoDaFen = jogo.turn() === "w" ? "white" : "black";
  if (ladoDaFen !== item.lado) {
    erro(onde, `o diagrama diz que jogam as ${item.lado === "white" ? "brancas" : "pretas"} e a FEN diz "${ladoDaFen}"`);
  }

  // Posição de exercício não pode já estar acabada: se não há lance a jogar, ou
  // a FEN está errada ou a página está errada.
  if (jogo.isGameOver()) {
    erro(onde, "a posição já acabou (mate, afogamento ou material insuficiente) — não há exercício aqui");
  }

  if (item.solucao.length === 0) {
    erro(onde, "sem linha de solução — sem ela não há como conferir a FEN nem julgar o lance do aluno");
  } else {
    const r = replicar(item.fen, item.solucao);
    if (!r.ok) {
      erro(
        onde,
        `a solução do livro não replica: o lance ${r.passo} ("${r.lance}") é ilegal. ` +
          `Quase sempre isso é uma peça no lugar errado na FEN, não um erro do autor — volte ao diagrama.`,
      );
    }
  }

  // Alternativa e erro são lances soltos, jogados a partir da mesma posição —
  // não continuações da solução.
  for (const [rotulo, lista] of [
    ["alternativa", item.alternativas ?? []],
    ["erro", item.erros ?? []],
  ] as const) {
    for (const alt of lista) {
      const r = replicar(item.fen, [alt.lance]);
      if (!r.ok) erro(onde, `${rotulo} "${alt.lance}" é ilegal na posição do exercício`);
    }
  }

  if (!Number.isInteger(item.pontos) || item.pontos <= 0) {
    erro(onde, `pontos inválidos ("${item.pontos}") — o livro dá sempre um inteiro positivo`);
  }
  for (const alt of item.alternativas ?? []) {
    if (alt.pontos != null && (!Number.isInteger(alt.pontos) || alt.pontos <= 0 || alt.pontos > item.pontos)) {
      erro(onde, `a alternativa "${alt.lance}" vale ${alt.pontos}, e o lance principal vale ${item.pontos}`);
    }
  }
}

function conferirTeoria(cap: Capitulo): void {
  for (const d of cap.teoria ?? []) {
    const onde = `${cap.aula} / ${d.id}`;
    const jogo = abrirFen(onde, d.fen);
    if (!jogo) continue;
    const ladoDaFen = jogo.turn() === "w" ? "white" : "black";
    if (ladoDaFen !== d.lado) {
      erro(onde, `o diagrama diz "${d.lado}" e a FEN diz "${ladoDaFen}"`);
    }
    if (d.linha && d.linha.length > 0) {
      const r = replicar(d.fen, d.linha);
      if (!r.ok) {
        erro(onde, `a linha da teoria não replica: o lance ${r.passo} ("${r.lance}") é ilegal`);
      }
    }
  }
}

function conferirCapitulo(cap: Capitulo): void {
  const onde = cap.aula;

  if (cap.exercicios.length !== 12) {
    erro(onde, `${cap.exercicios.length} exercício(s) — todo capítulo da série tem doze`);
  }

  const ids = new Set<string>();
  for (const item of cap.exercicios) {
    if (ids.has(item.id)) erro(onde, `dois exercícios com o id "${item.id}"`);
    ids.add(item.id);
  }

  for (const [i, item] of cap.exercicios.entries()) conferirExercicio(cap, item, i + 1);
  conferirTeoria(cap);

  // A conta do livro. É a conferência que enxerga o capítulo inteiro de uma vez:
  // se um único ponto foi lido errado em qualquer um dos doze, ela não fecha.
  const soma = cap.exercicios.reduce((t, e) => t + (Number(e.pontos) || 0), 0);
  if (soma !== cap.aprovacao.maximo) {
    erro(
      onde,
      `a soma dos pontos dos exercícios é ${soma} e a régua impressa diz máximo ${cap.aprovacao.maximo} ` +
        `(diferença de ${soma - cap.aprovacao.maximo}) — algum ponto foi lido errado, ou falta um exercício`,
    );
  }

  if (!(cap.aprovacao.minimo > 0 && cap.aprovacao.minimo < cap.aprovacao.maximo)) {
    erro(onde, `nota de corte fora da régua: ${cap.aprovacao.minimo} de ${cap.aprovacao.maximo}`);
  }

  for (const a of cap.avisos ?? []) aviso(onde, `o transcritor avisou: ${a}`);
}

/* ------------------------------------------------------------------ *
 * A medida do Stockfish — aviso, nunca bloqueio
 * ------------------------------------------------------------------ */

/**
 * O lance do autor perde muito?
 *
 * A conta é a diferença, em centésimos de peão, entre a melhor linha da posição
 * e a posição **depois** do lance do autor, sempre do ponto de vista de quem
 * joga. O limiar de 200 (dois peões) é frouxo de propósito: o Yusupov ensina
 * posicional, e o Stockfish desconta o que ele valoriza. Abaixo disso o silêncio
 * é o comportamento certo.
 */
const LIMIAR_DE_AVISO = 200;
const PROFUNDIDADE = 16;

async function medirComMotor(capitulos: Capitulo[]): Promise<void> {
  const motor = new Motor(prepararMotor());
  await motor.abrir(1);
  try {
    for (const cap of capitulos) {
      for (const item of cap.exercicios) {
        if (item.solucao.length === 0) continue;
        const jogo = new Chess(item.fen);
        let uci: string;
        try {
          const lance = jogo.move(item.solucao[0]);
          uci = `${lance.from}${lance.to}${lance.promotion ?? ""}`;
        } catch {
          continue; // já foi relatado como replicação ilegal
        }

        const antes = await motor.pensar(`fen ${item.fen}`, PROFUNDIDADE);
        const depois = await motor.pensar(`fen ${item.fen} moves ${uci}`, PROFUNDIDADE);
        const melhor = antes[0]?.centesimos;
        const obtido = depois[0]?.centesimos;
        // `null` é mate anunciado: quem tem mate não está perdendo material.
        if (melhor == null || obtido == null) continue;

        // `pensar` devolve a avaliação do lado a jogar. Depois do lance quem
        // joga é o outro, então o sinal se inverte para comparar.
        const perda = melhor - -obtido;
        if (perda > LIMIAR_DE_AVISO) {
          aviso(
            `${cap.aula} / ${item.id}`,
            `o lance do livro (${item.solucao[0]}) fica ${perda} centésimos atrás do melhor do Stockfish — ` +
              `confira o diagrama antes de aceitar; se a posição estiver certa, o livro manda`,
          );
        }
      }
    }
  } finally {
    motor.fechar();
  }
}

/* ------------------------------------------------------------------ *
 * Entrada
 * ------------------------------------------------------------------ */

const argumentos = process.argv.slice(2);
const comMotor = argumentos.includes("--motor");
const pedidos = argumentos.filter((a) => !a.startsWith("--"));

if (!existsSync(PASTA)) {
  console.error(`sem ${path.relative(RAIZ, PASTA)} — nada transcrito ainda`);
  process.exit(1);
}

const arquivos = (
  pedidos.length > 0
    ? pedidos.map((p) => (p.endsWith(".json") ? p : `${p}.json`))
    : readdirSync(PASTA).filter((f) => f.endsWith(".json")).sort()
).map((f) => path.join(PASTA, path.basename(f)));

const capitulos: Capitulo[] = [];
for (const arquivo of arquivos) {
  if (!existsSync(arquivo)) {
    erro(path.basename(arquivo), "arquivo não existe");
    continue;
  }
  try {
    capitulos.push(JSON.parse(readFileSync(arquivo, "utf8")) as Capitulo);
  } catch (e) {
    erro(path.basename(arquivo), `JSON inválido: ${(e as Error).message}`);
  }
}

for (const cap of capitulos) conferirCapitulo(cap);
if (comMotor) await medirComMotor(capitulos);

/* O relato, em ordem: o que bloqueia primeiro. */
const graves = achados.filter((a) => a.grave);
const leves = achados.filter((a) => !a.grave);

for (const a of graves) console.log(`  ✖ ${a.onde}: ${a.texto}`);
if (graves.length > 0 && leves.length > 0) console.log("");
for (const a of leves) console.log(`  ⚠ ${a.onde}: ${a.texto}`);

const posicoes = capitulos.reduce((t, c) => t + c.exercicios.length + (c.teoria?.length ?? 0), 0);
console.log("");
console.log(
  `${capitulos.length} capítulo(s), ${posicoes} posição(ões) transcrita(s), ` +
    `${graves.length} replicação(ões) ilegal(is) ou conta errada, ${leves.length} aviso(s)` +
    (comMotor ? " (com Stockfish)" : " (sem Stockfish — passe --motor)"),
);

if (graves.length > 0) {
  console.log("\nNada com ✖ vira aula. Volte ao diagrama.");
  process.exit(1);
}
console.log("\n✔ tudo replica e a conta do livro fecha");
