import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { prepararEdicaoDeTreino } from "./autoria-treino.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { validarAulaV2 } from "./modelo.ts";
import {
  aplicarRefazerTreino,
  comCopiaMaterializada,
  comEstadosDasFontes,
  fenDaQuestaoDoTreino,
  hashAtualDaFonte,
  prepararRefazerTreino,
  tornarTreinoIndependente,
} from "./propriedade-treino.ts";
import { guardarSnapshotAntesDeRefazerV2 } from "./rascunhos.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";
import { treinoJogavel } from "./treino-jogavel.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

function aulaComTreino() {
  const aula = adaptarLessonV1(lesson, positions);
  const capitulo = aula.capitulos[0];
  const resultado = prepararTreinosDaqui(aula, {
    capituloId: capitulo.id,
    nodeId: capitulo.inicioNodeId,
    titulo: "Treino 6D",
    objetivo: "Feche as fileiras até o mate.",
    lado: "white",
    colocacao: "depois-do-capitulo",
    obrigatorio: true,
  }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  const aplicada = aplicarTreinosPreparados(aula, resultado.preparo);
  assert.equal(aplicada.treinos.at(-1)!.origem!.hash, hashAtualDaFonte(aplicada, aplicada.treinos.at(-1)!));
  return { aula: aplicada, treino: aplicada.treinos.at(-1)! };
}

test("§16.5: o primeiro ajuste pedagógico materializa posição, histórico e autoria", () => {
  const { aula, treino } = aulaComTreino();
  const pedido = structuredClone(treino);
  pedido.questoes[0].respostas[0].feedback = "Texto próprio do professor.";
  const resultado = prepararEdicaoDeTreino(aula, { treino: pedido, catalogo: aula.catalogo }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  const salvo = resultado.edicao.treino;
  assert.equal(salvo.propriedade, "personalizado");
  assert.ok(salvo.copia?.inicio.fen);
  assert.ok(salvo.copia?.questoes[salvo.questoes[0].id].fen);
  assert.ok(Array.isArray(salvo.copia?.questoes[salvo.questoes[0].id].historicoUci));
  assert.equal(validarAulaV2(executarComando(aula, { tipo: "EDITAR_TREINO", edicao: resultado.edicao }, positions), positions).ok, true);
});

test("§16.5: mudar só o título conserva a derivação e não cria cópia", () => {
  const { aula, treino } = aulaComTreino();
  const pedido = structuredClone(treino);
  pedido.titulo = "Outro nome";
  const resultado = prepararEdicaoDeTreino(aula, { treino: pedido, catalogo: aula.catalogo }, positions);
  if (!resultado.ok) assert.fail(resultado.mensagem);
  assert.equal(resultado.edicao.treino.propriedade, "derivado");
  assert.equal(resultado.edicao.treino.copia, undefined);
  assert.equal(resultado.edicao.treino.titulo, "Outro nome");
});

test("§16.5: resposta, posição, objetivo, dica e feedback são os cinco gatilhos da cópia", () => {
  const casos: Array<[string, (treino: ReturnType<typeof aulaComTreino>["treino"]) => void]> = [
    ["resposta", (treino) => { treino.questoes[0].respostas[0].julgamento = "alternativa"; }],
    ["posição", (treino) => { treino.inicio = { ...treino.questoes[1].posicao }; }],
    ["objetivo", (treino) => { treino.objetivo = "Outro objetivo autoral."; }],
    ["dica", (treino) => { treino.questoes[0].dica = "Olhe a fileira aberta."; }],
    ["feedback", (treino) => { treino.questoes[0].respostas[0].feedback = "Outra explicação."; }],
  ];
  for (const [nome, mudar] of casos) {
    const { aula, treino } = aulaComTreino();
    const pedido = structuredClone(treino);
    mudar(pedido);
    const resultado = prepararEdicaoDeTreino(aula, { treino: pedido, catalogo: aula.catalogo }, positions);
    assert.equal(resultado.ok, true, nome);
    if (resultado.ok) {
      assert.equal(resultado.edicao.treino.propriedade, "personalizado", nome);
      assert.ok(resultado.edicao.treino.copia, nome);
    }
  }
});

test("§16.5: fonte irrelevante fica atual; comentário usado fica alterado; nó ausente fica removido", () => {
  const { aula, treino } = aulaComTreino();
  const irrelevante = structuredClone(aula);
  irrelevante.titulo = "Título da aula não entra na receita";
  assert.equal(comEstadosDasFontes(aula, irrelevante).treinos.at(-1)!.fonte, "atual");

  const alterada = structuredClone(aula);
  const analise = alterada.analises.find((item) => item.id === treino.origem!.analiseId)!;
  const nodeId = treino.origem!.nodeIds.find((id) => analise.nos[id].uci)!;
  analise.nos[nodeId].comentario = "A fonte agora explica de outro jeito.";
  assert.equal(comEstadosDasFontes(aula, alterada).treinos.at(-1)!.fonte, "alterada");

  const removida = structuredClone(aula);
  delete removida.analises.find((item) => item.id === treino.origem!.analiseId)!.nos[nodeId];
  assert.equal(comEstadosDasFontes(aula, removida).treinos.at(-1)!.fonte, "removida");
});

test("§16.5: personalizado joga pela cópia mesmo depois de a fonte desaparecer", () => {
  const { aula, treino } = aulaComTreino();
  const pedido = structuredClone(treino);
  pedido.questoes[0].dica = "Use a torre de trás.";
  const edicao = prepararEdicaoDeTreino(aula, { treino: pedido, catalogo: aula.catalogo }, positions);
  if (!edicao.ok) assert.fail(edicao.mensagem);
  const personalizada = executarComando(aula, { tipo: "EDITAR_TREINO", edicao: edicao.edicao }, positions);
  const semFonte = structuredClone(personalizada);
  semFonte.analises = [];
  semFonte.capitulos = [];
  semFonte.fluxo = semFonte.fluxo.filter((etapa) => etapa.tipo === "treino");
  const marcada = comEstadosDasFontes(personalizada, semFonte);
  assert.equal(marcada.treinos.at(-1)!.fonte, "removida");
  assert.ok(treinoJogavel(marcada, treino.id, positions).tree.root);
});

test("§16.5: a máquina só muda o estado da fonte e nunca reescreve autoria personalizada", () => {
  const { aula, treino } = aulaComTreino();
  const pedido = structuredClone(treino);
  pedido.questoes[0].respostas[0].feedback = "Minha explicação fica.";
  const edicao = prepararEdicaoDeTreino(aula, { treino: pedido, catalogo: aula.catalogo }, positions);
  if (!edicao.ok) assert.fail(edicao.mensagem);
  const personalizada = executarComando(aula, { tipo: "EDITAR_TREINO", edicao: edicao.edicao }, positions);
  const noId = treino.origem!.nodeIds.find((id) => personalizada.analises[0].nos[id].uci)!;
  const fonteAlterada = executarComando(personalizada, {
    tipo: "EDITAR_COMENTARIO",
    analiseId: treino.origem!.analiseId,
    nodeId: noId,
    comentario: "A aula mudou.",
  }, positions);
  const depois = fonteAlterada.treinos.at(-1)!;
  assert.equal(depois.fonte, "alterada");
  assert.equal(depois.questoes[0].respostas[0].feedback, "Minha explicação fica.");
  assert.deepEqual(depois.copia, personalizada.treinos.at(-1)!.copia);
});

test("§16.5: tornar independente conserva a origem histórica e encerra a dependência operacional", () => {
  const { aula, treino } = aulaComTreino();
  const depois = tornarTreinoIndependente(aula, treino.id, positions);
  const independente = depois.treinos.at(-1)!;
  assert.equal(independente.propriedade, "independente");
  assert.equal(independente.origem?.analiseId, treino.origem?.analiseId);
  assert.ok(independente.copia);
  const semFonte = structuredClone(depois);
  semFonte.analises = [];
  semFonte.capitulos = [];
  assert.equal(comEstadosDasFontes(depois, semFonte).treinos.at(-1)!.fonte, "removida");
});

test("§16.5: refazer mostra textos das defesas, preserva IDs pelo ponto de origem e é um Desfazer", () => {
  const { aula, treino } = aulaComTreino();
  const pedido = structuredClone(treino);
  const resposta = pedido.questoes[0].respostas[0];
  resposta.feedback = "Feedback próprio.";
  if (resposta.efeito.tipo === "avanca") resposta.efeito.defesas[0].texto = "Texto próprio da defesa.";
  const edicao = prepararEdicaoDeTreino(aula, { treino: pedido, catalogo: aula.catalogo }, positions);
  if (!edicao.ok) assert.fail(edicao.mensagem);
  const personalizada = executarComando(aula, { tipo: "EDITAR_TREINO", edicao: edicao.edicao }, positions);
  const idsAntes = personalizada.treinos.at(-1)!.questoes.map((questao) => questao.id);
  const preparo = prepararRefazerTreino(personalizada, treino.id, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  assert.ok(preparo.plano.diferencas.some((item) => item.campo === "Textos próprios das defesas"));
  assert.deepEqual(preparo.plano.depois.questoes.map((questao) => questao.id), idsAntes);
  assert.equal(preparo.plano.depois.propriedade, "derivado");
  assert.equal(preparo.plano.depois.fonte, "atual");

  let historico = iniciarHistorico(personalizada);
  historico = aplicarNoHistorico(historico, executarComando(personalizada, { tipo: "REFAZER_TREINO", plano: preparo.plano }, positions));
  assert.equal(historico.passados.length, 1);
  historico = desfazer(historico);
  assert.equal(historico.presente.treinos.at(-1)!.questoes[0].respostas[0].feedback, "Feedback próprio.");
  historico = refazer(historico);
  assert.equal(historico.presente.treinos.at(-1)!.propriedade, "derivado");
});

test("§16.5: comparação vencida não substitui uma edição posterior", () => {
  const { aula, treino } = aulaComTreino();
  const preparo = prepararRefazerTreino(aula, treino.id, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const mudou = structuredClone(aula);
  mudou.treinos.at(-1)!.titulo = "Mudou depois da comparação";
  assert.throws(() => aplicarRefazerTreino(mudou, preparo.plano), /mudou depois da comparação/);
});

test("§16.5: comparação vencida também percebe mudança posterior na aula", () => {
  const { aula, treino } = aulaComTreino();
  const preparo = prepararRefazerTreino(aula, treino.id, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const mudou = structuredClone(aula);
  const nodeId = treino.origem!.nodeIds.find((id) => mudou.analises[0].nos[id].uci)!;
  mudou.analises[0].nos[nodeId].comentario = "Mudou depois de abrir a comparação.";
  assert.throws(() => aplicarRefazerTreino(mudou, preparo.plano), /a aula mudou depois da comparação/);
});

test("§16.5: fonte removida impede refazer até escolher outra", () => {
  const { aula, treino } = aulaComTreino();
  const semFonte = structuredClone(aula);
  semFonte.analises = [];
  semFonte.capitulos = [];
  assert.match((prepararRefazerTreino(semFonte, treino.id, positions) as { mensagem: string }).mensagem, /escolha um capítulo novo/);
});

test("§16.5: fonte removida pode ser substituída por um capítulo novo", () => {
  const { aula, treino } = aulaComTreino();
  const substituta = structuredClone(aula.capitulos[0]);
  substituta.id = "capitulo-fonte-substituta";
  substituta.titulo = "Fonte substituta";
  const semOriginal = structuredClone(aula);
  semOriginal.capitulos = [substituta];
  const plano = prepararRefazerTreino(semOriginal, treino.id, positions, {
    capituloId: substituta.id,
    nodeId: substituta.inicioNodeId,
  });
  if (!plano.ok) assert.fail(plano.mensagem);
  assert.equal(plano.plano.depois.origem?.capituloId, substituta.id);
  assert.equal(plano.plano.depois.fonte, "atual");
});

test("§16.5: snapshot anterior é gravado inteiro e a retenção fica limitada", () => {
  const { aula, treino } = aulaComTreino();
  const raiz = mkdtempSync(path.join(tmpdir(), "editor-v2-6d-"));
  try {
    for (let i = 0; i < 22; i += 1) {
      const resultado = guardarSnapshotAntesDeRefazerV2(aula.id, aula, treino.id, raiz);
      assert.equal(resultado.ok, true);
    }
    const pasta = path.join(raiz, ".editor", "v2", "snapshots", aula.id);
    const arquivos = readdirSync(pasta);
    assert.equal(arquivos.length, 20);
    const snapshot = JSON.parse(readFileSync(path.join(pasta, arquivos.at(-1)!), "utf8"));
    assert.equal(snapshot.tipo, "antes-de-refazer-treino");
    assert.deepEqual(snapshot.aula, JSON.parse(JSON.stringify(aula)), "o snapshot conserva todos os bytes representáveis em JSON");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test("§16.5: a posição copiada é a autoridade depois que a análise muda", () => {
  const { aula, treino } = aulaComTreino();
  const independente = tornarTreinoIndependente(aula, treino.id, positions).treinos.at(-1)!;
  const fen = independente.copia!.questoes[independente.questoes[0].id].fen;
  const mudada = structuredClone(aula);
  mudada.analises = [];
  assert.equal(fenDaQuestaoDoTreino(mudada, independente, independente.questoes[0], positions), fen);
});

test("§16.5: trocar a origem de uma pergunta renova só a posição copiada correspondente", () => {
  const { aula, treino } = aulaComTreino();
  const independente = tornarTreinoIndependente(aula, treino.id, positions).treinos.at(-1)!;
  const alterado = structuredClone(independente);
  const anterior = alterado.copia!.questoes[alterado.questoes[0].id];
  alterado.questoes[0].posicao = { ...alterado.questoes[1].posicao };
  const renovado = comCopiaMaterializada(aula, alterado, positions);
  const nova = renovado.copia!.questoes[alterado.questoes[0].id];
  assert.notEqual(nova.fen, anterior.fen);
  assert.deepEqual(nova.origem, alterado.questoes[0].posicao);
  assert.strictEqual(
    renovado.copia!.questoes[alterado.questoes[1].id],
    alterado.copia!.questoes[alterado.questoes[1].id],
    "cópias sem mudança são preservadas",
  );
});
