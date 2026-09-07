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

test("as nove notas estão escritas, na ordem de quanto o aluno vai encontrar", () => {
  // A ordem do arquivo é a ordem da tela, e ela é por frequência. As cinco
  // primeiras são posições que o aluno encontra o tempo todo e que não rendem
  // sequência para decorar; as quatro últimas são as raras do ⚠12.
  //
  // Eram cinco até 7/9/2026. A poda da §23 de `docs/REVISAO-FONTES.md` trouxe
  // quatro: a Escocesa depois de 5.Dxd4 (quatro respostas dele e nenhuma
  // dominante), a Alapin depois de 2.c3, a Francesa depois de 3.Bd3 — onde a
  // própria fonte oferece três lances e não escolhe nenhum — e as outras
  // primeiras, que absorveram a abertura `pretas/outras` inteira.
  assert.deepEqual(notas.map((n) => n.slug), [
    "bispo-em-c4",
    "escocesa-dama-em-d4",
    "alapin-centro-grande",
    "francesa-bd3",
    "outras-primeiras",
    "pirc",
    "nimzowitsch",
    "alekhine",
    "owen",
  ]);
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
      // Um lance basta, e a exigência de dois caiu em 7/9/2026. A nota
      // `outras-primeiras` cobre 1.c4, 1.Cf3, 1.b3, 1.f4 e 1.g3: ali o PRIMEIRO
      // lance dele já é a posição inteira, e escrever um segundo seria inventar
      // uma resposta nossa que a página justamente não quer fixar. O que a nota
      // não pode é ficar vazia — e quem prova que ela para no lugar certo é o
      // teste seguinte, que confere de quem é a vez.
      assert.ok(jogo.history().length >= 1, `${nota.slug}: "${trecho}" não tem lance nenhum`);
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

test("nota das brancas começa por 1.e4; nota das pretas, pelo lance dele", () => {
  // Até 7/9/2026 este teste exigia 1.e4 de TODAS, e a razão escrita era que o
  // clube abre 1.e4 e que a Siciliana é a resposta a ele. A premissa caiu na
  // poda da §23: a nota `outras-primeiras` cobre 1.c4, 1.Cf3, 1.b3, 1.f4 e
  // 1.g3 — justamente as aberturas em que ELE não joga 1.e4.
  //
  // O invariante de verdade é este: quando a nota é das brancas, o primeiro
  // lance é NOSSO e só pode ser 1.e4, porque é com ele que o clube abre. Quando
  // é das pretas, o primeiro lance é dele e pode ser qualquer um.
  for (const nota of notas) {
    if (nota.cor === "brancas") {
      assert.match(nota.lances, /^1\.e4\b/, `${nota.slug} é das brancas e não abre 1.e4`);
    }
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
