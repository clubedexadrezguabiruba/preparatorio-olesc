import assert from "node:assert/strict";
import test from "node:test";
import {
  aprendida,
  aprendidas,
  aulasVencidas,
  DEGRAU_APRENDIDA,
  DEGRAU_MAXIMO,
  DEGRAUS_EM_DIAS,
  depoisDaPassada,
  diasAteRevisar,
  QUEDA_POR_ERRO,
  vencida,
  zerada,
  type ProgressoDaEscada,
} from "./escada.ts";

/**
 * A escada de finais, caso por caso.
 *
 * **Este arquivo é `lib/repertorio/treino.test.ts` portado**, e o porte é
 * literal de propósito: `lib/finais/escada.ts` é uma cópia declarada de
 * `lib/repertorio/treino.ts`, e o que impede as duas de divergirem em silêncio
 * é justamente os dois testes cobrarem os mesmos casos com os mesmos números.
 * Se um dia os finais precisarem de degraus mais largos — um final de torres
 * não se revisa como uma Escandinava —, é aqui que a divergência aparece
 * escrita, e não no comportamento na frente do aluno.
 *
 * O que **não** foi portado: tudo que era do juiz de lances do repertório
 * (`vereditoDoLance`, `conferirLinha`, `proximaLinha`). Em finais quem julga a
 * passada é `rejulgarPratica`, no servidor, contra a partida jogada — e ele tem
 * os seus próprios testes em `rejulgar.test.ts`.
 */

const T1 = "2026-09-05T10:00:00.000Z";
const T2 = "2026-09-05T11:00:00.000Z";

/** Dias distintos, para subir a escada: cada um vence o agendamento anterior. */
const DIA_1 = "2026-09-05T14:00:00.000Z";
const DIA_2 = "2026-09-07T14:00:00.000Z";
const DIA_3 = "2026-09-12T14:00:00.000Z";
const DIA_4 = "2026-09-25T14:00:00.000Z";
const DIA_5 = "2026-10-20T14:00:00.000Z";

/** Uma aula subida até o degrau pedido, em dias distintos e vencidos. */
function naEscada(ate: number): ProgressoDaEscada {
  const dias = [DIA_1, DIA_2, DIA_3, DIA_4, DIA_5];
  let p = zerada();
  for (let d = 0; d < ate; d++) p = depoisDaPassada(p, true, dias[d]);
  assert.equal(p.degrau, ate, `a montagem do teste devia parar no degrau ${ate}`);
  return p;
}

/* ------------------------------------------------------------------ *
 * Os contadores
 * ------------------------------------------------------------------ */

test("vencer soma tentativa; perder soma tentativa e erro", () => {
  let p = depoisDaPassada(zerada(), true, T1);
  assert.deepEqual(p, {
    tentativas: 1,
    erros: 0,
    aprendidaEm: null,
    ultimaEm: T1,
    degrau: 1,
    revisarEm: "2026-09-06T03:00:00.000Z",
  });

  p = depoisDaPassada(p, false, T2);
  assert.equal(p.tentativas, 2);
  assert.equal(p.erros, 1);
  assert.equal(p.degrau, 0, "perder antes de aprendida tira a aula da escada");
});

test("os erros nunca passam das tentativas", () => {
  // A invariante do `check` `finais_contas_possiveis` da migration 0007,
  // escrita em TypeScript: a chave de serviço ignora a RLS, não as restrições.
  let p = zerada();
  for (const [venceu, quando] of [
    [true, DIA_1],
    [false, DIA_1],
    [false, DIA_2],
    [true, DIA_2],
  ] as const) {
    p = depoisDaPassada(p, venceu, quando);
    assert.ok(p.erros >= 0 && p.tentativas >= p.erros, `${p.erros} erros em ${p.tentativas}`);
  }
});

/* ------------------------------------------------------------------ *
 * A escada
 * ------------------------------------------------------------------ */

test("a aula entra na escada na primeira vitória e vence no dia seguinte", () => {
  const p = depoisDaPassada(zerada(), true, T1);
  assert.equal(p.degrau, 1, "a primeira vitória põe a aula no degrau 1");
  assert.equal(p.revisarEm, "2026-09-06T03:00:00.000Z", "e ela vence amanhã, meia-noite no Brasil");
  assert.equal(vencida(p, T2), false, "hoje ainda não venceu");
  assert.equal(vencida(p, "2026-09-06T12:00:00.000Z"), true, "amanhã venceu");
});

