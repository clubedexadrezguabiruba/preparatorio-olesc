/**
 * As regras que impedem publicar (§19.3, §20.1) — cada uma ligada e desligada.
 *
 * Plano §19: "mutação para cada regra impeditiva nova e prova de que a mutação deixa de ser
 * detectada quando a regra é desativada". Os dois lados importam: sem o lado desligado, um
 * vermelho produzido por outra regra passaria por prova desta.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Chess } from "chess.js";
import { goalMovesOf, normalizeFen, Tablebase, type TbEntry } from "../../scripts/tablebase.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua } from "../lesson/voz.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { revisoesDaAulaV2 } from "./avaliacao.ts";
import { contarProblemasV2, problemasParaPublicarV2, REGRAS_PUBLICACAO_V2, type ContextoDePublicacaoV2 } from "./conferencia.ts";
import { renovarCertificacoesV2 } from "./gate.ts";
import type { AulaV2 } from "./modelo.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N0/pos-n0-ladder-silman-yk7.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const regua = lerRegua();
const tablebase = new Tablebase(path.join("content", "tablebase-cache"), false);
const cache = new Map<string, TbEntry>();

async function aulaConferida(): Promise<AulaV2> {
  const { aula } = await renovarCertificacoesV2(adaptarLessonV1(lesson, positions), positions, async (fen) => {
    const entrada = await tablebase.lookup(fen);
    cache.set(normalizeFen(fen), entrada);
    return entrada;
  });
  return aula;
}

const contexto = (extra: Partial<ContextoDePublicacaoV2> = {}): ContextoDePublicacaoV2 => ({
  positions,
  regua,
  tablebase: (fen, resultado) => {
    const entrada = cache.get(normalizeFen(fen));
    return entrada ? goalMovesOf(entrada, resultado) : null;
  },
  ...extra,
});

const erros = (aula: AulaV2, ctx: ContextoDePublicacaoV2, desligadas: string[] = []) =>
  problemasParaPublicarV2(aula, ctx, new Set(desligadas)).filter((p) => p.severidade === "erro").map((p) => p.codigo);

test("§19.3: a N0-LADDER conferida, sem estrago, pode publicar", async () => {
  const aula = await aulaConferida();
  const problemas = problemasParaPublicarV2(aula, contexto());
  assert.deepEqual(problemas.filter((p) => p.severidade === "erro"), []);
  assert.equal(contarProblemasV2(problemas).podePublicar, true);
  assert.equal(aula.treinos[0].certificacao?.estado, "confirmada");
  assert.equal(aula.treinos[0].certificacao?.resultado, "win");
});

type Estrago = { codigo: string; aviso?: true; estragar: (aula: AulaV2) => ContextoDePublicacaoV2 | void };

/**
 * A primeira pergunta que tem um lance legal que joga o resultado fora, e esse lance.
 *
 * Na N0-LADDER, das cinco perguntas só a última tem um (`g4b4`, que afoga) — nas outras,
 * todo lance legal ainda ganha. A primeira versão deste estrago procurava na pergunta 1,
 * não achava, e aceitava `undefined`: a regra "pegava" um lance que nem existe.
 */
