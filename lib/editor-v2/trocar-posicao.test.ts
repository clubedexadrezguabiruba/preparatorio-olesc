/**
 * O que dá para provar sem montador na tela — §9 ("Trocar a posição inicial de
 * capítulo existente") e §5 do plano final.
 *
 * O arrasto da peça continua sendo teste humano. O que está aqui é a conta que
 * decide a aula: dada uma posição nova, **quais** ramos caem, a partir de onde,
 * o que sobra marcado, e o que a troca se recusa a fazer.
 *
 * ## A árvore sintética, e por que não a aula real
 *
 * A N1-KPK é uma linha só, sem variante e sem irmão — e a regra inteira desta
 * fatia é sobre irmãos. A árvore daqui tem três ramos que partem da raiz e um
 * quarto ramo mais fundo, escolhidos para que o ramo cortado e o ramo salvo
 * sejam **vizinhos**: se a poda contaminasse o irmão, estes testes ficariam
 * vermelhos. A aula real entra nos testes de bloqueio e de proveniência, onde o
 * que importa é o treino e a posição revisada de verdade.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2, type AulaV2 } from "./modelo.ts";
import { calcularTrocaDePosicao, aplicarTrocaDePosicao, type PlanoDaTrocaV2 } from "./trocar-posicao.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const positionReal = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));

/** Rei e peão em e2 contra rei em e8. */
const FEN_ANTIGA = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
/** A mesma coisa com o peão uma casa à frente — e é só isso que muda. */
const FEN_NOVA = "4k3/8/8/8/8/4P3/8/4K3 w - - 0 1";

const positions: Record<string, Position> = {
  "pos-n1-kpk-dlv-1-3": positionReal,
  "pos-teste": { ...positionReal, id: "pos-teste", fen: FEN_ANTIGA },
};

const aulaReal = (): AulaV2 => adaptarLessonV1(lesson, positions);

/**
 * A árvore de ensaio.
 *
 * ```
 * raiz
 *  ├─ n1  e2e4   ← ilegal na posição nova (não há peão em e2)
 *  │   └─ n2  e8e7
 *  │       └─ n3  e4e5
 *  ├─ n4  e1f2   ← legal
 *  │   └─ n5  e8d7   ← legal
 *  │       ├─ n6  e2e4   ← ilegal na posição nova
 *  │       └─ n7  f2g3   ← legal, e irmão do que cai
 *  └─ n8  e1d2   ← legal
 * ```
 */
function aulaDeEnsaio(): AulaV2 {
  return {
    schemaVersion: 2,
    id: "EX-TROCA",
    titulo: "Ensaio da troca de posição",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    proveniencia: [{ positionId: "pos-teste", conteudoHash: "hash-de-teste", estado: "approved" }],
    excecoes: [],
    analises: [{
      id: "analise-ensaio",
      inicio: { tipo: "posicao", positionId: "pos-teste" },
      raizId: "no-raiz",
      nos: {
        "no-raiz": { id: "no-raiz", filhos: ["no-1", "no-4", "no-8"], comentario: "O peão está em e2." },
        "no-1": { id: "no-1", uci: "e2e4", filhos: ["no-2"], comentario: "O avanço duplo." },
        "no-2": { id: "no-2", uci: "e8e7", filhos: ["no-3"] },
        "no-3": { id: "no-3", uci: "e4e5", filhos: [] },
        "no-4": { id: "no-4", uci: "e1f2", filhos: ["no-5"], comentario: "O rei sai primeiro." },
        "no-5": { id: "no-5", uci: "e8d7", filhos: ["no-6", "no-7"], desenhos: { arrows: [["e8", "d7"]] } },
        "no-6": { id: "no-6", uci: "e2e4", filhos: [] },
        "no-7": { id: "no-7", uci: "f2g3", filhos: [] },
        "no-8": { id: "no-8", uci: "e1d2", filhos: [] },
      },
    }],
    introducoes: [{
      id: "introducao-ensaio",
      titulo: "Antes de começar",
      quadros: [{
        id: "quadro-1",
        texto: "Repare no peão.",
        posicao: { tipo: "referencia", origem: { analiseId: "analise-ensaio", nodeId: "no-raiz" } },
      }],
    }],
    capitulos: [
      {
        id: "capitulo-principal",
        titulo: "O rei na frente",
        analiseId: "analise-ensaio",
        inicioNodeId: "no-raiz",
        caminho: ["no-4", "no-5", "no-6"],
        orientacao: "white",
        narracoes: [
          { id: "narracao-raiz", nodeId: "no-raiz", texto: "Começamos aqui.", pausa: "temporizada" },
          { id: "narracao-4", nodeId: "no-4", texto: "O rei sai.", pausa: "temporizada" },
          { id: "narracao-2", nodeId: "no-2", texto: "As pretas respondem.", pausa: "temporizada" },
        ],
      },
      {
        id: "capitulo-variante",
        titulo: "A variante das pretas",
        analiseId: "analise-ensaio",
        inicioNodeId: "no-2",
        caminho: ["no-3"],
        orientacao: "black",
        narracoes: [],
      },
    ],
    treinos: [{
      id: "treino-ensaio",
      titulo: "Treino do rei",
      perfil: "linha-autoral",
      inicio: { analiseId: "analise-ensaio", nodeId: "no-4" },
      ladoAluno: "white",
      objetivo: "Levar o rei à frente do peão.",
      questoes: [{
        id: "questao-1",
        posicao: { analiseId: "analise-ensaio", nodeId: "no-4" },
        respostas: [{ id: "resposta-1", moves: ["e8d7"], julgamento: "correta", feedback: "Isso.", efeito: { tipo: "repete" } }],
      }],
      defensor: { politica: "deterministica" },
      termino: { tipo: "objetivo" },
      propriedade: "derivado",
      fonte: "atual",
      origem: { analiseId: "analise-ensaio", nodeIds: ["no-4", "no-5"], hash: "hash-da-receita", derivadorVersao: 1 },
      obrigatorio: true,
      revisaoAvaliacao: "confirmada",
      certificacao: { tipo: "tablebase", estado: "herdada-v1", positionId: "pos-teste", alvoHash: "hash-do-alvo" },
    }],
    praticas: [],
    fluxo: [
      { id: "etapa-introducao", tipo: "introducao", entidadeId: "introducao-ensaio" },
      { id: "etapa-principal", tipo: "capitulo", entidadeId: "capitulo-principal" },
      { id: "etapa-variante", tipo: "capitulo", entidadeId: "capitulo-variante" },
      { id: "etapa-treino", tipo: "treino", entidadeId: "treino-ensaio" },
    ],
  };
}

