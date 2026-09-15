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

const ESTRAGOS: Estrago[] = [
  // Fatia 8, §22: aula extra e trilha. A N0-LADDER vira extra trocando o id.
  { codigo: "EXTRA_SEM_NIVEL", estragar: (a) => { a.id = "EX-LADDER-TESTE"; a.metadados = { ...a.metadados!, classe: "E" }; delete a.metadados.nivel; } },
  { codigo: "EXTRA_SEM_CLASSE", estragar: (a) => { a.id = "EX-LADDER-TESTE"; a.metadados = { ...a.metadados!, nivel: 1 }; delete a.metadados.classe; } },
  { codigo: "NIVEL_DIVERGE", estragar: (a) => { a.metadados = { ...a.metadados!, nivel: 3 }; } },
  { codigo: "AULA_FORA_DA_TRILHA", aviso: true, estragar: (a) => { a.id = "N0-FORA-DA-TRILHA"; } },
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
