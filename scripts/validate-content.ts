import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { z } from "zod";
import { applyUci, fenProblem, pieceCount, samePosition } from "../lib/chess/fen.ts";
import { OutOfScopeError, techniqueScope } from "../lib/chess/technique.ts";
import {
  lessonSchema,
  positionSchema,
  PROTECTED_SOURCE_CAP,
  PROVENANCE_FIELDS,
  sourceRegistrySchema,
  type Lesson,
  type MoveTree,
  type Position,
  type Source,
  type TerminalEnd,
  type TreeGoal,
} from "../lib/lesson/schema.ts";
import {
  alternativesDiffer,
  authorialExpects,
  branchesDiffer,
  generateAlternatives,
  generateBranches,
  GENERATED_ID,
  GeneratorError,
  longestLine,
  type GeneratedTree,
} from "./branches.ts";
import { respostasDe } from "../lib/lesson/tree.ts";
import { problemasDaPosicao } from "../lib/meiojogo/afirmacoes.ts";
import { validarDicas, type Dica } from "../lib/meiojogo/dicas.ts";
import { CacheMissError, goalMovesOf, Tablebase, type TbEntry } from "./tablebase.ts";

/**
 * O gate de conteúdo (plano da F1, §3.4).
 *
 * Confere tudo que o motor vai acreditar em runtime: a legalidade das posições,
 * a proveniência, a coerência das árvores de lances, e — o ponto central — a
 * verdade xadrezística de cada nó, certificada pela tablebase e não pelo
 * palpite de quem escreveu a aula.
 *
 *   npm run validate:content                       # offline, a partir do cache
 *   npm run validate:content -- --refresh-cache    # autoria: pode usar a rede
 *   npm run validate:content -- --refresh-cache --write
 *                                                  # grava os winningMoves
 */

const VERDE = "\u001b[32m";
const VERMELHO = "\u001b[31m";
const NORMAL = "\u001b[0m";

type Issue = { code: string; where: string; message: string };

const issues: Issue[] = [];
function fail(code: string, where: string, message: string) {
  issues.push({ code, where, message });
}

/* ------------------------------------------------------------------ *
 * Argumentos
 * ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
function flag(name: string): boolean {
  return argv.includes(`--${name}`);
}
function option(name: string, fallback: string): string {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

/** Tudo que o gate aceita. Qualquer outra coisa é erro duro, nunca silêncio. */
const FLAGS = ["refresh-cache", "write", "prune-cache", "rascunhos", "aplicar"] as const;
const OPCOES = ["content"] as const;

/**
 * Erro de argumento — sai com **exit 2** (o 1 é "conteúdo recusado") e no mesmo
 * formato de duas linhas dos outros problemas, com o código entre colchetes. O
 * formato não é enfeite: é o que o `mutation-check` procura, e é por ele que
 * estas travas ganham mutação plantada como todas as outras regras.
 */
function morrer(codigo: string, mensagem: string): never {
  console.error("");
  console.error(`${VERMELHO}✖ [${codigo}] argumentos${NORMAL}`);
  console.error(`    ${mensagem}`);
  console.error("");
  process.exit(2);
}

// Flag desconhecida era **ignorada em silêncio**: `--rascunhos` escrito errado
// conferiria o conteúdo publicado e devolveria verde, e o autor leria esse
// verde como aprovação do rascunho. Errar o nome agora custa exit 2.
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (!token.startsWith("--")) {
    morrer("ARGUMENTO_SOLTO", `"${token}" não é flag nem opção — o gate só aceita --flag e --opção valor`);
  }
  const nome = token.slice(2);
  if ((OPCOES as readonly string[]).includes(nome)) {
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) {
      morrer("OPCAO_SEM_VALOR", `a opção --${nome} pede um valor`);
    }
    i += 1;
    continue;
  }
  if (!(FLAGS as readonly string[]).includes(nome)) {
    const conhecidas = [...FLAGS.map((f) => `--${f}`), ...OPCOES.map((o) => `--${o} <valor>`)];
    morrer("FLAG_DESCONHECIDA", `"--${nome}" não existe — as que existem: ${conhecidas.join(", ")}`);
  }
}

const contentDir = path.resolve(option("content", "content"));
const allowNetwork = flag("refresh-cache");
const writeBack = flag("write");
const pruneCache = flag("prune-cache");
/** Modo autor (B8): o que houver em `content/rascunhos/` sobrepõe por id. */
const useRascunhos = flag("rascunhos");
/** Promover os rascunhos julgados a arquivo de verdade, se tudo ficar verde. */
const aplicar = flag("aplicar");

if (aplicar && !useRascunhos) {
  morrer("FLAGS_INCOMPATIVEIS", "--aplicar promove rascunho: sem --rascunhos não há o que promover");
}
if (aplicar && writeBack) {
  morrer(
    "FLAGS_INCOMPATIVEIS",
    "--aplicar e --write juntos julgariam com o juiz enfraquecido — o --write desliga " +
      "WINNING_MOVES_DESATUALIZADO, ALTERNATIVAS_DESATUALIZADAS e RAMO_DESATUALIZADO enquanto grava. " +
      "Regenere numa passada, aplique em outra.",
  );
}
if (aplicar && pruneCache) {
  morrer(
    "FLAGS_INCOMPATIVEIS",
    "--prune-cache não entra em fluxo de autor: cache recém-gravado ainda não tem uso",
  );
}

const positionsDir = path.join(contentDir, "positions");
const lessonsDir = path.join(contentDir, "lessons");
const cacheDir = path.join(contentDir, "tablebase-cache");
const sourcesFile = path.join(contentDir, "sources.json");
const meioJogoFile = path.join(contentDir, "meio-jogo.json");
/**
 * A pasta do modo autor. É **irmã** de `lessons/` e `positions/`, e não filha:
 * dentro delas a varredura recursiva de `lib/lesson/content.ts` levaria
 * rascunho para a home e para a build.
 */
const rascunhosDir = path.join(contentDir, "rascunhos");
const tablebase = new Tablebase(cacheDir, allowNetwork);

/* ------------------------------------------------------------------ *
 * Ferramentas de xadrez
 *
 * `fenProblem` e `pieceCount` moram em `lib/chess/fen.ts` desde o B8.4: o
 * montador de posição do modo autor precisa recusar reis colados **antes** de
 * salvar, e duas cópias da mesma checagem seriam dois juízes com opiniões
 * diferentes sobre o que é uma posição possível.
 * ------------------------------------------------------------------ */

/** Consulta a tablebase e devolve `null` (registrando o erro) quando não dá. */
async function ask(fen: string, where: string): Promise<TbEntry | null> {
  if (pieceCount(fen) > 7) {
    fail("TABLEBASE_FORA_DE_ALCANCE", where, `posição com mais de 7 peças: ${fen}`);
    return null;
  }
  try {
    return await tablebase.lookup(fen);
  } catch (error) {
    const code = error instanceof CacheMissError ? "CACHE_FALTANDO" : "TABLEBASE_FALHOU";
    fail(code, where, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Carga dos arquivos
 * ------------------------------------------------------------------ */

function walkJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkJson(full));
    else if (entry.name.endsWith(".json")) found.push(full);
  }
  return found.sort();
}

function reportZod(where: string, code: string, error: z.ZodError) {
  for (const problem of error.issues) {
    const at = problem.path.length ? problem.path.join(".") : "(raiz)";
    fail(code, where, `${at}: ${problem.message}`);
  }
}

function relative(file: string): string {
  const fromCwd = path.relative(process.cwd(), file).replace(/\\/g, "/");
  // Conteúdo fora do projeto (o teste de mutações usa uma cópia em /tmp) fica
  // ilegível como "../../AppData/..."; nesse caso o caminho sai a partir dele.
  if (fromCwd && !fromCwd.startsWith("..")) return fromCwd;
  return path.relative(contentDir, file).replace(/\\/g, "/") || file.replace(/\\/g, "/");
}

type LoadedLesson = {
  lesson: Lesson;
  /** O arquivo lido — o rascunho, quando há um. É ele que o `--write` regrava. */
  file: string;
  /** Onde este arquivo mora quando promovido. Igual a `file` fora do modo autor. */
  destino: string;
  rascunho: boolean;
  raw: Record<string, unknown>;
};

/* ------------------------------------------------------------------ *
 * Rascunhos — o canal do modo autor (B8)
 * ------------------------------------------------------------------ */

