import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { chaveDoDefensor, escolherResposta } from "../lesson/defensor.ts";
import { lessonSchema, positionSchema, replySchema, type Position } from "../lesson/schema.ts";
import { judgeMove } from "../lesson/tree.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { quadroDoNo } from "./arvore.ts";
import { aplicarEdicaoDeTreino, efeitoAoTrocarTipo, prepararEdicaoDeTreino } from "./autoria-treino.ts";
import { executarComando } from "./comandos.ts";
import { removerDefesa, tornarDefesaFixa } from "./defesas-do-treino.ts";
import { validarAulaV2, type AulaV2, type TreinoV2 } from "./modelo.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";
import { chaveDaDefesaFinal, chaveDaFalaDoDefensor, treinoJogavel, type TreinoJogavel } from "./treino-jogavel.ts";

/**
 * A resposta do defensor com o seu próprio texto (decisão do Doug, 13/9/2026, caminho a).
 *
 * O feedback é da resposta do aluno; com duas defesas, um feedback que narra a defesa
 * mente numa das tentativas. Cada defesa ganha um texto opcional, que o aluno lê logo
 * depois do feedback quando o defensor joga aquele lance.
 */

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

const FEEDBACK = "A torre fecha mais uma fileira.";
const TEXTOS: Record<string, string> = {
  e3d2: "O rei preto desce para d2.",
  e3d3: "O rei preto vai para d3.",
};

function comTreinos(): { aula: AulaV2; brancas: TreinoV2; pretas: TreinoV2 } {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const resultado = prepararTreinosDaqui(aula, {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Mate da escada",
    objetivo: "Feche as fileiras até dar mate.",
    lado: "ambos",
    colocacao: "depois-do-capitulo",
    obrigatorio: true,
  }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  const [brancas, pretas] = resultado.preparo.treinos;
  return { aula: aplicarTreinosPreparados(aula, resultado.preparo), brancas, pretas };
}

function catalogoDe(aula: AulaV2) {
  return aula.catalogo ? { catalogo: aula.catalogo } : {};
}

/** A primeira resposta das brancas com duas defesas (e3d2 escrita, e3d3 da variante), cada uma com o seu texto. */
function comDuasDefesasComTexto(politica: TreinoV2["defensor"]["politica"]) {
  const { aula: base, brancas } = comTreinos();
  const treino = structuredClone(base.treinos.find((item) => item.id === brancas.id)!);
  const resposta = treino.questoes[0].respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  const escrita = resposta.efeito.defesas[0];
  assert.equal(escrita.move, "e3d2");
  const seguinte = treino.questoes.find((questao) => questao.id === escrita.proximaQuestaoId)!;
  const analise = base.analises.find((item) => item.id === seguinte.posicao.analiseId)!;
  const depoisDoAluno = Object.values(analise.nos).find((no) => no.filhos.includes(seguinte.posicao.nodeId))!;
  const aula = executarComando(base, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: depoisDoAluno.id, uci: "e3d3", novoNodeId: "no-fuga-texto" }, positions);
  const fecho = new Chess(quadroDoNo(aula, analise.id, "no-fuga-texto", positions).fen).moves({ verbose: true }).map((lance) => `${lance.from}${lance.to}`).sort()[0];
  treino.questoes.push({
    id: "questao-fuga-texto",
    posicao: { analiseId: analise.id, nodeId: "no-fuga-texto" },
    respostas: [{ id: "resposta-fuga-texto", moves: [fecho], julgamento: "correta", feedback: "Fechou por este lado.", efeito: { tipo: "encerra", condicao: "objetivo-autoral" } }],
  });
  resposta.feedback = FEEDBACK;
  escrita.texto = TEXTOS.e3d2;
  resposta.efeito.defesas.push({ move: "e3d3", proximaQuestaoId: "questao-fuga-texto", texto: TEXTOS.e3d3 });
  treino.explicacaoConclusao = "O rei fugiu, e as torres fecharam do mesmo jeito.";
  treino.defensor = { politica };
  const preparo = prepararEdicaoDeTreino(aula, { treino, ...catalogoDe(aula) }, positions);
  if (!preparo.ok) assert.fail(`as duas defesas com texto deveriam ser válidas: ${preparo.mensagem}`);
  return { aula: aplicarEdicaoDeTreino(aula, preparo.edicao), treinoId: treino.id };
}

/** O que o painel mostra depois da primeira defesa, jogando como o `TreeStage` joga. */
function primeiraDefesa(j: TreinoJogavel, tentativa: number): { defesa: string; painel: string } {
  const no = j.tree.nodes[j.tree.root];
  const lance = no.expects[0].moves[0];
  const veredito = judgeMove(j.lesson, no, lance);
  if (veredito.kind !== "method") assert.fail(`o lance escrito ${lance} foi recusado`);
  const { reply } = escolherResposta(veredito.respostas, chaveDoDefensor("guided", j.tree.root), tentativa);
  return { defesa: reply, painel: j.falasDoDefensor?.[chaveDaFalaDoDefensor(j.tree.root, lance, reply)] ?? veredito.feedback };
}

