import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { TODAS_AS_FALAS } from "./falas.ts";
import { lessonSchema } from "./schema.ts";
import {
  DOC_DA_VOZ,
  emFrases,
  emPalavras,
  falasDaAula,
  lerRegua,
  reprovacoes,
  usaProibida,
  type Fala,
} from "./voz.ts";

/**
 * A régua editorial de `docs/VOZ-DO-CURSO.md`, cobrada por máquina.
 *
 * O repositório já trata régua de conteúdo como coisa que uma máquina cobra —
 * é o que `scripts/validate-content.ts` faz com proveniência e tablebase. A
 * diferença é o que se mede: lá é xadrez e direito autoral, aqui é o texto que
 * a criança de 11 anos lê.
 *
 * **Este teste não tem número próprio.** Os três tetos saem do documento, e
 * mudar a régua é editar o bloco ```json voz``` da §3 de lá.
 */

const raiz = process.cwd();
const regua = lerRegua(raiz);

const aulas = readdirSync(path.join(raiz, "content/lessons"))
  .filter((f) => f.endsWith(".json"))
  .map((f) =>
    lessonSchema.parse(
      JSON.parse(readFileSync(path.join(raiz, "content/lessons", f), "utf8")),
    ),
  );

/** A mensagem que quem reescreve lê: onde, por quê, e o texto inteiro. */
function relatorio(falas: Fala[]): string {
  const achados = reprovacoes(falas, regua);
  if (achados.length === 0) return "";
  return [
    `${achados.length} texto(s) fora da régua de ${DOC_DA_VOZ}:`,
    ...achados.map((r) => `  · ${r.onde} — ${r.regra}: ${r.detalhe}\n    "${r.texto}"`),
  ].join("\n");
}

test("a régua vem do documento, e ela existe", () => {
  assert.ok(regua.falaMaxCaracteres > 0, "teto de caracteres por fala");
  assert.ok(regua.fraseMaxPalavras > 0, "teto de palavras por frase");
  assert.ok(regua.proibidas.length > 0, "a lista de palavras de bastidor");
});

test("emFrases: o ponto fecha frase e o travessão não", () => {
  assert.deepEqual(emFrases("O rei vai a c7. O peão anda."), ["O rei vai a c7.", "O peão anda."]);
  assert.deepEqual(emFrases("O peão anda — e anda duas casas."), [
    "O peão anda — e anda duas casas.",
  ]);
});

test("emPalavras não conta pontuação solta", () => {
  assert.equal(emPalavras("O peão anda — e anda duas casas.").length, 7);
});

test("a palavra proibida pega o plural e o acento, e não pega quem a contém", () => {
  assert.equal(usaProibida("Siga o método da aula.", "método"), true);
  assert.equal(usaProibida("SIGA O METODO DA AULA.", "método"), true);
  assert.equal(usaProibida("Os métodos da casa.", "método"), true);
  assert.equal(usaProibida("O objeto está na mesa.", "teto"), false, "teto não mora em objeto");
});

test("toda aula de content/lessons/ cabe na régua da voz", () => {
  assert.ok(aulas.length > 0, "não achei aula nenhuma para medir");
  // `assert.ok` e não `assert.equal("")`: o relatório já é a mensagem, e o
  // diff de igualdade a imprimiria uma segunda vez, inteira, ao lado dela.
  const problema = relatorio(aulas.flatMap(falasDaAula));
  assert.ok(problema === "", problema);
});

/**
 * A outra metade da voz: o que o motor diz e não vem do arquivo da aula.
 *
 * Era a metade que ninguém cobrava, e era justamente onde o vocabulário de
 * bastidor tinha vazado para a tela — "o teto de N lances acabou", "tentativa
 * 2", "passada", "Etapa concluída.". Ver o cabeçalho de `falas.ts`.
 */
test("toda fala do motor de aula cabe na régua da voz", () => {
  assert.ok(TODAS_AS_FALAS.length > 20, "a varredura precisa cobrir o módulo inteiro");
  const problema = relatorio(TODAS_AS_FALAS);
  assert.ok(problema === "", problema);
});
