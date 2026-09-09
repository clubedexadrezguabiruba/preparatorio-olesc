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
 * `estado + evento → estado + efeitos`, sem React e sem relógio, e as quatro
 * regras que mais importam — a seta é a lei na assistida, o treino recusa sem
 * contar, o quiz para no primeiro erro, e só o quiz grava — cabem em três
 * asserções cada.
 */

const LANCES = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3"];
const SANS = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"];
const FEN_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function linha(troca: Partial<Linha> = {}): Linha {
  const base: Linha = {
    id: idDaLinha("brancas", "italiana", LANCES),
    cor: "brancas",
    abertura: "italiana",
    nivel: "base",
    nome: "Italiana — 4.c3",
    fenInicial: FEN_INICIAL,
    fenFinal: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4",
    lances: LANCES,
    sans: SANS,
    meus: [0, 2, 4, 6],
    alternativas: {},
    errosNomeados: {},
    plano: {},
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
const pediuDica: Evento = { tipo: "pediuDica" };
const tras: Evento = { tipo: "olhou", para: "tras" };
const frente: Evento = { tipo: "olhou", para: "frente" };

/** A linha inteira, certa, do começo ao fim. */
const LIMPA: readonly Evento[] = [
  jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1c4"), responde, jogou("c2c3"),
];

function decisoes(efeitos: readonly Efeito[]): readonly string[][] {
  return efeitos.flatMap((e) => (e.tipo === "decidir" ? [[...e.lances]] : []));
}

function porQues(efeitos: readonly Efeito[]): readonly string[] {
  return efeitos.flatMap((e) => (e.tipo === "decidir" ? [e.porQue] : []));
}

function quantos(efeitos: readonly Efeito[], tipo: Efeito["tipo"]): number {
  return efeitos.filter((e) => e.tipo === tipo).length;
}

/* ------------------------------------------------------------------ *
 * A etapa assistida
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
  const { estado, efeitos } = correr(l, inicio(l, "assistido"), LIMPA);

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
  const { estado } = correr(l, inicio(l, "quiz"), LIMPA);
  assert.equal(estado.fase, "resolvido");
  assert.equal(estado.comentario, null, "senão o mesmo texto apareceria em duas caixas");
});

/* ------------------------------------------------------------------ *
 * A etapa do meio: o treino
 * ------------------------------------------------------------------ */

test("o treino não emite nenhum `decidir` — nem no erro, nem na dica, nem no fim", () => {
  // É a garantia mais importante do bloco. Um `decidir` que escape daqui grava
  // uma tarde de tentativas como se fosse prova, e a escada de revisão
  // espaçada sobe um degrau que o aluno não ganhou.
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "treino"), [
    jogou("d2d4"), segue,                 // erro, recusado
    jogou("e2e4"), responde,
    pediuDica,                            // dica, de graça
    jogou("g1f3"), responde,
    jogou("f1b5"), segue,                 // outro erro, recusado
    jogou("f1c4"), responde,
    jogou("c2c3"),                        // o fim
  ]);
  assert.equal(estado.fase, "resolvido", "a linha foi até o fim");
  assert.deepEqual(decisoes(efeitos), [], "e nada, em momento nenhum, subiu ao servidor");
  assert.equal(estado.decidido, false, "o estado também não acha que gravou");
});

test("errar no treino recusa e não conta, e o cartão não fala em seta", () => {
  const l = linha();
  let estado = inicio(l, "treino");
  ({ estado } = correr(l, estado, [jogou("e2e4"), responde, jogou("d1h5")]));

  assert.equal(estado.fase, "mostrando", "a peça volta");
  assert.equal(estado.passo, 2, "a linha não andou");
  assert.deepEqual(estado.jogados, ["e2e4"], "o lance errado não entrou na lista");
  assert.deepEqual(estado.boletim, [null, null, null, null], "e não deixou selo — nem de acerto");
  assert.equal(estado.errou, false, "errar aqui não é o erro que conta");
  assert.match(estado.cartao.estado, /não conta/, "o cartão tem de dizer que não contou");
  assert.doesNotMatch(
    `${estado.cartao.comando} ${estado.cartao.estado}`,
    /seta/i,
    "não há seta nesta etapa, e mandar segui-la seria apontar para o nada",
  );
  assert.doesNotMatch(estado.cartao.estado, /Cf3/, "o lance certo não é revelado — para isso há a dica");

  ({ estado } = correr(l, estado, [segue]));
  assert.equal(estado.fase, "jogando", "e o aluno deve o mesmo lance de novo");
  assert.equal(estado.passo, 2);
});

