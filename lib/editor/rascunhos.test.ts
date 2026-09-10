import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { filaDeGravacao } from "./fila.ts";
import {
  abrirRascunhoDeAula,
  caminhoDoRascunho,
  concluirEscrita,
  conflito,
  escreverAtomico,
  gravarAutosave,
  gravarRascunhoDeAula,
  hashDoTexto,
  lerAutosave,
  lerConteudo,
  prepararEscrita,
  serializar,
} from "./rascunhos.ts";

/**
 * O contrato de gravação do editor, cobrado antes de existir um lápis.
 *
 * O editor escreve arquivos do repositório. As três maneiras de ele estragar
 * conteúdo sem que ninguém veja são conhecidas, e cada uma tem um teste aqui:
 *
 * 1. duas gravações concorrentes decidindo sozinhas quem vence;
 * 2. escrever por cima do que outra pessoa (ou um agente) mudou no arquivo;
 * 3. morrer no meio da escrita e deixar meio JSON no lugar do arquivo bom.
 *
 * Nenhum deles aparece na tela quando acontece — é por isso que eles vêm
 * primeiro, e não depois da parte visível.
 */

const LIGADO = { NODE_ENV: "development", EDITOR_LOCAL: "1" };
const RAIZ_DO_REPO = process.cwd();

/** A N1-KPK de verdade, que é o arquivo da medida deste bloco. */
const AULA = readFileSync(path.join(RAIZ_DO_REPO, "content/lessons/N1-KPK.json"), "utf8");

function areia(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "editor-"));
  mkdirSync(path.join(dir, "content/lessons"), { recursive: true });
  writeFileSync(path.join(dir, "content/lessons/N1-KPK.json"), AULA, "utf8");
  return dir;
}

// ---------------------------------------------------------------- o disco

