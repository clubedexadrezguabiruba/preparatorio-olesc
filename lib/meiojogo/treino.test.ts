import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { lancesDescritivos, lerPartida, normalizar } from "./descritiva.ts";
import {
  EXERCICIOS_ALVO,
  EXERCICIOS_PISO,
  problemasEntreDicas,
  SALTO_DA_PORTA_2,
  semelhancaDePosicoes,
  problemasDoTreino,
  saldoDeMaterial,
  validarDicas,
  type Dica,
} from "./dicas.ts";
import { MAPA } from "./exercicios.ts";
import { juizDaDica, uciDe } from "./lances.ts";
import { lancesDoItem } from "./tentativa.ts";
import { porta1 } from "./portas.ts";

/**
 * O treino do meio-jogo: o conteúdo curado, e o gate que o recusa quando torto.
 *
 * A disciplina é a de `exercicios.test.ts`: **caso favorável e caso
 * adversarial**. O favorável roda sobre o conteúdo de verdade — todo exercício
 * publicado tem de devolver, no juiz, exatamente os lances escritos nele. O
 * adversarial constrói de propósito cada defeito que a revisão previu e cobra
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

test("os lances escritos em cada item são os que o juiz devolve", () => {
  // A mesma conferência que o gate faz, rodada aqui porque este é o teste que
  // roda em toda quinta: se `lancesQueAplicam` mudar de critério, o conteúdo
  // publicado reprova no `npm test` antes de reprovar na tela do aluno.
  let itens = 0;
  for (const dica of COM_TREINO) {
    const juiz = juizDaDica(dica.id);
    assert.ok(juiz, `${dica.id}: não há juiz de lance escrito`);
    for (const item of dica.treino?.exercicios ?? []) {
      const doJuiz = juiz.lances(item.fen, item.lado);
      if (doJuiz.length > 0) {
        // Aceitos **mais** recusados: o juiz devolve todo lance que aplica o
        // tema, e os que o motor reprovou não somem — eles ganham a terceira
        // frase da tela em vez de virarem "esse não é o lance desta dica".
        assert.deepEqual(
          doJuiz,
          [...item.lancesAceitos, ...item.lancesRecusados.map((r) => r.lance)].sort(),
          `${item.id}: os lances escritos não são os do juiz`,
        );
        assert.deepEqual(
          lancesDoItem(item),
          [...item.lancesAceitos].sort(),
          `${item.id}: o juiz de tela aceita um lance que o motor reprovou`,
        );
      } else {
        assert.ok(
          item.porqueAceitos !== null,
          `${item.id}: camada autoral sem "porqueAceitos"`,
        );
      }
      itens += 1;
    }
  }
  console.log(`  meio-jogo: ${itens} exercício(s) de lance conferidos pelo juiz`);
});

test("todo lance aceito é legal, e é da vez de quem aplica o tema", () => {
  for (const dica of COM_TREINO) {
    const juiz = juizDaDica(dica.id)!;
    for (const item of dica.treino?.exercicios ?? []) {
      const jogo = new Chess(item.fen);
      assert.equal(
        jogo.turn(),
        juiz.quemJoga(item.lado) === "brancas" ? "w" : "b",
        `${item.id}: a vez não é de quem aplica o tema`,
      );
      const legais = new Set(jogo.moves({ verbose: true }).map(uciDe));
      for (const lance of item.lancesAceitos) {
        assert.ok(legais.has(lance), `${item.id}: o lance "${lance}" não é legal`);
      }
    }
  }
});

test("todo lance aceito tem número do motor, e nenhum passa do teto", () => {
  // A regra dura do plano, conferida no conteúdo: um lance que aplica o tema e
  // perde a partida ensina o contrário da dica.
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.exercicios ?? []) {
      const custos = item.curadoria.portas.custos;
      assert.equal(
        custos.length,
        item.lancesAceitos.length,
        `${item.id}: ${item.lancesAceitos.length} lance(s) e ${custos.length} número(s)`,
      );
      for (const custo of custos) {
        assert.ok(
          Math.abs(custo) <= SALTO_DA_PORTA_2,
          `${item.id}: um lance custa ${custo} centésimos, e o teto é ${SALTO_DA_PORTA_2}`,
        );
      }
    }
  }
});

test("toda posição de exercício está quieta — a porta 1 re-rodada", () => {
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.exercicios ?? []) {
      assert.equal(porta1(item.fen), null, `${item.id} reprova na porta 1`);
      assert.equal(item.curadoria.portas.porta1, "passou");
    }
  }
});

test("a tarefa de cada item é a do juiz da dica, e o juiz é o do MAPA", () => {
  for (const dica of COM_TREINO) {
    const noMapa = MAPA.find((n) => n.dica === dica.id);
    const juiz = juizDaDica(dica.id)!;
    assert.equal(juiz.id, noMapa?.tarefa, `${dica.id}: o juiz não é a tarefa do MAPA`);
    for (const item of dica.treino?.exercicios ?? []) {
      assert.equal(item.tarefa, juiz.id, `${item.id} usa tarefa fora do juiz`);
    }
  }
});

test("nenhuma legenda de item entrega a casa de chegada", () => {
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.exercicios ?? []) {
      for (const lance of item.lancesAceitos) {
        const destino = lance.slice(2, 4);
        assert.ok(
          !new RegExp(`\\b${destino}\\b`).test(item.legenda),
          `${item.id}: a legenda cita "${destino}"`,
        );
      }
    }
  }
});

test("cada dica com treino tem de dois a cinco exercícios", () => {
  for (const dica of COM_TREINO) {
    const quantos = dica.treino!.exercicios.length;
    assert.ok(
      quantos >= EXERCICIOS_PISO && quantos <= EXERCICIOS_ALVO,
      `${dica.id} tem ${quantos} exercício(s)`,
    );
  }
  const cinco = COM_TREINO.filter((d) => d.treino!.exercicios.length === EXERCICIOS_ALVO).length;
  console.log(
    `  meio-jogo: ${COM_TREINO.length} tema(s) com pelo menos ${EXERCICIOS_PISO} exercícios, ` +
      `${cinco} deles com ${EXERCICIOS_ALVO}`,
  );
});

test("nenhuma FEN de exercício repete uma FEN de ensino", () => {
  // Repetir a posição do exemplo como exercício seria testar memória da tela
  // anterior, e o registro contaria isso como aprendizado.
  const doEnsino = new Set(DICAS.flatMap((d) => d.posicoes.map((p) => p.fen)));
  for (const dica of COM_TREINO) {
    for (const item of dica.treino?.exercicios ?? []) {
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

test("adversarial: o lance que o juiz desmente reprova", () => {
  // O defeito que a tela mostraria como "joguei o lance certo e o site recusou".
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  item.lancesAceitos = [...item.lancesAceitos, "e2e4"];
  assert.ok(codigos(dica).includes("LANCES_DESMENTIDOS"), codigos(dica).join(","));
});

test("adversarial: a FEN com a vez do lado errado reprova", () => {
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  item.fen = item.fen.replace(/ (w|b) /, item.fen.includes(" w ") ? " b " : " w ");
  assert.ok(codigos(dica).includes("VEZ_DO_LADO_ERRADO"), codigos(dica).join(","));
});

test("adversarial: o lance aceito que não é legal reprova", () => {
  const dica = m12Sadio();
  dica.treino!.exercicios[0].lancesAceitos = ["a1a8"];
  assert.ok(codigos(dica).includes("LANCE_ILEGAL"), codigos(dica).join(","));
});

test("adversarial: lance aceito sem número do motor reprova", () => {
  // A regra dura sem prova é a regra dura desligada: sem o custo medido, o
  // conteúdo pode estar ensinando o contrário da dica e ninguém saberia.
  const dica = m12Sadio();
  dica.treino!.exercicios[0].curadoria.portas.custos = [];
  assert.ok(codigos(dica).includes("MOTOR_SEM_NUMERO"), codigos(dica).join(","));
});

test("adversarial: a camada autoral calada reprova", () => {
  // Uma posição em que o juiz geométrico não acha lance nenhum só pode virar
  // item se alguém escrever por que aqueles lances valem.
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  // Uma posição sem peão isolado nenhum: o juiz devolve vazio.
  item.fen = "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 b - - 0 1";
  item.lado = "brancas";
  item.lancesAceitos = ["e7e5"];
  item.porqueAceitos = null;
  assert.ok(codigos(dica).includes("CAMADA_AUTORAL_MUDA"), codigos(dica).join(","));
});

test("adversarial: justificativa ao lado de lista derivada reprova", () => {
  const dica = m12Sadio();
  dica.treino!.exercicios[0].porqueAceitos =
    "Uma justificativa longa o bastante para o esquema aceitar, e sem motivo nenhum para existir.";
  assert.ok(codigos(dica).includes("PORQUE_SOBRANDO"), codigos(dica).join(","));
});

test("adversarial: a legenda que cita a casa de chegada reprova", () => {
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  item.legenda = `As pretas jogam; a casa ${item.lancesAceitos[0].slice(2, 4)} está livre.`;
  assert.ok(codigos(dica).includes("LEGENDA_ENTREGA"), codigos(dica).join(","));
});

test("adversarial: o apoio que não acende a chegada reprova", () => {
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  item.apoio.modo = "contem";
  item.apoio.realce = ["a1", "b1", "c1"];
  assert.ok(codigos(dica).includes("APOIO_NAO_CONTEM_O_DESTINO"), codigos(dica).join(","));
});

test("adversarial: o apoio que **é** a chegada reprova", () => {
  // O nível 2 vira o nível 3: acender só a casa de chegada não estreita o
  // campo, entrega o exercício — e o registro contaria como "resolvido com
  // apoio 2".
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  item.apoio.modo = "contem";
  item.apoio.realce = [...new Set(item.lancesAceitos.map((l) => l.slice(2, 4)))];
  assert.ok(codigos(dica).includes("APOIO_E_A_RESPOSTA"), codigos(dica).join(","));
});

test("adversarial: o contorno que toca a chegada reprova", () => {
  const dica = m12Sadio();
  const item = dica.treino!.exercicios[0];
  item.apoio.modo = "contorno";
  item.apoio.realce = ["a1", item.lancesAceitos[0].slice(2, 4)];
  assert.ok(codigos(dica).includes("CONTORNO_TOCA_A_RESPOSTA"), codigos(dica).join(","));
});

test("adversarial: a solução que não nomeia o lance reprova", () => {
  // O nível 3 da escada é a frase que o aluno lê depois de desistir: "a coluna
  // do meio" não diz o que ele tem de arrastar.
  const dica = m12Sadio();
  dica.treino!.exercicios[0].apoio.solucao =
    "A ideia é ocupar a casa da frente do peão que não tem vizinho nenhum.";
  assert.ok(codigos(dica).includes("SOLUCAO_SEM_LANCE"), codigos(dica).join(","));
});

test("adversarial: a posição em xeque reprova na porta 1", () => {
  const dica = m12Sadio();
  // Rei preto em e8 com a dama branca colada em e7: a porta 1 recusa antes de
  // qualquer outra conferência, porque numa posição em xeque o lance urgente é
  // o xeque, e não o tema que a pergunta manda aplicar.
  dica.treino!.exercicios[0].fen = "4k3/4Q3/8/8/8/3p4/8/4K3 b - - 0 1";
  assert.ok(codigos(dica).includes("PORTA_1"), codigos(dica).join(","));
});

test("adversarial: material desigual sem a frase que o declara reprova", () => {
  const dica = m12Sadio();
  const comSaldo = dica.treino!.exercicios.find((i) => saldoDeMaterial(i.fen) !== 0);
  assert.ok(comSaldo, "m12 precisa de um exercício com material desigual para este teste");
  comSaldo.material = null;
  assert.ok(codigos(dica).includes("MATERIAL_CALADO"), codigos(dica).join(","));
});

test("adversarial: o exercício da mesma obra do exemplo reprova", () => {
  const dica = m12Sadio();
  dica.treino!.exercicios[0].provenance.editionFile = dica.posicoes[0].provenance.editionFile;
  assert.ok(codigos(dica).includes("EXERCICIO_DA_MESMA_OBRA"), codigos(dica).join(","));
});

test("adversarial: duas edições do mesmo livro contam como a mesma obra", () => {
  // `capablanca-1921` e `capablanca-fundamentals-reimpressao` são dois PDFs de
  // um livro só. Comparar as strings deixaria a regra passar por cima do
  // próprio motivo dela.
  const dica = m12Sadio();
  dica.posicoes[0].provenance.editionFile = "capablanca-fundamentals-reimpressao";
  dica.treino!.exercicios[0].provenance.editionFile = "capablanca-1921";
  assert.ok(codigos(dica).includes("EXERCICIO_DA_MESMA_OBRA"), codigos(dica).join(","));
});

test("adversarial: treino numa dica sem juiz de lance reprova", () => {
  const dica = m12Sadio();
  // `m5` é a regra negativa do módulo — "não mexa nos peões da frente do seu
  // rei sem motivo" não tem lance que a aplique, e por isso ela não tem juiz.
  dica.id = "m5";
  assert.ok(codigos(dica).includes("TREINO_SEM_JUIZ"), codigos(dica).join(","));
});

test("adversarial: item com tarefa que não é a do juiz reprova", () => {
  const dica = m12Sadio();
  dica.treino!.exercicios[0].tarefa = "posto";
  assert.ok(codigos(dica).includes("TAREFA_FORA_DO_JUIZ"), codigos(dica).join(","));
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
  copia[1].treino!.exercicios[0].fen = copia[0].treino!.exercicios[0].fen;
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
    d.treino!.exercicios[0].provenance.editionFile = "capablanca-1921";
    d.treino!.exercicios[0].provenance.capitulo = "Illustrative Games — Game 7";
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
  copia[0].treino!.exercicios[0].provenance.capitulo = cap;
  copia[1].treino!.exercicios[0].provenance.capitulo = cap;
  copia[0].treino!.exercicios[0].provenance.editionFile = "capablanca-1921";
  copia[1].treino!.exercicios[0].provenance.editionFile = "capablanca-1921";
  assert.deepEqual(problemasEntreDicas(copia), []);
});
