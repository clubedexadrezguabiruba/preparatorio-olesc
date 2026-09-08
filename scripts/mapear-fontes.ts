/**
 * Onde cada linha do repertório sai do roteiro da fonte — e o que a fonte faz ali.
 *
 * Uso:
 *   node scripts/mapear-fontes.ts                 o mapa das linhas, agrupado
 *   node scripts/mapear-fontes.ts <id-da-linha>   a prosa da fonte, lance a lance
 *
 * ## O que este script responde
 *
 * A régua do repertório (`docs/REVISAO-FONTES.md` §1) diz que toda linha tem de
 * ser recomendação de uma fonte que **explique** os lances. Para cumprir isso é
 * preciso saber, por linha, até onde a fonte acompanha e o que ela faz quando
 * para de acompanhar — e isso é medida, não opinião.
 *
 * O mapa foi feito à mão duas vezes e **perdido duas vezes**, porque vivia num
 * arquivo temporário de sessão. Por isso virou script: refazer a medição custa
 * um comando, e a §17 do documento passa a ser conferível em vez de lembrada.
 *
 * ## Os três números do mapa, e por que são três
 *
 * - **Cobertura contígua** — do lance 1 até o primeiro que nenhuma fonte joga.
 *   É o tronco que dá para citar sem ressalva.
 * - **Cobertura total** — quantos meios-lances caem em posição que alguma fonte
 *   alcançou, contando os que vêm **depois** do furo. Quando os dois números
 *   diferem muito, a fonte joga a mesma coisa por outra ordem de lances.
 * - **Quem jogou o lance que quebrou.** Se foi **nosso**, escolhemos um lance
 *   que a fonte não joga, e há uma cauda para trocar. Se foi **dele**, a fonte
 *   simplesmente não cobre aquela resposta do adversário — não há cauda para
 *   trocar, falta fonte para o ramo inteiro. São trabalhos diferentes, e sem
 *   essa distinção o mapa não serve para planejar nada.
 *
 * ## O casamento é por posição, nunca por nome de abertura
 *
 * Mesma razão do `medir-fidelidade.ts`: os capítulos dos cursos não batem com os
 * nossos arquivos, e transposição é o que os cursos mais fazem. A chave são as 4
 * primeiras partes da FEN — posição, vez, roques, en passant.
 *
 * ### A armadilha do en passant, que faz a medição dar zero
 *
 * A `chess.js` só escreve a casa de en passant quando a captura é de fato
 * possível; o chess.com escreve sempre que um peão anda duas casas. Comparar as
 * strings cruas dá **zero** posições em comum — nem o `1.e4` bate, e o mapa sai
 * dizendo que nenhuma linha tem fonte. Por isso toda FEN da fonte é recarregada
 * pela `chess.js` e reemitida antes de virar chave.
 *
 * O `medir-fidelidade.ts` não tem esse problema porque os dois lados dele passam
 * pela nossa `chess.js`. Aqui um dos lados é JSON de fora.
 *
 * ## De onde vem o corpus, e por que ele não está no Git
 *
 * `<REPERTORIO_FONTES>/chesscom-cursos/CORPUS.json`: os cursos lidos pela API do
 * chess.com, com lances, FEN e a prosa do autor. É **curso pago** e este
 * repositório é público — nunca entra no Git. Sem o arquivo o script diz isso e
 * sai em paz, como o `repertorio:importar` faz com as pastas dele.
 *
 * ## Os números de controle
 *
 * O cabeçalho imprime o tamanho do corpus e quantas âncoras de comentário caem
 * em posição com prosa. Em 7/9/2026, sobre as 40 linhas: **11 cursos, 165
 * variantes, 2.434 comentários** e **53 de 110 âncoras**. Se esses números
 * mudarem sem que o corpus ou o repertório tenham mudado, a medição quebrou — o
 * caso mais provável é a armadilha do en passant voltando.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { carregarEnv, RAIZ } from "./env-local.ts";
import { carregarCorpus, ondeEstaOCorpus, recadoSemCorpus, type Passagem } from "./corpus.ts";
import { lerPgns } from "../lib/repertorio/pgn.ts";
import { expandir } from "../lib/repertorio/arvore.ts";
import { CORES, NIVEIS, type Cor, type Linha, type Nivel } from "../lib/repertorio/linhas.ts";

carregarEnv();

const ALVO = process.argv[2];


// ------------------------------------------------------------------ o corpus
//
// O índice por posição mora em `scripts/corpus.ts` desde 8/9/2026: o
// `cauda-repertorio.ts` precisa exatamente do mesmo, e duas cópias divergiriam
// no dia em que alguém consertasse só uma. A armadilha do en passant descrita
// no cabeçalho está lá dentro, com o comentário junto.

const corpus = carregarCorpus();
if (!corpus) {
  console.log(recadoSemCorpus(ondeEstaOCorpus().procurei));
  process.exit(0);
}

const { chegam, partem, chave, inicial: INICIAL, variantes, comentarios: comentariosDaFonte } = corpus;

// ------------------------------------------------------------------ as linhas

const ORIGEM = path.join(RAIZ, "content", "repertorio");
const linhas: Linha[] = [];
for (const nome of readdirSync(ORIGEM).filter((n) => n.toLowerCase().endsWith(".pgn"))) {
  for (const jogo of lerPgns(readFileSync(path.join(ORIGEM, nome), "utf8"))) {
    const { Abertura: abertura, Nome: arvore, Fonte: fonte, Cor: cor, Nivel: nivel } = jogo.tags;
    if (!abertura || !arvore || !fonte) continue;
    if (!CORES.includes(cor as Cor) || !NIVEIS.includes(nivel as Nivel)) continue;
    const { linhas: expandidas } = expandir(jogo, {
      abertura,
      nome: arvore,
      cor: cor as Cor,
      nivel: nivel as Nivel,
      fonte,
    });
    linhas.push(...expandidas);
  }
}

/** As FEN de uma linha, uma por meio-lance, pela nossa própria chess.js. */
function posicoes(linha: Linha): string[] {
  const tabuleiro = new Chess();
  return linha.lances.map((uci) => {
    tabuleiro.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || undefined,
    });
    return chave(tabuleiro.fen());
  });
}

