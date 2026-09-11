/**
 * O corpus grande do plano (§17) e os tetos que ele sustenta.
 *
 * As duas fixtures são construídas **uma vez** no topo do arquivo: gerar 500 lances
 * legais custa cerca de 1,5 s, e gerá-las dentro de cada teste transformaria este
 * arquivo no trecho lento da suíte sem provar nada a mais.
 *
 * Os testes de teto **não** usam as fixtures de xadrez. Um documento com 2.001 nós
 * inventados prova a mesma coisa e custa milissegundos; o corpus de verdade está aqui
 * para provar que a aula grande **passa**, que é a afirmação cara.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Chess } from "chess.js";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { mapaDaAnalise } from "./arvore.ts";
import { arvoreLargaV2, linhaLongaV2, POSICAO_DO_CORPUS, POSICOES_DO_CORPUS } from "./corpus.ts";
import { hashDaPosicao } from "./hash.ts";
import { LIMITES_V2, medidasDaAulaV2, problemasDeLimiteV2 } from "./limites.ts";
import { problemasDaAulaV2, validarAulaV2, type AulaV2, type NoV2 } from "./modelo.ts";

const linhaDe500 = linhaLongaV2();
const arvoreDe1000 = arvoreLargaV2();

/** Uma aula com `quantidade` nós inventados numa linha reta — barata, e ilegal de propósito. */
function aulaDeMentira(quantidade: number, enfeitar: (no: NoV2, indice: number) => void = () => {}): AulaV2 {
  const nos: Record<string, NoV2> = { "no-0": { id: "no-0", filhos: [] } };
  for (let i = 1; i <= quantidade; i += 1) {
    const no: NoV2 = { id: `no-${i}`, uci: "e2e4", filhos: [] };
    enfeitar(no, i);
    nos[no.id] = no;
    nos[`no-${i - 1}`].filhos.push(no.id);
  }
  return {
    schemaVersion: 2,
    id: "EX-MENTIRA",
    titulo: "aula de mentira",
    proveniencia: [],
    excecoes: [],
    analises: [{ id: "analise-mentira", inicio: { tipo: "posicao", positionId: POSICAO_DO_CORPUS.id }, raizId: "no-0", nos }],
    introducoes: [],
    capitulos: [],
    treinos: [],
    praticas: [],
    fluxo: [],
  };
}

test("a linha longa tem 500 meios-lances legais, um atrás do outro", () => {
  const medidas = medidasDaAulaV2(linhaDe500);
  assert.equal(medidas.nos, 500);
  assert.equal(medidas.profundidade, 500);

  // A legalidade é conferida aqui de novo, fora do validador: a fixture existe para
  // medir custo, e uma fixture com lance impossível mediria o custo de outra coisa.
  const jogo = new Chess(POSICAO_DO_CORPUS.fen);
  let atual = "no-0";
  const nos = linhaDe500.analises[0].nos;
  for (let i = 0; i < 500; i += 1) {
    const filho = nos[nos[atual].filhos[0]];
    const uci = filho.uci!;
    assert.ok(jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }), `lance ilegal no nó ${filho.id}`);
    atual = filho.id;
  }
});

test("a árvore larga tem 1.000 nós, com comentários e variantes", () => {
  const medidas = medidasDaAulaV2(arvoreDe1000);
  assert.equal(medidas.nos, 1000);
  assert.ok(medidas.comentarios > 300, `esperava comentários de sobra, vieram ${medidas.comentarios}`);
  const ramificados = Object.values(arvoreDe1000.analises[0].nos).filter((no) => no.filhos.length > 1);
  assert.ok(ramificados.length > 10, `esperava variantes de verdade, vieram ${ramificados.length} nós com ramo`);
});

test("as duas fixtures passam no validador inteiro, sem um problema sequer", () => {
  for (const aula of [linhaDe500, arvoreDe1000]) {
    assert.deepEqual(validarAulaV2(aula), { ok: true, aula });
    assert.deepEqual(problemasDaAulaV2(aula, POSICOES_DO_CORPUS, hashDaPosicao), []);
  }
});

test("a mesma semente devolve a mesma árvore — fixture não sorteia a cada execução", () => {
  assert.deepEqual(linhaLongaV2(40), linhaLongaV2(40));
  assert.notDeepEqual(linhaLongaV2(40, 1), linhaLongaV2(40, 2));
});