function calcular(aula: AulaV2, fen: string, analiseId = "analise-ensaio"): PlanoDaTrocaV2 {
  const calculo = calcularTrocaDePosicao(aula, { analiseId, fen }, positions);
  assert.equal(calculo.ok, true, calculo.ok ? "" : calculo.mensagem);
  if (!calculo.ok) throw new Error("inalcançável");
  return calculo.plano;
}

function trocar(aula: AulaV2, fen: string, analiseId = "analise-ensaio"): AulaV2 {
  const resultado = aplicarTrocaDePosicao(aula, calcular(aula, fen, analiseId));
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) throw new Error("inalcançável");
  return resultado.aula;
}

test("a posição impossível é recusada em português, antes de qualquer conta", () => {
  const casos: Array<[string, RegExp]> = [
    ["", /não há posição/],
    ["não é uma FEN", /seis campos/],
    ["8/8/8/8/8/8/8/8 w - - 0 1", /falta o rei branco/],
    ["4k3/8/8/8/8/8/8/4K3 w KQ - 0 1", /roque curto das brancas/],
  ];
  for (const [fen, esperado] of casos) {
    const calculo = calcularTrocaDePosicao(aulaDeEnsaio(), { analiseId: "analise-ensaio", fen }, positions);
    assert.equal(calculo.ok, false, fen);
    if (calculo.ok) continue;
    assert.equal(calculo.campo, "posicao", fen);
    assert.match(calculo.mensagem, esperado, fen);
  }
});

test("trocar uma posição por ela mesma não é uma edição, e é recusado", () => {
  const calculo = calcularTrocaDePosicao(aulaDeEnsaio(), { analiseId: "analise-ensaio", fen: FEN_ANTIGA }, positions);
  assert.equal(calculo.ok, false);
  if (calculo.ok) return;
  assert.match(calculo.mensagem, /já é a posição inicial/);
});

test("calcular não toca na aula: cancelar não tem o que desfazer", () => {
  const aula = aulaDeEnsaio();
  const antes = JSON.stringify(aula);
  calcularTrocaDePosicao(aula, { analiseId: "analise-ensaio", fen: FEN_NOVA }, positions);
  assert.equal(JSON.stringify(aula), antes);
});

