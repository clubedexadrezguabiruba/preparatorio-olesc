/**
 * O corpus dos cursos do chess.com, indexado por posição.
 *
 * Extraído de `scripts/mapear-fontes.ts` em 8/9/2026, quando o
 * `cauda-repertorio.ts` passou a precisar exatamente do mesmo índice. Duas
 * cópias divergiriam no dia em que alguém consertasse só uma — e há uma
 * armadilha aqui que já custou uma medição inteira, então a cópia seria cara.
 *
 * ## A armadilha do en passant, que faz a medição dar zero
 *
 * A `chess.js` só escreve a casa de en passant quando a captura é de fato
 * possível; o chess.com escreve sempre que um peão anda duas casas. Comparar as
 * strings cruas dá **zero** posições em comum — nem o `1.e4` bate. Por isso
 * toda FEN, dos dois lados, é recarregada pela `chess.js` e reemitida antes de
 * virar chave.
 *
 * ## De onde vem o corpus, e por que ele não está no Git
 *
 * `<REPERTORIO_FONTES>/chesscom-cursos/CORPUS.json`: os cursos lidos pela API do
 * chess.com, com lances, FEN e a prosa do autor. É **curso pago** e este
 * repositório é público — nunca entra no Git. Sem o arquivo, `carregarCorpus`
 * devolve `null` e quem chamou diz isso e sai em paz.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";

/** Uma passagem da fonte por uma posição: quem jogou o quê, e o que escreveu. */
export type Passagem = { curso: string; variante: string; san: string; com: string };

type Curso = { nome: string; lances: { san: string; fen: string; com?: string }[] }[];

export type Corpus = {
  /** Posição alcançada pela fonte → quem passou por ali. */
  chegam: Map<string, Passagem[]>;
  /** Posição **antes** do lance → o que a fonte joga dali. É o que mostra a alternativa. */
  partem: Map<string, Passagem[]>;
  /** A chave canônica de uma FEN — as 4 primeiras partes, reemitidas pela chess.js. */
  chave: (fen: string) => string;
  inicial: string;
  cursos: number;
  variantes: number;
  comentarios: number;
  arquivo: string;
};

const PADRAO = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Onde o CORPUS.json pode estar, segundo o `REPERTORIO_FONTES` do `.env.local`. */
export function ondeEstaOCorpus(): { achado: string | null; procurei: string[] } {
  const pastas = (process.env.REPERTORIO_FONTES ?? "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  const candidatos = pastas.map((p) => path.join(p, "chesscom-cursos", "CORPUS.json"));
  return { achado: candidatos.find((p) => existsSync(p)) ?? null, procurei: candidatos };
}

/** A frase que os scripts imprimem quando o corpus não está na máquina. */
export function recadoSemCorpus(procurei: readonly string[]): string {
  return (
    "Não achei o CORPUS.json dos cursos do chess.com.\n" +
    "Ele fica em <REPERTORIO_FONTES>/chesscom-cursos/CORPUS.json e está fora do\n" +
    "Git de propósito: é prosa de curso pago e este repositório é público.\n" +
    (procurei.length === 0
      ? "Falta REPERTORIO_FONTES no .env.local."
      : `Procurei em: ${procurei.join(", ")}`)
  );
}

export function carregarCorpus(): Corpus | null {
  const { achado } = ondeEstaOCorpus();
  if (!achado) return null;

  const bruto: Record<string, Curso> = JSON.parse(readFileSync(achado, "utf8"));

  const memoria = new Map<string, string>();
  const chave = (fen: string): string => {
    let k = memoria.get(fen);
    if (k === undefined) {
      k = new Chess(fen).fen().split(" ").slice(0, 4).join(" ");
      memoria.set(fen, k);
    }
    return k;
  };

  const anotar = (mapa: Map<string, Passagem[]>, onde: string, quem: Passagem): void => {
    const lista = mapa.get(onde);
    if (lista) lista.push(quem);
    else mapa.set(onde, [quem]);
  };

  const inicial = chave(PADRAO);
  const chegam = new Map<string, Passagem[]>();
  const partem = new Map<string, Passagem[]>();

  let variantes = 0;
  let comentarios = 0;
  for (const [curso, lista] of Object.entries(bruto)) {
    for (const variante of lista) {
      variantes += 1;
      let antes = inicial;
      for (const lance of variante.lances) {
        const passagem: Passagem = {
          curso,
          variante: variante.nome,
          san: lance.san,
          com: lance.com ?? "",
        };
        if (passagem.com) comentarios += 1;
        const depois = chave(lance.fen);
        anotar(partem, antes, passagem);
        anotar(chegam, depois, passagem);
        antes = depois;
      }
    }
  }

  return {
    chegam,
    partem,
    chave,
    inicial,
    cursos: Object.keys(bruto).length,
    variantes,
    comentarios,
    arquivo: achado,
  };
}
