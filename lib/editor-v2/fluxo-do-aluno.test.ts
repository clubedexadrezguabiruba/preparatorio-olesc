/**
 * O aluno segue o fluxo — especificação §18 e §20, decisão do Doug de 13/9/2026.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aulaDoAlunoV2, etapasDoAlunoV2 } from "./fluxo-do-aluno.ts";
import { montarPacoteV2 } from "./pacote.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

test("§18: as etapas do aluno vêm na ordem do fluxo, e reordenar o fluxo reordena a aula", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const pacote = montarPacoteV2(aula, positions);
  assert.deepEqual(aulaDoAlunoV2(pacote).etapas.map((e) => e.tipo), ["introducao", "capitulo", "treino", "pratica"]);
  assert.deepEqual(aulaDoAlunoV2(pacote).etapas.map((e) => e.rotulo), ["Apresentação", "Aula", "Treino", "Prática real"]);

  const reordenada = structuredClone(aula);
  reordenada.fluxo = [reordenada.fluxo[0], reordenada.fluxo[2], reordenada.fluxo[1], reordenada.fluxo[3]];
  const etapas = etapasDoAlunoV2(reordenada, positions, pacote.revisoes);
  assert.deepEqual(etapas.map((e) => e.tipo), ["introducao", "treino", "capitulo", "pratica"]);
});

test("§14: os passos do capítulo do aluno são os do roteiro v1 — fala, lance, espera e desenho", () => {
  const aluno = aulaDoAlunoV2(montarPacoteV2(adaptarLessonV1(lesson, positions), positions));
  const capitulo = aluno.etapas.find((e) => e.tipo === "capitulo");
  assert.ok(capitulo && capitulo.tipo === "capitulo");
  assert.equal(capitulo.titulo, lesson.stages.objective!.technique.name);
  assert.equal(capitulo.resumo, lesson.stages.objective!.technique.summary);
  assert.equal(capitulo.fen, position.fen);
  const v1 = lesson.stages.objective!.roteiro.map((p) => ({ fala: p.fala, lance: p.lance ?? null, espera: p.espera ?? 0, casas: p.highlights ?? [], setas: p.arrows ?? [] }));
  const v2 = capitulo.passos.map((p) => ({
    fala: p.fala,
    lance: p.lance ?? null,
    espera: p.espera ?? 0,
    casas: (p.desenhos?.highlights ?? []) as string[],
    setas: (p.desenhos?.arrows ?? []) as [string, string][],
  }));
  assert.deepEqual(v2, v1);
});

test("§18: introdução com a FEN resolvida, treino com a revisão do pacote, prática com a posição", () => {
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  const [introducao, , treino, pratica] = aulaDoAlunoV2(pacote).etapas;
  assert.ok(introducao.tipo === "introducao" && treino.tipo === "treino" && pratica.tipo === "pratica");
  assert.equal(introducao.passos.length, lesson.stages.intro!.passos.length);
  assert.equal(introducao.passos[0].fen, "8/8/8/8/8/4k3/6R1/6RK w - - 0 1");
  assert.deepEqual(introducao.passos[0].highlights, ["g1", "g2", "e3"]);
  assert.equal(treino.revisao, pacote.revisoes[treino.entidadeId].revisao);
  assert.equal(Object.keys(treino.jogavel.tree.nodes).length, 5);
  // A prévia e o aluno dizem se o treino é julgado pela tablebase por esta marca (achado no
  // roteiro da 7F: a prévia dizia "não consulta a tablebase" já julgando por ela).
  assert.equal(treino.jogavel.certificado, true);
  const semEvidencia = adaptarLessonV1(lesson, positions);
  delete semEvidencia.treinos[0].certificacao!.evidencias;
  const outro = aulaDoAlunoV2(montarPacoteV2(semEvidencia, positions)).etapas.find((e) => e.tipo === "treino");
  assert.equal(outro?.tipo === "treino" && outro.jogavel.certificado, false);
  assert.equal(pratica.revisao, pacote.revisoes[pratica.entidadeId].revisao);
  assert.deepEqual([pratica.fen, pratica.goal, pratica.lado], [position.fen, "win", "white"]);
});

test("§12: comentário privado da análise não atravessa para o aluno", () => {
  const aula = adaptarLessonV1(lesson, positions);
  aula.analises[0].nos[aula.analises[0].raizId].comentario = "NOTA PRIVADA DO PROFESSOR";
  const texto = JSON.stringify(aulaDoAlunoV2(montarPacoteV2(aula, positions)));
  assert.equal(texto.includes("NOTA PRIVADA DO PROFESSOR"), false);
});
