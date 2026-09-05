import assert from "node:assert/strict";
import test from "node:test";
import { idDaLinha, type Linha } from "./linhas.ts";
import {
  ACERTOS_PARA_APRENDER,
  aprendida,
  aprendidasDaAbertura,
  conferirLinha,
  depoisDoTreino,
  lanceCerto,
  proximaLinha,
  resumo,
  semQuebras,
  todasAprendidas,
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

test("acertar soma; errar zera os seguidos e soma um erro", () => {
  let p = depoisDoTreino(zerado(), true, T1);
  assert.deepEqual(p, {
    acertosSeguidos: 1,
    tentativas: 1,
    erros: 0,
    aprendidaEm: null,
    ultimaEm: T1,
  });

  p = depoisDoTreino(p, false, T2);
  assert.equal(p.acertosSeguidos, 0);
  assert.equal(p.erros, 1);
  assert.equal(p.tentativas, 2);
  assert.equal(p.ultimaEm, T2);
});

test("o terceiro acerto seguido marca `aprendidaEm`, e o erro seguinte não a desmarca", () => {
  let p = zerado();
  for (const t of [T1, T2]) p = depoisDoTreino(p, true, t);
  assert.equal(aprendida(p), false, `${ACERTOS_PARA_APRENDER - 1} acertos ainda não é aprendida`);

  p = depoisDoTreino(p, true, T3);
  assert.equal(p.aprendidaEm, T3);

  // A regra que a tela depende: errar depois vira revisão, não recomeço.
  p = depoisDoTreino(p, false, T4);
  assert.equal(p.acertosSeguidos, 0);
  assert.equal(p.aprendidaEm, T3, "a data de quando aprendeu não volta a nulo");
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
  assert.deepEqual(resumo([a, b, c], progresso), { aprendidas: 1, total: 3 });
});

test("a contagem por abertura filtra pelo prefixo do id, com a cor dentro", () => {
  // O slug pode repetir entre as cores; sem a cor no prefixo, a "francesa" das
  // brancas emprestaria progresso para uma "francesa" das pretas.
  const brancas = linha({ abertura: "francesa" });
  const pretas = linha({ cor: "pretas", abertura: "francesa" });
  const progresso = progressoDe({
    [idDaLinha("brancas", "francesa", LANCES)]: { aprendidaEm: T1, ultimaEm: T1 },
    [idDaLinha("pretas", "francesa", LANCES)]: { aprendidaEm: T1, ultimaEm: T1 },
    [idDaLinha("brancas", "italiana", LANCES)]: { aprendidaEm: T1, ultimaEm: T1 },
  });
  assert.equal(aprendidasDaAbertura(progresso, brancas.cor, brancas.abertura), 1);
  assert.equal(aprendidasDaAbertura(progresso, pretas.cor, pretas.abertura), 1);
  assert.equal(aprendidasDaAbertura(progresso, "brancas", "escocesa"), 0);
});

/* ------------------------------------------------------------------ *
 * O texto
 * ------------------------------------------------------------------ */

test("as quebras do PGN saem, e as palavras não se colam", () => {
  assert.equal(semQuebras("Dobramos o peao\nem c3 de proposito."), "Dobramos o peao em c3 de proposito.");
  assert.equal(semQuebras("  uma linha só  "), "uma linha só");
  assert.equal(semQuebras("a\n\nb"), "a b");
});
