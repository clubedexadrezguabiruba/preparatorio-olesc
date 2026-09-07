import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { lancesDescritivos, lerPartida, normalizar } from "./descritiva.ts";
import {
  problemasEntreDicas,
  semelhancaDePosicoes,
  problemasDoTreino,
  saldoDeMaterial,
  validarDicas,
  type Dica,
} from "./dicas.ts";
import { respostaDaTarefa, tarefaPorId, MAPA } from "./exercicios.ts";
import { porta1 } from "./portas.ts";

/**
 * O treino do meio-jogo: o conteúdo curado, e o gate que o recusa quando torto.
 *
 * A disciplina é a de `exercicios.test.ts`: **caso favorável e caso
 * adversarial**. O favorável roda sobre o conteúdo de verdade — toda posição de
 * treino publicada tem de devolver, no juiz, exatamente a resposta escrita nela.
 * O adversarial constrói de propósito cada defeito que a revisão previu e cobra
 * que `problemasDoTreino` o nomeie.
 *
 * O adversarial é o que importa. Um gate que só foi visto passar é um gate que
 * ninguém sabe se reprova, e o dia em que ele deixar de reprovar é o dia em que
 * um item errado entra no conteúdo sem ninguém ver.
 */

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

const DICAS = validarDicas(
  JSON.parse(readFileSync(path.join(RAIZ, "content/meio-jogo.json"), "utf8")),
);

const COM_TREINO = DICAS.filter((d) => d.treino !== null);

/* ------------------------------------------------------------------ *
 * O conteúdo publicado
 * ------------------------------------------------------------------ */

test("o conteúdo publicado não tem nenhum problema de treino", () => {
  for (const dica of DICAS) {
    const problemas = problemasDoTreino(dica);
    assert.deepEqual(
      problemas,
      [],
      `${dica.id}: ${problemas.map((p) => `${p.codigo} — ${p.mensagem}`).join(" | ")}`,
    );
  }
});

test("a resposta escrita em cada item é a que o juiz do clique devolve", () => {
  // A mesma conferência que o gate faz, rodada aqui porque este é o teste que
  // roda em toda quinta: se `respostaDaTarefa` mudar de critério, o conteúdo
  // publicado reprova no `npm test` antes de reprovar na tela do aluno.
  let itens = 0;
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.reconhecimento ?? []) {
      const tarefa = tarefaPorId(item.tarefa);
      assert.ok(tarefa, `${item.id}: tarefa "${item.tarefa}" não existe`);
      assert.deepEqual(
        respostaDaTarefa(item.fen, tarefa, item.lado),
        [...item.resposta].sort(),
        `${item.id}: a resposta escrita não é a do juiz`,
      );
      itens += 1;
    }
  }
  console.log(`  meio-jogo: ${itens} item(ns) de reconhecimento conferidos pelo juiz`);
});

test("toda posição de treino está quieta — a porta 1 re-rodada", () => {
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.reconhecimento ?? []) {
      assert.equal(porta1(item.fen), null, `${item.id} reprova na porta 1`);
      assert.equal(item.curadoria.portas.porta1, "passou");
    }
  }
});

test("a tarefa de cada item é a que o MAPA dá à dica", () => {
  for (const dica of COM_TREINO) {
    const noMapa = MAPA.find((n) => n.dica === dica.id);
    for (const item of dica.treino?.reconhecimento ?? []) {
      assert.equal(item.tarefa, noMapa?.tarefa, `${item.id} usa tarefa fora do mapa`);
    }
  }
});

test("nenhuma legenda de item entrega a casa da resposta", () => {
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.reconhecimento ?? []) {
      for (const casa of item.resposta) {
        assert.ok(
          !new RegExp(`\\b${casa}\\b`).test(item.legenda),
          `${item.id}: a legenda cita "${casa}"`,
        );
      }
    }
  }
});

test("nenhuma FEN de treino repete uma FEN de ensino", () => {
  // Repetir a posição do exemplo como exercício seria testar memória da tela
  // anterior, e o registro contaria isso como reconhecimento.
  const doEnsino = new Set(DICAS.flatMap((d) => d.posicoes.map((p) => p.fen)));
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.reconhecimento ?? []) {
      assert.ok(!doEnsino.has(item.fen), `${item.id} usa a FEN de uma posição de ensino`);
    }
  }
});