test("abrir a aula copia os bytes da publicada, sem reserializar", () => {
  const raiz = areia();
  try {
    const aberto = abrirRascunhoDeAula("N1-KPK", { raiz, env: LIGADO });
    assert.ok(aberto);
    // Byte a byte. É isto que faz o `git diff` da medida mostrar uma fala em
    // vez das 547 linhas do arquivo.
    assert.equal(readFileSync(caminhoDoRascunho("N1-KPK", raiz), "utf8"), AULA);
    assert.equal(aberto.hash, hashDoTexto(AULA));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("gravar com o hash certo troca só o que mudou", () => {
  const raiz = areia();
  try {
    const aberto = abrirRascunhoDeAula("N1-KPK", { raiz, env: LIGADO });
    assert.ok(aberto);
    const cru = JSON.parse(aberto.texto) as Record<string, unknown>;
    const stages = cru.stages as { intro: { passos: Array<{ fala: string }> } };
    stages.intro.passos[0].fala = "Uma fala nova, escrita pelo editor.";

    const r = gravarRascunhoDeAula("N1-KPK", cru, aberto.hash, { raiz, env: LIGADO });
    assert.equal(r.ok, true);

    const gravado = readFileSync(caminhoDoRascunho("N1-KPK", raiz), "utf8");
    const antes = AULA.split("\n");
    const depois = gravado.split("\n");
    assert.equal(antes.length, depois.length, "o arquivo não pode mudar de tamanho");
    const diferentes = antes.filter((linha, i) => linha !== depois[i]);
    assert.equal(diferentes.length, 1, `mudou ${diferentes.length} linhas: ${diferentes.join(" | ")}`);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("hash divergente recusa: o arquivo mudou fora do editor", () => {
  const raiz = areia();
  try {
    const aberto = abrirRascunhoDeAula("N1-KPK", { raiz, env: LIGADO });
    assert.ok(aberto);
    const cru = JSON.parse(aberto.texto) as Record<string, unknown>;

    // Um agente edita o mesmo JSON com a aba aberta.
    const porFora = aberto.texto.replace("\"title\"", "\"title\" ");
    writeFileSync(caminhoDoRascunho("N1-KPK", raiz), porFora, "utf8");

    const r = gravarRascunhoDeAula("N1-KPK", cru, aberto.hash, { raiz, env: LIGADO });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(r.erro, /mudou fora do editor/);
    assert.equal(r.conflito?.textoAtual, porFora);

    // E o "sim, eu vi, pode ir" da tela passa por cima.
    const forcado = gravarRascunhoDeAula("N1-KPK", cru, aberto.hash, {
      raiz,
      env: LIGADO,
      sobrescrever: true,
    });
    assert.equal(forcado.ok, true);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("JSON que o schema recusa não chega ao disco", () => {
  const raiz = areia();
  try {
    const aberto = abrirRascunhoDeAula("N1-KPK", { raiz, env: LIGADO });
    assert.ok(aberto);
    const cru = JSON.parse(aberto.texto) as Record<string, unknown>;
    cru.orientation = "roxo";

    const r = gravarRascunhoDeAula("N1-KPK", cru, aberto.hash, { raiz, env: LIGADO });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.problemas && r.problemas.length > 0);
    assert.equal(readFileSync(caminhoDoRascunho("N1-KPK", raiz), "utf8"), AULA);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("processo morto entre o .tmp e o rename deixa o arquivo anterior inteiro", () => {
  const raiz = areia();
  try {
    const alvo = path.join(raiz, "content/rascunhos/lessons/N1-KPK.json");
    escreverAtomico(alvo, AULA);

    // Isto é o processo morrendo: os bytes novos existem, o rename não
    // aconteceu. Nada além de `prepararEscrita` foi chamado.
    const tmp = prepararEscrita(alvo, "{ metade de um JS");

    assert.equal(readFileSync(alvo, "utf8"), AULA, "o arquivo anterior tem de estar inteiro");
    assert.ok(JSON.parse(readFileSync(alvo, "utf8")), "e continua sendo JSON válido");

    // E o `rename` é o instante em que a troca acontece — não antes.
    concluirEscrita(tmp, alvo);
    assert.equal(readFileSync(alvo, "utf8"), "{ metade de um JS");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("o temporário nunca colide entre duas escritas cruzadas", () => {
  const raiz = areia();
  try {
    const alvo = path.join(raiz, "content/rascunhos/lessons/N1-KPK.json");
    mkdirSync(path.dirname(alvo), { recursive: true });
    const a = prepararEscrita(alvo, "a");
    const b = prepararEscrita(alvo, "b");
    assert.notEqual(a, b);
    assert.equal(readFileSync(a, "utf8"), "a");
    assert.equal(readFileSync(b, "utf8"), "b");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("id de aula com travessia de caminho é recusado", () => {
  for (const id of ["../../etc/passwd", "N1-KPK/../../x", "n1-kpk", "", "N1-KPK.json"]) {
    assert.throws(() => caminhoDoRascunho(id, RAIZ_DO_REPO), /id de aula inválido|caminho fora/);
  }
});

test("com o editor desligado, a camada de disco se recusa a escrever", () => {
  const raiz = areia();
  try {
    assert.throws(
      () => gravarRascunhoDeAula("N1-KPK", {}, null, { raiz, env: { NODE_ENV: "production" } }),
      /desligado/,
    );
    assert.throws(
      () => abrirRascunhoDeAula("N1-KPK", { raiz, env: {} }),
      /desligado/,
    );
    assert.equal(readdirSync(path.join(raiz, "content")).includes("rascunhos"), false);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("o autosave aceita o que o schema recusa — é recuperação de sessão", () => {
  const raiz = areia();
  try {
    gravarAutosave("N1-KPK", { fala: "meio pensamen", valido: false }, { raiz, env: LIGADO });
    assert.deepEqual(lerAutosave("N1-KPK", raiz), { fala: "meio pensamen", valido: false });
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("conflito: criar sobre arquivo que já existe também é conflito", () => {
  const existente = { texto: "x", hash: hashDoTexto("x") };
  assert.equal(conflito(null, null), null);
  assert.equal(conflito(existente, existente.hash), null);
  assert.deepEqual(conflito(null, "abc"), { hashAtual: null, textoAtual: null });
  assert.deepEqual(conflito(existente, null), { hashAtual: existente.hash, textoAtual: "x" });
});

test("o formatador é o mesmo do gate: dois espaços e quebra de linha no fim", () => {
  assert.equal(serializar({ a: 1 }), '{\n  "a": 1\n}\n');
});

test("lerConteudo devolve null em arquivo que não existe", () => {
  assert.equal(lerConteudo(path.join(RAIZ_DO_REPO, "nao-existe-mesmo.json")), null);
});

// ------------------------------------------------------------------ a fila

test("a fila mantém uma gravação em voo e a mais nova vence", async () => {
  const enviados: number[] = [];
  // Cada gravação em voo deixa aqui a chave que a solta. Uma lista, e não uma
  // variável, porque o TypeScript não enxerga atribuição feita dentro de um
  // callback — e a segunda solta é de outra gravação, não da mesma.
  const soltas: Array<() => void> = [];

  const fila = filaDeGravacao<number>(async (n) => {
    enviados.push(n);
    await new Promise<void>((r) => soltas.push(r));
  });

  fila.enfileirar(1);
  assert.deepEqual(enviados, [1], "a primeira sai na hora");

  fila.enfileirar(2);
  fila.enfileirar(3);
  assert.deepEqual(enviados, [1], "as outras esperam a primeira voltar");

  soltas.shift()!();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(enviados, [1, 3], "o estado do meio da digitação não vai ao disco");

  soltas.shift()!();
  await fila.aguardar();
  assert.equal(fila.ocupada(), false);
});

test("a fila não trava — nem vaza promessa rejeitada — quando uma gravação falha", async () => {
  const enviados: string[] = [];
  const falhas: string[] = [];
  const fila = filaDeGravacao<string>(
    async (s) => {
      enviados.push(s);
      if (s === "ruim") throw new Error("o disco recusou");
    },
    (_erro, valor) => falhas.push(valor),
  );

  fila.enfileirar("ruim");
  await fila.aguardar();
  fila.enfileirar("bom");
  await fila.aguardar();

  assert.deepEqual(enviados, ["ruim", "bom"]);
  assert.deepEqual(falhas, ["ruim"], "o erro chega a quem cuida dele, e não ao unhandledRejection");
  assert.equal(fila.ocupada(), false);
});

test("aguardar numa fila parada resolve na hora", async () => {
  const fila = filaDeGravacao<number>(async () => {});
  await fila.aguardar();
  assert.equal(fila.ocupada(), false);
});
