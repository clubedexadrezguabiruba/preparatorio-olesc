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
// O gerador de RAMOS (`generateBranches`, `branchesDiffer`, `longestLine`,
// `GeneratorError`) deixou de ser importado em 2026-09-08: ele servia à etapa
// 4, que saiu do formato. O módulo continua inteiro e testado em
// `scripts/branches.ts` — ver o bloco "O bloco da etapa 4 saiu inteiro daqui".
import {
  alternativesDiffer,
  authorialExpects,
  generateAlternatives,
  GENERATED_ID,
} from "./branches.ts";
import { derivarTreino, esqueletoDoTreino } from "../lib/lesson/derivar-treino.ts";
import { respostasDe } from "../lib/lesson/tree.ts";
import { validarNotas } from "../lib/repertorio/notas.ts";
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
  let parsed = lessonSchema.safeParse(raw);
  /*
   * **A saída não é entrada.**
   *
   * `stages.guided` é gerado (ver `guidedStageSchema`), e um gerado torto
   * trancava a porta por onde ele se conserta: o arquivo não passava no schema,
   * a aula sumia da carga, e a derivação — a única coisa capaz de reescrever a
   * árvore — nunca chegava a rodar. O autor ficava com um vermelho que manda
   * consertar `roteiro[…].treino` e um `--write` que não consertava nada.
   *
   * O contrato de `guidedStageSchema` diz que a árvore volta byte por byte se
   * for apagada. Isto **é** apagá-la, e só em `--write`, só quando há roteiro de
   * onde derivar, e só depois de a árvore já ter sido recusada: nenhuma árvore
   * válida é jogada fora por este bloco.
   */
  if (!parsed.success && writeBack) {
    const stages = (raw as { stages?: Record<string, unknown> }).stages;
    if (stages?.objective && stages.guided) {
      const semArvore = { ...(raw as object), stages: { ...stages } } as Record<string, unknown>;
      delete (semArvore.stages as Record<string, unknown>).guided;
      const outraVez = lessonSchema.safeParse(semArvore);
      if (outraVez.success) {
        delete stages.guided;
        parsed = outraVez;
      }
    }
  }
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
  // Uma árvore só desde 2026-09-08: a etapa 4 saiu do formato, e com ela os
  // ramos gerados. O laço sobre `["guided", "solo"]` virou o bloco abaixo.
  {
    const tree = lesson.stages.guided;
    for (const [id, node] of Object.entries(tree?.nodes ?? {})) {
      if (authorialExpects(node).length > 4) {
        fail(
          "EXPECTS_AUTORAIS_DEMAIS",
          `aula ${lesson.id} / guided / ${id}`,
          `${authorialExpects(node).length} expects escritos à mão; o teto da autoria é 4`,
        );
      }
    }
  }

  /* A etapa com ajuda — só a lista de alternativas, sem ramo. */
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

  /*
   * **O bloco da etapa 4 saiu inteiro daqui, e com ele o gerador de ramos.**
   *
   * Ele cobria: `ALTERNATIVA_NO_SOLO` (methodAlternatives era proibido lá),
   * `TEMPLATE_FALTANDO`, a geração dos ramos derivados e o `LINHA_ESTOURA_TETO`
   * contra o `moveLimit`. Nenhuma dessas perguntas existe mais: a etapa sem
   * ajuda deixou de ser uma árvore roteirizada e passou a ser partida contra o
   * Stockfish, que não tem nó, nem ramo, nem teto de lances escrito à mão — o
   * limite dela é o de falta de progresso, e quem o aplica é o `PracticeStage`.
   *
   * O gerador de ramos continua em `lib/lesson/` e continua testado. Ele não é
   * chamado por nenhuma aula hoje, e isso está declarado: é a peça mais cara
   * que a mudança de formato deixou parada, e apagá-la seria jogar fora um mês
   * de trabalho por uma decisão de produto que pode voltar atrás.
   */
}