/* ------------------------------------------------------------------ *
 * O caso adversarial: cada defeito, construído de propósito
 * ------------------------------------------------------------------ */

/** Um treino de m12 sadio, para os testes o estragarem de um jeito por vez. */
function m12Sadio(): Dica {
  const dica = DICAS.find((d) => d.id === "m12");
  assert.ok(dica?.treino, "m12 precisa ter treino para este teste existir");
  return JSON.parse(JSON.stringify(dica)) as Dica;
}

/** Os códigos que `problemasDoTreino` devolve para uma dica. */
const codigos = (dica: Dica): string[] => problemasDoTreino(dica).map((p) => p.codigo);

test("adversarial: a resposta que o juiz desmente reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].resposta = ["e5"];
  assert.ok(codigos(dica).includes("RESPOSTA_DESMENTIDA"), codigos(dica).join(","));
});

test("adversarial: a posição com duas respostas certas reprova", () => {
  // O defeito que a tela mostraria como "acertei e o site disse que errei".
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].fen = "4k3/8/8/8/8/8/P1P5/4K3 w - - 0 1";
  dica.treino!.reconhecimento[0].lado = "brancas";
  dica.treino!.reconhecimento[0].resposta = ["a2"];
  assert.ok(codigos(dica).includes("POSICAO_SEM_RESPOSTA_UNICA"), codigos(dica).join(","));
});

test("adversarial: a legenda que cita a casa da resposta reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].legenda = "As brancas jogam; repare no peão preto de d5.";
  assert.ok(codigos(dica).includes("LEGENDA_ENTREGA"), codigos(dica).join(","));
});

test("adversarial: o apoio que não acende a resposta reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].apoio.realce = ["a6", "b5", "f7", "g7"];
  assert.ok(codigos(dica).includes("APOIO_NAO_CONTEM_A_RESPOSTA"), codigos(dica).join(","));
});

test("adversarial: o apoio que **é** a resposta reprova", () => {
  // O nível 2 vira o nível 3: acender só a casa certa não estreita o campo,
  // entrega o exercício — e o registro contaria como "resolvido com apoio 2".
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].apoio.realce = ["d5"];
  assert.ok(codigos(dica).includes("APOIO_E_A_RESPOSTA"), codigos(dica).join(","));
});

test("adversarial: a posição guiada da mesma obra do exemplo reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].provenance.editionFile = dica.posicoes[0].provenance.editionFile;
  assert.ok(codigos(dica).includes("GUIADA_DA_MESMA_OBRA"), codigos(dica).join(","));
});

test("adversarial: duas edições do mesmo livro contam como a mesma obra", () => {
  // `capablanca-1921` e `capablanca-fundamentals-reimpressao` são dois PDFs de
  // um livro só. Comparar as strings deixaria a regra passar por cima do
  // próprio motivo dela.
  const dica = m12Sadio();
  dica.posicoes[0].provenance.editionFile = "capablanca-fundamentals-reimpressao";
  assert.ok(codigos(dica).includes("GUIADA_DA_MESMA_OBRA"), codigos(dica).join(","));
});

test("adversarial: o item do degrau 3 sem partida reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[2].provenance.originalGame = null;
  assert.ok(codigos(dica).includes("INDEPENDENTE_SEM_PARTIDA"), codigos(dica).join(","));
});

test("adversarial: a posição em xeque reprova na porta 1", () => {
  const dica = m12Sadio();
  // Rei preto em e8 com a dama branca colada em e7: a porta 1 recusa antes de
  // qualquer outra conferência, porque numa posição em xeque o lance urgente é
  // o xeque, e não a estrutura que a pergunta manda procurar.
  dica.treino!.reconhecimento[2].fen = "4k3/4Q3/8/8/8/8/P1P5/4K3 b - - 0 1";
  assert.ok(codigos(dica).includes("PORTA_1"), codigos(dica).join(","));
});

test("adversarial: material desigual sem a frase que o declara reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[2].material = null;
  assert.ok(codigos(dica).includes("MATERIAL_CALADO"), codigos(dica).join(","));
});

test("adversarial: os degraus fora da ordem 2-2-3 reprovam", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].degrau = 3;
  assert.ok(codigos(dica).includes("DEGRAUS_FORA_DE_ORDEM"), codigos(dica).join(","));
});