test("no treino a alternativa e o erro nomeado são recusados com o aviso certo", () => {
  const l = linha({ alternativas: { "4": ["f1b5"] }, errosNomeados: { "4": ["b1c3"] } });
  const ate = [jogou("e2e4"), responde, jogou("g1f3"), responde];

  const boa = correr(l, inicio(l, "treino"), [...ate, jogou("f1b5")]).estado;
  assert.equal(boa.passo, 4, "a alternativa não anda: aqui se decora a linha do clube");
  assert.match(boa.cartao.comando, /Bom lance/);
  assert.match(boa.cartao.estado, /não conta/);

  const armadilha = correr(l, inicio(l, "treino"), [...ate, jogou("b1c3")]).estado;
  assert.equal(armadilha.passo, 4);
  assert.match(armadilha.cartao.comando, /^Cc3 é a armadilha/, "o erro nomeado ganha o nome dele");
  assert.doesNotMatch(armadilha.cartao.estado, /Bc4/, "mas o lance certo continua guardado");
});

test("o treino não mostra comentário, e não trava para ler", () => {
  // O texto de um lance costuma nomear o plano e o lance seguinte. No painel,
  // durante uma etapa de memória, ele é a resposta da próxima pergunta pela
  // metade.
  const l = linha({ comentarios: { "0": "e4 toma o centro.", "1": "ele responde.", "6": "fecha." } });
  const { estado } = correr(l, inicio(l, "treino"), [jogou("e2e4"), responde]);
  assert.equal(estado.fase, "jogando", "sem pausa de leitura");
  assert.equal(estado.comentario, null, "e sem texto no painel");
  assert.equal(estado.passo, 2);
});

test("o treino termina sem prêmio, com o comentário final na tela e o cartão dizendo o que vem", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "treino"), LIMPA);
  assert.equal(estado.fase, "resolvido");
  assert.equal(quantos(efeitos, "som-premio"), 0, "o prêmio é do que conta");
  assert.equal(quantos(efeitos, "terminou"), 1);
  assert.equal(estado.comentario, "c3 prepara d4 e monta o centro.", "não há painel de fim aqui");
  assert.equal(estado.cartao.comando, "Pronto.");
  assert.match(estado.cartao.estado, /valendo/, "a próxima etapa é a prova, e o cartão avisa");
});

/* ------------------------------------------------------------------ *
 * O quiz
 * ------------------------------------------------------------------ */

test("o quiz para no erro: a peça volta, o lance certo entra, e a passada acaba ali", () => {
  // Até 8/9/2026 o quiz seguia até o fim depois do erro. Agora é revelar e
  // recomeçar, como o Move Trainer: o aluno relê o lance certo no instante
  // em que errou, e não cinco lances depois.
  const l = linha({ comentarios: { "2": "Cf3 ataca e5 e desenvolve.", "6": "fecha." } });
  let estado = inicio(l, "quiz");

  ({ estado } = correr(l, estado, [jogou("e2e4"), responde, jogou("d1h5")]));
  assert.equal(estado.fase, "mostrando", "a peça volta");
  assert.equal(estado.passo, 2, "e a linha ainda não andou");
  assert.deepEqual(
    estado.revelado,
    { passo: 2, uci: "g1f3", san: "Cf3" },
    "o lance certo já está legível no estado, para a tela desenhar a seta",
  );

  const revelacao = correr(l, estado, [segue]);
  const efeitos = revelacao.efeitos;
  estado = revelacao.estado;
  assert.equal(estado.fase, "resolvido", "a passada parou aqui");
  assert.equal(estado.passo, 3, "o lance da linha entrou sozinho");
  assert.match(estado.fen, /5N2/, "o cavalo do clube está em f3");
  assert.equal(estado.comentario, "Cf3 ataca e5 e desenvolve.", "com o comentário do professor daquele lance");
  assert.deepEqual(estado.jogados, ["e2e4", "d1h5"], "o que o aluno jogou, e não o que entrou");
  assert.equal(quantos(efeitos, "terminou"), 1, "o painel de fim entra");
  assert.equal(quantos(efeitos, "som-premio"), 0, "sem prêmio: a linha não foi fechada");
  assert.equal(estado.cartao.comando, "Parou aqui");
  assert.match(estado.cartao.estado, /Cf3/);

  const depois = correr(l, estado, [responde, jogou("f1c4"), pediuDica]).estado;
  assert.deepEqual(depois, estado, "depois do fim nada mais entra");
});

