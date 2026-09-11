import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { quadroDoNo } from "./arvore.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { problemasDaAulaV2, validarAulaV2, type AulaV2 } from "./modelo.ts";
import { entradasVerticais } from "./painel.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

test("a N1-KPK vira um capítulo explícito sem tocar no arquivo v1", () => {
  const antes = readFileSync("content/lessons/N1-KPK.json", "utf8");
  const aula = adaptarLessonV1(lesson, positions);
  assert.equal(aula.schemaVersion, 2);
  assert.equal(aula.capitulos.length, 1);
  assert.equal(aula.capitulos[0].narracoes.length, 13);
  assert.equal(aula.capitulos[0].caminho.length, 11);
  assert.equal(aula.praticas.length, 1);
  assert.deepEqual(aula.praticas[0].engine, { skill: 20, moveTimeMs: 300 });
  assert.equal(aula.treinos.length, 1);
  assert.equal(aula.treinos[0].questoes.length, 6);
  const primeiraResposta = aula.treinos[0].questoes[0].respostas[0];
  assert.deepEqual(primeiraResposta.moves, ["c6c7"]);
  assert.deepEqual(primeiraResposta.efeito, { tipo: "avanca", defesas: [{ move: "e7e6", proximaQuestaoId: "questao-n1-kpk-n2" }] });
  assert.equal(aula.treinos[0].questoes[0].posicao.nodeId, aula.analises[0].raizId);
  assert.equal(aula.treinos[0].questoes.at(-1)!.respostas[0].efeito.tipo, "encerra");
  assert.deepEqual(aula.treinos[0].questoes.at(-1)!.respostas[0].efeito, { tipo: "encerra", condicao: "promotion" });
  assert.deepEqual(aula.fluxo.map((etapa) => etapa.tipo), ["capitulo", "treino", "pratica"]);
  assert.deepEqual(validarAulaV2(aula), { ok: true, aula });
  assert.equal(readFileSync("content/lessons/N1-KPK.json", "utf8"), antes);
});

test("cada nó do piloto reconstrói a posição e o último promove em b8", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const fim = capitulo.caminho.at(-1)!;
  const quadro = quadroDoNo(aula, capitulo.analiseId, fim, positions);
  assert.equal(quadro.san, "b8=Q");
  assert.match(quadro.fen, /1Q6/);
});

test("rascunho v2 anterior ao campo de práticas continua legível", () => {
  const antigo: Record<string, unknown> = structuredClone(adaptarLessonV1(lesson, positions));
  delete antigo.praticas;
  antigo.fluxo = (antigo.fluxo as AulaV2["fluxo"]).filter((etapa) => etapa.tipo !== "pratica");
  const resultado = validarAulaV2(antigo);
  assert.equal(resultado.ok, true);
  if (resultado.ok) assert.deepEqual(resultado.aula.praticas, []);
});

test("o contrato acusa filho ausente e ciclo", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  analise.nos[analise.raizId].filhos.push("node-ausente");
  const fim = aula.capitulos[0].caminho.at(-1)!;
  analise.nos[fim].filhos.push(analise.raizId);
  const codigos = problemasDaAulaV2(aula).map((p) => p.codigo);
  assert.ok(codigos.includes("FILHO_AUSENTE"));
  assert.ok(codigos.includes("CICLO_NA_ARVORE"));
});

test("editar comentário e NAG é transacional e desfaz/refaz", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const nodeId = capitulo.caminho[0];
  let h = iniciarHistorico(aula);
  h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "EDITAR_COMENTARIO", analiseId: capitulo.analiseId, nodeId, comentario: "O rei abre o caminho." }, positions));
  h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "ALTERNAR_NAG", analiseId: capitulo.analiseId, nodeId, nag: 1 }, positions));
  assert.equal(h.presente.analises[0].nos[nodeId].comentario, "O rei abre o caminho.");
  assert.deepEqual(h.presente.analises[0].nos[nodeId].nags, [1]);
  h = desfazer(h);
  assert.equal(h.presente.analises[0].nos[nodeId].nags, undefined);
  h = refazer(h);
  assert.deepEqual(h.presente.analises[0].nos[nodeId].nags, [1]);
});

test("lance divergente vira variante, e promover não troca a identidade", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const raiz = aula.analises[0].raizId;
  const comVariante = executarComando(aula, { tipo: "ADICIONAR_LANCE", analiseId: capitulo.analiseId, nodeId: raiz, uci: "c6b6", novoNodeId: "node-variante-teste" }, positions);
  assert.equal(comVariante.analises[0].nos[raiz].filhos.at(-1), "node-variante-teste");
  const promovida = executarComando(comVariante, { tipo: "PROMOVER_VARIANTE", analiseId: capitulo.analiseId, parentId: raiz, nodeId: "node-variante-teste" }, positions);
  assert.equal(promovida.analises[0].nos[raiz].filhos[0], "node-variante-teste");
  assert.ok(promovida.analises[0].nos["node-variante-teste"]);
});

test("painel mantém toda linha principal vertical e recua só a variante", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const analise = aula.analises[0];
  const raiz = analise.raizId;
  const comVariante = executarComando(aula, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: raiz, uci: "c6b6", novoNodeId: "node-variante-teste" }, positions);
  const prolongada = executarComando(comVariante, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: "node-variante-teste", uci: "e7d7", novoNodeId: "node-variante-resposta" }, positions);
  const entradas = entradasVerticais(prolongada.analises[0]);
  assert.ok(entradas.filter((e) => e.nivel === 0).length >= 11);
  assert.deepEqual(entradas.filter((e) => e.nodeId.startsWith("node-variante")).map((e) => e.nivel), [1, 1]);
});

