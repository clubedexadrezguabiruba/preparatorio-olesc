/**
 * O recorte do banco público de puzzles do Lichess (CC0).
 *
 * Uso:
 *   node scripts/filtrar-puzzles.ts [caminho-do-csv]
 *   node scripts/filtrar-puzzles.ts --limite 200      (teto por arquivo, para testar)
 *
 * O CSV bruto tem ~5 milhões de linhas e 570 MB. **Nada disso entra no
 * repositório.** O que entra é o recorte: por tema do currículo
 * (`lib/tatica/blocos.ts`), por faixa de rating, com teto por arquivo para o
 * celular carregar rápido. A fonte fica em `dados/`, que é `.gitignore`d.
 *
 * A leitura da linha, os filtros de qualidade e a conferência dos lances
 * moram em `scripts/puzzles-lichess.ts`, porque `scripts/base-rating.ts` (os
 * problemas de 400–700 do modo rating) usa os mesmos.
 *
 * ## Por que a amostra é por hash, e não pelas primeiras N linhas
 *
 * Alguns temas (`fork`, `mateIn2`) têm centenas de milhares de puzzles na
 * faixa; o teto por arquivo é 1.000. Pegar "os primeiros 1.000" amostraria o
 * começo do arquivo, que vem ordenado por id — e o id do Lichess carrega a
 * época em que o puzzle foi gerado. A amostra ficaria presa aos antigos.
 *
 * Então cada puzzle ganha uma chave `hash(id)` e o balde guarda **as 1.000
 * menores chaves**. É uniforme, é determinístico (rodar de novo dá o mesmo
 * recorte) e não depende da ordem de leitura.
 */

import { createReadStream, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCOS, temaPorTag } from "../lib/tatica/blocos.ts";
import { ORIGEM_BASE } from "../lib/tatica/rating.ts";
import {
  chaveDaAmostra,
  comEtiquetasNossas,
  DESVIO_MAXIMO,
  idsEmDisco,
  JOGADAS_MINIMAS,
  lerEtiquetasNossas,
  lerLinha,
  POPULARIDADE_MINIMA,
  problemaDo,
  type Bruto as Lido,
} from "./puzzles-lichess.ts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

/* ------------------------------------------------------------------ *
 * Os filtros de qualidade
 * ------------------------------------------------------------------ */

/**
 * Popularidade, jogadas e desvio vêm de `scripts/puzzles-lichess.ts`.
 *
 * `RATING`: 700–2100, decisão do Doug. A turma joga de 700 a 1700 de rápidas
 * no chess.com, e o piso sobe de 600 para 700 porque abaixo disso o puzzle é
 * ruído. O teto vai a 2100 — o mesmo número aqui e em todos os onze blocos de
 * `lib/tatica/blocos.ts` — porque a série de cada tema sobe sozinha em rating:
 * quem chega ao topo dela é quem aguenta o topo. Não há teto didático.
 */
const RATING_MINIMO = 700;
const RATING_MAXIMO = 2100;

/**
 * Teto por arquivo, decisão do Doug: 1.000, e não os 2.000 de antes.
 *
 * Com o corte em 2100 cada tema ganha faixas novas em cima, e 2.000 por faixa
 * dobrariam o peso do repositório sem servir a ninguém: um aluno consome ~39
 * puzzles num tema inteiro, então 1.000 numa faixa só já são 25× isso.
 * ~1.000 puzzles dão ~150 KB de JSON: um toque no 4G.
 */
const TETO_PADRAO = 1000;

/** Largura de cada faixa de rating dentro do bloco. */
const LARGURA_DA_FAIXA = 200;

/* ------------------------------------------------------------------ *
 * Amostra determinística
 * ------------------------------------------------------------------ */

type Bruto = Lido & { chave: number };

type Balde = {
  tag: string;
  bloco: number;
  de: number;
  ate: number;
  /** Quantos existiam no banco, antes do teto. É o número que mede a folga. */
  vistos: number;
  amostra: Bruto[];
  /**
   * A maior chave que ainda cabe no balde, medida na última poda (`aparar`).
   * Chave acima dela não entra. Até o balde encher, não há limite.
   */
  limite: number;
};

/* ------------------------------------------------------------------ *
 * Os baldes: uma faixa de rating por arquivo
 * ------------------------------------------------------------------ */

function faixasDe(de: number, ate: number): [number, number][] {
  const faixas: [number, number][] = [];
  for (let inicio = de; inicio < ate; inicio += LARGURA_DA_FAIXA) {
    const fim = Math.min(inicio + LARGURA_DA_FAIXA, ate);
    // A última faixa absorve o resto em vez de nascer com 50 pontos de largura.
    if (ate - fim < LARGURA_DA_FAIXA / 2) {
      faixas.push([inicio, ate]);
      break;
    }
    faixas.push([inicio, fim]);
  }
  return faixas;
}

