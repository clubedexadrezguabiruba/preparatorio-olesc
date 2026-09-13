/**
 * Aplicar uma edição do repertório em disco — §21, parada 8C da fatia 8.
 *
 * O teste que manda é o da interrupção: parar depois de **cada** fase, como se o processo
 * tivesse morrido, recuperar, e conferir que fonte e compilado são um conjunto coerente (o
 * mesmo `--check` do portão) e que nenhuma transação sobrou.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { hashDoTexto, trocarArquivo } from "../../editor/rascunhos.ts";
import { lerCompilado } from "../compilar-em-disco.ts";
import { cascaDoArquivo } from "./adaptar.ts";
import { aplicarRepertorio, compiladoCoerente, prepararAplicacao, recuperarTransacaoRepertorio, type FaseDoRepertorio } from "./aplicar.ts";
import { escreverArquivo } from "./escrever.ts";
import { abrirArquivoDoRepertorio, caminhoDaFonte, gravarRascunhoDoRepertorio } from "./rascunho.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const ARQUIVO = "brancas-alapin";
const FRASE = "Frase nova, escrita pelo professor no editor.";

function pastaComORepertorio(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), "aplicar-repertorio-"));
  mkdirSync(path.join(raiz, "content", "repertorio"), { recursive: true });
  for (const nome of readdirSync("content/repertorio").filter((n) => n.endsWith(".pgn"))) {
    cpSync(path.join("content/repertorio", nome), path.join(raiz, "content", "repertorio", nome));
  }
  cpSync("public/repertorio", path.join(raiz, "public", "repertorio"), { recursive: true });
  return raiz;
}

/** A Alapin com uma frase a mais no comentário do 2.c3 — a edição do item 3 do roteiro. */
function alapinEditada(raiz: string): string {
  const original = readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8");
  const casca = cascaDoArquivo(ARQUIVO, original);
  const analise = casca.aula.analises[0];
  const c3 = analise.nos[analise.nos[analise.nos[analise.raizId].filhos[0]].filhos[0]].filhos[0];
  analise.nos[c3].comentario = `${analise.nos[c3].comentario} ${FRASE}`;
  const escrito = escreverArquivo(original, casca.aula, new Set([analise.id]));
  assert.deepEqual(escrito.problemas, []);
  return escrito.texto;
}

const restoDeTransacao = (raiz: string) => {
  const pasta = path.join(raiz, ".editor", "repertorio", "transacao");
  return existsSync(pasta) ? readdirSync(pasta) : [];
};

const compiladoTemAFrase = (raiz: string) => readFileSync(path.join(raiz, "public", "repertorio", "brancas", "alapin.json"), "utf8").includes(FRASE);

