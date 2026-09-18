/**
 * A prova da régua de desenho: cada regra **pega** o estrago que ela existe para pegar, e
 * **cala** quando o estrago é desfeito. A segunda metade é a que importa — regra que nunca
 * cala é ruído, e ruído a gente aprende a ignorar.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import type { AulaV2 } from "./modelo.ts";
import { apontaAlgo, casasDoDesenho, problemasDeDesenhoV2, regrasDoLembreSe, treinosNoFluxo } from "./regua-de-desenho.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

const codigos = (aula: AulaV2) => problemasDeDesenhoV2(aula, positions).map((p) => p.codigo);
/** Os achados de um código só — a N1-KPK tem dívida velha, e o teste mede o que ele mesmo criou. */
const so = (aula: AulaV2, codigo: string) => problemasDeDesenhoV2(aula, positions).filter((p) => p.codigo === codigo);

/** Uma aula com N treinos derivados do mesmo capítulo, para medir os degraus do apoio. */
function comTreinos(quantos: number): AulaV2 {
  let aula = adaptarLessonV1(lesson, positions);
  aula = { ...aula, treinos: [], fluxo: aula.fluxo.filter((etapa) => etapa.tipo !== "treino") };
  const capitulo = aula.capitulos[0];
  for (let n = 1; n <= quantos; n += 1) {
    const preparo = prepararTreinosDaqui(aula, {
      capituloId: capitulo.id,
      nodeId: capitulo.caminho[(n - 1) * 2] ?? capitulo.inicioNodeId,
      titulo: `Treino ${n}`,
      objetivo: "Leve o peão até a promoção.",
      lado: "white",
      colocacao: "fim-da-aula",
      obrigatorio: true,
    }, positions);
    assert.equal(preparo.ok, true, `o treino ${n} deveria ser derivável`);
    if (!preparo.ok) throw new Error("preparo recusado");
    aula = aplicarTreinosPreparados(aula, preparo.preparo);
  }
  // A N1-KPK traz desenhos nos nós, e desde 17/9 eles chegam às perguntas. O teste parte da
  // folha em branco: o que ele mede é a régua, não a dívida daquela aula.
  for (const treino of aula.treinos) for (const questao of treino.questoes) delete questao.desenhos;
  return aula;
}

test("as casas de um desenho são lidas nas duas grafias do schema", () => {
  assert.deepEqual(casasDoDesenho({ highlights: ["d6", { casa: "e4", cor: "verde" }] }), ["d6", "e4"]);
  assert.deepEqual(casasDoDesenho({ arrows: [["c6", "c7"], { de: "e2", para: "e4", cor: "azul" }] }), ["c6", "c7", "e2", "e4"]);
  assert.equal(apontaAlgo(undefined), false);
  assert.equal(apontaAlgo({}), false, "desenho vazio não aponta nada");
  assert.equal(apontaAlgo({ arrows: [] }), false, "lista vazia não aponta nada");
});

test("piso: no treino 1 a pergunta sem alvo é apontada, e some quando o alvo entra", () => {
  const aula = comTreinos(2);
  const treinos = treinosNoFluxo(aula);
  assert.ok(codigos(aula).includes("DESENHO_TREINO_SEM_ALVO"), "o treino 1 sem desenho nenhum tem de reprovar");

  for (const questao of treinos[0].questoes) questao.desenhos = { highlights: [{ casa: "c8", cor: "verde" }] };
  assert.ok(!codigos(aula).includes("DESENHO_TREINO_SEM_ALVO"), "com todo nó apontando, a regra cala");
});

test("teto: do treino 2 em diante o alvo apontado é apontado, e some quando o desenho sai", () => {
  const aula = comTreinos(2);
  const treinos = treinosNoFluxo(aula);
  for (const questao of treinos[0].questoes) questao.desenhos = { highlights: [{ casa: "c8", cor: "verde" }] };
  assert.ok(!codigos(aula).includes("DESENHO_TREINO_COM_ALVO"), "o treino 1 pode apontar");

  treinos[1].questoes[0].desenhos = { highlights: [{ casa: "c8", cor: "verde" }] };
  const pegou = so(aula, "DESENHO_TREINO_COM_ALVO");
  assert.equal(pegou.length, 1);
  assert.match(pegou[0].mensagem, /2º da aula/);
  assert.equal(pegou[0].severidade, "aviso");

  delete treinos[1].questoes[0].desenhos;
  assert.ok(!codigos(aula).includes("DESENHO_TREINO_COM_ALVO"));
});