test("o erro do quiz grava uma vez, no instante do erro, e a revelação não grava de novo", () => {
  const l = linha();
  const erro = correr(l, inicio(l, "quiz"), [jogou("e2e4"), responde, jogou("d1h5")]);
  assert.deepEqual(decisoes(erro.efeitos), [["e2e4", "d1h5"]], "a gravação sai antes da revelação");
  assert.deepEqual(porQues(erro.efeitos), ["erro"]);

  const revelado = correr(l, erro.estado, [segue]);
  assert.deepEqual(decisoes(revelado.efeitos), [], "revelar não é decidir de novo");
  assert.equal(revelado.estado.decidido, true);
});

test("o boletim marca cada lance nosso até onde a passada chegou, e a acurácia sai dele", () => {
  // Com o erro parando a passada, os lances depois dele ficam nulos: a fita
  // completa só existe em passada limpa.
  const l = linha();
  const { estado } = correr(l, inicio(l, "quiz"), [
    jogou("e2e4"), responde,
    jogou("d1h5"), segue,               // erro no segundo, e o fim
  ]);
  assert.deepEqual(estado.boletim, ["acerto", "falha", null, null]);
  assert.deepEqual(acuracia(estado), { acertos: 1, total: 4, acertou: false });

  const limpa = correr(l, inicio(l, "quiz"), LIMPA).estado;
  assert.deepEqual(limpa.boletim, ["acerto", "acerto", "acerto", "acerto"]);
  assert.deepEqual(acuracia(limpa), { acertos: 4, total: 4, acertou: true });
});

test("o boletim e `conferirLinha` dizem a mesma coisa", () => {
  // Duas contas do mesmo fato — uma no cliente, para desenhar, e a outra no
  // servidor, para gravar. Se elas discordarem, a tela mente.
  const l = linha({ alternativas: { "4": ["f1b5"] } });
  const roteiros: Evento[][] = [
    [...LIMPA],
    [jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1b5"), segue, responde, jogou("c2c3")],
    // O erro para a passada: o `segue` é a revelação, e o roteiro acaba aí.
    [jogou("d2d4"), segue],
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
  const { efeitos } = correr(l, inicio(l, "quiz"), LIMPA);
  assert.deepEqual(decisoes(efeitos), [["e2e4", "g1f3", "f1c4", "c2c3"]]);
  assert.deepEqual(porQues(efeitos), ["fim"]);
});

test("a alternativa conta como acerto e traz a linha do clube de volta", () => {
  const l = linha({ alternativas: { "4": ["f1b5"] } });
  let estado = inicio(l, "quiz");
  ({ estado } = correr(l, estado, [jogou("e2e4"), responde, jogou("g1f3"), responde, jogou("f1b5")]));

  assert.equal(estado.boletim[2], "alternativa");
  assert.equal(estado.cartao.tom, "aviso");
  assert.equal(estado.revelado, null, "a alternativa não é erro: nada a revelar");
  ({ estado } = correr(l, estado, [segue]));
  assert.equal(estado.fase, "jogando", "e a linha segue");
  assert.equal(estado.jogados[2], "f1b5", "o servidor recebe o que o aluno jogou");
  assert.match(estado.fen, /2B1P3/, "e o bispo do clube é que ficou no tabuleiro, em c4");
});

test("o erro grava uma vez, e o que vier depois do fim não grava de novo", () => {
  // Antes de 8/9 este teste errava duas vezes na mesma passada. Agora o
  // segundo erro é impossível — a passada parou —, e o que se garante é que
  // nenhum evento tardio (o relógio do adversário, um clique a mais) reabre a
  // gravação.
  const l = linha();
  const { efeitos } = correr(l, inicio(l, "quiz"), [
    jogou("d2d4"), segue,
    responde, jogou("d1h5"), segue, pediuDica,
  ]);
  assert.deepEqual(decisoes(efeitos), [["d2d4"]], "uma gravação só, com o erro dentro");
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

test("no quiz o comentário não aparece no meio da linha", () => {
  const l = linha({ comentarios: { "0": "e4 toma o centro.", "6": "fecha." } });
  const { estado } = correr(l, inicio(l, "quiz"), [jogou("e2e4")]);
  assert.equal(estado.comentario, null, "até 8/9 aparecia sem travar; agora nem isso");
});

/* ------------------------------------------------------------------ *
 * A dica: de graça no treino, com custo no quiz
 * ------------------------------------------------------------------ */

test("dica pedida antes de qualquer erro decide a passada como treino", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "quiz"), [jogou("e2e4"), responde, pediuDica]);

  assert.deepEqual(decisoes(efeitos), [["e2e4"]], "sobe a lista até aqui, que é curta");
  assert.deepEqual(porQues(efeitos), ["dica"], "e a tela precisa saber que não foi erro");
  assert.equal(conferirLinha(l, ["e2e4"]), false, "e lista curta o servidor reprova sozinho");
  assert.equal(estado.dicaNoPasso, 2, "a casa acende no lance da vez");
  assert.equal(estado.decidido, true);
});

test("dica pedida depois de a passada estar decidida é de graça", () => {
  // Era "depois do erro"; com o erro parando a passada, o único "depois" que
  // ainda tem lance para pedir dica é o de uma passada decidida pela dica.
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "quiz"), [
    pediuDica, jogou("e2e4"), responde, pediuDica,
  ]);
  assert.deepEqual(decisoes(efeitos), [[]], "só a gravação da primeira dica, nenhuma da segunda");
  assert.equal(estado.dicaNoPasso, 2, "e a segunda acende do mesmo jeito");
  assert.doesNotMatch(estado.cartao.estado, /conta como treino/, "sem cobrar de novo no cartão");
});