function lanceQuePerde(aula: AulaV2): { questao: number; lance: string } {
  const treino = aula.treinos[0];
  for (const [questao, item] of treino.questoes.entries()) {
    const evidencia = treino.certificacao!.evidencias![item.id];
    const preservam = new Set(evidencia.winningMoves);
    const lance = new Chess(evidencia.fen).moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`).find((uci) => !preservam.has(uci));
    if (lance) return { questao, lance };
  }
  throw new Error("nenhuma pergunta tem lance que perde");
}

const ESTRAGOS: Estrago[] = [
  // Fatia 8, §22: aula extra e trilha. A N0-LADDER conferida vira extra trocando o id.
  { codigo: "EXTRA_SEM_NIVEL", estragar: (a) => { a.id = "EX-LADDER-TESTE"; a.metadados = { ...a.metadados!, classe: "E" }; delete a.metadados.nivel; } },
  { codigo: "EXTRA_SEM_CLASSE", estragar: (a) => { a.id = "EX-LADDER-TESTE"; a.metadados = { ...a.metadados!, nivel: 1 }; delete a.metadados.classe; } },
  { codigo: "NIVEL_DIVERGE", estragar: (a) => { a.metadados = { ...a.metadados!, nivel: 3 }; } },
  { codigo: "AULA_FORA_DA_TRILHA", aviso: true, estragar: (a) => { a.id = "N0-FORA-DA-TRILHA"; } },
  { codigo: "PROVENIENCIA_CADUCA", estragar: (a) => { a.proveniencia[0].conteudoHash = "0".repeat(64); } },
  { codigo: "PROVENIENCIA_DIVERGE", estragar: (a) => { a.proveniencia[0].estado = "candidate"; } },
  { codigo: "FEN_IMPORTADA_SEM_REVISAO", estragar: (a) => { a.analises[0].inicio = { tipo: "fen", fen: position.fen }; } },
  { codigo: "REVISAO_PENDENTE", estragar: (a) => { a.capitulos[0].narracoes[0].revisao = { motivo: "posicao-inicial-trocada" }; } },
  { codigo: "CERTIFICACAO_PENDENTE", estragar: (a) => { a.treinos[0].certificacao!.estado = "herdada-v1"; } },
  {
    codigo: "CERTIFICACAO_CADUCA",
    estragar: (a) => {
      const evidencia = Object.values(a.treinos[0].certificacao!.evidencias!)[0];
      evidencia.winningMoves = evidencia.winningMoves.slice(1);
    },
  },
  {
    codigo: "CERTIFICACAO_REFUTADA",
    estragar: (a) => {
      const { questao, lance } = lanceQuePerde(a);
      assert.match(lance, /^[a-h][1-8][a-h][1-8]/, "o estrago precisa de um lance de verdade");
      a.treinos[0].questoes[questao].respostas[0].moves = [lance];
    },
  },
  {
    codigo: "PRATICA_AUSENTE",
    estragar: (a) => {
      a.fluxo = a.fluxo.filter((etapa) => etapa.tipo !== "pratica");
      a.praticas = [];
    },
  },
  {
    codigo: "PRATICAS_MULTIPLAS",
    estragar: (a) => {
      a.praticas.push({ ...a.praticas[0], id: "pratica-segunda" });
      a.fluxo.push({ id: "etapa-pratica-segunda", tipo: "pratica", entidadeId: "pratica-segunda" });
    },
  },
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
  test(`§19: ${codigo} ${aviso ? "avisa" : "impede publicar"}, e desligada deixa o estrago passar`, async () => {
    const aula = await aulaConferida();
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

test("§19.2: no rascunho as quatro promovidas continuam aviso — só a publicação as cobra", async () => {
  const aula = await aulaConferida();
  aula.capitulos[0].narracoes[0].revisao = { motivo: "posicao-inicial-trocada" };
  const doRascunho = problemasParaPublicarV2(aula, contexto(), new Set(["REVISAO_PENDENTE"])).find((p) => p.codigo === "REVISAO_PENDENTE");
  assert.equal(doRascunho?.severidade, "aviso");
});

test("régua de voz na publicação: avisa e não impede (decisão do Doug, 13/9)", async () => {
  const aula = await aulaConferida();
  aula.capitulos[0].narracoes[1].texto = "Aqui o método é simples.";
  const problemas = problemasParaPublicarV2(aula, contexto());
  const voz = problemas.filter((p) => p.codigo.startsWith("VOZ_"));
  assert.equal(voz.length, 1);
  assert.equal(voz[0].severidade, "aviso");
  assert.match(voz[0].mensagem, /narração 2: usa "método"/);
  assert.equal(contarProblemasV2(problemas).podePublicar, true);
});

test("§19.2: os erros vêm antes dos avisos", async () => {
  const aula = await aulaConferida();
  aula.capitulos[0].narracoes[1].texto = "Aqui o método é simples.";
  aula.treinos[0].certificacao!.estado = "herdada-v1";
  const severidades = problemasParaPublicarV2(aula, contexto()).map((p) => p.severidade);
  assert.equal(severidades.indexOf("aviso") > severidades.lastIndexOf("erro"), true);
});