test("só sobe quem vence uma aula vencida: 1 → 2 → 3 em três dias", () => {
  // **É esta a definição de "três passadas".** Não são três vitórias: são três
  // dias distintos, e é o que faz a palavra "aprendida" querer dizer alguma
  // coisa no sábado.
  let p = depoisDaPassada(zerada(), true, DIA_1);
  assert.equal(p.degrau, 1);
  assert.equal(diasAteRevisar(p, DIA_1), 1, "vence amanhã");
  assert.equal(aprendida(p), false);

  p = depoisDaPassada(p, true, DIA_2);
  assert.equal(p.degrau, 2);
  assert.equal(diasAteRevisar(p, DIA_2), DEGRAUS_EM_DIAS[2]);
  assert.equal(aprendida(p), false);

  p = depoisDaPassada(p, true, DIA_3);
  assert.equal(p.degrau, DEGRAU_APRENDIDA);
  assert.equal(diasAteRevisar(p, DIA_3), DEGRAUS_EM_DIAS[3]);
  assert.equal(aprendida(p), true, "o terceiro degrau é o que aprende a aula");
});

test("vencer oito vezes na mesma tarde não move a escada", () => {
  // O "Recomeçar a partida" oito vezes. É o buraco que faria a escada valer
  // nada: sem esta regra, o aluno fecha o mês de intervalo antes do jantar.
  const p = depoisDaPassada(zerada(), true, DIA_1);
  let q = p;
  for (let i = 0; i < 8; i++) q = depoisDaPassada(q, true, DIA_1);

  assert.equal(q.tentativas, 9);
  assert.equal(q.degrau, p.degrau, "o degrau não se mexeu");
  assert.equal(q.revisarEm, p.revisarEm, "e a data também não");
});

test("no teto a data anda e o número fica", () => {
  let p = naEscada(DEGRAU_MAXIMO);
  const antes = p.revisarEm;
  const bemDepois = "2027-01-10T14:00:00.000Z";

  assert.equal(vencida(p, bemDepois), true);
  p = depoisDaPassada(p, true, bemDepois);
  assert.equal(p.degrau, DEGRAU_MAXIMO, "o teto não sobe");
  assert.notEqual(p.revisarEm, antes, "mas a aula é reagendada");
  assert.equal(diasAteRevisar(p, bemDepois), DEGRAUS_EM_DIAS[DEGRAU_MAXIMO]);
});

test("perder antes de aprendida volta ao degrau 0, e a aula sai da escada", () => {
  let p = naEscada(2);
  p = depoisDaPassada(p, false, DIA_3);
  assert.equal(p.degrau, 0);
  assert.equal(p.revisarEm, null);
  assert.equal(vencida(p, DIA_5), false, "fora da escada não vence nunca");
});

test("perder depois de aprendida desce dois, com piso no 1, e a data segue junto", () => {
  // 30 → 7, 14 → 3, 7 → 1. Um só era pouco; zerar apagaria um mês de intervalo
  // por uma partida perdida — e perder para o Stockfish em skill 20 acontece.
  const quedas: [number, number][] = [
    [DEGRAU_MAXIMO, DEGRAU_MAXIMO - QUEDA_POR_ERRO],
    [4, 2],
    [3, 1],
  ];
  for (const [de, para] of quedas) {
    const antes = naEscada(de);
    const depois = depoisDaPassada(antes, false, DIA_5);
    assert.equal(depois.degrau, para, `o degrau ${de} devia cair para ${para}`);
    assert.equal(
      diasAteRevisar(depois, DIA_5),
      DEGRAUS_EM_DIAS[para],
      "a data segue o degrau também para baixo",
    );
    assert.equal(depois.aprendidaEm, antes.aprendidaEm, "perder não apaga a data de aprendida");
    assert.equal(aprendida(depois), true, "a aula perde posto, nunca desaprende de vez");
  }
});

test("a aula perdida não volta a vencer no mesmo dia", () => {
  // O outro lado do anti-loop: mesmo caindo para um degrau de um dia, a data
  // mínima é a meia-noite seguinte no Brasil.
  const p = depoisDaPassada(naEscada(DEGRAU_APRENDIDA), false, DIA_5);
  assert.equal(vencida(p, DIA_5), false);
  assert.equal(vencida(p, "2026-10-21T14:00:00.000Z"), true);
});