test("o contrato detecta ciclo entre posições iniciais de análises", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  aula.analises.push(
    { id: "analise-b", inicio: { tipo: "referencia", origem: { analiseId: "analise-c", nodeId: "raiz-c" } }, raizId: "raiz-b", nos: { "raiz-b": { id: "raiz-b", filhos: [] } } },
    { id: "analise-c", inicio: { tipo: "referencia", origem: { analiseId: "analise-b", nodeId: "raiz-b" } }, raizId: "raiz-c", nos: { "raiz-c": { id: "raiz-c", filhos: [] } } },
  );
  assert.ok(problemasDaAulaV2(aula).some((p) => p.codigo === "CICLO_ENTRE_ANALISES"));
});

test("treino personalizado aceita respostas autorais e conserva a origem editorial", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const analise = aula.analises[0];
  const primeiroLance = analise.nos[analise.raizId].filhos[0];
  aula.treinos.push({
    id: "treino-personalizado-teste",
    titulo: "Converter sem soltar a oposição",
    perfil: "linha-autoral",
    inicio: { analiseId: analise.id, nodeId: analise.raizId },
    ladoAluno: "white",
    objetivo: "Promover o peão sem permitir a captura.",
    questoes: [{
      id: "questao-personalizada-teste",
      posicao: { analiseId: analise.id, nodeId: analise.raizId },
      dica: "Mantenha a oposição.",
      respostas: [
        { id: "resposta-correta-teste", moves: [analise.nos[primeiroLance].uci!], julgamento: "correta", feedback: "Mantém o rei à frente do peão.", efeito: { tipo: "encerra", condicao: "tablebase-win" } },
        { id: "resposta-erro-teste", moves: ["c6b6"], julgamento: "erro", feedback: "Esse desvio abandona a linha ensinada.", efeito: { tipo: "repete" } },
      ],
    }],
    defensor: { politica: "autoral" },
    termino: { tipo: "limite", maxPlies: 8 },
    propriedade: "personalizado",
    fonte: "atual",
    origem: { analiseId: analise.id, nodeIds: [analise.raizId, primeiroLance], hash: "hash-teste", derivadorVersao: 1 },
    obrigatorio: true,
    revisaoAvaliacao: "pendente",
    explicacaoConclusao: "A promoção ficou garantida.",
  });
  aula.fluxo.push({ id: "etapa-treino-personalizado-teste", tipo: "treino", entidadeId: "treino-personalizado-teste" });
  assert.deepEqual(validarAulaV2(aula), { ok: true, aula });
});

test("contrato recusa treino derivado sem receita e limite sem número de lances", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const analise = aula.analises[0];
  const invalida = validarAulaV2({
    ...aula,
    treinos: [{
      id: "treino-invalido-teste",
      titulo: "Treino incompleto",
      perfil: "final-certificado",
      inicio: { analiseId: analise.id, nodeId: analise.raizId },
      ladoAluno: "white",
      objetivo: "Converter.",
      questoes: [{ id: "questao-invalida-teste", posicao: { analiseId: analise.id, nodeId: analise.raizId }, respostas: [{ id: "resposta-invalida-teste", moves: ["c6b6"], julgamento: "correta", feedback: "Teste.", efeito: { tipo: "encerra", condicao: "tablebase-win" } }] }],
      defensor: { politica: "deterministica" },
      termino: { tipo: "limite" },
      propriedade: "derivado",
      fonte: "atual",
      obrigatorio: true,
      revisaoAvaliacao: "pendente",
    }],
  });
  assert.equal(invalida.ok, false);
  if (!invalida.ok) {
    assert.ok(invalida.problemas.some((problema) => problema.includes("receita de origem")));
    assert.ok(invalida.problemas.some((problema) => problema.includes("maxPlies")));
  }
});

test("validação semântica acusa início de treino e prática ausentes", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const analise = aula.analises[0];
  aula.treinos.push({
    id: "treino-referencia-quebrada",
    titulo: "Referência quebrada",
    perfil: "linha-autoral",
    inicio: { analiseId: analise.id, nodeId: "node-ausente" },
    ladoAluno: "white",
    objetivo: "Testar referências.",
    questoes: [{ id: "questao-referencia-quebrada", posicao: { analiseId: analise.id, nodeId: "node-ausente" }, respostas: [{ id: "resposta-referencia-quebrada", moves: ["c6b6"], julgamento: "correta", feedback: "Teste.", efeito: { tipo: "encerra", condicao: "tablebase-win" } }] }],
    defensor: { politica: "autoral" },
    termino: { tipo: "objetivo" },
    propriedade: "independente",
    fonte: "atual",
    obrigatorio: true,
    revisaoAvaliacao: "pendente",
  });
  aula.fluxo.push({ id: "etapa-pratica-ausente", tipo: "pratica", entidadeId: "pratica-ausente" });
  const codigos = problemasDaAulaV2(aula).map((problema) => problema.codigo);
  assert.ok(codigos.includes("TREINO_SEM_INICIO"));
  assert.ok(codigos.includes("FLUXO_SEM_PRATICA"));
});
