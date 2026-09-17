/**
 * A trava por aula do curso de abertura (feedback do aluno, 17/9/2026): as linhas do move trainer
 * da aula X só destravam quando X está concluída, as aulas vão em ordem, e o professor passa sempre.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  aulaLiberada,
  destinoDaAulaTrancada,
  donaDaLinha,
  estadoDasAulas,
  linhaLiberada,
  linhasTrancadas,
  podeGravarLinha,
  type AulaTravada,
} from "./trava.ts";

// O desenho da Francesa: A e B com linhas próprias, D sem move trainer, E+F revisando tudo.
const AULAS: AulaTravada[] = [
  { id: "AB-BRANCAS-FRANCESA-A", linhaIds: ["l1", "l2"] },
  { id: "AB-BRANCAS-FRANCESA-B", linhaIds: ["l3", "l1"] },
  { id: "AB-BRANCAS-FRANCESA-C", linhaIds: ["l4"] },
  { id: "AB-BRANCAS-FRANCESA-D", linhaIds: [] },
  { id: "AB-BRANCAS-FRANCESA-EF", linhaIds: ["l1", "l2", "l3", "l4", "l5"] },
];
const [A, B, C, , EF] = AULAS.map((a) => a.id);
const nada = new Set<string>();
const soA = new Set([A]);
const aluno = { professor: false };
const professor = { professor: true };

test("a linha é da primeira aula que a lista — inclusive a que só a E+F traz", () => {
  assert.equal(donaDaLinha(AULAS, "l1")?.id, A, "l1 aparece em A, B e E+F: é de A");
  assert.equal(donaDaLinha(AULAS, "l3")?.id, B);
  assert.equal(donaDaLinha(AULAS, "l5")?.id, EF, "a linha que só a revisão tem é da revisão");
  assert.equal(donaDaLinha(AULAS, "fora"), null, "linha sem aula não é desta regra");
});

test("aulas em ordem: B só abre com A concluída; o professor abre tudo", () => {
  assert.equal(aulaLiberada(AULAS, A, nada, aluno), true, "a primeira está sempre aberta");
  assert.equal(aulaLiberada(AULAS, B, nada, aluno), false);
  assert.equal(aulaLiberada(AULAS, B, soA, aluno), true);
  assert.equal(aulaLiberada(AULAS, EF, new Set([A, B, C]), aluno), false, "falta a D, que não tem linha");
  assert.equal(aulaLiberada(AULAS, EF, nada, professor), true);
});

test("a linha destrava ao concluir a aula dona", () => {
  assert.equal(linhaLiberada(AULAS, "l1", nada, aluno), false);
  assert.equal(linhaLiberada(AULAS, "l1", soA, aluno), true);
  assert.equal(linhaLiberada(AULAS, "l3", soA, aluno), false, "l3 é de B");
  assert.equal(linhaLiberada(AULAS, "fora", nada, aluno), true, "linha que nenhuma aula lista é livre");
  assert.equal(linhaLiberada(AULAS, "l5", nada, professor), true);
});

test("gravar: a aula própria passa, a trancada recusa, o professor passa, a chave desliga", () => {
  const rodadas = new Set([A]);
  // O move trainer da aula A grava as linhas dela antes de A estar concluída — é assim que ela conclui.
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l2", concluidas: nada, quem: aluno, deAula: A, rodadasAbertas: rodadas }), true);
  // Sem `deAula` (a página de treino), a mesma linha está trancada.
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l2", concluidas: nada, quem: aluno, rodadasAbertas: rodadas }), false);
  // A aula B tentando gravar antes de A estar concluída: B está trancada.
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l3", concluidas: nada, quem: aluno, deAula: B, rodadasAbertas: new Set([B]) }), false);
  // Uma aula dizendo gravar linha que ela não lista.
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l4", concluidas: nada, quem: aluno, deAula: A, rodadasAbertas: rodadas }), false);
  // Aula liberada, mas sem rodada aberta: não passa.
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l3", concluidas: soA, quem: aluno, deAula: B, rodadasAbertas: nada }), false);
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l3", concluidas: soA, quem: aluno, deAula: B, rodadasAbertas: new Set([B]) }), true);
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l5", concluidas: nada, quem: professor, rodadasAbertas: nada }), true, "professor sempre livre");
  assert.equal(podeGravarLinha({ aulas: AULAS, linhaId: "l5", concluidas: nada, quem: aluno, rodadasAbertas: nada, trava: false }), true, "TRAVA_POR_AULA desligada");
});

test("as linhas trancadas são as das aulas não concluídas; professor e chave desligada não têm nenhuma", () => {
  assert.deepEqual([...linhasTrancadas(AULAS, nada, aluno)].sort(), ["l1", "l2", "l3", "l4", "l5"]);
  assert.deepEqual([...linhasTrancadas(AULAS, soA, aluno)].sort(), ["l3", "l4", "l5"]);
  assert.equal(linhasTrancadas(AULAS, nada, professor).size, 0);
  assert.equal(linhasTrancadas(AULAS, nada, aluno, false).size, 0);
});

test("aula trancada redireciona para a página da abertura; a liberada e o professor não", () => {
  const voltar = "/aberturas/brancas/francesa";
  assert.equal(destinoDaAulaTrancada(AULAS, B, nada, aluno, voltar), voltar);
  assert.equal(destinoDaAulaTrancada(AULAS, B, soA, aluno, voltar), null);
  assert.equal(destinoDaAulaTrancada(AULAS, A, nada, aluno, voltar), null);
  assert.equal(destinoDaAulaTrancada(AULAS, EF, nada, professor, voltar), null);
  assert.equal(destinoDaAulaTrancada(AULAS, EF, nada, aluno, voltar, false), null, "chave desligada");
});

test("o estado de cada aula na linha do tempo: concluída, estudar agora, trancada", () => {
  assert.deepEqual(estadoDasAulas(AULAS, soA, aluno), ["concluida", "agora", "trancada", "trancada", "trancada"]);
  assert.deepEqual(estadoDasAulas(AULAS, nada, professor), ["agora", "aberta", "aberta", "aberta", "aberta"]);
  assert.deepEqual(
    estadoDasAulas(AULAS, new Set(AULAS.map((a) => a.id)), aluno),
    ["concluida", "concluida", "concluida", "concluida", "concluida"],
  );
});
