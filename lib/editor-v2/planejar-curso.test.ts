/**
 * O planejador do curso de abertura contra o estudo v1.5 — parada medível da F3 (16/9/2026):
 * problemas e limites vazios, planejar duas vezes dá o mesmo, B09 aceita 5.dxc5, D sem treino.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compilarRepertorio } from "../repertorio/compilar.ts";
import { estudoComOsMudosComentados } from "../repertorio/estudo-francesa-de-teste.ts";
import { problemasParaPublicarV2 } from "./conferencia.ts";
import { etapasDoAlunoV2 } from "./fluxo-do-aluno.ts";
import { problemasDeLimiteV2 } from "./limites.ts";
import { problemasDaAulaV2, validarAulaV2 } from "./modelo.ts";
import { planejarCursoDeAbertura, type CursoPlanejado } from "./planejar-curso.ts";
import { previaDaAula } from "./previa.ts";
import { treinoJogavel } from "./treino-jogavel.ts";

const OPCOES = { cor: "brancas", abertura: "francesa", nomeDaAbertura: "Francesa 3.Bd3", agora: new Date("2026-09-16T00:00:00Z") } as const;
const LICHESS = readFileSync("e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn", "utf8");
const LOCAL = readFileSync("e2e/fixtures/francesa-v15-pgn-local.pgn", "utf8");
const cursos: Array<[string, CursoPlanejado]> = [
  ["link do Lichess", planejarCursoDeAbertura(LICHESS, OPCOES)],
  ["PGN local", planejarCursoDeAbertura(LOCAL, OPCOES)],
];
const aula = (curso: CursoPlanejado, bloco: string) => curso.aulas.find((a) => a.bloco === bloco)!.aula;

for (const [caminho, curso] of cursos) {
  test(`${caminho}: 5 aulas AB-, válidas, sem problema de rascunho nem de limite`, () => {
    assert.deepEqual(curso.aulas.map((a) => a.aula.id), ["AB-BRANCAS-FRANCESA-A", "AB-BRANCAS-FRANCESA-B", "AB-BRANCAS-FRANCESA-C", "AB-BRANCAS-FRANCESA-D", "AB-BRANCAS-FRANCESA-EF"]);
    for (const { aula: a } of curso.aulas) {
      assert.ok(validarAulaV2(a).ok, a.id);
      assert.deepEqual(problemasDaAulaV2(a, {}).map((p) => `${p.codigo}: ${p.mensagem}`), [], a.id);
      assert.deepEqual(problemasDeLimiteV2(a), [], a.id);
      assert.equal(a.metadados?.classe, undefined, "aula de abertura não tem classe de finais");
      assert.equal(a.metadados?.orientacaoPadrao, "white", "a cor do curso, não o Orientation do export");
    }
  });

  test(`${caminho}: paradas, ramos e move trainer por aula`, () => {
    assert.deepEqual(curso.aulas.map((a) => a.paradas), [2, 8, 3, 0, 12]);
    // E+F: E20 tem 7 ramos e E21 um; a revisão F23 não tem ramo narrado.
    assert.deepEqual(curso.aulas.map((a) => a.ramos), [0, 5, 4, 0, 8]);
    assert.deepEqual(curso.aulas.map((a) => a.linhasDoTreinador), [2, 8, 9, 0, 19]);
    for (const { aula: a, paradas } of curso.aulas) assert.equal(a.treinos.filter((t) => t.papel === "parada").length, paradas, a.id);
  });

  test(`${caminho}: regra 18 — a partida modelo é só o capítulo`, () => {
    const d = aula(curso, "D");
    assert.deepEqual(d.fluxo.map((e) => e.tipo), ["capitulo"]);
    assert.deepEqual(d.treinos, []);
    assert.equal(d.treinadores, undefined);
  });

  test(`${caminho}: toda aula de bloco termina em treino guiado e move trainer`, () => {
    for (const bloco of ["A", "B", "C", "EF"]) {
      const tipos = aula(curso, bloco).fluxo.map((e) => e.tipo);
      assert.deepEqual(tipos.slice(-2), ["treino", "treinador"], bloco);
    }
    const ef = aula(curso, "EF");
    const indiceDaRevisao = ef.fluxo.findIndex((e) => e.tipo === "introducao");
    assert.ok(indiceDaRevisao > 0 && indiceDaRevisao === ef.fluxo.length - 3, "F23 vem antes do treino guiado");
  });

  test(`${caminho}: B05A — a parada pede 6.Be4; B09 aceita 5.dxc5 e 5.Nf3 como «também vale»`, () => {
    const b = aula(curso, "B");
    const b05a = b.treinos.find((t) => t.id.startsWith("treino-parada-b05a"))!;
    assert.equal(b05a.introducao, "Qual lance de bispo ataca a dama e fecha sua saída?");
    assert.deepEqual(b05a.questoes[0].respostas.map((r) => [r.julgamento, r.moves[0]]), [["correta", "d3e4"]]);
    const b09 = b.treinos.find((t) => t.id.startsWith("treino-parada-b09"))!;
    assert.deepEqual(b09.questoes[0].respostas.map((r) => [r.julgamento, r.moves[0]]), [["correta", "c2c3"], ["alternativa", "d4c5"], ["alternativa", "g1f3"]]);
    // O treino se joga: o juiz do aluno o monta sem lançar, e a alternativa aceita e repete.
    const jogavel = treinoJogavel(b, b09.id, {});
    assert.equal(jogavel.tree.nodes[b09.questoes[0].id].authorAlternatives?.length, 2);
  });

  test(`${caminho}: os marcadores nunca chegam crus ao aluno, e o ramo diz «Voltamos a…»`, () => {
    for (const { aula: a } of curso.aulas) {
      const previa = previaDaAula(a, {});
      for (const trecho of previa.trechos) for (const passo of trecho.passos) assert.doesNotMatch(passo.fala, /\[[A-Z ]{3,}\]/, `${a.id}: ${passo.fala}`);
    }
    const b = previaDaAula(aula(curso, "B"), {});
    assert.ok(b.trechos.some((t) => t.passos.some((p) => /^Voltamos /.test(p.fala))));
  });
}

test("planejar duas vezes o mesmo estudo dá aulas idênticas", () => {
  assert.equal(JSON.stringify(planejarCursoDeAbertura(LICHESS, OPCOES).aulas), JSON.stringify(cursos[0][1].aulas));
});

test("com o repertório gerado aplicado, as 5 aulas podem publicar", () => {
  const curso = planejarCursoDeAbertura(estudoComOsMudosComentados(LICHESS), OPCOES);
  const compilado = compilarRepertorio([{ nome: "brancas-francesa.pgn", texto: curso.pgn.texto }], []);
  assert.deepEqual(compilado.problemas, []);
  const linhasDoRepertorio = new Set(compilado.linhas.map((l) => l.id));
  for (const { aula: a } of curso.aulas) {
    const erros = problemasParaPublicarV2(a, { positions: {}, linhasDoRepertorio }).filter((p) => p.severidade === "erro");
    assert.deepEqual(erros.map((p) => `${p.codigo}: ${p.mensagem}`), [], a.id);
    for (const id of a.treinadores?.[0]?.linhaIds ?? []) assert.ok(linhasDoRepertorio.has(id));
  }
  // E o aluno recebe as etapas, com o move trainer no fim.
  const b = curso.aulas.find((a) => a.bloco === "B")!.aula;
  const revisoes = Object.fromEntries(b.treinos.map((t) => [t.id, { tipo: "treino" as const, revisao: "ar_teste" }]));
  const etapas = etapasDoAlunoV2(b, {}, revisoes as never);
  assert.equal(etapas.at(-1)?.tipo, "treinador");
  assert.equal(etapas.filter((e) => e.tipo === "treino" && e.parada).length, 8);
});
