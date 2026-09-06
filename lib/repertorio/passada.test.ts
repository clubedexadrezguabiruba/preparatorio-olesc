import assert from "node:assert/strict";
import test from "node:test";
import { idDaLinha, type Linha } from "./linhas.ts";
import {
  acuracia,
  inicio,
  reduzir,
  type EstadoDaPassada,
  type Efeito,
  type Evento,
} from "./passada.ts";
import { conferirLinha } from "./treino.ts";

/**
 * O redutor de uma passada pela linha.
 *
 * **É o arquivo que este bloco existe para poder testar.** A máquina de estado
 * morava dentro de `Treino.tsx`, entre timers e refs, e tinha zero testes: o
 * componente inteiro só era exercitável abrindo o navegador. Aqui ela é
 * `estado + evento → estado + efeitos`, sem React e sem relógio, e as três
 * regras que mais importam — a seta é a lei na assistida, o quiz vai até o fim
 * depois do erro, e a dica antes do erro custa a passada — cabem em três
 * asserções cada.
 */

const LANCES = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3"];
const SANS = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"];

function linha(troca: Partial<Linha> = {}): Linha {
  const base: Linha = {
    id: idDaLinha("brancas", "italiana", LANCES),
    cor: "brancas",
    abertura: "italiana",
    nivel: "base",
    nome: "Italiana — 4.c3",
    fenInicial: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenFinal: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4",
    lances: LANCES,
    sans: SANS,
    meus: [0, 2, 4, 6],
    alternativas: {},
    errosNomeados: {},
    comentarios: { "6": "c3 prepara d4 e monta o centro." },
    fonte: "teste",
  };
  return { ...base, ...troca };
}

/** Despacha uma fila de eventos e devolve o estado com tudo o que foi emitido. */
function correr(
  l: Linha,
  inicial: EstadoDaPassada,
  eventos: readonly Evento[],
): { estado: EstadoDaPassada; efeitos: Efeito[] } {
  let estado = inicial;
  const efeitos: Efeito[] = [];
  for (const evento of eventos) {
    const passo = reduzir(l, estado, evento);
    estado = passo.estado;
    efeitos.push(...passo.efeitos);
  }
  return { estado, efeitos };
}

const jogou = (uci: string): Evento => ({ tipo: "jogou", uci });
const responde: Evento = { tipo: "adversarioJogou" };
const segue: Evento = { tipo: "continuar" };

function decisoes(efeitos: readonly Efeito[]): readonly string[][] {
  return efeitos.flatMap((e) => (e.tipo === "decidir" ? [[...e.lances]] : []));
}

function porQues(efeitos: readonly Efeito[]): readonly string[] {
  return efeitos.flatMap((e) => (e.tipo === "decidir" ? [e.porQue] : []));
}

/* ------------------------------------------------------------------ *
 * A fase assistida
 * ------------------------------------------------------------------ */

test("na assistida, um lance que não é o da linha volta e não conta", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "assistido"), [jogou("d2d4")]);

  assert.equal(estado.passo, 0, "a linha não andou");
  assert.equal(estado.jogados.length, 0, "e o lance não entrou na lista");
  assert.equal(estado.fase, "mostrando");
  assert.equal(estado.cartao.comando, "Siga a seta");
  assert.deepEqual(decisoes(efeitos), [], "nada sobe ao servidor na assistida");
});

test("na assistida, nem a alternativa marcada pelo autor é aceita", () => {
  // A seta é a lei aqui: o aluno está aprendendo **este** caminho, e ver a
  // seta apontar para um lado e a peça andar para outro ensinaria o contrário.
  const l = linha({ alternativas: { "0": ["d2d4"] } });
  const { estado } = correr(l, inicio(l, "assistido"), [jogou("d2d4")]);
  assert.equal(estado.passo, 0);
  assert.equal(estado.cartao.comando, "Siga a seta");
});

test("na assistida, o cartão diz o lance em português", () => {
  const l = linha();
  const estado = correr(l, inicio(l, "assistido"), [jogou("e2e4"), responde]).estado;
  assert.equal(estado.cartao.comando, "Jogue Cf3", "Nf3 é cavalo, e o aluno lê em português");
});

