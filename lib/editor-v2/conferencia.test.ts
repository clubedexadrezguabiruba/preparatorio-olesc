/**
 * As regras que impedem publicar (§19.3, §20.1) — cada uma ligada e desligada.
 *
 * Plano §19: "mutação para cada regra impeditiva nova e prova de que a mutação deixa de ser
 * detectada quando a regra é desativada". Os dois lados importam: sem o lado desligado, um
 * vermelho produzido por outra regra passaria por prova desta.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua } from "../lesson/voz.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { revisoesDaAulaV2 } from "./avaliacao.ts";
import { contarProblemasV2, problemasParaPublicarV2, REGRAS_PUBLICACAO_V2, type ContextoDePublicacaoV2 } from "./conferencia.ts";
import type { AulaV2 } from "./modelo.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const regua = lerRegua();

/** A N0-LADDER como o editor a abre: sem tablebase, a evidência antiga fica herdada e congelada. */
function aulaConferida(): AulaV2 {
  return adaptarLessonV1(lesson, positions);
}

const contexto = (extra: Partial<ContextoDePublicacaoV2> = {}): ContextoDePublicacaoV2 => ({ positions, regua, ...extra });

const erros = (aula: AulaV2, ctx: ContextoDePublicacaoV2, desligadas: string[] = []) =>
  problemasParaPublicarV2(aula, ctx, new Set(desligadas)).filter((p) => p.severidade === "erro").map((p) => p.codigo);

test("§19.3: a N0-LADDER, sem estrago e sem tablebase, pode publicar", () => {
  const aula = aulaConferida();
  const problemas = problemasParaPublicarV2(aula, contexto());
  assert.deepEqual(problemas.filter((p) => p.severidade === "erro"), []);
  assert.equal(contarProblemasV2(problemas).podePublicar, true);
  assert.equal(aula.treinos[0].certificacao?.estado, "herdada-v1");
  assert.equal(aula.treinos[0].resultado, "win", "o resultado vem declarado no treino");
});

type Estrago = { codigo: string; aviso?: true; estragar: (aula: AulaV2) => ContextoDePublicacaoV2 | void };

/** A N0-LADDER vestida de aula de abertura (§13.3.3): id `AB-`, metadados e um move trainer. */
const LINHA = "brancas-francesa-0123abcd";
function comoAulaDeAbertura(a: AulaV2): void {
  a.id = "AB-BRANCAS-FRANCESA-B";
  a.metadados = { ...a.metadados!, abertura: { cor: "brancas", abertura: "francesa", bloco: "B" } };
  a.treinadores = [{ id: "treinador-b", titulo: "Move trainer do bloco B", cor: "brancas", abertura: "francesa", linhaIds: [LINHA] }];
  a.fluxo.push({ id: "etapa-treinador-b", tipo: "treinador", entidadeId: "treinador-b" });
}