test("adversarial: a aplicação em outra posição reprova", () => {
  const dica = m12Sadio();
  dica.treino!.aplicacao.usa = "m12-d3-z";
  assert.ok(codigos(dica).includes("APLICACAO_EM_OUTRA_POSICAO"), codigos(dica).join(","));
});

test("adversarial: o gabarito com duas certas, ou nenhuma, reprova", () => {
  const dica = m12Sadio();
  dica.treino!.aplicacao.opcoes[1].certa = true;
  assert.ok(codigos(dica).includes("GABARITO_AMBIGUO"), codigos(dica).join(","));
  dica.treino!.aplicacao.opcoes[0].certa = false;
  dica.treino!.aplicacao.opcoes[1].certa = false;
  assert.ok(codigos(dica).includes("GABARITO_AMBIGUO"), codigos(dica).join(","));
});

test("adversarial: treino numa dica sem tarefa no mapa reprova", () => {
  const dica = m12Sadio();
  dica.id = "m2"; // `m2` é julgamento puro: o MAPA não lhe dá tarefa.
  assert.ok(codigos(dica).includes("TREINO_SEM_TAREFA"), codigos(dica).join(","));
});

/* ------------------------------------------------------------------ *
 * O saldo de material
 * ------------------------------------------------------------------ */

test("o saldo de material conta o que a legenda precisa declarar", () => {
  assert.equal(saldoDeMaterial("4k3/8/8/8/8/8/8/4K3 w - - 0 1"), 0);
  assert.equal(saldoDeMaterial("4k3/8/8/8/8/8/P7/4K3 w - - 0 1"), 1);
  assert.equal(saldoDeMaterial("3qk3/8/8/8/8/8/8/4K3 w - - 0 1"), -9);
  // O rei não entra: ele está sempre nos dois lados, e somá-lo não muda nada.
  assert.equal(saldoDeMaterial("4k3/8/8/8/8/8/8/R3K3 w - - 0 1"), 5);
});

/* ------------------------------------------------------------------ *
 * A leitura da notação descritiva
 * ------------------------------------------------------------------ */

test("favorável: os 26 lances impressos da Marshall–Capablanca de 1909 leem", () => {
  const tokens =
    "P-Q4 P-Q4 P-QB4 P-K3 Kt-QB3 Kt-KB3 B-Kt5 B-K2 P-K3 Kt-K5 BxB QxB B-Q3 KtxKt PxKt Kt-Q2 Kt-B3 Castles PxP PxP Q-Kt3 Kt-B3 P-QR4 P-QB4 Q-R3 P-QKt3".split(
      " ",
    );
  const lido = lerPartida(tokens);
  assert.equal(lido.parou, null, `parou em ${JSON.stringify(lido.parou)}`);
  assert.equal(lido.leiturasPossiveis, 1, "a partida admite mais de uma leitura");
  assert.equal(
    lido.fens.at(-1),
    "r1b2rk1/p3qppp/1p3n2/2pp4/P2P4/Q1PBPN2/5PPP/R3K2R w KQ - 0 14",
    "a posição do diagrama da p. 161 não bate",
  );
});

test("as fileiras contam do lado de quem joga, as colunas não", () => {
  // `P-Q4` é d4 para as brancas e d5 para as pretas: a mesma casa tem dois
  // nomes, e trocar isso produziria uma partida inteira plausível e falsa.
  const jogo = new Chess();
  assert.deepEqual(lancesDescritivos(jogo, "P-Q4"), { sans: ["d4"] });
  jogo.move("d4");
  assert.deepEqual(lancesDescritivos(jogo, "P-Q4"), { sans: ["d5"] });
});

test("a captura nomeia a peça, e o peão é nomeado pela coluna", () => {
  const jogo = new Chess("rnbqkbnr/ppp2ppp/8/3pp3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 3");
  // `PxKP` — o peão toma o peão do rei, que é o da coluna e.
  assert.deepEqual(lancesDescritivos(jogo, "P x K P"), { sans: ["dxe5"] });
  // `PxQP` na mesma posição não é lance legal: nenhum peão branco toma em d5.
  assert.deepEqual(lancesDescritivos(jogo, "P x Q P"), { sans: [] });
});

