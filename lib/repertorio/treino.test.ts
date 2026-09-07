import assert from "node:assert/strict";
import test from "node:test";
import { idDaLinha, type Cor, type EntradaDoIndice, type Linha } from "./linhas.ts";
import {
  ACERTOS_PARA_APRENDER,
  aprendida,
  aprendidasDaAbertura,
  aRevisarNaAbertura,
  conferirLinha,
  DEGRAU_APRENDIDA,
  DEGRAU_MAXIMO,
  DEGRAUS_EM_DIAS,
  depoisDoTreino,
  diasAteRevisar,
  lanceCerto,
  proximaLinha,
  resumo,
  sanEmPortugues,
  semQuebras,
  todasAprendidas,
  vencida,
  vencidas,
  QUEDA_POR_ERRO,
  vereditoDoLance,
  zerado,
  type ProgressoDaLinha,
} from "./treino.ts";

/**
 * O juiz do repertório e a ordem das linhas.
 *
 * O caso que mais importa aqui é o **primeiro**: um mate que não é o lance da
 * linha é errado. É a diferença inteira entre este juiz e o da tática, e é o
 * tipo de coisa que alguém "conserta" um dia reaproveitando a função de lá.
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
  const junto = { ...base, ...troca };
  if (troca.lances && !troca.id) junto.id = idDaLinha(junto.cor, junto.abertura, junto.lances);
  return junto;
}

/** Uma linha de pretas: `meus` são os índices ímpares, e `lances[0]` é branco. */
function dePretas(): Linha {
  const lances = ["d2d4", "d7d5", "g1f3", "g8f6"];
  return linha({
    cor: "pretas",
    abertura: "colle",
    lances,
    sans: ["d4", "d5", "Nf3", "Nf6"],
    meus: [1, 3],
    comentarios: { "3": "Nf6 segura e4." },
    id: idDaLinha("pretas", "colle", lances),
  });
}

/* ------------------------------------------------------------------ *
 * O juiz de um lance
 * ------------------------------------------------------------------ */

test("o lance da linha é certo, e qualquer outro é errado", () => {
  const l = linha();
  assert.equal(vereditoDoLance(l, 0, "e2e4"), "certo");
  assert.equal(vereditoDoLance(l, 0, "d2d4"), "errado");
});

test("mate que não é o lance da linha continua errado", () => {
  // O contraste com `lib/tatica/conferir.ts`, que aceita qualquer mate. Aqui
  // não há solução a encontrar: há uma linha a decorar. Se o mate passasse, o
  // treinador aprovaria a partida do aluno em vez de ensinar a linha do clube.
  //
  // O mate do pastor sai desta mesma posição depois de 4.Qh5 — lance legal,
  // forte, e que não é o do repertório.
  const l = linha();
  assert.equal(vereditoDoLance(l, 4, "d1h5"), "errado");
  assert.equal(lanceCerto(l, 4, "d1h5"), false);
});

test("alternativa marcada pelo autor conta como certo", () => {
  const l = linha({ alternativas: { "6": ["d2d3"] } });
  assert.equal(vereditoDoLance(l, 6, "d2d3"), "alternativa");
  assert.equal(lanceCerto(l, 6, "d2d3"), true);
  // E não vale no meio-lance errado: a alternativa é daquele ply, não da linha.
  assert.equal(vereditoDoLance(l, 4, "d2d3"), "errado");
});

test("erro nomeado é recusado, e se distingue de um errado qualquer", () => {
  // O aviso é o ponto: o aluno que joga o lance que a fonte mostra como ruim
  // precisa ouvir *por que* ele existe, e não só "não".
  const l = linha({ errosNomeados: { "4": ["d1h5"] } });
  assert.equal(vereditoDoLance(l, 4, "d1h5"), "erro-nomeado");
  assert.equal(lanceCerto(l, 4, "d1h5"), false);
  assert.equal(vereditoDoLance(l, 4, "b1c3"), "errado");
});

/* ------------------------------------------------------------------ *
 * A linha inteira
 * ------------------------------------------------------------------ */

test("conferirLinha aprova a sequência dos lances nossos", () => {
  assert.equal(conferirLinha(linha(), ["e2e4", "g1f3", "f1c4", "c2c3"]), true);
});

