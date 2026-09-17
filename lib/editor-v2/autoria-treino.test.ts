import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2 } from "./modelo.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";
import { aplicarEdicaoDeTreino, catalogoComErro, destinoDoLanceDoTabuleiro, efeitoAoTrocarTipo, lanceDoTabuleiro, prepararEdicaoDeTreino, proximoIdDeResposta } from "./autoria-treino.ts";
import { Chess } from "chess.js";
import { quadroDoNo } from "./arvore.ts";
import { acrescentarDefesa, fugasDaAnalise, proximoIdDeQuestao, removerDefesa, tornarDefesaFixa } from "./defesas-do-treino.ts";

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

test("§16.4: a mesma defesa duas vezes na mesma resposta é recusada", () => {
  const { aula, treino } = comTreino();
  const resposta = treino.questoes[0].respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  resposta.efeito.defesas.push({ ...resposta.efeito.defesas[0] });
  const resultado = prepararEdicaoDeTreino(aula, { treino, ...(aula.catalogo ? { catalogo: aula.catalogo } : {}) }, positions);
  assert.equal(resultado.ok, false);
  if (!resultado.ok) assert.match(resultado.mensagem, /aparece duas vezes/);
});

test("§16.4: uma resposta aceita até 4 defesas, o teto do runtime do aluno", () => {
  const { aula, treino } = comTreino();
  const resposta = treino.questoes[0].respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  const destino = resposta.efeito.defesas[0].proximaQuestaoId;
  resposta.efeito.defesas = ["e3d2", "e3d3", "e3d4", "e3e4", "e3f4"].map((move) => ({ move, proximaQuestaoId: destino }));
  const resultado = prepararEdicaoDeTreino(aula, { treino, ...(aula.catalogo ? { catalogo: aula.catalogo } : {}) }, positions);
  assert.equal(resultado.ok, false);
  if (!resultado.ok) assert.match(resultado.mensagem, /até 4 defesas/);
});

test("§16.4 decisão B: a segunda defesa só vem de variante da análise, e a pergunta nova nasce vazia", () => {
  const { aula, treino } = comTreino();
  const questao = treino.questoes[0];
  const resposta = questao.respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  const semVariante = fugasDaAnalise(aula, treino, questao.id, resposta.id, positions);
  assert.deepEqual(semVariante.fugas, []);
  assert.match(semVariante.motivo ?? "", /tabuleiro do capítulo/);

  const analise = aula.analises.find((item) => item.id === questao.posicao.analiseId)!;
  const depoisDoAluno = analise.nos[questao.posicao.nodeId].filhos.map((id) => analise.nos[id]).find((no) => no.uci === resposta.moves[0])!;
  const escrita = resposta.efeito.defesas[0].move;
  const fuga = new Chess(quadroDoNo(aula, analise.id, depoisDoAluno.id, positions).fen).moves({ verbose: true })
    .map((lance) => `${lance.from}${lance.to}`).filter((uci) => uci !== escrita).sort()[0];
  const comVariante = executarComando(aula, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: depoisDoAluno.id, uci: fuga, novoNodeId: "no-fuga-autoria" }, positions);
  const { fugas, motivo } = fugasDaAnalise(comVariante, treino, questao.id, resposta.id, positions);
  assert.equal(motivo, undefined);
  assert.deepEqual(fugas.map((item) => [item.move, item.nodeId, item.questaoId]), [[fuga, "no-fuga-autoria", undefined]]);

  const novaQuestaoId = proximoIdDeQuestao(comVariante, treino, "no-fuga-autoria");
  const acrescido = acrescentarDefesa(treino, questao.id, resposta.id, fugas[0], novaQuestaoId);
  assert.equal(acrescentarDefesa(acrescido, questao.id, resposta.id, fugas[0], "outro-id"), acrescido, "a mesma defesa duas vezes não tem efeito");
  assert.equal(treino.questoes.length + 1, acrescido.questoes.length);
  const catalogo = comVariante.catalogo ? { catalogo: comVariante.catalogo } : {};
  const incompleto = prepararEdicaoDeTreino(comVariante, { treino: acrescido, ...catalogo }, positions);
  assert.equal(incompleto.ok, false);
  if (!incompleto.ok) assert.match(incompleto.mensagem, /precisa de ao menos uma resposta/);

  const nova = acrescido.questoes.find((item) => item.id === novaQuestaoId)!;
  const lanceDoAluno = new Chess(quadroDoNo(comVariante, analise.id, "no-fuga-autoria", positions).fen).moves({ verbose: true })
    .map((lance) => `${lance.from}${lance.to}`).sort()[0];
  nova.respostas.push({ id: proximoIdDeResposta(comVariante, acrescido, nova.id), moves: [lanceDoAluno], julgamento: "correta", feedback: "Por este lado também.", efeito: { tipo: "repete" } });
  const pronto = prepararEdicaoDeTreino(comVariante, { treino: acrescido, ...catalogo }, positions);
  if (!pronto.ok) assert.fail(pronto.mensagem);
  const salva = aplicarEdicaoDeTreino(comVariante, pronto.edicao);
  assert.equal(validarAulaV2(salva).ok, true);
  const salvo = salva.treinos.find((item) => item.id === treino.id)!;
  assert.deepEqual(fugasDaAnalise(salva, salvo, questao.id, resposta.id, positions).fugas, [], "a defesa que já entrou não é oferecida de novo");
});

