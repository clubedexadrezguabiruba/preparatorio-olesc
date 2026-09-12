import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { chaveDoDefensor, escolherResposta } from "../lesson/defensor.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { isPraise, judgeMove, throwsWinAway } from "../lesson/tree.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { quadroDoNo } from "./arvore.ts";
import { aplicarEdicaoDeTreino, catalogoComErro, prepararEdicaoDeTreino } from "./autoria-treino.ts";
import { executarComando } from "./comandos.ts";
import type { AulaV2, TreinoV2 } from "./modelo.ts";
import { aplicarTreinosPreparados, prepararTreinosDaqui } from "./treinos.ts";
import { chaveDaDefesaFinal, FORA_DA_LINHA, treinoJogavel, type TreinoJogavel } from "./treino-jogavel.ts";

/**
 * §16.4 medido numa conta, e não na tela: o "aluno simulado" abaixo usa o **mesmo**
 * juiz (`judgeMove`) e a **mesma** escolha (`escolherResposta`) que o `TreeStage`. Não
 * é um segundo player: é a sequência de chamadas que a tela faz, sem a tela.
 */

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

/** A N0 real, com os dois treinos que "Criar treino daqui" faz na posição inicial. */
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

/**
 * Acrescenta uma segunda defesa à primeira resposta da primeira pergunta.
 *
 * A fuga nova é uma **variante da análise** (decisão B do Doug, 12/9): a pergunta que
 * vem depois dela aponta para essa variante, como toda pergunta aponta para uma posição.
 */
function comDuasDefesas(politica: TreinoV2["defensor"]["politica"]) {
  const { aula: base, brancas } = comTreinos();
  const treino = structuredClone(base.treinos.find((item) => item.id === brancas.id)!);
  const resposta = treino.questoes[0].respostas[0];
  if (resposta.efeito.tipo !== "avanca") assert.fail("a primeira resposta deveria avançar");
  const escrita = resposta.efeito.defesas[0];
  const seguinte = treino.questoes.find((questao) => questao.id === escrita.proximaQuestaoId)!;
  const analise = base.analises.find((item) => item.id === seguinte.posicao.analiseId)!;
  const depoisDoAluno = Object.values(analise.nos).find((no) => no.filhos.includes(seguinte.posicao.nodeId))!;

  const fenDepoisDoAluno = quadroDoNo(base, analise.id, depoisDoAluno.id, positions).fen;
  const fuga = new Chess(fenDepoisDoAluno).moves({ verbose: true })
    .map((lance) => `${lance.from}${lance.to}`)
    .filter((uci) => uci !== escrita.move)
    .sort()[0];
  const aula = executarComando(base, { tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: depoisDoAluno.id, uci: fuga, novoNodeId: "no-fuga-teste" }, positions);

  const fenDaFuga = quadroDoNo(aula, analise.id, "no-fuga-teste", positions).fen;
  const fecho = new Chess(fenDaFuga).moves({ verbose: true }).map((lance) => `${lance.from}${lance.to}`).sort()[0];
  treino.questoes.push({
    id: "questao-fuga-teste",
    posicao: { analiseId: analise.id, nodeId: "no-fuga-teste" },
    respostas: [{ id: "resposta-fuga-teste", moves: [fecho], julgamento: "correta", feedback: "Fechou por este lado.", efeito: { tipo: "encerra", condicao: "objetivo-autoral" } }],
  });
  resposta.efeito.defesas.push({ move: fuga, proximaQuestaoId: "questao-fuga-teste" });
  treino.explicacaoConclusao = "O rei fugiu, e as torres fecharam do mesmo jeito.";
  treino.defensor = { politica };

  const preparo = prepararEdicaoDeTreino(aula, { treino, ...(aula.catalogo ? { catalogo: aula.catalogo } : {}) }, positions);
  if (!preparo.ok) assert.fail(`a segunda defesa deveria ser válida: ${preparo.mensagem}`);
  return { aula: aplicarEdicaoDeTreino(aula, preparo.edicao), treinoId: treino.id, escrita: escrita.move, fuga };
}

type Partida = { defesas: string[]; fim: string | null };

/**
 * Joga o treino pela primeira resposta de cada pergunta, como o `TreeStage` faria.
 * `errarAntes` joga, antes de cada lance certo, um lance legal fora da linha: é o
 * aluno que erra e volta.
 */
