import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  caminhoDoLock,
  conferir,
  destravarConferencia,
  podePublicar,
  travarConferencia,
  ultimaConferencia,
  type Conferencia,
} from "./gate.ts";
import { escreverAtomico, hashDoTexto, serializar } from "./rascunhos.ts";

/**
 * O lock da conferência e a permissão de publicar.
 *
 * O que estes testes protegem, nas palavras do problema:
 *
 * - Duas rodadas de `--write` cruzadas escreveriam os derivados uma por cima
 *   da outra, e a segunda leria pela metade o que a primeira grava.
 * - Um `next dev` derrubado no meio de uma conferência não pode deixar o botão
 *   "Conferir" desligado para sempre.
 * - Publicar tem de exigir que a aula seja **exatamente** aquela que ficou
 *   verde. Um lápis depois da conferência apaga o direito de publicar.
 *
 * Nenhum destes roda o gate de verdade — o gate leva segundos e lê o
 * repositório inteiro. A rodada de ponta a ponta é a medida do bloco, feita à
 * mão, e não uma coisa que `npm test` paga a cada rodada.
 */

const LIGADO = { NODE_ENV: "development", EDITOR_LOCAL: "1" };

function areia(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "gate-"));
  mkdirSync(path.join(dir, "content/rascunhos/lessons"), { recursive: true });
  return dir;
}

function comRascunho(raiz: string, texto: string): string {
  const alvo = path.join(raiz, "content/rascunhos/lessons/N1-KPK.json");
  writeFileSync(alvo, texto, "utf8");
  return hashDoTexto(texto);
}

function comConferencia(raiz: string, c: Partial<Conferencia>): void {
  escreverAtomico(
    path.join(raiz, ".editor/gate/N1-KPK.json"),
    serializar({ aula: "N1-KPK", em: new Date().toISOString(), passadas: [], ...c }),
  );
}

// ------------------------------------------------------------------- o lock

test("lock de outro processo vivo impede uma segunda conferência", async () => {
  const raiz = areia();
  try {
    // `process.ppid` é o processo que lançou este — vivo por construção, e
    // não somos nós.
    escreverAtomico(caminhoDoLock(raiz), serializar({ pid: process.ppid, em: "agora" }));

    const r = await conferir("N1-KPK", { raiz, env: LIGADO });
    assert.equal(r.verde, false);
    assert.match(String(r.impedimento), /já há uma conferência rodando/);
    assert.deepEqual(r.passadas, [], "e o gate nem chegou a ser lançado");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("lock de processo morto é roubado, e não trava o editor para sempre", () => {
  const raiz = areia();
  try {
    // Um pid altíssimo e improvável; se por azar existir, o teste vira um
    // falso vermelho barulhento, nunca um falso verde.
    escreverAtomico(caminhoDoLock(raiz), serializar({ pid: 4194303, em: "ontem" }));
    const r = travarConferencia(raiz);
    assert.equal(r.ok, true);
    const dono = JSON.parse(readFileSync(caminhoDoLock(raiz), "utf8")) as { pid: number };
    assert.equal(dono.pid, process.pid);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("lock ilegível é lock de ninguém", () => {
  const raiz = areia();
  try {
    escreverAtomico(caminhoDoLock(raiz), "isto não é JSON");
    assert.equal(travarConferencia(raiz).ok, true);
    destravarConferencia(raiz);
    assert.equal(travarConferencia(raiz).ok, true);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("destravar deixa a próxima conferência passar", () => {
  const raiz = areia();
  try {
    assert.equal(travarConferencia(raiz).ok, true);
    destravarConferencia(raiz);
    assert.equal(travarConferencia(raiz).ok, true);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

// -------------------------------------------------------------- publicar

test("sem conferência, não publica", () => {
  const raiz = areia();
  try {
    comRascunho(raiz, "{}");
    const r = podePublicar("N1-KPK", raiz);
    assert.equal(r.pode, false);
    assert.match(String(r.motivo), /ainda não foi conferida/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("conferência vermelha não publica", () => {
  const raiz = areia();
  try {
    const hash = comRascunho(raiz, "{}");
    comConferencia(raiz, { verde: false, hashVerde: hash });
    const r = podePublicar("N1-KPK", raiz);
    assert.equal(r.pode, false);
    assert.match(String(r.motivo), /encontrou problemas/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("um lápis depois da conferência apaga o direito de publicar", () => {
  const raiz = areia();
  try {
    const hash = comRascunho(raiz, "{ \"a\": 1 }");
    comConferencia(raiz, { verde: true, hashVerde: hash });
    assert.equal(podePublicar("N1-KPK", raiz).pode, true, "verde e intacto: publica");

    comRascunho(raiz, "{ \"a\": 2 }");
    const r = podePublicar("N1-KPK", raiz);
    assert.equal(r.pode, false);
    assert.match(String(r.motivo), /mudou depois da conferência/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("rascunho que sumiu (promovido por fora) não publica", () => {
  const raiz = areia();
  try {
    const hash = comRascunho(raiz, "{}");
    comConferencia(raiz, { verde: true, hashVerde: hash });
    rmSync(path.join(raiz, "content/rascunhos/lessons/N1-KPK.json"));
    assert.match(String(podePublicar("N1-KPK", raiz).motivo), /não há rascunho aberto/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("estado de conferência ilegível é lido como nenhuma conferência", () => {
  const raiz = areia();
  try {
    escreverAtomico(path.join(raiz, ".editor/gate/N1-KPK.json"), "{ pela metade");
    assert.equal(ultimaConferencia("N1-KPK", raiz), null);
    assert.equal(podePublicar("N1-KPK", raiz).pode, false);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("com o editor desligado, nem conferir nem publicar", async () => {
  const raiz = areia();
  try {
    await assert.rejects(
      () => conferir("N1-KPK", { raiz, env: { NODE_ENV: "production" } }),
      /desligado/,
    );
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
