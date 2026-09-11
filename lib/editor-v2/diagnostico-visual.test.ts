import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { descreverProblemaV2, emOnde, problemasVisiveisV2, resumoDosProblemasV2 } from "./diagnostico-visual.ts";
import { problemasDaAulaV2, type ProblemaV2 } from "./modelo.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

function aulaDoPiloto() {
  return structuredClone(adaptarLessonV1(lesson, positions));
}

function problema(parcial: Partial<ProblemaV2> & { localizacao: ProblemaV2["localizacao"] }): ProblemaV2 {
  return { codigo: "TESTE", severidade: "erro", mensagem: "um problema", ...parcial };
}

test("um lance do percurso vira o número que o professor conta na tela", () => {
  const aula = aulaDoPiloto();
  const capitulo = aula.capitulos[0];
  const terceiro = capitulo.caminho[2];
  const visivel = descreverProblemaV2(aula, problema({
    localizacao: { aulaId: aula.id, analiseId: capitulo.analiseId, nodeId: terceiro },
  }));
  assert.equal(visivel.onde, `o 3º lance do capítulo «${capitulo.titulo}»`);
  assert.deepEqual(visivel.destino, { capituloId: capitulo.id, analiseId: capitulo.analiseId, nodeId: terceiro });
  // O identificador interno não pode vazar para a frase que o professor lê.
  assert.ok(!visivel.onde.includes(terceiro));
});

test("a posição de partida do capítulo não é chamada de lance", () => {
  const aula = aulaDoPiloto();
  const capitulo = aula.capitulos[0];
  const visivel = descreverProblemaV2(aula, problema({
    localizacao: { aulaId: aula.id, analiseId: capitulo.analiseId, nodeId: capitulo.inicioNodeId },
  }));
  assert.equal(visivel.onde, `a posição de partida do capítulo «${capitulo.titulo}»`);
});

test("um lance de variante é reconhecido como variante, e ainda leva ao capítulo", () => {
  const aula = aulaDoPiloto();
  const capitulo = aula.capitulos[0];
  const analise = aula.analises.find((a) => a.id === capitulo.analiseId)!;
  analise.nos["node-variante"] = { id: "node-variante", uci: "c6b6", filhos: [] };
  analise.nos[capitulo.inicioNodeId].filhos.push("node-variante");
  const visivel = descreverProblemaV2(aula, problema({
    localizacao: { aulaId: aula.id, analiseId: capitulo.analiseId, nodeId: "node-variante" },
  }));
  assert.equal(visivel.onde, `um lance de variante, no capítulo «${capitulo.titulo}»`);
  assert.equal(visivel.destino?.nodeId, "node-variante");
});

test("cada tipo de lugar ganha nome próprio, e nenhum mostra id", () => {
  const aula = aulaDoPiloto();
  const introducao = aula.introducoes[0];
  const treino = aula.treinos[0];
  const pratica = aula.praticas[0];

  const quadro = descreverProblemaV2(aula, problema({
    localizacao: { aulaId: aula.id, introducaoId: introducao.id, quadroId: introducao.quadros[1].id },
  }));
  assert.equal(quadro.onde, `o 2º quadro da introdução «${introducao.titulo}»`);

  const pergunta = descreverProblemaV2(aula, problema({
    localizacao: { aulaId: aula.id, treinoId: treino.id, questaoId: treino.questoes[1].id },
  }));
  assert.equal(pergunta.onde, `a 2ª pergunta do treino «${treino.titulo}»`);

  const resposta = descreverProblemaV2(aula, problema({
    localizacao: { aulaId: aula.id, treinoId: treino.id, questaoId: treino.questoes[0].id, respostaId: treino.questoes[0].respostas[0].id },
  }));
  assert.match(resposta.onde, /^a 1ª resposta da 1ª pergunta do treino/);

  const daPratica = descreverProblemaV2(aula, problema({ localizacao: { aulaId: aula.id, praticaId: pratica.id } }));
  assert.equal(daPratica.onde, `a prática «${pratica.titulo}»`);

  const daEtapa = descreverProblemaV2(aula, problema({ localizacao: { aulaId: aula.id, etapaId: aula.fluxo[2].id } }));
  assert.equal(daEtapa.onde, "a 3ª etapa do roteiro da aula");
});

