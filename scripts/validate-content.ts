import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import { Chess } from "chess.js";
import { z } from "zod";
import { applyUci, fenProblem, samePosition } from "../lib/chess/fen.ts";
import {
  lessonSchema,
  MARCA_DE_MOLDE,
  positionSchema,
  PROVENANCE_FIELDS,
  sourceRegistrySchema,
  type Lesson,
  type MoveTree,
  type Position,
  type Source,
  type TerminalEnd,
} from "../lib/lesson/schema.ts";
// O gerador de RAMOS (`generateBranches`, `branchesDiffer`, `longestLine`,
// `GeneratorError`) deixou de ser importado em 2026-09-08: ele servia à etapa
// 4, que saiu do formato. O módulo continua inteiro e testado em
// `scripts/branches.ts` — ver o bloco "O bloco da etapa 4 saiu inteiro daqui".
import { authorialExpects, GENERATED_ID } from "./branches.ts";
import { derivarTreino, esqueletoDoTreino } from "../lib/lesson/derivar-treino.ts";
import {
  aceitaExcecao,
  alvoDoOnde,
  hashDoAlvo,
  julgarComExcecoes,
  type Excecao,
} from "../lib/lesson/excecoes.ts";
import { respostasDe } from "../lib/lesson/tree.ts";
import { falasDaAula } from "../lib/lesson/voz.ts";
import { validarNotas } from "../lib/repertorio/notas.ts";
import { revisoesDaAulaV2, type RevisoesDaAulaV2 } from "../lib/editor-v2/avaliacao.ts";
import { problemasParaPublicarV2 } from "../lib/editor-v2/conferencia.ts";
import { posicoesDoPacoteV2, problemasDoPacoteV2, type PacoteV2 } from "../lib/editor-v2/pacote.ts";
import { idsDeAulasV2, idsDePublicacoesV2, lerPonteiroV2, lerPublicacaoCruaV2 } from "../lib/editor-v2/publicacoes.ts";
import { idsDoRepertorioCompilado } from "../lib/repertorio/ids-compilados.ts";

/**
 * O gate de conteúdo (plano da F1, §3.4).
 *
 * Confere tudo que o motor vai acreditar em runtime: a legalidade das posições e
 * dos lances, a coerência das árvores, o treino derivado e as publicações v2.
 *
 * **Desde 2026-09-15 não consulta tablebase nenhuma** (travas 2 e 3 de
 * `docs/TRILHA-FINAIS.md`): o professor tem a última palavra, e o motor dele no
 * editor é quem confere. Os `winningMoves` e `methodAlternatives` gravados nas
 * aulas v1 ficam **congelados como dado** — nada os recalcula nem os cobra. A
 * procedência (ficha, obra registrada, texto de terceiros) é **aviso**.
 *
 *   npm run validate:content            # sem rede, sem cache
 *   npm run validate:content -- --write # regrava o treino derivado e o inventário
 */

const VERDE = "\u001b[32m";
const VERMELHO = "\u001b[31m";
/** O amarelo dos avisos: o que o professor le, e que nao recusa o conteudo. */
const AMARELO = "\u001b[33m";
const NORMAL = "\u001b[0m";

type Issue = { code: string; where: string; message: string };

const issues: Issue[] = [];

/**
 * O que não recusa o conteúdo, mas o professor tem de ler.
 *
 * Hoje só recebe as exceções: o erro que ele assumiu por escrito (que vira
 * aviso com o motivo dele) e a exceção que caducou (que **não** perdoa nada —
 * o erro correspondente continua em `issues`).
 */
const avisos: Issue[] = [];

/**
 * As exceções de cada aula, por id. Preenchido depois da carga.
 *
 * É `let` com Map vazio, e não `const` construído lá embaixo, porque `fail()`
 * é chamado **durante** a carga das aulas (JSON quebrado, schema recusado) e
 * uma referência a algo ainda não inicializado explodiria ali — num caminho de
 * erro, que é o pior lugar para uma segunda falha.
 */
let excecoesPorAula = new Map<string, readonly Excecao[]>();

