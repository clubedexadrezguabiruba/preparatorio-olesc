import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { BLOCOS, TEMAS } from "./blocos.ts";
import { validarTemas } from "./temas.ts";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

function lerConteudo(): unknown {
  return JSON.parse(readFileSync(path.join(RAIZ, "content/temas.json"), "utf8"));
}

test("o conteúdo dos temas passa no esquema", () => {
  // Este é o `validate:content` do plano. Ele roda no `npm test`, que roda na
  // CI: conteúdo quebrado reprova antes do deploy, não no celular do aluno.
  assert.doesNotThrow(() => validarTemas(lerConteudo()));
});

test("todo tema escrito existe no currículo", () => {
  // O caminho de erro real é o erro de digitação: escrever `hangingPieces` no
  // JSON produziria um tema com texto e sem puzzle nenhum — e a página em
  // branco só apareceria com o aluno na frente dela.
  const conhecidas = new Set(TEMAS.map((t) => t.tag));
  for (const tema of validarTemas(lerConteudo())) {
    assert.ok(conhecidas.has(tema.tag), `a tag "${tema.tag}" não está em blocos.ts`);
  }
});

test("os blocos do Sábado 1 estão inteiros", () => {
  // Blocos 1 e 2 são o que o Sábado 1 usa. Faltar um tema aqui é o sábado com
  // um cartão que não abre.
  const escritas = new Set(validarTemas(lerConteudo()).map((t) => t.tag));
  for (const bloco of BLOCOS.filter((b) => b.sabado === 1)) {
    for (const tema of bloco.temas) {
      assert.ok(escritas.has(tema.tag), `falta o texto de "${tema.tag}" (bloco ${bloco.id})`);
    }
  }
});

test("conteúdo quebrado estoura com o caminho do problema", () => {
  assert.throws(
    () => validarTemas([{ tag: "fork", explicacao: [], procure: ["curto"] }]),
    /content\/temas\.json/,
  );
});
