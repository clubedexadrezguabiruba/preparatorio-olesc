import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { validarNotas, type Nota } from "./notas.ts";

/**
 * As quatro notas de princípios, conferidas como dado e como xadrez.
 *
 * O teste de xadrez é o que não é óbvio: o campo `lances` é texto livre para o
 * aluno ler, e um erro de digitação ali — um lance que não existe — passaria
 * pelo zod sem dizer nada e ensinaria a abertura errada.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const ARQUIVO = path.join(RAIZ, "content", "repertorio", "notas.json");

const notas: Nota[] = validarNotas(JSON.parse(readFileSync(ARQUIVO, "utf8")) as unknown);

test("as quatro aberturas da §2.10 estão escritas", () => {
  assert.deepEqual(
    notas.map((n) => n.slug),
    ["pirc", "nimzowitsch", "alekhine", "owen"],
  );
});

test("os lances de cada nota são jogáveis de verdade", () => {
  // "1.e4 d6 (ou 1.e4 g6)" tem duas partidas dentro; cada uma tem de valer.
  for (const nota of notas) {
    for (const trecho of nota.lances.split(/\(ou|\)/).map((t) => t.trim()).filter(Boolean)) {
      const jogo = new Chess();
      for (const bruto of trecho.split(/\s+/)) {
        const lance = bruto.replace(/^\d+\.+/, "");
        if (!lance) continue;
        assert.doesNotThrow(
          () => jogo.move(lance),
          `${nota.slug}: "${lance}" não é lance legal em "${trecho}"`,
        );
      }
      assert.ok(jogo.history().length >= 2, `${nota.slug}: "${trecho}" tem menos de dois lances`);
    }
  }
});

test("toda nota começa por 1.e4 — são respostas ao nosso primeiro lance", () => {
  // Se um dia entrar aqui uma abertura de 1.d4, a página estará no lugar
  // errado: o repertório do clube abre com 1.e4.
  for (const nota of notas) {
    assert.match(nota.lances, /^1\.e4\b/, `${nota.slug} não começa por 1.e4`);
  }
});

test("slug repetido é recusado", () => {
  const duas = [notas[0], { ...notas[1], slug: notas[0].slug }];
  assert.throws(() => validarNotas(duas), /têm dois "pirc"/);
});

test("nota sem `faca` é recusada: a página inteira é essa lista", () => {
  const semLista = [{ ...notas[0], faca: [] }];
  assert.throws(() => validarNotas(semLista), /não passaram na conferência/);
});