test("adversarial: a ambiguidade que sobra é declarada, e não escolhida", () => {
  // Na defesa francesa, `B-Kt5` no quarto lance casa com Bg5 e com Bb5+ — as
  // duas legais —, e escolher a mais provável inventaria uma partida.
  const jogo = new Chess();
  for (const san of ["e4", "e6", "d4", "d5", "Nc3", "Nf6"]) jogo.move(san);
  const lido = lancesDescritivos(jogo, "B - Kt 5");
  assert.ok("sans" in lido && lido.sans.length === 2, JSON.stringify(lido));
  assert.deepEqual("sans" in lido ? [...lido.sans].sort() : [], ["Bb5+", "Bg5"]);
});

test("adversarial: a ambiguidade que a continuação resolve é resolvida", () => {
  // A mesma `B-Kt5` da francesa, agora com a continuação impressa: `B-K2` não
  // responde ao xeque do ramo do Bb5, e esse ramo morre sozinho — sem ninguém
  // ter de decidir qual era o "mais provável".
  const lido = lerPartida("P-K4 P-K3 P-Q4 P-Q4 Kt-QB3 Kt-KB3 B-Kt5 B-K2".split(" "));
  assert.equal(lido.parou, null, JSON.stringify(lido.parou));
  assert.deepEqual(lido.sans, ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "Bg5", "Be7"]);
});

test("adversarial: o lance ilegal para a leitura, e diz onde", () => {
  const lido = lerPartida("P-Q4 P-Q4 P-K5".split(" "));
  assert.equal(lido.leiturasPossiveis, 0);
  assert.equal(lido.parou?.emQue, 2);
  assert.match(lido.parou?.erro ?? "", /não é lance legal|nenhum lance legal/);
});

test("a normalização tira anotação e conserta o sinal de captura do OCR", () => {
  assert.equal(normalizar("Kt ? P !"), "KTXP");
  assert.equal(normalizar("B - B 7 ch"), "B-B7");
  assert.equal(normalizar("P - Q 4"), "P-Q4");
  assert.equal(normalizar("Resigns."), "RESIGNS");
});

/* ------------------------------------------------------------------ *
 * O capítulo dividido entre dicas
 * ------------------------------------------------------------------ */

test("nenhum par de posições de treino passa do teto de semelhança", () => {
  const problemas = problemasEntreDicas(DICAS);
  assert.deepEqual(problemas, [], problemas.map((p) => `${p.onde}: ${p.mensagem}`).join(" | "));
});

test("a semelhança é medida por peça na mesma casa, sobre a posição mais cheia", () => {
  const a = "r1b2rk1/p3qppp/1p3n2/2pp4/P2P4/Q1PBPN2/5PPP/R3K2R w KQ - 0 14";
  assert.equal(semelhancaDePosicoes(a, a), 1);
  // Nada em comum: dois reis em casas diferentes.
  assert.equal(semelhancaDePosicoes("4k3/8/8/8/8/8/8/4K3 w - - 0 1", "8/4k3/8/8/8/8/4K3/8 w - - 0 1"), 0);
  // Metade em comum, e o denominador é a posição mais cheia.
  const um = "4k3/8/8/8/8/8/P7/4K3 w - - 0 1";
  const dois = "4k3/8/8/8/8/8/P1P5/4K3 w - - 0 1";
  assert.equal(Math.round(semelhancaDePosicoes(um, dois) * 100), 75);
});

test("adversarial: duas posições quase iguais reprovam", () => {
  // O defeito que eu quase publiquei na parada 3, agora medido em vez de
  // adivinhado pela bibliografia: m9-d2-a e m10-d2-a saíam da mesma partida do
  // Capablanca, a sete meios-lances de distância — 77% das peças nas mesmas
  // casas. As duas passavam no teto por capítulo, que conta por dica.
  const m9 = DICAS.find((d) => d.id === "m9");
  const m10 = DICAS.find((d) => d.id === "m10");
  assert.ok(m9?.treino && m10?.treino);
  const copia = JSON.parse(JSON.stringify([m9, m10])) as Dica[];
  copia[1].treino!.reconhecimento[0].fen = copia[0].treino!.reconhecimento[0].fen;
  const problemas = problemasEntreDicas(copia);
  assert.ok(
    problemas.some((p) => p.codigo === "POSICOES_QUASE_IGUAIS"),
    JSON.stringify(problemas),
  );
});