/** `tag` -> baldes daquele tema, na ordem das faixas. */
const baldesPorTag = new Map<string, Balde[]>();
for (const bloco of BLOCOS) {
  for (const tema of bloco.temas) {
    baldesPorTag.set(
      tema.tag,
      faixasDe(bloco.faixa[0], bloco.faixa[1]).map(([de, ate]) => ({
        tag: tema.tag,
        bloco: bloco.id,
        de,
        ate,
        vistos: 0,
        amostra: [],
        limite: Infinity,
      })),
    );
  }
}

/* ------------------------------------------------------------------ *
 * A varredura
 * ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const iLimite = argv.indexOf("--limite");
const teto = iLimite >= 0 ? Number(argv[iLimite + 1]) : TETO_PADRAO;
/** O mês do dump do Lichess (`--dump 2026-09`), gravado no índice. */
const iDump = argv.indexOf("--dump");
const dump = iDump >= 0 ? argv[iDump + 1] : undefined;
// A guarda `>= 0` não é enfeite: sem `--limite`, `iLimite` é -1 e
// `iLimite + 1` é 0 — o índice do primeiro argumento. Sem ela,
// `node scripts/filtrar-puzzles.ts outro.csv`, que é a forma documentada no
// cabeçalho deste arquivo, descartava o caminho em silêncio.
const valorDeOpcao = (i: number) => (iLimite >= 0 && i === iLimite + 1) || (iDump >= 0 && i === iDump + 1);
const csv =
  argv.find((a, i) => !a.startsWith("--") && !valorDeOpcao(i)) ??
  path.join(RAIZ, "dados/lichess_db_puzzle.csv");

const DESTINO = path.join(RAIZ, "public/puzzles");

/**
 * Os ids de cada tema que já estão no site, lidos antes de apagar a pasta — ver
 * `idsEmDisco`. Passam na frente da amostra do balde do tema deles.
 */
const fixados = new Map<string, Set<string>>(
  [...baldesPorTag.keys()].map((tag) => [tag, idsEmDisco(path.join(DESTINO, tag))]),
);
const todosOsFixados = new Set([...fixados.values()].flatMap((ids) => [...ids]));
/**
 * Os temas em teste (`Tema.emTeste`) não são amostrados: ficam só os ids que já
 * estão em disco, escolhidos à mão para o Doug conferir
 * (`scripts/desperado-teste.ts`). Sem a pasta, o tema sai vazio e o fim do
 * script reprova.
 */
const emTeste = new Set(BLOCOS.flatMap((b) => b.temas).filter((t) => t.emTeste).map((t) => t.tag));
/**
 * Fixados que apareceram no CSV (em qualquer linha), os que passaram nos filtros
 * com a tag, e os que passaram mas com a nota fora da faixa do bloco.
 */
const fixadosNoCsv = new Set<string>();
const fixadosQuePassaram = new Map<string, Set<string>>([...baldesPorTag.keys()].map((tag) => [tag, new Set()]));
const fixadosForaDaFaixa = new Map<string, Set<string>>([...baldesPorTag.keys()].map((tag) => [tag, new Set()]));

/** As tags que nós calculamos — ver `lerEtiquetasNossas`. */
const nossas = lerEtiquetasNossas(path.join(RAIZ, "dados/etiquetas-nossas.tsv"));

/** Aparar o balde custa um sort; só compensa quando ele passa do dobro. */
const FOLGA = teto * 2;

/**
 * Deixa no balde as `teto` menores chaves — **e todo id fixado**, mesmo que passe
 * do teto. O fixado tem chave negativa e vem primeiro; se a nota dele mudou e
 * ele caiu numa faixa que já tinha mil fixados, ele fica assim mesmo: o aluno
 * que o errou continua achando-o na revisão, e o arquivo cresce uns puzzles.
 */
function aparar(balde: Balde): void {
  balde.amostra.sort((a, b) => a.chave - b.chave);
  const fixos = balde.amostra.findIndex((p) => p.chave >= 0);
  const quantosFixos = fixos < 0 ? balde.amostra.length : fixos;
  balde.amostra.length = Math.min(balde.amostra.length, Math.max(teto, quantosFixos));
  if (balde.amostra.length >= teto) balde.limite = balde.amostra[teto - 1].chave;
}

