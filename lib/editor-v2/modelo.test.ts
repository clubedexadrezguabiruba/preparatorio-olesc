import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Chess } from "chess.js";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { mapaDaAnalise, quadroDoNo } from "./arvore.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { completarAulaV2Legada, problemasDaAulaV2, validarAulaV2, type AulaV2 } from "./modelo.ts";
import { entradasVerticais } from "./painel.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

function arquivosJson(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? arquivosJson(caminho) : caminho.endsWith(".json") ? [caminho] : [];
  });
}

test("a N1-KPK vira um capítulo explícito sem tocar no arquivo v1", () => {
  const antes = readFileSync("content/lessons/N1-KPK.json", "utf8");
  const aula = adaptarLessonV1(lesson, positions);
  assert.equal(aula.schemaVersion, 2);
  assert.deepEqual(aula.metadados, { orientacaoPadrao: "white", criterioDominio: "D1", classe: "D", estadoEditorial: "rascunho", estadoDaOrigem: "publicado", fonteDidatica: "de-la-villa-100" });
  assert.equal(aula.proveniencia.length, 1);
  assert.equal(aula.proveniencia[0].positionId, "pos-n1-kpk-dlv-1-3");
  assert.equal(aula.proveniencia[0].conteudoHash.length, 64);
  assert.equal(aula.catalogo?.erros.length, 3);
  assert.equal(aula.introducoes.length, 1);
  assert.equal(aula.introducoes[0].quadros.length, lesson.stages.intro?.passos.length);
  assert.deepEqual(aula.introducoes[0].quadros[0].posicao, { tipo: "referencia", origem: { analiseId: aula.analises[0].id, nodeId: aula.analises[0].raizId } });
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
  assert.equal(aula.treinos[0].certificacao?.estado, "herdada-v1");
  assert.deepEqual(aula.fluxo.map((etapa) => etapa.tipo), ["introducao", "capitulo", "treino", "pratica"]);
  assert.deepEqual(validarAulaV2(aula), { ok: true, aula });
  assert.equal(readFileSync("content/lessons/N1-KPK.json", "utf8"), antes);
});

test("todas as aulas v1 preservam etapas e bytes ao serem adaptadas", () => {
  const todasAsPosicoes = Object.fromEntries(arquivosJson("content/positions").map((arquivo) => {
    const posicao = positionSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
    return [posicao.id, posicao];
  }));
  for (const arquivo of arquivosJson("content/lessons")) {
    const antes = readFileSync(arquivo, "utf8");
    const aulaV1 = lessonSchema.parse(JSON.parse(antes));
    const aulaV2 = adaptarLessonV1(aulaV1, todasAsPosicoes);
    assert.equal(aulaV2.introducoes.length, aulaV1.stages.intro ? 1 : 0, aulaV1.id);
    aulaV1.stages.intro?.passos.forEach((passo, indice) => {
      const posicao = aulaV2.introducoes[0].quadros[indice].posicao;
      if (passo.fen) assert.deepEqual(posicao, { tipo: "fen", fen: passo.fen }, `${aulaV1.id} / intro ${indice + 1}`);
      else assert.equal(posicao.tipo, "referencia", `${aulaV1.id} / intro ${indice + 1}`);
    });
    assert.equal(aulaV2.treinos.length, aulaV1.stages.guided ? 1 : 0, aulaV1.id);
    assert.equal(aulaV2.praticas.length, aulaV1.stages.practice ? 1 : 0, aulaV1.id);
    // Com as posições em mãos o veredicto passa a incluir a legalidade de cada
    // lance. É a regressão que protege o conteúdo que já existe: nenhuma aula
    // publicada pode deixar de ser jogável por causa de uma mudança no v2.
    assert.deepEqual(validarAulaV2(aulaV2, todasAsPosicoes), { ok: true, aula: aulaV2 }, aulaV1.id);
    assert.equal(readFileSync(arquivo, "utf8"), antes, aulaV1.id);
  }
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
  delete antigo.metadados;
  delete antigo.proveniencia;
  delete antigo.excecoes;
  delete antigo.catalogo;
  delete antigo.introducoes;
  delete antigo.praticas;
  antigo.treinos = [];
  antigo.fluxo = (antigo.fluxo as AulaV2["fluxo"]).filter((etapa) => etapa.tipo === "capitulo");
  const resultado = validarAulaV2(antigo);
  assert.equal(resultado.ok, true);
  if (resultado.ok) {
    assert.deepEqual(resultado.aula.praticas, []);
    assert.equal(resultado.avisos?.[0].codigo, "METADADOS_LEGADOS");
  }
});