test("adversarial: posições de treino além do teto do capítulo reprovam", () => {
  // O teto do módulo, e não o da dica: quatro dicas tirando uma posição cada da
  // mesma partida esvaziam o capítulo sem estourar nenhum teto por dica.
  const dicas = ["m9", "m10", "m11", "m12"].map((id) => {
    const d = JSON.parse(JSON.stringify(DICAS.find((x) => x.id === id))) as Dica;
    d.treino!.reconhecimento[0].provenance.editionFile = "capablanca-1921";
    d.treino!.reconhecimento[0].provenance.capitulo = "Illustrative Games — Game 7";
    return d;
  });
  const problemas = problemasEntreDicas(dicas);
  assert.ok(
    problemas.some((p) => p.codigo === "CAPITULO_DRENADO"),
    JSON.stringify(problemas),
  );
});

test("duas posições do mesmo capítulo, em dicas diferentes, passam se forem diferentes", () => {
  // A regra nova permite o que a antiga proibia: mesma partida, tabuleiros
  // distintos. É por isso que ela existe — o critério é o que o aluno vê.
  const m9 = DICAS.find((d) => d.id === "m9");
  const m12 = DICAS.find((d) => d.id === "m12");
  const copia = JSON.parse(JSON.stringify([m9, m12])) as Dica[];
  const cap = "Illustrative Games — Game 7";
  copia[0].treino!.reconhecimento[0].provenance.capitulo = cap;
  copia[1].treino!.reconhecimento[0].provenance.capitulo = cap;
  copia[0].treino!.reconhecimento[0].provenance.editionFile = "capablanca-1921";
  copia[1].treino!.reconhecimento[0].provenance.editionFile = "capablanca-1921";
  assert.deepEqual(problemasEntreDicas(copia), []);
});

/* ------------------------------------------------------------------ *
 * O corte da §5, declarado
 * ------------------------------------------------------------------ */

test("adversarial: guiada de partida real sem exceção escrita reprova", () => {
  const dica = m12Sadio();
  const item = dica.treino!.reconhecimento[0];
  item.provenance.capitulo = null;
  item.provenance.originalGame = "lichess.org/training/xxxxx";
  item.provenance.editionFile = "lichess-open-database";
  assert.ok(codigos(dica).includes("GUIADA_SEM_CAPITULO"), codigos(dica).join(","));
});

test("a guiada de partida real passa quando a exceção está escrita", () => {
  // O corte que a §5 prevê — "cai uma das duas posições guiadas antes de cair a
  // independente" — existe para o conceito cujo acervo não tem dois diagramas.
  // Ele é permitido; o que não é permitido é ele acontecer calado.
  const dica = m12Sadio();
  const item = dica.treino!.reconhecimento[0];
  item.provenance.capitulo = null;
  item.provenance.originalGame = "lichess.org/training/xxxxx";
  item.provenance.editionFile = "lichess-open-database";
  item.excecaoDeFonte =
    "O acervo não tem um segundo diagrama deste conceito em obra diferente da do exemplo, e a §5 manda cortar a guiada antes da independente.";
  assert.deepEqual(codigos(dica), []);
});

test("adversarial: exceção declarada numa posição que veio de livro reprova", () => {
  const dica = m12Sadio();
  dica.treino!.reconhecimento[0].excecaoDeFonte =
    "Uma justificativa longa o bastante para o esquema aceitar, e sem motivo nenhum para existir.";
  assert.ok(codigos(dica).includes("EXCECAO_SEM_EXCECAO"), codigos(dica).join(","));
});

test("adversarial: exceção declarada no degrau 3 reprova", () => {
  // No degrau 3 partida real é a regra, e não a exceção — declarar uma ali é
  // sinal de que quem escreveu não entendeu qual dos dois degraus estava
  // preenchendo.
  const dica = m12Sadio();
  dica.treino!.reconhecimento[2].excecaoDeFonte =
    "Uma justificativa longa o bastante para o esquema aceitar, no degrau errado.";
  assert.ok(codigos(dica).includes("EXCECAO_NO_DEGRAU_3"), codigos(dica).join(","));
});