test("o impacto mostra as duas FENs e nomeia cada ramo cortado pelo lance que o professor lê", () => {
  const { impacto } = calcular(aulaDeEnsaio(), FEN_NOVA);
  assert.equal(impacto.fenAnterior, FEN_ANTIGA);
  assert.equal(impacto.fenNova, FEN_NOVA);
  // Dois ramos cortados: o `1. e4` da raiz, com três nós, e o `2. e4` lá embaixo,
  // que é folha e leva um nó só.
  assert.deepEqual(
    impacto.podas.map((poda) => [poda.lance, poda.nosRemovidos]),
    [["1. e4", 3], ["2. e4", 1]],
  );
});

test("a poda começa no primeiro lance ilegal de cada ramo, e só dali", () => {
  const aula = trocar(aulaDeEnsaio(), FEN_NOVA);
  const nos = aula.analises[0].nos;
  // O ramo de `1. e4` cai inteiro: o lance ilegal é o primeiro dele.
  for (const id of ["no-1", "no-2", "no-3"]) assert.equal(nos[id], undefined, id);
  // O ramo do rei mantém os dois lances legais que vinham antes do ilegal.
  for (const id of ["no-4", "no-5"]) assert.notEqual(nos[id], undefined, id);
  assert.equal(nos["no-6"], undefined, "o lance ilegal, e só ele, sai");
});

test("o irmão legal do lance podado sobrevive", () => {
  const aula = trocar(aulaDeEnsaio(), FEN_NOVA);
  const nos = aula.analises[0].nos;
  assert.notEqual(nos["no-7"], undefined, "f2g3 continua legal e continua na árvore");
  assert.deepEqual(nos["no-5"].filhos, ["no-7"], "o pai perde só o filho que caiu");
  assert.notEqual(nos["no-8"], undefined, "o irmão do ramo inteiro que caiu também fica");
  assert.deepEqual(nos["no-raiz"].filhos, ["no-4", "no-8"]);
});

test("o documento continua válido depois da troca, e a árvore inteira é legal na posição nova", () => {
  const aula = trocar(aulaDeEnsaio(), FEN_NOVA);
  const resultado = validarAulaV2(aula, positions);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.problemas.join(" | "));
  assert.deepEqual(aula.analises[0].inicio, { tipo: "fen", fen: FEN_NOVA });
});

test("comentários e desenhos que sobrevivem ficam marcados para revisão; os podados somem com o nó", () => {
  const antes = aulaDeEnsaio();
  const { impacto } = calcular(antes, FEN_NOVA);
  // `no-1` tem comentário, mas é podado: não entra na lista de marcados.
  assert.deepEqual(impacto.nosMarcados.sort(), ["no-4", "no-5", "no-raiz"]);

  const aula = trocar(antes, FEN_NOVA);
  const nos = aula.analises[0].nos;
  assert.deepEqual(nos["no-raiz"].revisao, { motivo: "posicao-inicial-trocada" });
  assert.deepEqual(nos["no-5"].revisao, { motivo: "posicao-inicial-trocada" }, "o nó do desenho também");
  assert.equal(nos["no-7"].revisao, undefined, "nó sem texto nem desenho não ganha marca");
  // A marca aparece como **aviso** no painel de problemas, nunca como erro.
  const resultado = validarAulaV2(aula, positions);
  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  const revisoes = (resultado.avisos ?? []).filter((p) => p.codigo === "REVISAO_PENDENTE");
  assert.ok(revisoes.length >= 3, `esperava avisos de revisão, veio ${revisoes.length}`);
  assert.match(revisoes[0].mensagem, /posição inicial do capítulo mudou/);
});

test("a narração do lance podado é removida; as que ficam são marcadas", () => {
  const antes = aulaDeEnsaio();
  const { impacto } = calcular(antes, FEN_NOVA);
  assert.deepEqual(impacto.narracoesRemovidas.map((n) => n.narracaoId), ["narracao-2"]);
  assert.deepEqual(impacto.narracoesMarcadas.map((n) => n.narracaoId), ["narracao-raiz", "narracao-4"]);
  assert.equal(impacto.narracoesRemovidas[0].capitulo, "O rei na frente", "o impacto diz o nome, não o id");

  const capitulo = trocar(antes, FEN_NOVA).capitulos[0];
  assert.deepEqual(capitulo.narracoes.map((n) => n.id), ["narracao-raiz", "narracao-4"]);
  assert.ok(capitulo.narracoes.every((n) => n.revisao?.motivo === "posicao-inicial-trocada"));
});

