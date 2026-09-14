/**
 * A revisão de proveniência de uma FEN crua — fatia 10, parada 10B (§19.1, plano §12).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { executarComando, aplicarNoHistorico, desfazer, iniciarHistorico, refazer } from "./comandos.ts";
import { aplicarNovoCapitulo, prepararNovoCapitulo } from "./novo-capitulo.ts";
import { problemasDaAulaV2, validarAulaV2, type AulaV2 } from "./modelo.ts";
import { creditosDaAula, estadoDaProveniencia, linhaDeCredito, prepararRevisaoDaFen } from "./proveniencia.ts";
import { etapasDoAlunoV2 } from "./fluxo-do-aluno.ts";

const FEN = "8/8/8/4k3/8/8/8/3QK3 w - - 0 1";
const AGORA = new Date("2026-09-14T12:00:00.000Z");

function aulaComCapituloDeFen(): AulaV2 {
  const vazia: AulaV2 = {
    schemaVersion: 2, id: "EX-PROVENIENCIA", titulo: "Mate de Dama e Rei",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  };
  const preparo = prepararNovoCapitulo(vazia, { nome: "O L e a caixa", fen: FEN, orientacao: "white" });
  assert.ok(preparo.ok);
  const aplicado = aplicarNovoCapitulo(vazia, preparo.novo);
  assert.ok(aplicado.ok);
  return aplicado.aula;
}

const codigos = (aula: AulaV2) => problemasDaAulaV2(aula).map((p) => `${p.severidade}/${p.codigo}`);

test("registrar a proveniência tira o FEN_IMPORTADA_SEM_REVISAO (1 → 0), num Desfazer só", () => {
  const aula = aulaComCapituloDeFen();
  assert.deepEqual(codigos(aula), ["aviso/FEN_IMPORTADA_SEM_REVISAO"]);
  const preparo = prepararRevisaoDaFen({ origem: "autoria-propria", mostrarCredito: false }, FEN, "doug", AGORA);
  assert.ok(preparo.ok);
  const analiseId = aula.analises[0].id;

  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "REGISTRAR_PROVENIENCIA", analiseId, revisao: preparo.revisao }, {}));
  assert.deepEqual(codigos(historico.presente), []);
  assert.equal(estadoDaProveniencia(historico.presente.analises[0]), "revisada");
  assert.ok(validarAulaV2(JSON.parse(JSON.stringify(historico.presente))).ok, "a revisão passa no schema");

  // Registrar a mesma revisão de novo não é edição (§6.1).
  assert.equal(executarComando(historico.presente, { tipo: "REGISTRAR_PROVENIENCIA", analiseId, revisao: preparo.revisao }, {}), historico.presente);

  historico = desfazer(historico);
  assert.deepEqual(codigos(historico.presente), ["aviso/FEN_IMPORTADA_SEM_REVISAO"]);
  historico = refazer(historico);
  assert.equal(historico.presente.analises[0].inicio.tipo === "fen" && historico.presente.analises[0].inicio.revisao?.revisadoEm, AGORA.toISOString());
});

test("trocar a FEN deixa a revisão caduca, com o antes e o depois na mensagem", () => {
  const aula = aulaComCapituloDeFen();
  const preparo = prepararRevisaoDaFen({ origem: "obra", autor: "Dvoretsky", obra: "Manual de Finais", pagina: "12", mostrarCredito: true, direitoDosTextos: true }, FEN, "doug", AGORA);
  assert.ok(preparo.ok);
  const revisada = executarComando(aula, { tipo: "REGISTRAR_PROVENIENCIA", analiseId: aula.analises[0].id, revisao: preparo.revisao }, {});
  const outra = "8/8/8/8/4k3/8/8/3QK3 w - - 0 1";
  const trocada: AulaV2 = { ...revisada, analises: revisada.analises.map((a) => ({ ...a, inicio: a.inicio.tipo === "fen" ? { ...a.inicio, fen: outra } : a.inicio })) };
  const problema = problemasDaAulaV2(trocada).find((p) => p.codigo === "FEN_IMPORTADA_SEM_REVISAO");
  assert.ok(problema);
  assert.match(problema.mensagem, /revisada: 8\/8\/8\/4k3.*agora: 8\/8\/8\/8\/4k3/);
  assert.equal(estadoDaProveniencia(trocada.analises[0]), "caduca");
  assert.deepEqual(creditosDaAula(trocada), [], "revisão caduca não credita ninguém");
  // Registrar sobre a FEN errada é recusado: a janela estava velha.
  assert.throws(() => executarComando(trocada, { tipo: "REGISTRAR_PROVENIENCIA", analiseId: trocada.analises[0].id, revisao: preparo.revisao }, {}), /mudou enquanto a janela/);
});

test("origem desconhecida publica, mas o aviso fica e não se resolve", () => {
  const aula = aulaComCapituloDeFen();
  const preparo = prepararRevisaoDaFen({ origem: "desconhecida", mostrarCredito: true }, FEN, "doug", AGORA);
  assert.ok(preparo.ok);
  const revisada = executarComando(aula, { tipo: "REGISTRAR_PROVENIENCIA", analiseId: aula.analises[0].id, revisao: preparo.revisao }, {});
  assert.deepEqual(codigos(revisada), ["aviso/ORIGEM_DESCONHECIDA"]);
  assert.deepEqual(creditosDaAula(revisada), []);
});

test("o formulário: só a origem é obrigatória; link sem http é recusado; direito só para terceiros", () => {
  assert.deepEqual(prepararRevisaoDaFen({ origem: "", mostrarCredito: false }, FEN, "doug", AGORA), { ok: false, campo: "origem", mensagem: "diga de onde a posição veio — é o único campo obrigatório" });
  const link = prepararRevisaoDaFen({ origem: "estudo-lichess", link: "lichess.org/study/x", mostrarCredito: true }, FEN, "doug", AGORA);
  assert.equal(!link.ok && link.campo, "link");
  const propria = prepararRevisaoDaFen({ origem: "autoria-propria", autor: "  ", mostrarCredito: false, direitoDosTextos: false }, FEN, "doug", AGORA);
  assert.ok(propria.ok);
  assert.equal("direitoDosTextos" in propria.revisao, false);
  assert.equal("autor" in propria.revisao, false, "campo em branco não é gravado");
});

test("a linha de crédito, e ela chega ao aluno só com o interruptor ligado", () => {
  const base = { fenRevisada: FEN, revisadoEm: AGORA.toISOString(), professor: "Doug", mostrarCredito: true };
  assert.equal(linhaDeCredito({ ...base, origem: "obra", autor: "Dvoretsky", obra: "Manual de Finais", pagina: "12" }), "Posição: Dvoretsky, Manual de Finais, p. 12");
  assert.equal(linhaDeCredito({ ...base, origem: "autoria-propria" }), "Posição: Doug");
  assert.equal(linhaDeCredito({ ...base, origem: "partida" }), null);

  const aula = aulaComCapituloDeFen();
  const ligado = prepararRevisaoDaFen({ origem: "estudo-lichess", autor: "clubexadrezguabiruba", obra: "Mate de Dama e Rei", mostrarCredito: true, direitoDosTextos: true }, FEN, "doug", AGORA);
  assert.ok(ligado.ok);
  const comCredito = executarComando(aula, { tipo: "REGISTRAR_PROVENIENCIA", analiseId: aula.analises[0].id, revisao: ligado.revisao }, {});
  assert.deepEqual(creditosDaAula(comCredito), ["Posição: clubexadrezguabiruba, Mate de Dama e Rei"]);
  const desligado = executarComando(aula, { tipo: "REGISTRAR_PROVENIENCIA", analiseId: aula.analises[0].id, revisao: { ...ligado.revisao, mostrarCredito: false } }, {});
  assert.deepEqual(creditosDaAula(desligado), []);
  // O que atravessa para o aluno continua sendo só as etapas: a revisão inteira não vai junto.
  assert.equal(JSON.stringify(etapasDoAlunoV2(comCredito, {}, {})).includes("revisadoEm"), false);
});
