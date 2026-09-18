/**
 * A decisão de gravar uma tentativa v2 (§20.2), com um banco de mentira que conta o que foi
 * escrito. A corrente contra o banco de verdade é `scripts/verificar-finais.ts`.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adaptarLessonV1 } from "../editor-v2/adaptar-v1.ts";
import { montarPacoteV2, type PacoteV2 } from "../editor-v2/pacote.ts";
import { planejarCursoDeAbertura } from "../editor-v2/planejar-curso.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import type { ProgressoDaEscada } from "./escada.ts";
import { gravarTentativaDeAulaV2, type BancoDasTentativasV2, type LinhaDeTentativaV2 } from "./gravar-v2.ts";
import type { TentativaDeAulaV2 } from "./tentativa-v2.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const ALUNO = "00000000-0000-4000-8000-000000000001";
const MATE = ["g2g4", "e3d2", "g1g3", "d2c1", "g3g2", "c1b1", "g2e2", "b1a1", "g4g1"];

function bancoDeMentira() {
  const linhas: LinhaDeTentativaV2[] = [];
  const semSnapshot: unknown[] = [];
  const escadas = new Map<string, ProgressoDaEscada>();
  let gravacoesDeEscada = 0;
  const banco: BancoDasTentativasV2 = {
    inserirTentativa: async (linha) => {
      if (linhas.some((l) => l.tentativa_id === linha.tentativa_id)) return { inserida: false };
      linhas.push(linha);
      return { inserida: true };
    },
    guardarSemSnapshot: async (linha) => { semSnapshot.push(linha); },
    lerEscada: async (c) => escadas.get(`${c.aula}|${c.entidadeId}|${c.assessmentRevision}`) ?? null,
    gravarEscada: async (c, p) => { gravacoesDeEscada += 1; escadas.set(`${c.aula}|${c.entidadeId}|${c.assessmentRevision}`, p); return true; },
  };
  return { banco, linhas, semSnapshot, escadas, gravacoesDeEscada: () => gravacoesDeEscada };
}

function publicacoes(...pacotes: PacoteV2[]) {
  return {
    publicacao: (_aula: string, id: string) => pacotes.find((p) => p.publicationId === id) ?? null,
    ativo: () => pacotes[pacotes.length - 1],
  };
}

function pratica(pacote: PacoteV2, extra: Partial<TentativaDeAulaV2> = {}): TentativaDeAulaV2 {
  const etapa = pacote.aula.fluxo.find((e) => e.tipo === "pratica")!;
  return {
    aula: pacote.aula.id, publicationId: pacote.publicationId, etapaId: etapa.id, entidadeId: etapa.entidadeId, tipo: "pratica",
    assessmentRevision: pacote.revisoes[etapa.entidadeId].revisao, tentativaId: randomUUID(), tentativaNumero: 1, lances: MATE, tempoMs: 30_000,
    ...extra,
  };
}

const base = () => montarPacoteV2(adaptarLessonV1(lesson, positions), positions);

test("§20.2: a prática certa da revisão ativa grava uma linha e sobe um degrau", async () => {
  const pacote = base();
  const b = bancoDeMentira();
  const resultado = await gravarTentativaDeAulaV2(ALUNO, pratica(pacote), publicacoes(pacote), b.banco);
  assert.deepEqual(resultado, { sucesso: true, conta: "escada" });
  assert.equal(b.linhas.length, 1);
  assert.equal(b.linhas[0].publication_id, pacote.publicationId);
  assert.equal(b.linhas[0].politica_defensor, null);
  assert.equal([...b.escadas.values()][0].degrau, 1);
});

test("§20.2: retry com o mesmo tentativaId devolve o mesmo veredito, 1 linha e 1 degrau", async () => {
  const pacote = base();
  const b = bancoDeMentira();
  const tentativa = pratica(pacote);
  await gravarTentativaDeAulaV2(ALUNO, tentativa, publicacoes(pacote), b.banco);
  const segunda = await gravarTentativaDeAulaV2(ALUNO, tentativa, publicacoes(pacote), b.banco);
  assert.deepEqual(segunda, { sucesso: true, conta: "escada", repetida: true });
  assert.equal(b.linhas.length, 1);
  assert.equal(b.gravacoesDeEscada(), 1);
});

test("§10: aba antiga conclui contra o snapshot dela e grava sem conceder domínio da revisão nova", async () => {
  const antigo = base();
  const aulaNova = adaptarLessonV1(lesson, positions);
  aulaNova.praticas[0].engine = { ...aulaNova.praticas[0].engine, skill: 10 };
  const novo = montarPacoteV2(aulaNova, positions);
  assert.notEqual(novo.revisoes[aulaNova.praticas[0].id].revisao, antigo.revisoes[aulaNova.praticas[0].id].revisao);
  const b = bancoDeMentira();
  const resultado = await gravarTentativaDeAulaV2(ALUNO, pratica(antigo), publicacoes(antigo, novo), b.banco);
  assert.deepEqual(resultado, { sucesso: true, conta: "historico" });
  assert.equal(b.linhas.length, 1);
  assert.equal(b.linhas[0].publication_id, antigo.publicationId);
  assert.equal(b.gravacoesDeEscada(), 0);
});

test("§10: sem o snapshot no servidor, a tentativa é guardada e o aluno reabre — nunca julgada contra outra", async () => {
  const pacote = base();
  const b = bancoDeMentira();
  const resultado = await gravarTentativaDeAulaV2(ALUNO, pratica(pacote, { publicationId: "pub-0000000000000000" }), publicacoes(pacote), b.banco);
  assert.ok("reabrir" in resultado);
  assert.equal(b.semSnapshot.length, 1);
  assert.equal(b.linhas.length, 0);
});

test("§20.2: forjado não vira linha — revisão trocada, etapa de outro tipo, lance ilegal, forma", async () => {
  const pacote = base();
  const b = bancoDeMentira();
  const conteudo = publicacoes(pacote);
  const erro = async (t: TentativaDeAulaV2) => (await gravarTentativaDeAulaV2(ALUNO, t, conteudo, b.banco)) as { erro?: string };
  assert.match((await erro(pratica(pacote, { assessmentRevision: `ar_${"1".repeat(64)}` }))).erro ?? "", /revisão/);
  assert.match((await erro(pratica(pacote, { tipo: "treino" }))).erro ?? "", /etapa não é desta aula/);
  assert.match((await erro(pratica(pacote, { lances: ["g2g4", "a1a8"] }))).erro ?? "", /ilegal/);
  assert.match((await erro(pratica(pacote, { tentativaId: "nao-e-uuid" }))).erro ?? "", /id de tentativa/);
  assert.equal(b.linhas.length, 0);
});

test("plano §10: o treino grava a política do snapshot e a ajuda, e não mexe na escada", async () => {
  const pacote = base();
  const b = bancoDeMentira();
  const etapa = pacote.aula.fluxo.find((e) => e.tipo === "treino")!;
  const resultado = await gravarTentativaDeAulaV2(ALUNO, {
    ...pratica(pacote), etapaId: etapa.id, entidadeId: etapa.entidadeId, tipo: "treino",
    assessmentRevision: pacote.revisoes[etapa.entidadeId].revisao, lances: ["g2g4", "g1g3", "g3g2", "g2e2", "g4g1"], ajuda: true,
    politicaDefensor: "fixa",
  }, publicacoes(pacote), b.banco);
  assert.deepEqual(resultado, { sucesso: true, conta: "registro" });
  assert.equal(b.linhas[0].politica_defensor, "deterministica", "a política é a do snapshot, não a do navegador");
  assert.equal(b.linhas[0].ajuda, true);
  assert.equal(b.gravacoesDeEscada(), 0);
});

test("curso de abertura: a pergunta dentro do capítulo sobe pela etapa do capítulo; outra entidade não (18/9/2026)", async () => {
  const curso = planejarCursoDeAbertura(readFileSync("e2e/fixtures/francesa-v15-pgn-local.pgn", "utf8"), { cor: "brancas", abertura: "francesa", nomeDaAbertura: "Francesa 3.Bd3", agora: new Date("2026-09-16T00:00:00Z") });
  const pacote = montarPacoteV2(curso.aulas.find((a) => a.bloco === "B")!.aula, {});
  const etapa = pacote.aula.fluxo.find((e) => e.paradas?.some((id) => id.startsWith("treino-parada-b05a")))!;
  const treinoId = etapa.paradas!.find((id) => id.startsWith("treino-parada-b05a"))!;
  const b = bancoDeMentira();
  const tentativa: TentativaDeAulaV2 = {
    aula: pacote.aula.id, publicationId: pacote.publicationId, etapaId: etapa.id, entidadeId: treinoId, tipo: "treino",
    assessmentRevision: pacote.revisoes[treinoId].revisao, tentativaId: randomUUID(), tentativaNumero: 1, lances: ["d3e4"], tempoMs: 5_000,
  };
  assert.deepEqual(await gravarTentativaDeAulaV2(ALUNO, tentativa, publicacoes(pacote), b.banco), { sucesso: true, conta: "registro" });
  assert.equal(b.linhas[0].entidade_id, treinoId);
  const outra = pacote.aula.treinos.find((t) => t.id.startsWith("treino-arvore"))!;
  const forjada = { ...tentativa, tentativaId: randomUUID(), entidadeId: outra.id, assessmentRevision: pacote.revisoes[outra.id].revisao };
  assert.match(((await gravarTentativaDeAulaV2(ALUNO, forjada, publicacoes(pacote), b.banco)) as { erro?: string }).erro ?? "", /etapa não é desta aula/);
});
