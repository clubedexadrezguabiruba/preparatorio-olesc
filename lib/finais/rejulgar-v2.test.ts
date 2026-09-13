import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { adaptarLessonV1 } from "../editor-v2/adaptar-v1.ts";
import { quadroDoNo } from "../editor-v2/arvore.ts";
import { aplicarEdicaoDeTreino, prepararEdicaoDeTreino } from "../editor-v2/autoria-treino.ts";
import { executarComando } from "../editor-v2/comandos.ts";
import type { AulaV2, TreinoV2 } from "../editor-v2/modelo.ts";
import { montarPacoteV2 } from "../editor-v2/pacote.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "../editor-v2/treinos.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { rejulgarPraticaV2, rejulgarTreinoV2 } from "./rejulgar-v2.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const LINHA = ["g2g4", "g1g3", "g3g2", "g2e2", "g4g1"];

test("§20.2: a linha certa do treino guiado da N0-LADDER é aceita", () => {
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  const treino = pacote.aula.treinos[0].id;
  assert.deepEqual(rejulgarTreinoV2(pacote, treino, LINHA, 1), { sucesso: true, motivo: "a linha chegou ao fim" });
  // Um lance fora da linha no meio (a peça volta) continua sendo a mesma tentativa.
  assert.deepEqual(rejulgarTreinoV2(pacote, treino, ["g2g4", "g1g2", "g1g3", "g3g2", "g2e2", "g4g1"], 1), { sucesso: true, motivo: "a linha chegou ao fim" });
});

test("§20.2: lista forjada é recusada — lance ilegal, lance depois do fim, treino inacabado, vazio", () => {
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  const treino = pacote.aula.treinos[0].id;
  assert.match((rejulgarTreinoV2(pacote, treino, ["g2g4", "a1a8"], 1) as { erro: string }).erro, /lance ilegal/);
  assert.match((rejulgarTreinoV2(pacote, treino, [...LINHA, "h1h2"], 1) as { erro: string }).erro, /depois do fim/);
  assert.match((rejulgarTreinoV2(pacote, treino, LINHA.slice(0, 3), 1) as { erro: string }).erro, /não terminou/);
  assert.match((rejulgarTreinoV2(pacote, treino, [], 1) as { erro: string }).erro, /sem lance/);
  assert.match((rejulgarTreinoV2(pacote, "treino-inventado", LINHA, 1) as { erro: string }).erro, /não tem esse treino/);
});

/** "Criar treino daqui" pelas brancas, com uma segunda defesa na primeira resposta. */
function comDuasDefesas(): { aula: AulaV2; treinoId: string; fuga: string; fecho: string } {
  const base0 = adaptarLessonV1(lesson, positions);
  const capitulo = base0.capitulos[0];
  const preparo = prepararTreinosDaqui(base0, { capituloId: capitulo.id, nodeId: capitulo.inicioNodeId, titulo: "Escada", objetivo: "Feche as fileiras.", lado: "white", colocacao: "depois-do-capitulo", obrigatorio: true }, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const base = aplicarTreinosPreparados(base0, preparo.preparo);
  const treino: TreinoV2 = structuredClone(base.treinos.find((item) => item.id === preparo.preparo.treinos[0].id)!);
  const resposta = treino.questoes[0].respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  const escrita = resposta.efeito.defesas[0];
  const seguinte = treino.questoes.find((q) => q.id === escrita.proximaQuestaoId)!;
  const analise = base.analises.find((item) => item.id === seguinte.posicao.analiseId)!;
  const depoisDoAluno = Object.values(analise.nos).find((no) => no.filhos.includes(seguinte.posicao.nodeId))!;
  const fuga = new Chess(quadroDoNo(base, analise.id, depoisDoAluno.id, positions).fen).moves({ verbose: true }).map((m) => `${m.from}${m.to}`).filter((uci) => uci !== escrita.move).sort()[0];
  const aula = executarComando(base, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: depoisDoAluno.id, uci: fuga, novoNodeId: "no-fuga-rejulgar" }, positions);
  const fecho = new Chess(quadroDoNo(aula, analise.id, "no-fuga-rejulgar", positions).fen).moves({ verbose: true }).map((m) => `${m.from}${m.to}`).sort()[0];
  treino.questoes.push({ id: "questao-fuga-rejulgar", posicao: { analiseId: analise.id, nodeId: "no-fuga-rejulgar" }, respostas: [{ id: "resposta-fuga-rejulgar", moves: [fecho], julgamento: "correta", feedback: "Fechou.", efeito: { tipo: "encerra", condicao: "objetivo-autoral" } }] });
  resposta.efeito.defesas.push({ move: fuga, proximaQuestaoId: "questao-fuga-rejulgar" });
  treino.explicacaoConclusao = "O rei fugiu, e as torres fecharam do mesmo jeito.";
  const edicao = prepararEdicaoDeTreino(aula, { treino, ...(aula.catalogo ? { catalogo: aula.catalogo } : {}) }, positions);
  if (!edicao.ok) assert.fail(edicao.mensagem);
  return { aula: aplicarEdicaoDeTreino(aula, edicao.edicao), treinoId: treino.id, fuga, fecho };
}

test("§16.4 no servidor: com duas defesas, a mesma lista vale numa tentativa e não na seguinte", () => {
  const { aula, treinoId, fecho } = comDuasDefesas();
  const pacote = montarPacoteV2(aula, positions);
  const lances = ["g2g4", fecho];
  const um = rejulgarTreinoV2(pacote, treinoId, lances, 1);
  const dois = rejulgarTreinoV2(pacote, treinoId, lances, 2);
  // A rotação garante que tentativas seguidas enfrentam defesas diferentes: numa delas o
  // defensor foge e `fecho` encerra; na outra ele desce e a linha não termina ali.
  const aceitas = [um, dois].filter((r) => "sucesso" in r && r.sucesso).length;
  assert.equal(aceitas, 1, JSON.stringify({ um, dois }));
  assert.match((rejulgarTreinoV2(pacote, treinoId, lances, 0) as { erro: string }).erro, /tentativa inválido/);
});

test("§16.3 no servidor: o teto de lances encerra a tentativa como fracasso", () => {
  const aula = adaptarLessonV1(lesson, positions);
  aula.treinos[0].termino = { tipo: "limite", maxPlies: 2 };
  const pacote = montarPacoteV2(aula, positions);
  assert.deepEqual(rejulgarTreinoV2(pacote, aula.treinos[0].id, ["g2g4"], 1), { sucesso: false, motivo: "acabaram os lances" });
});

test("§20.2: a prática v2 é julgada pela posição, objetivo e lado do pacote", () => {
  const pacote = montarPacoteV2(adaptarLessonV1(lesson, positions), positions);
  const pratica = pacote.aula.praticas[0].id;
  // A escada da aula, jogada dos dois lados até o mate.
  const mate = ["g2g4", "e3d2", "g1g3", "d2c1", "g3g2", "c1b1", "g2e2", "b1a1", "g4g1"];
  const julgado = rejulgarPraticaV2(pacote, pratica, mate);
  assert.equal("sucesso" in julgado && julgado.sucesso, true, JSON.stringify(julgado));
  assert.match((rejulgarPraticaV2(pacote, pratica, ["g2g4", "e3d3"]) as { erro: string }).erro, /não terminou/);
  assert.match((rejulgarPraticaV2(pacote, "pratica-inventada", mate) as { erro: string }).erro, /não tem essa prática/);
});
