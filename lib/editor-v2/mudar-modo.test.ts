/**
 * Mudar o modo de uma parte depois de importar — pedido do Doug de 15/9/2026. Sobre o estudo real
 * "Mate de Dama e Rei" (`lichess.org/study/hf09xMzS`), o mesmo de `importar-estudo.test.ts`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico } from "./comandos.ts";
import { lerEstudo, planejarEstudo, type DestinoNoEstudo } from "./importar-estudo.ts";
import { problemasDaAulaV2, type AulaV2, type RevisaoDaFenV2 } from "./modelo.ts";
import { modosPossiveis, mudarModo } from "./mudar-modo.ts";
import { treinoJogavel } from "./treino-jogavel.ts";

const PGN = readFileSync("e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn", "utf8");
const revisao: RevisaoDaFenV2 = { origem: "estudo-lichess", autor: "clubexadrezguabiruba", obra: "Mate de Dama e Rei", link: "https://lichess.org/study/hf09xMzS", fenRevisada: "x", revisadoEm: "2026-09-14T12:00:00.000Z", professor: "Doug", mostrarCredito: true, direitoDosTextos: true };

/**
 * O estudo com o 01 ("AULA DIAGNÓSTICO", sem lances) como introdução — o arranjo sobre o qual estes casos
 * foram escritos. Desde 16/9/2026 o nome sugere capítulo parado para ele; o caso novo está no fim.
 */
function importada(destinos: Record<number, DestinoNoEstudo> = { 2: "introducao" }): AulaV2 {
  const vazia: AulaV2 = {
    schemaVersion: 2, id: "EX-ESTUDO", titulo: "Mate de Dama e Rei",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  };
  const plano = planejarEstudo(vazia, lerEstudo(PGN), { destinos: { 9: "fora", ...destinos }, revisao }, {});
  assert.ok(plano.ok, !plano.ok ? plano.mensagem : "");
  return executarComando(vazia, { tipo: "IMPORTAR_ESTUDO", plano: plano.plano }, {});
}

const erros = (aula: AulaV2) => problemasDaAulaV2(aula).filter((p) => p.severidade === "erro");

test("importar: capítulo com lances marcado como introdução guarda os lances, e o quadro aponta para eles", () => {
  const aula = importada({ 2: "introducao", 3: "introducao" });
  const quadro = aula.introducoes[0].quadros.find((q) => q.titulo === "AULA EXPLICADA - O L e a caixa");
  assert.ok(quadro, "o capítulo 03 entrou como quadro");
  assert.equal(quadro!.posicao.tipo, "referencia");
  const origem = quadro!.posicao.tipo === "referencia" ? quadro!.posicao.origem : null;
  const analise = aula.analises.find((a) => a.id === origem?.analiseId);
  assert.ok(analise && Object.keys(analise.nos).length > 10, "a análise do 03, com os lances, ficou na aula");
  assert.ok(!aula.capitulos.some((c) => c.analiseId === analise!.id), "e nenhum capítulo a mostra");
  assert.deepEqual(erros(aula), []);

  // O caso que motivou o pedido: o professor marcou errado e quer o capítulo de volta.
  const mudanca = mudarModo(aula, { tipo: "quadro", introducaoId: aula.introducoes[0].id, quadroId: quadro!.id }, "capitulo", {});
  assert.ok(mudanca.ok, !mudanca.ok ? mudanca.mensagem : "");
  const capitulo = mudanca.mudanca.aula.capitulos.find((c) => c.analiseId === analise!.id);
  assert.ok(capitulo && capitulo.caminho.length > 0, "os lances voltaram a ser capítulo");
});