test("§16.4: usar sempre esta põe a defesa no topo; remover apaga só a pergunta vazia que ela abria", () => {
  const { treino } = comTreino();
  const questao = treino.questoes[0];
  const resposta = questao.respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  const original = resposta.efeito.defesas[0];
  assert.equal(removerDefesa(treino, questao.id, resposta.id, 0), treino, "a última defesa não sai");

  const fuga = { analiseId: questao.posicao.analiseId, nodeId: questao.posicao.nodeId, move: "e3f4", san: "Rf4" };
  const comVazia = acrescentarDefesa(treino, questao.id, resposta.id, fuga, "questao-vazia-teste");
  const fixa = tornarDefesaFixa(comVazia, questao.id, resposta.id, 1);
  const defesasFixa = fixa.questoes[0].respostas[0].efeito;
  assert.equal(fixa.defensor.politica, "fixa");
  assert.deepEqual(defesasFixa.tipo === "avanca" ? defesasFixa.defesas.map((item) => item.move) : [], ["e3f4", original.move]);
  assert.equal(tornarDefesaFixa(fixa, questao.id, resposta.id, 0), fixa, "a primeira já fixa não muda nada");

  const semVazia = removerDefesa(fixa, questao.id, resposta.id, 0);
  assert.equal(semVazia.questoes.length, treino.questoes.length, "a pergunta vazia saiu junto");
  assert.ok(!semVazia.questoes.some((item) => item.id === "questao-vazia-teste"));

  const paraExistente = acrescentarDefesa(treino, questao.id, resposta.id, { ...fuga, questaoId: treino.questoes[2].id }, "nao-usado");
  assert.equal(paraExistente.questoes.length, treino.questoes.length, "apontar para pergunta existente não cria outra");
  const semDefesa = removerDefesa(paraExistente, questao.id, resposta.id, 1);
  assert.equal(semDefesa.questoes.length, treino.questoes.length, "pergunta com resposta escrita não é apagada");
});

test("fatia 10: o texto de abertura do treino é editável — aparado, e retirado quando fica vazio", () => {
  const { aula, treino } = comTreino();
  treino.introducao = "  Feche as fileiras, uma de cada vez.  ";
  const comTexto = prepararEdicaoDeTreino(aula, { treino }, positions);
  if (!comTexto.ok) assert.fail(comTexto.mensagem);
  assert.equal(comTexto.edicao.treino.introducao, "Feche as fileiras, uma de cada vez.");

  treino.introducao = "   ";
  const vazio = prepararEdicaoDeTreino(aula, { treino }, positions);
  if (!vazio.ok) assert.fail(vazio.mensagem);
  assert.equal("introducao" in vazio.edicao.treino, false, "sem texto de abertura, o aluno volta a ler o objetivo");
  assert.equal(validarAulaV2(aplicarEdicaoDeTreino(aula, vazio.edicao)).ok, true);
});

test("16/9: o lance jogado no tabuleiro da janela vira o lance da resposta, sem digitar", () => {
  const { treino } = comTreino();
  const questao = treino.questoes[0];
  const [primeira] = questao.respostas;
  const outra = { ...structuredClone(primeira), id: "resposta-nova", moves: [] };
  questao.respostas.push(outra);

  assert.equal(lanceDoTabuleiro("4k3/8/8/8/8/8/8/4K2R w K - 0 1", "e1", "g1"), "e1g1", "roque sai em casas, como o aluno joga");
  assert.equal(lanceDoTabuleiro("8/4P3/8/8/8/8/k7/4K3 w - - 0 1", "e7", "e8"), "e7e8q", "promoção entra como dama; o campo aceita trocar");
  assert.equal(lanceDoTabuleiro("4k3/8/8/8/8/8/8/4K3 w - - 0 1", "e1", "e3"), null, "lance ilegal não preenche nada");

  assert.deepEqual(destinoDoLanceDoTabuleiro(questao, outra.id, "g2g3"), { tipo: "preencher", respostaId: outra.id },
    "com uma resposta aberta, o lance vai para ela");
  assert.deepEqual(destinoDoLanceDoTabuleiro(questao, outra.id, primeira.moves[0]), { tipo: "abrir", respostaId: primeira.id },
    "lance que já é de outra resposta abre aquela, em vez de repetir o lance em duas");
  assert.deepEqual(destinoDoLanceDoTabuleiro(questao, null, "g2g3"), { tipo: "nova" },
    "sem resposta aberta, o lance vira uma resposta correta nova");
});
