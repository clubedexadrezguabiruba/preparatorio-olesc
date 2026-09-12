import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2, type AulaV2 } from "./modelo.ts";
import { novoIdDeNarracao } from "./narracoes.ts";
import { previaDaAula } from "./previa.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

/**
 * A N1-KPK adaptada, com as narrações de um lance tiradas — é o caso da aula montada
 * do zero, em que o lance existe e ninguém escreveu nada nele ainda.
 */
function aulaComLanceMudo(): { aula: AulaV2; capituloId: string; nodeId: string } {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const nodeId = capitulo.caminho[2];
  capitulo.narracoes = capitulo.narracoes.filter((n) => n.nodeId !== nodeId);
  return { aula, capituloId: capitulo.id, nodeId };
}

const doLance = (aula: AulaV2, nodeId: string) => aula.capitulos[0].narracoes.filter((n) => n.nodeId === nodeId);
const falasDoLance = (aula: AulaV2, nodeId: string) =>
  previaDaAula(aula, positions).trechos[0].passos.filter((p) => p.nodeId === nodeId).map((p) => p.fala);

test("§12.2: escreve a primeira narração num lance que não tinha nenhuma", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const comentarioAntes = aula.analises[0].nos[nodeId].comentario;
  assert.deepEqual(falasDoLance(aula, nodeId), [""], "antes, a prévia toca este lance em silêncio");

  const narracaoId = novoIdDeNarracao(aula, nodeId);
  const depois = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId, texto: "  O rei vai à frente do peão.  " }, positions);

  assert.deepEqual(doLance(depois, nodeId), [{ id: narracaoId, nodeId, texto: "O rei vai à frente do peão.", pausa: "temporizada" }]);
  assert.deepEqual(falasDoLance(depois, nodeId), ["O rei vai à frente do peão."], "e a prévia passa a falar");
  assert.equal(depois.analises[0].nos[nodeId].comentario, comentarioAntes, "a narração não é o comentário");
  assert.equal(validarAulaV2(depois, positions).ok, true);
});

test("§12.2: a segunda narração do mesmo lance entra depois da primeira", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const um = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: novoIdDeNarracao(aula, nodeId), texto: "Primeiro." }, positions);
  const dois = executarComando(um, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: novoIdDeNarracao(um, nodeId), texto: "Segundo." }, positions);
  assert.deepEqual(falasDoLance(dois, nodeId), ["Primeiro.", "Segundo."]);
  assert.notEqual(doLance(dois, nodeId)[0].id, doLance(dois, nodeId)[1].id, "cada narração tem id próprio");
});

test("o id novo não colide com nenhum id da aula, e é o mesmo em duas chamadas", () => {
  const { aula, nodeId } = aulaComLanceMudo();
  const id = novoIdDeNarracao(aula, nodeId);
  assert.match(id, /^[a-z][a-z0-9-]*$/);
  assert.equal(novoIdDeNarracao(aula, nodeId), id, "determinístico: o id não é sorteado");

  const ocupada = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId: aula.capitulos[0].id, nodeId, narracaoId: id, texto: "x" }, positions);
  assert.notEqual(novoIdDeNarracao(ocupada, nodeId), id);
  assert.throws(
    () => executarComando(ocupada, { tipo: "ADICIONAR_NARRACAO", capituloId: aula.capitulos[0].id, nodeId, narracaoId: id, texto: "y" }, positions),
    /já existe/,
  );
});

test("criar narração entra num Desfazer, e o Refazer devolve a mesma narração", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const narracaoId = novoIdDeNarracao(aula, nodeId);
  let h = iniciarHistorico(aula);
  h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId, texto: "Olhe." }, positions));
  assert.equal(doLance(h.presente, nodeId).length, 1);
  h = desfazer(h);
  assert.equal(h.presente, aula);
  h = refazer(h);
  assert.equal(doLance(h.presente, nodeId)[0].id, narracaoId);
});

test("texto vazio não cria narração nem entra no histórico", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const depois = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: novoIdDeNarracao(aula, nodeId), texto: "   " }, positions);
  assert.equal(depois, aula);
});