test("a assistida trava em todo comentário — inclusive no do adversário", () => {
  const l = linha({ comentarios: { "0": "e4 toma o centro.", "1": "ele responde no meio.", "6": "fecha." } });
  let estado = inicio(l, "assistido");

  ({ estado } = correr(l, estado, [jogou("e2e4")]));
  assert.equal(estado.fase, "lendo", "o comentário do nosso lance trava");
  assert.equal(estado.comentario, "e4 toma o centro.");

  ({ estado } = correr(l, estado, [segue]));
  assert.equal(estado.fase, "jogando");

  ({ estado } = correr(l, estado, [responde]));
  assert.equal(estado.fase, "lendo", "o comentário do lance dele trava também");
  assert.equal(estado.comentario, "ele responde no meio.");

  ({ estado } = correr(l, estado, [segue]));
  assert.equal(estado.fase, "jogando");
  assert.equal(estado.passo, 2);
});

test("a assistida não grava nada, e termina sem prêmio", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "assistido"), [
    jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1c4"), responde, jogou("c2c3"),
  ]);

  assert.equal(estado.fase, "resolvido");
  assert.deepEqual(decisoes(efeitos), [], "zero gravações");
  assert.equal(
    efeitos.some((e) => e.tipo === "som-premio"),
    false,
    "seguir setas não é fechar linha",
  );
  assert.equal(estado.cartao.comando, "Pronto.");
  assert.equal(
    estado.comentario,
    "c3 prepara d4 e monta o centro.",
    "o comentário do último lance fica na tela: na assistida não há painel de fim",
  );
});

test("no quiz o comentário do último lance sai do redutor — o painel de fim o mostra", () => {
  const l = linha();
  const { estado } = correr(l, inicio(l, "quiz"), [
    jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1c4"), responde, jogou("c2c3"),
  ]);
  assert.equal(estado.fase, "resolvido");
  assert.equal(estado.comentario, null, "senão o mesmo texto apareceria em duas caixas");
});

/* ------------------------------------------------------------------ *
 * O quiz
 * ------------------------------------------------------------------ */

test("o quiz vai até o fim depois do erro, e a linha do clube entra no lugar", () => {
  const l = linha();
  let estado = inicio(l, "quiz");

  ({ estado } = correr(l, estado, [jogou("e2e4"), responde, jogou("d1h5")]));
  assert.equal(estado.fase, "mostrando", "a peça volta");
  assert.equal(estado.passo, 2, "e a linha ainda não andou");

  ({ estado } = correr(l, estado, [segue]));
  assert.equal(estado.passo, 3, "o lance da linha entrou sozinho");
  assert.equal(estado.fen.includes("N"), true);

  ({ estado } = correr(l, estado, [responde, jogou("f1c4"), responde, jogou("c2c3")]));
  assert.equal(estado.fase, "resolvido", "a passada chegou ao fim mesmo tendo errado");
});

test("o boletim marca cada lance nosso, e a acurácia sai dele", () => {
  const l = linha();
  const { estado } = correr(l, inicio(l, "quiz"), [
    jogou("e2e4"), responde,
    jogou("d1h5"), segue, responde,      // erro no segundo
    jogou("f1c4"), responde,
    jogou("c2c3"),
  ]);

  assert.deepEqual(estado.boletim, ["acerto", "falha", "acerto", "acerto"]);
  assert.deepEqual(acuracia(estado), { acertos: 3, total: 4, acertou: false });
});

