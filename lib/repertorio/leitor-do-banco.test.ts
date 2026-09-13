import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { criarLeitorDoBanco } from "./leitor-do-banco.ts";

/**
 * O cache do banco de linhas segue o disco — D4 da fatia 8.
 *
 * Antes, o cache valia pela vida do processo: **Aplicar** no editor do repertório
 * reescrevia `public/repertorio/` e o aluno continuava lendo o texto velho até alguém
 * reiniciar o `next dev`.
 */

function pasta(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), "leitor-do-banco-"));
  cpSync("public/repertorio", raiz, { recursive: true });
  return raiz;
}

/** Reescreve um arquivo e empurra a data para frente: dois writes no mesmo ms não se distinguem. */
function reescrever(caminho: string, texto: string, segundos: number): void {
  writeFileSync(caminho, texto);
  const quando = new Date(Date.now() + segundos * 1000);
  utimesSync(caminho, quando, quando);
}

test("reescrever o JSON de uma abertura muda a leitura sem criar outro leitor", async () => {
  const raiz = pasta();
  try {
    const leitor = criarLeitorDoBanco(raiz);
    const antes = await leitor.linhasDaAbertura("brancas", "alapin");
    assert.equal(await leitor.linhasDaAbertura("brancas", "alapin"), antes, "sem mudança em disco, a mesma leitura guardada");

    const arquivo = path.join(raiz, "brancas", "alapin.json");
    const texto = readFileSync(arquivo, "utf8");
    reescrever(arquivo, texto.replace("Abrimos sempre com 1.e4", "Abrimos SEMPRE com 1.e4"), 5);

    const depois = await leitor.linhasDaAbertura("brancas", "alapin");
    assert.match(depois[0].comentarios["0"], /^Abrimos SEMPRE/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("reescrever o index.json muda a leitura sem criar outro leitor", async () => {
  const raiz = pasta();
  try {
    const leitor = criarLeitorDoBanco(raiz);
    assert.equal((await leitor.lerIndice()).length, 11);
    const indice = JSON.parse(readFileSync(path.join(raiz, "index.json"), "utf8")) as unknown[];
    reescrever(path.join(raiz, "index.json"), `${JSON.stringify(indice.slice(1), null, 2)}\n`, 5);
    assert.equal((await leitor.lerIndice()).length, 10);
    assert.equal(await leitor.aberturaNoIndice("brancas", "alapin"), null);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("leitura que falha não fica guardada", async () => {
  const raiz = pasta();
  try {
    const leitor = criarLeitorDoBanco(raiz);
    const arquivo = path.join(raiz, "index.json");
    const bom = readFileSync(arquivo, "utf8");
    reescrever(arquivo, "{ quebrado", 5);
    await assert.rejects(leitor.lerIndice());
    reescrever(arquivo, bom, 10);
    assert.equal((await leitor.lerIndice()).length, 11);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