test("conferirLinha reprova um lance a menos e um lance a mais", () => {
  // Parar no meio não é acertar a linha; e um lance sobrando quer dizer que a
  // tela e o arquivo discordam sobre onde a linha termina.
  const l = linha();
  assert.equal(conferirLinha(l, ["e2e4", "g1f3", "f1c4"]), false);
  assert.equal(conferirLinha(l, ["e2e4", "g1f3", "f1c4", "c2c3", "d2d4"]), false);
});

test("conferirLinha reprova um lance errado no meio", () => {
  assert.equal(conferirLinha(linha(), ["e2e4", "g1f3", "d1h5", "c2c3"]), false);
});

test("conferirLinha aceita alternativa dentro da sequência", () => {
  const l = linha({ alternativas: { "4": ["f1b5"] } });
  assert.equal(conferirLinha(l, ["e2e4", "g1f3", "f1b5", "c2c3"]), true);
});

test("nas pretas, `meus` são os ímpares e o primeiro lance é do adversário", () => {
  const l = dePretas();
  assert.equal(vereditoDoLance(l, 1, "d7d5"), "certo");
  assert.equal(conferirLinha(l, ["d7d5", "g8f6"]), true);
  // O `d2d4` é do adversário: ele nunca sobe ao servidor, e mandá-lo desalinha
  // a contagem.
  assert.equal(conferirLinha(l, ["d2d4", "d7d5", "g8f6"]), false);
});

/* ------------------------------------------------------------------ *
 * Os contadores
 * ------------------------------------------------------------------ */

const T1 = "2026-09-05T10:00:00.000Z";
const T2 = "2026-09-05T11:00:00.000Z";
const T3 = "2026-09-05T12:00:00.000Z";
const T4 = "2026-09-06T09:00:00.000Z";

/** Dias distintos, para subir a escada: cada um vence o agendamento anterior. */
const DIA_1 = "2026-09-05T14:00:00.000Z";
const DIA_2 = "2026-09-07T14:00:00.000Z";
const DIA_3 = "2026-09-12T14:00:00.000Z";
const DIA_4 = "2026-09-25T14:00:00.000Z";
const DIA_5 = "2026-10-20T14:00:00.000Z";

/** Uma linha subida até o degrau pedido, em dias distintos e vencidos. */
function naEscada(ate: number): ProgressoDaLinha {
  const dias = [DIA_1, DIA_2, DIA_3, DIA_4, DIA_5];
  let p = zerado();
  for (let d = 0; d < ate; d++) p = depoisDoTreino(p, true, dias[d]);
  assert.equal(p.degrau, ate, `a montagem do teste devia parar no degrau ${ate}`);
  return p;
}

test("acertar soma; errar zera os seguidos e soma um erro", () => {
  let p = depoisDoTreino(zerado(), true, T1);
  assert.deepEqual(p, {
    acertosSeguidos: 1,
    tentativas: 1,
    erros: 0,
    aprendidaEm: null,
    ultimaEm: T1,
    degrau: 1,
    revisarEm: "2026-09-06T03:00:00.000Z",
  });

  p = depoisDoTreino(p, false, T2);
  assert.equal(p.acertosSeguidos, 0);
  assert.equal(p.erros, 1);
  assert.equal(p.tentativas, 2);
  assert.equal(p.ultimaEm, T2);
});

test("três acertos na mesma tarde **não** aprendem a linha", () => {
  // É a mentira que a escada consertou. Antes de 6/9/2026 isto marcava
  // `aprendidaEm` na terceira passada — com a posição ainda na retina do aluno.
  let p = zerado();
  for (const t of [T1, T2, T3]) p = depoisDoTreino(p, true, t);
  assert.equal(p.acertosSeguidos, 3, "os acertos seguidos contam as três");
  assert.equal(p.degrau, 1, "e a escada não saiu do primeiro degrau");
  assert.equal(aprendida(p), false);
});

test("o terceiro degrau marca `aprendidaEm`, e o erro seguinte não a desmarca", () => {
  let p = naEscada(DEGRAU_APRENDIDA - 1);
  assert.equal(aprendida(p), false, `o degrau ${DEGRAU_APRENDIDA - 1} ainda não é aprendida`);

  p = depoisDoTreino(p, true, DIA_3);
  assert.equal(p.degrau, DEGRAU_APRENDIDA);
  assert.equal(p.aprendidaEm, DIA_3);
  assert.equal(p.acertosSeguidos, ACERTOS_PARA_APRENDER);

  // A regra que a tela depende: errar depois vira revisão, não recomeço.
  p = depoisDoTreino(p, false, DIA_4);
  assert.equal(p.acertosSeguidos, 0);
  assert.equal(p.aprendidaEm, DIA_3, "a data de quando aprendeu não volta a nulo");
  assert.equal(aprendida(p), true);
});

