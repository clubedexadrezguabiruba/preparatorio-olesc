import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2 } from "./modelo.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";
import { catalogoComErro, efeitoAoTrocarTipo, prepararEdicaoDeTreino, proximoIdDeResposta } from "./autoria-treino.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

function comTreino() {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const resultado = prepararTreinosDaqui(aula, {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Mate da escada",
    objetivo: "Feche as fileiras até dar mate.",
    lado: "white",
    colocacao: "depois-do-capitulo",
    obrigatorio: true,
  }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  const aplicada = aplicarTreinosPreparados(aula, resultado.preparo);
  return { aula: aplicada, treino: structuredClone(resultado.preparo.treinos[0]) };
}

test("§16.3: duas corretas, alternativa fora do método, erro, dica e conclusão entram juntas", () => {
  const { aula, treino } = comTreino();
  const questao = treino.questoes[0];
  questao.dica = "Feche outra fileira sem deixar a torre ao alcance do rei.";
  questao.desenhos = { arrows: [{ de: "g2", para: "g4", cor: "verde" }] };
  treino.explicacaoConclusao = "As torres se alternam até o mate na última fileira.";
  const respostaCorreta2 = {
    id: proximoIdDeResposta(aula, treino, questao.id),
    moves: ["g2g3"],
    julgamento: "correta" as const,
    feedback: "Também fecha espaço, mas peça uma nova tentativa para praticar a sequência principal.",
    efeito: { tipo: "repete" as const },
  };
  questao.respostas.push(respostaCorreta2);
  const alternativa = {
    id: proximoIdDeResposta(aula, treino, questao.id),
    moves: ["g2g5"],
    julgamento: "alternativa" as const,
    feedback: "O lance é válido, mas foge da escada ensinada; tente aplicar o método.",
    efeito: { tipo: "repete" as const },
  };
  questao.respostas.push(alternativa);
  const catalogado = catalogoComErro(aula, aula.catalogo, "Torre ao alcance", "A torre permite a aproximação do rei.");
  questao.respostas.push({
    id: proximoIdDeResposta(aula, treino, questao.id),
    moves: ["g2h2"],
    julgamento: "erro",
    erroId: catalogado.erroId,
    feedback: "A torre parou de cortar a fileira. Tente de novo.",
    efeito: { tipo: "repete" },
  });

  const resultado = prepararEdicaoDeTreino(aula, { treino, catalogo: catalogado.catalogo }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  assert.equal(resultado.edicao.treino.propriedade, "personalizado", "a máquina não pode sobrescrever autoria material");
  assert.equal(resultado.edicao.treino.revisaoAvaliacao, "pendente");
  assert.deepEqual(resultado.edicao.treino.questoes[0].respostas.map((r) => r.julgamento), ["correta", "correta", "alternativa", "erro"]);
  assert.notEqual(resultado.edicao.treino.questoes[0].respostas[0].feedback, resultado.edicao.treino.questoes[0].respostas[1].feedback);

  const editada = executarComando(aula, { tipo: "EDITAR_TREINO", edicao: resultado.edicao }, positions);
  assert.deepEqual(validarAulaV2(editada, positions), { ok: true, aula: editada });
});

test("§16.3: continuação que não chega à próxima pergunta é recusada", () => {
  const { aula, treino } = comTreino();
  const resposta = treino.questoes[0].respostas[0];
  assert.equal(resposta.efeito.tipo, "avanca");
  if (resposta.efeito.tipo !== "avanca") return;
  resposta.efeito.defesas[0].move = "e3e4";
  const resultado = prepararEdicaoDeTreino(aula, { treino, catalogo: aula.catalogo }, positions);
  assert.equal(resultado.ok, false);
  if (!resultado.ok) assert.match(resultado.mensagem, /não é uma resposta legal|não chega/);
});

test("§16.3: término declarado como mate é recusado quando a posição não é mate", () => {
  const { aula, treino } = comTreino();
  treino.questoes[0].respostas[0].efeito = { tipo: "encerra", condicao: "mate" };
  const resultado = prepararEdicaoDeTreino(aula, { treino, catalogo: aula.catalogo }, positions);
  assert.deepEqual(resultado.ok, false);
  if (!resultado.ok) assert.equal(resultado.mensagem, "a posição final não é mate");
});

test("§16.3 e §6.1: salvar é uma transação; Desfazer e Refazer conservam IDs e catálogo", () => {
  const { aula, treino } = comTreino();
  treino.questoes[0].dica = "Olhe a fileira que ainda está aberta.";
  const resultado = prepararEdicaoDeTreino(aula, { treino, catalogo: aula.catalogo }, positions);
  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(aula, { tipo: "EDITAR_TREINO", edicao: resultado.edicao }, positions));
  const id = historico.presente.treinos.at(-1)!.questoes[0].id;
  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula);
  historico = refazer(historico);
  assert.equal(historico.presente.treinos.at(-1)!.questoes[0].id, id);
  assert.equal(historico.presente.treinos.at(-1)!.questoes[0].dica, "Olhe a fileira que ainda está aberta.");
});

test("§16.3: conferir a edição não altera o que o professor está digitando", () => {
  // A janela confere a cada tecla. Se a conferência aparasse o texto no próprio
  // objeto da tela, o espaço digitado depois de "Boa" sumiria antes da palavra seguinte.
  const { aula, treino } = comTreino();
  treino.questoes[0].respostas[0].feedback = "Boa ";
  treino.questoes[0].dica = "";
  const antes = structuredClone(treino);
  prepararEdicaoDeTreino(aula, { treino, catalogo: aula.catalogo }, positions);
  assert.deepEqual(treino, antes);
});

test("§16.3: trocar o que vem depois da resposta e voltar não perde a defesa já escrita", () => {
  // Achado no ensaio pelo Playwright: "Encerra → Mate" e de volta a "avança" trocava a
  // defesa e3d2 do documento pelo marcador a1a2, e o Salvar não voltava a habilitar.
  const { treino } = comTreino();
  const original = treino.questoes[0].respostas[0].efeito;
  assert.equal(original.tipo, "avanca");
  const contexto = { proximaQuestaoId: treino.questoes[1].id, original };
  assert.equal(efeitoAoTrocarTipo("encerra", contexto).tipo, "encerra");
  assert.deepEqual(efeitoAoTrocarTipo("avanca", contexto), original);
});

test("§16.3: resposta nova, sem efeito no documento, recebe a continuação padrão", () => {
  const { treino } = comTreino();
  const proximaQuestaoId = treino.questoes[1].id;
  assert.deepEqual(efeitoAoTrocarTipo("repete", { proximaQuestaoId }), { tipo: "repete" });
  assert.deepEqual(efeitoAoTrocarTipo("encerra", { proximaQuestaoId }), { tipo: "encerra", condicao: "objetivo-autoral" });
  assert.equal(efeitoAoTrocarTipo("avanca", { proximaQuestaoId }).tipo, "avanca");
});

test("§6.1 e §16.5: salvar sem mudar nada não personaliza o treino nem entra no histórico", () => {
  const { aula, treino } = comTreino();
  const noDocumento = aula.treinos.find((item) => item.id === treino.id)!;
  const resultado = prepararEdicaoDeTreino(aula, { treino: structuredClone(noDocumento), catalogo: aula.catalogo }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  assert.equal(resultado.edicao.treino.propriedade, noDocumento.propriedade);
  assert.equal(executarComando(aula, { tipo: "EDITAR_TREINO", edicao: resultado.edicao }, positions), aula);
});