test("o percurso do capítulo é cortado no lance podado, e o início podado volta à raiz", () => {
  const antes = aulaDeEnsaio();
  const { impacto } = calcular(antes, FEN_NOVA);
  assert.deepEqual(impacto.capitulosAfetados, [
    { id: "capitulo-principal", titulo: "O rei na frente", inicioReiniciado: false, percursoCortado: true },
    { id: "capitulo-variante", titulo: "A variante das pretas", inicioReiniciado: true, percursoCortado: true },
  ]);

  const aula = trocar(antes, FEN_NOVA);
  assert.deepEqual(aula.capitulos[0].caminho, ["no-4", "no-5"], "perde só o fim");
  assert.equal(aula.capitulos[1].inicioNodeId, "no-raiz");
  assert.deepEqual(aula.capitulos[1].caminho, []);
});

test("o treino afetado tem a avaliação reaberta, a fonte marcada como alterada e a certificação pendente", () => {
  const antes = aulaDeEnsaio();
  const { impacto } = calcular(antes, FEN_NOVA);
  assert.deepEqual(impacto.treinosAfetados, [
    { id: "treino-ensaio", titulo: "Treino do rei", certificacaoReaberta: true, fonteAlterada: true },
  ]);

  const treino = trocar(antes, FEN_NOVA).treinos[0];
  assert.equal(treino.revisaoAvaliacao, "pendente");
  assert.equal(treino.fonte, "alterada");
  assert.equal(treino.certificacao?.estado, "pendente");
  // §8: personalizado e fonte alterada são condições distintas. A propriedade
  // não muda por causa da troca — só um ajuste autoral a mudaria.
  assert.equal(treino.propriedade, "derivado");
});

test("a proveniência da posição que a análise larga é reaberta", () => {
  const antes = aulaDeEnsaio();
  const { impacto } = calcular(antes, FEN_NOVA);
  assert.equal(impacto.provenienciaReaberta, "pos-teste");
  assert.equal(impacto.provenienciaMantida, null);
  assert.deepEqual(trocar(antes, FEN_NOVA).proveniencia, [
    { positionId: "pos-teste", conteudoHash: "hash-de-teste", estado: "candidate" },
  ]);
});

test("a proveniência fica de pé quando outra parte da aula continua usando a posição", () => {
  const antes = aulaDeEnsaio();
  antes.praticas = [{
    id: "pratica-ensaio",
    titulo: "Jogar contra o motor",
    positionId: "pos-teste",
    ladoAluno: "white",
    objetivo: "win",
    engine: { skill: 3, moveTimeMs: 200 },
  }];
  antes.fluxo.push({ id: "etapa-pratica", tipo: "pratica", entidadeId: "pratica-ensaio" });

  const { impacto } = calcular(antes, FEN_NOVA);
  assert.equal(impacto.provenienciaReaberta, null);
  assert.equal(impacto.provenienciaMantida, "pos-teste");
  assert.equal(trocar(antes, FEN_NOVA).proveniencia[0].estado, "approved");
});

test("o quadro da introdução que continua de pé é marcado para revisão", () => {
  const antes = aulaDeEnsaio();
  const { impacto } = calcular(antes, FEN_NOVA);
  assert.deepEqual(impacto.quadrosMarcados.map((q) => q.quadroId), ["quadro-1"]);
  assert.deepEqual(
    trocar(antes, FEN_NOVA).introducoes[0].quadros[0].revisao,
    { motivo: "posicao-inicial-trocada" },
  );
});

test("a troca para quando alguém de fora depende do que ia ser podado, e diz o nome", () => {
  const aula = aulaDeEnsaio();
  // O treino passa a apontar para um lance do ramo que a posição nova mata.
  aula.treinos[0].inicio = { analiseId: "analise-ensaio", nodeId: "no-1" };
  aula.treinos[0].questoes[0].posicao = { analiseId: "analise-ensaio", nodeId: "no-1" };
  aula.treinos[0].origem = { analiseId: "analise-ensaio", nodeIds: ["no-1"], hash: "h", derivadorVersao: 1 };

  const { impacto } = calcular(aula, FEN_NOVA);
  // Três nós caem, e o treino aponta para o mesmo `no-1` por três caminhos —
  // início, questão e receita. A contagem é de lances perdidos, não de apontares:
  // dizer "3" aqui seria coincidência, e "9" seria mentira.
  assert.deepEqual(impacto.bloqueios, [
    { tipo: "treino", nome: "Treino do rei", motivo: "usa um lance que a posição nova torna ilegal" },
  ]);

  const antes = JSON.stringify(aula);
  const resultado = aplicarTrocaDePosicao(aula, calcular(aula, FEN_NOVA));
  assert.equal(resultado.ok, false);
  if (resultado.ok) return;
  assert.match(resultado.mensagem, /Treino do rei/);
  assert.match(resultado.mensagem, /Nada foi mudado/);
  assert.equal(JSON.stringify(aula), antes);
});