test("lance fora do percurso do capítulo não recebe narração: a prévia nunca a tocaria", () => {
  const { aula, capituloId } = aulaComLanceMudo();
  const analise = aula.analises[0];
  const pai = aula.capitulos[0].caminho[0];
  analise.nos["no-variante"] = { id: "no-variante", uci: "a2a3", filhos: [] };
  analise.nos[pai] = { ...analise.nos[pai], filhos: [...analise.nos[pai].filhos, "no-variante"] };
  assert.throws(
    () => executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId: "no-variante", narracaoId: "narracao-no-variante", texto: "Nunca tocada." }, positions),
    /percurso/,
  );
});

test("§12.2: ordenar — mover a segunda narração para cima troca a ordem na prévia", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const um = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: "narracao-a", texto: "A." }, positions);
  const dois = executarComando(um, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: "narracao-b", texto: "B." }, positions);
  const totalAntes = dois.capitulos[0].narracoes.length;

  const movida = executarComando(dois, { tipo: "MOVER_NARRACAO", capituloId, narracaoId: "narracao-b", direcao: "acima" }, positions);
  assert.deepEqual(falasDoLance(movida, nodeId), ["B.", "A."]);
  assert.equal(movida.capitulos[0].narracoes.length, totalAntes, "nada some, nada duplica");

  const devolvida = executarComando(movida, { tipo: "MOVER_NARRACAO", capituloId, narracaoId: "narracao-b", direcao: "abaixo" }, positions);
  assert.deepEqual(falasDoLance(devolvida, nodeId), ["A.", "B."]);
});

test("ordenar só troca com narração do mesmo lance, e na ponta não faz nada", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const um = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: "narracao-a", texto: "A." }, positions);
  const dois = executarComando(um, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: "narracao-b", texto: "B." }, positions);
  // Há narrações de outros lances antes e depois destas no array; nenhuma pode ser atravessada.
  assert.equal(executarComando(dois, { tipo: "MOVER_NARRACAO", capituloId, narracaoId: "narracao-a", direcao: "acima" }, positions), dois);
  assert.equal(executarComando(dois, { tipo: "MOVER_NARRACAO", capituloId, narracaoId: "narracao-b", direcao: "abaixo" }, positions), dois);
});

test("§12.2 e §15.2: o interruptor da pausa manual escreve o campo, e a prévia para ali", () => {
  const { aula, capituloId, nodeId } = aulaComLanceMudo();
  const com = executarComando(aula, { tipo: "ADICIONAR_NARRACAO", capituloId, nodeId, narracaoId: "narracao-a", texto: "Pense antes." }, positions);
  const passo = (a: AulaV2) => previaDaAula(a, positions).trechos[0].passos.find((p) => p.nodeId === nodeId)!;
  assert.equal(passo(com).pausaManual, false);

  const manual = executarComando(com, { tipo: "DEFINIR_PAUSA_DA_NARRACAO", capituloId, narracaoId: "narracao-a", pausa: "manual" }, positions);
  assert.equal(doLance(manual, nodeId)[0].pausa, "manual");
  assert.equal(passo(manual).pausaManual, true);
  assert.equal(validarAulaV2(manual, positions).ok, true);

  let h = aplicarNoHistorico(iniciarHistorico(com), manual);
  h = desfazer(h);
  assert.equal(doLance(h.presente, nodeId)[0].pausa, "temporizada", "um Ctrl+Z desliga");

  assert.equal(executarComando(manual, { tipo: "DEFINIR_PAUSA_DA_NARRACAO", capituloId, narracaoId: "narracao-a", pausa: "manual" }, positions), manual, "ligar o que já está ligado não entra no histórico");
  assert.throws(() => executarComando(manual, { tipo: "DEFINIR_PAUSA_DA_NARRACAO", capituloId, narracaoId: "nao-existe", pausa: "manual" }, positions), /narração inexistente/);
});

test("§6.1: sair da caixa de narração sem mudar o texto não entra no histórico", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const narracao = capitulo.narracoes[0];
  assert.equal(executarComando(aula, { tipo: "EDITAR_NARRACAO", capituloId: capitulo.id, narracaoId: narracao.id, texto: narracao.texto }, positions), aula);
});

test("§6.1: sair da caixa de comentário sem mudar o texto não entra no histórico", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const no = aula.analises[0].nos[aula.capitulos[0].caminho[0]];
  assert.equal(executarComando(aula, { tipo: "EDITAR_COMENTARIO", analiseId: aula.analises[0].id, nodeId: no.id, comentario: no.comentario ?? "" }, positions), aula);
});
