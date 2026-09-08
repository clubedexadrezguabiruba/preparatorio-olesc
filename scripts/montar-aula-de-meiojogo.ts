import { Chess } from "chess.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./env-local.ts";

/**
 * Monta uma aula de meio-jogo a partir da transcrição do capítulo mais a prosa
 * em português.
 *
 * Uso:
 *   node scripts/montar-aula-de-meiojogo.ts M103
 *
 * ## O que este script faz, e o que ele **não** faz
 *
 * Ele faz a parte mecânica do passo F.4, que é chata e é onde o erro humano
 * mora: converter cada lance SAN do livro em UCI (que é o que o motor lê),
 * gerar um arquivo de posição por diagrama com os nove campos de proveniência
 * preenchidos do mesmo jeito, e emitir o JSON da aula na ordem que o esquema
 * espera. Nada disso é decisão editorial — é datilografia com risco.
 *
 * Ele **não escreve prosa**. O objetivo, o texto de cada lance do exemplo, o
 * feedback e a dica de cada exercício vêm de `content/prosa/<aula>.json`,
 * escrito à mão. As posições, os lances e os pontos são do livro; a prosa é
 * nossa, e é a única coisa aqui que não se automatiza.
 *
 * ## Por que a conversão SAN → UCI é o ponto perigoso
 *
 * O livro imprime `1.d5!` e o motor precisa de `d4d5`. Traduzir isso à mão, 60
 * vezes por capítulo, produz exatamente um erro invisível: um UCI legal e
 * errado, que o gate aceita e que o aluno descobre. Aqui quem traduz é a
 * `chess.js`, jogando a linha de verdade a partir da FEN — e um SAN que não
 * couber na posição estoura na hora, com o número do lance.
 */

const [aulaCurta] = process.argv.slice(2);
if (!aulaCurta) {
  console.error("uso: node scripts/montar-aula-de-meiojogo.ts M103");
  process.exit(1);
}

const TRANSCRICAO = path.join(RAIZ, "content", "transcricao", `${aulaCurta}.json`);
const PROSA = path.join(RAIZ, "content", "prosa", `${aulaCurta}.json`);
const POSICOES = path.join(RAIZ, "content", "positions", "M");
const AULAS = path.join(RAIZ, "content", "lessons");

type Alternativa = { lance: string; apos?: string[] | null; pontos?: number | null; nota?: string | null };
type Exercicio = {
  id: string;
  pagina?: number;
  fen: string;
  lado: "white" | "black";
  estrelas?: number | null;
  pontos: number;
  pontosExtra?: number | null;
  partida?: string | null;
  solucao: string[];
  alternativas?: Alternativa[];
  comentario?: string | null;
};
type Diagrama = {
  id: string;
  pagina?: number;
  fen: string;
  lado: "white" | "black";
  partida?: string | null;
  linha?: string[];
  comentario?: string | null;
};
type Capitulo = {
  aula: string;
  obra: string;
  volume: number;
  capitulo: number;
  tituloOriginal: string;
  paginas: { teoria: number[]; exercicios: number[]; solucoes: number[] };
  aprovacao: { maximo: number; minimo: number; excelente?: number; bom?: number; pagina?: number };
  teoria?: Diagrama[];
  exercicios: Exercicio[];
};

/** A prosa em português, escrita à mão. Ver o cabeçalho. */
type Prosa = {
  id: string;
  title: string;
  orientation: "white" | "black";
  domainCriterion: "D1" | "D2" | "D3" | "D4";
  status: "draft" | "published";
  fallbacks: { winningOffMethod: string; losesWin: string; methodAlternative: string };
  objective: {
    technique: { name: string; summary: string };
    why: string;
    rules: Array<{ title: string; text: string; cena?: string }>;
    mastery: string;
  };
  /** Uma cena por diagrama da teoria que entra na aula. */
  cenas: Array<{
    diagrama: string;
    id: string;
    title: string;
    fase: string;
    intro: string;
    /** Um texto por lance da linha do livro. */
    lances: string[];
  }>;
  exercicios: {
    intro: string;
    /** Por id de exercício: a dica, o elogio do acerto, e um texto por lance da solução. */
    itens: Record<string, { hint: string; acerto: string; solucao: string[] }>;
  };
  /** Quais exercícios chegam ao aluno, na ordem. */
  entram: string[];
};

const cap = JSON.parse(readFileSync(TRANSCRICAO, "utf8")) as Capitulo;
const prosa = JSON.parse(readFileSync(PROSA, "utf8")) as Prosa;