test("o quadro de introdução que aponta para um lance podado também bloqueia", () => {
  const aula = aulaDeEnsaio();
  aula.introducoes[0].quadros[0].posicao = { tipo: "referencia", origem: { analiseId: "analise-ensaio", nodeId: "no-2" } };
  const { impacto } = calcular(aula, FEN_NOVA);
  assert.deepEqual(impacto.bloqueios.map((b) => [b.tipo, b.nome]), [["introducao", "Antes de começar"]]);
});

test("uma análise que começa dentro desta bloqueia, porque mudaria de tabuleiro junto", () => {
  const aula = aulaDeEnsaio();
  aula.analises.push({
    id: "analise-derivada",
    inicio: { tipo: "referencia", origem: { analiseId: "analise-ensaio", nodeId: "no-4" } },
    raizId: "no-derivada-0",
    nos: { "no-derivada-0": { id: "no-derivada-0", filhos: [] } },
  });
  aula.capitulos.push({
    id: "capitulo-derivado",
    titulo: "Daqui em diante",
    analiseId: "analise-derivada",
    inicioNodeId: "no-derivada-0",
    caminho: [],
    orientacao: "white",
    narracoes: [],
  });
  aula.fluxo.push({ id: "etapa-derivado", tipo: "capitulo", entidadeId: "capitulo-derivado" });

  const { impacto } = calcular(aula, FEN_NOVA);
  assert.deepEqual(impacto.bloqueios.map((b) => [b.tipo, b.nome]), [["analise", "Daqui em diante"]]);
});

test("Desfazer devolve a aula inteira, e Refazer devolve os mesmos ids", () => {
  const aula = aulaDeEnsaio();
  const plano = calcular(aula, FEN_NOVA);
  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "TROCAR_POSICAO_INICIAL", plano }, positions));

  const depois = historico.presente;
  assert.equal(Object.keys(depois.analises[0].nos).length, 5);

  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula, "um Ctrl+Z devolve lances, narrações, treino e proveniência juntos");
  assert.deepEqual(Object.keys(historico.presente.analises[0].nos).sort(), ["no-1", "no-2", "no-3", "no-4", "no-5", "no-6", "no-7", "no-8", "no-raiz"]);

  historico = refazer(historico);
  assert.deepEqual(historico.presente, depois, "o Refazer repete o plano, e não um cálculo novo");
  assert.deepEqual(Object.keys(historico.presente.analises[0].nos).sort(), ["no-4", "no-5", "no-7", "no-8", "no-raiz"]);
});

test("a marca de revisão pode ser resolvida, e resolver também é desfazível", () => {
  const aula = trocar(aulaDeEnsaio(), FEN_NOVA);
  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, {
    tipo: "REVISAO_RESOLVIDA",
    alvo: { analiseId: "analise-ensaio", nodeId: "no-raiz" },
  }, positions));
  assert.equal(historico.presente.analises[0].nos["no-raiz"].revisao, undefined);
  assert.equal(historico.presente.analises[0].nos["no-5"].revisao?.motivo, "posicao-inicial-trocada", "só o alvo");

  historico = aplicarNoHistorico(historico, executarComando(historico.presente, {
    tipo: "REVISAO_RESOLVIDA",
    alvo: { capituloId: "capitulo-principal", narracaoId: "narracao-4" },
  }, positions));
  assert.equal(historico.presente.capitulos[0].narracoes[1].revisao, undefined);

  assert.deepEqual(desfazer(desfazer(historico)).presente, aula);
});

test("na aula real, mover o rei preto mata a linha inteira — e o treino que a usa impede a troca", () => {
  const aula = aulaReal();
  // O rei preto sai de e7: `1…Ke6` deixa de existir, e com ele tudo o que vinha depois.
  const calculo = calcularTrocaDePosicao(aula, { analiseId: "analise-n1-kpk-objetivo", fen: "4k3/8/2K5/8/8/8/1P6/8 w - - 0 1" }, positions);
  assert.equal(calculo.ok, true);
  if (!calculo.ok) return;
  const { impacto } = calculo.plano;
  assert.equal(impacto.podas.length, 1, "um ramo só, porque a aula real é uma linha só");
  assert.match(impacto.podas[0].lance, /Ke6/);
  assert.equal(impacto.podas[0].nosRemovidos, 10);
  assert.equal(impacto.bloqueios.length, 1);
  assert.equal(impacto.bloqueios[0].tipo, "treino");
  assert.equal(aplicarTrocaDePosicao(aula, calculo.plano).ok, false);
});
