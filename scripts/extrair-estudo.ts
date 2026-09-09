/**
 * Dos estudos do Lichess para a tabela capítulo→FEN do módulo de finais.
 *
 * Uso:
 *   node scripts/extrair-estudo.ts              (baixa o que falta e extrai)
 *   node scripts/extrair-estudo.ts --forcar     (rebaixa tudo, mesmo o que já tem)
 *   node scripts/extrair-estudo.ts p9HrYIHr     (só este estudo)
 *
 * ## O que ele substitui
 *
 * A rodada anterior transcreveu cinco diagramas do Silman à mão, por OCR de PDF,
 * e gastou uma sessão nisso. Os estudos do `carbone144` retranscrevem o mesmo
 * livro **com a FEN pronta na tag `[FEN]` de cada capítulo** — o dado que o OCR
 * estava reconstruindo a olho. São 49 aulas a escrever; um passo manual repetido
 * 49 vezes é um passo que sai errado alguma vez.
 *
 * ## O que entra no repositório, e o que não entra
 *
 * **Não repetir aqui o argumento: ele está escrito em `scripts/importar-fontes.ts`,
 * no cabeçalho (`:9-18`), e vale palavra por palavra.** Em resumo: os PGN
 * originais ficam fora do Git — eles carregam o prefácio e os comentários do
 * Silman transcritos por OCR, que é a expressão do autor, e este repositório é
 * público. O que é versionado é `content/finais/capitulos.json`: número, nome do
 * capítulo, FEN e os lances da linha principal em UCI. Lances e posição são fato
 * com proveniência; a prosa não.
 *
 * Os PGN vão para `content/finais/estudos/`, que está no `.gitignore`, e voltam
 * inteiros com um `npm run finais:extrair`.
 *
 * ## A FEN sai daqui conferida por regra, não por resultado
 *
 * Cada linha principal é reproduzida lance a lance pela `chess.js` — a mesma
 * dependência que `lib/repertorio/arvore.ts` já usa para isso. Um SAN que ela
 * recusa vira `problemas` no relatório, com o capítulo nomeado, em vez de virar
 * uma linha UCI truncada em silêncio.
 *
 * Quem julga se a posição **ganha, empata ou perde** é o
 * `npm run validate:content`, contra a Syzygy, quando a posição virar arquivo em
 * `content/positions/`. Este script não sabe xadrez além da regra do lance —
 * duas opiniões sobre quem ganha um final seriam uma a mais.
 *
 * ## O leitor de PGN é o de `lib/repertorio/pgn.ts` — mas o corte é daqui
 *
 * O leitor é o de lá pelo motivo escrito lá: o `loadPgn` da `chess.js` 1.4.0
 * anda só por `variations[0]` e descarta os irmãos sem erro nenhum.
 *
 * **O que não serve é o `lerPgns`, e isto foi medido.** A regra de corte dele é
 * "uma tag depois de já ter aparecido lance abre jogo novo", e ela existe porque
 * 6 dos 13 arquivos do Grigoryan não têm `[Event]` nenhuma. Num estudo do
 * Lichess ela funde capítulos: um capítulo **sem lance** — a posição só, com o
 * comentário do autor, que é o formato de vários diagramas do Silman — não fecha
 * jogo, e o cabeçalho do capítulo seguinte sobrescreve o dele. Na primeira
 * rodada isso deu 45 capítulos onde o estudo tem 57, com nome e FEN desalinhados
 * a partir do primeiro capítulo mudo. É o mesmo erro que `recortarJogos`
 * documenta ter cometido com o preâmbulo do Kushager, e a correção é a mesma:
 * cortar pelo que o formato garante.
 *
 * Aqui o formato garante: o Lichess exporta o cabeçalho **completo** em cada
 * capítulo, sempre começando a linha com `[Event `. Então o corte é esse, e a
 * contagem é conferida contra o número de `[Event ` do arquivo — discordando, o
 * script para, em vez de escrever uma tabela com os capítulos trocados.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { RAIZ } from "./env-local.ts";
import { lerPgn, type LancePgn } from "../lib/repertorio/pgn.ts";

/**
 * Os estudos da série, e por que cada um está aqui.
 *
 * São sete no total, do mesmo autor e da mesma transcrição. Os três primeiros
 * cobrem os cinco níveis da trilha; o quarto entra porque fecha a `N2-RETI`
 * (cap. 6) e a `N5-VANCURA` (caps. 19–21), que eram as duas pendências antigas
 * da `TRILHA-FINAIS.md §9`. Os três de cima — Expert, Mestre e Táticas — estão
 * fora da trilha inteira e não são baixados.
 */