/**
 * A última palavra do professor, aplicada no único lugar por onde todo erro
 * passa.
 *
 * Só três códigos podem ser perdoados (`CODIGOS_COM_EXCECAO`), e todos são
 * divergência com a tablebase — o juiz externo. Lance ilegal e FEN impossível
 * não são opinião, e continuam recusando a aula.
 */
function fail(code: string, where: string, message: string) {
  if (aceitaExcecao(code)) {
    const alvo = alvoDoOnde(where);
    /**
     * De quem é a exceção que pode perdoar isto?
     *
     * O `where` de um erro de aula traz o id dela. O de um erro de **posição**
     * não traz — ele diz `posição pos-…`, e nada mais. Como a exceção mora no
     * arquivo da aula, a posição precisa ser devolvida à dona: a aula que a
     * referencia. Se duas aulas usarem a mesma posição, cada uma responde pela
     * sua, e basta uma tê-la perdoado.
     */
    // `EX-` é aula também (§22): sem ele, o problema de uma extra não achava a dona (D8). E o
    // `\b` desta linha era um caractere de controle literal (backspace, 0x08) até a fatia 8: a
    // expressão nunca casava, e a exceção nunca era procurada pela aula nomeada.
    const nomeada = /\b(?:N[0-9]+|EX)-[A-Z0-9-]+/.exec(where)?.[0];
    const candidatas = nomeada
      ? lessons.filter((l) => l.lesson.id === nomeada)
      : alvo?.startsWith("pos-")
          // A local, que devolve {id, stage} — não a de `lib/lesson/refs.ts`.
          ? lessons.filter((l) => referencedPositionIds(l.lesson).some((r) => r.id === alvo))
        : [];

    const carregada = candidatas.find(
      (l) =>
        julgarComExcecoes(
          excecoesPorAula.get(l.lesson.id),
          code,
          where,
          alvo ? hashDoAlvo(l.lesson, (id) => positions.get(id)?.fen ?? null, alvo) : null,
        ).tipo !== "erro",
    );

    if (carregada) {
      const veredito = julgarComExcecoes(
        excecoesPorAula.get(carregada.lesson.id),
        code,
        where,
        alvo ? hashDoAlvo(carregada.lesson, (id) => positions.get(id)?.fen ?? null, alvo) : null,
      );
      if (veredito.tipo === "aviso") {
        const aceito = { code, where, message: `${message}
    exceção do professor: ${veredito.motivo}` };
        avisos.push(aceito);
        emitir({ tipo: "aviso", code, onde: where, message: aceito.message });
        return;
      }
      if (veredito.tipo === "caduca") {
        // O erro segue adiante. Isto só explica **por que** a exceção não valeu.
        const caduca = {
          code: "EXCECAO_CADUCA",
          where,
          message:
            `a exceção escrita em ${veredito.excecao.em} descrevia outra coisa — ` +
            "a posição ou o passo mudaram desde então, e a decisão precisa ser tomada de novo",
        };
        avisos.push(caduca);
        emitir({ tipo: "aviso", code: caduca.code, onde: where, message: caduca.message });
      }
    }
  }
  issues.push({ code, where, message });
  emitir({ tipo: "problema", code, onde: where, message });
}

/**
 * O que a conferência aponta e não recusa (travas de 2026-09-15): procedência e
 * licença. Sai em amarelo, junto com as exceções, e não muda o código de saída.
 */
function avisar(code: string, where: string, message: string) {
  avisos.push({ code, where, message });
  emitir({ tipo: "aviso", code, onde: where, message });
}

/* ------------------------------------------------------------------ *
 * A saída em JSONL, para o editor
 * ------------------------------------------------------------------ */