const ESTRAGOS: Estrago[] = [
  // Fatia 8, §22: aula extra e trilha. A N0-LADDER vira extra trocando o id.
  { codigo: "EXTRA_SEM_NIVEL", estragar: (a) => { a.id = "EX-LADDER-TESTE"; a.metadados = { ...a.metadados!, classe: "E" }; delete a.metadados.nivel; } },
  { codigo: "EXTRA_SEM_CLASSE", estragar: (a) => { a.id = "EX-LADDER-TESTE"; a.metadados = { ...a.metadados!, nivel: 1 }; delete a.metadados.classe; } },
  { codigo: "NIVEL_DIVERGE", estragar: (a) => { a.metadados = { ...a.metadados!, nivel: 3 }; } },
  { codigo: "AULA_FORA_DA_TRILHA", aviso: true, estragar: (a) => { a.id = "N0-FORA-DA-TRILHA"; } },
  // Curso de abertura, §13.3.3 e §18.1 (16/9/2026).
  { codigo: "ABERTURA_DIVERGE", estragar: (a) => { comoAulaDeAbertura(a); a.metadados!.abertura!.bloco = "C"; return contexto({ linhasDoRepertorio: new Set([LINHA]) }); } },
  { codigo: "TREINADOR_LINHA_AUSENTE", estragar: (a) => { comoAulaDeAbertura(a); return contexto({ linhasDoRepertorio: new Set(["brancas-francesa-ffffffff"]) }); } },
  {
    codigo: "TEXTO_SEM_DIREITO_DECLARADO",
    aviso: true,
    estragar: (a) => {
      a.analises[0].inicio = {
        tipo: "fen",
        fen: position.fen,
        revisao: { origem: "estudo-lichess", autor: "Outra Pessoa", fenRevisada: position.fen, revisadoEm: "2026-09-14T00:00:00.000Z", professor: "doug", mostrarCredito: true, direitoDosTextos: false },
      };
    },
  },
  { codigo: "REVISAO_PENDENTE", estragar: (a) => { a.capitulos[0].narracoes[0].revisao = { motivo: "posicao-inicial-trocada" }; } },
  // Teste de uso de 15/9: a cópia da N0-LADDER com o treino trocado para "Segurar o empate".
  { codigo: "TREINO_RESULTADO_DIVERGE", aviso: true, estragar: (a) => { a.treinos[0].resultado = "draw"; } },
  /*
   * A régua de desenho, símbolo e convenção de finais (17/9/2026). Todas avisam e nenhuma
   * impede — a régua é nova e as aulas no ar são velhas; quem conserta é um dos cinco
   * revisores de `/revisar-pgn-de-finais`.
   *
   * **A prova forte de cada uma está em `regua-de-desenho.test.ts`**, que cobra os dois lados:
   * a regra pega o estrago e **cala** quando ele é desfeito. Aqui o que se prova é o contrato
   * desta lista — a regra existe, aparece como aviso, e desligada some.
   */
  { codigo: "DESENHO_TREINO_SEM_ALVO", aviso: true, estragar: (a) => { for (const questao of a.treinos[0].questoes) delete questao.desenhos; } },
  {
    codigo: "DESENHO_TREINO_COM_ALVO",
    aviso: true,
    // Um segundo treino, que na régua do apoio decrescente não pode apontar alvo nenhum.
    estragar: (a) => {
      const copia = structuredClone(a.treinos[0]);
      copia.id = "treino-segundo-teste";
      copia.questoes = copia.questoes.slice(0, 1).map((questao) => ({ ...questao, id: "questao-segunda-teste", desenhos: { highlights: [{ casa: "b8", cor: "verde" as const }] }, respostas: questao.respostas.map((r) => ({ ...r, id: `${r.id}-2`, efeito: { tipo: "encerra" as const, condicao: "objetivo-autoral" as const } })) }));
      delete copia.origem;
      a.treinos.push(copia);
      a.fluxo.push({ id: "etapa-treino-segundo-teste", tipo: "treino", entidadeId: copia.id });
    },
  },
  {
    codigo: "DESENHO_ENTREGA_O_LANCE",
    aviso: true,
    estragar: (a) => {
      const questao = a.treinos[0].questoes[0];
      const certo = questao.respostas[0].moves[0];
      questao.desenhos = { arrows: [[certo.slice(0, 2), certo.slice(2, 4)]] };
    },
  },
  { codigo: "CASA_CITADA_SEM_DESENHO", aviso: true, estragar: (a) => { a.capitulos[0].narracoes[0].texto = "O rei vai para h7."; a.capitulos[0].narracoes[0].desenhos = {}; } },
  {
    codigo: "CASA_ACESA_SEM_CITACAO",
    aviso: true,
    estragar: (a) => { a.capitulos[0].narracoes[0].texto = "Olhe o tabuleiro."; a.capitulos[0].narracoes[0].desenhos = { highlights: [{ casa: "h1", cor: "amarelo" }] }; },
  },
  {
    codigo: "DESENHO_DEMAIS",
    aviso: true,
    estragar: (a) => { a.capitulos[0].narracoes[0].desenhos = { highlights: ["a1", "a2", "a3", "a4", "a5"] }; },
  },
  {
    codigo: "VARIANTE_SEM_SIMBOLO",
    aviso: true,
    estragar: (a) => {
      a.treinos[0].questoes[0].respostas.push({ id: "resposta-muda-teste", moves: ["a1a2"], julgamento: "erro", feedback: "Este lance não é o da lição. Tente de novo.", efeito: { tipo: "repete" } });
    },
  },
  { codigo: "LEMBRE_SE_REGRAS", aviso: true, estragar: (a) => { a.capitulos[0].titulo = "LEMBRE-SE"; a.capitulos[0].narracoes[0].texto = "Uma.\nDuas.\nTrês.\nQuatro."; } },
  { codigo: "QUADRO_1_NAO_PERGUNTA", aviso: true, estragar: (a) => { a.introducoes[0].quadros[0].texto = "As brancas ganham."; } },
  {
    codigo: "AVALIACAO_REVISAO_DIVERGE",
    estragar: (a) => {
      const recalculadas = revisoesDaAulaV2(a, positions);
      const gravadas = structuredClone(recalculadas);
      gravadas[a.praticas[0].id].revisao = `ar_${"0".repeat(64)}`;
      return contexto({ revisoes: { gravadas, recalculadas } });
    },
  },
];