test("os erros nunca passam das tentativas", () => {
  // É o `check` da migration escrito em TypeScript: se a aritmética daqui
  // puder violá-lo, o banco recusa a gravação e o aluno vê "não deu para
  // gravar" sem ter feito nada de errado.
  let p = zerado();
  for (const acertou of [false, false, true, false]) p = depoisDoTreino(p, acertou, T1);
  assert.equal(p.tentativas, 4);
  assert.equal(p.erros, 3);
  assert.ok(p.tentativas >= p.erros);
});

/* ------------------------------------------------------------------ *
 * A ordem
 * ------------------------------------------------------------------ */

function progressoDe(entradas: Record<string, Partial<ProgressoDaLinha>>): Map<string, ProgressoDaLinha> {
  return new Map(Object.entries(entradas).map(([id, p]) => [id, { ...zerado(), ...p }]));
}

/** Três linhas com ids previsíveis, na ordem do arquivo. */
function tres(): Linha[] {
  return [
    linha({ lances: LANCES.slice(0, 1), sans: ["e4"], meus: [0], comentarios: { "0": "a" } }),
    linha({ lances: LANCES.slice(0, 3), sans: SANS.slice(0, 3), meus: [0, 2], comentarios: { "2": "b" } }),
    linha({ lances: LANCES.slice(0, 5), sans: SANS.slice(0, 5), meus: [0, 2, 4], comentarios: { "4": "c" } }),
  ];
}

test("nunca vista vem primeiro, na ordem do arquivo", () => {
  const [a, b, c] = tres();
  // A primeira já foi treinada; a segunda nunca. A segunda ganha, mesmo com a
  // terceira também nunca vista: a ordem do arquivo é a do PGN.
  const progresso = progressoDe({ [a.id]: { tentativas: 5, acertosSeguidos: 1, ultimaEm: T1 } });
  assert.equal(proximaLinha([a, b, c], progresso)?.id, b.id);
});

test("sem nunca-vistas, ganha a que está mais longe dos três acertos", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    [a.id]: { tentativas: 3, acertosSeguidos: 2, ultimaEm: T1 },
    [b.id]: { tentativas: 1, acertosSeguidos: 0, ultimaEm: T2 },
    [c.id]: { tentativas: 2, acertosSeguidos: 1, ultimaEm: T3 },
  });
  assert.equal(proximaLinha([a, b, c], progresso)?.id, b.id);
});

test("empatadas nos acertos, ganha a que faz mais tempo que não aparece", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    [a.id]: { tentativas: 1, acertosSeguidos: 1, ultimaEm: T3 },
    [b.id]: { tentativas: 1, acertosSeguidos: 1, ultimaEm: T1 },
    [c.id]: { tentativas: 1, acertosSeguidos: 2, ultimaEm: T2 },
  });
  assert.equal(proximaLinha([a, b, c], progresso)?.id, b.id);
});

test("com tudo aprendido, a próxima é a revisão mais antiga", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    [a.id]: { tentativas: 3, acertosSeguidos: 3, aprendidaEm: T3, ultimaEm: T3 },
    [b.id]: { tentativas: 3, acertosSeguidos: 3, aprendidaEm: T1, ultimaEm: T4 },
    [c.id]: { tentativas: 3, acertosSeguidos: 3, aprendidaEm: T1, ultimaEm: T1 },
  });
  assert.equal(todasAprendidas([a, b, c], progresso), true);
  assert.equal(proximaLinha([a, b, c], progresso)?.id, c.id);
});

test("abertura sem linhas: `proximaLinha` devolve nulo e nada está aprendido", () => {
  assert.equal(proximaLinha([], new Map()), null);
  assert.equal(todasAprendidas([], new Map()), false);
});

/* ------------------------------------------------------------------ *
 * As contagens da lista
 * ------------------------------------------------------------------ */

test("o resumo conta as aprendidas, não as tentadas", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    [a.id]: { tentativas: 9, acertosSeguidos: 2, ultimaEm: T1 },
    [b.id]: { tentativas: 3, acertosSeguidos: 3, aprendidaEm: T2, ultimaEm: T2 },
  });
  assert.deepEqual(resumo([a, b, c], progresso, T3), { aprendidas: 1, total: 3, aRevisar: 0 });
});