test("aula com um treino só cai na régua do treino 1 e não na do 2", () => {
  const aula = comTreinos(1);
  const treino = treinosNoFluxo(aula)[0];
  assert.ok(codigos(aula).includes("DESENHO_TREINO_SEM_ALVO"));
  for (const questao of treino.questoes) questao.desenhos = { highlights: ["c8"] };
  assert.deepEqual(codigos(aula).filter((c) => c.startsWith("DESENHO_TREINO")), []);
});

test("a seta que liga origem e destino do lance certo é meio lance entregue", () => {
  const aula = comTreinos(1);
  const treino = treinosNoFluxo(aula)[0];
  const questao = treino.questoes[0];
  const certo = questao.respostas[0].moves[0];
  questao.desenhos = { arrows: [[certo.slice(0, 2), certo.slice(2, 4)]] };
  const pegou = problemasDeDesenhoV2(aula, positions).filter((p) => p.codigo === "DESENHO_ENTREGA_O_LANCE");
  assert.equal(pegou.length, 1);
  assert.match(pegou[0].mensagem, new RegExp(`${certo.slice(0, 2)}→${certo.slice(2, 4)}`));

  // A mesma casa de destino, saindo de outro lugar, aponta o alvo sem entregar o caminho.
  questao.desenhos = { arrows: [["a1", certo.slice(2, 4)]] };
  assert.ok(!codigos(aula).includes("DESENHO_ENTREGA_O_LANCE"));
});

/** Uma aula de um capítulo só, com uma fala e um desenho — sem a dívida velha da N1-KPK. */
function umPassoSo(fala: string, desenhos?: Record<string, unknown>): AulaV2 {
  const aula = comTreinos(1);
  const capitulo = aula.capitulos[0];
  const analise = aula.analises.find((item) => item.id === capitulo.analiseId)!;
  // Um capítulo de um nó só: o percurso inteiro vira um passo, e o resto da aula fica calado.
  capitulo.caminho = [];
  capitulo.narracoes = [{ id: "narracao-teste", nodeId: capitulo.inicioNodeId, texto: fala, pausa: "temporizada" }];
  analise.nos[capitulo.inicioNodeId] = { ...analise.nos[capitulo.inicioNodeId], ...(desenhos ? { desenhos } : { desenhos: undefined }) } as typeof analise.nos[string];
  return { ...aula, capitulos: [capitulo], treinos: [], introducoes: [], fluxo: aula.fluxo.filter((etapa) => etapa.tipo === "capitulo") };
}

test("a casa dentro de um lance escrito conta como citada — inclusive em português", () => {
  // `\b[a-h][1-8]\b` não lê `Re7`: entre R e e não há fronteira de palavra. Numa aula escrita
  // em português — e todas são —, isso acusava a fala de não citar a casa que ela citou.
  assert.deepEqual(codigos(umPassoSo("As Brancas jogavam Re7.", { highlights: ["e7"] })), []);
  assert.deepEqual(codigos(umPassoSo("A dama vai a Dg6.", { highlights: ["g6"] })), []);
  assert.deepEqual(codigos(umPassoSo("A torre come: Txf1.", { highlights: ["f1"] })), []);
  assert.deepEqual(codigos(umPassoSo("O peão captura: exd5.", { highlights: ["d5"] })), []);
  assert.deepEqual(codigos(umPassoSo("O peão promove: d8=D.", { highlights: ["d8"] })), []);
  // E o que não é casa continua não sendo: palavra colada em número não vira coordenada.
  assert.equal(so(umPassoSo("Isto é a Fase1 da técnica.", { highlights: ["h1"] }), "CASA_ACESA_SEM_CITACAO").length, 1);
});

test("a seta é uma linha, não duas casas: ela não paga o teto da citação nem conta dobrado", () => {
  // A escada de torres: duas setas de coluna num passo, e a fala fala de colunas.
  const escada = umPassoSo("A torre fecha a coluna b, e a outra segura a c.", { arrows: [["b1", "b8"], ["c2", "c8"]] });
  assert.deepEqual(codigos(escada), [], "duas setas de coluna são dois desenhos, e a fala não precisa soletrar as pontas");

  // A ponta da seta confirma a casa citada: quem cita b8 e desenha a seta até b8 não é órfão.
  assert.deepEqual(codigos(umPassoSo("A torre chega a b8.", { arrows: [["b1", "b8"]] })), []);
});