test("`vencida` lê `+00:00` do Postgres e `Z` do TypeScript como o mesmo instante", () => {
  // O bug que um `localeCompare` teria: as duas strings são o mesmo momento e
  // são diferentes byte a byte.
  const doBanco: ProgressoDaEscada = {
    ...zerada(),
    degrau: 1,
    revisarEm: "2026-09-06T03:00:00+00:00",
  };
  const doCliente: ProgressoDaEscada = { ...doBanco, revisarEm: "2026-09-06T03:00:00.000Z" };
  for (const agora of ["2026-09-06T02:59:00.000Z", "2026-09-06T03:00:00.000Z", DIA_2]) {
    assert.equal(
      vencida(doBanco, agora),
      vencida(doCliente, agora),
      `as duas escritas discordaram em ${agora}`,
    );
  }
});

test("a invariante do `check` da migration: degrau 0 se e só se sem data", () => {
  // O mesmo `finais_escada_coerente` escrito em TypeScript. Se a aritmética
  // daqui puder violá-lo, o banco recusa a gravação e o aluno vê "não deu para
  // gravar" sem ter feito nada de errado.
  let p = zerada();
  const roteiro: [boolean, string][] = [
    [true, DIA_1],
    [true, DIA_1],
    [true, DIA_2],
    [false, DIA_2],
    [true, DIA_3],
    [true, DIA_4],
    [true, DIA_5],
    [false, DIA_5],
  ];
  assert.equal(p.degrau === 0, p.revisarEm === null);
  for (const [venceu, quando] of roteiro) {
    p = depoisDaPassada(p, venceu, quando);
    assert.equal(
      p.degrau === 0,
      p.revisarEm === null,
      `degrau ${p.degrau} com revisarEm ${p.revisarEm}`,
    );
    assert.ok(p.degrau >= 0 && p.degrau <= DEGRAU_MAXIMO, `degrau ${p.degrau} fora da escada`);
  }
});

test("`diasAteRevisar` é nulo fora da escada e zero quando já venceu", () => {
  assert.equal(diasAteRevisar(zerada(), DIA_1), null);
  const p = depoisDaPassada(zerada(), true, DIA_1);
  assert.equal(diasAteRevisar(p, DIA_1), 1);
  assert.equal(diasAteRevisar(p, DIA_5), 0, "vencida há semanas continua sendo zero, não negativo");
});

/* ------------------------------------------------------------------ *
 * A fila do dia
 * ------------------------------------------------------------------ */

function mapa(entradas: Record<string, Partial<ProgressoDaEscada>>) {
  return new Map(
    Object.entries(entradas).map(([id, p]) => [id, { ...zerada(), ...p } as ProgressoDaEscada]),
  );
}

test("a mais vencida vem primeiro na fila", () => {
  const progresso = mapa({
    // `b` venceu antes de `a`; `c` está em dia.
    a: { tentativas: 4, degrau: 2, revisarEm: "2026-09-09T03:00:00.000Z", ultimaEm: DIA_1 },
    b: { tentativas: 3, degrau: 1, revisarEm: "2026-09-08T03:00:00.000Z", ultimaEm: DIA_1 },
    c: { tentativas: 2, degrau: 3, revisarEm: "2026-09-30T03:00:00.000Z", ultimaEm: DIA_2 },
  });
  assert.deepEqual(aulasVencidas(["a", "b", "c"], progresso, DIA_3), ["b", "a"]);
});

test("aula nunca jogada não entra na fila — ela não está atrasada, está por começar", () => {
  assert.deepEqual(aulasVencidas(["a", "b"], new Map(), DIA_5), []);
});

test("`aprendidas` conta o degrau 3, e não a vitória única", () => {
  // **É esta a mudança de significado no site inteiro.** Antes, `a` estaria
  // dominada: ela tem uma vitória. Hoje ela está no degrau 1, e falta duas
  // passadas em dois outros dias.
  const progresso = mapa({
    a: depoisDaPassada(zerada(), true, DIA_1),
    b: naEscada(DEGRAU_APRENDIDA),
    c: depoisDaPassada(naEscada(DEGRAU_APRENDIDA), false, DIA_5),
  });
  assert.deepEqual([...aprendidas(["a", "b", "c"], progresso)].sort(), ["b", "c"]);
  assert.equal(
    progresso.get("c")!.degrau,
    1,
    "a `c` caiu para o degrau 1 e continua aprendida: perde posto, não desaprende",
  );
});
