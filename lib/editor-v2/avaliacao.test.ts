/**
 * `assessmentRevision` — plano final §10 e especificação §17.1 e §20.2.
 *
 * Duas perguntas, e as duas precisam de prova dos dois lados:
 *
 * - o que **não** é avaliação não pode mudar a revisão, ou o aluno perde o domínio por
 *   causa de uma vírgula no feedback ou de um capítulo trocado de lugar;
 * - o que **é** avaliação precisa mudar a revisão, ou o servidor aceita como dominada uma
 *   tarefa que o aluno nunca jogou.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { revisaoDaPraticaV2, revisaoDoTreinoV2, revisoesDaAulaV2 } from "./avaliacao.ts";
import type { AulaV2 } from "./modelo.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const base = () => adaptarLessonV1(lesson, positions);
const treinoDe = (aula: AulaV2) => aula.treinos[0];
const praticaDe = (aula: AulaV2) => aula.praticas[0];
const revTreino = (aula: AulaV2) => revisaoDoTreinoV2(aula, treinoDe(aula).id, positions);
const revPratica = (aula: AulaV2) => revisaoDaPraticaV2(aula, praticaDe(aula).id, positions);

test("§10: a revisão tem a forma ar_ + 64 hex e é a mesma nas duas chamadas", () => {
  assert.match(revTreino(base()), /^ar_[0-9a-f]{64}$/);
  assert.match(revPratica(base()), /^ar_[0-9a-f]{64}$/);
  assert.equal(revTreino(base()), revTreino(base()));
  assert.deepEqual(Object.keys(revisoesDaAulaV2(base(), positions)).sort(), [treinoDe(base()).id, praticaDe(base()).id].sort());
});

test("§10: título, feedback, texto de defesa, desenho, dica escrita, narração e ordem do fluxo não mudam a revisão", () => {
  const antes = base();
  const t = revTreino(antes);
  const p = revPratica(antes);
  const aula = base();
  aula.titulo = "Outro título";
  treinoDe(aula).titulo = "Treino renomeado";
  treinoDe(aula).introducao = "Outra abertura.";
  treinoDe(aula).objetivo = "Outro texto de objetivo.";
  treinoDe(aula).explicacaoConclusao = "Muito bem.";
  const q = treinoDe(aula).questoes[0];
  q.respostas[0].feedback = "Outro feedback.";
  q.dica = "Outra dica com outro texto.";
  q.desenhos = { arrows: [{ de: "e2", para: "e4", cor: "vermelho" }] };
  if (q.respostas[0].efeito.tipo === "avanca") q.respostas[0].efeito.defesas[0].texto = "Texto da defesa.";
  aula.capitulos[0].narracoes[0].texto = "Narração nova.";
  praticaDe(aula).titulo = "Prática renomeada";
  aula.fluxo = [...aula.fluxo].reverse();
  // A ordem das respostas dentro da pergunta também não é avaliação: o juiz procura o lance.
  q.respostas.reverse();
  assert.equal(revTreino(aula), t);
  assert.equal(revPratica(aula), p);
});

const mudancasDoTreino: Array<[string, (aula: AulaV2) => void]> = [
  ["perfil", (a) => { treinoDe(a).perfil = "linha-autoral"; }],
  ["lado do aluno", (a) => { treinoDe(a).ladoAluno = "black"; }],
  ["política do defensor", (a) => { treinoDe(a).defensor.politica = "fixa"; }],
  ["término", (a) => { treinoDe(a).termino = { tipo: "limite", maxPlies: 20 }; }],
  // Declarado pelo professor desde 15/9/2026 (trava 2); o adaptador o traz do `goal` do v1.
  ["resultado declarado", (a) => { treinoDe(a).resultado = "draw"; }],
  ["resultado da certificação antiga, num treino que não declara", (a) => { delete treinoDe(a).resultado; treinoDe(a).certificacao!.resultado = "draw"; }],
  ["lances de uma resposta", (a) => { treinoDe(a).questoes[0].respostas[0].moves = ["c6b7"]; }],
  ["julgamento de uma resposta", (a) => { treinoDe(a).questoes[0].respostas[0].julgamento = "alternativa"; }],
  ["efeito de uma resposta", (a) => { treinoDe(a).questoes[0].respostas[0].efeito = { tipo: "repete" }; }],
  ["lance do defensor", (a) => {
    const efeito = treinoDe(a).questoes[0].respostas[0].efeito;
    if (efeito.tipo === "avanca") efeito.defesas[0].move = "e7d6";
  }],
  ["condição de término", (a) => {
    const efeito = treinoDe(a).questoes.at(-1)!.respostas[0].efeito;
    if (efeito.tipo === "encerra") efeito.condicao = "mate";
  }],
  ["presença de dica", (a) => {
    const q = treinoDe(a).questoes.find((item) => item.dica)!;
    delete q.dica;
  }],
  ["posição de uma pergunta", (a) => { treinoDe(a).questoes[1].posicao = { ...treinoDe(a).questoes[1].posicao, nodeId: treinoDe(a).questoes[2].posicao.nodeId }; }],
  ["defesa inicial", (a) => { treinoDe(a).defesaInicial = { move: "e7e6", primeiraQuestaoId: treinoDe(a).questoes[0].id }; }],
];

for (const [nome, mudar] of mudancasDoTreino) {
  test(`§10: mudar ${nome} muda a revisão do treino`, () => {
    const aula = base();
    const antes = revTreino(aula);
    mudar(aula);
    assert.notEqual(revTreino(aula), antes);
  });
}

const mudancasDaPratica: Array<[string, (aula: AulaV2, pos: Record<string, Position>) => void]> = [
  ["lado", (a) => { praticaDe(a).ladoAluno = "black"; }],
  ["objetivo", (a) => { praticaDe(a).objetivo = "draw"; }],
  ["força do motor", (a) => { praticaDe(a).engine = { ...praticaDe(a).engine, skill: 10 }; }],
  ["tempo do motor", (a) => { praticaDe(a).engine = { ...praticaDe(a).engine, moveTimeMs: 900 }; }],
  ["posição", (_a, pos) => { pos[position.id] = { ...position, fen: "8/8/8/8/8/4k3/6R1/6RK w - - 0 1" }; }],
];

for (const [nome, mudar] of mudancasDaPratica) {
  test(`§17.1: mudar ${nome} da prática muda a revisão`, () => {
    const aula = base();
    const antes = revPratica(aula);
    const pos = { ...positions };
    mudar(aula, pos);
    assert.notEqual(revisaoDaPraticaV2(aula, praticaDe(aula).id, pos), antes);
  });
}