function jogar(j: TreinoJogavel, tentativa: number, errarAntes = false): Partida {
  const defesas: string[] = [];
  let nodeId = j.tree.root;
  for (let passo = 0; passo < 60; passo += 1) {
    const no = j.tree.nodes[nodeId];
    if (errarAntes) {
      const aceitos = new Set(no.expects.flatMap((expect) => expect.moves));
      const fora = no.winningMoves.find((move) => !aceitos.has(move));
      if (fora) assert.notEqual(judgeMove(j.lesson, no, fora).kind, "method");
    }
    const lance = no.expects[0].moves[0];
    const veredito = judgeMove(j.lesson, no, lance);
    if (veredito.kind !== "method") assert.fail(`o lance escrito ${lance} foi recusado`);
    if (veredito.respostas.length === 0) {
      return { defesas, fim: j.defesasFinais[chaveDaDefesaFinal(nodeId, lance)] ?? null };
    }
    const escolhida = escolherResposta(veredito.respostas, chaveDoDefensor("guided", nodeId), tentativa);
    defesas.push(escolhida.reply);
    nodeId = escolhida.next;
  }
  assert.fail("o treino não terminou em 60 passos");
}

test("§16.4: a tradução não altera a aula e cada pergunta vira um nó na posição certa", () => {
  const { aula, brancas } = comTreinos();
  const antes = structuredClone(aula);
  const j = treinoJogavel(aula, brancas.id, positions);
  assert.deepEqual(aula, antes);
  assert.equal(Object.keys(j.tree.nodes).length, brancas.questoes.length);
  for (const questao of brancas.questoes) {
    assert.equal(j.tree.nodes[questao.id].fen, quadroDoNo(aula, questao.posicao.analiseId, questao.posicao.nodeId, positions).fen);
  }
  assert.equal(j.tree.root, brancas.questoes[0].id);
  assert.equal(j.fenInicial, j.tree.nodes[j.tree.root].fen);
  assert.equal(j.defesaInicial, undefined);
  assert.equal(j.orientacao, "white");
});

test("§16.4: dentro da tentativa a defesa é estável, mesmo quando o aluno erra e volta", () => {
  const { aula, treinoId } = comDuasDefesas("deterministica");
  const j = treinoJogavel(aula, treinoId, positions);
  for (let tentativa = 1; tentativa <= 6; tentativa += 1) {
    const limpa = jogar(j, tentativa);
    assert.deepEqual(jogar(j, tentativa), limpa, `a tentativa ${tentativa} jogou duas defesas diferentes`);
    assert.deepEqual(jogar(j, tentativa, true), limpa, `errar e voltar mudou a defesa na tentativa ${tentativa}`);
  }
});

test("§16.4: entre tentativas a defesa gira, sem repetir a anterior e sem sorteio", () => {
  const { aula, treinoId, escrita, fuga } = comDuasDefesas("deterministica");
  const j = treinoJogavel(aula, treinoId, positions);
  const vistas = [1, 2, 3, 4, 5, 6].map((tentativa) => jogar(j, tentativa).defesas[0]);
  for (let i = 1; i < vistas.length; i += 1) {
    assert.notEqual(vistas[i], vistas[i - 1], `as tentativas ${i} e ${i + 1} deram a mesma defesa`);
  }
  assert.deepEqual(new Set(vistas), new Set([escrita, fuga]));
  console.log(`  gira — tentativas 1 a 6: ${vistas.join(", ")}`);
});

test("§16.4: com a escolha fixa, o defensor joga sempre a primeira defesa", () => {
  const { aula, treinoId, escrita } = comDuasDefesas("fixa");
  const j = treinoJogavel(aula, treinoId, positions);
  const vistas = [1, 2, 3, 4, 5, 6].map((tentativa) => jogar(j, tentativa).defesas[0]);
  assert.deepEqual(vistas, Array(6).fill(escrita));
  console.log(`  fixa — tentativas 1 a 6: ${vistas.join(", ")}`);
});

test("§16.4: com o defensor começando, ele joga antes da pergunta; e fecha antes do fim", () => {
  const { aula, pretas } = comTreinos();
  const j = treinoJogavel(aula, pretas.id, positions);
  assert.equal(j.orientacao, "black");
  assert.equal(j.defesaInicial, "g2g4");
  // A pergunta não aparece na posição de partida: ela vem **depois** do lance do defensor.
  const partida = new Chess(j.fenInicial);
  assert.equal(partida.turn(), "w");
  partida.move({ from: "g2", to: "g4" });
  assert.equal(partida.fen(), j.tree.nodes[j.tree.root].fen);
  assert.equal(new Chess(j.tree.nodes[j.tree.root].fen).turn(), "b");

  const { fim } = jogar(j, 1);
  assert.equal(fim, "g4g1");
  const ultima = pretas.questoes.at(-1)!;
  const final = new Chess(j.tree.nodes[ultima.id].fen);
  const lance = ultima.respostas[0].moves[0];
  final.move({ from: lance.slice(0, 2), to: lance.slice(2, 4) });
  final.move({ from: "g4", to: "g1" });
  assert.ok(final.isCheckmate(), "a defesa final deveria dar mate");
});

