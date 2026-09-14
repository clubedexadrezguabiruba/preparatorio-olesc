/**
 * Introdução, quadros e ordem das etapas — fatia 10, parada 10D (§7.1, §18).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico } from "./comandos.ts";
import { etapasNaOrdem, excluirTreino, indiceAntesDaPratica, moverEtapa } from "./fluxo.ts";
import { passosDaIntroducao } from "./fluxo-do-aluno.ts";
import { capituloComAMesmaPosicao, quadroDepoisDoLance } from "./introducao.ts";
import { aulaV2Schema, problemasDaAulaV2, type AulaV2 } from "./modelo.ts";
import { aplicarNovoCapitulo, prepararNovoCapitulo } from "./novo-capitulo.ts";

const FEN_03 = "8/8/8/8/4k3/8/8/3QK3 w - - 0 1";
const FEN_02 = "8/8/8/4k3/8/8/8/3QK3 w - - 0 1";

function aulaComDoisCapitulos(): AulaV2 {
  let aula: AulaV2 = {
    schemaVersion: 2, id: "EX-INTRO", titulo: "Mate de Dama e Rei",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [],
    praticas: [{ id: "pratica-livre", titulo: "Vença sem afogar", positionId: "pos-x", ladoAluno: "white", objetivo: "win", engine: { skill: 20, moveTimeMs: 300 } }],
    fluxo: [{ id: "etapa-pratica-livre", tipo: "pratica", entidadeId: "pratica-livre" }],
  };
  for (const [nome, fen] of [["O L e a caixa", FEN_02], ["O método completo", FEN_03]] as const) {
    const preparo = prepararNovoCapitulo(aula, { nome, fen, orientacao: "white" });
    assert.ok(preparo.ok);
    const r = aplicarNovoCapitulo(aula, preparo.novo);
    assert.ok(r.ok);
    aula = r.aula;
  }
  return aula;
}

test("capítulo novo sem lugar escolhido entra antes da prática, e não depois dela", () => {
  const aula = aulaComDoisCapitulos();
  assert.deepEqual(aula.fluxo.map((e) => e.tipo), ["capitulo", "capitulo", "pratica"]);
  assert.equal(indiceAntesDaPratica(aula.fluxo), 2);
});

test("introdução do estudo: 2 quadros, referência como fonte única, inserir lance, ordem, Desfazer", () => {
  const aula = aulaComDoisCapitulos();
  const cap03 = aula.capitulos[1];
  let h = iniciarHistorico(aula);
  const aplicar = (comando: Parameters<typeof executarComando>[1]) => { h = aplicarNoHistorico(h, executarComando(h.presente, comando, {})); };

  // A FEN escrita igual à posição inicial do capítulo 03 é recusada, com o nome dele.
  assert.throws(() => executarComando(aula, { tipo: "ADICIONAR_INTRODUCAO", introducaoId: "introducao-1", etapaId: "etapa-introducao-1", titulo: "Introdução", quadro: { id: "quadro-1", texto: "Olá", posicao: { tipo: "fen", fen: FEN_03 } } }, {}), /posição inicial do capítulo «O método completo»/);
  assert.equal(capituloComAMesmaPosicao(aula, FEN_03.replace(" 0 1", " 25 13"), {})?.titulo, "O método completo", "os contadores não fazem outra posição");

  const referencia = { tipo: "referencia" as const, origem: { analiseId: cap03.analiseId, nodeId: cap03.inicioNodeId } };
  aplicar({ tipo: "ADICIONAR_INTRODUCAO", introducaoId: "introducao-1", etapaId: "etapa-introducao-1", titulo: "Introdução", quadro: { id: "quadro-1", texto: "Hoje você vai aprender o mate de dama e rei.\n\nPrimeiro o L, depois a caixa.", posicao: referencia } });
  assert.equal(h.presente.fluxo[0].tipo, "introducao", "a introdução abre a aula");
  aplicar({ tipo: "ADICIONAR_QUADRO", introducaoId: "introducao-1", quadro: { id: "quadro-2", titulo: "Diagnóstico", texto: "Como você começaria?", posicao: referencia }, depoisDe: "quadro-1" });
  aplicar({ tipo: "DEFINIR_DESENHOS_DO_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-2", desenhos: { arrows: [{ de: "d1", para: "d4", cor: "verde" }] } });

  const lance = quadroDepoisDoLance(h.presente, h.presente.introducoes[0].quadros[1], "d1d4", {}, "quadro-3");
  assert.equal(lance.lance, "d1d4");
  assert.equal(lance.posicao.tipo === "fen" && lance.posicao.fen.startsWith("8/8/8/8/3Qk3"), true);
  aplicar({ tipo: "ADICIONAR_QUADRO", introducaoId: "introducao-1", quadro: lance, depoisDe: "quadro-2" });
  aplicar({ tipo: "MOVER_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-3", direcao: "acima" });
  assert.deepEqual(h.presente.introducoes[0].quadros.map((q) => q.id), ["quadro-1", "quadro-3", "quadro-2"]);
  aplicar({ tipo: "EXCLUIR_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-3" });
  aplicar({ tipo: "EDITAR_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-1", texto: "   " });
  assert.match(h.presente.introducoes[0].quadros[0].texto, /mate de dama/, "esvaziar não apaga o texto");

  assert.ok(aulaV2Schema.safeParse(JSON.parse(JSON.stringify(h.presente))).success, "título e lance do quadro passam no schema");
  assert.deepEqual(problemasDaAulaV2(h.presente).filter((p) => p.codigo.startsWith("QUADRO") || p.codigo.startsWith("INTRODUCAO")), []);

  const passos = passosDaIntroducao(h.presente, h.presente.introducoes[0], {});
  assert.equal(passos.length, 2);
  assert.equal(passos[0].fen, FEN_03);
  assert.equal(passos[1].titulo, "Diagnóstico");
  assert.deepEqual(passos[1].arrows, [["d1", "d4"]]);

  assert.throws(() => executarComando(h.presente, { tipo: "EXCLUIR_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-2" }, {}) && executarComando(executarComando(h.presente, { tipo: "EXCLUIR_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-2" }, {}), { tipo: "EXCLUIR_QUADRO", introducaoId: "introducao-1", quadroId: "quadro-1" }, {}), /único quadro/);

  const antes = h.presente;
  h = desfazer(h);
  assert.notEqual(h.presente, antes);
});

test("mover etapa e excluir treino mexem só no fluxo, com a frase humana do lugar", () => {
  const aula = aulaComDoisCapitulos();
  const movida = moverEtapa(aula, aula.fluxo[1].id, 0);
  assert.deepEqual(movida.fluxo.map((e) => e.entidadeId), [aula.fluxo[1].entidadeId, aula.fluxo[0].entidadeId, "pratica-livre"]);
  assert.equal(moverEtapa(aula, aula.fluxo[0].id, 0), aula, "o mesmo lugar não é edição");
  assert.throws(() => moverEtapa(aula, aula.fluxo[0].id, 9), /destino/);
  const linhas = etapasNaOrdem(aula);
  assert.equal(linhas[0].lugar, "abre a aula");
  assert.equal(linhas[2].lugar, "depois do capítulo «O método completo»");
  assert.equal(excluirTreino(aula, "nao-existe"), aula);
  const viaComando = executarComando(aula, { tipo: "MOVER_ETAPA", etapaId: aula.fluxo[2].id, para: 0 }, {});
  assert.equal(viaComando.fluxo[0].tipo, "pratica");
});