test("aplicar sem interrupção troca a fonte e o compilado juntos, e só a Alapin muda", () => {
  const raiz = pastaComORepertorio();
  try {
    const antesPgn = new Map(readdirSync(path.join(raiz, "content", "repertorio")).map((n) => [n, hashDoTexto(readFileSync(path.join(raiz, "content", "repertorio", n), "utf8"))]));
    const antesJson = lerCompilado(path.join(raiz, "public", "repertorio"));
    const texto = alapinEditada(raiz);

    const preparo = prepararAplicacao(ARQUIVO, texto, raiz);
    assert.equal(preparo.ok, true);
    if (!preparo.ok) return;
    assert.deepEqual(preparo.idsQueMorrem, []);
    assert.equal(preparo.impacto.textoMudou, 1);

    assert.deepEqual(aplicarRepertorio(ARQUIVO, texto, { raiz, env: ligada, impactoHash: preparo.impactoHash }), { ok: true, semMudanca: false });
    assert.equal(readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8"), texto);
    assert.deepEqual(compiladoCoerente(raiz), []);
    assert.deepEqual(restoDeTransacao(raiz), []);
    assert.ok(compiladoTemAFrase(raiz));

    for (const [nome, hash] of antesPgn) {
      if (nome === `${ARQUIVO}.pgn`) continue;
      assert.equal(hashDoTexto(readFileSync(path.join(raiz, "content", "repertorio", nome), "utf8")), hash, nome);
    }
    const depoisJson = lerCompilado(path.join(raiz, "public", "repertorio"));
    const mudaram = [...depoisJson].filter(([k, v]) => antesJson.get(k) !== v).map(([k]) => k);
    assert.deepEqual(mudaram, ["brancas/alapin.json"], "o índice não muda: nenhum id nasceu nem morreu");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

for (const fase of ["candidato", "validado", "fonte-trocada", "compilado"] as FaseDoRepertorio[]) {
  test(`interrompida depois de "${fase}", a recuperação deixa fonte e compilado coerentes`, () => {
    const raiz = pastaComORepertorio();
    try {
      const original = readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8");
      const texto = alapinEditada(raiz);
      const parada = aplicarRepertorio(ARQUIVO, texto, { raiz, env: ligada, pararDepoisDe: fase });
      assert.deepEqual(parada, { ok: false, motivo: "interrompida para teste", interrompidaEm: fase });
      assert.notDeepEqual(restoDeTransacao(raiz), [], "a interrupção deixa a transação em disco");

      const recuperacao = recuperarTransacaoRepertorio(raiz);
      const terminou = fase === "fonte-trocada" || fase === "compilado";
      assert.equal(recuperacao.acao, terminou ? "terminada" : "descartada");
      assert.deepEqual(restoDeTransacao(raiz), []);
      assert.deepEqual(compiladoCoerente(raiz), [], "fonte e compilado coerentes: o --check passaria");
      assert.equal(readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8"), terminou ? texto : original);
      assert.equal(compiladoTemAFrase(raiz), terminou);

      // E a próxima aplicação corre normalmente.
      assert.equal(aplicarRepertorio(ARQUIVO, texto, { raiz, env: ligada }).ok, true);
      assert.deepEqual(compiladoCoerente(raiz), []);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
}

test("interrompida entre a troca da fonte e o registro da fase: a recuperação termina, não descarta", () => {
  const raiz = pastaComORepertorio();
  try {
    const texto = alapinEditada(raiz);
    aplicarRepertorio(ARQUIVO, texto, { raiz, env: ligada, pararDepoisDe: "validado" });
    // O processo morreu logo depois do rename da fonte, antes de gravar "fonte-trocada".
    trocarArquivo(caminhoDaFonte(ARQUIVO, raiz), texto);
    assert.equal(recuperarTransacaoRepertorio(raiz).acao, "terminada");
    assert.deepEqual(compiladoCoerente(raiz), []);
    assert.ok(compiladoTemAFrase(raiz));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("candidato que não compila não muda nada, e a fonte nunca recebe o PGN recusado", () => {
  const raiz = pastaComORepertorio();
  try {
    const original = readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8");
    const antesJson = lerCompilado(path.join(raiz, "public", "repertorio"));
    const mudo = original.replace(/1\. e4 \{[^}]*\}/, "1. e4");
    const resultado = aplicarRepertorio(ARQUIVO, mudo, { raiz, env: ligada });
    assert.equal(resultado.ok, false);
    assert.ok(!resultado.ok && resultado.problemas!.some((p) => p.includes("sem comentário")));
    assert.equal(readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8"), original);
    assert.deepEqual([...lerCompilado(path.join(raiz, "public", "repertorio"))], [...antesJson]);
    assert.deepEqual(restoDeTransacao(raiz), []);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("hash de impacto diferente do que o professor viu é recusado; editor desligado também", () => {
  const raiz = pastaComORepertorio();
  try {
    const original = readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8");
    const texto = alapinEditada(raiz);
    const recusa = aplicarRepertorio(ARQUIVO, texto, { raiz, env: ligada, impactoHash: "outro" });
    assert.equal(recusa.ok, false);
    assert.match(!recusa.ok ? recusa.motivo : "", /mudou desde que o impacto foi mostrado/);
    assert.equal(aplicarRepertorio(ARQUIVO, texto, { raiz, env: { NODE_ENV: "production" } as NodeJS.ProcessEnv }).ok, false);
    assert.equal(aplicarRepertorio("../fora", texto, { raiz, env: ligada }).ok, false);
    assert.equal(readFileSync(caminhoDaFonte(ARQUIVO, raiz), "utf8"), original);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("rascunho em PGN com baseHash: a primeira edição parte da fonte; hash velho é conflito", () => {
  const raiz = pastaComORepertorio();
  try {
    const aberto = abrirArquivoDoRepertorio(ARQUIVO, raiz)!;
    assert.equal(aberto.origem, "fonte");
    const texto = alapinEditada(raiz);
    const gravado = gravarRascunhoDoRepertorio(ARQUIVO, texto, aberto.hash, raiz);
    assert.equal(gravado.ok, true);
    assert.equal(existsSync(path.join(raiz, ".editor", "repertorio", `${ARQUIVO}.pgn`)), true);
    assert.equal(abrirArquivoDoRepertorio(ARQUIVO, raiz)!.origem, "rascunho");
    const briga = gravarRascunhoDoRepertorio(ARQUIVO, `${texto}\n`, aberto.hash, raiz);
    assert.equal(briga.ok, false);
    assert.throws(() => gravarRascunhoDoRepertorio("../../etc", texto, null, raiz));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
