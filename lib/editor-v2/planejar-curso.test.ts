/**
 * O planejador do curso de abertura contra o estudo v1.5 — parada medível da F3 (16/9/2026):
 * problemas e limites vazios, planejar duas vezes dá o mesmo, B09 aceita 5.dxc5, D sem treino.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compilarRepertorio } from "../repertorio/compilar.ts";
import { problemasParaPublicarV2 } from "./conferencia.ts";
import { etapasDoAlunoV2 } from "./fluxo-do-aluno.ts";
import { problemasDeLimiteV2 } from "./limites.ts";
import { problemasDaAulaV2, validarAulaV2 } from "./modelo.ts";
import { planejarCursoDeAbertura, type CursoPlanejado } from "./planejar-curso.ts";
import { previaDaAula } from "./previa.ts";
import { treinoJogavel } from "./treino-jogavel.ts";

const OPCOES = { cor: "brancas", abertura: "francesa", nomeDaAbertura: "Francesa 3.Bd3", agora: new Date("2026-09-16T00:00:00Z") } as const;
const LICHESS = readFileSync("e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn", "utf8");
const LOCAL = readFileSync("e2e/fixtures/francesa-v15-pgn-local.pgn", "utf8");
const cursos: Array<[string, CursoPlanejado]> = [
  ["link do Lichess", planejarCursoDeAbertura(LICHESS, OPCOES)],
  ["PGN local", planejarCursoDeAbertura(LOCAL, OPCOES)],
];
const aula = (curso: CursoPlanejado, bloco: string) => curso.aulas.find((a) => a.bloco === bloco)!.aula;

for (const [caminho, curso] of cursos) {
  test(`${caminho}: 5 aulas AB-, válidas, sem problema de rascunho nem de limite`, () => {
    assert.deepEqual(curso.aulas.map((a) => a.aula.id), ["AB-BRANCAS-FRANCESA-A", "AB-BRANCAS-FRANCESA-B", "AB-BRANCAS-FRANCESA-C", "AB-BRANCAS-FRANCESA-D", "AB-BRANCAS-FRANCESA-EF"]);
    for (const { aula: a } of curso.aulas) {
      assert.ok(validarAulaV2(a).ok, a.id);
      assert.deepEqual(problemasDaAulaV2(a, {}).map((p) => `${p.codigo}: ${p.mensagem}`), [], a.id);
      assert.deepEqual(problemasDeLimiteV2(a), [], a.id);
      assert.equal(a.metadados?.classe, undefined, "aula de abertura não tem classe de finais");
      assert.equal(a.metadados?.orientacaoPadrao, "white", "a cor do curso, não o Orientation do export");
    }
  });

  test(`${caminho}: paradas, ramos e move trainer por aula`, () => {
    assert.deepEqual(curso.aulas.map((a) => a.paradas), [2, 8, 3, 0, 12]);
    // E+F: E20 tem 7 ramos e E21 um; a revisão F23 não tem ramo narrado.
    assert.deepEqual(curso.aulas.map((a) => a.ramos), [0, 5, 4, 0, 8]);
    assert.deepEqual(curso.aulas.map((a) => a.linhasDoTreinador), [2, 8, 9, 0, 19]);
    for (const { aula: a, paradas } of curso.aulas) assert.equal(a.treinos.filter((t) => t.papel === "parada").length, paradas, a.id);
  });

  test(`${caminho}: regra 18 — a partida modelo é só o capítulo`, () => {
    const d = aula(curso, "D");
    assert.deepEqual(d.fluxo.map((e) => e.tipo), ["capitulo"]);
    assert.deepEqual(d.treinos, []);
    assert.equal(d.treinadores, undefined);
  });

  test(`${caminho}: toda aula de bloco termina em treino guiado e move trainer`, () => {
    for (const bloco of ["A", "B", "C", "EF"]) {
      const tipos = aula(curso, bloco).fluxo.map((e) => e.tipo);
      assert.deepEqual(tipos.slice(-2), ["treino", "treinador"], bloco);
    }
    const ef = aula(curso, "EF");
    const indiceDaRevisao = ef.fluxo.findIndex((e) => e.tipo === "introducao");
    assert.ok(indiceDaRevisao > 0 && indiceDaRevisao === ef.fluxo.length - 3, "F23 vem antes do treino guiado");
  });

  test(`${caminho}: B05A — a parada pede 6.Be4; B09 aceita 5.dxc5 e 5.Nf3 como «também vale»`, () => {
    const b = aula(curso, "B");
    const b05a = b.treinos.find((t) => t.id.startsWith("treino-parada-b05a"))!;
    assert.equal(b05a.introducao, "Qual lance de bispo ataca a dama e fecha sua saída?");
    assert.deepEqual(b05a.questoes[0].respostas.map((r) => [r.julgamento, r.moves[0]]), [["correta", "d3e4"]]);
    const b09 = b.treinos.find((t) => t.id.startsWith("treino-parada-b09"))!;
    assert.deepEqual(b09.questoes[0].respostas.map((r) => [r.julgamento, r.moves[0]]), [["correta", "c2c3"], ["alternativa", "d4c5"], ["alternativa", "g1f3"]]);
    // O treino se joga: o juiz do aluno o monta sem lançar, e a alternativa aceita e repete.
    const jogavel = treinoJogavel(b, b09.id, {});
    assert.equal(jogavel.tree.nodes[b09.questoes[0].id].authorAlternatives?.length, 2);
  });

  test(`${caminho}: os marcadores nunca chegam crus ao aluno, e o ramo diz «Voltamos a…»`, () => {
    for (const { aula: a } of curso.aulas) {
      const previa = previaDaAula(a, {});
      for (const trecho of previa.trechos) for (const passo of trecho.passos) assert.doesNotMatch(passo.fala, /\[[A-Z ]{3,}\]/, `${a.id}: ${passo.fala}`);
    }
    const b = previaDaAula(aula(curso, "B"), {});
    assert.ok(b.trechos.some((t) => t.passos.some((p) => /^Voltamos /.test(p.fala))));
  });
}

test("pergunta de reflexão (sem lance nosso para jogar): fica na aula, pausa, e não é aviso (Doug, 17/9/2026)", () => {
  const curso = cursos[0][1];
  const codigos = curso.avisos.map((a) => `${a.codigo}${a.capitulo ? `@${a.capitulo}` : ""}`);
  // C13 pergunta antes do primeiro lance; B03 pergunta no 3.Bd3 e o capítulo acaba ali. As duas preparam o capítulo seguinte.
  for (const reflexao of ["@C13", "@B03"]) {
    assert.deepEqual(codigos.filter((c) => c.endsWith(reflexao) && /PERGUNTA|PARADA/.test(c)), [], reflexao);
  }
  // A pergunta com lance para jogar continua avisando quando está escrita no nosso lance (B05B, 17.Qxe6+).
  assert.ok(codigos.includes("PERGUNTA_NO_LANCE_NOSSO@B05B"));
  const falaDe = (bloco: string, trecho: string) =>
    aula(curso, bloco).capitulos.flatMap((c) => c.narracoes).find((n) => n.texto.includes(trecho));
  for (const [bloco, trecho] of [["C", "Qual das três respostas das Pretas apareceu?"], ["B", "Qual foi a escolha das Pretas?"]] as const) {
    const fala = falaDe(bloco, trecho);
    assert.ok(fala, `${bloco}: a pergunta de reflexão chega ao aluno`);
    assert.equal(fala.pausa, "manual", `${bloco}: a aula espera o aluno pensar`);
  }
});

test("as falas de um lance saem na ordem em que o professor as escreveu, com a pergunta no lugar dela (Doug, 17/9/2026)", () => {
  const b = aula(cursos[0][1], "B");
  const b03 = b.capitulos.find((c) => c.id === "cap-b03")!;
  assert.deepEqual(b03.narracoes.map((n) => n.rotulo), ["Pergunta", "Entender", "Resumo", "A seguir"]);
});

test("capítulo com ramos: Resumo e A seguir fecham o último ramo, não a linha principal (Doug, 17/9/2026)", () => {
  const b = aula(cursos[0][1], "B");
  // O Laboratório (B08) é uma etapa só, com os casos em ordem de número (Doug, 18/9/2026).
  const etapa = b.fluxo.find((e) => e.entidadeId === "cap-b08")!;
  assert.deepEqual(etapa.comparacoes, ["cap-b08-ramo-1", "cap-b08-ramo-2", "cap-b08-ramo-3", "cap-b08-ramo-4"]);
  const caso5 = b.capitulos.find((c) => c.id === "cap-b08-ramo-4")!;
  assert.deepEqual(caso5.narracoes.slice(-2).map((n) => n.rotulo), ["Resumo", "A seguir"]);
  assert.equal(caso5.narracoes.at(-1)!.nodeId, caso5.caminho.at(-1), "no último lance do caso");
  const principal = b.capitulos.find((c) => c.id === "cap-b08")!;
  assert.ok(!principal.narracoes.some((n) => n.rotulo === "Resumo" || n.rotulo === "A seguir"));
  // E na tela o Resumo é a última fala da etapa.
  const passos = previaDaAula(b, {}).trechos.find((t) => t.capituloId === "cap-b08")!.passos;
  assert.match(passos.filter((p) => p.fala).at(-2)!.fala, /Cinco padrões, cinco respostas/);
});

test("uma etapa por capítulo: a pergunta e os ramos ficam dentro dela (Doug, 18/9/2026)", () => {
  for (const { aula: a } of cursos[0][1].aulas) {
    // Nenhuma etapa aponta para parada nem para ramo, e todo capítulo que sobra é ramo tocado dentro.
    for (const e of a.fluxo) {
      assert.ok(!(e.tipo === "treino" && a.treinos.find((t) => t.id === e.entidadeId)?.papel === "parada"), `${a.id}: ${e.id}`);
      assert.doesNotMatch(e.entidadeId, /-ramo-/, `${a.id}: ${e.id}`);
    }
    const titulos = a.fluxo.map((e) => a.capitulos.find((c) => c.id === e.entidadeId)?.titulo ?? "");
    for (const titulo of titulos) assert.doesNotMatch(titulo, / — (depois de|se |resumo)/, `${a.id}: ${titulo}`);
    // Cada pergunta está numa etapa só, e o passo dela vem seguido do lance-resposta.
    const noFluxo = a.fluxo.flatMap((e) => e.paradas ?? []);
    assert.deepEqual([...noFluxo].sort(), a.treinos.filter((t) => t.papel === "parada").map((t) => t.id).sort(), a.id);
    for (const trecho of previaDaAula(a, {}).trechos) {
      trecho.passos.forEach((passo, i) => {
        if (!passo.parada) return;
        const treino = a.treinos.find((t) => t.id === passo.parada)!;
        const resposta = treino.questoes[0].respostas.find((r) => r.julgamento === "correta")!.moves[0];
        assert.equal(trecho.passos[i + 1]?.lance, resposta, `${a.id}: ${treino.id}`);
      });
    }
  }
});

test("a fita: a principal até o fim, e a volta cai exatamente na posição da escolha (Doug, 18/9/2026)", () => {
  for (const { aula: a } of cursos[0][1].aulas) {
    for (const trecho of previaDaAula(a, {}).trechos) {
      trecho.passos.forEach((passo, i) => {
        if (!passo.retorno) return;
        const antes = trecho.passos[i - 1];
        // O retorno vem logo depois do último recuo, parado no mesmo nó.
        if (antes?.recuo) assert.equal(antes.nodeId, passo.nodeId, `${a.id}: ${passo.fala}`);
        // E a linha seguinte sai dali: o próximo passo é um filho do ponto de escolha, e não ele de novo.
        const analise = a.analises.find((x) => x.nos[passo.nodeId])!;
        assert.ok(analise.nos[passo.nodeId].filhos.includes(trecho.passos[i + 1]?.nodeId ?? ""), `${a.id}: depois de «${passo.fala}»`);
      });
    }
  }
});

test("parada: a dica não aparece antes de o aluno tentar; o lance errado traz a dica (Doug, 17/9/2026)", () => {
  const b = aula(cursos[0][1], "B");
  const revisoes = Object.fromEntries(b.treinos.map((t) => [t.id, { tipo: "treino" as const, revisao: "ar_teste" }]));
  const etapas = etapasDoAlunoV2(b, {}, revisoes as never);
  const parada = etapas.flatMap((e) => (e.tipo === "capitulo" ? e.paradas ?? [] : [])).find((p) => p.entidadeId.startsWith("treino-parada-b05a"));
  assert.ok(parada);
  const dica = b.treinos.find((t) => t.id === parada.entidadeId)!.questoes[0].dica!;
  for (const node of Object.values(parada.jogavel.tree.nodes)) assert.equal(node.hint, undefined, "a dica não fica na tela de entrada");
  assert.equal(parada.jogavel.lesson.fallbacks.winningOffMethod, `Ainda não. Dica: ${dica}`);
  assert.equal(parada.jogavel.lesson.fallbacks.losesWin, `Ainda não. Dica: ${dica}`);
  const guiado = etapas.find((e) => e.tipo === "treino" && !e.parada);
  assert.ok(guiado && guiado.tipo === "treino");
  assert.match(guiado.jogavel.lesson.fallbacks.winningOffMethod, /linha treinada/, "o treino guiado não muda");
});

test("ramo que sai depois de uma parada também diz «Voltamos a…» (C12, 9...Be7)", () => {
  const c = aula(cursos[0][1], "C");
  const trecho = previaDaAula(c, {}).trechos.find((t) => t.capituloId === "cap-c12")!;
  // Notação sempre em português no site (decisão do Doug, 17/9/2026): Nc3 vira Cc3 aqui.
  assert.ok(trecho.passos.some((p) => p.retorno && /^Voltamos a 9\. Cc3\. Agora revisitamos a outra escolha: 9\. \.\.\. Be7|^Voltamos a 9\. Cc3\./.test(p.fala)), trecho.passos.filter((p) => p.retorno).map((p) => p.fala).join(" | "));
  // A parada vem antes do ramo: a principal toca até o fim primeiro.
  const pergunta = trecho.passos.findIndex((p) => p.parada);
  const volta = trecho.passos.findIndex((p) => p.retorno);
  assert.ok(pergunta >= 0 && pergunta < volta);
});

test("treino guiado sem comentários: o aluno só joga (Doug, 18/9/2026)", () => {
  for (const { aula: a } of cursos[0][1].aulas) {
    for (const treino of a.treinos.filter((t) => t.id.startsWith("treino-arvore-"))) {
      assert.equal(treino.introducao, undefined, treino.id);
      for (const questao of treino.questoes) {
        for (const resposta of questao.respostas) {
          if (resposta.julgamento === "correta") assert.equal(resposta.feedback, "Isso.", `${treino.id}: ${resposta.id}`);
          if (resposta.efeito.tipo === "avanca") for (const defesa of resposta.efeito.defesas) assert.equal(defesa.texto, undefined, `${treino.id}: ${resposta.id}`);
        }
      }
    }
  }
});

test("planejar duas vezes o mesmo estudo dá aulas idênticas", () => {
  assert.equal(JSON.stringify(planejarCursoDeAbertura(LICHESS, OPCOES).aulas), JSON.stringify(cursos[0][1].aulas));
});

test("com o repertório gerado aplicado, as 5 aulas podem publicar", () => {
  const curso = planejarCursoDeAbertura(LICHESS, OPCOES);
  const compilado = compilarRepertorio([{ nome: "brancas-francesa.pgn", texto: curso.pgn.texto }], []);
  assert.deepEqual(compilado.problemas, []);
  const linhasDoRepertorio = new Set(compilado.linhas.map((l) => l.id));
  for (const { aula: a } of curso.aulas) {
    const erros = problemasParaPublicarV2(a, { positions: {}, linhasDoRepertorio }).filter((p) => p.severidade === "erro");
    assert.deepEqual(erros.map((p) => `${p.codigo}: ${p.mensagem}`), [], a.id);
    for (const id of a.treinadores?.[0]?.linhaIds ?? []) assert.ok(linhasDoRepertorio.has(id));
  }
  // E o aluno recebe as etapas, com o move trainer no fim.
  const b = curso.aulas.find((a) => a.bloco === "B")!.aula;
  const revisoes = Object.fromEntries(b.treinos.map((t) => [t.id, { tipo: "treino" as const, revisao: "ar_teste" }]));
  const etapas = etapasDoAlunoV2(b, {}, revisoes as never);
  assert.equal(etapas.at(-1)?.tipo, "treinador");
  assert.equal(etapas.flatMap((e) => (e.tipo === "capitulo" ? e.paradas ?? [] : [])).length, 8);
  assert.equal(etapas.filter((e) => e.tipo === "treino" && e.parada).length, 0, "nenhuma pergunta é etapa");
});

test("[SECAO] no capítulo vira a capa da etapa do aluno, e nunca vai ao PGN do move trainer (17/9/2026)", () => {
  const comCapa = LOCAL
    .replace("{[OBJETIVO] Entender a ideia da Defesa Francesa", "{[SECAO] Conheça a Francesa | a ideia principal [OBJETIVO] Entender a ideia da Defesa Francesa")
    .replace("{[OBJETIVO] Entender por que escolhemos 3.Bd3.}", "{[SECAO] Nossa arma: 3.Bd3 [OBJETIVO] Entender por que escolhemos 3.Bd3.}");
  const curso = planejarCursoDeAbertura(comCapa, OPCOES);
  const a = aula(curso, "A");
  assert.ok(validarAulaV2(a).ok);
  const capitulos = etapasDoAlunoV2(a, {}, {} as never).filter((e) => e.tipo === "capitulo");
  assert.deepEqual(capitulos[0].tipo === "capitulo" ? capitulos[0].secao : null, { titulo: "Conheça a Francesa", subtitulo: "a ideia principal" });
  const segundo = capitulos.find((e) => e.tipo === "capitulo" && e.titulo.startsWith("Nossa arma"));
  assert.deepEqual(segundo?.tipo === "capitulo" ? segundo.secao : null, { titulo: "Nossa arma: 3.Bd3" });
  assert.equal(a.capitulos.filter((c) => c.secao).length, 2, "só o primeiro trecho de cada capítulo leva a capa");
  assert.doesNotMatch(curso.pgn.texto, /SECAO|Conheça a Francesa \|/);
  // O comentário cru fica na análise (privada, §12), como os outros marcadores; ao aluno só chega a capa.
  assert.equal(JSON.stringify(etapasDoAlunoV2(a, {}, {} as never)).includes("[SECAO]"), false);
});

test("treino da aula de abertura leva os símbolos dos lances e liga a escada de ajuda (17/9/2026)", () => {
  const b = aula(cursos[1][1], "B");
  const revisoes = Object.fromEntries(b.treinos.map((t) => [t.id, { tipo: "treino" as const, revisao: "ar_teste" }]));
  const etapas = etapasDoAlunoV2(b, {}, revisoes as never);
  const guiado = etapas.find((e) => e.tipo === "treino" && !e.parada);
  assert.ok(guiado && guiado.tipo === "treino");
  assert.equal(guiado.ajudaNoErro, true);
  const simbolos = guiado.simbolos ?? {};
  // 5...Qxg2? — o erro das Pretas que a aula B pune.
  const qxg2 = Object.entries(simbolos).filter(([chave]) => chave.endsWith("|d5g2") || chave.endsWith("|b6g2") || chave.endsWith("|c7g2"));
  assert.ok(qxg2.some(([, nag]) => nag === 2 || nag === 4), JSON.stringify(qxg2));
  assert.ok(Object.entries(simbolos).some(([chave, nag]) => chave.endsWith("|c2c3") && nag === 1), "e o 5.c3! do acerto do aluno");
  for (const chave of Object.keys(simbolos)) assert.match(chave, /^[^|]+ [wb] [KQkq-]+ [a-h1-8-]+\|[a-h][1-8][a-h][1-8][qrbn]?$/);
});

test("curso das Pretas: o título da aula e o aviso do treino guiado falam do adversário certo (18/9/2026)", () => {
  const estudo = `[Event "Mini"]
[White "A01"]
[Black "Nossa arma"]

{[OBJETIVO] Jogar 1...c5.} 1. e4 c5 { A Siciliana. } *

[Event "Mini"]
[White "C02"]
[Black "Quando as Brancas jogam bem"]

{[OBJETIVO] Responder a 2.Cf3.} 1. e4 c5 2. Nf3 { O lance mais comum. } 2... Nc6 { Nosso cavalo. } *

[Event "Mini"]
[White "E22A"]
[Black "Move Trainer — Arma: 1...c5"]

1. e4 c5 2. Nf3 (2. Nc3 Nc6) (2. c3 Nf6) (2. d4 cxd4) (2. f4 g6) 2... Nc6 *
`;
  const curso = planejarCursoDeAbertura(estudo, { cor: "pretas", abertura: "mini", nomeDaAbertura: "Mini", agora: new Date("2026-09-18T00:00:00Z") });
  const titulos = curso.aulas.map((a) => a.aula.titulo).join(" | ");
  assert.doesNotMatch(titulos, /Pretas/, titulos);
  assert.match(aula(curso, "C").titulo, /Quando as Brancas jogam bem/);
  const demais = curso.avisos.filter((a) => a.codigo === "DEFESAS_DEMAIS").map((a) => a.mensagem);
  assert.ok(demais.length > 0, "cinco respostas depois de 1...c5");
  for (const mensagem of demais) assert.match(mensagem, /respostas das Brancas/, mensagem);
  // E o curso das Brancas continua como estava.
  assert.match(aula(cursos[0][1], "C").titulo, /Quando as Pretas jogam bem/);
});