test("a compatibilidade de metadados vale para legado, não para aula v2 nova", () => {
  const nova = structuredClone(adaptarLessonV1(lesson, positions)) as AulaV2;
  delete nova.metadados;
  delete nova.origem;
  const resultado = validarAulaV2(nova);
  assert.equal(resultado.ok, false);
  if (!resultado.ok) assert.ok(resultado.diagnosticos.some((problema) => problema.codigo === "METADADOS_AUSENTES" && problema.severidade === "erro"));
});

test("completar piloto legado preserva a variante e acrescenta só o contrato ausente", () => {
  const referencia = adaptarLessonV1(lesson, positions);
  const raiz = referencia.analises[0].raizId;
  const comVariante = executarComando(referencia, { tipo: "ADICIONAR_LANCE", analiseId: referencia.analises[0].id, nodeId: raiz, uci: "c6b6", novoNodeId: "node-variante-preservada" }, positions);
  const cru = structuredClone(comVariante) as Record<string, unknown>;
  delete cru.metadados;
  delete cru.proveniencia;
  delete cru.excecoes;
  delete cru.catalogo;
  delete cru.introducoes;
  cru.treinos = [];
  cru.praticas = [];
  cru.fluxo = (cru.fluxo as AulaV2["fluxo"]).filter((etapa) => etapa.tipo === "capitulo");
  const legado = validarAulaV2(cru);
  assert.equal(legado.ok, true);
  if (!legado.ok) return;
  const completado = completarAulaV2Legada(legado.aula, referencia);
  assert.ok(completado.analises[0].nos["node-variante-preservada"]);
  assert.equal(completado.introducoes.length, 1);
  assert.equal(completado.treinos.length, 1);
  assert.equal(completado.praticas.length, 1);
  assert.deepEqual(completado.fluxo.map((etapa) => etapa.tipo), ["introducao", "capitulo", "treino", "pratica"]);
});

test("diagnóstico estruturado informa severidade e localização exata", () => {
  const aula = adaptarLessonV1(lesson, positions);
  aula.introducoes[0].quadros[0].posicao = { tipo: "referencia", origem: { analiseId: aula.analises[0].id, nodeId: "node-ausente" } };
  const problema = problemasDaAulaV2(aula).find((item) => item.codigo === "QUADRO_SEM_POSICAO");
  assert.deepEqual(problema, {
    codigo: "QUADRO_SEM_POSICAO",
    severidade: "erro",
    mensagem: "o quadro da introdução aponta para posição inexistente",
    localizacao: {
      aulaId: "N1-KPK",
      introducaoId: "introducao-n1-kpk",
      quadroId: "quadro-n1-kpk-introducao-1",
      analiseId: "analise-n1-kpk-objetivo",
      nodeId: "node-ausente",
    },
  });
  const schema = validarAulaV2({ ...aula, titulo: "" });
  assert.equal(schema.ok, false);
  if (!schema.ok) {
    assert.equal(schema.diagnosticos[0].codigo, "SCHEMA_V2");
    assert.equal(schema.diagnosticos[0].localizacao.campo, "titulo");
  }
});