/** Uma entrada do `index.json`, com os ids que aquela abertura tem. */
function entrada(cor: Cor, abertura: string, ids: [string, ...string[]]): EntradaDoIndice {
  return {
    cor,
    abertura,
    nome: abertura,
    linhas: ids.length,
    ids,
    arquivo: `/repertorio/${cor}/${abertura}.json`,
  };
}

test("a contagem por abertura não cruza as cores", () => {
  // O slug pode repetir entre as cores: há uma "francesa" de brancas e poderia
  // haver uma de pretas. Elas não podem emprestar progresso uma à outra.
  const daBranca = idDaLinha("brancas", "francesa", LANCES);
  const daPreta = idDaLinha("pretas", "francesa", LANCES);
  const progresso = progressoDe({
    [daBranca]: { aprendidaEm: T1, ultimaEm: T1 },
    [daPreta]: { aprendidaEm: T1, ultimaEm: T1 },
    [idDaLinha("brancas", "italiana", LANCES)]: { aprendidaEm: T1, ultimaEm: T1 },
  });
  assert.equal(aprendidasDaAbertura(progresso, entrada("brancas", "francesa", [daBranca])), 1);
  assert.equal(aprendidasDaAbertura(progresso, entrada("pretas", "francesa", [daPreta])), 1);
  assert.equal(
    aprendidasDaAbertura(progresso, entrada("brancas", "escocesa", [idDaLinha("brancas", "escocesa", LANCES)])),
    0,
  );
});

test("órfão não conta: o registro da linha que mudou de lances some da conta", () => {
  // O id é o hash dos lances. Quando uma linha muda de lance, o registro antigo
  // fica no banco **para sempre** — `repertorio_progresso` não tem chave
  // estrangeira nem política de delete, e a migration 0004 diz que isso é de
  // propósito. O que ele não pode é continuar sendo contado: aí `/aberturas`
  // mostra "3 de 2", a abertura vira "em dia" sem o aluno ter visto a linha
  // nova, e o painel promete uma revisão que não tem onde ser feita.
  const viva1 = idDaLinha("brancas", "escocesa", LANCES);
  const viva2 = idDaLinha("brancas", "escocesa", LANCES.slice(0, 5));
  const orfa = idDaLinha("brancas", "escocesa", ["e2e4", "c7c5", "g1f3"]);
  const DEPOIS = "2026-09-20T03:00:00.000Z";

  const progresso = progressoDe({
    [viva1]: { aprendidaEm: T1, ultimaEm: T1, degrau: 4, revisarEm: DEPOIS },
    [viva2]: { aprendidaEm: T1, ultimaEm: T1, degrau: 4, revisarEm: DEPOIS },
    [orfa]: { aprendidaEm: T1, ultimaEm: T1, degrau: 3, revisarEm: T1 },
  });

  const escocesa = entrada("brancas", "escocesa", [viva1, viva2]);
  assert.equal(
    aprendidasDaAbertura(progresso, escocesa),
    2,
    "a abertura tem duas linhas; o órfão não é uma terceira",
  );
  assert.equal(
    aRevisarNaAbertura(progresso, escocesa, T4),
    0,
    "o órfão vence e nunca desvence — não pode virar revisão fantasma",
  );
});

/* ------------------------------------------------------------------ *
 * O texto
 * ------------------------------------------------------------------ */

test("as quebras do PGN saem, e as palavras não se colam", () => {
  assert.equal(semQuebras("Dobramos o peao\nem c3 de proposito."), "Dobramos o peao em c3 de proposito.");
  assert.equal(semQuebras("  uma linha só  "), "uma linha só");
  assert.equal(semQuebras("a\n\nb"), "a b");
});

/* ------------------------------------------------------------------ *
 * A escada da revisão
 * ------------------------------------------------------------------ */

test("a linha entra na escada na primeira passada limpa e vence no dia seguinte", () => {
  const p = depoisDoTreino(zerado(), true, T1);
  assert.equal(p.degrau, 1, "a primeira passada limpa põe a linha no degrau 1");
  assert.equal(p.revisarEm, "2026-09-06T03:00:00.000Z", "e ela vence amanhã, meia-noite no Brasil");
  assert.equal(vencida(p, T2), false, "hoje ainda não venceu");
  assert.equal(vencida(p, "2026-09-06T12:00:00.000Z"), true, "amanhã venceu");
});