test("no treino a dica é de graça, acende a casa, e o cartão diz isso", () => {
  const l = linha();
  const { estado, efeitos } = correr(l, inicio(l, "treino"), [jogou("e2e4"), responde, pediuDica]);
  assert.equal(estado.dicaNoPasso, 2, "a casa acende no lance da vez");
  assert.deepEqual(decisoes(efeitos), [], "e nada sobe");
  assert.equal(estado.decidido, false);
  assert.match(estado.cartao.estado, /de graça/, "o aluno precisa saber que aqui pode pedir");
  assert.doesNotMatch(estado.cartao.estado, /conta como treino/);
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
 * Olhar para trás, e só na assistida
 * ------------------------------------------------------------------ */

test("olhar para trás recua, mostra o comentário daquele meio-lance, e o tabuleiro fica sem lance", () => {
  const l = linha({ comentarios: { "0": "e4 toma o centro.", "6": "fecha." } });
  let estado = inicio(l, "assistido");
  // O `segue` é a leitura do comentário de 1.e4 — sem ele a resposta dele nem entra.
  ({ estado } = correr(l, estado, [jogou("e2e4"), segue, responde]));
  const naFrente = estado;
  assert.equal(naFrente.passo, 2);

  ({ estado } = correr(l, estado, [tras]));
  assert.equal(estado.fase, "olhando");
  assert.deepEqual(estado.olhando, { meioLance: 1, deVolta: "jogando" });
  assert.match(estado.fen, /4P3\/8\/PPPP1PPP/, "a posição é a de depois de 1.e4, rejogada do início");
  assert.deepEqual(estado.ultimoLance, ["e2", "e4"]);
  assert.equal(estado.comentario, "e4 toma o centro.", "o painel mostra o comentário daquele meio-lance");
  assert.equal(estado.cartao.comando, "1.e4");
  assert.equal(estado.passo, 2, "a frente da passada não se moveu");

  const tentou = reduzir(l, estado, jogou("g1f3"));
  assert.deepEqual(tentou.estado, estado, "recuado, o tabuleiro não aceita lance");
  assert.deepEqual(tentou.efeitos, []);

  ({ estado } = correr(l, estado, [tras]));
  assert.equal(estado.olhando?.meioLance, 0);
  assert.equal(estado.fen, FEN_INICIAL, "recuar vai até a posição inicial");
  assert.equal(estado.ultimoLance, null);
  assert.equal(estado.comentario, null);

  ({ estado } = correr(l, estado, [tras]));
  assert.equal(estado.olhando?.meioLance, 0, "e não passa dela");
  assert.equal(estado.cartao.comando, "Começo da linha", "o limite de trás também é dito");

  ({ estado } = correr(l, estado, [frente, frente]));
  assert.equal(estado.fase, "jogando", "de volta à frente, o jogo destrava");
  assert.equal(estado.olhando, null);
  assert.equal(estado.fen, naFrente.fen, "na mesma posição de antes");
  assert.equal(estado.cartao.comando, "Jogue Cf3");
});

test("olhar para a frente não passa do meio-lance mais adiantado já jogado, e o estado diz por quê", () => {
  // A trava vem de decisão registrada: em 6/9/2026 o modo "só olhar" foi
  // revogado porque o aluno via a linha andar sozinha e chegava ao quiz sem
  // ter movido uma peça. Uma seta → que mostrasse o lance seguinte seria o
  // mesmo modo por outra porta.
  const l = linha();
  let estado = inicio(l, "assistido");
  ({ estado } = correr(l, estado, [jogou("e2e4"), responde]));
  const naFrente = estado;

  const { estado: limite, efeitos } = correr(l, naFrente, [frente]);
  assert.equal(limite.passo, 2, "a linha não andou");
  assert.equal(limite.fen, naFrente.fen, "e a posição não mudou");
  assert.equal(limite.fase, "jogando", "o tabuleiro continua vivo");
  assert.match(limite.cartao.estado, /frente/, "mas a tela diz onde o aluno está");
  assert.match(limite.cartao.estado, /joga/, "e que dali para a frente se joga");
  assert.equal(limite.cartao.comando, naFrente.cartao.comando, "sem tirar a instrução da vez");
  assert.deepEqual(efeitos, [], "e nada toca nem agenda");

  // De trás para a frente, a mesma parede: recua um, volta um, e o segundo → bate nela.
  ({ estado } = correr(l, naFrente, [tras, frente, frente]));
  assert.equal(estado.passo, 2);
  assert.equal(estado.fase, "jogando");
  assert.match(estado.cartao.estado, /frente/);
});

test("olhar para trás e voltar não muda o que o quiz vai gravar, e nem existe no treino e no quiz", () => {
  const l = linha();
  for (const modo of ["treino", "quiz"] as const) {
    // Anotado de propósito: o `asserts` do `deepEqual` estrito, dentro de um
    // laço, faz o TypeScript inferir `antes` a partir dela mesma (TS7022).
    const antes: EstadoDaPassada = correr(l, inicio(l, modo), [jogou("e2e4"), responde]).estado;
    const depois = reduzir(l, antes, tras);
    assert.deepEqual(depois.estado, antes, `no ${modo} olhar para trás não existe: seria rever a resposta`);
    assert.deepEqual(depois.efeitos, []);
  }

  // Na assistida a volta não reemite `terminou` nem apaga o que já aconteceu.
  const fim = correr(l, inicio(l, "assistido"), LIMPA).estado;
  const { estado, efeitos } = correr(l, fim, [tras, tras, frente, frente]);
  assert.deepEqual(estado, fim, "a frente volta exatamente como estava — inclusive resolvida");
  assert.equal(quantos(efeitos, "terminou"), 0, "sem um segundo painel de fim");
});

test("olhar durante a leitura devolve a leitura; durante a espera dele, reagenda o lance dele", () => {
  const l = linha({ comentarios: { "0": "e4 toma o centro.", "6": "fecha." } });

  // Lendo: ← olha, → volta, e o aluno continua devendo o "Continuar".
  const lendo = correr(l, inicio(l, "assistido"), [jogou("e2e4")]).estado;
  assert.equal(lendo.fase, "lendo");
  const olhado = correr(l, lendo, [tras]).estado;
  assert.equal(olhado.olhando?.deVolta, "lendo");
  const deVolta = correr(l, olhado, [frente]).estado;
  assert.equal(deVolta.fase, "lendo", "a pausa de leitura não foi engolida pela navegação");

  // Esperando o adversário: o relógio que vence enquanto se olha é ignorado,
  // e a volta à frente emite a espera de novo — senão ele nunca jogaria.
  const l2 = linha();
  const esperando = correr(l2, inicio(l2, "assistido"), [jogou("e2e4")]).estado;
  assert.equal(esperando.fase, "jogando");
  const olhando = correr(l2, esperando, [tras]).estado;
  const atrasado = reduzir(l2, olhando, responde);
  assert.deepEqual(atrasado.estado, olhando, "o lance dele não entra numa posição antiga");
  const volta = reduzir(l2, olhando, frente);
  assert.deepEqual(
    volta.efeitos.map((e) => e.tipo),
    ["agendar"],
    "a espera do adversário recomeça na volta à frente",
  );
  assert.equal(volta.estado.passo, 1);
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

test("o cartão em repouso é o único lugar em que treino e quiz diferem para o aluno", () => {
  // Sem seta e sem comentário nos dois, a etapa só chega ao aluno pelo cartão:
  // se ele disser a mesma coisa, as duas etapas são uma.
  const l = linha();
  const treino = inicio(l, "treino").cartao;
  const quiz = inicio(l, "quiz").cartao;
  assert.equal(treino.comando, quiz.comando, "a instrução é a mesma");
  assert.match(treino.estado, /não conta/);
  assert.match(quiz.estado, /valendo/);
});