test("manifesto e catálogo impedem dependências editoriais silenciosas", () => {
  const aula = adaptarLessonV1(lesson, positions);
  aula.proveniencia = [];
  aula.treinos[0].questoes[0].respostas.push({
    id: "resposta-com-erro-ausente",
    moves: ["c6b6"],
    julgamento: "erro",
    feedback: "Erro ainda não catalogado.",
    erroId: "erro-ausente",
    efeito: { tipo: "repete" },
  });
  const problemas = problemasDaAulaV2(aula);
  assert.ok(problemas.some((problema) => problema.codigo === "POSICAO_SEM_PROVENIENCIA" && problema.localizacao.analiseId === aula.analises[0].id));
  assert.ok(problemas.some((problema) => problema.codigo === "PRATICA_SEM_PROVENIENCIA" && problema.localizacao.praticaId === aula.praticas[0].id));
  assert.ok(problemas.some((problema) => problema.codigo === "CERTIFICACAO_SEM_PROVENIENCIA" && problema.localizacao.treinoId === aula.treinos[0].id));
  assert.ok(problemas.some((problema) => problema.codigo === "ERRO_NAO_CATALOGADO" && problema.localizacao.respostaId === "resposta-com-erro-ausente"));
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

test("posição parada, variante compartilhada e cópia independente não se confundem", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const analise = aula.analises[0];
  const raiz = analise.raizId;
  const comVariante = executarComando(aula, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: raiz, uci: "c6b6", novoNodeId: "node-variante-compartilhada" }, positions);
  comVariante.capitulos.push(
    { id: "capitulo-posicao-parada", titulo: "Observe antes de jogar", analiseId: analise.id, inicioNodeId: raiz, caminho: [], orientacao: "white", narracoes: [] },
    { id: "capitulo-variante-compartilhada", titulo: "Compare a alternativa", analiseId: analise.id, inicioNodeId: raiz, caminho: ["node-variante-compartilhada"], orientacao: "white", narracoes: [] },
  );
  comVariante.fluxo.push(
    { id: "etapa-posicao-parada", tipo: "capitulo", entidadeId: "capitulo-posicao-parada" },
    { id: "etapa-variante-compartilhada", tipo: "capitulo", entidadeId: "capitulo-variante-compartilhada" },
  );
  comVariante.analises.push({
    id: "analise-copia-independente",
    inicio: { tipo: "posicao", positionId: position.id },
    raizId: "raiz-copia-independente",
    nos: {
      "raiz-copia-independente": { id: "raiz-copia-independente", filhos: ["node-copia-independente"] },
      "node-copia-independente": { id: "node-copia-independente", uci: "c6c7", filhos: [] },
    },
  });
  comVariante.capitulos.push({ id: "capitulo-copia-independente", titulo: "Cópia sem dependência", analiseId: "analise-copia-independente", inicioNodeId: "raiz-copia-independente", caminho: ["node-copia-independente"], orientacao: "white", narracoes: [] });
  comVariante.fluxo.push({ id: "etapa-copia-independente", tipo: "capitulo", entidadeId: "capitulo-copia-independente" });
  const promovida = executarComando(comVariante, { tipo: "PROMOVER_VARIANTE", analiseId: analise.id, parentId: raiz, nodeId: "node-variante-compartilhada" }, positions);
  assert.deepEqual(promovida.capitulos.find((capitulo) => capitulo.id === "capitulo-variante-compartilhada")?.caminho, ["node-variante-compartilhada"]);
  assert.equal(promovida.analises.find((item) => item.id === "analise-copia-independente")?.inicio.tipo, "posicao");
  assert.equal(promovida.capitulos.find((capitulo) => capitulo.id === "capitulo-posicao-parada")?.caminho.length, 0);
  assert.equal(validarAulaV2(promovida).ok, true);
  assert.equal(validarAulaV2({ ...promovida, id: "EX-OPOSICAO" }).ok, true);
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
    assert.ok(invalida.problemas.some((problema) => problema.includes("estado da certificação")));
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
  assert.ok(codigos.includes("TREINO_FORA_DO_FLUXO"));
  assert.ok(codigos.includes("FLUXO_SEM_PRATICA"));
});

/* ------------------------------------------------------------------ *
 * O portão da legalidade — o lance é apontado, e não estoura
 * ------------------------------------------------------------------ */

/** Um lance legal na posição, em UCI, tirado do próprio tabuleiro. */
function lanceLegal(fen: string, pular = 0): string {
  const jogadas = new Chess(fen).moves({ verbose: true });
  const jogada = jogadas[pular];
  return `${jogada.from}${jogada.to}${jogada.promotion ?? ""}`;
}

test("o lance impossível é apontado no nó em vez de derrubar o painel", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  const primeiro = aula.capitulos[0].caminho[0];
  analise.nos[primeiro].uci = "a1a8";

  /*
   * Antes deste portão, a única reação era esta: uma exceção que apaga a tela
   * inteira e não diz qual lance consertar. E ela é pior do que o código sugere —
   * `arvore.ts` tem um `throw new Error("lance ilegal no nó …")` que NUNCA roda,
   * porque a chess.js 1.4 estoura dentro do próprio `move()` antes disso. O que
   * o professor receberia é o texto cru da biblioteca, em inglês.
   */
  assert.throws(() => quadroDoNo(aula, analise.id, primeiro, positions), /Invalid move/);

  const problema = problemasDaAulaV2(aula, positions).find((p) => p.codigo === "LANCE_ILEGAL");
  assert.ok(problema, "o lance impossível precisa virar diagnóstico");
  assert.equal(problema.severidade, "erro");
  assert.equal(problema.localizacao.analiseId, analise.id);
  assert.equal(problema.localizacao.nodeId, primeiro);
  assert.equal(problema.localizacao.campo, "uci");
  assert.match(problema.mensagem, /a1a8/);
  assert.equal(validarAulaV2(aula, positions).ok, false);
});