test("casa citada é casa desenhada — e casa acesa é casa citada", () => {
  assert.equal(so(umPassoSo("O rei quer chegar a c8."), "CASA_CITADA_SEM_DESENHO").length, 1, "citou c8 e não desenhou");

  const certo = umPassoSo("O rei quer chegar a c8.", { highlights: [{ casa: "c8", cor: "verde" }] });
  assert.deepEqual(codigos(certo), [], "fala e desenho dizendo a mesma coisa: nada a apontar");

  const mudo = so(umPassoSo("O rei quer chegar a c8.", { highlights: [{ casa: "c8", cor: "verde" }, { casa: "h1", cor: "amarelo" }] }), "CASA_ACESA_SEM_CITACAO");
  assert.equal(mudo.length, 1);
  assert.match(mudo[0].mensagem, /h1/);

  // Passo sem fala nenhuma é exceção: desde 17/9 nenhum lance precisa de comentário.
  assert.deepEqual(codigos(umPassoSo("", { highlights: ["h1"] })), []);
});

test("o teto de três desenhos por passo pega o quarto", () => {
  const tres = umPassoSo("Olhe c8, d8 e e8.", { highlights: ["c8", "d8", "e8"] });
  assert.ok(!codigos(tres).includes("DESENHO_DEMAIS"), "três cabem");

  const quatro = so(umPassoSo("Olhe c8, d8, e8 e f8.", { highlights: ["c8", "d8", "e8", "f8"] }), "DESENHO_DEMAIS");
  assert.equal(quatro.length, 1);
  assert.match(quatro[0].mensagem, /4 desenhos/);
});

test("a variante que virou erro mudo é apontada com o lance pelo nome", () => {
  const aula = comTreinos(1);
  const treino = treinosNoFluxo(aula)[0];
  const questao = treino.questoes[0];
  questao.respostas.push({ id: "resposta-muda", moves: ["c6b6"], julgamento: "erro", feedback: "Este lance não é o da lição. Tente de novo.", efeito: { tipo: "repete" } });
  const pegou = problemasDeDesenhoV2(aula, positions).filter((p) => p.codigo === "VARIANTE_SEM_SIMBOLO");
  assert.equal(pegou.length, 1);
  assert.match(pegou[0].mensagem, /Kb6|c6b6/);

  questao.respostas.at(-1)!.feedback = "Por aqui o rei larga o peão.";
  assert.ok(!codigos(aula).includes("VARIANTE_SEM_SIMBOLO"), "com a frase do professor, a variante tem nome");
});

test("a linha-título do LEMBRE-SE não é regra, e a numeração manda quando existe", () => {
  // O defeito que o piloto revelou em 18/9: `LEMBRE-SE:` sozinho na primeira linha contava.
  assert.deepEqual(regrasDoLembreSe(["LEMBRE-SE:\n\n1. Uma.\n2. Duas.\n3. Três."]).length, 3);
  assert.deepEqual(regrasDoLembreSe(["Lembre-se\nUma.\nDuas."]).length, 2, "sem numeração, conta linha");
  // Regra numerada que quebra em duas linhas continua sendo uma regra só.
  assert.deepEqual(regrasDoLembreSe(["1. Uma regra que\ncontinua aqui.\n2. Outra."]).length, 2);
  assert.deepEqual(regrasDoLembreSe(["LEMBRE-SE"]).length, 0, "só o título é capítulo vazio");
});

test("LEMBRE-SE leva de 1 a 3 regras, e o primeiro quadro da introdução é pergunta", () => {
  const aula = comTreinos(1);
  const capitulo = aula.capitulos[0];
  capitulo.titulo = "LEMBRE-SE";
  capitulo.narracoes = [{ id: "n1", nodeId: capitulo.inicioNodeId, texto: "Uma.\nDuas.\nTrês.\nQuatro.", pausa: "manual" }];
  assert.ok(codigos(aula).includes("LEMBRE_SE_REGRAS"));
  capitulo.narracoes[0].texto = "Uma.\nDuas.\nTrês.";
  assert.ok(!codigos(aula).includes("LEMBRE_SE_REGRAS"));

  if (aula.introducoes[0]?.quadros[0]) {
    aula.introducoes[0].quadros[0].texto = "As brancas ganham.";
    assert.ok(codigos(aula).includes("QUADRO_1_NAO_PERGUNTA"));
    aula.introducoes[0].quadros[0].texto = "Ganha, empata ou perde?";
    assert.ok(!codigos(aula).includes("QUADRO_1_NAO_PERGUNTA"));
  }
});

test("a régua não fala de aula de abertura: o escopo de 17/9 é só finais", () => {
  const aula = comTreinos(2);
  assert.ok(codigos(aula).length > 0);
  assert.deepEqual(codigos({ ...aula, id: "AB-BRANCAS-FRANCESA-A" }), []);
});
