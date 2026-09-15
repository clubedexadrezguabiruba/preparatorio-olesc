import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lerRegua, reprovacoes } from "../lesson/voz.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { CATALOGO_VAZIO, FEEDBACK_DE_RESPOSTA_NOVA } from "./autoria-treino.ts";
import type { AulaV2, TreinoV2 } from "./modelo.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";
import { falasDoTreinoV2 } from "./voz-do-treino.ts";

/**
 * Plano final §6 e §12: todo texto que chega ao aluno passa pela régua de voz. No treino
 * v2 ela avisa e não impede salvar — a mesma política do editor v1 (`app/editor/acoes.ts`).
 */

const regua = lerRegua();
const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

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

test("régua: o painel lê feedback e texto da defesa juntos, e a soma paga o teto de uma fala", () => {
  const { brancas } = comTreinos();
  const treino = structuredClone(brancas);
  const resposta = treino.questoes[0].respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  resposta.feedback = "A torre vai a g4. A quarta fileira inteira ficou tomada, e por e4 ele não passa mais. Para cima não dá mais.";
  resposta.efeito.defesas[0].texto = "O rei preto desce para d2, a única casa que sobrou para ele fora do alcance das duas torres brancas.";
  const antes = structuredClone(treino);
  const achados = reprovacoes(falasDoTreinoV2(treino), regua);
  assert.deepEqual(treino, antes, "colher as falas não pode mexer no treino");
  const caracteres = achados.filter((achado) => achado.regra === "caracteres");
  assert.equal(caracteres.length, 1, JSON.stringify(achados, null, 2));
  assert.match(caracteres[0].onde, /Pergunta 1 · resposta 1 · defesa e3d2/);
  assert.ok(resposta.feedback.length <= regua.falaMaxCaracteres, "o feedback sozinho cabe; é a soma que estoura");
});

test("régua: palavra de bastidor no texto da defesa inicial e da defesa final é apontada", () => {
  const { pretas } = comTreinos();
  const treino = structuredClone(pretas);
  treino.defesaInicial!.texto = "Nesta tentativa as brancas começam.";
  const fecho = treino.questoes.at(-1)!.respostas[0];
  if (fecho.efeito.tipo !== "encerra") assert.fail("a última resposta deveria encerrar");
  // "método" saiu da lista em 15/9/2026; "roteiro" continua nela.
  fecho.efeito.textoDaDefesaFinal = "Mate, pelo roteiro.";
  const proibidas = reprovacoes(falasDoTreinoV2(treino), regua).filter((achado) => achado.regra === "proibida");
  assert.deepEqual(proibidas.map((achado) => achado.onde.split(" · ").at(-1)).sort(), ["defesa final g4g1", "defesa inicial g2g4"]);
});

test("régua: dica, objetivo e explicação ao concluir entram na conta", () => {
  const { brancas } = comTreinos();
  const treino = structuredClone(brancas);
  // "objetivo" saiu da lista em 15/9/2026: a fala do objetivo reprova por outra palavra.
  treino.objetivo = "Siga o roteiro até dar mate.";
  treino.explicacaoConclusao = "Cada etapa fechou uma fileira.";
  treino.questoes[0].dica = "Olhe o teto do rei.";
  const onde = reprovacoes(falasDoTreinoV2(treino), regua).map((achado) => achado.onde);
  assert.ok(onde.some((texto) => /objetivo/.test(texto)), onde.join("\n"));
  assert.ok(onde.some((texto) => /explicação ao concluir/.test(texto)), onde.join("\n"));
  assert.ok(onde.some((texto) => /Pergunta 1 · dica/.test(texto)), onde.join("\n"));
});

test("régua de 15/9: objetivo, método, avaliação, teoria e estrutura passam; roteiro continua apontada", () => {
  const liberadas = ["objetivo", "método", "avaliação", "teoria", "estrutura"];
  for (const palavra of liberadas) assert.ok(!regua.proibidas.includes(palavra), `${palavra} ainda está na lista`);
  assert.equal(regua.proibidas.length, 15);
  const falas = [
    { onde: "liberada", texto: "O objetivo é dar mate, e o método é a escada.", tipo: "fala" as const },
    { onde: "presa", texto: "Siga o roteiro.", tipo: "fala" as const },
  ];
  assert.deepEqual(reprovacoes(falas, regua).filter((achado) => achado.regra === "proibida").map((achado) => achado.onde), ["presa"]);
});

test("régua: os treinos que \"Criar treino daqui\" faz na N0 passam sem aviso", () => {
  const { brancas, pretas } = comTreinos();
  for (const treino of [brancas, pretas]) {
    const falas = falasDoTreinoV2(treino);
    assert.ok(falas.length > treino.questoes.length, `o treino ${treino.titulo} deveria ter falas colhidas`);
    assert.deepEqual(reprovacoes(falas, regua), []);
  }
});

test("régua: os textos com que a janela preenche uma resposta nova passam na régua", () => {
  const falas = [
    ...Object.entries(FEEDBACK_DE_RESPOSTA_NOVA).map(([julgamento, texto]) => ({ onde: `resposta nova ${julgamento}`, texto, tipo: "fala" as const })),
    ...Object.entries(CATALOGO_VAZIO.mensagensPadrao).map(([chave, texto]) => ({ onde: `catálogo ${chave}`, texto, tipo: "fala" as const })),
  ];
  assert.deepEqual(reprovacoes(falas, regua), []);
});
