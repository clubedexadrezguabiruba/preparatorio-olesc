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

test("todo tema do currículo tem texto", () => {
  /*
   * Esta é a afirmação forte, e ela só passou a ser possível quando os 36
   * temas foram escritos. Antes o teste cobrava só os blocos do Sábado 1,
   * porque era o que existia; o resto aparecia na tela como cartão tracejado
   * "Abre no Sábado N".
   *
   * Ter texto escrito **é** o que abre o tema (`lib/tatica/conteudo.ts`).
   * Então apagar a explicação de um tema não é mexer em prosa: é fechar o
   * tema para o aluno, em silêncio. É esse silêncio que este teste quebra.
   */
  const escritas = new Set(validarTemas(lerConteudo()).map((t) => t.tag));
  for (const bloco of BLOCOS) {
    for (const tema of bloco.temas) {
      assert.ok(
        escritas.has(tema.tag),
        `falta o texto de "${tema.tag}" (bloco ${bloco.id} — ${bloco.nome})`,
      );
    }
  }
  assert.equal(escritas.size, TEMAS.length, "o currículo e o conteúdo não têm o mesmo tamanho");
});

test("conteúdo quebrado estoura com o caminho do problema", () => {
  assert.throws(
    () => validarTemas([{ tag: "fork", explicacao: [], procure: ["curto"] }]),
    /content\/temas\.json/,
  );
});