/**
 * `--jsonl`: uma linha de JSON por evento, no stdout, **junto** com a saída
 * humana de sempre.
 *
 * O editor precisa saber *qual* problema aconteceu *onde*, para acender a
 * borda vermelha no diagrama certo em vez de despejar texto de terminal na
 * tela do professor. Ler o texto humano de volta seria um analisador frágil
 * sobre um formato que ninguém prometeu manter.
 *
 * **É aditivo de propósito, e essa é a decisão importante aqui.** O formato
 * humano de duas linhas (`✖ [CODIGO] onde` + a mensagem) é contrato:
 * `scripts/mutation-check.ts` junta stdout e stderr e procura exatamente por
 * ele (linhas 1021-1036 de lá). Suprimir a saída humana sob `--jsonl` faria a
 * suíte de mutações depender de qual flag alguém passou. Então nada some, e o
 * leitor do outro lado (`lib/editor/saida-do-gate.ts`) ignora toda linha que
 * não seja um objeto JSON com `tipo`.
 *
 * A escrita é `writeSync` no descritor 1, e não `console.log`, porque logo
 * depois dos últimos eventos vem `process.exit` — e num cano (que é como o
 * editor lê) o `console.log` do Node é assíncrono e pode ser cortado no meio.
 */
function emitir(evento: Record<string, unknown>): void {
  if (!jsonl) return;
  writeSync(1, `${JSON.stringify(evento)}\n`);
}

/** Um passo do trabalho, em português, para a tela dizer o que está esperando. */
function progresso(texto: string): void {
  emitir({ tipo: "progresso", texto });
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
/**
 * `--refresh-cache` continua aceito e não faz nada desde 2026-09-15: o editor v1 e a suíte de
 * mutações ainda o passam, e recusá-lo derrubaria os dois por um argumento que ficou sem sujeito.
 * `--prune-cache` saiu junto com o cache.
 */
const FLAGS = ["refresh-cache", "write", "rascunhos", "aplicar", "jsonl"] as const;
const OPCOES = ["content"] as const;

/**
 * Lida **antes** da validação de argumentos, e não junto das outras.
 *
 * `morrer()` sai do processo já na leitura dos argumentos — flag desconhecida,
 * opção sem valor. Se `jsonl` só existisse depois desse laço, o editor que
 * chamasse o gate com um argumento errado receberia o silêncio de um cano
 * vazio em vez de um evento dizendo o que houve.
 */
const jsonl = flag("jsonl");

/**
 * Erro de argumento — sai com **exit 2** (o 1 é "conteúdo recusado") e no mesmo
 * formato de duas linhas dos outros problemas, com o código entre colchetes. O
 * formato não é enfeite: é o que o `mutation-check` procura, e é por ele que
 * estas travas ganham mutação plantada como todas as outras regras.
 */
function morrer(codigo: string, mensagem: string): never {
  emitir({ tipo: "problema", code: codigo, onde: "argumentos", message: mensagem });
  emitir({ tipo: "fim", exit: 2 });
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
/**
 * Onde está `public/repertorio/`: a raiz do repositório, mesmo quando `--content` aponta para a
 * cópia temporária da checagem de mutações — o repertório compilado não é copiado para lá.
 */
const raizDoRepertorio = process.cwd();
const writeBack = flag("write");
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
      "TREINO_DESATUALIZADO e DIVIDA_DESATUALIZADA enquanto grava. Regenere numa passada, aplique em outra.",
  );
}

const positionsDir = path.join(contentDir, "positions");
const lessonsDir = path.join(contentDir, "lessons");
const sourcesFile = path.join(contentDir, "sources.json");
/**
 * A pasta do modo autor. É **irmã** de `lessons/` e `positions/`, e não filha:
 * dentro delas a varredura recursiva de `lib/lesson/content.ts` levaria
 * rascunho para a home e para a build.
 */
const rascunhosDir = path.join(contentDir, "rascunhos");

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

function checkPosition(position: Position) {
  const where = `posição ${position.id}`;

  const problem = fenProblem(position.fen);
  if (problem) {
    fail("FEN_ILEGAL", where, problem);
    return; // sem posição legal, nada mais faz sentido conferir
  }

  // Procedência é aviso desde 2026-09-15 (trava 7): "de onde veio" é opcional.
  const missing = PROVENANCE_FIELDS.filter((field) => position.provenance[field] === null);
  if (position.status !== "fixture" && missing.length > 0) {
    avisar(
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
      avisar(
        "OBRA_NAO_REGISTRADA",
        where,
        `provenance.editionFile "${key}" não está em content/sources.json — ` +
          `cite o arquivo ou o slug de uma obra registrada`,
      );
    }
  }

  /*
   * `RESULTADO_ERRADO`, `TABLEBASE_INDEFINIDA`, `TABLEBASE_FORA_DE_ALCANCE` e
   * `CACHE_FALTANDO` saíram em 2026-09-15: o `expectedResult` é o que o professor
   * declarou, e ninguém o confronta com a tablebase.
   */
}