test("capítulo → treino → capítulo: as variantes viram respostas, e na volta o capítulo tem o mesmo id e a mesma linha", () => {
  const aula = importada();
  const original = aula.capitulos[0];
  assert.equal(original.titulo, "AULA EXPLICADA - O L e a caixa");
  const lugar = aula.fluxo.findIndex((e) => e.entidadeId === original.id);

  const paraTreino = mudarModo(aula, { tipo: "capitulo", capituloId: original.id }, "treino", {});
  assert.ok(paraTreino.ok, !paraTreino.ok ? paraTreino.mensagem : "");
  const comTreino = paraTreino.mudanca.aula;
  assert.equal(paraTreino.mudanca.nova.tipo, "treino");
  const treinoId = paraTreino.mudanca.nova.tipo === "treino" ? paraTreino.mudanca.nova.treinoId : "";
  const treino = comTreino.treinos.find((t) => t.id === treinoId)!;
  assert.equal(comTreino.fluxo[lugar].entidadeId, treinoId, "o treino ficou no lugar do capítulo");
  assert.equal(comTreino.capitulos.some((c) => c.id === original.id), false);
  assert.equal(treino.propriedade, "independente");
  assert.ok(treino.questoes.some((q) => q.respostas.some((r) => r.julgamento === "erro" && /afogamento/i.test(r.feedback))), "o Qg6?? do capítulo virou erro nomeado");
  assert.ok(treinoJogavel(comTreino, treinoId, {}).tree, "o aluno consegue jogar");
  assert.deepEqual(erros(comTreino), []);
  assert.ok(paraTreino.mudanca.ficam.some((f) => /perguntas/.test(f)));

  const deVolta = mudarModo(comTreino, { tipo: "treino", treinoId }, "capitulo", {});
  assert.ok(deVolta.ok, !deVolta.ok ? deVolta.mensagem : "");
  const final = deVolta.mudanca.aula;
  const capitulo = final.capitulos.find((c) => c.id === original.id);
  assert.ok(capitulo, "o capítulo voltou com o id que tinha");
  assert.deepEqual(capitulo!.caminho, original.caminho, "e com a mesma linha");
  assert.equal(capitulo!.analiseId, original.analiseId);
  assert.ok(capitulo!.narracoes.length > 0, "os textos do treino viraram narração");
  assert.equal(final.fluxo[lugar].entidadeId, original.id, "no mesmo lugar da ordem");
  assert.equal(final.catalogo?.erros.length, aula.catalogo?.erros.length, "os erros que só o treino usava saíram do catálogo");
  assert.ok(deVolta.mudanca.saem.some((s) => /fora da linha principal/.test(s)), "a janela avisa que as respostas de erro saem");
  assert.deepEqual(erros(final), []);
});

test("capítulo → introdução → capítulo: o quadro entra no fim da introdução, e os lances voltam", () => {
  const aula = importada();
  const original = aula.capitulos[1];
  const quadrosAntes = aula.introducoes[0].quadros.length;

  const paraQuadro = mudarModo(aula, { tipo: "capitulo", capituloId: original.id }, "introducao", {});
  assert.ok(paraQuadro.ok, !paraQuadro.ok ? paraQuadro.mensagem : "");
  const comQuadro = paraQuadro.mudanca.aula;
  assert.equal(comQuadro.introducoes[0].quadros.length, quadrosAntes + 1);
  assert.equal(comQuadro.fluxo.filter((e) => e.tipo === "capitulo").length, 1);
  assert.ok(comQuadro.analises.some((a) => a.id === original.analiseId), "a análise continua na aula");
  assert.ok(paraQuadro.mudanca.saem.some((s) => /deixa de ver/.test(s)), "a janela avisa que o aluno deixa de ver os lances");
  assert.deepEqual(erros(comQuadro), []);

  const nova = paraQuadro.mudanca.nova;
  assert.equal(nova.tipo, "quadro");
  const deVolta = mudarModo(comQuadro, nova, "capitulo", {});
  assert.ok(deVolta.ok, !deVolta.ok ? deVolta.mensagem : "");
  const capitulo = deVolta.mudanca.aula.capitulos.find((c) => c.analiseId === original.analiseId)!;
  assert.deepEqual(capitulo.caminho, original.caminho, "os lances voltaram");
  assert.deepEqual(erros(deVolta.mudanca.aula), []);
});

test("quadro sem lances: vira capítulo de posição parada, sem roubar os lances do capítulo vizinho; treino é recusado", () => {
  const aula = importada();
  const introducao = aula.introducoes[0];
  const quadro = introducao.quadros[0];
  assert.equal(quadro.posicao.tipo, "referencia", "o quadro 00 empresta a posição do capítulo 03");
  const parte = { tipo: "quadro" as const, introducaoId: introducao.id, quadroId: quadro.id };

  const opcoes = modosPossiveis(aula, parte, {});
  assert.deepEqual(opcoes.map((o) => [o.destino, o.resultado.ok]), [["capitulo", true], ["treino", false]]);
  const recusa = opcoes[1].resultado;
  assert.match(!recusa.ok ? recusa.mensagem : "", /não tem lances guardados/);

  const mudanca = mudarModo(aula, parte, "capitulo", {});
  assert.ok(mudanca.ok);
  const capitulo = mudanca.mudanca.aula.capitulos.at(-1)!;
  assert.deepEqual(capitulo.caminho, [], "posição parada");
  assert.notEqual(capitulo.analiseId, aula.capitulos[0].analiseId, "análise própria, que só referencia a posição");
  assert.equal(capitulo.narracoes[0].texto, quadro.texto);
  assert.equal(capitulo.narracoes[0].pausa, "manual", "o aluno continua avançando quando quiser");
  assert.equal(mudanca.mudanca.aula.introducoes[0].quadros.length, introducao.quadros.length - 1);
  assert.deepEqual(erros(mudanca.mudanca.aula), []);
});