test("o ramo ilegal é podado sem levar os irmãos junto", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  const raiz = analise.nos[analise.raizId];
  const fenDaRaiz = quadroDoNo(aula, analise.id, analise.raizId, positions).fen;

  // Dois irmãos novos na raiz: um impossível, um legal com continuação legal.
  const legal = lanceLegal(fenDaRaiz);
  const depoisDoLegal = quadroDoNo({ ...aula }, analise.id, analise.raizId, positions).fen;
  const jogo = new Chess(depoisDoLegal);
  jogo.move({ from: legal.slice(0, 2), to: legal.slice(2, 4) });
  const legalSeguinte = lanceLegal(jogo.fen());

  analise.nos["ramo-impossivel"] = { id: "ramo-impossivel", uci: "a1a8", filhos: [] };
  analise.nos["ramo-bom"] = { id: "ramo-bom", uci: legal, filhos: ["ramo-bom-filho"] };
  analise.nos["ramo-bom-filho"] = { id: "ramo-bom-filho", uci: legalSeguinte, filhos: [] };
  raiz.filhos.push("ramo-impossivel", "ramo-bom");

  const problemas = problemasDaAulaV2(aula, positions);
  const ilegais = problemas.filter((p) => p.codigo === "LANCE_ILEGAL");
  assert.equal(ilegais.length, 1, "só o ramo impossível é acusado");
  assert.equal(ilegais[0].localizacao.nodeId, "ramo-impossivel");
  // O irmão legal e o filho dele continuam sendo julgados, e passam.
  assert.ok(!problemas.some((p) => p.localizacao.nodeId === "ramo-bom"));
  assert.ok(!problemas.some((p) => p.localizacao.nodeId === "ramo-bom-filho"));
});

test("o ramo podado não vira cascata de erros nos descendentes", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  const caminho = aula.capitulos[0].caminho;
  // Quebrar o primeiro lance torna impossíveis todos os lances abaixo dele.
  analise.nos[caminho[0]].uci = "a1a8";
  const ilegais = problemasDaAulaV2(aula, positions).filter((p) => p.codigo === "LANCE_ILEGAL");
  assert.equal(ilegais.length, 1, "um erro, e não um por lance restante do roteiro");
  assert.equal(ilegais[0].localizacao.nodeId, caminho[0]);
});

test("nó fora da raiz sem lance é acusado com localização", () => {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  const primeiro = aula.capitulos[0].caminho[0];
  delete analise.nos[primeiro].uci;
  const problema = problemasDaAulaV2(aula, positions).find((p) => p.codigo === "LANCE_AUSENTE");
  assert.ok(problema);
  assert.equal(problema.localizacao.nodeId, primeiro);
});

test("posição que não está no pacote é apontada, e não some em silêncio", () => {
  const aula = adaptarLessonV1(lesson, positions);
  const problema = problemasDaAulaV2(aula, {}).find((p) => p.codigo === "POSICAO_INEXISTENTE");
  assert.ok(problema);
  assert.equal(problema.localizacao.analiseId, aula.analises[0].id);
  assert.equal(problema.localizacao.campo, "inicio.positionId");
});

test("sem as posições o veredicto continua sendo exatamente o de antes", () => {
  // A garantia de que o portão é aditivo: quem só julga a forma do documento
  // (recuperação local, rascunho colado) não passa a receber erro novo.
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  aula.analises[0].nos[aula.capitulos[0].caminho[0]].uci = "a1a8";
  assert.deepEqual(problemasDaAulaV2(aula), []);
  assert.equal(validarAulaV2(aula).ok, true);
  assert.equal(validarAulaV2(aula, positions).ok, false);
});

test("árvore quebrada não é percorrida com tabuleiro", () => {
  // A forma vem primeiro: num grafo com ciclo o percurso não termina, e um
  // "lance ilegal" ali seria consequência do ciclo, não um erro do professor.
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  const fim = aula.capitulos[0].caminho.at(-1)!;
  analise.nos[fim].filhos.push(analise.raizId);
  const codigos = problemasDaAulaV2(aula, positions).map((p) => p.codigo);
  assert.ok(codigos.includes("CICLO_NA_ARVORE"));
  assert.ok(!codigos.includes("LANCE_ILEGAL"));
});

