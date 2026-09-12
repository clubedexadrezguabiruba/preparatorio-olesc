import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { linhaLongaV2, POSICOES_DO_CORPUS } from "./corpus.ts";
import { validarAulaV2 } from "./modelo.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const lessonN0 = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const positionN0 = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));

function aulaBase() {
  return adaptarLessonV1(lesson, positions);
}

function preparar(lado: "white" | "black" | "ambos" = "white", colocacao: "depois-do-capitulo" | "fim-da-aula" = "depois-do-capitulo") {
  const aula = aulaBase();
  const capitulo = aula.capitulos[0];
  const resultado = prepararTreinosDaqui(aula, {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Pratique a oposição",
    objetivo: "Leve o peão até a promoção.",
    lado,
    colocacao,
    obrigatorio: true,
  }, positions);
  assert.equal(resultado.ok, true);
  if (!resultado.ok) throw new Error("o preparo esperado foi recusado");
  return { aula, capitulo, preparo: resultado.preparo };
}

test("§16.1: criar treino daqui deriva as seis perguntas do aluno e fecha na promoção", () => {
  const { aula, preparo } = preparar();
  const treino = preparo.treinos[0];
  assert.equal(treino.questoes.length, 6);
  assert.deepEqual(treino.inicio, treino.questoes[0].posicao);
  assert.deepEqual(treino.questoes[0].respostas[0].moves, ["c6c7"]);
  assert.deepEqual(treino.questoes[0].respostas[0].efeito, {
    tipo: "avanca",
    defesas: [{ move: "e7e6", proximaQuestaoId: treino.questoes[1].id }],
  });
  assert.deepEqual(treino.questoes.at(-1)!.respostas[0].efeito, { tipo: "encerra", condicao: "promotion" });
  assert.equal(treino.propriedade, "derivado");
  assert.equal(treino.fonte, "atual");
  assert.equal(treino.origem?.hash.length, 8);
  assert.equal(treino.revisaoAvaliacao, "pendente");
  const aplicada = aplicarTreinosPreparados(aula, preparo);
  assert.deepEqual(validarAulaV2(aplicada, positions), { ok: true, aula: aplicada });
});

test("§16.1: a linha real de ensaio N0-LADDER vira cinco perguntas e termina em mate", () => {
  const posicoesN0: Record<string, Position> = { [positionN0.id]: positionN0 };
  const aula = adaptarLessonV1(lessonN0, posicoesN0);
  const capitulo = aula.capitulos[0];
  const resultado = prepararTreinosDaqui(aula, {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Pratique o mate da escada",
    objetivo: "Feche uma fileira por vez até o mate.",
    lado: "white",
    colocacao: "depois-do-capitulo",
    obrigatorio: true,
  }, posicoesN0);

  assert.equal(resultado.ok, true);
  if (!resultado.ok) throw new Error("a linha N0-LADDER deveria gerar um treino");
  assert.equal(resultado.preparo.treinos[0].questoes.length, 5);
  assert.deepEqual(resultado.preparo.treinos[0].questoes.at(-1)!.respostas[0].efeito, { tipo: "encerra", condicao: "mate" });
  assert.deepEqual(validarAulaV2(aplicarTreinosPreparados(aula, resultado.preparo), posicoesN0), {
    ok: true,
    aula: aplicarTreinosPreparados(aula, resultado.preparo),
  });
});

test("§16: o modelo recusa defesa inicial que aponta para pergunta inexistente", () => {
  const { aula, preparo } = preparar("black");
  const aplicada = aplicarTreinosPreparados(aula, preparo);
  aplicada.treinos.at(-1)!.defesaInicial!.primeiraQuestaoId = "questao-inexistente";
  const validacao = validarAulaV2(aplicada, positions);
  assert.equal(validacao.ok, false);
  if (validacao.ok) throw new Error("a referência quebrada deveria ser recusada");
  assert.ok(validacao.diagnosticos.some((problema) => problema.codigo === "DEFESA_INICIAL_SEM_QUESTAO"));
});

test("§16.4: ao treinar pretas, o defensor abre e também conclui a linha", () => {
  const { preparo } = preparar("black");
  const treino = preparo.treinos[0];
  assert.equal(treino.questoes.length, 5);
  assert.deepEqual(treino.defesaInicial, { move: "c6c7", primeiraQuestaoId: treino.questoes[0].id });
  assert.deepEqual(treino.questoes[0].respostas[0].moves, ["e7e6"]);
  assert.deepEqual(treino.questoes.at(-1)!.respostas[0].efeito, {
    tipo: "encerra",
    condicao: "promotion",
    defesaFinal: "b7b8q",
  });
});

test("§16.2: ambos os lados criam duas tarefas e duas etapas com ids próprios", () => {
  const { aula, preparo } = preparar("ambos");
  assert.equal(preparo.treinos.length, 2);
  assert.equal(new Set(preparo.treinos.map((treino) => treino.id)).size, 2);
  assert.equal(new Set(preparo.etapas.map((etapa) => etapa.id)).size, 2);
  assert.deepEqual(preparo.treinos.map((treino) => treino.ladoAluno), ["white", "black"]);
  assert.match(preparo.treinos[0].titulo, /brancas/);
  assert.match(preparo.treinos[1].titulo, /pretas/);
  const aplicada = aplicarTreinosPreparados(aula, preparo);
  assert.equal(aplicada.treinos.length, aula.treinos.length + 2);
});