test("o boletim e `conferirLinha` dizem a mesma coisa", () => {
  // Duas contas do mesmo fato — uma no cliente, para desenhar, e a outra no
  // servidor, para gravar. Se elas discordarem, a tela mente.
  const l = linha({ alternativas: { "4": ["f1b5"] } });
  const roteiros: Evento[][] = [
    [jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1c4"), responde, jogou("c2c3")],
    [jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1b5"), segue, responde, jogou("c2c3")],
    [jogou("d2d4"), segue, responde, jogou("g1f3"), responde, jogou("f1c4"), responde, jogou("c2c3")],
  ];
  for (const roteiro of roteiros) {
    const { estado } = correr(l, inicio(l, "quiz"), roteiro);
    assert.equal(estado.fase, "resolvido", "todo roteiro tem de chegar ao fim");
    assert.equal(
      acuracia(estado).acertou,
      conferirLinha(l, estado.jogados),
      `o boletim discordou do juiz em ${estado.jogados.join(" ")}`,
    );
  }
});

test("a passada que chega inteira ao fim grava com o motivo `fim`", () => {
  const l = linha();
  const { efeitos } = correr(l, inicio(l, "quiz"), [
    jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1c4"), responde, jogou("c2c3"),
  ]);
  assert.deepEqual(decisoes(efeitos), [["e2e4", "g1f3", "f1c4", "c2c3"]]);
  assert.deepEqual(porQues(efeitos), ["fim"]);
});

test("a alternativa conta como acerto e traz a linha do clube de volta", () => {
  const l = linha({ alternativas: { "4": ["f1b5"] } });
  let estado = inicio(l, "quiz");
  ({ estado } = correr(l, estado, [jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1b5")]));

  assert.equal(estado.boletim[2], "alternativa");
  assert.equal(estado.cartao.tom, "aviso");
  ({ estado } = correr(l, estado, [segue]));
  assert.equal(estado.jogados[2], "f1b5", "o servidor recebe o que o aluno jogou");
  assert.match(estado.fen, /2B1P3/, "e o bispo do clube é que ficou no tabuleiro, em c4");
});

test("o primeiro erro decide a passada, e o segundo não grava de novo", () => {
  const l = linha();
  const { efeitos } = correr(l, inicio(l, "quiz"), [
    jogou("d2d4"), segue, responde,
    jogou("d1h5"), segue, responde,
  ]);
  assert.deepEqual(decisoes(efeitos), [["d2d4"]], "uma gravação só, com o primeiro erro dentro");
  assert.deepEqual(porQues(efeitos), ["erro"]);
});

test("o erro nomeado é recusado com o nome, e não com um 'não'", () => {
  const l = linha({ errosNomeados: { "4": ["b1c3"] } });
  const { estado } = correr(l, inicio(l, "quiz"), [
    jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("b1c3"),
  ]);
  assert.match(estado.cartao.comando, /^Cc3 /, "o lance jogado aparece em português");
  assert.match(estado.cartao.estado, /Bc4/, "e o lance certo é revelado junto");
  assert.equal(estado.boletim[2], "falha");
});

/* ------------------------------------------------------------------ *
 * A dica com custo
 * ------------------------------------------------------------------ */

const pediuDica: Evento = { tipo: "pediuDica" };

test("dica pedida antes de qualquer erro decide a passada como treino", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "quiz"), [jogou("e2e4"), responde, pediuDica]);

  assert.deepEqual(decisoes(efeitos), [["e2e4"]], "sobe a lista até aqui, que é curta");
  assert.deepEqual(porQues(efeitos), ["dica"], "e a tela precisa saber que não foi erro");
  assert.equal(conferirLinha(l, ["e2e4"]), false, "e lista curta o servidor reprova sozinho");
  assert.equal(estado.dicaNoPasso, 2, "a casa acende no lance da vez");
  assert.equal(estado.decidido, true);
});

test("dica pedida depois do erro é de graça", () => {
  const l = linha();
  const { efeitos } = correr(l, inicio(l, "quiz"), [
    jogou("d2d4"), segue, responde, pediuDica,
  ]);
  assert.deepEqual(decisoes(efeitos), [["d2d4"]], "só a gravação do erro, nenhuma da dica");
});

test("pedir dica de novo no mesmo lance não escalona nem grava outra vez", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "quiz"), [pediuDica, pediuDica, pediuDica]);
  assert.equal(decisoes(efeitos).length, 1);
  assert.equal(estado.dicaNoPasso, 0);
});

test("na assistida não há dica: a seta já está na tela", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "assistido"), [pediuDica]);
  assert.equal(estado.dicaNoPasso, null);
  assert.deepEqual(decisoes(efeitos), []);
});

/* ------------------------------------------------------------------ *
 * As bordas
 * ------------------------------------------------------------------ */

test("lance fora da vez não muda nada", () => {
  const l = linha();
  const antes = correr(l, inicio(l, "quiz"), [jogou("e2e4")]).estado;
  const depois = correr(l, antes, [jogou("g1f3")]).estado;
  assert.deepEqual(depois, antes, "enquanto o adversário não jogou, o tabuleiro é dele");
});

test("nas pretas o adversário abre, e `meus` são os ímpares", () => {
  const lances = ["d2d4", "d7d5", "g1f3", "g8f6"];
  const l = linha({
    cor: "pretas",
    abertura: "colle",
    lances,
    sans: ["d4", "d5", "Nf3", "Nf6"],
    meus: [1, 3],
    comentarios: { "3": "Nf6 segura e4." },
    id: idDaLinha("pretas", "colle", lances),
    fenFinal: "rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 2 3",
  });
  const { estado } = correr(l, inicio(l, "quiz"), [responde, jogou("d7d5"), responde, jogou("g8f6")]);
  assert.equal(estado.fase, "resolvido");
  assert.deepEqual(estado.jogados, ["d7d5", "g8f6"], "o lance dele nunca sobe");
  assert.deepEqual(estado.boletim, ["acerto", "acerto"]);
});