/* ------------------------------------------------------------------ *
 * A etapa 3, derivada da etapa 2
 *
 * O mesmo contrato do `winningMoves` e das alternativas, um andar acima: com
 * `--write` a árvore é regravada a partir do roteiro; sem `--write` ela é
 * derivada de novo e comparada com o que está no arquivo.
 *
 * **Quem é julgado em cada modo, e por quê.** Sem `--write`, quem passa pelas
 * ~50 regras é a árvore **do arquivo** — é ela que a build lê e que chega ao
 * aluno, e julgar a derivada seria aprovar uma árvore que ninguém vai jogar.
 * Com `--write`, quem passa é a derivada, porque é ela que vai virar arquivo
 * naquela mesma rodada.
 *
 * **Aula com `guided` e sem `objective` não é derivada.** Sem roteiro não há de
 * onde derivar, e inventar um erro para esse caso seria cobrar do autor um
 * campo que o formato não pede. Não existe aula assim no corpus de hoje; no dia
 * em que existir, ela é a exceção declarada de que fala a §5 da trilha.
 * ------------------------------------------------------------------ */

/** A tablebase sem acusar: quem acusa cache faltando é o `checkTree`, uma vez. */
async function perguntarQuieto(fen: string): Promise<TbEntry | null> {
  if (pieceCount(fen) > 7) return null;
  try {
    return await tablebase.lookup(fen);
  } catch {
    return null;
  }
}

async function derivarEtapa3(loaded: LoadedLesson) {
  const { lesson } = loaded;
  const objective = lesson.stages.objective;
  if (!objective) return;
  const posicao = positions.get(objective.positionId);
  if (!posicao || fenProblem(posicao.fen)) return;

  const where = `aula ${lesson.id} / treino`;

  // Primeira passada, a seco: ela não precisa da tablebase para saber a linha,
  // e é ela que diz QUAIS posições perguntar.
  const seco = derivarTreino(lesson, posicao, () => null);
  for (const problema of seco.problemas) {
    const onde = problema.passo === null ? where : `${where} / roteiro[${problema.passo}]`;
    fail(problema.code, onde, problema.message);
  }
  if (!seco.tree) return;

  const lances = new Map<string, string[]>();
  for (const node of Object.values(seco.tree.nodes)) {
    const entry = await perguntarQuieto(node.fen);
    if (entry) lances.set(node.fen, goalMovesOf(entry, seco.tree.goal));
  }
  const { tree } = derivarTreino(lesson, posicao, (fen) => lances.get(fen) ?? null);
  if (!tree) return;

  if (!writeBack) {
    const doArquivo = lesson.stages.guided;
    const igual =
      doArquivo !== undefined &&
      JSON.stringify(esqueletoDoTreino(doArquivo)) === JSON.stringify(esqueletoDoTreino(tree));
    if (!igual) {
      fail(
        "TREINO_DESATUALIZADO",
        where,
        (doArquivo === undefined
          ? "o roteiro da aula produz uma etapa 3 e o arquivo não tem nenhuma"
          : "a etapa 3 do arquivo não é a que o roteiro da aula produz") +
          " — rode `npm run validate:content -- --refresh-cache --write` e leia o diff",
      );
    }
    return;
  }

  lesson.stages.guided = tree;
  const rawStages = ((loaded.raw as { stages?: Record<string, unknown> }).stages ??= {});
  // A ordem é reconstruída, e não remendada: a N0-LADDER não tem `guided` hoje,
  // e escrever a chave nova no fim deixaria a etapa 3 depois da prática para
  // sempre — num arquivo que se lê de cima para baixo como a aula acontece.
  const reordenado: Record<string, unknown> = {};
  for (const chave of ["intro", "objective", "guided", "practice"]) {
    if (chave === "guided") {
      reordenado.guided = JSON.parse(JSON.stringify(tree));
      continue;
    }
    if (chave in rawStages) reordenado[chave] = rawStages[chave];
  }
  (loaded.raw as { stages: unknown }).stages = reordenado;
}

/* ------------------------------------------------------------------ *
 * Conferência por aula
 * ------------------------------------------------------------------ */

