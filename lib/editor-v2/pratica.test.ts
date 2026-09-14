/**
 * A prática pela tela — fatia 10, parada 10C (§17.1).
 */
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { adicionarPosicaoAoAcervo } from "./acervo-em-disco.ts";
import { conteudoDaPraticaV2, revisoesDaAulaV2 } from "./avaliacao.ts";
import { problemasParaPublicarV2 } from "./conferencia.ts";
import { lerPosicoesDoConteudoV2 } from "./gate.ts";
import { hashDaPosicao } from "./hash.ts";
import type { AulaV2 } from "./modelo.ts";
import { mudancasDeAvaliacao, prepararPratica } from "./pratica.ts";

const posicoes = lerPosicoesDoConteudoV2();
const cook = posicoes["pos-n0-qmate-cook-d1"];
const registro = { positionId: cook.id, conteudoHash: hashDaPosicao(cook), estado: cook.status };
const vazia = (): AulaV2 => ({
  schemaVersion: 2, id: "EX-PRATICA", titulo: "Mate de Dama e Rei",
  metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
  proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
});
const pedido = { titulo: "Vença sem afogar", positionId: cook.id, ladoAluno: "white" as const, objetivo: "win" as const, skill: 20, moveTimeMs: 300 };

test("criar a prática: PRATICA_AUSENTE 1 → 0, a etapa no fim, a posição registrada, num Desfazer", () => {
  const aula = vazia();
  const antes = problemasParaPublicarV2(aula, { positions: posicoes }).filter((p) => p.codigo === "PRATICA_AUSENTE");
  assert.equal(antes.length, 1);
  const preparo = prepararPratica(aula, pedido, posicoes, registro);
  assert.ok(preparo.ok);
  let h = iniciarHistorico(aula);
  h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "ADICIONAR_PRATICA", preparo: preparo.preparo }, posicoes));
  const depois = problemasParaPublicarV2(h.presente, { positions: posicoes });
  assert.equal(depois.filter((p) => p.codigo === "PRATICA_AUSENTE" || p.codigo === "PRATICA_SEM_PROVENIENCIA").length, 0);
  assert.deepEqual(h.presente.fluxo.at(-1), { id: "etapa-pratica-venca-sem-afogar", tipo: "pratica", entidadeId: "pratica-venca-sem-afogar" });
  assert.equal(h.presente.proveniencia.length, 1);
  assert.equal(conteudoDaPraticaV2(h.presente, "pratica-venca-sem-afogar", posicoes).fen, cook.fen);
  assert.throws(() => executarComando(h.presente, { tipo: "ADICIONAR_PRATICA", preparo: preparo.preparo }, posicoes), /já existe|já tem uma prática/);
  h = desfazer(h);
  assert.equal(h.presente.praticas.length, 0);
  h = refazer(h);
  assert.equal(h.presente.praticas.length, 1);
});

test("editar: título não muda a versão da avaliação; objetivo, lado e adversário mudam, e a tela sabe dizer quais", () => {
  const preparo = prepararPratica(vazia(), pedido, posicoes, registro);
  assert.ok(preparo.ok);
  const aula = executarComando(vazia(), { tipo: "ADICIONAR_PRATICA", preparo: preparo.preparo }, posicoes);
  const revisao = () => revisoesDaAulaV2(aulaAtual, posicoes)["pratica-venca-sem-afogar"].revisao;
  let aulaAtual = aula;
  const original = revisao();

  const renomeada = prepararPratica(aula, { ...pedido, titulo: "Outro nome" }, posicoes, undefined, "pratica-venca-sem-afogar");
  assert.ok(renomeada.ok);
  assert.deepEqual(mudancasDeAvaliacao(aula.praticas[0], renomeada.preparo.pratica, posicoes), []);
  aulaAtual = executarComando(aula, { tipo: "EDITAR_PRATICA", preparo: renomeada.preparo }, posicoes);
  assert.equal(revisao(), original);
  assert.equal(aulaAtual.praticas[0].id, "pratica-venca-sem-afogar", "o id fica na edição");

  const forte = prepararPratica(aula, { ...pedido, skill: 10, moveTimeMs: 500 }, posicoes, undefined, "pratica-venca-sem-afogar");
  assert.ok(forte.ok);
  assert.deepEqual(mudancasDeAvaliacao(aula.praticas[0], forte.preparo.pratica, posicoes), ["adversário"]);
  aulaAtual = executarComando(aula, { tipo: "EDITAR_PRATICA", preparo: forte.preparo }, posicoes);
  assert.notEqual(revisao(), original);

  aulaAtual = executarComando(aulaAtual, { tipo: "EXCLUIR_PRATICA", praticaId: "pratica-venca-sem-afogar" }, posicoes);
  assert.equal(aulaAtual.praticas.length, 0);
  assert.equal(aulaAtual.fluxo.some((etapa) => etapa.tipo === "pratica"), false);
});