/** `6.` para lance das brancas, `6…` para o das pretas. */
const rotulo = (meia: number): string => `${Math.floor(meia / 2) + 1}${meia % 2 === 0 ? "." : "…"}`;

type Medida = {
  linha: Linha;
  fens: string[];
  contigua: number;
  total: number;
  /** Meio-lance em que a fonte volta a bater depois do furo, ou -1. */
  volta: number;
  ancoras: number;
  ancorasComProsa: number;
};

function medir(linha: Linha): Medida {
  const fens = posicoes(linha);
  let contigua = 0;
  while (contigua < fens.length && chegam.has(fens[contigua])) contigua++;
  const cobertos = fens.map((f) => chegam.has(f));
  const ancoras = Object.keys(linha.comentarios).map(Number);
  return {
    linha,
    fens,
    contigua,
    total: cobertos.filter(Boolean).length,
    volta: cobertos.findIndex((cob, i) => i >= contigua && cob),
    ancoras: ancoras.length,
    ancorasComProsa: ancoras.filter((i) => (chegam.get(fens[i]) ?? []).some((p) => p.com)).length,
  };
}

/** O que a fonte joga a partir da posição em que a nossa linha a perdeu. */
function alternativas(m: Medida): string[] {
  const antes = m.contigua === 0 ? INICIAL : m.fens[m.contigua - 1];
  return [...new Set((partem.get(antes) ?? []).map((p) => p.san))];
}

// -------------------------------------------------------------------- saída

console.log(
  `corpus: ${corpus.cursos} cursos, ${variantes} variantes, ` +
    `${comentariosDaFonte} comentários — ${chegam.size} posições distintas`,
);