test("só sobe quem acerta uma linha vencida: 1 → 2 → 3 em três dias", () => {
  let p = depoisDoTreino(zerado(), true, DIA_1);
  assert.equal(p.degrau, 1);
  assert.equal(diasAteRevisar(p, DIA_1), 1, "vence amanhã");

  p = depoisDoTreino(p, true, DIA_2);
  assert.equal(p.degrau, 2);
  assert.equal(diasAteRevisar(p, DIA_2), DEGRAUS_EM_DIAS[2]);

  p = depoisDoTreino(p, true, DIA_3);
  assert.equal(p.degrau, DEGRAU_APRENDIDA);
  assert.equal(diasAteRevisar(p, DIA_3), DEGRAUS_EM_DIAS[3]);
});

test("acerto adiantado soma tentativa e não empurra a data", () => {
  // O "Jogar de novo" oito vezes numa tarde. É o buraco que faria a escada
  // valer nada: sem esta regra, o aluno fecha o mês de intervalo antes do
  // jantar.
  const p = depoisDoTreino(zerado(), true, DIA_1);
  let q = p;
  for (let i = 0; i < 8; i++) q = depoisDoTreino(q, true, DIA_1);

  assert.equal(q.tentativas, 9);
  assert.equal(q.acertosSeguidos, 9);
  assert.equal(q.degrau, p.degrau, "o degrau não se mexeu");
  assert.equal(q.revisarEm, p.revisarEm, "e a data também não");
});

test("no teto a data anda e o número fica", () => {
  let p = naEscada(DEGRAU_MAXIMO);
  const antes = p.revisarEm;
  const bemDepois = "2027-01-10T14:00:00.000Z";

  assert.equal(vencida(p, bemDepois), true);
  p = depoisDoTreino(p, true, bemDepois);
  assert.equal(p.degrau, DEGRAU_MAXIMO, "o teto não sobe");
  assert.notEqual(p.revisarEm, antes, "mas a linha é reagendada");
  assert.equal(diasAteRevisar(p, bemDepois), DEGRAUS_EM_DIAS[DEGRAU_MAXIMO]);
});

test("errar antes de aprendida volta ao degrau 0, e a linha sai da escada", () => {
  let p = naEscada(2);
  p = depoisDoTreino(p, false, DIA_3);
  assert.equal(p.degrau, 0);
  assert.equal(p.revisarEm, null);
  assert.equal(vencida(p, DIA_5), false, "fora da escada não vence nunca");
});

test("errar depois de aprendida desce dois, com piso no 1, e a data segue junto", () => {
  // 30 → 7, 14 → 3, 7 → 1. Um só era pouco; zerar apagaria um mês de intervalo
  // por um dedo errado no celular.
  const quedas: [number, number][] = [
    [DEGRAU_MAXIMO, DEGRAU_MAXIMO - QUEDA_POR_ERRO],
    [4, 2],
    [3, 1],
  ];
  for (const [de, para] of quedas) {
    const antes = naEscada(de);
    const depois = depoisDoTreino(antes, false, DIA_5);
    assert.equal(depois.degrau, para, `o degrau ${de} devia cair para ${para}`);
    assert.equal(
      diasAteRevisar(depois, DIA_5),
      DEGRAUS_EM_DIAS[para],
      "a data segue o degrau também para baixo",
    );
    assert.equal(depois.aprendidaEm, antes.aprendidaEm, "errar não apaga a data de aprendida");
  }
});

test("a linha errada não volta a vencer no mesmo dia", () => {
  // O outro lado do anti-loop: mesmo caindo para um degrau de um dia, a data
  // mínima é a meia-noite seguinte no Brasil.
  const p = depoisDoTreino(naEscada(DEGRAU_APRENDIDA), false, DIA_5);
  assert.equal(vencida(p, DIA_5), false);
  assert.equal(vencida(p, "2026-10-21T14:00:00.000Z"), true);
});

