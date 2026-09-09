import assert from "node:assert/strict";
import test from "node:test";
import { TRILHA } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { MINIMO_DA_SEQUENCIA_MIN, diasComOMinimo, maiorSequenciaDeDias, type MinutosDoDia } from "./hoje.ts";
import { NIVEIS } from "./nivel.ts";
import { DEGRAUS, ganhos, proximos, selos, type ParaOsSelos } from "./selos.ts";

/**
 * O que se cobra de um selo é que ele seja **permanente** e que, quando
 * trancado, diga o que falta. As duas coisas são fáceis de escrever errado e
 * silenciosas quando erradas: um selo que some não estoura nada, e um selo mudo
 * parece um selo.
 */

const ZERADO: ParaOsSelos = {
  temasFechados: 0,
  aulasAprendidas: 0,
  repertorio: {
    brancasCompletas: false,
    pretasCompletas: false,
    baseCompleto: false,
    avancadoCompleto: false,
  },
  conquistado: 0,
  diasComUmaHora: 0,
  maiorSequencia: 0,
};

const com = (mudancas: Partial<ParaOsSelos>): ParaOsSelos => ({ ...ZERADO, ...mudancas });
const acha = (p: ParaOsSelos, id: string) => {
  const s = selos(p).find((x) => x.id === id);
  assert.ok(s, `selo ${id} não existe`);
  return s;
};

const linha = (dia: string, minutos: number): MinutosDoDia => ({
  dia,
  bloco: "tatica",
  tempo_ms: minutos * 60_000,
});

/* ------------------------------------------------------------------ *
 * A armadilha da janela de 30 dias
 * ------------------------------------------------------------------ */

test("um selo ganho há 40 dias continua ganho", () => {
  // **O defeito que este teste existe para impedir.** O painel lia os minutos de
  // apenas 30 dias, e sobre essa janela "Uma hora" ganho no dia 1 sumiria no dia
  // 32 — o site tirando do aluno uma coisa que ele fez.
  const haQuarentaDias = [linha("2026-08-01", 75)];
  assert.equal(diasComOMinimo(haQuarentaDias), 1);
  assert.equal(acha(com({ diasComUmaHora: 1 }), "hora-1").ganho, true);

  // E o mesmo para a constância: o recorde é do histórico, não da janela.
  const semanaDeAgosto = ["01", "02", "03", "04", "05", "06", "07"].map((d) =>
    linha(`2026-08-${d}`, 70),
  );
  assert.equal(maiorSequenciaDeDias(semanaDeAgosto), 7);
  assert.equal(acha(com({ maiorSequencia: 7 }), "constante-7").ganho, true);
});

test("a maior sequência é o recorde, e não a de agora", () => {
  // Dez dias seguidos em agosto, um buraco, e dois dias em setembro. A sequência
  // corrente é 2; o recorde é 10, e é o recorde que vale o selo.
  const agosto = Array.from({ length: 10 }, (_, i) =>
    linha(`2026-08-${String(i + 1).padStart(2, "0")}`, 65),
  );
  const setembro = [linha("2026-09-08", 65), linha("2026-09-09", 65)];
  assert.equal(maiorSequenciaDeDias([...agosto, ...setembro]), 10);
});

test("um dia curto quebra a sequência, e a partida declarada não a sustenta", () => {
  // A view só tem linhas de tempo medido — a partida não gera linha nenhuma —,
  // então "não sustenta" sai de graça: não há o que excluir. O que este teste
  // cobra é o outro lado: 59 minutos não valem.
  const quaseLa = [linha("2026-09-07", 65), linha("2026-09-08", 59), linha("2026-09-09", 65)];
  assert.equal(maiorSequenciaDeDias(quaseLa), 1);
  assert.ok(59 < MINIMO_DA_SEQUENCIA_MIN);
});

/* ------------------------------------------------------------------ *
 * Os degraus
 * ------------------------------------------------------------------ */

test("os degraus de tática cabem no currículo, e o último é o currículo inteiro", () => {
  const temas = BLOCOS.flatMap((b) => b.temas).length;
  assert.equal(DEGRAUS.tatica[DEGRAUS.tatica.length - 1], temas, "o último degrau são os 36");
  for (const d of DEGRAUS.tatica) assert.ok(d <= temas, `o degrau ${d} não existe no currículo`);
});

test("os degraus de finais cabem na trilha, e o último é a trilha inteira", () => {
  assert.equal(DEGRAUS.finais[DEGRAUS.finais.length - 1], TRILHA.length);
  for (const d of DEGRAUS.finais) assert.ok(d <= TRILHA.length, `o degrau ${d} não existe`);
});

test("os degraus sobem, e nunca repetem", () => {
  for (const [nome, lista] of Object.entries(DEGRAUS)) {
    for (let i = 1; i < lista.length; i += 1) {
      assert.ok(lista[i] > lista[i - 1], `${nome}: o degrau ${lista[i]} não sobe`);
    }
  }
});

