import assert from "node:assert/strict";
import test from "node:test";
import { agendaDeRevisao, revisoesDevidas, type EventoDeAula } from "./revisao.ts";

/**
 * A agenda é função dos eventos: estes testes montam o histórico à mão e
 * perguntam quando a aula volta. Nada de banco, nada de relógio — `hoje` é
 * parâmetro.
 *
 * As datas são meio-dia em São Paulo (`T15:00:00Z`) para o dia da linha ser o
 * dia escrito, sem depender do fuso de quem roda o teste.
 */
function evento(etapa: string, dia: string, sucesso = true): EventoDeAula {
  return { etapa, sucesso, criada_em: `${dia}T15:00:00.000Z` };
}

test("aula curta dominada volta em três dias", () => {
  const eventos = [evento("pratica", "2026-09-14")];
  assert.deepEqual(agendaDeRevisao("curta", eventos), { devidoEm: "2026-09-17", rodada: 1 });
});

test("aula completa só entra na fila quando as duas metades saíram", () => {
  const soPratica = [evento("pratica", "2026-09-14")];
  assert.equal(agendaDeRevisao("completa", soPratica), null);

  const soSolo = [evento("solo", "2026-09-14")];
  assert.equal(agendaDeRevisao("completa", soSolo), null);

  // Com as duas, vale a mais tardia: é aí que a aula passou a estar dominada.
  const asDuas = [evento("solo", "2026-09-14"), evento("pratica", "2026-09-16")];
  assert.deepEqual(agendaDeRevisao("completa", asDuas), { devidoEm: "2026-09-19", rodada: 1 });
});

test("tentativa fracassada não domina nem adianta nada", () => {
  const eventos = [evento("pratica", "2026-09-14", false), evento("pratica", "2026-09-15")];
  assert.deepEqual(agendaDeRevisao("curta", eventos), { devidoEm: "2026-09-18", rodada: 1 });
});

test("aula de leitura nunca entra na fila", () => {
  assert.equal(agendaDeRevisao("leitura", [evento("pratica", "2026-09-14")]), null);
});

test("revisão vencida sobe para 7, depois 14, depois sai", () => {
  const eventos = [evento("pratica", "2026-09-14"), evento("revisao", "2026-09-17")];
  assert.deepEqual(agendaDeRevisao("curta", eventos), { devidoEm: "2026-09-24", rodada: 2 });

  eventos.push(evento("revisao", "2026-09-24"));
  assert.deepEqual(agendaDeRevisao("curta", eventos), { devidoEm: "2026-10-08", rodada: 3 });

  eventos.push(evento("revisao", "2026-10-08"));
  assert.equal(agendaDeRevisao("curta", eventos), null, "a terceira revisão tira da fila");
});

test("revisão na mesma sessão da aula não conta", () => {
  // O botão "Ir para a revisão" no fim da prática: o aluno joga a posição de
  // revisão no mesmo dia. Isso é continuar a aula, não recordá-la.
  const eventos = [evento("pratica", "2026-09-14"), evento("revisao", "2026-09-14")];
  assert.deepEqual(agendaDeRevisao("curta", eventos), { devidoEm: "2026-09-17", rodada: 1 });
});

test("revisão perdida não muda nada, e a atrasada conta do dia dela", () => {
  const perdida = [evento("pratica", "2026-09-14"), evento("revisao", "2026-09-17", false)];
  assert.deepEqual(agendaDeRevisao("curta", perdida), { devidoEm: "2026-09-17", rodada: 1 });

  const atrasada = [evento("pratica", "2026-09-14"), evento("revisao", "2026-09-23")];
  assert.deepEqual(agendaDeRevisao("curta", atrasada), { devidoEm: "2026-09-30", rodada: 2 });
});

test("o dia do evento é o de Guabiruba", () => {
  // 00:30 UTC de 15/9 é 21:30 de 14/9 em São Paulo: dominou no 14, volta no 17.
  const eventos = [{ etapa: "pratica", sucesso: true, criada_em: "2026-09-15T00:30:00.000Z" }];
  assert.deepEqual(agendaDeRevisao("curta", eventos), { devidoEm: "2026-09-17", rodada: 1 });
});

test("as devidas saem da mais atrasada para a menos, depois pela trilha", () => {
  const aulas = [
    { id: "A", formato: "curta" as const, ordem: 3 },
    { id: "B", formato: "curta" as const, ordem: 1 },
    { id: "C", formato: "curta" as const, ordem: 2 },
    { id: "D", formato: "leitura" as const, ordem: 4 },
  ];
  const eventos = new Map<string, EventoDeAula[]>([
    ["A", [evento("pratica", "2026-09-10")]], // devida 13/9
    ["B", [evento("pratica", "2026-09-12")]], // devida 15/9
    ["C", [evento("pratica", "2026-09-12")]], // devida 15/9, mesma data de B
    ["D", [evento("pratica", "2026-09-10")]], // leitura: nunca
  ]);

  assert.deepEqual(
    revisoesDevidas(aulas, eventos, "2026-09-16").map((r) => r.aula),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    revisoesDevidas(aulas, eventos, "2026-09-14").map((r) => r.aula),
    ["A"],
  );
  assert.deepEqual(revisoesDevidas(aulas, eventos, "2026-09-12"), []);
});
