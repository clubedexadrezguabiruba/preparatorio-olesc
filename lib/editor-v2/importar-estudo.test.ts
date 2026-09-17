/**
 * O estudo real do Doug, "Mate de Dama e Rei" (`lichess.org/study/hf09xMzS`, exportação de 14/9/2026),
 * importado com os modos — fatia 10, parada 10E.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { executarComando } from "./comandos.ts";
import { idsDaAulaV2 } from "./ids.ts";
import { lerEstudo, planejarEstudo } from "./importar-estudo.ts";
import { problemasDaAulaV2, type AulaV2, type RevisaoDaFenV2 } from "./modelo.ts";
import { passosDaIntroducao } from "./fluxo-do-aluno.ts";
import { previaDaAula } from "./previa.ts";
import { treinoJogavel } from "./treino-jogavel.ts";

const PGN = readFileSync("e2e/fixtures/lichess-mate-dama-hf09xMzS.pgn", "utf8");
const vazia = (): AulaV2 => ({
  schemaVersion: 2, id: "EX-ESTUDO", titulo: "Mate de Dama e Rei",
  metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
  proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
});
const revisao: RevisaoDaFenV2 = { origem: "estudo-lichess", autor: "clubexadrezguabiruba", obra: "Mate de Dama e Rei", link: "https://lichess.org/study/hf09xMzS", fenRevisada: "x", revisadoEm: "2026-09-14T12:00:00.000Z", professor: "Doug", mostrarCredito: true, direitoDosTextos: true };

test("o nome de cada capítulo decide: 00 introdução, 01–03 aula, 04–07 treino, 08 prática", () => {
  const leitura = lerEstudo(PGN);
  assert.equal(leitura.capitulos.length, 9);
  // 01 "AULA DIAGNÓSTICO" não tem lances: antes do pedido de 16/9 virava introdução, contra o nome.
  assert.deepEqual(leitura.capitulos.map((c) => c.sugerido), ["introducao", "capitulo", "capitulo", "capitulo", "treino", "treino", "treino", "treino", "pratica"]);
  assert.match(leitura.capitulos[1].pista, /nome/);
  assert.ok(leitura.capitulos[1].possiveis.includes("capitulo"), "capítulo sem lances pode ser capítulo de posição parada");
  assert.equal(leitura.estudo.autor, "clubexadrezguabiruba");
  assert.ok(leitura.capitulos[4].perdas.some((p) => /dicas e os textos de desvio/.test(p)));
  assert.ok(leitura.capitulos[8].perdas.some((p) => /praticar contra o computador/.test(p)));
  assert.deepEqual(leitura.capitulos.map((c) => c.lado), Array(9).fill("white"));
});

test("nomes sem número, com acento ou não, em inglês; e o nome que pede o impossível cede à pista", () => {
  const capitulo = (nome: string, corpo: string, extra = "") => `[Event "E"]\n[StudyName "S"]\n[ChapterName "${nome}"]\n[FEN "8/8/8/8/4k3/8/8/3QK3 w - - 0 1"]\n[SetUp "1"]\n${extra}\n${corpo} *\n\n`;
  const pgn = [
    capitulo("Apresentacao do final", "{ Oi. }"),
    capitulo("Exercício: feche a caixa", "1. Qd2 Ke5 2. Qd3"),
    capitulo("Aula interativa", "1. Qd2 Ke5", '[ChapterMode "gamebook"]'),
    capitulo("Treino sem lances", "{ Pense. }"),
    capitulo("Pratique contra o computador", "1. Qd2 Ke5"),
    capitulo("Practice", "{ Jogue. }"),
    capitulo("Lesson 2", "{ Olhe a posição. }"),
    capitulo("Aula e depois o treino", "1. Qd2 Ke5"),
    capitulo("Sem palavra nenhuma", "1. Qd2 Ke5", '[ChapterMode "gamebook"]'),
  ].join("");
  const leitura = lerEstudo(pgn);
  assert.deepEqual(leitura.capitulos.map((c) => c.sugerido), ["introducao", "treino", "capitulo", "introducao", "pratica", "pratica", "capitulo", "capitulo", "treino"]);
  assert.match(leitura.capitulos[2].pista, /nome/, "o nome vence a lição interativa");
  assert.match(leitura.capitulos[3].pista, /treino.*sem lances|sem lances.*treino/i, "e diz por que não seguiu o nome");
  assert.match(leitura.capitulos[7].pista, /aula/i, "com duas palavras no nome, manda a que vem primeiro");
  assert.match(leitura.capitulos[8].pista, /lição interativa/, "sem palavra no nome, vale a pista do Lichess");
});

test("importado como sugerido: a AULA DIAGNÓSTICO entra como capítulo de posição parada, com a pergunta esperando o Continuar", () => {
  const leitura = lerEstudo(PGN);
  const plano = planejarEstudo(vazia(), leitura, { destinos: {}, revisao }, {});
  assert.ok(plano.ok, !plano.ok ? plano.mensagem : "");
  const aula = executarComando(vazia(), { tipo: "IMPORTAR_ESTUDO", plano: plano.plano }, {});
  // Os dois Qg6?? comentados viram capítulos de comparação, logo depois das aulas deles (18/9/2026).
  assert.deepEqual(aula.fluxo.map((e) => e.tipo), ["introducao", "capitulo", "capitulo", "capitulo", "capitulo", "capitulo", "treino", "treino", "treino", "treino"]);
  assert.equal(aula.introducoes[0].quadros.length, 1);
  const diagnostico = aula.capitulos.find((c) => c.titulo === "AULA DIAGNÓSTICO - Como você começaria?");
  assert.ok(diagnostico, "o 01 virou capítulo");
  assert.deepEqual(diagnostico!.caminho, []);
  assert.equal(aula.fluxo[1].entidadeId, diagnostico!.id, "no lugar dele no estudo, antes das aulas explicadas");
  const analise = aula.analises.find((a) => a.id === diagnostico!.analiseId)!;
  assert.equal(analise.inicio.tipo === "fen" && analise.inicio.fen, "8/8/8/8/4k3/8/8/3QK3 w - - 0 1");
  assert.match(analise.nos[analise.raizId].comentario ?? "", /qual deve ser seu primeiro objetivo\?/);
  assert.equal(diagnostico!.narracoes.length, 1);
  assert.equal(diagnostico!.narracoes[0].pausa, "manual");
  assert.match(diagnostico!.narracoes[0].texto, /segurança\?\n\nOlhe para a posição/, "os parágrafos continuam parágrafos");
  assert.deepEqual(problemasDaAulaV2(aula).filter((p) => p.severidade === "erro"), []);
  // O aluno vê a posição com a pergunta, e segue quando clicar em Continuar.
  const trecho = previaDaAula(aula, {}).trechos.find((t) => t.capituloId === diagnostico!.id)!;
  assert.deepEqual(trecho.passos.map((p) => [p.lance ?? null, p.pausaManual]), [[null, true]]);
  assert.match(trecho.passos[0].fala, /Como fazer isso com segurança\?/i);

  // Importar de novo continua recusado, agora também pelo capítulo parado.
  const outraVez = planejarEstudo(aula, lerEstudo(PGN, idsDaAulaV2(aula)), { destinos: { 1: "fora", 3: "fora", 4: "fora", 5: "fora", 6: "fora", 7: "fora", 8: "fora", 9: "fora" }, revisao }, {});
  assert.equal(outraVez.ok, false);
  assert.match(!outraVez.ok ? outraVez.mensagem : "", /já ter sido importado/);
});

test("aplicado com o 01 como introdução: 2 quadros, 2 capítulos com Qg6??, 4 treinos, 3 mates no 07 e Qg7+ como erro", () => {
  const leitura = lerEstudo(PGN);
  const plano = planejarEstudo(vazia(), leitura, { destinos: { 2: "introducao" }, revisao }, {});
  assert.ok(plano.ok, !plano.ok ? plano.mensagem : "");
  assert.deepEqual(plano.plano.praticas, [{ numero: 9, titulo: "PRÁTICA LIVRE - Vença sem afogar", fen: "8/8/8/8/4k3/8/8/3QK3 w - - 0 1", lado: "white" }]);
  const aula = executarComando(vazia(), { tipo: "IMPORTAR_ESTUDO", plano: plano.plano }, {});

  assert.deepEqual(aula.fluxo.map((e) => e.tipo), ["introducao", "capitulo", "capitulo", "capitulo", "capitulo", "treino", "treino", "treino", "treino"]);
  assert.deepEqual(aula.capitulos.map((c) => c.titulo), ["AULA EXPLICADA - O L e a caixa", "Comparação: 8. Dg6??", "AULA EXPLICADA - O método completo", "Comparação: 11. Dg6??"]);
  const intro = aula.introducoes[0];
  assert.equal(intro.quadros.length, 2);
  assert.match(intro.quadros[0].texto, /relógio\.\n\nVocê vai aprender|relógio\.\nVocê vai aprender/, "os parágrafos continuam parágrafos");
  assert.equal(intro.quadros[0].posicao.tipo, "referencia", "a posição do quadro aponta o capítulo 03, que tem a mesma");
  assert.equal(passosDaIntroducao(aula, intro, {})[0].fen, "8/8/8/8/4k3/8/8/3QK3 w - - 0 1");

  for (const [i, lance] of [[0, "g5g6"], [2, "g4g6"]] as const) {
    const analise = aula.analises.find((a) => a.id === aula.capitulos[i].analiseId)!;
    const variante = Object.values(analise.nos).find((no) => no.uci === lance && no.nags?.includes(4));
    assert.ok(variante, `capítulo ${i + 2}: a variante Qg6?? está na árvore`);
    assert.match(variante!.comentario ?? "", /afogamento/i);
  }
  assert.ok(aula.capitulos.reduce((n, c) => n + c.narracoes.length, 0) >= 20, "os comentários viraram narração");
  assert.equal(aula.capitulos[0].titulo, "AULA EXPLICADA - O L e a caixa");

  assert.equal(aula.treinos.length, 4);
  assert.ok(aula.treinos.every((t) => t.propriedade === "independente" && t.ladoAluno === "white"));
  const t06 = aula.treinos[2];
  const q14 = t06.questoes[1];
  const afogar = q14.respostas.find((r) => r.moves[0] === "g4g6" || r.moves[0].endsWith("g6"));
  assert.equal(afogar?.julgamento, "erro");
  assert.match(afogar!.feedback, /Afogamento/);
  assert.equal(t06.questoes[0].respostas[0].efeito.tipo === "avanca" && t06.questoes[0].respostas[0].efeito.defesas[0].texto, "Agora pare a dama e traga o rei.");

  const t07 = aula.treinos[3];
  const ultima = t07.questoes.at(-1)!;
  const mates = ultima.respostas.filter((r) => r.julgamento === "correta" && r.efeito.tipo === "encerra" && r.efeito.condicao === "mate").map((r) => r.moves[0]).sort();
  assert.deepEqual(mates, ["g4g6", "g4h3", "g4h4"]);
  const g7 = ultima.respostas.find((r) => r.moves[0] === "g4g7");
  assert.equal(g7?.julgamento, "erro");
  assert.match(g7!.feedback, /tente de novo/);
  assert.ok(plano.plano.avisos.some((a) => /Qg7\+ não tem símbolo/.test(a)), "o erro sem símbolo fica marcado para revisar");

  // O aluno consegue jogar cada treino, e os erros entram no catálogo.
  for (const treino of aula.treinos) assert.ok(treinoJogavel(aula, treino.id, {}).tree, treino.titulo);
  assert.equal(aula.catalogo?.erros.length, 2);

  const erros = problemasDaAulaV2(aula).filter((p) => p.severidade === "erro");
  assert.deepEqual(erros, []);
  assert.equal(problemasDaAulaV2(aula).filter((p) => p.codigo === "FEN_IMPORTADA_SEM_REVISAO").length, 0, "a proveniência veio preenchida");
});

test("importar o mesmo estudo duas vezes avisa, e não duplica", () => {
  const leitura = lerEstudo(PGN);
  const primeiro = planejarEstudo(vazia(), leitura, { destinos: { 9: "fora" }, revisao }, {});
  assert.ok(primeiro.ok);
  const aula = executarComando(vazia(), { tipo: "IMPORTAR_ESTUDO", plano: primeiro.plano }, {});
  const segundo = planejarEstudo(aula, lerEstudo(PGN), { destinos: { 9: "fora" }, revisao }, {});
  assert.equal(segundo.ok, false);
  assert.match(!segundo.ok ? segundo.mensagem : "", /já ter sido importado/);
});

test("um segundo estudo, ou um capítulo avulso por link, entra na aula que já tem um estudo", () => {
  // Achado no teste final de 15/9/2026: os capítulos "02 - …" ganhavam o id pela ordem no arquivo
  // (`jogo-2`), e qualquer outro estudo — ou o capítulo que o Doug traz depois pelo link — colidia e
  // era recusado com "parece já ter sido importado", que era falso.
  const primeiro = planejarEstudo(vazia(), lerEstudo(PGN), { destinos: { 9: "fora" }, revisao }, {});
  assert.ok(primeiro.ok);
  const aula = executarComando(vazia(), { tipo: "IMPORTAR_ESTUDO", plano: primeiro.plano }, {});

  const outro = PGN.replaceAll("hf09xMzS", "OutroEst");
  const segundo = planejarEstudo(aula, lerEstudo(outro, idsDaAulaV2(aula)), { destinos: { 9: "fora" }, revisao }, {});
  assert.ok(segundo.ok, segundo.ok ? "" : segundo.mensagem);
  const junta = executarComando(aula, { tipo: "IMPORTAR_ESTUDO", plano: segundo.plano }, {});
  assert.equal(junta.capitulos.length, aula.capitulos.length * 2);
  assert.deepEqual(problemasDaAulaV2(junta).filter((p) => p.codigo === "ID_DUPLICADO"), []);

  // O mesmo estudo, lido já sabendo os ids da aula, continua recusado — agora pelo endereço do capítulo.
  const repetido = planejarEstudo(aula, lerEstudo(PGN, idsDaAulaV2(aula)), { destinos: { 9: "fora" }, revisao }, {});
  assert.equal(repetido.ok, false);
  assert.match(!repetido.ok ? repetido.mensagem : "", /já ter sido importado/);
});

test("a variante que perde, com símbolo ou comentário, vira capítulo de comparação logo depois da aula (18/9/2026)", () => {
  const pgn = `[Event "E"]\n[StudyName "Oposição"]\n[ChapterName "01 - AULA A oposição"]\n[FEN "3k4/8/8/3PK3/8/8/8/8 w - - 0 1"]\n[SetUp "1"]\n\n`
    + `{ Brancas jogam. } 1. Kd6! { Oposição. } ( 1. Ke6? { Agora as Pretas tomam a oposição. } 1... Ke8 { Empate. } ) ( 1. Kf6 ) 1... Ke8 2. Kc7 *\n\n`;
  const plano = planejarEstudo(vazia(), lerEstudo(pgn), { destinos: {}, revisao }, {});
  assert.ok(plano.ok, !plano.ok ? plano.mensagem : "");
  const aula = executarComando(vazia(), { tipo: "IMPORTAR_ESTUDO", plano: plano.plano }, {});
  assert.deepEqual(aula.fluxo.map((e) => e.tipo), ["capitulo", "capitulo"], "a variante sem símbolo e sem comentário (1. Kf6) não vira capítulo");
  const [aulaPrincipal, comparacao] = aula.fluxo.map((e) => aula.capitulos.find((c) => c.id === e.entidadeId)!);
  assert.equal(aulaPrincipal.titulo, "AULA A oposição");
  assert.equal(comparacao.titulo, "Comparação: 1. Re6?", "em português: o rei é R");
  assert.equal(comparacao.caminho.length, 2);
  assert.deepEqual(comparacao.narracoes.map((n) => n.texto), ["Agora as Pretas tomam a oposição.", "Empate."], "só os comentários da variante, sem repetir os da aula");
  const previa = previaDaAula(aula, {});
  assert.match(previa.trechos[1].comparacao?.texto ?? "", /^Voltamos/);
  assert.ok(previa.trechos[1].passos.some((p) => p.retorno), "o aluno vê o passo de retorno");
  assert.deepEqual(problemasDaAulaV2(aula).filter((p) => p.severidade === "erro"), []);
});

test("[Result \"1/2-1/2\"] declara empate: o treino cobra segurar o empate, e a prática também (18/9/2026)", () => {
  const cap = (nome: string, extra: string, corpo: string) => `[Event "E"]\n[StudyName "S"]\n[ChapterName "${nome}"]\n[FEN "3k4/8/3P4/3K4/8/8/8/8 b - - 0 1"]\n[SetUp "1"]\n[Orientation "black"]\n${extra}\n\n${corpo} *\n\n`;
  const pgn = cap("01 - TREINO - Feche a passagem", '[White "Brancas"]\n[Black "Aluno - Pretas"]\n[ChapterMode "gamebook"]\n[Result "1/2-1/2"]', "1... Kc8 2. Kc6 Kd8")
    + cap("02 - TREINO - Outra", '[White "Brancas"]\n[Black "Aluno - Pretas"]\n[ChapterMode "gamebook"]', "1... Kc8 2. Kc6 Kd8")
    + cap("03 - PRÁTICA - Empate", '[White "Engine"]\n[Black "Aluno - Pretas"]\n[Result "1/2-1/2"]', "{ Jogue. }");
  const leitura = lerEstudo(pgn);
  const plano = planejarEstudo(vazia(), leitura, { destinos: {}, revisao }, {});
  assert.ok(plano.ok, !plano.ok ? plano.mensagem : "");
  assert.deepEqual(plano.plano.treinos.map((t) => t.resultado), ["draw", undefined]);
  assert.deepEqual(plano.plano.praticas.map((p) => p.resultado), ["draw"]);
});