/** SAN → UCI, jogando a linha de verdade. Estoura no lance que não couber. */
function paraUci(fen: string, sans: string[], onde: string): string[] {
  const jogo = new Chess(fen);
  return sans.map((san, i) => {
    let lance;
    try {
      lance = jogo.move(san);
    } catch {
      throw new Error(`${onde}: o lance ${i + 1} ("${san}") é ilegal na posição`);
    }
    return `${lance.from}${lance.to}${lance.promotion ?? ""}`;
  });
}

const OBRA = {
  "yusupov-build-up-1": {
    arquivo: "yusupov-build-up-1.pdf",
    titulo: "Build Up Your Chess 1: The Fundamentals",
    edicao: "Quality Chess, 1ª edição inglesa, 2008",
  },
} as const;

const obra = OBRA[cap.obra as keyof typeof OBRA];
if (!obra) throw new Error(`obra "${cap.obra}" sem entrada em OBRA neste script`);

function proveniencia(
  o: { pagina?: number; partida?: string | null; comentario?: string | null },
  papel: string,
) {
  const pagina = o.pagina ? `PDF p. ${o.pagina}` : "página não registrada";
  return {
    externalHumanSource: `Artur Yusupov — ${papel} do capítulo ${cap.capitulo}, "${cap.tituloOriginal}"`,
    bibliographicSource: `Yusupov, ${obra.titulo}, ${obra.edicao}, cap. ${cap.capitulo}, ${pagina}`,
    originalGame: o.partida ?? "não registrado no livro",
    authorComposer: "não se aplica — posição de partida, não é estudo composto",
    license:
      "obra protegida; exemplar adquirido; uso interno do piloto; sem teto de citação no " +
      "meio-jogo por decisão do Doug em 2026-09-07 — ver o _leia de content/sources.json",
    editionFile: obra.arquivo,
    fenMethod:
      "transcrição do diagrama impresso por leitura de imagem, com o recorte gerado por " +
      "scripts/recortar-diagramas.py a 300 dpi (~95 px por casa) e as coordenadas impressas " +
      "na borda do próprio diagrama usadas como referência",
    qaApplied:
      "scripts/conferir-transcricao.ts: a FEN é aceita pela chess.js, o lado a jogar bate com o " +
      "glifo impresso, e a linha da solução do autor replica inteira a partir dela — um lance " +
      "ilegal denunciaria uma peça no lugar errado. A soma dos pontos dos doze exercícios fecha " +
      "com o máximo impresso na página de Scoring. O Stockfish mediu o lance principal e não " +
      "levantou aviso.",
    pendingRisk: "nenhum conhecido",
  };
}

mkdirSync(POSICOES, { recursive: true });

