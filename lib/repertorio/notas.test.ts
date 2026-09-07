import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { lancesEmPortugues, validarNotas, type Nota } from "./notas.ts";

/**
 * As cinco notas de princípios, conferidas como dado e como xadrez.
 *
 * O teste de xadrez é o que não é óbvio: o campo `lances` é texto livre para o
 * aluno ler, e um erro de digitação ali — um lance que não existe — passaria
 * pelo zod sem dizer nada e ensinaria a abertura errada.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const ARQUIVO = path.join(RAIZ, "content", "repertorio", "notas.json");

const notas: Nota[] = validarNotas(JSON.parse(readFileSync(ARQUIVO, "utf8")) as unknown);

/** Cada partida escrita no campo `lances`, já jogada. */
function partidas(nota: Nota): Chess[] {
  return nota.lances
    .split(/\(ou|\)/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((trecho) => {
      const jogo = new Chess();
      for (const bruto of trecho.split(/\s+/)) {
        const lance = bruto.replace(/^\d+\.+/, "");
        if (lance) jogo.move(lance);
      }
      return jogo;
    });
}

test("as cinco notas estão escritas, na ordem de quanto o aluno vai encontrar", () => {
  // O bispo em c4 vem primeiro de propósito: é ~31 % das sicilianas, contra
  // menos de 8 % das quatro raras somadas. A ordem do arquivo é a ordem da tela.
  assert.deepEqual(
    notas.map((n) => n.slug),
    ["bispo-em-c4", "pirc", "nimzowitsch", "alekhine", "owen"],
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

test("toda nota para na vez do aluno, e a vez bate com o campo `cor`", () => {
  // É a promessa da página: "ele acabou de jogar isto, agora é você". Uma nota
  // que parasse no lance do próprio aluno faria a lista "O que você faz"
  // começar um lance tarde — e a do bispo em c4, que é a única das pretas,
  // apareceria com o texto das brancas sem ninguém notar.
  for (const nota of notas) {
    for (const jogo of partidas(nota)) {
      const daVez = jogo.turn() === "w" ? "brancas" : "pretas";
      assert.equal(daVez, nota.cor, `${nota.slug}: "${nota.lances}" não para na vez do aluno`);
    }
  }
});

test("toda nota é uma posição de 1.e4 — é por onde o repertório do clube passa", () => {
  // Das brancas porque abrimos 1.e4; das pretas porque a Siciliana é a resposta
  // a ele. Se um dia entrar aqui uma nota de 1.d4, a página estará no lugar
  // errado.
  for (const nota of notas) {
    assert.match(nota.lances, /^1\.e4\b/, `${nota.slug} não começa por 1.e4`);
  }
});

test("a tela mostra os lances em português, e o JSON os guarda em inglês", () => {
  // As duas metades da mesma decisão: inglês no dado para a `chess.js` poder
  // conferir, português na tela porque é a notacao que o aluno escreve na
  // planilha do torneio. O `R` é a armadilha — torre em inglês, rei em
  // português —, e por isso a troca é a mesma do treinador, e não outra.
  assert.equal(
    lancesEmPortugues("1.e4 c5 2.Nf3 Nc6 3.Bc4"),
    "1.e4 c5 2.Cf3 Cc6 3.Bc4",
  );
  assert.equal(lancesEmPortugues("1.e4 d6 (ou 1.e4 g6)"), "1.e4 d6 (ou 1.e4 g6)");
  assert.equal(lancesEmPortugues("2.Qh5 Rxd8 Kg1"), "2.Dh5 Txd8 Rg1");

  for (const nota of notas) {
    assert.doesNotMatch(
      lancesEmPortugues(nota.lances),
      /(?<![A-Za-z])[NQK][a-h1-8x]/,
      `${nota.slug}: sobrou peça em inglês na tela`,
    );
  }
});

test("slug repetido é recusado", () => {
  const duas = [notas[0], { ...notas[1], slug: notas[0].slug }];
  assert.throws(() => validarNotas(duas), /têm dois "bispo-em-c4"/);
});

test("nota sem `faca` é recusada: a página inteira é essa lista", () => {
  const semLista = [{ ...notas[0], faca: [] }];
  assert.throws(() => validarNotas(semLista), /não passaram na conferência/);
});

test("nota sem `porque` é recusada: sem ele o rodapé da tela mentiria", () => {
  // O motivo de não haver linha não é o mesmo para todas — quatro saíram por
  // raridade e a do bispo em c4 por não haver teoria. Um texto fixo na tela
  // seria falso justamente para a que o aluno mais encontra.
  const semPorque: Partial<Nota> = { ...notas[0] };
  delete semPorque.porque;
  assert.throws(() => validarNotas([semPorque]), /não passaram na conferência/);
});