test("problema sem lugar navegável não oferece botão que não leva a lugar nenhum", () => {
  const aula = aulaDoPiloto();
  const daAula = descreverProblemaV2(aula, problema({ localizacao: { aulaId: aula.id, campo: "metadados" } }));
  assert.equal(daAula.onde, "a aula");
  assert.equal(daAula.destino, null);

  const doTreino = descreverProblemaV2(aula, problema({ localizacao: { aulaId: aula.id, treinoId: aula.treinos[0].id } }));
  assert.equal(doTreino.destino, null, "o piloto ainda não navega até um treino");
});

test("entidade apagada não quebra a frase nem promete destino", () => {
  const aula = aulaDoPiloto();
  const visivel = descreverProblemaV2(aula, problema({ localizacao: { aulaId: aula.id, capituloId: "capitulo-que-sumiu" } }));
  assert.equal(visivel.onde, "um capítulo que não existe mais");
  assert.equal(visivel.destino, null);
});

test("o lance impossível chega à tela como lugar, e não como identificador", () => {
  // O caminho inteiro: validador → tradutor → frase que o professor lê.
  const aula = aulaDoPiloto();
  const capitulo = aula.capitulos[0];
  const segundo = capitulo.caminho[1];
  aula.analises.find((a) => a.id === capitulo.analiseId)!.nos[segundo].uci = "a1a8";

  const problemas = problemasDaAulaV2(aula, positions);
  const visiveis = problemasVisiveisV2(aula, problemas);
  const ilegal = visiveis.find((v) => v.problema.codigo === "LANCE_ILEGAL");
  assert.ok(ilegal);
  assert.equal(ilegal.onde, `o 2º lance do capítulo «${capitulo.titulo}»`);
  assert.equal(ilegal.destino?.nodeId, segundo);
  assert.match(ilegal.problema.mensagem, /não é um lance possível/);
});

test("os que impedem a publicação vêm antes dos que só avisam", () => {
  const aula = aulaDoPiloto();
  const lista: ProblemaV2[] = [
    problema({ codigo: "SO_AVISA", severidade: "aviso", localizacao: { aulaId: aula.id } }),
    problema({ codigo: "IMPEDE", severidade: "erro", localizacao: { aulaId: aula.id } }),
  ];
  assert.deepEqual(problemasVisiveisV2(aula, lista).map((v) => v.problema.codigo), ["IMPEDE", "SO_AVISA"]);
});

test("o resumo diz o que trava e o que só avisa, em uma linha", () => {
  const aula = aulaDoPiloto();
  assert.equal(resumoDosProblemasV2([]), null);
  assert.equal(
    resumoDosProblemasV2([problema({ severidade: "erro", localizacao: { aulaId: aula.id } })]),
    "1 problema impede a publicação",
  );
  assert.equal(
    resumoDosProblemasV2([
      problema({ severidade: "erro", localizacao: { aulaId: aula.id } }),
      problema({ severidade: "erro", localizacao: { aulaId: aula.id } }),
      problema({ severidade: "aviso", localizacao: { aulaId: aula.id } }),
    ]),
    "2 problemas impedem a publicação · 1 aviso",
  );
});

test("a aula real do piloto não produz problema nenhum para mostrar", () => {
  const aula = aulaDoPiloto();
  assert.deepEqual(problemasVisiveisV2(aula, problemasDaAulaV2(aula, positions)), []);
});

test("a preposição contrai como em português, e não fica «em o»", () => {
  assert.equal(emOnde("o 2º lance do capítulo «X»"), "no 2º lance do capítulo «X»");
  assert.equal(emOnde("a 3ª etapa do roteiro da aula"), "na 3ª etapa do roteiro da aula");
  assert.equal(emOnde("um lance de variante, no capítulo «X»"), "num lance de variante, no capítulo «X»");
  assert.equal(emOnde("uma prática que não existe mais"), "numa prática que não existe mais");
  // Sem artigo na frente, a preposição fica solta mesmo — é o certo.
  assert.equal(emOnde("toda a aula"), "em toda a aula");
});