test("na árvore de 1.000 nós cada lance é jogado uma vez", () => {
  // O mesmo teste de regressão que fixou a queda de 758 ms para 24 ms, agora no
  // tamanho que o plano manda medir. Contagem, e não cronômetro: cronômetro em teste
  // fica vermelho sozinho na máquina ocupada.
  const original = Chess.prototype.move;
  let jogadas = 0;
  Chess.prototype.move = function (...argumentos: Parameters<typeof original>) {
    jogadas += 1;
    return original.apply(this, argumentos);
  };
  try {
    mapaDaAnalise(arvoreDe1000, "analise-corpus", POSICOES_DO_CORPUS);
  } finally {
    Chess.prototype.move = original;
  }
  assert.equal(jogadas, 1000);
});

test("acima do teto, cada dimensão acusa o seu código com os dois números", () => {
  const nos = problemasDeLimiteV2(aulaDeMentira(LIMITES_V2.nosPorAnalise + 1));
  assert.deepEqual(nos.map((p) => p.codigo), ["LIMITE_NOS_ANALISE", "LIMITE_PROFUNDIDADE"]);
  assert.match(nos[0].mensagem, /2001 lances e o limite é 2000/);
  assert.equal(nos[0].analiseId, "analise-mentira");

  const comentarios = problemasDeLimiteV2(aulaDeMentira(LIMITES_V2.comentarios + 1, (no) => { no.comentario = "x"; }));
  assert.ok(comentarios.some((p) => p.codigo === "LIMITE_COMENTARIOS"));

  const desenhos = problemasDeLimiteV2(aulaDeMentira(500, (no) => { no.desenhos = { arrows: Array.from({ length: 9 }, () => ["e2", "e4"] as [string, string] ) }; }));
  assert.ok(desenhos.some((p) => p.codigo === "LIMITE_DESENHOS"));

  const bytes = problemasDeLimiteV2(aulaDeMentira(500, (no) => { no.comentario = "x".repeat(5000); }));
  assert.ok(bytes.some((p) => p.codigo === "LIMITE_BYTES"));
});

test("exatamente no teto nada é acusado — o limite é o último valor aceito", () => {
  // Uma linha reta de 1.000 nós encosta em **dois** tetos ao mesmo tempo, o de
  // profundidade e o de nós. É o caso limite mais apertado que existe, e é por isso
  // que ele está aqui: se a comparação fosse `>=` em qualquer um dos dois, este
  // teste ficaria vermelho.
  assert.equal(LIMITES_V2.profundidade, 1000);
  assert.deepEqual(problemasDeLimiteV2(aulaDeMentira(LIMITES_V2.profundidade)), []);
});

test("os tetos valem mesmo sem o pacote de posições", () => {
  // Contrato: legalidade e proveniência precisam das posições; tamanho, não. Quem
  // recupera um rascunho local, sem pacote nenhum, ainda precisa saber que ele não cabe.
  const problemas = problemasDaAulaV2(aulaDeMentira(LIMITES_V2.nosPorAnalise + 1));
  assert.ok(problemas.some((p) => p.codigo === "LIMITE_NOS_ANALISE" && p.severidade === "erro"));
  assert.equal(problemas.find((p) => p.codigo === "LIMITE_NOS_ANALISE")?.localizacao.analiseId, "analise-mentira");
});

test("as aulas reais ficam muito abaixo de todos os tetos", () => {
  const positions: Record<string, Position> = Object.fromEntries(
    arquivosJson("content/positions").map((arquivo) => {
      const posicao = positionSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
      return [posicao.id, posicao];
    }),
  );
  for (const arquivo of arquivosJson("content/lessons")) {
    const lesson = lessonSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
    const aula = adaptarLessonV1(lesson, positions);
    const medidas = medidasDaAulaV2(aula);
    assert.deepEqual(problemasDeLimiteV2(aula, medidas), [], `${arquivo} bateu num teto`);
    // Não só "passa": passa com folga de uma ordem de grandeza. Um teto que a aula
    // real quase encosta é um teto mal escolhido, e este teste avisa antes do susto.
    assert.ok(medidas.nos * 10 < LIMITES_V2.nosPorAnalise, `${arquivo} tem ${medidas.nos} lances, perto demais do teto`);
    assert.ok(medidas.bytes * 10 < LIMITES_V2.bytes, `${arquivo} ocupa ${medidas.bytes} bytes, perto demais do teto`);
  }
});

function arquivosJson(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? arquivosJson(caminho) : caminho.endsWith(".json") ? [caminho] : [];
  });
}