test("§16.3 na prévia: lance fora da linha não é erro objetivo; erro e alternativa usam o texto da resposta", () => {
  const { aula: base, brancas } = comTreinos();
  const treino = structuredClone(base.treinos.find((item) => item.id === brancas.id)!);
  const questao = treino.questoes[0];
  const fen = quadroDoNo(base, questao.posicao.analiseId, questao.posicao.nodeId, positions).fen;
  const ocupados = new Set(questao.respostas.flatMap((resposta) => resposta.moves));
  const livres = new Chess(fen).moves({ verbose: true }).map((lance) => `${lance.from}${lance.to}`).filter((uci) => !ocupados.has(uci)).sort();
  const [perde, fora, repete, qualquer] = livres;

  const { catalogo, erroId } = catalogoComErro(base, base.catalogo, "Torre ao alcance", "O rei come a torre.", "perde-resultado");
  questao.respostas.push(
    { id: "resposta-erro-teste", moves: [perde], julgamento: "erro", erroId, feedback: "Aqui o rei preto come a torre.", efeito: { tipo: "repete" } },
    { id: "resposta-alternativa-teste", moves: [repete], julgamento: "alternativa", feedback: "Também serve, mas não é a escada.", efeito: { tipo: "repete" } },
  );
  const preparo = prepararEdicaoDeTreino(base, { treino, catalogo }, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const aula = aplicarEdicaoDeTreino(base, preparo.edicao);
  const j = treinoJogavel(aula, treino.id, positions);
  const no = j.tree.nodes[questao.id];

  const foraDaLinha = judgeMove(j.lesson, no, qualquer ?? fora);
  assert.equal(foraDaLinha.kind, "off-method");
  if (foraDaLinha.kind !== "off-method") return;
  assert.equal(foraDaLinha.text, FORA_DA_LINHA);
  assert.equal(throwsWinAway(foraDaLinha), false, "lance fora da linha autoral não pode encerrar a tentativa");

  const erro = judgeMove(j.lesson, no, perde);
  assert.equal(erro.kind, "named-error");
  if (erro.kind !== "named-error") return;
  assert.equal(erro.text, "Aqui o rei preto come a torre.");
  assert.equal(throwsWinAway(erro), true);

  const alternativa = judgeMove(j.lesson, no, repete);
  assert.ok(isPraise(alternativa));
  assert.equal(alternativa.kind === "author-alternative" ? alternativa.text : "", "Também serve, mas não é a escada.");
});

test("§16.4: desenho da pergunta com a cor da autoria e limite de meios-lances em lances do aluno", () => {
  const { aula: base, brancas } = comTreinos();
  const treino = structuredClone(base.treinos.find((item) => item.id === brancas.id)!);
  treino.questoes[0].desenhos = { arrows: [{ de: "g2", para: "g4", cor: "vermelho" }] };
  treino.termino = { tipo: "limite", maxPlies: 9 };
  const preparo = prepararEdicaoDeTreino(base, { treino, ...(base.catalogo ? { catalogo: base.catalogo } : {}) }, positions);
  if (!preparo.ok) assert.fail(preparo.mensagem);
  const j = treinoJogavel(aplicarEdicaoDeTreino(base, preparo.edicao), treino.id, positions);
  assert.deepEqual(j.desenhos[treino.questoes[0].id], { arrows: [{ de: "g2", para: "g4", cor: "vermelho" }] });
  assert.equal(j.moveLimit, 5, "9 meios-lances cabem em 5 lances do aluno");
});

test("§20.2: a prévia do treino não tem caminho até a gravação de progresso", () => {
  // Um teste de imports, e de propósito: "não grava" é a ausência de um caminho, e
  // um caminho em React começa por um import ou por uma prop de retorno.
  for (const arquivo of ["components/editor-v2/PreviaDoTreino.tsx", "components/lesson/TreeStage.tsx"]) {
    const texto = readFileSync(arquivo, "utf8");
    const imports = texto.split("\n").filter((linha) => linha.startsWith("import "));
    for (const proibido of [/gravar/i, /registrar/i, /acoes/i, /actions/i, /supabase/i, /LessonPlayer/]) {
      assert.ok(!imports.some((linha) => proibido.test(linha)), `${arquivo} importa algo que grava: ${proibido}`);
    }
  }
  const moldura = readFileSync("components/editor-v2/PreviaDoTreino.tsx", "utf8");
  assert.ok(!/onStageDone=|onFinish=/.test(moldura), "a moldura passa um retorno de fim de etapa");
});