test("§13.3.3: aula de abertura inteira publica, sem classe, sem nível e fora da trilha de finais", () => {
  const aula = aulaConferida();
  comoAulaDeAbertura(aula);
  delete aula.metadados!.nivel;
  delete aula.metadados!.classe;
  const problemas = problemasParaPublicarV2(aula, contexto({ linhasDoRepertorio: new Set([LINHA]) }));
  assert.deepEqual(problemas.filter((p) => p.severidade === "erro").map((p) => p.codigo), []);
  assert.ok(!problemas.some((p) => p.codigo === "AULA_FORA_DA_TRILHA"), "a trilha de finais não é da conta dela");
});

test("§18.1: sem o repertório compilado lido, o move trainer impede publicar", () => {
  const aula = aulaConferida();
  comoAulaDeAbertura(aula);
  assert.ok(erros(aula, contexto()).includes("TREINADOR_LINHA_AUSENTE"));
});

test("§13.3.3: id de finais com metadados de abertura diverge; move trainer de outra abertura também", () => {
  const extra = aulaConferida();
  extra.metadados = { ...extra.metadados!, abertura: { cor: "brancas", abertura: "francesa", bloco: "B" } };
  assert.ok(erros(extra, contexto()).includes("ABERTURA_DIVERGE"));
  const outra = aulaConferida();
  comoAulaDeAbertura(outra);
  outra.treinadores![0].abertura = "caro-kann";
  assert.ok(erros(outra, contexto({ linhasDoRepertorio: new Set([LINHA]) })).includes("ABERTURA_DIVERGE"));
});

test("§19: toda regra da lista tem um estrago que a prova", () => {
  assert.deepEqual(ESTRAGOS.map((e) => e.codigo).sort(), REGRAS_PUBLICACAO_V2.map((r) => r.codigo).sort());
});

for (const { codigo, estragar, aviso } of ESTRAGOS) {
  test(`§19: ${codigo} ${aviso ? "avisa" : "impede publicar"}, e desligada deixa o estrago passar`, () => {
    const aula = aulaConferida();
    const ctx = estragar(aula) ?? contexto();
    if (aviso) {
      const codigos = (desligadas: string[] = []) => problemasParaPublicarV2(aula, ctx, new Set(desligadas)).map((p) => `${p.severidade}:${p.codigo}`);
      assert.ok(codigos().includes(`aviso:${codigo}`), codigos().join(", "));
      assert.ok(!codigos([codigo]).some((c) => c.endsWith(codigo)));
      assert.ok(!erros(aula, ctx).includes(codigo), "é aviso: não impede publicar");
      return;
    }
    assert.ok(erros(aula, ctx).includes(codigo), `ligada: ${erros(aula, ctx).join(", ")}`);
    assert.ok(!erros(aula, ctx, [codigo]).includes(codigo), "desligada, o código não pode aparecer como erro");
  });
}

/*
 * Treino × resultado da posição (decisão do Doug, 15/9/2026): a máquina avisa, o professor decide.
 * Duas fontes, as duas no servidor: o resultado que o acervo guarda para a posição onde o treino
 * começa (achada pela FEN, sem os contadores) e o da certificação antiga. O motor do professor fica
 * no navegador e não entra na conferência.
 */