test("decisão do Doug: o documento aceita um texto na defesa, na defesa inicial e na defesa final", () => {
  const { aula: base, pretas } = comTreinos();
  const treino = structuredClone(base.treinos.find((item) => item.id === pretas.id)!);
  if (!treino.defesaInicial) assert.fail("o treino das pretas deveria começar pelo defensor");
  treino.defesaInicial.texto = "As brancas levam a torre para g4.";
  const avanca = treino.questoes.flatMap((questao) => questao.respostas).find((resposta) => resposta.efeito.tipo === "avanca")!;
  if (avanca.efeito.tipo === "avanca") avanca.efeito.defesas[0].texto = "A torre fecha mais uma fileira.";
  const encerra = treino.questoes.flatMap((questao) => questao.respostas).find((resposta) => resposta.efeito.tipo === "encerra" && resposta.efeito.defesaFinal)!;
  if (encerra.efeito.tipo === "encerra") encerra.efeito.textoDaDefesaFinal = "A torre desce e dá mate.";
  const aula = { ...base, treinos: base.treinos.map((item) => item.id === treino.id ? treino : item) };
  const validacao = validarAulaV2(aula, positions);
  assert.equal(validacao.ok, true, validacao.ok ? "" : JSON.stringify(validacao));
});

test("decisão do Doug: cada tentativa lê o texto da defesa que o defensor jogou", () => {
  const { aula, treinoId } = comDuasDefesasComTexto("deterministica");
  const j = treinoJogavel(aula, treinoId, positions);
  const linhas = [1, 2, 3, 4, 5, 6].map((tentativa) => ({ tentativa, ...primeiraDefesa(j, tentativa) }));
  for (const { tentativa, defesa, painel } of linhas) {
    assert.equal(painel, `${FEEDBACK} ${TEXTOS[defesa]}`, `a tentativa ${tentativa} jogou ${defesa} e o painel disse outra coisa`);
  }
  assert.deepEqual(new Set(linhas.map((linha) => linha.defesa)), new Set(["e3d2", "e3d3"]));
  for (const { tentativa, defesa, painel } of linhas) console.log(`  gira — tentativa ${tentativa}: ${defesa} → "${painel}"`);
});

test("decisão do Doug: com a escolha fixa, o painel lê sempre o texto da primeira defesa", () => {
  const { aula, treinoId } = comDuasDefesasComTexto("fixa");
  const j = treinoJogavel(aula, treinoId, positions);
  for (const tentativa of [1, 2, 3]) assert.deepEqual(primeiraDefesa(j, tentativa), { defesa: "e3d2", painel: `${FEEDBACK} ${TEXTOS.e3d2}` });
});

test("decisão do Doug: defesa sem texto deixa o painel só com o feedback, como antes", () => {
  const { aula, brancas } = comTreinos();
  const j = treinoJogavel(aula, brancas.id, positions);
  assert.deepEqual(j.falasDoDefensor, {});
  assert.equal(j.textoDaDefesaInicial, undefined);
});