/* ------------------------------------------------------------------ *
 * O lance terminal — o que ele declara, e o que o tabuleiro confirma
 * ------------------------------------------------------------------ */

/**
 * O lance terminal entrega o que o arquivo diz que ele entrega? (§7.3 do plano)
 *
 * Desde 2026-09-15 só se confere o que **o tabuleiro** prova sozinho: o mate é mate
 * e a promoção promove. `draw-secured` e `tablebase-win` são afirmações do
 * professor sobre o resultado, e o resultado é dele (trava 2) — saíram
 * `TERMINAL_NAO_SEGURA`, `TERMINAL_FORA_DO_OBJETIVO` e `TERMINAL_LONGE_DEMAIS`.
 */
function checkTerminal(where: string, ends: TerminalEnd, uci: string, after: { fen: string; game: Chess }) {
  if (ends === "mate" && !after.game.isCheckmate()) {
    fail("TERMINAL_SEM_MATE", where, `"${uci}" encerra o nó sem dar mate`);
    return;
  }
  if (ends === "promotion" && uci.length !== 5) {
    fail(
      "TERMINAL_SEM_PROMOCAO",
      where,
      `"${uci}" é declarado como "promotion" e não promove peça nenhuma — ` +
        `um lance de promoção em UCI tem cinco caracteres (ex.: e7e8q)`,
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

function checkTree(lesson: Lesson, stage: string, tree: MoveTree, options: TreeOptions) {
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

  // O objetivo da árvore tem de ser o resultado que a posição declara. As duas
  // coisas são do professor; o que se cobra é que ele não diga duas coisas
  // diferentes sobre a mesma posição.
  const esperado = tree.goal === "win" ? `win-${lesson.orientation}` : "draw";
  if (start.expectedResult !== esperado) {
    fail(
      "OBJETIVO_INCOERENTE",
      where,
      `a árvore tem goal "${tree.goal}", que pede uma posição "${esperado}", e ` +
        `"${start.id}" é "${start.expectedResult}"`,
    );
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

    // `winningMoves` é dado congelado desde 2026-09-15: ninguém o recalcula nem o
    // cobra (`WINNING_MOVES_DESATUALIZADO`, `METODO_NAO_GANHA`, `VEREDITO_ERRADO`,
    // `ALTERNATIVA_NAO_GANHA` e `DEFENSOR_FROUXO` saíram com a tablebase).
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
        if (respostas.length === 0) {
          checkTerminal(nodeWhere, expect.ends ?? "mate", move, afterMove);
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
      }
    }

    /* -------------------------------------------------------------- *
     * Os lances que a autoria declara válidos (B8.2)
     *
     * Desde 2026-09-15 o professor manda na técnica **e** no resultado. O que
     * continua cobrado é que nenhum lance esteja em duas listas ao mesmo
     * tempo — aceitar um lance que hoje é erro é *mover* de uma lista para a
     * outra, nunca escrever nas duas.
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
 * Ramos equivalentes — congelados desde 2026-09-15
 *
 * O gerador de `methodAlternatives` perguntava à tablebase quais lances ainda
 * ganhavam (KRK/KQK) e regravava a lista com `--write`. Sem tablebase, a lista
 * gravada fica como dado, e `ALTERNATIVAS_DESATUALIZADAS` saiu. O que continua é
 * a forma da autoria: o teto de expects escritos à mão e o id reservado.
 * ------------------------------------------------------------------ */

function checkAutoria(loaded: LoadedLesson) {
  const { lesson } = loaded;
  const guided = lesson.stages.guided;
  if (!guided) return;
  const where = `aula ${lesson.id} / guided`;
  for (const [id, node] of Object.entries(guided.nodes)) {
    if (GENERATED_ID.test(id)) {
      fail("ID_RESERVADO", `${where} / ${id}`, `"g<número>" é reservado ao gerador de ramos`);
    }
    if (authorialExpects(node).length > 4) {
      fail(
        "EXPECTS_AUTORAIS_DEMAIS",
        `${where} / ${id}`,
        `${authorialExpects(node).length} expects escritos à mão; o teto da autoria é 4`,
      );
    }
  }
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

function derivarEtapa3(loaded: LoadedLesson) {
  const { lesson } = loaded;
  const objective = lesson.stages.objective;
  if (!objective) return;
  const posicao = positions.get(objective.positionId);
  if (!posicao || fenProblem(posicao.fen)) return;

  const where = `aula ${lesson.id} / treino`;

  // Os `winningMoves` são congelados (2026-09-15): a derivação os copia da árvore
  // que o arquivo já tem, pela posição, e posição nova nasce com a lista vazia.
  // `esqueletoDoTreino` não compara a lista, então isto não muda o veredito.
  const congelados = new Map<string, string[]>(
    Object.values(lesson.stages.guided?.nodes ?? {}).map((node) => [node.fen, node.winningMoves]),
  );
  const { tree, problemas } = derivarTreino(lesson, posicao, (fen) => congelados.get(fen) ?? null);
  for (const problema of problemas) {
    const onde = problema.passo === null ? where : `${where} / roteiro[${problema.passo}]`;
    fail(problema.code, onde, problema.message);
  }
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
          " — rode `npm run validate:content -- --write` e leia o diff",
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

function checkLesson(loaded: LoadedLesson) {
  const { lesson } = loaded;
  const where = `aula ${lesson.id}`;

  /*
   * **Texto que a máquina escreveu não chega ao aluno.**
   *
   * O "+" do editor cria um diagrama, e um diagrama precisa de uma fala: o
   * schema recusa fala vazia, e rascunho recusado não vai ao disco. Então o
   * passo novo nasce com `MARCA_DE_MOLDE` dentro, e é esta regra que impede a
   * marca de sobreviver até a publicação — sem ela, o professor acrescenta um
   * diagrama, se distrai, publica, e a aula chega à criança com um passo que
   * ninguém escreveu. O molde do Bloco 3 vai gerar aula inteira assim; a regra
   * já está no lugar quando ele chegar.
   *
   * Só na aula **publicada**, e é o ponto: carregar a marca é exatamente o
   * estado normal de um rascunho em construção. Quem cobra é a publicação.
   *
   * O `onde` vem de `falasDaAula`, que já colhe todo texto que o aluno lê e já
   * escreve o índice do passo (`objective.roteiro[3].fala`). É de graça que o
   * editor acende a borda vermelha **no selo do diagrama** que acabou de
   * nascer, em vez de dizer "há uma marca em algum lugar da aula".
   */
  if (lesson.status === "published") {
    for (const fala of falasDaAula(lesson)) {
      if (!fala.texto.includes(MARCA_DE_MOLDE)) continue;
      fail(
        "TEXTO_DE_MOLDE",
        `aula ${fala.onde}`,
        `este texto ainda tem a marca ${MARCA_DE_MOLDE} — foi a máquina que o escreveu, ` +
          "e a aula publicada só carrega o que o professor escreveu",
      );
    }
  }

  const refs = referencedPositionIds(lesson);
  for (const ref of refs) {
    const position = positions.get(ref.id);
    if (!position) {
      fail("POSICAO_INEXISTENTE", `${where} / ${ref.stage}`, `não existe a posição "${ref.id}"`);
      continue;
    }
    // Aviso desde 2026-09-15 (trava 7): a revisão humana da posição é recomendada, não exigida.
    if (lesson.status === "published" && position.status !== "approved") {
      avisar(
        "POSICAO_NAO_PUBLICAVEL",
        `${where} / ${ref.stage}`,
        `aula publicada referencia a posição "${ref.id}", de status "${position.status}" — ` +
          `só "approved" chega ao aluno`,
      );
    }
  }

  /*
   * **`TETO_DE_CITACAO` saiu em 2026-09-15**, por decisão do Doug (trava 4 de
   * `docs/TRILHA-FINAIS.md`): não há mais teto de posições por obra protegida nem
   * livro-base obrigatório. O inventário de `content/divida-de-licenca.md` continua
   * sendo gerado, e é aviso.
   */

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

  /*
   * **`FONTE_NAO_DIDATICA` e `FONTE_DIDATICA_DIVERGE` saíram em 2026-09-15** (trava 4):
   * `objective.source` continua sendo um campo da aula, e qualquer obra — ou nenhuma do
   * registro — serve. A posição não precisa sair do livro que a aula cita.
   */

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
    checkTree(lesson, "guided", lesson.stages.guided, { allowHelp: true });
  }
}

/*
 * **A rotação dos livros-base (`FONTE_DIDATICA_DOMINA`) saiu em 2026-09-15**, por decisão
 * do Doug (trava 4 de `docs/TRILHA-FINAIS.md`). Alternar livros escritos para iniciante
 * continua sendo bom conselho (§3.4 do `SOURCE-CORPUS`); não é mais cobrado.
 */

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
    // Aviso desde 2026-09-15 (decisão sobre direitos autorais): o inventário continua.
    if (hoje > replaceBefore) {
      avisar(
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
  // Aviso desde 2026-09-15: o inventário é gerado e lido, e não recusa conteúdo.
  avisar(
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
// As exceções entram em cena **antes** de qualquer conferência, porque é o
// `fail()` que as consulta e ele começa a ser chamado na primeira delas.
excecoesPorAula = new Map(
  lessons.filter((l) => l.lesson.excecoes).map((l) => [l.lesson.id, l.lesson.excecoes!]),
);

progresso(`derivando a etapa 3 de ${lessons.length} aula(s)`);
for (const loaded of lessons) {
  derivarEtapa3(loaded);
}
for (const loaded of lessons) {
  checkAutoria(loaded);
}
progresso(`conferindo ${positions.size} posição(ões)`);
for (const position of positions.values()) {
  checkPosition(position);
}
progresso(`conferindo ${lessons.length} aula(s)`);
for (const loaded of lessons) {
  checkLesson(loaded);
}
checkIntegralRegime();
checkDivida();
progresso("conferindo as aulas v2 publicadas");
checkAulasV2();

/* ------------------------------------------------------------------ *
 * As aulas v2 publicadas (fatia 7 do Editor v2)
 *
 * O Editor v2 publica em `content/aulas-v2/<AULA>/`: um ponteiro `ativa.json` e os pacotes
 * imutáveis em `publicacoes/`. Esta seção põe essas publicações sob o mesmo gate que roda
 * no CI e no teste de mutações — sem ela, um pacote editado à mão depois de publicado
 * chegaria ao aluno sem que nenhuma conferência o lesse.
 *
 * Cada pacote guardado é conferido por inteiro (hashes, revisões, id): os antigos também,
 * porque uma aba antiga rejulga contra eles. As **regras de publicação** valem só para o
 * ativo. A régua de voz não entra aqui: ela avisa no editor e não decide o CI.
 * ------------------------------------------------------------------ */
function checkAulasV2() {
  for (const id of idsDeAulasV2(contentDir)) {
    const where = `aula v2 ${id}`;
    for (const publicationId of idsDePublicacoesV2(contentDir, id)) {
      let cru: unknown;
      try {
        cru = lerPublicacaoCruaV2(contentDir, id, publicationId);
      } catch (error) {
        fail("PACOTE_ADULTERADO", `${where} / ${publicationId}`, `JSON ilegível: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      const problemas = problemasDoPacoteV2(cru);
      for (const problema of problemas) fail("PACOTE_ADULTERADO", `${where} / ${publicationId}`, problema);
      if (!problemas.length && (cru as PacoteV2).publicationId !== publicationId) {
        fail("PACOTE_ADULTERADO", `${where} / ${publicationId}`, `o arquivo se chama ${publicationId} e o pacote diz ser ${(cru as PacoteV2).publicationId}`);
      }
    }

    let ponteiro: ReturnType<typeof lerPonteiroV2>;
    try {
      ponteiro = lerPonteiroV2(contentDir, id);
    } catch (error) {
      fail("PONTEIRO_V2_INVALIDO", where, `ativa.json ilegível: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (!ponteiro) {
      fail("PONTEIRO_V2_INVALIDO", where, "a pasta da aula v2 não tem ativa.json");
      continue;
    }
    let ativo: unknown;
    try {
      ativo = lerPublicacaoCruaV2(contentDir, id, ponteiro.publicationId);
    } catch {
      // Ilegível: o laço de cima já acusou PACOTE_ADULTERADO por este arquivo.
      continue;
    }
    if (!ativo) {
      fail("PONTEIRO_SEM_PACOTE", where, `ativa.json aponta para ${ponteiro.publicationId}, que não está em publicacoes/`);
      continue;
    }
    if (ponteiro.anterior && !lerPublicacaoCruaV2(contentDir, id, ponteiro.anterior)) {
      fail("PONTEIRO_SEM_PACOTE", where, `ativa.json guarda a anterior ${ponteiro.anterior}, que não está em publicacoes/`);
    }
    const pacote = ativo as PacoteV2;
    // A forma precisa fechar para as regras rodarem; o adulterado já foi acusado acima.
    if (problemasDoPacoteV2(pacote).some((p) => /forma|não é um pacote|não é um objeto/.test(p))) continue;
    if (pacote.aula.id !== id) fail("PACOTE_ADULTERADO", where, `o pacote ativo é da aula ${pacote.aula.id}`);

    const posicoes = posicoesDoPacoteV2(pacote);
    let recalculadas: RevisoesDaAulaV2 = {};
    try {
      recalculadas = revisoesDaAulaV2(pacote.aula, posicoes);
    } catch {
      // `problemasDoPacoteV2` já disse por que a revisão não pôde ser recalculada.
    }
    const julgados = problemasParaPublicarV2(pacote.aula, {
      positions: posicoes,
      revisoes: { gravadas: pacote.revisoes, recalculadas },
      // §18.1: o move trainer da aula de abertura só aponta para linha do repertório compilado.
      ...(pacote.aula.treinadores?.length ? { linhasDoRepertorio: idsDoRepertorioCompilado(raizDoRepertorio) } : {}),
    });
    for (const problema of julgados) {
      if (problema.severidade !== "erro") continue;
      const local = Object.entries(problema.localizacao).filter(([chave]) => chave !== "aulaId").map(([chave, valor]) => `${chave}=${valor}`).join(" ");
      fail(problema.codigo, `${where} / ${ponteiro.publicationId}${local ? ` / ${local}` : ""}`, problema.mensagem);
    }
  }
}

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
console.log("");

// O resumo em dados, para a tela poder dizer "12 posições, 3 pela rede" sem
// analisar a frase que o terminal imprime.
emitir({
  tipo: "resumo",
  posicoes: positions.size,
  aulas: lessons.length,
  rascunhos: useRascunhos
    ? { aulas: rascunhosDeAula.length, posicoes: rascunhosDePosicao.length }
    : null,
  promovidos,
  problemas: issues.length,
  avisos: avisos.length,
});

// Os avisos saem **antes** do veredito, em amarelo, e não mudam o código de
// saída. Uma exceção que ninguém relê é uma exceção esquecida: ela aparece em
// toda rodada, verde ou vermelha.
if (avisos.length > 0) {
  for (const aviso of avisos) {
    console.log(`${AMARELO}▲ [${aviso.code}] ${aviso.where}${NORMAL}`);
    console.log(`    ${aviso.message}`);
  }
  console.log("");
}

if (issues.length === 0) {
  emitir({ tipo: "fim", exit: 0 });
  console.log(
    `${VERDE}✔ tudo verde — ${positions.size} posições, ${lessons.length} aula(s) e ` +
      `${notas.length} página(s) de princípios sem nenhum problema${NORMAL}`,
  );
  process.exit(0);
}

emitir({ tipo: "fim", exit: 1 });

for (const issue of issues) {
  console.log(`${VERMELHO}✖ [${issue.code}] ${issue.where}${NORMAL}`);
  console.log(`    ${issue.message}`);
}
console.log("");
console.log(`${VERMELHO}✖ ${issues.length} problema(s) — conteúdo recusado${NORMAL}`);
process.exit(1);