const ESTUDOS = [
  { id: "yk2b24vS", faixa: "Unrated–1399", nivel: "níveis 1, 2 e 3" },
  { id: "TW73iW6r", faixa: "1400–1599 (Classe C)", nivel: "nível 4" },
  { id: "p9HrYIHr", faixa: "1600–1799 (Classe B)", nivel: "nível 5" },
  { id: "uuks13Wq", faixa: "1800–1999 (Classe A)", nivel: "socorro do nível 5" },
] as const;

const PASTA_PGN = path.join(RAIZ, "content", "finais", "estudos");
const TABELA = path.join(RAIZ, "content", "finais", "capitulos.json");

const argumentos = process.argv.slice(2);
const FORCAR = argumentos.includes("--forcar");
const pedidos = argumentos.filter((a) => !a.startsWith("--"));
const alvos = pedidos.length > 0 ? ESTUDOS.filter((e) => pedidos.includes(e.id)) : ESTUDOS;

if (alvos.length === 0) {
  console.error(
    `Nenhum estudo conhecido em: ${pedidos.join(", ")}\n` +
      `Os que este script conhece: ${ESTUDOS.map((e) => e.id).join(", ")}`,
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Baixar
 * ------------------------------------------------------------------ */

/**
 * Baixa o PGN do estudo, ou lê o que já está em disco.
 *
 * A API é pública e sem chave (`/api/study/<id>.pgn`). Um estudo privado
 * responde 401 — foi o que aconteceu com o `VSa8FcDj`, o estudo-mestre de onde
 * os capítulos foram copiados —, e aí o erro sai nomeado em vez de o arquivo
 * ficar vazio.
 */
async function pegarPgn(id: string): Promise<string> {
  const arquivo = path.join(PASTA_PGN, `${id}.pgn`);
  if (!FORCAR && existsSync(arquivo)) return readFileSync(arquivo, "utf8");

  const resposta = await fetch(`https://lichess.org/api/study/${id}.pgn`, {
    headers: { Accept: "application/x-chess-pgn" },
  });
  if (!resposta.ok) {
    throw new Error(
      `lichess.org devolveu ${resposta.status} para o estudo ${id}` +
        (resposta.status === 401 ? " (estudo privado — não dá para usar)" : ""),
    );
  }
  const texto = await resposta.text();
  mkdirSync(PASTA_PGN, { recursive: true });
  writeFileSync(arquivo, texto, "utf8");
  return texto;
}

/* ------------------------------------------------------------------ *
 * Extrair
 * ------------------------------------------------------------------ */

/**
 * O que o capítulo é — e a distinção existe porque ela decide se a autoria pode
 * usar a FEN como está.
 *
 * - `posicao`: FEN legal. É o caso dos 175 capítulos que interessam.
 * - `divisor`: tabuleiro vazio (`8/8/8/8/8/8/8/8`). São as aberturas de parte, os
 *   "Intro" e os "Summing Up" — texto do autor, sem posição. Não são tópico.
 * - `diagrama`: a FEN tem peças, mas não é posição de partida. No estudo isso é
 *   **desenho didático**: peão em h1 marcando a coluna, dois reis brancos
 *   mostrando duas colocações ao mesmo tempo. O capítulo ensina de verdade, mas
 *   a FEN **não serve de posição de aula** — quem for escrever a aula desse tema
 *   monta a posição do zero e a manda para a tablebase.
 */
type TipoDeCapitulo = "posicao" | "divisor" | "diagrama";

type Capitulo = {
  /** A posição do capítulo no estudo, a partir de 1 — é como o Lichess o numera. */
  numero: number;
  nome: string;
  tipo: TipoDeCapitulo;
  /** A tag `[FEN]` do capítulo, como veio. `null` se o capítulo não tem uma. */
  fen: string | null;
  /** A linha principal em UCI, reproduzida lance a lance. */
  uci: string[];
  /** O link do capítulo no estudo público, para conferir no tabuleiro. */
  url: string | null;
  /** Por que este capítulo não é `posicao`, na palavra da chess.js. */
  porque?: string;
};

/** Tabuleiro sem peça nenhuma: o campo de colocação só tem dígitos e barras. */
const vazio = (fen: string): boolean => !/[a-z]/i.test(fen.split(" ")[0]);

const ARRUMAR_ESPACO = (texto: string): string => texto.replace(/\s+/g, " ").trim();

/** Só a linha principal: o primeiro filho de cada lance, sem entrar em variação. */
function principal(lances: readonly LancePgn[]): string[] {
  return lances.map((l) => l.san);
}

/**
 * SAN → UCI, reproduzindo a linha na posição do capítulo.
 *
 * Devolve os lances aceitos e, se algum foi recusado, o problema com o SAN
 * nomeado e o número do meio-lance — a linha para no primeiro erro, porque
 * depois dele a posição já não é a do arquivo e todo SAN seguinte seria julgado
 * contra um tabuleiro errado.
 *
 * `ilegal` e `problema` são coisas diferentes de propósito. `ilegal` é a FEN
 * recusada — no estudo isso quer dizer diagrama didático, não erro de ninguém.
 * `problema` é SAN recusado no meio da linha, e esse **é** erro de transcrição.
 */
function paraUci(
  fen: string,
  sans: readonly string[],
): { uci: string[]; problema: string | null; ilegal: string | null } {
  let tabuleiro: Chess;
  try {
    tabuleiro = new Chess(fen);
  } catch (erro) {
    return { uci: [], problema: null, ilegal: (erro as Error).message.replace(/^Invalid FEN: /, "") };
  }

  const uci: string[] = [];
  for (const [i, san] of sans.entries()) {
    try {
      const lance = tabuleiro.move(san);
      uci.push(`${lance.from}${lance.to}${lance.promotion ?? ""}`);
    } catch {
      return { uci, problema: `meio-lance ${i + 1}: a chess.js recusou "${san}"`, ilegal: null };
    }
  }
  return { uci, problema: null, ilegal: null };
}

type Extracao = {
  id: string;
  faixa: string;
  nivel: string;
  capitulos: Capitulo[];
  /** Só o que é erro de verdade: SAN recusado no meio de uma linha. */
  problemas: string[];
};

const contar = (e: Extracao, tipo: TipoDeCapitulo): number =>
  e.capitulos.filter((c) => c.tipo === tipo).length;

/**
 * Recorta o arquivo nos capítulos, pelo `[Event ` no começo da linha.
 *
 * Confere contra a contagem crua de `[Event ` porque um recorte errado em
 * silêncio é justamente o que este script não pode fazer — ele alimenta a coluna
 * "capítulo do estudo" do `docs/TRILHA-FINAIS.md`, e um número trocado ali manda
 * a autoria transcrever a posição errada.
 */
function recortarCapitulos(texto: string): string[] {
  const partes = texto.split(/(?=^\[Event )/m);
  const capitulos = partes[0].trimStart().startsWith("[Event ") ? partes : partes.slice(1);
  const esperados = (texto.match(/^\[Event /gm) ?? []).length;
  if (capitulos.length !== esperados) {
    throw new Error(
      `o recorte achou ${capitulos.length} capítulos e o arquivo tem ${esperados} tags [Event`,
    );
  }
  return capitulos;
}

/**
 * O cabeçalho do capítulo, lido do **bloco de tags do topo** e de mais nada.
 *
 * Não dá para pedir as tags ao `lerPgn`: ele devolve partida vazia — sem tag
 * nenhuma — quando o pedaço não tem lance, e capítulo sem lance é exatamente o
 * caso que o corte antigo perdia. O bloco do topo é o que o Lichess garante:
 * linhas `[Chave "valor"]` seguidas, até a primeira que não é tag.
 *
 * **A aspa escapada é obrigatória, e isto foi medido duas vezes.** O PGN escapa
 * `"` dentro do valor como `\"`, e o `uuks13Wq` usa isso em dois capítulos — os
 * que se chamam `Rook Ending : “Lucena\" with a Rook-Pawn`.
 *
 * 1. Com a leitura ingênua (`"([^"]*)"`) a linha deixa de casar, a varredura
 *    para, e o capítulo sai **sem tag nenhuma**: sem nome, sem FEN, contado como
 *    divisor. Eram justamente dois capítulos de torre e peão de torre.
 * 2. Corrigido isso, os mesmos dois capítulos passaram a reprovar em "SAN ruim"
 *    — porque a **`lib/repertorio/pgn.ts` tem o mesmo furo** na regex de tag da
 *    varredura (`:100`). Sem casar a tag, ela varre o texto do `[Event` como se
 *    fosse lance, e o `e` de "Event" casa com o SAN `[OKQRBNa-h]…` e vira o
 *    lance `ent`.
 *
 * Por isso esta função devolve **o cabeçalho e o resto**, e é o resto — só o
 * movetext — que vai para o `lerPgn`. É o recorte certo de qualquer jeito: as
 * tags já foram lidas aqui, e o leitor não precisa vê-las. O furo da
 * `pgn.ts` continua lá, declarado, e não é consertado nesta rodada porque
 * corrigi-lo é mexer no leitor do repertório, com o teste dele junto.
 */
function cabecalho(pedaco: string): { tags: Record<string, string>; movetext: string } {
  const tags: Record<string, string> = {};
  const linhas = pedaco.split("\n");
  let i = 0;
  for (; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (linha === "") continue;
    const casou = /^\[\s*(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]$/.exec(linha);
    if (!casou) break;
    tags[casou[1]] = casou[2].replace(/\\(.)/g, "$1");
  }
  return { tags, movetext: linhas.slice(i).join("\n") };
}

function extrair(id: string, faixa: string, nivel: string, texto: string): Extracao {
  const pedacos = recortarCapitulos(texto);
  const capitulos: Capitulo[] = [];
  const problemas: string[] = [];

  for (const [i, pedaco] of pedacos.entries()) {
    const numero = i + 1;
    const { tags, movetext } = cabecalho(pedaco);
    const nome = ARRUMAR_ESPACO(tags.ChapterName ?? tags.Event ?? `capítulo ${numero}`);
    const fen = tags.FEN ? ARRUMAR_ESPACO(tags.FEN) : null;
    const url = tags.ChapterURL ?? null;
    const base = { numero, nome, fen, url };

    if (!fen || vazio(fen)) {
      capitulos.push({ ...base, tipo: "divisor", uci: [], porque: "tabuleiro vazio" });
      continue;
    }

    const { uci, problema, ilegal } = paraUci(fen, principal(lerPgn(movetext).lances));

    if (ilegal) {
      capitulos.push({ ...base, tipo: "diagrama", uci: [], porque: ilegal });
      continue;
    }

    if (problema) problemas.push(`cap. ${numero} "${nome}" — ${problema}`);
    capitulos.push({ ...base, tipo: "posicao", uci });
  }

  return { id, faixa, nivel, capitulos, problemas };
}

/* ------------------------------------------------------------------ *
 * Rodar
 * ------------------------------------------------------------------ */

const extracoes: Extracao[] = [];
for (const estudo of alvos) {
  let texto: string;
  try {
    texto = await pegarPgn(estudo.id);
  } catch (erro) {
    console.error(`${estudo.id}: ${(erro as Error).message}`);
    process.exitCode = 1;
    continue;
  }
  try {
    extracoes.push(extrair(estudo.id, estudo.faixa, estudo.nivel, texto));
  } catch (erro) {
    console.error(`${estudo.id}: ${(erro as Error).message}`);
    process.exitCode = 1;
  }
}

/**
 * A tabela versionada.
 *
 * Rodar com um estudo só não pode apagar os outros três do arquivo: o que já
 * está escrito é lido, e só os estudos desta rodada são substituídos.
 */
mkdirSync(path.dirname(TABELA), { recursive: true });
const anterior: Record<string, unknown> = existsSync(TABELA)
  ? (JSON.parse(readFileSync(TABELA, "utf8")).estudos ?? {})
  : {};

const estudos: Record<string, unknown> = { ...anterior };
for (const e of extracoes) {
  estudos[e.id] = {
    faixa: e.faixa,
    cobre: e.nivel,
    url: `https://lichess.org/study/${e.id}`,
    capitulos: e.capitulos,
  };
}

writeFileSync(
  TABELA,
  `${JSON.stringify(
    {
      _leia: [
        "Gerado por `npm run finais:extrair`. Não editar à mão.",
        "Número, nome, FEN e linha principal em UCI de cada capítulo dos estudos que",
        "retranscrevem o Silman's Complete Endgame Course. Os PGN originais ficam fora",
        "do Git (content/finais/estudos/): eles carregam a prosa do autor. O que está",
        "aqui é fato com proveniência — a URL de cada capítulo confere a posição.",
        "Quem julga o resultado da posição é `npm run validate:content`, na Syzygy.",
        "",
        "O NOME vem truncado da fonte: o Lichess corta o nome do capítulo em 80",
        "caracteres, e nos estudos com prefixo longo isso come o nome — os capítulos 2",
        "a 7 do TW73iW6r se chamam todos 'King and Pawn vs. Lo'. Quem identifica um",
        "capítulo é o par (estudo, número), e a `url` abre a posição no tabuleiro.",
      ],
      estudos,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

/* ------------------------------------------------------------------ *
 * O relatório
 * ------------------------------------------------------------------ */

const tabela = (linhas: string[][]): string => {
  const largura = linhas[0].map((_, c) => Math.max(...linhas.map((l) => l[c].length)));
  return linhas
    .map((l, i) => {
      const feito = l.map((celula, c) =>
        c === 0 ? celula.padEnd(largura[c]) : celula.padStart(largura[c]),
      );
      return i === 0
        ? `  ${feito.join("  ")}\n  ${largura.map((w) => "─".repeat(w)).join("  ")}`
        : `  ${feito.join("  ")}`;
    })
    .join("\n");
};

console.log(`\nPGN em ${path.relative(RAIZ, PASTA_PGN)} (fora do Git).\n`);

const titulos = ["estudo", "caps.", "posição", "com linha", "divisor", "diagrama", "SAN ruim"];
const corpo = extracoes.map((e) => [
  `${e.id}  ${e.faixa}`,
  String(e.capitulos.length),
  String(contar(e, "posicao")),
  String(e.capitulos.filter((c) => c.uci.length > 0).length),
  String(contar(e, "divisor")),
  String(contar(e, "diagrama")),
  String(e.problemas.length),
]);
const soma = (i: number): string => String(corpo.reduce((t, l) => t + Number(l[i]), 0));
corpo.push(["TOTAL", soma(1), soma(2), soma(3), soma(4), soma(5), soma(6)]);
console.log(tabela([titulos, ...corpo]));

console.log(`
  posição     FEN legal — é o que a autoria pode transcrever direto
  com linha   destes, os que trazem lances além da posição
  divisor     tabuleiro vazio: abertura de parte, "Intro", "Summing Up". Não é tópico
  diagrama    FEN com peças que não é posição de partida (peão na 1ª fila, dois reis):
              desenho didático do autor. O capítulo ensina, a FEN não serve de aula
  SAN ruim    a chess.js recusou um lance no meio da linha — erro de transcrição`);

const comDiagrama = extracoes.filter((e) => contar(e, "diagrama") > 0);
if (comDiagrama.length > 0) {
  console.log(`\nDiagramas didáticos (a FEN não é posição de partida):`);
  for (const e of comDiagrama) {
    for (const c of e.capitulos.filter((x) => x.tipo === "diagrama")) {
      console.log(`  ${e.id}  cap. ${c.numero}  ${c.porque}\n    ${c.nome}\n    ${c.fen}`);
    }
  }
}

const comProblema = extracoes.filter((e) => e.problemas.length > 0);
if (comProblema.length > 0) {
  console.log(`\nLances recusados:`);
  for (const e of comProblema) {
    for (const p of e.problemas) console.log(`  ${e.id}  ${p}`);
  }
}

console.log(
  `\n${Object.keys(estudos).length} estudos em ${path.relative(RAIZ, TABELA)}, ` +
    `${extracoes.reduce((t, e) => t + e.capitulos.length, 0)} capítulos nesta rodada.`,
);

// SAN recusado é erro de transcrição, e tem de aparecer como falha — mas só
// depois de o relatório inteiro sair, para não esconder o resto.
if (comProblema.length > 0) process.exitCode = 1;