const escritos: string[] = [];
function escreverPosicao(id: string, fen: string, tags: string[], prov: object) {
  const arquivo = path.join(POSICOES, `${id}.json`);
  writeFileSync(
    arquivo,
    JSON.stringify(
      { id, fen, expectedResult: "open", tags, provenance: prov, status: "approved" },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  escritos.push(path.relative(RAIZ, arquivo));
}

/* ------------------------------------------------------------------ *
 * As cenas do exemplo
 * ------------------------------------------------------------------ */

const cenas = prosa.cenas.map((c) => {
  const d = (cap.teoria ?? []).find((t) => t.id === c.diagrama);
  if (!d) throw new Error(`a prosa cita o diagrama "${c.diagrama}", que não está na transcrição`);
  const sans = d.linha ?? [];
  if (sans.length !== c.lances.length) {
    throw new Error(
      `${c.diagrama}: o livro tem ${sans.length} lance(s) e a prosa escreveu ${c.lances.length}`,
    );
  }
  const ucis = paraUci(d.fen, sans, c.diagrama);
  const posicaoId = `pos-${prosa.id.toLowerCase().split("-")[0]}-${c.diagrama}`;
  escreverPosicao(posicaoId, d.fen, ["meio-jogo", "exemplo", `cap-${cap.capitulo}`],
    proveniencia(d, `diagrama da teoria (${d.id})`));

  return {
    id: c.id,
    title: c.title,
    positionId: posicaoId,
    intro: c.intro,
    phases: [{ title: c.fase, fromStep: 1 }],
    steps: ucis.map((move, i) => ({ move, text: c.lances[i] })),
  };
});

/* ------------------------------------------------------------------ *
 * Os exercícios
 * ------------------------------------------------------------------ */

const itens = prosa.entram.map((id) => {
  const e = cap.exercicios.find((x) => x.id === id);
  if (!e) throw new Error(`a prosa manda entrar "${id}", que não está na transcrição`);
  const p = prosa.exercicios.itens[id];
  if (!p) throw new Error(`o exercício "${id}" entra na aula e não tem prosa`);
  // A prosa pode cobrir um **prefixo** da linha do livro, e isso é editorial,
  // não preguiça: o Yusupov negrita o lance principal e o resto da coluna é
  // anotação técnica. Um exercício cuja solução tem quinze lances tem o ponto
  // feito nos quatro primeiros; mostrar os onze restantes com texto inventado
  // seria pior que não mostrá-los. O que não se pode é a prosa ter **mais**
  // lances que o livro — aí ela estaria escrevendo xadrez.
  if (p.solucao.length > e.solucao.length) {
    throw new Error(
      `${id}: o livro tem ${e.solucao.length} lance(s) de solução e a prosa escreveu ${p.solucao.length}`,
    );
  }
  if (p.solucao.length === 0) throw new Error(`${id}: a prosa não escreveu nenhum lance da solução`);

  const ucis = paraUci(e.fen, e.solucao.slice(0, p.solucao.length), id);
  const posicaoId = `pos-${prosa.id.toLowerCase().split("-")[0]}-${id}`;
  escreverPosicao(posicaoId, e.fen, ["meio-jogo", "exercicio", `cap-${cap.capitulo}`],
    proveniencia(e, `exercício ${id.replace("ex-", "Ex. ")}`));

  // As alternativas que o livro credita, com os pontos dele. Só entram as que
  // são jogáveis da própria posição do exercício: as que o autor nomeia mais
  // adiante numa variante não são um lance que o aluno pode jogar aqui.
  const alternativas = (e.alternativas ?? [])
    .filter((a) => !a.apos || a.apos.length === 0)
    .map((a) => ({
      moves: paraUci(e.fen, [a.lance], `${id} / alternativa ${a.lance}`),
      feedback: a.nota ?? "O livro também credita este lance.",
      ...(a.pontos ? { pontos: a.pontos } : {}),
    }));

  return {
    id,
    positionId: posicaoId,
    orientation: e.lado,
    pontos: e.pontos,
    node: {
      fen: e.fen,
      hint: p.hint,
      expects: [{ moves: [ucis[0]], feedback: p.acerto }],
      ...(alternativas.length > 0 ? { authorAlternatives: alternativas } : {}),
      winningMoves: [] as string[],
    },
    reveal: ucis.map((move, i) => ({ move, text: p.solucao[i] })),
  };
});

/**
 * A nota de corte da aula, derivada — e a derivação fica no arquivo para não
 * virar número mágico.
 *
 * O livro imprime a régua sobre os **doze** exercícios; a aula leva os seis
 * primeiros. Soma-se o que é ganhável nesses seis e aplica-se a **mesma
 * proporção** que o autor usa no capítulo. Nada é inventado: a proporção é dele.
 */
const ganhaveis = itens.reduce((t, i) => t + i.pontos, 0);
const proporcao = cap.aprovacao.minimo / cap.aprovacao.maximo;
const minimo = Math.max(1, Math.round(ganhaveis * proporcao));

const aula = {
  id: prosa.id,
  title: prosa.title,
  orientation: prosa.orientation,
  domainCriterion: prosa.domainCriterion,
  status: prosa.status,
  errors: {},
  fallbacks: prosa.fallbacks,
  stages: {
    objective: {
      source: cap.obra,
      technique: prosa.objective.technique,
      why: prosa.objective.why,
      rules: prosa.objective.rules.map((r) => ({
        title: r.title,
        text: r.text,
        ...(r.cena ? { frame: { scene: r.cena, step: 0 } } : {}),
      })),
      mastery: prosa.objective.mastery,
    },
    example: { scenes: cenas },
    exercises: {
      intro: prosa.exercicios.intro,
      aprovacao: { minimo, maximo: ganhaveis },
      items: itens,
    },
  },
};

mkdirSync(AULAS, { recursive: true });
const arquivoDaAula = path.join(AULAS, `${prosa.id}.json`);
writeFileSync(arquivoDaAula, JSON.stringify(aula, null, 2) + "\n", "utf8");

console.log(`${escritos.length} posição(ões) escrita(s) em content/positions/M/`);
console.log(`aula: ${path.relative(RAIZ, arquivoDaAula)}`);
console.log(
  `  ${cenas.length} cena(s) de exemplo · ${itens.length} exercício(s) · ` +
    `régua derivada: ${minimo} de ${ganhaveis} ` +
    `(a do livro é ${cap.aprovacao.minimo} de ${cap.aprovacao.maximo}, ` +
    `${Math.round(proporcao * 100)}%)`,
);