const divergencias = (aula: AulaV2, ctx = contexto()) => problemasParaPublicarV2(aula, ctx).filter((p) => p.codigo === "TREINO_RESULTADO_DIVERGE");

test("treino × posição: o caso do teste de uso avisa pelas duas fontes, e publica", () => {
  const aula = aulaConferida();
  aula.treinos[0].resultado = "draw";
  const [aviso, ...resto] = divergencias(aula);
  assert.equal(resto.length, 0, "um aviso por treino");
  assert.equal(aviso.severidade, "aviso");
  assert.equal(aviso.localizacao.treinoId, aula.treinos[0].id);
  assert.match(aviso.mensagem, /cobra segurar o empate/);
  assert.match(aviso.mensagem, /no acervo, a posição onde ele começa dá vitória das brancas/);
  assert.match(aviso.mensagem, /a certificação antiga guarda vitória/);
  assert.equal(contarProblemasV2(problemasParaPublicarV2(aula, contexto())).podePublicar, true);
});

test("treino × posição: resultado igual ao da posição não avisa", () => {
  assert.deepEqual(divergencias(aulaConferida()), []);
});

test("treino × posição: sem certificação, o acervo sozinho avisa", () => {
  const aula = aulaConferida();
  delete aula.treinos[0].certificacao;
  aula.treinos[0].resultado = "draw";
  const [aviso] = divergencias(aula);
  assert.match(aviso.mensagem, /no acervo, a posição onde ele começa dá vitória das brancas/);
  assert.doesNotMatch(aviso.mensagem, /certificação/);
});

test("treino × posição: posição perdida para o aluno avisa mesmo cobrando empate", () => {
  const aula = aulaConferida();
  delete aula.treinos[0].certificacao;
  const perdida = { ...position, expectedResult: "win-black" as const };
  const [aviso] = divergencias(aula, contexto({ positions: { [position.id]: perdida } }));
  assert.match(aviso.mensagem, /cobra vencer/);
  assert.match(aviso.mensagem, /dá vitória das pretas/);
});

test("treino × posição: FEN colada fora do acervo, sem certificação, não tem com que comparar", () => {
  const aula = aulaConferida();
  delete aula.treinos[0].certificacao;
  aula.treinos[0].resultado = "draw";
  aula.analises[0].inicio = { tipo: "fen", fen: position.fen };
  assert.deepEqual(divergencias(aula, contexto({ positions: {} })), []);
});

test("§19.2: no rascunho a revisão pendente continua aviso — só a publicação a cobra", () => {
  const aula = aulaConferida();
  aula.capitulos[0].narracoes[0].revisao = { motivo: "posicao-inicial-trocada" };
  const doRascunho = problemasParaPublicarV2(aula, contexto(), new Set(["REVISAO_PENDENTE"])).find((p) => p.codigo === "REVISAO_PENDENTE");
  assert.equal(doRascunho?.severidade, "aviso");
});

/*
 * As travas de 15/9/2026 (docs/TRILHA-FINAIS.md): cada estrago abaixo **impedia** publicar até
 * aquele dia. O teste prova o contrário — a aula continua podendo publicar —, e prova também que
 * o que virou aviso continua aparecendo.
 */