test("`vencida` lê `+00:00` do Postgres e `Z` do TypeScript como o mesmo instante", () => {
  // O bug que um `localeCompare` teria: as duas strings são o mesmo momento e
  // são diferentes byte a byte.
  const doBanco: ProgressoDaLinha = {
    ...zerado(),
    degrau: 1,
    revisarEm: "2026-09-06T03:00:00+00:00",
  };
  const doCliente: ProgressoDaLinha = { ...doBanco, revisarEm: "2026-09-06T03:00:00.000Z" };
  for (const agora of ["2026-09-06T02:59:00.000Z", "2026-09-06T03:00:00.000Z", DIA_2]) {
    assert.equal(
      vencida(doBanco, agora),
      vencida(doCliente, agora),
      `as duas escritas discordaram em ${agora}`,
    );
  }
});

test("a invariante do `check` da migration: degrau 0 se e só se sem data", () => {
  // O mesmo `repertorio_escada_coerente` escrito em TypeScript. Se a aritmética
  // daqui puder violá-lo, o banco recusa a gravação e o aluno vê "não deu para
  // gravar" sem ter feito nada de errado.
  let p = zerado();
  const roteiro: [boolean, string][] = [
    [true, DIA_1], [true, DIA_1], [true, DIA_2], [false, DIA_2],
    [true, DIA_3], [true, DIA_4], [true, DIA_5], [false, DIA_5],
  ];
  assert.equal(p.degrau === 0, p.revisarEm === null);
  for (const [acertou, quando] of roteiro) {
    p = depoisDoTreino(p, acertou, quando);
    assert.equal(
      p.degrau === 0,
      p.revisarEm === null,
      `degrau ${p.degrau} com revisarEm ${p.revisarEm}`,
    );
    assert.ok(p.degrau >= 0 && p.degrau <= DEGRAU_MAXIMO, `degrau ${p.degrau} fora da escada`);
  }
});

test("`diasAteRevisar` é nulo fora da escada e zero quando já venceu", () => {
  assert.equal(diasAteRevisar(zerado(), DIA_1), null);
  const p = depoisDoTreino(zerado(), true, DIA_1);
  assert.equal(diasAteRevisar(p, DIA_1), 1);
  assert.equal(diasAteRevisar(p, DIA_5), 0, "vencida há semanas continua sendo zero, não negativo");
});

/* ------------------------------------------------------------------ *
 * A ordem, com a escada dentro
 * ------------------------------------------------------------------ */

test("a mais vencida vem primeiro na lista de vencidas", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    // `b` venceu antes de `a`; `c` está em dia.
    [a.id]: { tentativas: 4, degrau: 2, revisarEm: "2026-09-09T03:00:00.000Z", ultimaEm: DIA_1 },
    [b.id]: { tentativas: 3, degrau: 1, revisarEm: "2026-09-08T03:00:00.000Z", ultimaEm: DIA_1 },
    [c.id]: { tentativas: 2, degrau: 3, revisarEm: "2026-09-30T03:00:00.000Z", ultimaEm: DIA_2 },
  });
  assert.deepEqual(
    vencidas([a, b, c], progresso, DIA_3).map((l) => l.id),
    [b.id, a.id],
  );
});

test("a vencida ganha da nunca-vista quando a última passada não foi revisão", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    // `a` está vencida há dias. `b` acabou de ser vista **pela primeira vez** —
    // é a mais recente, sai da disputa, e não foi revisão.
    [a.id]: { tentativas: 4, degrau: 2, revisarEm: "2026-09-08T03:00:00.000Z", ultimaEm: DIA_1 },
    [b.id]: { tentativas: 1, degrau: 1, revisarEm: "2026-09-13T03:00:00.000Z", ultimaEm: DIA_3 },
  });
  assert.equal(proximaLinha([a, b, c], progresso, DIA_3)?.id, a.id, "revisar antes de avançar");
});

test("depois de uma revisão vem uma nunca-vista — a alternância", () => {
  const [a, b, c] = tres();
  const progresso = progressoDe({
    // `a` acabou de ser revisada (degrau 2, mais de uma tentativa).
    [a.id]: { tentativas: 3, degrau: 2, revisarEm: "2026-09-14T03:00:00.000Z", ultimaEm: DIA_3 },
    // `b` está vencida e adoraria ser escolhida.
    [b.id]: { tentativas: 2, degrau: 1, revisarEm: "2026-09-08T03:00:00.000Z", ultimaEm: DIA_2 },
  });
  assert.equal(proximaLinha([a, b, c], progresso, DIA_3)?.id, c.id, "a vez é da nunca-vista");

  // E depois da nunca-vista a vencida volta a ganhar: `c` acabou de entrar na
  // escada com uma tentativa só, então não foi revisão.
  const depois = progressoDe({
    ...Object.fromEntries(progresso),
    [c.id]: { tentativas: 1, degrau: 1, revisarEm: "2026-09-13T03:00:00.000Z", ultimaEm: DIA_3 },
  });
  assert.equal(proximaLinha([a, b, c], depois, DIA_3)?.id, b.id);
});