test("decisão do Doug: o treino das pretas lê o texto da abertura e o do fecho", () => {
  const { aula: base, pretas } = comTreinos();
  const treino = structuredClone(base.treinos.find((item) => item.id === pretas.id)!);
  treino.defesaInicial!.texto = "As brancas levam a torre para g4.";
  const ultima = treino.questoes.at(-1)!;
  const resposta = ultima.respostas[0];
  if (resposta.efeito.tipo !== "encerra" || !resposta.efeito.defesaFinal) assert.fail("a última resposta deveria fechar com o defensor");
  resposta.efeito.textoDaDefesaFinal = "A torre desce para g1 e dá mate.";
  const preparo = prepararEdicaoDeTreino(base, { treino, ...catalogoDe(base) }, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const j = treinoJogavel(aplicarEdicaoDeTreino(base, preparo.edicao), treino.id, positions);
  assert.equal(j.textoDaDefesaInicial, "As brancas levam a torre para g4.");
  const lance = resposta.moves[0];
  assert.equal(j.defesasFinais[chaveDaDefesaFinal(ultima.id, lance)], "g4g1");
  assert.equal(j.falasDoDefensor?.[chaveDaFalaDoDefensor(ultima.id, lance, "g4g1")], `${resposta.feedback} A torre desce para g1 e dá mate.`);
});

test("conferência: o texto da defesa é aparado, o vazio é omitido, e a tela não é alterada", () => {
  const { aula, pretas } = comTreinos();
  const treino = structuredClone(aula.treinos.find((item) => item.id === pretas.id)!);
  treino.defesaInicial!.texto = "   ";
  const avanca = treino.questoes.flatMap((questao) => questao.respostas).find((resposta) => resposta.efeito.tipo === "avanca")!;
  if (avanca.efeito.tipo !== "avanca") assert.fail("deveria haver uma resposta que avança");
  avanca.efeito.defesas[0].texto = " A torre sobe. ";
  const fecho = treino.questoes.at(-1)!.respostas[0];
  if (fecho.efeito.tipo !== "encerra") assert.fail("a última resposta deveria encerrar");
  fecho.efeito.textoDaDefesaFinal = "\n";
  const tela = structuredClone(treino);
  const preparo = prepararEdicaoDeTreino(aula, { treino, ...catalogoDe(aula) }, positions);
  assert.deepEqual(treino, tela, "a conferência mexeu no objeto que a tela mostra");
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const salvo = preparo.edicao.treino;
  assert.ok(!("texto" in salvo.defesaInicial!), "texto só de espaços deveria ser omitido");
  const salvaAvanca = salvo.questoes.flatMap((questao) => questao.respostas).find((resposta) => resposta.id === avanca.id)!;
  assert.equal(salvaAvanca.efeito.tipo === "avanca" ? salvaAvanca.efeito.defesas[0].texto : "", "A torre sobe.");
  const salvoFecho = salvo.questoes.at(-1)!.respostas[0];
  assert.ok(salvoFecho.efeito.tipo === "encerra" && !("textoDaDefesaFinal" in salvoFecho.efeito), "texto final vazio deveria ser omitido");
});

test("conferência: texto do último lance do defensor sem o lance é recusado", () => {
  const { aula, brancas } = comTreinos();
  const treino = structuredClone(aula.treinos.find((item) => item.id === brancas.id)!);
  const resposta = treino.questoes.at(-1)!.respostas[0];
  if (resposta.efeito.tipo !== "encerra") assert.fail("a última resposta das brancas deveria encerrar");
  delete resposta.efeito.defesaFinal;
  resposta.efeito.textoDaDefesaFinal = "O rei preto fica sem casa.";
  const preparo = prepararEdicaoDeTreino(aula, { treino, ...catalogoDe(aula) }, positions);
  assert.equal(preparo.ok, false);
  if (!preparo.ok) assert.match(preparo.mensagem, /último lance do defensor/);
});

test("§6.1 e §16.5: salvar o mesmo texto não personaliza; escrever um texto novo personaliza", () => {
  const { aula, treinoId } = comDuasDefesasComTexto("deterministica");
  const noDocumento = aula.treinos.find((item) => item.id === treinoId)!;
  const mesma = structuredClone(noDocumento);
  const resposta = mesma.questoes[0].respostas[0];
  if (resposta.efeito.tipo === "avanca") resposta.efeito.defesas[1].texto = `${TEXTOS.e3d3}  `;
  const semMudanca = prepararEdicaoDeTreino(aula, { treino: mesma, ...catalogoDe(aula) }, positions);
  if (!semMudanca.ok) assert.fail(semMudanca.mensagem);
  assert.equal(executarComando(aula, { tipo: "EDITAR_TREINO", edicao: semMudanca.edicao }, positions), aula);

  const { aula: base, brancas } = comTreinos();
  assert.equal(base.treinos.find((item) => item.id === brancas.id)!.propriedade, "derivado");
  const nova = structuredClone(base.treinos.find((item) => item.id === brancas.id)!);
  const primeira = nova.questoes[0].respostas[0];
  if (primeira.efeito.tipo === "avanca") primeira.efeito.defesas[0].texto = "O rei preto desce.";
  const comTexto = prepararEdicaoDeTreino(base, { treino: nova, ...catalogoDe(base) }, positions);
  if (!comTexto.ok) assert.fail(comTexto.mensagem);
  assert.equal(comTexto.edicao.treino.propriedade, "personalizado");
});

test("o texto anda com a defesa: usar sempre esta, remover e trocar o tipo e voltar", () => {
  const { aula, treinoId } = comDuasDefesasComTexto("deterministica");
  const treino = aula.treinos.find((item) => item.id === treinoId)!;
  const questao = treino.questoes[0];
  const resposta = questao.respostas[0];
  const fixa = tornarDefesaFixa(treino, questao.id, resposta.id, 1);
  const efeitoFixa = fixa.questoes[0].respostas[0].efeito;
  assert.deepEqual(efeitoFixa.tipo === "avanca" ? efeitoFixa.defesas.map((item) => [item.move, item.texto]) : [], [["e3d3", TEXTOS.e3d3], ["e3d2", TEXTOS.e3d2]]);
  const semPrimeira = removerDefesa(treino, questao.id, resposta.id, 0);
  const efeitoRestante = semPrimeira.questoes[0].respostas[0].efeito;
  assert.deepEqual(efeitoRestante.tipo === "avanca" ? efeitoRestante.defesas.map((item) => [item.move, item.texto]) : [], [["e3d3", TEXTOS.e3d3]]);
  const voltou = efeitoAoTrocarTipo("avanca", { proximaQuestaoId: treino.questoes[1].id, original: resposta.efeito });
  assert.deepEqual(voltou, resposta.efeito);
});

test("a aula v1 não muda: a resposta do defensor no formato v1 continua sem campo de texto", () => {
  assert.equal(replySchema.safeParse({ reply: "e3d2", next: "n2" }).success, true);
  assert.equal(replySchema.safeParse({ reply: "e3d2", next: "n2", texto: "O rei desce." }).success, false);
});