if (ALVO) {
  const linha = linhas.find((l) => l.id === ALVO);
  if (!linha) {
    console.error(`\nNão achei a linha ${ALVO}. Os ids saem de npm run repertorio:mapear.`);
    process.exit(1);
  }
  const fens = posicoes(linha);
  console.log(`\n### ${linha.id} — ${linha.nome}\n`);
  fens.forEach((fen, i) => {
    const passagens = chegam.get(fen) ?? [];
    const cabeca = `${rotulo(i)}${linha.sans[i]}`;
    if (passagens.length > 0) {
      console.log(`--- ${cabeca}   [${[...new Set(passagens.map((p) => p.curso))].join(", ")}]`);
      const prosa = new Set(passagens.filter((p) => p.com).map((p) => `${p.curso}: ${p.com}`));
      for (const texto of prosa) console.log(`    ${texto.replace(/\s+/g, " ")}`);
      return;
    }
    console.log(`--- ${cabeca}   *** A FONTE NÃO JOGA DAQUI EM DIANTE ***`);
    const daqui = new Map<string, Passagem[]>();
    for (const p of partem.get(i === 0 ? INICIAL : fens[i - 1]) ?? []) {
      daqui.set(p.san, [...(daqui.get(p.san) ?? []), p]);
    }
    for (const [san, ps] of daqui) {
      console.log(`    >> a fonte joga ${san} (${ps.length}×)`);
      for (const p of ps.filter((x) => x.com).slice(0, 2)) {
        console.log(`       ${p.curso}: ${p.com.replace(/\s+/g, " ")}`);
      }
    }
  });
  process.exit(0);
}

const medidas = linhas.map(medir);
const ancoras = medidas.reduce((s, m) => s + m.ancoras, 0);
const comProsa = medidas.reduce((s, m) => s + m.ancorasComProsa, 0);
console.log(
  `repertório: ${linhas.length} linhas, ${ancoras} âncoras de comentário — ` +
    `${comProsa} caem em posição com prosa da fonte\n`,
);

/**
 * Os grupos, na ordem em que dão trabalho.
 *
 * A ordem dos testes importa: **sem fonte** vem antes de **só ordem**, senão uma
 * linha que bate no `1.e4` e reencontra a fonte por acidente entra no grupo
 * barato. O corte de 2 meios-lances é o `1.e4 c5` — abaixo disso não há fonte,
 * há coincidência de primeiro lance.
 */
const GRUPOS = [
  { chave: "inteira", titulo: "COBERTA INTEIRA — só falta a citação" },
  { chave: "ordem", titulo: "SÓ ORDEM DE LANCES — a fonte volta a bater adiante" },
  { chave: "cauda", titulo: "CAUDA DE VERDADE — o lance que quebra é NOSSO" },
  { chave: "ramo", titulo: "A FONTE NÃO COBRE O RAMO — o lance que quebra é DELE" },
  { chave: "sem-fonte", titulo: "SEM FONTE — a fonte nem entra nesta abertura" },
] as const;

type Grupo = (typeof GRUPOS)[number]["chave"];

function grupoDe(m: Medida): Grupo {
  if (m.contigua >= m.linha.lances.length) return "inteira";
  if (m.total <= 2) return "sem-fonte";
  if (m.volta >= 0) return "ordem";
  return m.linha.meus.includes(m.contigua) ? "cauda" : "ramo";
}

for (const { chave: g, titulo } of GRUPOS) {
  const doGrupo = medidas
    .filter((m) => grupoDe(m) === g)
    .sort((a, b) => b.ancorasComProsa - a.ancorasComProsa || a.linha.id.localeCompare(b.linha.id));
  if (doGrupo.length === 0) continue;
  console.log(`### ${titulo} — ${doGrupo.length} linhas`);
  for (const m of doGrupo) {
    const n = m.linha.lances.length;
    const quebra = m.contigua < n ? `${rotulo(m.contigua)}${m.linha.sans[m.contigua]}` : "—";
    console.log(
      `  ${m.linha.id.padEnd(30)}` +
        `quebra ${quebra.padEnd(10)}` +
        `cont ${`${m.contigua}/${n}`.padEnd(7)}` +
        `tot ${`${m.total}/${n}`.padEnd(7)}` +
        (m.volta >= 0 ? `volta ${rotulo(m.volta).padEnd(6)}` : " ".repeat(12)) +
        `âncoras ${m.ancorasComProsa}/${m.ancoras}` +
        (g === "inteira" ? "" : `   a fonte joga: ${alternativas(m).join(" ")}`),
    );
  }
  console.log("");
}