test("treino → introdução → treino: o quadro guarda a análise do treino, e o treino renasce dela", () => {
  const aula = importada();
  const treino = aula.treinos[3];
  const paraQuadro = mudarModo(aula, { tipo: "treino", treinoId: treino.id }, "introducao", {});
  assert.ok(paraQuadro.ok, !paraQuadro.ok ? paraQuadro.mensagem : "");
  assert.deepEqual(erros(paraQuadro.mudanca.aula), []);
  const deVolta = mudarModo(paraQuadro.mudanca.aula, paraQuadro.mudanca.nova, "treino", {});
  assert.ok(deVolta.ok, !deVolta.ok ? deVolta.mensagem : "");
  const novo = deVolta.mudanca.aula.treinos.find((t) => deVolta.mudanca.nova.tipo === "treino" && t.id === deVolta.mudanca.nova.treinoId)!;
  const mates = novo.questoes.at(-1)!.respostas.filter((r) => r.efeito.tipo === "encerra" && r.efeito.condicao === "mate").map((r) => r.moves[0]).sort();
  assert.deepEqual(mates, ["g4g6", "g4h3", "g4h4"], "os três mates do 07 voltaram como respostas certas");
  assert.deepEqual(erros(deVolta.mudanca.aula), []);
});

test("o comando: um Desfazer devolve a aula exata; recusa não muda nada", () => {
  const aula = importada();
  const comando = { tipo: "MUDAR_MODO" as const, parte: { tipo: "capitulo" as const, capituloId: aula.capitulos[0].id }, destino: "treino" as const };
  const historico = aplicarNoHistorico(iniciarHistorico(aula), executarComando(aula, comando, {}));
  assert.notEqual(historico.presente, aula);
  assert.equal(desfazer(historico).presente, aula);

  const parado = mudarModo(aula, { tipo: "quadro", introducaoId: aula.introducoes[0].id, quadroId: aula.introducoes[0].quadros[0].id }, "capitulo", {});
  assert.ok(parado.ok);
  const semLances = parado.mudanca.aula;
  const capituloParado = semLances.capitulos.at(-1)!;
  assert.throws(() => executarComando(semLances, { tipo: "MUDAR_MODO", parte: { tipo: "capitulo", capituloId: capituloParado.id }, destino: "treino" }, {}), /precisa de lances/);
});

test("importado como o nome sugere: a AULA DIAGNÓSTICO parada muda para introdução e volta, sem erro", () => {
  const aula = importada({});
  const diagnostico = aula.capitulos.find((c) => c.titulo === "AULA DIAGNÓSTICO - Como você começaria?")!;
  assert.deepEqual(diagnostico.caminho, []);
  const quadrosAntes = aula.introducoes[0].quadros.length;

  const paraQuadro = mudarModo(aula, { tipo: "capitulo", capituloId: diagnostico.id }, "introducao", {});
  assert.ok(paraQuadro.ok, !paraQuadro.ok ? paraQuadro.mensagem : "");
  assert.equal(paraQuadro.mudanca.aula.introducoes[0].quadros.length, quadrosAntes + 1);
  assert.deepEqual(erros(paraQuadro.mudanca.aula), []);
  const treino = modosPossiveis(aula, { tipo: "capitulo", capituloId: diagnostico.id }, {}).find((o) => o.destino === "treino");
  assert.equal(treino?.resultado.ok, false, "treino sem lances continua recusado, com motivo");

  const deVolta = mudarModo(paraQuadro.mudanca.aula, paraQuadro.mudanca.nova, "capitulo", {});
  assert.ok(deVolta.ok, !deVolta.ok ? deVolta.mensagem : "");
  assert.deepEqual(erros(deVolta.mudanca.aula), []);
});
