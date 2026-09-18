import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const cursos = [
  ["AB-BRANCAS-ESCOCESA-B", "estudo-brancas-escocesa.pgn"],
  ["AB-BRANCAS-FRANCESA-B", "estudo-brancas-francesa.pgn"],
  ["AB-PRETAS-SICILIANA-B", "estudo-pretas-siciliana.pgn"],
] as const;

test("a aula B chama as vantagens menores de imprecisões", () => {
  for (const [aulaId, estudo] of cursos) {
    const pasta = path.join("content", "aulas-v2", aulaId);
    const ativa = JSON.parse(readFileSync(path.join(pasta, "ativa.json"), "utf8"));
    const pacote = JSON.parse(
      readFileSync(path.join(pasta, "publicacoes", `${ativa.publicationId}.json`), "utf8"),
    );
    const fonte = readFileSync(path.join("content", "repertorio", "rascunhos", estudo), "utf8");

    assert.match(pacote.aula.titulo, /aula B: Imprecisões e punições$/);
    assert.equal(pacote.aula.capitulos[0].secao?.titulo, "Imprecisões e punições");
    assert.match(fonte, /\[SECAO\] Imprecisões e punições \| como responder/);
  }
});