/* ------------------------------------------------------------------ *
 * O mapa da análise — uma passada só
 * ------------------------------------------------------------------ */

/** Uma linha longa e legal a partir da posição da aula, mais uma variante. */
function aulaComLinhaLonga(meiosLances: number) {
  const aula = structuredClone(adaptarLessonV1(lesson, positions));
  const analise = aula.analises[0];
  const fen = positions[(analise.inicio as { positionId: string }).positionId].fen;
  const jogo = new Chess(fen);
  const nos: Record<string, { id: string; uci?: string; filhos: string[] }> = {
    [analise.raizId]: { id: analise.raizId, filhos: [] },
  };
  let pai = analise.raizId;
  const caminho: string[] = [];
  for (let i = 0; i < meiosLances; i += 1) {
    // Escolhe sempre um lance que deixe a partida viva, para a linha não acabar cedo.
    const op = jogo.moves({ verbose: true }).find((m) => {
      jogo.move(m);
      const vivo = jogo.moves().length > 0;
      jogo.undo();
      return vivo;
    });
    if (!op) break;
    jogo.move(op);
    const id = `no-longo-${i}`;
    nos[id] = { id, uci: op.from + op.to + (op.promotion ?? ""), filhos: [] };
    nos[pai].filhos.push(id);
    pai = id;
    caminho.push(id);
  }
  analise.nos = nos as typeof analise.nos;
  aula.capitulos[0].inicioNodeId = analise.raizId;
  aula.capitulos[0].caminho = caminho;
  aula.capitulos[0].narracoes = [];
  return { aula, analise, caminho };
}

test("o mapa joga cada lance UMA vez, e não recalcula a partida por nó", () => {
  /*
   * O teste que guarda o conserto de 10/09/2026. Antes, a tela calculava cada nó
   * desde a raiz: com 120 meios-lances isso são ~7.200 jogadas, e o clique num lance
   * levava 1,1 s no navegador (medido em três pontos da partida). Contar as chamadas
   * é determinístico; cronometrar seria um teste que falha sozinho em máquina lenta.
   */
  const { aula, analise, caminho } = aulaComLinhaLonga(120);
  const quantosNos = Object.keys(analise.nos).length;

  const original = Chess.prototype.move;
  let jogadas = 0;
  Chess.prototype.move = function (...args: Parameters<typeof original>) {
    jogadas += 1;
    return original.apply(this, args);
  };
  let mapa;
  try {
    mapa = mapaDaAnalise(aula, analise.id, positions);
  } finally {
    Chess.prototype.move = original;
  }

  assert.equal(caminho.length, 120, "a linha de teste precisa ter 120 meios-lances");
  assert.equal(jogadas, quantosNos - 1, "um lance por nó, fora a raiz");
  assert.ok(jogadas < 200, `esperado ~${quantosNos}, e não o quadrado disso; foram ${jogadas}`);
  assert.equal(Object.keys(mapa.quadros).length, quantosNos, "todo nó ganha posição");
});

test("a numeração da linha longa chega certa ao lance 60", () => {
  const { aula, analise, caminho } = aulaComLinhaLonga(120);
  const mapa = mapaDaAnalise(aula, analise.id, positions);
  const inicial = positions[(analise.inicio as { positionId: string }).positionId].fen.split(" ");
  const primeiroPly = (Number(inicial[5]) - 1) * 2 + (inicial[1] === "b" ? 1 : 0);
  const ultimo = caminho[119];
  const ply = primeiroPly + 119;
  assert.equal(mapa.rotulos[ultimo], `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? "." : "…"}`);
  assert.equal(mapa.rotulos[analise.raizId], undefined, "a posição de partida não recebe número de lance");
});

test("o mapa devolve o mesmo que o cálculo nó a nó", () => {
  // A prova de que a troca preservou o resultado, e não só ficou mais rápida.
  const { aula, analise } = aulaComLinhaLonga(24);
  const mapa = mapaDaAnalise(aula, analise.id, positions);
  for (const id of Object.keys(analise.nos)) {
    assert.deepEqual(mapa.quadros[id], quadroDoNo(aula, analise.id, id, positions), id);
  }
});