test("§16.2: treino de capítulo entra logo depois dele, sem criar outra ordem", () => {
  const { aula, capitulo, preparo } = preparar();
  const aplicada = aplicarTreinosPreparados(aula, preparo);
  const indice = aplicada.fluxo.findIndex((etapa) => etapa.entidadeId === capitulo.id);
  assert.deepEqual(aplicada.fluxo.slice(indice, indice + 2).map((etapa) => etapa.tipo), ["capitulo", "treino"]);
  assert.equal(aplicada.fluxo[indice + 1].entidadeId, preparo.treinos[0].id);
  assert.deepEqual(aplicada.capitulos, aula.capitulos, "a ordem continua vindo só do fluxo");
});

test("§16.2: treino geral entra antes das práticas finais", () => {
  const { aula, preparo } = preparar("white", "fim-da-aula");
  const aplicada = aplicarTreinosPreparados(aula, preparo);
  const indiceNovo = aplicada.fluxo.findIndex((etapa) => etapa.entidadeId === preparo.treinos[0].id);
  const indicePratica = aplicada.fluxo.findIndex((etapa) => etapa.tipo === "pratica");
  assert.equal(indiceNovo, indicePratica - 1);
});

test("§6.1 e §16: criar é um comando; Desfazer e Refazer devolvem os mesmos ids", () => {
  const { aula, preparo } = preparar("ambos");
  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(aula, { tipo: "ADICIONAR_TREINOS", preparo }, positions));
  const ids = historico.presente.treinos.slice(-2).map((treino) => treino.id);
  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula);
  historico = refazer(historico);
  assert.deepEqual(historico.presente.treinos.slice(-2).map((treino) => treino.id), ids);
});

test("§16.1: título, objetivo, variante fora do capítulo e fim sem lance são recusados sem alterar a aula", () => {
  const aula = aulaBase();
  const capitulo = aula.capitulos[0];
  const pedido = {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Treino",
    objetivo: "Promover.",
    lado: "white" as const,
    colocacao: "depois-do-capitulo" as const,
    obrigatorio: true,
  };
  assert.deepEqual(prepararTreinosDaqui(aula, { ...pedido, titulo: " " }, positions), { ok: false, campo: "titulo", mensagem: "escreva um título para o treino" });
  assert.deepEqual(prepararTreinosDaqui(aula, { ...pedido, objetivo: " " }, positions), { ok: false, campo: "objetivo", mensagem: "explique o objetivo que o aluno deve alcançar" });
  const fim = capitulo.caminho.at(-1)!;
  assert.match((prepararTreinosDaqui(aula, { ...pedido, nodeId: fim }, positions) as { mensagem: string }).mensagem, /nenhum lance/);
  const analise = aula.analises[0];
  analise.nos[analise.raizId].filhos.push("variante-teste");
  analise.nos["variante-teste"] = { id: "variante-teste", uci: "c6b6", filhos: [] };
  assert.match((prepararTreinosDaqui(aula, { ...pedido, nodeId: "variante-teste" }, positions) as { mensagem: string }).mensagem, /fora do percurso/);
});

test("§8 do plano: o hash inclui ancestrais e objetivo, mas não o título", () => {
  const primeiro = preparar().preparo.treinos[0];
  const aula = aulaBase();
  const capitulo = aula.capitulos[0];
  const pedido = {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Outro título",
    objetivo: "Leve o peão até a promoção.",
    lado: "white" as const,
    colocacao: "depois-do-capitulo" as const,
    obrigatorio: true,
  };
  const tituloMudou = prepararTreinosDaqui(aula, pedido, positions);
  assert.equal(tituloMudou.ok, true);
  if (!tituloMudou.ok) return;
  assert.equal(tituloMudou.preparo.treinos[0].origem?.hash, primeiro.origem?.hash);
  const objetivoMudou = prepararTreinosDaqui(aula, { ...pedido, objetivo: "Outro objetivo." }, positions);
  assert.equal(objetivoMudou.ok, true);
  if (!objetivoMudou.ok) return;
  assert.notEqual(objetivoMudou.preparo.treinos[0].origem?.hash, primeiro.origem?.hash);
  aula.analises[0].inicio = { tipo: "fen", fen: position.fen };
  const inicioMudou = prepararTreinosDaqui(aula, pedido, positions);
  assert.equal(inicioMudou.ok, true);
  if (!inicioMudou.ok) return;
  assert.notEqual(inicioMudou.preparo.treinos[0].origem?.hash, primeiro.origem?.hash);
});

test("§17 do plano: a derivação aceita 200 meios-lances e recusa 201 com os dois números", () => {
  const pedido = (aula: ReturnType<typeof linhaLongaV2>) => ({
    capituloId: aula.capitulos[0].id,
    nodeId: aula.capitulos[0].inicioNodeId,
    titulo: "Treino longo",
    objetivo: "Percorrer a linha medida.",
    lado: "ambos" as const,
    colocacao: "depois-do-capitulo" as const,
    obrigatorio: false,
  });
  const noLimite = linhaLongaV2(200);
  assert.equal(prepararTreinosDaqui(noLimite, pedido(noLimite), POSICOES_DO_CORPUS).ok, true);

  const acima = linhaLongaV2(201);
  assert.deepEqual(prepararTreinosDaqui(acima, pedido(acima), POSICOES_DO_CORPUS), {
    ok: false,
    campo: "trecho",
    mensagem: "este trecho tem 201 meios-lances e uma criação de treino aceita até 200; comece de uma posição mais adiante",
  });
});