test("as recusas dizem o campo e como corrigir", () => {
  const aula = vazia();
  assert.equal((prepararPratica(aula, { ...pedido, titulo: " " }, posicoes) as { campo: string }).campo, "titulo");
  assert.match((prepararPratica(aula, { ...pedido, positionId: "" }, posicoes) as { mensagem: string }).mensagem, /escolha a posição/);
  assert.match((prepararPratica(aula, { ...pedido, ladoAluno: "black" }, posicoes) as { mensagem: string }).mensagem, /lado do aluno perde/);
  assert.match((prepararPratica(aula, { ...pedido, skill: 21 }, posicoes) as { mensagem: string }).mensagem, /0 a 20/);
  const empate = Object.values(posicoes).find((p) => p.expectedResult === "draw");
  if (empate) assert.match((prepararPratica(aula, { ...pedido, positionId: empate.id }, posicoes) as { mensagem: string }).mensagem, /empate/);
});

test("adicionar ao acervo: arquivo candidato com obra registrada, resultado do cache, sem duplicar a FEN", async () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "acervo-"));
  try {
    cpSync("content/positions", path.join(raiz, "content/positions"), { recursive: true });
    cpSync("content/tablebase-cache", path.join(raiz, "content/tablebase-cache"), { recursive: true });
    cpSync("content/sources.json", path.join(raiz, "content/sources.json"));
    const revisao = { origem: "autoria-propria" as const, fenRevisada: "", revisadoEm: "2026-09-14T12:00:00.000Z", professor: "Doug", mostrarCredito: false };

    const repetida = await adicionarPosicaoAoAcervo({ aulaId: "EX-E2E-ZERO", fen: cook.fen, revisao: { ...revisao, fenRevisada: cook.fen }, etiqueta: "x" }, raiz);
    assert.ok(repetida.ok && !repetida.nova && repetida.item.position.id === cook.id, "FEN que o acervo já tem é reaproveitada");

    const desconhecida = await adicionarPosicaoAoAcervo({ aulaId: "EX-E2E-ZERO", fen: "8/8/8/8/4k3/8/8/3QK3 w - - 0 1", revisao: { ...revisao, origem: "desconhecida" }, etiqueta: "x" }, raiz);
    assert.equal(!desconhecida.ok && desconhecida.campo, "origem");

    const semObra = await adicionarPosicaoAoAcervo({ aulaId: "EX-E2E-ZERO", fen: "8/8/8/8/4k3/8/8/3QK3 w - - 0 1", revisao: { ...revisao, origem: "obra" }, etiqueta: "x" }, raiz);
    assert.equal(!semObra.ok && semObra.campo, "obra");

    const grande = await adicionarPosicaoAoAcervo({ aulaId: "EX-E2E-ZERO", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", revisao, etiqueta: "x" }, raiz);
    assert.equal(!grande.ok && grande.campo, "posicao");

    const fen = "8/8/8/8/4k3/8/8/3QK3 w - - 0 1";
    let nova = await adicionarPosicaoAoAcervo({ aulaId: "EX-E2E-ZERO", fen, revisao: { ...revisao, fenRevisada: fen }, etiqueta: "Prática livre" }, raiz);
    if (!nova.ok && nova.campo === "resultado") {
      nova = await adicionarPosicaoAoAcervo({ aulaId: "EX-E2E-ZERO", fen, revisao: { ...revisao, fenRevisada: fen }, resultadoDeclarado: "win-white", etiqueta: "Prática livre" }, raiz);
      assert.ok(nova.ok && nova.avisos.some((a) => /declarado/.test(a)));
    }
    assert.ok(nova.ok && nova.nova);
    assert.equal(nova.item.position.id, "pos-ex-e2e-zero-1");
    assert.equal(nova.item.position.status, "candidate");
    assert.equal(nova.item.position.expectedResult, "win-white");
    assert.equal(nova.item.position.provenance.editionFile, "posicoes-do-preparatorio");
    assert.deepEqual(readdirSync(path.join(raiz, "content/positions/EX")), ["pos-ex-e2e-zero-1.json"]);
    assert.equal(Object.values(nova.item.position.provenance).every((campo) => campo !== null), true, "os 9 campos preenchidos, como o validate:content exige");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