const TRAVAS_QUE_CAIRAM: Array<{ nome: string; aviso?: string; estragar: (aula: AulaV2) => void }> = [
  { nome: "posição mudou depois da revisão (trava 7)", aviso: "PROVENIENCIA_CADUCA", estragar: (a) => { a.proveniencia[0].conteudoHash = "0".repeat(64); } },
  { nome: "estado da revisão diverge (trava 7)", aviso: "PROVENIENCIA_DIVERGE", estragar: (a) => { a.proveniencia[0].estado = "candidate"; } },
  { nome: "FEN importada sem dizer de onde veio (trava 7)", aviso: "FEN_IMPORTADA_SEM_REVISAO", estragar: (a) => { a.analises[0].inicio = { tipo: "fen", fen: position.fen }; } },
  { nome: "certificação só herdada, nunca confirmada (travas 2 e 3)", estragar: (a) => { a.treinos[0].certificacao!.estado = "herdada-v1"; } },
  { nome: "evidência antiga que não bate com nada (travas 2 e 3)", estragar: (a) => { const evidencia = Object.values(a.treinos[0].certificacao!.evidencias!)[0]; evidencia.winningMoves = evidencia.winningMoves.slice(1); } },
  {
    nome: "resposta aceita que a evidência antiga diria perder (travas 2 e 3)",
    estragar: (a) => {
      const treino = a.treinos[0];
      for (const [indice, questao] of treino.questoes.entries()) {
        const evidencia = treino.certificacao!.evidencias![questao.id];
        const preservam = new Set(evidencia.winningMoves);
        const lance = new Chess(evidencia.fen).moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`).find((uci) => !preservam.has(uci));
        if (lance) { treino.questoes[indice].respostas[0].moves = [lance]; return; }
      }
      throw new Error("nenhuma pergunta tem lance que perde");
    },
  },
  { nome: "treino novo sem certificação nenhuma (trava 2)", estragar: (a) => { delete a.treinos[0].certificacao; a.treinos[0].perfil = "linha-autoral"; } },
  { nome: "aula sem prática (trava 9)", estragar: (a) => { a.fluxo = a.fluxo.filter((etapa) => etapa.tipo !== "pratica"); a.praticas = []; } },
  { nome: "aula com duas práticas (trava 9)", estragar: (a) => { a.praticas.push({ ...a.praticas[0], id: "pratica-segunda" }); a.fluxo.push({ id: "etapa-pratica-segunda", tipo: "pratica", entidadeId: "pratica-segunda" }); } },
];

for (const { nome, aviso, estragar } of TRAVAS_QUE_CAIRAM) {
  test(`travas de 15/9: ${nome} não impede publicar`, () => {
    const aula = aulaConferida();
    estragar(aula);
    const problemas = problemasParaPublicarV2(aula, contexto());
    assert.deepEqual(problemas.filter((p) => p.severidade === "erro").map((p) => `${p.codigo}: ${p.mensagem}`), []);
    assert.equal(contarProblemasV2(problemas).podePublicar, true);
    assert.ok(!problemas.some((p) => /^CERTIFICACAO_|^PRATICA_AUSENTE$|^PRATICAS_MULTIPLAS$/.test(p.codigo)));
    if (aviso) assert.ok(problemas.some((p) => p.codigo === aviso && p.severidade === "aviso"), `${aviso} continua à vista, como aviso`);
  });
}

test("régua de voz na publicação: avisa e não impede (decisão do Doug, 13/9)", () => {
  const aula = aulaConferida();
  aula.capitulos[0].narracoes[1].texto = "Aqui o roteiro é simples.";
  const problemas = problemasParaPublicarV2(aula, contexto());
  const voz = problemas.filter((p) => p.codigo.startsWith("VOZ_"));
  assert.equal(voz.length, 1);
  assert.equal(voz[0].severidade, "aviso");
  assert.match(voz[0].mensagem, /narração 2: usa "roteiro"/);
  assert.equal(contarProblemasV2(problemas).podePublicar, true);
});

test("régua de 15/9: narração com objetivo e método não gera aviso de voz", () => {
  const aula = aulaConferida();
  aula.capitulos[0].narracoes[1].texto = "O objetivo é simples, e o método também.";
  assert.deepEqual(problemasParaPublicarV2(aula, contexto()).filter((p) => p.codigo === "VOZ_PROIBIDA"), []);
});

test("§19.2: os erros vêm antes dos avisos", () => {
  const aula = aulaConferida();
  aula.capitulos[0].narracoes[1].texto = "Aqui o roteiro é simples.";
  aula.capitulos[0].narracoes[0].revisao = { motivo: "posicao-inicial-trocada" };
  const severidades = problemasParaPublicarV2(aula, contexto()).map((p) => p.severidade);
  assert.ok(severidades.includes("erro") && severidades.includes("aviso"));
  assert.equal(severidades.indexOf("aviso") > severidades.lastIndexOf("erro"), true);
});