test("o degrau 13 de tática é a meta da OLESC, e não um número redondo", () => {
  // Se alguém trocar por 10 achando que fica mais bonito, este teste pergunta
  // por quê: 13 é o total de temas dos níveis 1 a 3, que é a meta declarada.
  const ate3 = BLOCOS.filter((b) => b.nivel <= 3).flatMap((b) => b.temas).length;
  assert.equal(ate3, 13);
  assert.ok(DEGRAUS.tatica.includes(13));
});

test("o primeiro degrau de finais é alcançável com o que existe hoje", () => {
  // São 49 aulas na taxonomia e 2 publicadas. Um primeiro degrau em 5 seria um
  // selo que nenhum aluno pode ganhar, por um motivo que não é dele.
  assert.equal(DEGRAUS.finais[0], 1);
});

/* ------------------------------------------------------------------ *
 * A forma
 * ------------------------------------------------------------------ */

test("todo selo trancado diz o que falta, e nenhum ganho diz", () => {
  // Selo apagado que não diz o que falta é decoração: mostra que existe coisa
  // boa e esconde como chegar lá.
  const meio = com({
    temasFechados: 5,
    aulasAprendidas: 1,
    conquistado: 1,
    diasComUmaHora: 3,
    maiorSequencia: 4,
  });
  for (const s of selos(meio)) {
    if (s.ganho) assert.equal(s.falta, null, `${s.id} está ganho e ainda diz o que falta`);
    else assert.ok(s.falta && s.falta.length > 8, `${s.id} está trancado e não diz o que falta`);
    assert.ok(s.nome.length > 3, `${s.id} sem nome`);
    assert.ok(s.conta.length > 20, `${s.id} sem explicação`);
  }
});

test("nenhum id se repete", () => {
  const ids = selos(ZERADO).map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("o aluno zerado não tem selo nenhum, e o aluno completo tem todos", () => {
  assert.deepEqual(ganhos(selos(ZERADO)), []);

  const tudo: ParaOsSelos = {
    temasFechados: 36,
    aulasAprendidas: 49,
    repertorio: {
      brancasCompletas: true,
      pretasCompletas: true,
      baseCompleto: true,
      avancadoCompleto: true,
    },
    conquistado: 5,
    diasComUmaHora: 40,
    maiorSequencia: 40,
  };
  const lista = selos(tudo);
  assert.equal(ganhos(lista).length, lista.length, "sobrou selo trancado no aluno completo");
  assert.deepEqual(proximos(lista), [], "o aluno completo não tem próximo");
});

test("os degraus acendem na ordem, e não pulam", () => {
  const doze = selos(com({ temasFechados: 12 })).filter((s) => s.familia === "tatica");
  assert.deepEqual(
    doze.map((s) => s.ganho),
    [true, true, false, false, false],
    "com 12 temas, os degraus 3 e 7 acendem e o 13 não",
  );
  assert.equal(doze[2].falta, "falta 1 tema", "e o 13 diz que falta um");
});

test("os níveis acendem até o conquistado, e o próximo diz o que fazer", () => {
  const lista = selos(com({ conquistado: 2 }));
  const deNivel = lista.filter((s) => s.familia === "nivel");
  assert.equal(deNivel.length, NIVEIS.length);
  assert.deepEqual(
    deNivel.map((s) => s.ganho),
    [true, true, false, false, false],
  );
  assert.equal(deNivel[2].falta, "feche as três frentes e faça a prova");
  assert.match(deNivel[3].falta ?? "", /conquiste antes o nível 3/);
});

/* ------------------------------------------------------------------ *
 * `proximos`
 * ------------------------------------------------------------------ */

test("os dois próximos vêm de famílias diferentes", () => {
  // Sem isto os dois próximos seriam sempre os dois degraus seguintes de tática,
  // e o aluno nunca ficaria sabendo que existe um selo de constância.
  const dois = proximos(selos(ZERADO));
  assert.equal(dois.length, 2);
  assert.notEqual(dois[0].familia, dois[1].familia);
  assert.ok(dois.every((s) => !s.ganho));
});

test("`proximos` pula a família que já está completa", () => {
  const lista = selos(
    com({ temasFechados: 36, aulasAprendidas: 49, diasComUmaHora: 1, maiorSequencia: 30 }),
  );
  for (const s of proximos(lista, 4)) {
    assert.ok(["repertorio", "nivel"].includes(s.familia), `${s.id} não devia estar pendente`);
  }
});

test("o repertório tem os quatro selos declarados, e o Base é o portão", () => {
  const doRepertorio = selos(ZERADO).filter((s) => s.familia === "repertorio");
  assert.deepEqual(doRepertorio.map((s) => s.id), [
    "repertorio-brancas",
    "repertorio-pretas",
    "repertorio-base",
    "repertorio-avancado",
  ]);
  assert.match(acha(ZERADO, "repertorio-base").conta, /abre o Avançado/);
});