/**
 * `content/rascunhos/` **espelha o destino**, arquivo por arquivo:
 *
 *     content/rascunhos/lessons/N0-Q-MATE.json  →  content/lessons/N0-Q-MATE.json
 *     content/rascunhos/positions/N0/pos-….json →  content/positions/N0/pos-….json
 *
 * É o que torna a promoção uma cópia de bytes — nunca uma re-serialização — e
 * o que permite ao gate julgar exatamente o que vai virar arquivo.
 */
type Rascunho = { origem: string; destino: string };

function rascunhosDe(sub: "lessons" | "positions"): Rascunho[] {
  if (!useRascunhos) return [];
  return walkJson(path.join(rascunhosDir, sub)).map((origem) => ({
    origem,
    destino: path.join(contentDir, path.relative(rascunhosDir, origem)),
  }));
}

const rascunhosDeAula = rascunhosDe("lessons");
const rascunhosDePosicao = rascunhosDe("positions");

// Um .json solto em `content/rascunhos/` — fora de `lessons/` e de `positions/`
// — nunca seria carregado, nunca julgado e nunca promovido. O autor salvaria,
// veria verde, e o trabalho ficaria parado ali. Silêncio vira vermelho.
if (useRascunhos) {
  const mapeados = new Set([...rascunhosDeAula, ...rascunhosDePosicao].map((r) => r.origem));
  for (const file of walkJson(rascunhosDir)) {
    if (mapeados.has(file)) continue;
    fail(
      "RASCUNHO_ORFAO",
      relative(file),
      "rascunho fora de rascunhos/lessons/ e de rascunhos/positions/ — não tem destino, " +
        "então não é julgado nem promovido; mova-o para a pasta que espelha o destino",
    );
  }
}

const positions = new Map<string, Position>();
const lessons: LoadedLesson[] = [];
/** Ids já sobrepostos por rascunho — o segundo rascunho do mesmo id é erro. */
const posicoesDeRascunho = new Set<string>();

for (const { file, rascunho } of [
  ...walkJson(positionsDir).map((file) => ({ file, rascunho: false })),
  ...rascunhosDePosicao.map((r) => ({ file: r.origem, rascunho: true })),
]) {
  const where = relative(file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail("JSON_INVALIDO", where, error instanceof Error ? error.message : String(error));
    continue;
  }
  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) {
    reportZod(where, "SCHEMA_POSICAO", parsed.error);
    continue;
  }
  const expectedName = `${parsed.data.id}.json`;
  if (path.basename(file) !== expectedName) {
    fail("NOME_DE_ARQUIVO", where, `o id é "${parsed.data.id}", o arquivo deveria ser ${expectedName}`);
  }
  // Sobrepor o publicado é a razão de o rascunho existir; sobrepor outro
  // rascunho é o mesmo id em dois arquivos, e continua sendo erro.
  const sobrepoe = rascunho && !posicoesDeRascunho.has(parsed.data.id);
  if (positions.has(parsed.data.id) && !sobrepoe) {
    fail("ID_DUPLICADO", where, `já existe outra posição com o id "${parsed.data.id}"`);
    continue;
  }
  if (rascunho) posicoesDeRascunho.add(parsed.data.id);
  positions.set(parsed.data.id, parsed.data);
}

for (const { file, destino, rascunho } of [
  ...walkJson(lessonsDir).map((file) => ({ file, destino: file, rascunho: false })),
  ...rascunhosDeAula.map((r) => ({ file: r.origem, destino: r.destino, rascunho: true })),
]) {
  const where = relative(file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail("JSON_INVALIDO", where, error instanceof Error ? error.message : String(error));
    continue;
  }
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    reportZod(where, "SCHEMA_AULA", parsed.error);
    continue;
  }
  if (path.basename(file) !== `${parsed.data.id}.json`) {
    fail("NOME_DE_ARQUIVO", where, `o id é "${parsed.data.id}", o arquivo deveria ser ${parsed.data.id}.json`);
  }
  const jaCarregada = lessons.findIndex((l) => l.lesson.id === parsed.data.id);
  if (jaCarregada >= 0) {
    if (!rascunho || lessons[jaCarregada].rascunho) {
      fail("ID_DUPLICADO", where, `já existe outra aula com o id "${parsed.data.id}"`);
      continue;
    }
    lessons.splice(jaCarregada, 1);
  }
  lessons.push({ lesson: parsed.data, file, destino, rascunho, raw: raw as Record<string, unknown> });
}

/* ------------------------------------------------------------------ *
 * Camada 0 — o registro de obras
 * ------------------------------------------------------------------ */

/**
 * As obras registradas, indexadas pelas duas chaves que uma posição pode
 * citar em `provenance.editionFile`: o nome do PDF e o `slug`. Sem registro
 * carregado o gate não tem como ancorar proveniência nem cobrar teto, e por
 * isso a ausência do arquivo é falha, não silêncio.
 */
const sourcesByKey = new Map<string, Source>();

{
  const where = relative(sourcesFile);
  if (!existsSync(sourcesFile)) {
    fail("REGISTRO_DE_OBRAS_AUSENTE", where, "sem content/sources.json não há como conferir proveniência");
  } else {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(sourcesFile, "utf8"));
      const parsed = sourceRegistrySchema.safeParse(raw);
      if (!parsed.success) {
        reportZod(where, "SCHEMA_OBRAS", parsed.error);
      } else {
        for (const source of parsed.data.sources) {
          for (const key of [source.slug, source.file]) {
            if (key === null) continue;
            if (sourcesByKey.has(key)) {
              fail("OBRA_DUPLICADA", where, `a chave "${key}" aparece em duas obras`);
              continue;
            }
            sourcesByKey.set(key, source);
          }
        }
      }
    } catch (error) {
      fail("JSON_INVALIDO", where, error instanceof Error ? error.message : String(error));
    }
  }
}

/* ------------------------------------------------------------------ *
 * Conferência por posição
 * ------------------------------------------------------------------ */