test("a linha recém-errada não volta na chamada seguinte", () => {
  // O loop que a escada sozinha não impede: errar joga a linha para o degrau 0,
  // e o grupo dos "mais longe do degrau 3" a devolveria para sempre.
  const [a, b, c] = tres();
  const errada = depoisDoTreino({ ...zerado(), tentativas: 1, ultimaEm: DIA_1 }, false, DIA_2);
  const progresso = progressoDe({
    [a.id]: errada,
    [b.id]: { tentativas: 2, acertosSeguidos: 1, degrau: 1, revisarEm: "2026-09-30T03:00:00.000Z", ultimaEm: DIA_1 },
    [c.id]: { tentativas: 2, acertosSeguidos: 1, degrau: 1, revisarEm: "2026-09-30T03:00:00.000Z", ultimaEm: DIA_1 },
  });
  assert.notEqual(proximaLinha([a, b, c], progresso, DIA_2)?.id, a.id);
});

test("numa abertura de uma linha só, a recém-treinada volta — não há outra", () => {
  const [a] = tres();
  const progresso = progressoDe({ [a.id]: depoisDoTreino(zerado(), true, DIA_1) });
  assert.equal(proximaLinha([a], progresso, DIA_1)?.id, a.id);
});

test("abertura inteira aprendida com uma linha vencida não é `todasAprendidas`", () => {
  const [a, b, c] = tres();
  const emDia = { tentativas: 3, degrau: 3, aprendidaEm: DIA_3, revisarEm: "2026-09-30T03:00:00.000Z", ultimaEm: DIA_3 };
  const vencendo = { ...emDia, revisarEm: "2026-09-08T03:00:00.000Z" };

  const tudoEmDia = progressoDe({ [a.id]: emDia, [b.id]: emDia, [c.id]: emDia });
  assert.equal(todasAprendidas([a, b, c], tudoEmDia, DIA_3), true);

  const umaVencida = progressoDe({ [a.id]: emDia, [b.id]: emDia, [c.id]: vencendo });
  assert.equal(todasAprendidas([a, b, c], umaVencida, DIA_3), false, "há o que fazer");
});

test("a contagem de vencidas por abertura olha só as linhas daquela abertura", () => {
  const daBranca = idDaLinha("brancas", "francesa", LANCES);
  const daPreta = idDaLinha("pretas", "francesa", LANCES);
  const progresso = progressoDe({
    [daBranca]: { degrau: 2, revisarEm: "2026-09-08T03:00:00.000Z", ultimaEm: DIA_1 },
    [daPreta]: { degrau: 2, revisarEm: "2026-09-30T03:00:00.000Z", ultimaEm: DIA_1 },
  });
  assert.equal(aRevisarNaAbertura(progresso, entrada("brancas", "francesa", [daBranca]), DIA_3), 1);
  assert.equal(aRevisarNaAbertura(progresso, entrada("pretas", "francesa", [daPreta]), DIA_3), 0);
});

/* ------------------------------------------------------------------ *
 * O SAN em português
 * ------------------------------------------------------------------ */

test("o SAN vira português, e o bispo é o que não muda", () => {
  assert.equal(sanEmPortugues("Nf6"), "Cf6");
  assert.equal(sanEmPortugues("Bc4"), "Bc4");
  assert.equal(sanEmPortugues("Rxd8+"), "Txd8+");
  assert.equal(sanEmPortugues("Qd5"), "Dd5");
  assert.equal(sanEmPortugues("Kf1"), "Rf1");
  assert.equal(sanEmPortugues("e4"), "e4", "lance de peão passa inteiro");
  assert.equal(sanEmPortugues("O-O"), "O-O", "o roque não tem inicial de peça");
  assert.equal(sanEmPortugues("e8=Q"), "e8=D", "a promoção também é peça");
  // A casa `b`, minúscula, não é o bispo: a troca é só na primeira letra.
  assert.equal(sanEmPortugues("nb4"), "nb4");
});
