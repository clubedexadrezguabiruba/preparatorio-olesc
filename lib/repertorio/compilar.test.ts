import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { compilarRepertorio, diferencasDoCompilado } from "./compilar.ts";
import { escreverCompilado, lerCompilado, lerFontesDoRepertorio } from "./compilar-em-disco.ts";
import { notas } from "./conteudo.ts";

/**
 * A compilação pura, e o `--check` que compara com o disco.
 *
 * O primeiro teste é o que faltava ao portão: até a fatia 8, `--check` compilava e
 * saía verde sem abrir `public/repertorio/`. Este teste abre, e reprova o JSON que
 * diverge da fonte — que é o estado em que o repositório estava em 13/9/2026.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const ORIGEM = path.join(RAIZ, "content", "repertorio");
const DESTINO = path.join(RAIZ, "public", "repertorio");

const fontes = lerFontesDoRepertorio(ORIGEM);
const compilacao = compilarRepertorio(fontes, notas());

test("os onze PGN do curso compilam sem problema", () => {
  assert.equal(fontes.length, 11);
  assert.deepEqual(compilacao.problemas, []);
  assert.equal(compilacao.saida.size, 12, "onze aberturas mais o index.json");
});

test("o compilado em public/repertorio/ é byte a byte o que a fonte produz", () => {
  assert.deepEqual(diferencasDoCompilado(compilacao.saida, lerCompilado(DESTINO)), []);
});

test("a comparação acusa arquivo desatualizado, faltando e sobrando", () => {
  const pasta = mkdtempSync(path.join(tmpdir(), "repertorio-compilado-"));
  try {
    escreverCompilado(pasta, compilacao.saida);
    assert.deepEqual(diferencasDoCompilado(compilacao.saida, lerCompilado(pasta)), []);

    const alapin = compilacao.saida.get("brancas/alapin.json")!;
    writeFileSync(path.join(pasta, "brancas", "alapin.json"), alapin.replace("\n", "\r\n"));
    rmSync(path.join(pasta, "pretas", "colle.json"));
    writeFileSync(path.join(pasta, "pretas", "outras.json"), "[]\n");

    assert.deepEqual(diferencasDoCompilado(compilacao.saida, lerCompilado(pasta)), [
      "public/repertorio/brancas/alapin.json: desatualizado",
      "public/repertorio/pretas/colle.json: falta",
      "public/repertorio/pretas/outras.json: sobrando",
    ]);

    // Escrever de novo conserta os três, inclusive apagando o que sobrou.
    escreverCompilado(pasta, compilacao.saida);
    assert.deepEqual(diferencasDoCompilado(compilacao.saida, lerCompilado(pasta)), []);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test("candidato que não passa na régua não produz saída nenhuma", () => {
  // Apaga o comentário do primeiro lance da Alapin: um lance nosso mudo.
  const candidatas = fontes.map((f) =>
    f.nome === "brancas-alapin.pgn" ? { ...f, texto: f.texto.replace(/1\. e4 \{[^}]*\}/, "1. e4") } : f,
  );
  const reprovada = compilarRepertorio(candidatas, notas());
  assert.ok(reprovada.problemas.some((p) => p.includes("sem comentário")), reprovada.problemas.join("\n"));
  assert.equal(reprovada.saida.size, 0);
  assert.match(reprovada.placar, /^Fechamento:/, "o placar sai mesmo quando reprova");
});

test("abertura que sai do repertório reprova a nota de princípios que apontava para ela", () => {
  const semAlapin = fontes.filter((f) => f.nome !== "brancas-alapin.pgn");
  const apontam = notas().filter((n) => n.cor === "brancas" && n.abertura === "alapin");
  assert.ok(apontam.length > 0, "o corpus tem nota que aponta para a Alapin");
  const resultado = compilarRepertorio(semAlapin, notas());
  assert.ok(resultado.problemas.some((p) => p.includes("brancas/alapin")));
});