async function checkPosition(position: Position) {
  const where = `posição ${position.id}`;

  const problem = fenProblem(position.fen);
  if (problem) {
    fail("FEN_ILEGAL", where, problem);
    return; // sem posição legal, nada mais faz sentido conferir
  }

  const missing = PROVENANCE_FIELDS.filter((field) => position.provenance[field] === null);
  if (position.status !== "fixture" && missing.length > 0) {
    fail(
      "PROVENIENCIA_INCOMPLETA",
      where,
      `status "${position.status}" exige os 9 campos preenchidos; nulos: ${missing.join(", ")}`,
    );
  }

  // A proveniência tem de apontar obra do registro (§12.2): `editionFile` cita
  // o PDF da biblioteca ou o slug da fonte sem arquivo. Texto livre não passa.
  if (position.status !== "fixture") {
    const key = position.provenance.editionFile;
    if (key !== null && !sourcesByKey.has(key)) {
      fail(
        "OBRA_NAO_REGISTRADA",
        where,
        `provenance.editionFile "${key}" não está em content/sources.json — ` +
          `cite o arquivo ou o slug de uma obra registrada`,
      );
    }
  }

  const entry = await ask(position.fen, where);
  if (!entry) return;

  const real =
    entry.category === "win"
      ? new Chess(position.fen).turn() === "w"
        ? "win-white"
        : "win-black"
      : entry.category === "loss"
        ? new Chess(position.fen).turn() === "w"
          ? "win-black"
          : "win-white"
        : entry.category === "draw"
          ? "draw"
          : null;

  if (real === null) {
    fail("TABLEBASE_INDEFINIDA", where, `a tablebase devolveu "${entry.category}" — resultado não decidido`);
  } else if (real !== position.expectedResult) {
    fail(
      "RESULTADO_ERRADO",
      where,
      `expectedResult diz "${position.expectedResult}", a tablebase diz "${real}"`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * O lance terminal — o que ele declara, e o que a tablebase confirma
 * ------------------------------------------------------------------ */

/**
 * Teto de DTM para um terminal `tablebase-win`, em lances do aluno.
 *
 * Quarenta é o número da regra dos 50 lances com folga: o aluno que sai da
 * posição terminal ainda precisa dar o mate antes de a partida ser declarada
 * empatada. Acima disso, "daqui você ganha" é verdade de tablebase e mentira
 * de tabuleiro.
 */
const TETO_DE_DTM_EM_LANCES = 40;

/** O resultado da posição **visto pelo aluno**, seja de quem for a vez. */
function resultadoParaOAluno(
  entry: TbEntry,
  fen: string,
  orientation: "white" | "black",
): "win" | "draw" | "loss" | "indefinido" {
  const bruto =
    entry.category === "win"
      ? "win"
      : entry.category === "loss"
        ? "loss"
        : entry.category === "draw"
          ? "draw"
          : "indefinido";
  if (bruto === "draw" || bruto === "indefinido") return bruto;
  // A categoria é sempre vista por quem está na vez. Quando não é o aluno, o
  // resultado dele é o contrário.
  const alunoNaVez = new Chess(fen).turn() === (orientation === "white" ? "w" : "b");
  if (alunoNaVez) return bruto;
  return bruto === "win" ? "loss" : "win";
}

/**
 * O lance terminal entrega o que o arquivo diz que ele entrega? (§7.3 do plano)
 *
 * Até a FN1/B2 havia uma resposta só, e implícita: **mate**. Quem escrevesse um
 * expect sem resposta do defensor estava afirmando "aqui acaba em mate", e o
 * gate cobrava exatamente isso. Lucena termina em promoção com a partida bem
 * viva, e Filidor termina num empate segurado — nenhuma das duas cabia.
 *
 * Cada valor de `ends` é uma afirmação diferente, e cada uma é conferida contra
 * a tablebase, nunca aceita como palavra do autor. O código de erro diz **qual**
 * afirmação caiu, e é por isso que são quatro e não um só.
 */
async function checkTerminal(
  where: string,
  goal: TreeGoal,
  ends: TerminalEnd,
  uci: string,
  after: { fen: string; game: Chess },
  orientation: "white" | "black",
) {
  /*
   * Não há aqui nenhuma tabela de "qual `ends` combina com qual `goal`". Cada
   * afirmação é conferida contra o tabuleiro, e a incoerência aparece por ela
   * mesma: um `draw-secured` numa árvore de vitória cai em `TERMINAL_NAO_SEGURA`
   * (a posição é ganha, não empatada) ou já caiu antes em `METODO_NAO_GANHA`.
   * Uma tabela seria um segundo juiz, com opinião própria e sem tablebase.
   */
  if (ends === "mate") {
    if (!after.game.isCheckmate()) {
      fail("TERMINAL_SEM_MATE", where, `"${uci}" encerra o nó sem dar mate`);
    }
    return;
  }

  if (ends === "promotion" && uci.length !== 5) {
    fail(
      "TERMINAL_SEM_PROMOCAO",
      where,
      `"${uci}" é declarado como "promotion" e não promove peça nenhuma — ` +
        `um lance de promoção em UCI tem cinco caracteres (ex.: e7e8q)`,
    );
    return;
  }

  const entry = await ask(after.fen, where);
  if (!entry) return;
  const resultado = resultadoParaOAluno(entry, after.fen, orientation);

  if (ends === "draw-secured") {
    if (resultado !== "draw") {
      fail(
        "TERMINAL_NAO_SEGURA",
        where,
        `"${uci}" é declarado como "draw-secured" e a tablebase dá a posição resultante como ` +
          `"${entry.category}" (para o aluno: ${resultado}) — o empate não está seguro ali`,
      );
    }
    return;
  }

  if (ends === "tablebase-win") {
    if (resultado !== "win") {
      fail(
        "TERMINAL_FORA_DO_OBJETIVO",
        where,
        `"${uci}" é declarado como "tablebase-win" e a posição resultante não é ganha para o ` +
          `aluno (tablebase: "${entry.category}", para o aluno: ${resultado})`,
      );
      return;
    }
    const lances = entry.dtm === null ? null : Math.ceil(Math.abs(entry.dtm) / 2);
    if (lances === null || lances > TETO_DE_DTM_EM_LANCES) {
      fail(
        "TERMINAL_LONGE_DEMAIS",
        where,
        entry.dtm === null
          ? `"${uci}" para numa posição ganha sem DTM na tablebase (a API só dá DTM até 5 peças) — ` +
            `sem régua não há como afirmar que o mate cabe em ${TETO_DE_DTM_EM_LANCES} lances`
          : `"${uci}" para numa posição cujo mate leva ${lances} lances, e o teto é ` +
            `${TETO_DE_DTM_EM_LANCES} — deixar o aluno ali é deixá-lo com a regra dos 50 lances pela frente`,
      );
    }
    return;
  }

  // Sobrou `promotion`: promover é meio caminho, e o outro meio é a posição
  // resultante continuar valendo o objetivo da aula.
  const preserva =
    goal === "win" ? resultado === "win" : resultado === "win" || resultado === "draw";
  if (!preserva) {
    fail(
      "TERMINAL_FORA_DO_OBJETIVO",
      where,
      `"${uci}" promove, mas a posição resultante não entrega o objetivo "${goal}" ` +
        `(tablebase: "${entry.category}", para o aluno: ${resultado})`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Conferência das árvores de lances
 * ------------------------------------------------------------------ */

type TreeOptions = {
  /** Etapa 4 não pode ter dica nem destaque — é o fading do currículo. */
  allowHelp: boolean;
  moveLimit?: number;
};

async function checkTree(lesson: Lesson, stage: string, tree: MoveTree, options: TreeOptions) {
  const where = `${lesson.id} / ${stage}`;
  const start = positions.get(tree.positionId);
  if (!start) return; // a ausência já foi registrada na conferência de referências
  if (fenProblem(start.fen)) return;

  const root = tree.nodes[tree.root];
  if (!root) {
    fail("NO_RAIZ_AUSENTE", where, `o nó raiz "${tree.root}" não existe em nodes`);
    return;
  }
  if (!samePosition(root.fen, start.fen)) {
    fail("FEN_DO_NO", `${where} / ${tree.root}`, `a FEN do nó raiz não é a da posição ${start.id}`);
  }

  // O objetivo da árvore tem de ser o que a tablebase diz da posição da raiz.
  // Prometer empate onde há vitória ensina o aluno a se contentar com menos;
  // prometer vitória onde só há empate o faz perder a tarde tentando ganhar
  // uma posição empatada.
  const esperado = tree.goal === "win" ? `win-${lesson.orientation}` : "draw";
  if (start.expectedResult !== esperado) {
    fail(
      "OBJETIVO_INCOERENTE",
      where,
      `a árvore tem goal "${tree.goal}", que pede uma posição "${esperado}", e ` +
        `"${start.id}" é "${start.expectedResult}"`,
    );
  }

  /**
   * A régua de DTM só serve a **um** caso: árvore de vitória cujas linhas todas
   * acabam em mate. Fora dele o DTM da raiz não mede o que a aula pede — numa
   * árvore de empate ele é 0 e não diz nada, e numa que acaba em promoção ele
   * conta lances que o aluno nunca vai jogar dentro da aula. Nesses casos quem
   * mede é o `LINHA_ESTOURA_TETO`, que conta os lances escritos.
   */
  const soAcabaEmMate = Object.values(tree.nodes).every((node) =>
    node.expects.every((e) => respostasDe(e).length > 0 || (e.ends ?? "mate") === "mate"),
  );
  if (options.moveLimit !== undefined && tree.goal === "win" && soAcabaEmMate) {
    const entry = await ask(start.fen, where);
    if (entry) {
      if (entry.dtm === null) {
        fail("DTM_INDISPONIVEL", where, "a tablebase não deu DTM — impossível conferir o moveLimit");
      } else {
        const studentMoves = Math.ceil(Math.abs(entry.dtm) / 2);
        if (options.moveLimit < studentMoves) {
          fail(
            "TETO_IMPOSSIVEL",
            where,
            `moveLimit ${options.moveLimit} é menor que o DTM da posição (${studentMoves} lances do aluno)`,
          );
        }
      }
    }
  }

  const visited = new Set<string>();
  const queue: string[] = [tree.root];

  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = tree.nodes[nodeId];
    const nodeWhere = `${where} / ${nodeId}`;

    if (!options.allowHelp && (node.hint !== undefined || node.highlights !== undefined)) {
      fail("AJUDA_NA_ETAPA_4", nodeWhere, "a etapa sem ajuda não pode ter hint nem highlights");
    }

    const problem = fenProblem(node.fen);
    if (problem) {
      fail("FEN_ILEGAL", nodeWhere, problem);
      continue;
    }

    // winningMoves: gerado pela tablebase, conferido contra o arquivo.
    const entry = await ask(node.fen, nodeWhere);
    // "winningMoves" manteve o nome e mudou de sentido: são os lances que
    // preservam o **objetivo** da árvore (§7.2 do plano). Numa árvore de
    // vitória a lista é a mesma de sempre.
    const winning = entry ? goalMovesOf(entry, tree.goal) : null;
    if (winning) {
      if (writeBack) {
        node.winningMoves = winning;
      } else if (
        node.winningMoves.length !== winning.length ||
        [...node.winningMoves].sort().some((m, i) => m !== winning[i])
      ) {
        fail(
          "WINNING_MOVES_DESATUALIZADO",
          nodeWhere,
          `a lista do arquivo não bate com a tablebase (arquivo: ${node.winningMoves.length} lances, ` +
            `tablebase: ${winning.length}) — rode com --refresh-cache --write`,
        );
      }
    }
    const winningSet = new Set(winning ?? node.winningMoves);

    const expectedMoves = new Set<string>();
    for (const expect of node.expects) {
      /**
       * As variantes do defensor deste expect, normalizadas (B9/E1): uma só
       * quando o arquivo escreve `reply`+`next`, duas a quatro quando escreve
       * `replies`, nenhuma quando o lance dá mate. O laço abaixo confere cada
       * uma pelas mesmas quatro regras — legalidade, resistência, nó existente
       * e FEN derivada —, e é isso que impede a segunda variante de entrar sem
       * ser julgada.
       */
      const respostas = respostasDe(expect);

      // Duas variantes com o mesmo lance de defesa não são redundância
      // inofensiva: a escolha do defensor é por índice, e a segunda entrada
      // nunca seria jogada — um nó inteiro ficaria órfão sem que ninguém
      // percebesse.
      const lancesDeDefesa = new Set<string>();
      for (const { reply } of respostas) {
        if (lancesDeDefesa.has(reply)) {
          fail(
            "RESPOSTA_DUPLICADA",
            nodeWhere,
            `a resposta "${reply}" aparece duas vezes em replies de "${expect.moves[0]}" — ` +
              `o defensor escolhe uma variante, e a segunda com o mesmo lance nunca seria jogada`,
          );
        }
        lancesDeDefesa.add(reply);
      }

      for (const move of expect.moves) {
        expectedMoves.add(move);

        const afterMove = applyUci(node.fen, move);
        if (!afterMove) {
          fail("LANCE_ILEGAL", nodeWhere, `o lance esperado "${move}" não é legal nesta posição`);
          continue;
        }
        if (winning && !winningSet.has(move)) {
          fail(
            "METODO_NAO_GANHA",
            nodeWhere,
            `"${move}" está em expects mas não preserva ` +
              `${tree.goal === "win" ? "a vitória" : "o empate"} (não está em winningMoves)`,
          );
        }

        if (respostas.length === 0) {
          await checkTerminal(
            nodeWhere,
            tree.goal,
            expect.ends ?? "mate",
            move,
            afterMove,
            lesson.orientation,
          );
          continue;
        }

        if (afterMove.game.isGameOver()) {
          fail(
            "PARTIDA_ENCERRADA",
            nodeWhere,
            `"${move}" encerra a partida, mas o nó aponta para ` +
              `${respostas.map((r) => `"${r.next}"`).join(", ")}`,
          );
          continue;
        }

        // Uma pergunta de tablebase por lance do aluno, e não por variante: as
        // variantes partem todas da mesma posição, e o cache é por FEN.
        const afterMoveEntry = await ask(afterMove.fen, nodeWhere);

        for (const { reply, next } of respostas) {
          const afterReply = applyUci(afterMove.fen, reply);
          if (!afterReply) {
            fail(
              "RESPOSTA_ILEGAL",
              nodeWhere,
              `a resposta "${reply}" não é legal depois de "${move}"`,
            );
            continue;
          }

          // Defensor resistente: não pode encurtar o mate em mais de 2 plies
          // em relação à melhor defesa da tablebase. Vale para **cada**
          // variante: uma segunda defesa fraca seria um caminho fácil escondido
          // atrás de uma primeira boa.
          if (afterMoveEntry) {
            const options_ = afterMoveEntry.moves
              .map((m) => ({ uci: m.uci, plies: m.checkmate ? 0 : m.dtm === null ? null : Math.abs(m.dtm) }))
              .filter((m): m is { uci: string; plies: number } => m.plies !== null);
            const chosen = options_.find((m) => m.uci === reply);
            const best = options_.reduce((acc, m) => Math.max(acc, m.plies), -1);
            if (chosen && best >= 0 && best - chosen.plies > 2) {
              fail(
                "DEFENSOR_FROUXO",
                nodeWhere,
                `a resposta "${reply}" leva ao mate em ${chosen.plies} plies; a melhor defesa aguenta ` +
                  `${best} — diferença de ${best - chosen.plies}, o teto é 2`,
              );
            }
          }

          const target = tree.nodes[next];
          if (!target) {
            fail("NO_AUSENTE", nodeWhere, `o nó "${next}" não existe em nodes`);
            continue;
          }
          if (!samePosition(target.fen, afterReply.fen)) {
            fail(
              "FEN_DO_NO",
              `${where} / ${next}`,
              `a FEN gravada não bate com a derivada de ${nodeId} (${move} ${reply}): ` +
                `esperada "${afterReply.fen}"`,
            );
          }
          queue.push(next);
        }
      }
    }

    for (const mistake of node.mistakes ?? []) {
      const declared = lesson.errors[mistake.errorId];
      if (!declared) {
        fail("ERRO_NAO_DECLARADO", nodeWhere, `errorId "${mistake.errorId}" não existe em errors`);
        continue;
      }
      for (const move of mistake.moves) {
        if (!applyUci(node.fen, move)) {
          fail("LANCE_ILEGAL", nodeWhere, `o erro "${move}" não é um lance legal nesta posição`);
          continue;
        }
        if (expectedMoves.has(move)) {
          fail("ERRO_E_METODO", nodeWhere, `"${move}" está ao mesmo tempo em expects e em mistakes`);
        }
        if (!winning) continue;
        const preservesWin = winningSet.has(move);
        if (declared.verdict === "off-method" && !preservesWin) {
          fail(
            "VEREDITO_ERRADO",
            nodeWhere,
            `"${move}" é anunciado como off-method ("ainda ganha"), mas joga a vitória fora`,
          );
        }
        if (declared.verdict === "loses-win" && preservesWin) {
          fail(
            "VEREDITO_ERRADO",
            nodeWhere,
            `"${move}" é anunciado como loses-win, mas ainda ganha — o texto mentiria para o aluno`,
          );
        }
      }
    }

    /* -------------------------------------------------------------- *
     * Os lances que a autoria declara válidos (B8.2)
     *
     * A divisão de poder é esta: **o autor manda na técnica, a tablebase
     * manda no que ganha**. Nenhum lance entra como válido sem que a
     * tablebase confirme que ele preserva a vitória, e nenhum lance pode
     * estar em duas listas ao mesmo tempo — aceitar um lance que hoje é erro
     * é *mover* de uma lista para a outra, nunca escrever nas duas.
     * -------------------------------------------------------------- */
    const erros = new Set((node.mistakes ?? []).flatMap((m) => m.moves));
    const declaradas = new Set<string>();
    for (const alternativa of node.authorAlternatives ?? []) {
      for (const move of alternativa.moves) {
        if (!applyUci(node.fen, move)) {
          fail("LANCE_ILEGAL", nodeWhere, `o lance declarado válido "${move}" não é legal nesta posição`);
          continue;
        }
        if (declaradas.has(move)) {
          fail(
            "ALTERNATIVA_DUPLICADA",
            nodeWhere,
            `"${move}" aparece em duas entradas de authorAlternatives — dois textos para o mesmo lance`,
          );
        }
        declaradas.add(move);

        if (expectedMoves.has(move)) {
          fail(
            "ALTERNATIVA_E_METODO",
            nodeWhere,
            `"${move}" está ao mesmo tempo em expects e em authorAlternatives — ou é o lance do ` +
              `roteiro (a aula avança) ou é alternativa (a peça volta), nunca os dois`,
          );
        }
        if (erros.has(move)) {
          fail(
            "ALTERNATIVA_E_ERRO",
            nodeWhere,
            `"${move}" está ao mesmo tempo em mistakes e em authorAlternatives — aceitar um lance ` +
              `que era erro é movê-lo de uma lista para a outra, não escrever nas duas`,
          );
        }
        if (winning && !winningSet.has(move)) {
          fail(
            "ALTERNATIVA_NAO_GANHA",
            nodeWhere,
            `"${move}" é declarado válido mas joga a vitória fora (não está em winningMoves) — ` +
              `você manda na técnica, a tablebase manda no resultado`,
          );
        }
      }
    }
  }

  for (const nodeId of Object.keys(tree.nodes)) {
    if (!visited.has(nodeId)) {
      fail("NO_ORFAO", `${where} / ${nodeId}`, "nó inalcançável a partir da raiz por lances legais");
    }
  }
}

/* ------------------------------------------------------------------ *
 * Ramos equivalentes — geração na autoria, conferência offline
 * ------------------------------------------------------------------ */

/**
 * O ramo gerado é derivado, não escrito: o mesmo contrato do `winningMoves`.
 * Com `--write` ele é regravado; sem `--write` o validador recomputa e compara.
 * A regeneração começa sempre da árvore autoral, então é idempotente.
 */

type RawNode = { expects?: Array<Record<string, unknown>>; [key: string]: unknown };
type RawTree = { nodes?: Record<string, RawNode> };

const EMPTY_BRANCHES: GeneratedTree = { expects: new Map(), nodes: new Map() };

/** A posição é KRK/KQK? Fora disso o gerador recusa em vez de gerar lixo. */
function inScope(tree: MoveTree): boolean {
  const root = tree.nodes[tree.root];
  if (!root) return false;
  try {
    techniqueScope(root.fen);
    return true;
  } catch (error) {
    if (error instanceof OutOfScopeError) return false;
    throw error;
  }
}

/**
 * Apaga tudo que o gerador escreveu, para a regeneração começar sempre da
 * árvore autoral — é o que a torna idempotente.
 *
 * **Não encosta em `authorAlternatives`** (B8.2), e isso é a linha inteira da
 * decisão: aquele campo é do autor, não do gerador. Se ele fosse apagado aqui,
 * o primeiro `--write` depois de uma declaração a levaria embora em silêncio,
 * e o autor descobriria pelo aluno.
 */
function stripGeneratedFrom(tree: MoveTree, raw: RawTree | undefined) {
  for (const id of Object.keys(tree.nodes)) {
    if (GENERATED_ID.test(id)) {
      delete tree.nodes[id];
      if (raw?.nodes) delete raw.nodes[id];
      continue;
    }
    const node = tree.nodes[id];
    node.expects = authorialExpects(node);
    delete node.methodAlternatives;

    const rawNode = raw?.nodes?.[id];
    if (!rawNode) continue;
    if (Array.isArray(rawNode.expects)) {
      rawNode.expects = rawNode.expects.filter((expect) => expect.generated !== true);
    }
    delete rawNode.methodAlternatives;
  }
}

function writeBranches(tree: MoveTree, raw: RawTree | undefined, generated: GeneratedTree) {
  stripGeneratedFrom(tree, raw);
  for (const [id, list] of generated.expects) {
    tree.nodes[id]?.expects.push(...list);
    const rawNode = raw?.nodes?.[id];
    if (rawNode && Array.isArray(rawNode.expects)) {
      rawNode.expects.push(...(structuredClone(list) as Array<Record<string, unknown>>));
    }
  }
  for (const [id, node] of generated.nodes) {
    tree.nodes[id] = node;
    if (raw?.nodes) raw.nodes[id] = structuredClone(node) as unknown as RawNode;
  }
}

function writeAlternatives(
  tree: MoveTree,
  raw: RawTree | undefined,
  alternatives: Map<string, string[]>,
) {
  stripGeneratedFrom(tree, raw);
  for (const [id, list] of alternatives) {
    const node = tree.nodes[id];
    if (node) node.methodAlternatives = [...list];
    const rawNode = raw?.nodes?.[id];
    if (rawNode) rawNode.methodAlternatives = [...list];
  }
}

async function generateFor(loaded: LoadedLesson) {
  const { lesson } = loaded;
  const rawStages = (loaded.raw as { stages?: Record<string, RawTree> }).stages ?? {};
  const ask2 = (fen: string, at: string) => ask(fen, at);

  // Teto da autoria: o schema deixa 8 expects por nó, mas 4 deles no máximo
  // podem ter sido escritos por gente — o resto é do gerador.
  for (const stageName of ["guided", "solo"] as const) {
    const tree = lesson.stages[stageName];
    if (!tree) continue;
    for (const [id, node] of Object.entries(tree.nodes)) {
      if (authorialExpects(node).length > 4) {
        fail(
          "EXPECTS_AUTORAIS_DEMAIS",
          `aula ${lesson.id} / ${stageName} / ${id}`,
          `${authorialExpects(node).length} expects escritos à mão; o teto da autoria é 4`,
        );
      }
    }
  }

  /* Etapa 3 — só a lista de alternativas, sem ramo. */
  const guided = lesson.stages.guided;
  if (guided) {
    const where = `aula ${lesson.id} / guided`;
    for (const id of Object.keys(guided.nodes)) {
      if (GENERATED_ID.test(id)) {
        fail("ID_RESERVADO", `${where} / ${id}`, `"g<número>" é reservado ao gerador de ramos`);
      }
    }

    const derived = inScope(guided) ? await generateAlternatives(guided, ask2, where) : new Map();
    if (writeBack) {
      writeAlternatives(guided, rawStages.guided, derived);
    } else {
      const problem = alternativesDiffer(guided, derived);
      if (problem) {
        fail(
          "ALTERNATIVAS_DESATUALIZADAS",
          where,
          `${problem} — rode \`npm run validate:content -- --refresh-cache --write\``,
        );
      }
    }
  }

  /* Etapa 4 — os ramos de verdade. */
  const solo = lesson.stages.solo;
  if (!solo) return;
  const where = `aula ${lesson.id} / solo`;

  // `methodAlternatives` continua proibido na etapa 4: lá o equivalente da
  // máquina vira ramo de verdade. O `authorAlternatives` é **permitido** —
  // ver a divergência declarada na §9.4 do plano da fase: elogiar um lance que
  // ganha não é ajuda antes do lance, é veredito honesto depois dele.
  for (const [id, node] of Object.entries(solo.nodes)) {
    if (node.methodAlternatives) {
      fail(
        "ALTERNATIVA_NO_SOLO",
        `${where} / ${id}`,
        "methodAlternatives é da etapa 3; na etapa 4 o equivalente vira ramo, não elogio",
      );
    }
  }

  let generated = EMPTY_BRANCHES;
  if (inScope(solo)) {
    // Saber se haveria ramo é barato e não depende dos textos — por isso a
    // conferência dos templates vem antes de gerar.
    const candidates = await generateAlternatives(solo, ask2, where);
    if (candidates.size > 0 && !lesson.generatedTemplates) {
      fail(
        "TEMPLATE_FALTANDO",
        where,
        `${candidates.size} nó(s) têm lance equivalente, mas a aula não tem generatedTemplates — ` +
          `sem os textos o ramo gerado ficaria mudo`,
      );
    } else if (lesson.generatedTemplates) {
      try {
        generated = await generateBranches(solo, lesson.generatedTemplates, ask2, where);
      } catch (error) {
        if (error instanceof GeneratorError) {
          fail(error.code, where, error.message);
          return;
        }
        if (error instanceof OutOfScopeError) {
          fail("GERADOR_FORA_DE_ESCOPO", where, error.message);
          return;
        }
        throw error;
      }
    }
  }

  if (writeBack) {
    writeBranches(solo, rawStages.solo, generated);
  } else {
    const problem = branchesDiffer(solo, generated);
    if (problem) {
      fail(
        "RAMO_DESATUALIZADO",
        where,
        `${problem} — rode \`npm run validate:content -- --refresh-cache --write\``,
      );
    }
  }

  // Por caminho, não por nó: com transposição, contar nós engana.
  const longest = longestLine(solo);
  if (longest === "ciclo") {
    fail("LINHA_ESTOURA_TETO", where, "há um ciclo na árvore — alguma linha nunca termina");
  } else if (longest > solo.moveLimit) {
    fail(
      "LINHA_ESTOURA_TETO",
      where,
      `a linha mais longa pede ${longest} lances do aluno e o moveLimit é ${solo.moveLimit} — ` +
        `a saída honesta é subir o moveLimit da aula`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * Conferência por aula
 * ------------------------------------------------------------------ */

function referencedPositionIds(lesson: Lesson): Array<{ id: string; stage: string }> {
  const refs: Array<{ id: string; stage: string }> = [];
  const s = lesson.stages;
  // A etapa 1 não tem posição própria: ela mostra **quadros** das cenas da
  // etapa 2 (§ do schema, `frameRefSchema`). Um quadro é a mesma posição depois
  // de N lances — não é citação nova, e por isso não entra na conta do teto.
  for (const [i, scene] of (s.example?.scenes ?? []).entries()) {
    refs.push({ id: scene.positionId, stage: `example / cena ${i + 1} (${scene.id})` });
  }
  if (s.guided) refs.push({ id: s.guided.positionId, stage: "guided" });
  if (s.solo) refs.push({ id: s.solo.positionId, stage: "solo" });
  if (s.practice) refs.push({ id: s.practice.positionId, stage: "practice" });
  for (const id of s.review?.reviewPositionIds ?? []) refs.push({ id, stage: "review" });
  return refs;
}

async function checkLesson(loaded: LoadedLesson) {
  const { lesson } = loaded;
  const where = `aula ${lesson.id}`;

  const refs = referencedPositionIds(lesson);
  for (const ref of refs) {
    const position = positions.get(ref.id);
    if (!position) {
      fail("POSICAO_INEXISTENTE", `${where} / ${ref.stage}`, `não existe a posição "${ref.id}"`);
      continue;
    }
    if (lesson.status === "published" && position.status !== "approved") {
      fail(
        "POSICAO_NAO_PUBLICAVEL",
        `${where} / ${ref.stage}`,
        `aula publicada referencia a posição "${ref.id}", de status "${position.status}" — ` +
          `só "approved" chega ao aluno`,
      );
    }
  }

  // §12.7: obra protegida contribui no máximo PROTECTED_SOURCE_CAP posições
  // para a mesma aula. O que a lei protege é a *coleção* do autor, não a
  // posição isolada — e é copiando sequência de uma obra só que se copia a
  // coleção. Domínio público e CC0 não têm teto.
  const bySource = new Map<string, { source: Source; ids: Set<string> }>();
  for (const id of new Set(refs.map((r) => r.id))) {
    const position = positions.get(id);
    if (!position || position.status === "fixture") continue;
    const key = position.provenance.editionFile;
    const source = key === null ? undefined : sourcesByKey.get(key);
    if (!source) continue; // já reportado como OBRA_NAO_REGISTRADA
    const bucket = bySource.get(source.slug) ?? { source, ids: new Set<string>() };
    bucket.ids.add(id);
    bySource.set(source.slug, bucket);
  }
  for (const { source, ids } of bySource.values()) {
    if (source.protected && ids.size > PROTECTED_SOURCE_CAP) {
      fail(
        "TETO_DE_CITACAO",
        where,
        `${ids.size} posições saem de "${source.title}", obra protegida, e o teto da §12.7 é ` +
          `${PROTECTED_SOURCE_CAP} por aula — misture fontes (${[...ids].sort().join(", ")})`,
      );
    }
  }

  // Etapa 4 e etapa 6 pedem posições que o aluno não viu no ensino (§6, §2.3).
  const teaching = new Set(
    refs.filter((r) => r.stage.startsWith("example") || r.stage === "guided").map((r) => r.id),
  );
  for (const ref of refs.filter((r) => r.stage === "solo" || r.stage === "review")) {
    if (teaching.has(ref.id)) {
      fail(
        "POSICAO_REAPROVEITADA",
        `${where} / ${ref.stage}`,
        `"${ref.id}" já é usada no ensino; a etapa ${ref.stage} exige posição nova`,
      );
    }
  }

  // Etapa 2: cada cena precisa ser jogável do início ao fim, e cada cena de
  // vitória precisa **terminar em mate** na tela.
  const example = lesson.stages.example;
  if (example) {
    for (const scene of example.scenes) {
      const start = positions.get(scene.positionId);
      if (!start || fenProblem(start.fen)) continue;
      const sceneWhere = `${where} / example / cena "${scene.id}"`;
      /**
       * O que a cena mostra: a vitória do aluno, o empate que ele segura, ou
       * nada disso — uma cena que sai de posição perdida existe (mostrar o erro
       * do outro lado), e sobre ela o gate não tem o que cobrar.
       */
      const objetivo: TreeGoal | null =
        start.expectedResult === `win-${lesson.orientation}`
          ? "win"
          : start.expectedResult === "draw"
            ? "draw"
            : null;
      const ganha = objetivo === "win";

      let fen = start.fen;
      let ultimo: { fen: string; game: Chess } | null = null;
      let quebrou = false;
      for (const [index, step] of scene.steps.entries()) {
        const stepWhere = `${sceneWhere} / lance ${index + 1} (${step.move})`;
        const beforeTurn = new Chess(fen).turn();
        const isStudentSide = beforeTurn === (lesson.orientation === "white" ? "w" : "b");
        if (isStudentSide && objetivo) {
          const entry = await ask(fen, stepWhere);
          if (entry && !goalMovesOf(entry, objetivo).includes(step.move)) {
            fail(
              "EXEMPLO_NAO_GANHA",
              stepWhere,
              objetivo === "win"
                ? "o lance mostrado como técnica joga a vitória fora"
                : "o lance mostrado como técnica joga o empate fora",
            );
          }
        }
        const applied = applyUci(fen, step.move);
        if (!applied) {
          fail("EXEMPLO_ILEGAL", stepWhere, "lance ilegal — a linha da etapa 2 não é jogável");
          quebrou = true;
          break;
        }
        fen = applied.fen;
        ultimo = applied;

        // A caixa desenhada é geometria de KRK/KQK. Uma cena que a peça e
        // passe por posição fora de escopo mostraria um retângulo em alguns
        // lances e nada em outros, sem o aluno entender por quê — e o defeito
        // só apareceria na tela.
        if (scene.showBox) {
          try {
            techniqueScope(fen);
          } catch (error) {
            if (error instanceof OutOfScopeError) {
              fail(
                "CAIXA_FORA_DE_ESCOPO",
                stepWhere,
                `a cena pede showBox e esta posição não tem caixa definida: ${error.message}`,
              );
            } else throw error;
          }
        }
      }

      /**
       * O currículo pede que o iniciante veja a técnica **acabar**. Uma cena de
       * vitória que para dois lances antes do mate ensina o meio do caminho.
       *
       * A cena que não declara `ends` cai no que o gate sempre cobrou — mate,
       * e só quando a posição é ganha pelo aluno. Declarar `ends` liga o mesmo
       * juiz do lance terminal da árvore, e aí a cena de empate também precisa
       * mostrar o fim: o quadro em que a posição está segura.
       */
      const fim = scene.ends ?? (ganha ? "mate" : null);
      if (!quebrou && ultimo && fim === "mate" && !ultimo.game.isCheckmate()) {
        fail(
          "EXEMPLO_SEM_MATE",
          sceneWhere,
          "a cena sai de posição ganha e não termina em mate — o exemplo tem de mostrar o fim",
        );
      } else if (!quebrou && ultimo && fim && fim !== "mate") {
        await checkTerminal(
          sceneWhere,
          objetivo ?? "win",
          fim,
          scene.steps[scene.steps.length - 1].move,
          ultimo,
          lesson.orientation,
        );
      }

      // Fase que começa depois do último lance nunca aparece na tela.
      for (const [i, phase] of (scene.phases ?? []).entries()) {
        if (phase.fromStep > scene.steps.length) {
          fail(
            "FASE_INVALIDA",
            sceneWhere,
            `a fase ${i + 1} ("${phase.title}") começa no lance ${phase.fromStep} e a cena tem ` +
              `${scene.steps.length}`,
          );
        }
      }
    }
  }

  // Etapa 1: os quadros citados têm de existir, e a obra tem de ser um dos
  // livros-base didáticos — a decisão editorial de 2026-08-19, que tirou o
  // objetivo e o exemplo da biblioteca inteira e os prendeu a uma rotação de
  // cinco obras escritas para iniciante.
  const objective = lesson.stages.objective;
  if (objective && example) {
    const quadros = [
      ...(objective.frame ? [{ ref: objective.frame, onde: "frame" }] : []),
      ...objective.rules.flatMap((r, i) =>
        r.frame ? [{ ref: r.frame, onde: `regra ${i + 1} ("${r.title}")` }] : [],
      ),
    ];
    for (const { ref, onde } of quadros) {
      const scene = example.scenes.find((s) => s.id === ref.scene);
      // Cena inexistente já é pega pelo schema; aqui vale o alcance do passo.
      if (scene && ref.step > scene.steps.length) {
        fail(
          "QUADRO_INVALIDO",
          `${where} / objective / ${onde}`,
          `o quadro pede o lance ${ref.step} da cena "${scene.id}", que tem ${scene.steps.length}`,
        );
      }
    }

    // "O exemplo deve mostrar todos os passos do objetivo" — Doug, 2026-08-19,
    // depois de ler a aula. A etapa 1 promete uma técnica em N passos; se a
    // etapa 2 anuncia fases com outros nomes, o aluno vê duas listas parecidas
    // e não sabe que são a mesma. O casamento é por título, exato, porque é o
    // título que aparece nas duas telas.
    const fases = new Set(example.scenes.flatMap((s) => (s.phases ?? []).map((f) => f.title)));
    for (const [i, regra] of objective.rules.entries()) {
      if (!fases.has(regra.title)) {
        fail(
          "REGRA_SEM_FASE",
          `${where} / objective / regra ${i + 1}`,
          `"${regra.title}" não aparece como fase de nenhuma cena do exemplo — ` +
            `o objetivo promete um passo que o exemplo não mostra ` +
            `(fases existentes: ${[...fases].join(" · ") || "nenhuma"})`,
        );
      }
    }

    const base = sourcesByKey.get(objective.source);
    if (!base) {
      fail(
        "FONTE_NAO_DIDATICA",
        `${where} / objective`,
        `"${objective.source}" não está em content/sources.json`,
      );
    } else if (!base.didactic) {
      fail(
        "FONTE_NAO_DIDATICA",
        `${where} / objective`,
        `"${base.title}" não é livro-base didático — o objetivo e o exemplo saem da rotação ` +
          `de obras marcadas com "didactic": true`,
      );
    } else {
      // O livro-base não é um selo decorativo: ao menos uma cena do exemplo tem
      // de sair mesmo dele. Duas cenas de dois livros-base diferentes é o
      // desenho previsto — daí "ao menos uma", e não "a primeira".
      const obras = new Set(
        example.scenes
          .map((s) => positions.get(s.positionId)?.provenance.editionFile)
          .map((key) => (key == null ? undefined : sourcesByKey.get(key)?.slug))
          .filter((slug): slug is string => typeof slug === "string"),
      );
      if (obras.size > 0 && !obras.has(base.slug)) {
        fail(
          "FONTE_DIDATICA_DIVERGE",
          `${where} / objective`,
          `o objetivo declara "${base.slug}" e nenhuma cena do exemplo sai dessa obra ` +
            `(as cenas saem de: ${[...obras].sort().join(", ")})`,
        );
      }
    }
  }

  // A etapa 5 tem o mesmo campo `goal` das árvores desde o começo, e nunca teve
  // quem conferisse: uma prática de objetivo "win" numa posição empatada manda
  // o aluno tentar ganhar o impossível até desistir.
  const practice = lesson.stages.practice;
  const posicaoDaPratica = practice ? positions.get(practice.positionId) : undefined;
  if (practice && posicaoDaPratica) {
    const esperado = practice.goal === "win" ? `win-${lesson.orientation}` : "draw";
    if (posicaoDaPratica.expectedResult !== esperado) {
      fail(
        "OBJETIVO_INCOERENTE",
        `${where} / practice`,
        `a prática tem goal "${practice.goal}", que pede uma posição "${esperado}", e ` +
          `"${posicaoDaPratica.id}" é "${posicaoDaPratica.expectedResult}"`,
      );
    }
  }

  if (lesson.stages.guided) {
    await checkTree(lesson, "guided", lesson.stages.guided, { allowHelp: true });
  }
  if (lesson.stages.solo) {
    const solo = lesson.stages.solo;
    await checkTree(lesson, "solo", solo, { allowHelp: false, moveLimit: solo.moveLimit });
  }
}

/**
 * A rotação dos livros-base, cobrada mecanicamente (§4 de `docs/TRILHA-FINAIS.md`).
 *
 * A regra editorial de 2026-08-19 diz que o objetivo e o exemplo de toda aula
 * saem de uma rotação de obras didáticas, **alternando** entre elas. Alternar
 * não é gentileza: obra protegida cujo método inteiro fosse copiado aula após
 * aula deixaria de ser citação e passaria a ser a coleção do autor — que é
 * exatamente o que a §12.7 evita no varejo, com o teto por aula, e o que esta
 * regra evita no atacado.
 *
 * ## O que mudou na FN1/B2, e por quê
 *
 * A regra antiga era "uma obra protegida é base de no máximo **uma** aula por
 * nível". Ela cabia num corpus de duas aulas e é aritmeticamente impossível no
 * curso desenhado: são cinco livros didáticos para ~12 aulas por classe. A nova:
 *
 * > Nenhuma obra protegida é livro-base de mais de `max(2, floor(N/3))` aulas
 * > **publicadas** de uma mesma classe, onde `N` é o número de aulas publicadas
 * > daquela classe.
 *
 * Duas coisas na fórmula não são enfeite:
 *
 * - **`floor`, e não `ceil`** — `ceil(16/3)` é 6, que já seria 37,5% de uma
 *   classe de 16, e a regra diz "um terço";
 * - **o piso de 2** — as classes abrem em fatias (a classe C começa com quatro
 *   aulas na FN2 e só fecha na FN3). Sem o piso, uma classe recém-aberta com
 *   duas aulas do mesmo autor seria reprovada, e a regra viraria obstáculo à
 *   publicação incremental em vez de regra editorial.
 *
 * E conta **aula publicada**, não aula escrita: a regra é sobre o que chega ao
 * aluno. Rascunho ainda não escolheu classe, e por isso o schema só cobra o
 * campo `class` de quem publica.
 *
 * Domínio público não entra na conta: não há coleção protegida a copiar.
 */
export function tetoDeRotacao(publicadasNaClasse: number): number {
  return Math.max(2, Math.floor(publicadasNaClasse / 3));
}

function checkDidacticRotation() {
  const porClasse = new Map<string, { total: number; porObra: Map<string, string[]> }>();
  for (const { lesson } of lessons) {
    // Rascunho não conta: a regra é sobre o que o aluno vê.
    if (lesson.status !== "published" || !lesson.class) continue;
    const daClasse = porClasse.get(lesson.class) ?? { total: 0, porObra: new Map<string, string[]>() };
    daClasse.total += 1;
    porClasse.set(lesson.class, daClasse);

    const source = lesson.stages.objective?.source;
    if (!source) continue;
    const obra = sourcesByKey.get(source);
    if (!obra?.protected) continue;
    daClasse.porObra.set(obra.slug, [...(daClasse.porObra.get(obra.slug) ?? []), lesson.id]);
  }
  for (const [classe, { total, porObra }] of porClasse) {
    const teto = tetoDeRotacao(total);
    for (const [slug, aulas] of porObra) {
      if (aulas.length > teto) {
        fail(
          "FONTE_DIDATICA_DOMINA",
          `classe ${classe}`,
          `"${slug}" é livro-base de ${aulas.length} das ${total} aulas publicadas da classe ` +
            `(${aulas.sort().join(", ")}) e o teto é ${teto} — max(2, floor(${total}/3))`,
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * O meio-jogo (F2)
 * ------------------------------------------------------------------ */

/**
 * As dicas de meio-jogo passam pelo mesmo gate das aulas de finais — no que
 * cabe.
 *
 * **O que não cabe:** a tablebase. Uma posição de 24 peças não é julgável por
 * ela, e é justamente essa ausência que faz a dica precisar de um juiz próprio.
 * Quem julga a verdade da legenda é `lib/meiojogo/afirmacoes.ts`, e ele é
 * chamado daqui **e** de `lib/meiojogo/dicas.test.ts` — a mesma função, para
 * não haver duas opiniões sobre o que é uma legenda verdadeira.
 *
 * **O que cabe, e é o que este bloco cobra:**
 *
 * - `FEN_ILEGAL` e `AFIRMACAO_FALSA`, pelo verificador;
 * - `OBRA_NAO_REGISTRADA`, a mesma âncora da §12.2 que vale para as posições;
 * - `TETO_DE_CITACAO`, o teto de {@link PROTECTED_SOURCE_CAP} posições por obra
 *   protegida — aqui por **dica**, que é a unidade equivalente à aula.
 *
 * O teto não morde hoje, porque as 30 posições são compostas pela autoria e a
 * obra `posicoes-do-preparatorio` não é protegida. Ele existe para o dia em que
 * uma posição vier do Znosko-Borovsky ou do Lasker — e nesse dia ninguém vai
 * lembrar de escrever a regra.
 */
const dicas: Dica[] = [];

{
  const where = relative(meioJogoFile);
  if (!existsSync(meioJogoFile)) {
    fail("MEIO_JOGO_AUSENTE", where, "o módulo de meio-jogo perdeu o arquivo de conteúdo");
  } else {
    try {
      dicas.push(...validarDicas(JSON.parse(readFileSync(meioJogoFile, "utf8"))));
    } catch (error) {
      fail("SCHEMA_DICA", where, error instanceof Error ? error.message : String(error));
    }
  }

  for (const dica of dicas) {
    const onde = `dica ${dica.id}`;

    for (const [i, posicao] of dica.posicoes.entries()) {
      const naDica = `${onde} / posição ${i + 1}`;
      for (const problema of problemasDaPosicao(posicao)) {
        // A FEN ilegal já vem rotulada pelo verificador, e ela é a causa: as
        // afirmações nem chegam a ser medidas numa posição impossível.
        const codigo = problema.startsWith("FEN ilegal") ? "FEN_ILEGAL" : "AFIRMACAO_FALSA";
        fail(codigo, naDica, problema);
      }

      const chave = posicao.provenance.editionFile;
      if (!sourcesByKey.has(chave)) {
        fail(
          "OBRA_NAO_REGISTRADA",
          naDica,
          `provenance.editionFile "${chave}" não está em content/sources.json — ` +
            `cite o arquivo ou o slug de uma obra registrada`,
        );
      }
    }

    const porObra = new Map<string, { source: Source; quantas: number }>();
    for (const posicao of dica.posicoes) {
      const source = sourcesByKey.get(posicao.provenance.editionFile);
      if (!source) continue; // já reportado como OBRA_NAO_REGISTRADA
      const balde = porObra.get(source.slug) ?? { source, quantas: 0 };
      balde.quantas += 1;
      porObra.set(source.slug, balde);
    }
    for (const { source, quantas } of porObra.values()) {
      if (source.protected && quantas > PROTECTED_SOURCE_CAP) {
        fail(
          "TETO_DE_CITACAO",
          onde,
          `${quantas} posições saem de "${source.title}", obra protegida, e o teto da §12.7 é ` +
            `${PROTECTED_SOURCE_CAP} por dica — misture fontes`,
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Execução
 * ------------------------------------------------------------------ */

// A geração vem primeiro: o que ela produz passa pelas mesmas conferências que
// o resto da árvore — nó gerado é nó comum.
for (const loaded of lessons) {
  await generateFor(loaded);
}
for (const position of positions.values()) {
  await checkPosition(position);
}
for (const loaded of lessons) {
  await checkLesson(loaded);
}
checkDidacticRotation();

if (writeBack) {
  for (const loaded of lessons) {
    // Em modo autor, regenerar derivado não pode sujar aula publicada com um
    // diff que ninguém pediu: o `--write` só encosta no que o autor abriu.
    if (useRascunhos && !loaded.rascunho) continue;
    const stages = (loaded.raw as { stages?: Record<string, unknown> }).stages ?? {};
    for (const stageName of ["guided", "solo"] as const) {
      const parsedStage = loaded.lesson.stages[stageName];
      const rawStage = stages[stageName] as { nodes?: Record<string, { winningMoves?: string[] }> };
      if (!parsedStage || !rawStage?.nodes) continue;
      for (const [nodeId, node] of Object.entries(parsedStage.nodes)) {
        if (rawStage.nodes[nodeId]) rawStage.nodes[nodeId].winningMoves = node.winningMoves;
      }
    }
    writeFileSync(loaded.file, `${JSON.stringify(loaded.raw, null, 2)}\n`, "utf8");
  }
}

const orphanCache = tablebase
  .existingFiles()
  .filter((file) => !tablebase.usedFiles().has(file));

// Só é seguro apagar cache órfão quando a conferência inteira rodou: se alguma
// posição nem chegou a ser consultada, "sem uso" não quer dizer "não serve".
if (pruneCache && issues.length === 0) {
  for (const file of orphanCache) rmSync(path.join(cacheDir, file));
}

/* ------------------------------------------------------------------ *
 * Promoção — só no ramo verde
 * ------------------------------------------------------------------ */

/**
 * Copia os **bytes julgados** para o destino e apaga o rascunho. Bytes, e
 * nunca `JSON.stringify` de novo: o que vira arquivo é exatamente o que
 * passou pelas ~50 regras, sem uma vírgula de diferença.
 */
function promoverRascunhos(): string[] {
  const promovidos: string[] = [];
  for (const { origem, destino } of [...rascunhosDeAula, ...rascunhosDePosicao]) {
    mkdirSync(path.dirname(destino), { recursive: true });
    copyFileSync(origem, destino);
    rmSync(origem);
    promovidos.push(relative(destino));
  }
  // Pasta vazia deixada para trás pareceria rascunho pendente na home.
  const limpar = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) limpar(path.join(dir, entry.name));
    }
    if (readdirSync(dir).length === 0 && dir !== contentDir) rmdirSync(dir);
  };
  limpar(rascunhosDir);
  return promovidos;
}

const promovidos = aplicar && issues.length === 0 ? promoverRascunhos() : [];

console.log("");
console.log(`Conteúdo conferido em ${relative(contentDir)}`);
console.log(
  `  posições: ${positions.size}   aulas: ${lessons.length}   ` +
    `obras: ${new Set(sourcesByKey.values()).size} ` +
    `(${[...new Set(sourcesByKey.values())].filter((s) => s.protected).length} com teto)`,
);
console.log(
  `  meio-jogo: ${dicas.length} dica(s), ` +
    `${dicas.reduce((soma, d) => soma + d.posicoes.length, 0)} posição(ões), ` +
    `${dicas.reduce((soma, d) => soma + d.posicoes.reduce((n, p) => n + p.afirma.length, 0), 0)} afirmação(ões) medida(s)`,
);
console.log(
  `  tablebase: ${tablebase.usedFiles().size} posições consultadas ` +
    `(${tablebase.hits} do cache, ${tablebase.fetched} pela rede)`,
);
if (useRascunhos) {
  console.log(
    `  rascunhos: ${rascunhosDeAula.length} aula(s) e ${rascunhosDePosicao.length} posição(ões) ` +
      `sobrepostas a partir de ${relative(rascunhosDir)}`,
  );
}
if (promovidos.length > 0) {
  console.log(`  aplicado: ${promovidos.length} arquivo(s) promovido(s)`);
  for (const file of promovidos) console.log(`    → ${file}`);
}
if (orphanCache.length > 0) {
  console.log(
    pruneCache && issues.length === 0
      ? `  cache: ${orphanCache.length} arquivo(s) sem uso — removidos`
      : `  cache: ${orphanCache.length} arquivo(s) sem uso — rode com --prune-cache para remover`,
  );
}
console.log("");

if (issues.length === 0) {
  console.log(
    `${VERDE}✔ tudo verde — ${positions.size} posições, ${lessons.length} aula(s) e ` +
      `${dicas.length} dica(s) de meio-jogo sem nenhum problema${NORMAL}`,
  );
  process.exit(0);
}

for (const issue of issues) {
  console.log(`${VERMELHO}✖ [${issue.code}] ${issue.where}${NORMAL}`);
  console.log(`    ${issue.message}`);
}
console.log("");
console.log(`${VERMELHO}✖ ${issues.length} problema(s) — conteúdo recusado${NORMAL}`);
process.exit(1);