function referencedPositionIds(lesson: Lesson): Array<{ id: string; stage: string }> {
  const refs: Array<{ id: string; stage: string }> = [];
  const s = lesson.stages;
  // As três etapas apontam o MESMO id — o `lessonSchema` recusa o arquivo em
  // que não apontarem. A lista repete o id de propósito: quem conta o teto de
  // citação (§12.7) quer saber quantas **etapas** citam a obra, e a
  // deduplicação é feita lá, por id, uma vez só.
  if (s.objective) refs.push({ id: s.objective.positionId, stage: "objective" });
  if (s.guided) refs.push({ id: s.guided.positionId, stage: "guided" });
  if (s.practice) refs.push({ id: s.practice.positionId, stage: "practice" });
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
  //
  // **ESTA REGRA ESTÁ DORMENTE DESDE 2026-09-08, e é de propósito.** O teto é
  // por aula, e no formato de três etapas uma aula é uma posição só — o
  // `lessonSchema` recusa quem não apontar o mesmo id nas três, e o `Set`
  // abaixo desduplica. `ids.size` é sempre 1, e 1 nunca passa de 2: o `fail`
  // não tem como disparar, e é por isso que não há mutação plantada para o
  // código `TETO_DE_CITACAO` — não há o que plantar. O bloco fica porque volta
  // a ter sujeito no dia em que algum formato usar mais de uma posição na
  // mesma aula; enquanto isso, **ele não é o que protege o módulo de finais**.
  // O que protege é o regime integral (§1.1 e §1.2 do docs/SOURCE-CORPUS.md):
  // declaração escrita, prazo cobrado em REGIME_INTEGRAL_VENCIDO e inventário
  // em content/divida-de-licenca.md. O teto por obra no módulo, que devolveria
  // a mordida, foi proposto ao Doug em 2026-09-08 e recusado: "sem teto nenhum".
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
    // Regime integral (§1.1 do SOURCE-CORPUS): a obra foi declarada base
    // integral do módulo, com data e prazo no `sources.json`. O teto sai para
    // ela — e só para ela. Ela continua protegida, e continua no inventário
    // de `content/divida-de-licenca.md`.
    if (source.integral) continue;
    if (source.protected && ids.size > PROTECTED_SOURCE_CAP) {
      fail(
        "TETO_DE_CITACAO",
        where,
        `${ids.size} posições saem de "${source.title}", obra protegida, e o teto da §12.7 é ` +
          `${PROTECTED_SOURCE_CAP} por aula — misture fontes (${[...ids].sort().join(", ")})`,
      );
    }
  }

  /*
   * **`POSICAO_REAPROVEITADA` saiu, e o motivo é que ela virou o contrário.**
   *
   * A regra dizia: as etapas 4 e 6 pedem posições que o aluno não viu no
   * ensino (§6, §2.3). As duas etapas saíram do formato em 2026-09-08, e o
   * formato novo **exige** o oposto — as três etapas são a mesma posição, e é
   * o `lessonSchema` que agora recusa quem não for. Manter a regra escrita
   * aqui, mesmo inerte, deixaria duas frases contrárias no mesmo repositório
   * cobrando coisas opostas da mesma aula.
   */

  /*
   * **O bloco da etapa 2 saiu inteiro daqui.** Ele conferia, por cena: a linha
   * jogável do início ao fim, o `showBox` sobre uma posição com caixa
   * definida, o `ends` do último lance, e as fases dentro do comprimento. Nada
   * disso tem sujeito: não há mais cena.
   *
   * Saíram com ele `QUADRO_INVALIDO` (o quadro citado pelo objetivo tinha de
   * existir na cena) e `REGRA_SEM_FASE` (cada regra do objetivo tinha de
   * aparecer como fase de alguma cena — "o exemplo deve mostrar todos os
   * passos do objetivo", Doug, 2026-08-19). A segunda dói: ela guardava uma
   * coerência de verdade entre o que a aula promete e o que ela mostra. O que
   * a substitui é mais fraco e é o que sobrou de honesto — a regra desenha
   * sobre a posição, e o desenho é conferido pelo schema (casa válida) e pelo
   * olho, na tela. Fica declarado como perda, não como equivalência.
   */

  /* ---------------------------------------------------------------- *
   * A apresentação — a única FEN do curso sem arquivo de posição
   *
   * O diagrama de apresentação é **ilustração**: ninguém joga nele, ele pode ter
   * mais de sete peças de propósito, e por isso não vira `content/positions/` e
   * **não se consulta a tablebase sobre ele**. Perguntar seria pedir a uma
   * máquina que julgasse um desenho.
   *
   * O que sobra de mecânico é o que `fenProblem` já sabe — o mesmo juiz do
   * `checkPosition`, e por isso a mesma função e não uma cópia: rei colado, rei
   * faltando, xeque impossível. Um diagrama assim não é ilustração ousada, é
   * erro de digitação, e ele chegaria à tela do aluno.
   *
   * **O que nenhuma máquina mede fica escrito**: um diagrama de apresentação
   * que venha de um LIVRO deixa de ser ilustração e vira posição, com os 9
   * campos de proveniência. A regra está na §7 de `docs/VOZ-DO-CURSO.md` e na
   * §1.2 de `docs/SOURCE-CORPUS.md`, e quem a cobra é o olho.
   * ---------------------------------------------------------------- */
  const intro = lesson.stages.intro;
  if (intro) {
    const daAula = positions.get(
      lesson.stages.objective?.positionId ?? lesson.stages.practice?.positionId ?? "",
    );
    for (const [i, passo] of intro.passos.entries()) {
      if (passo.fen === undefined) continue;
      const onde = `${where} / intro / passos[${i}]`;
      const problema = fenProblem(passo.fen);
      if (problema) {
        fail("INTRO_FEN_ILEGAL", onde, `o diagrama da apresentação não é uma posição possível: ${problema}`);
        continue;
      }
      if (daAula && samePosition(passo.fen, daAula.fen)) {
        fail(
          "INTRO_FEN_REDUNDANTE",
          onde,
          `o diagrama repete a posição da aula ("${daAula.id}") — isso se diz omitindo o ` +
            "campo `fen`, e escrevê-lo cria uma segunda cópia da mesma FEN para divergir depois",
        );
      }
    }
  }

  // A etapa 2: a obra tem de ser um dos livros-base didáticos — a decisão
  // editorial de 2026-08-19, que tirou o objetivo da biblioteca inteira e o
  // prendeu a uma rotação de cinco obras escritas para iniciante.
  const objective = lesson.stages.objective;
  if (objective) {
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
        `"${base.title}" não é livro-base didático — o objetivo sai da rotação ` +
          `de obras marcadas com "didactic": true`,
      );
    } else {
      // O livro-base não é um selo decorativo: a posição da aula tem de sair
      // mesmo dele. Era "ao menos uma cena", porque havia várias; com uma
      // posição só, a conta é direta.
      const daPosicao = positions.get(objective.positionId)?.provenance.editionFile;
      const obra = daPosicao == null ? undefined : sourcesByKey.get(daPosicao)?.slug;
      if (obra && obra !== base.slug) {
        fail(
          "FONTE_DIDATICA_DIVERGE",
          `${where} / objective`,
          `o objetivo declara "${base.slug}" e a posição da aula sai de "${obra}"`,
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

  // Uma árvore só, e ela é a *com ajuda*. A etapa 4 era a outra chamada aqui.
  if (lesson.stages.guided) {
    await checkTree(lesson, "guided", lesson.stages.guided, { allowHelp: true });
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
    // A obra em regime integral **continua contada aqui**, de propósito: é
    // desta lista que sai o inventário de `content/divida-de-licenca.md`. O
    // que ela não sofre é a reprovação, pulada lá embaixo.
    daClasse.porObra.set(obra.slug, [...(daClasse.porObra.get(obra.slug) ?? []), lesson.id]);
  }
  for (const [classe, { total, porObra }] of porClasse) {
    const teto = tetoDeRotacao(total);
    for (const [slug, aulas] of porObra) {
      // Regime integral (§1.1 do SOURCE-CORPUS): quem decidiu que o módulo
      // inteiro segue este livro decidiu junto que a rotação não se aplica.
      if (sourcesByKey.get(slug)?.integral) continue;
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
 * Regime integral — a exceção que se mede sozinha
 * ------------------------------------------------------------------ */

/** As obras em regime integral, na ordem do slug. */
function obrasIntegrais(): Source[] {
  return [...new Set(sourcesByKey.values())]
    .filter((source) => source.integral)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** O arquivo do inventário. Mora em `content/` — ver o comentário do relatório. */
const dividaFile = path.join(contentDir, "divida-de-licenca.md");

/**
 * Hoje, em YYYY-MM-DD. Sai do relógio de propósito: é o único jeito de o prazo
 * do regime integral vencer sem ninguém precisar lembrar dele.
 */
const hoje = new Date().toISOString().slice(0, 10);

/**
 * O prazo do regime integral, cobrado. Sem isto o `replaceBefore` seria
 * decoração: exceção temporária cuja validade nenhum programa mede é exceção
 * permanente com nota de rodapé.
 */
function checkIntegralRegime() {
  for (const source of obrasIntegrais()) {
    const { since, replaceBefore } = source.integral!;
    if (hoje > replaceBefore) {
      fail(
        "REGIME_INTEGRAL_VENCIDO",
        `obra ${source.slug}`,
        `o regime integral começou em ${since} e valia até ${replaceBefore}; hoje é ${hoje} — ` +
          "renove o prazo por escrito no content/sources.json, ou desfaça o regime e " +
          "troque o conteúdo listado em content/divida-de-licenca.md",
      );
    }
  }
}

/**
 * O inventário da dívida de licença — a lista de troca para o dia em que o
 * curso for comercializado.
 *
 * **Gerado, nunca escrito à mão**, pelo mesmo motivo que os `winningMoves`:
 * lista mantida a mão envelhece calada, e uma lista de troca errada é pior que
 * lista nenhuma. Sem `--write`, divergência é `DIVIDA_DESATUALIZADA` — crescer
 * a dívida vira um diff que alguém aprova.
 *
 * Mora em `content/`, e não em `docs/`, porque o `mutation-check` roda o gate
 * sobre uma **cópia** de `content/` via `--content`: fora de `contentDir` a
 * cópia intacta divergiria do arquivo do repositório e o controle mataria a
 * suíte inteira.
 */
function relatorioDeDivida(): string {
  const linhas: string[] = [
    "# Dívida de licença — obras em regime integral",
    "",
    "<!-- Gerado por `npm run validate:content -- --write`. Não editar à mão: sem",
    "     a flag, qualquer divergência é reprovada como DIVIDA_DESATUALIZADA. -->",
    "",
    "O **regime integral** (§1.1 do `docs/SOURCE-CORPUS.md`) desliga o teto de citação",
    "e o teto de rotação de livro-base para uma obra protegida — a obra continua",
    "protegida, e é por isso que esta lista existe. É a lista de troca: tudo que sai",
    "dessas obras e precisa virar fonte pública no dia em que o curso deixar de ser",
    "gratuito.",
    "",
  ];

  const obras = obrasIntegrais();
  if (obras.length === 0) {
    linhas.push("Nenhuma obra em regime integral hoje.");
    return linhas.join("\n") + "\n";
  }

  for (const source of obras) {
    const integral = source.integral!;
    linhas.push(
      `## ${source.title} — ${source.author}`,
      "",
      `- **slug:** \`${source.slug}\``,
      `- **desde:** ${integral.since}`,
      `- **prazo:** ${integral.replaceBefore}`,
      `- **motivo:** ${integral.reason}`,
      "",
    );

    const aulas = lessons
      .filter(
        ({ lesson }) =>
          lesson.status === "published" &&
          lesson.stages.objective?.source !== undefined &&
          sourcesByKey.get(lesson.stages.objective.source)?.slug === source.slug,
      )
      .map(({ lesson }) => `- \`${lesson.id}\` — classe ${lesson.class ?? "?"}, "${lesson.title}"`)
      .sort();
    linhas.push(`### Aulas com esta obra como livro-base (${aulas.length})`, "");
    linhas.push(...(aulas.length > 0 ? aulas : ["_Nenhuma._"]), "");

    const posicoes = [...positions.values()]
      .filter((position) => {
        if (position.status === "fixture") return false;
        const key = position.provenance.editionFile;
        return key !== null && sourcesByKey.get(key)?.slug === source.slug;
      })
      .map(
        (position) =>
          `- \`${position.id}\` — ${position.provenance.bibliographicSource ?? "sem referência"}`,
      )
      .sort();
    linhas.push(`### Posições que citam esta obra (${posicoes.length})`, "");
    linhas.push(...(posicoes.length > 0 ? posicoes : ["_Nenhuma._"]), "");
  }

  return linhas.join("\n") + "\n";
}

function checkDivida() {
  const esperado = relatorioDeDivida();
  if (writeBack) {
    writeFileSync(dividaFile, esperado, "utf8");
    return;
  }
  const atual = existsSync(dividaFile) ? readFileSync(dividaFile, "utf8") : null;
  if (atual === esperado) return;
  fail(
    "DIVIDA_DESATUALIZADA",
    relative(dividaFile),
    atual === null
      ? "o inventário do regime integral não existe — rode `npm run validate:content -- --write`"
      : "o inventário do regime integral não bate com o conteúdo — rode " +
        "`npm run validate:content -- --write` e leia o diff antes de commitar",
  );
}

/* ------------------------------------------------------------------ *
 * Execução
 * ------------------------------------------------------------------ */

// A derivação vem antes de tudo: a etapa 3 nasce aqui, e a partir daí é árvore
// comum — os ramos equivalentes, os winningMoves e as ~50 regras caem sobre ela
// exatamente como caem sobre uma árvore escrita à mão.
for (const loaded of lessons) {
  await derivarEtapa3(loaded);
}
// A geração vem depois: o que ela produz passa pelas mesmas conferências que
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
checkIntegralRegime();
checkDivida();

/* ------------------------------------------------------------------ *
 * As páginas de princípios do repertório
 *
 * Elas eram conferidas **só pelo build**: `lib/repertorio/conteudo.ts` roda o
 * schema na importação, e quem importa é a página. Um `faca` com seis passos
 * (o teto é cinco) passava batido aqui e derrubava `next build` lá na frente,
 * com a mensagem escondida dentro de um "Failed to collect page data".
 * Aconteceu em 7/9/2026, ao escrever as quatro páginas da poda da §23.
 *
 * Conferir aqui custa uma leitura de arquivo e devolve o erro com o nome do
 * campo, que é o que o autor precisa ler.
 *
 * Chegou da `main` em 8/9/2026, no merge que trouxe o repertório para esta
 * árvore. Lá este bloco morava dentro do bloco do meio-jogo, que aqui não
 * existe mais — a conferência é a mesma, e ficou de pé sozinha.
 * ------------------------------------------------------------------ */
const notas: ReturnType<typeof validarNotas> = [];
{
  const notasFile = path.join(contentDir, "repertorio", "notas.json");
  if (!existsSync(notasFile)) {
    fail("NOTAS_AUSENTES", relative(notasFile), "o repertório perdeu as páginas de princípios");
  } else {
    try {
      notas.push(...validarNotas(JSON.parse(readFileSync(notasFile, "utf8"))));
    } catch (error) {
      fail("SCHEMA_NOTA", relative(notasFile), error instanceof Error ? error.message : String(error));
    }
  }
}

if (writeBack) {
  for (const loaded of lessons) {
    // Em modo autor, regenerar derivado não pode sujar aula publicada com um
    // diff que ninguém pediu: o `--write` só encosta no que o autor abriu.
    if (useRascunhos && !loaded.rascunho) continue;
    const stages = (loaded.raw as { stages?: Record<string, unknown> }).stages ?? {};
    // Uma árvore só desde 2026-09-08; era um laço sobre `["guided", "solo"]`.
    {
      const parsedStage = loaded.lesson.stages.guided;
      const rawStage = stages.guided as { nodes?: Record<string, { winningMoves?: string[] }> };
      if (parsedStage && rawStage?.nodes) {
        for (const [nodeId, node] of Object.entries(parsedStage.nodes)) {
          if (rawStage.nodes[nodeId]) rawStage.nodes[nodeId].winningMoves = node.winningMoves;
        }
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
  `  tablebase: ${tablebase.usedFiles().size} posições consultadas ` +
    `(${tablebase.hits} do cache, ${tablebase.fetched} pela rede)`,
);
// A exceção aparece em **toda** rodada verde, e não só quando alguém procura:
// exceção que só se vê procurando é exceção esquecida.
{
  const integrais = obrasIntegrais();
  if (integrais.length > 0) {
    console.log(
      `  regime integral: ${integrais.length} obra(s) — ` +
        integrais.map((s) => `${s.slug} (até ${s.integral!.replaceBefore})`).join(", "),
    );
  }
}
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
      `${notas.length} página(s) de princípios sem nenhum problema${NORMAL}`,
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