async function varrer(): Promise<{ linhas: number; candidatos: number }> {
  const leitor = createInterface({
    input: createReadStream(csv, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let linhas = 0;
  let candidatos = 0;

  for await (const linha of leitor) {
    linhas++;
    if (todosOsFixados.size) {
      const id = linha.slice(0, linha.indexOf(","));
      if (todosOsFixados.has(id)) fixadosNoCsv.add(id);
    }
    const cru = lerLinha(linha, RATING_MINIMO, RATING_MAXIMO);
    if (!cru) continue;
    const lido = comEtiquetasNossas(cru, nossas);
    const { rating, temas } = lido;
    let usado = false;

    for (const tema of temas) {
      const baldes = baldesPorTag.get(tema);
      if (!baldes) continue;
      const fixadosDoTema = fixados.get(tema)!;
      if (fixadosDoTema.has(lido.id)) {
        fixadosQuePassaram.get(tema)!.add(lido.id);
        if (rating < baldes[0].de || rating >= baldes[baldes.length - 1].ate) fixadosForaDaFaixa.get(tema)!.add(lido.id);
      }
      if (emTeste.has(tema) && !fixadosDoTema.has(lido.id)) continue;
      for (const balde of baldes) {
        if (rating < balde.de || rating >= balde.ate) continue;
        balde.vistos++;

        const chave = chaveDaAmostra(lido.id, fixadosDoTema);
        // O balde já está cheio e esta chave é pior que a pior de lá: não vale
        // nem materializar o objeto.
        //
        // A pior de lá é `limite`, e não o último item da lista: entre duas podas
        // a lista não está em ordem, e o último é só o que entrou por último. A
        // comparação com ele recusava chaves que cabiam — a amostra nunca foi "as
        // 1.000 menores", e os ids fixados (chave negativa) se derrubavam uns aos
        // outros: só 68 mil de 176 mil ficavam.
        if (chave >= 0 && chave > balde.limite) {
          continue;
        }
        balde.amostra.push({ ...lido, chave });
        if (balde.amostra.length > FOLGA) aparar(balde);
        usado = true;
      }
    }
    if (usado) candidatos++;

    if (linhas % 1_000_000 === 0) {
      process.stdout.write(`  ${linhas / 1_000_000} M linhas lidas...\n`);
    }
  }

  return { linhas, candidatos };
}

/* ------------------------------------------------------------------ *
 * Gravar
 * ------------------------------------------------------------------ */

type TemaNoIndice = {
  tag: string;
  bloco: number;
  /** Quem classificou os puzzles: a tag do Lichess, ou os nossos detectores. */
  origem: "lichess" | "nosso";
  faixas: { de: number; ate: number; arquivo: string; total: number }[];
  total: number;
  noBanco: number;
};

async function principal(): Promise<void> {
  console.log(`Lendo ${csv}`);
  console.log(
    `Filtros: rating ${RATING_MINIMO}-${RATING_MAXIMO}, popularidade >= ${POPULARIDADE_MINIMA}, ` +
      `jogadas >= ${JOGADAS_MINIMAS}, desvio <= ${DESVIO_MAXIMO}, teto ${teto}/arquivo`,
  );
  console.log(
    `Ids fixados (já no site): ${todosOsFixados.size.toLocaleString("pt-BR")}. ` +
      `Etiquetas nossas: ${nossas.porId.size.toLocaleString("pt-BR")} puzzles, governando ` +
      `${nossas.governa.size ? [...nossas.governa].join(" ") : "nenhuma tag"}.\n`,
  );

  const inicio = Date.now();
  const { linhas, candidatos } = await varrer();
  console.log(
    `\n${linhas.toLocaleString("pt-BR")} linhas em ${((Date.now() - inicio) / 1000).toFixed(0)} s ` +
      `- ${candidatos.toLocaleString("pt-BR")} puzzles serviram a algum tema.\n`,
  );

  // **`public/` e não `content/`, e há uma única cópia de propósito.**
  //
  // São dois leitores: o celular do aluno, que busca o arquivo do tema pela
  // rede enquanto ele resolve, e a server action que reconfere o lance antes de
  // gravar a tentativa. O primeiro só alcança `public/`; o segundo alcança
  // qualquer coisa em disco. Gerar em `content/` e copiar para `public/` na
  // build daria 33 MB duplicados e — pior — dois arquivos que podem divergir,
  // com o servidor julgando o lance por uma solução e o aluno vendo outra.
  const destino = DESTINO;
  // Apaga o recorte dos temas, e não a pasta: `rating-base/` sai de outro
  // script (`npm run puzzles:base-rating`), de outra faixa do mesmo CSV, e
  // `rating-indice.json` é refeito a partir dos dois — ver o aviso no fim.
  const DE_OUTROS = new Set([ORIGEM_BASE, "rating-indice.json"]);
  mkdirSync(destino, { recursive: true });
  for (const nome of readdirSync(destino)) {
    if (!DE_OUTROS.has(nome)) rmSync(path.join(destino, nome), { recursive: true, force: true });
  }

  const indice: TemaNoIndice[] = [];
  const noSite = new Map<string, Set<string>>();
  let gravados = 0;
  let recusados = 0;
  const vazios: string[] = [];

  for (const [tag, baldes] of baldesPorTag) {
    const noIndice: TemaNoIndice = {
      tag,
      bloco: baldes[0].bloco,
      origem: temaPorTag(tag)?.origem ?? "lichess",
      faixas: [],
      total: 0,
      noBanco: 0,
    };

    for (const balde of baldes) {
      aparar(balde);
      noIndice.noBanco += balde.vistos;

      const bons: Omit<Bruto, "chave">[] = [];
      for (const p of balde.amostra) {
        const problema = problemaDo(p);
        if (problema) {
          recusados++;
          if (recusados <= 5) console.warn(`  recusado ${p.id}: ${problema}`);
          continue;
        }
        bons.push({ id: p.id, fen: p.fen, lances: p.lances, rating: p.rating, temas: p.temas });
      }
      if (bons.length === 0) continue;

      // Em rating crescente: é assim que a série do tema é servida.
      bons.sort((a, b) => a.rating - b.rating || (a.id < b.id ? -1 : 1));
      if (!noSite.has(tag)) noSite.set(tag, new Set());
      for (const p of bons) noSite.get(tag)!.add(p.id);

      const arquivo = `${tag}/${balde.de}-${balde.ate}.json`;
      mkdirSync(path.join(destino, tag), { recursive: true });
      writeFileSync(path.join(destino, arquivo), JSON.stringify(bons), "utf8");

      noIndice.faixas.push({ de: balde.de, ate: balde.ate, arquivo, total: bons.length });
      noIndice.total += bons.length;
      gravados += bons.length;
    }

    if (noIndice.total === 0) vazios.push(tag);
    indice.push(noIndice);
  }

  writeFileSync(
    path.join(destino, "index.json"),
    `${JSON.stringify(
      {
        fonte: "lichess.org/training - banco público de puzzles, CC0",
        geradoEm: new Date().toISOString().slice(0, 10),
        ...(dump ? { dumpDoLichess: dump } : {}),
        filtros: {
          rating: [RATING_MINIMO, RATING_MAXIMO],
          popularidadeMinima: POPULARIDADE_MINIMA,
          jogadasMinimas: JOGADAS_MINIMAS,
          desvioMaximo: DESVIO_MAXIMO,
          tetoPorArquivo: teto,
        },
        totalNoSite: gravados,
        temas: indice,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("Bloco  Tema                     no site    no banco");
  for (const bloco of BLOCOS) {
    for (const tema of bloco.temas) {
      const t = indice.find((i) => i.tag === tema.tag);
      if (!t) continue;
      console.log(
        `  ${String(bloco.id).padEnd(4)} ${tema.tag.padEnd(22)} ${String(t.total).padStart(7)} ` +
          `${t.noBanco.toLocaleString("pt-BR").padStart(11)}`,
      );
    }
  }
  console.log(`\nTotal no site: ${gravados.toLocaleString("pt-BR")} puzzles.`);

  // Os fixados: quantos ficaram e por que saíram os que saíram.
  let mantidos = 0;
  let foraDoCsv = 0;
  let semFiltroOuTag = 0;
  let foraDaFaixa = 0;
  let cortados = 0;
  for (const [tag, ids] of fixados) {
    for (const id of ids) {
      if (noSite.get(tag)?.has(id)) mantidos++;
      else if (!fixadosNoCsv.has(id)) foraDoCsv++;
      else if (!fixadosQuePassaram.get(tag)!.has(id)) semFiltroOuTag++;
      else if (fixadosForaDaFaixa.get(tag)!.has(id)) foraDaFaixa++;
      else cortados++;
    }
  }
  const sumiram = foraDoCsv + semFiltroOuTag + foraDaFaixa + cortados;
  console.log(
    `Fixados: ${mantidos.toLocaleString("pt-BR")} mantidos, ${sumiram.toLocaleString("pt-BR")} sumiram ` +
      `(${foraDoCsv} fora do CSV, ${semFiltroOuTag} fora dos filtros ou sem a tag, ` +
      `${foraDaFaixa} com a nota fora da faixa do bloco, ${cortados} cortados pelo teto).`,
  );
  if (recusados) console.log(`Recusados na conferência: ${recusados}.`);
  // Os ids dos temas mudaram (ou podem ter mudado): o índice do modo rating
  // aponta para eles pelo arquivo de origem.
  console.log("\nRefaça o índice do modo rating: npm run puzzles:indice-rating");

  if (vazios.length) {
    console.error(`\nTags sem nenhum puzzle: ${vazios.join(", ")}`);
    console.error("Ou a tag não existe no Lichess, ou a faixa do bloco não a alcança.");
    process.exitCode = 1;
  }
}

await principal();
