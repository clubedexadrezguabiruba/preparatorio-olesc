/**
 * Nova aula (§5.2) e a lista de revisões pendentes (§19.2).
 *
 * As duas fatias moram no mesmo teste porque provam a mesma coisa por ângulos
 * diferentes: que o editor não deixa o professor num beco. Uma aula sem capítulo
 * precisa ser um documento válido; uma marca de revisão precisa ter botão.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Position } from "../lesson/schema.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico } from "./comandos.ts";
import { idDaNovaAula, prepararNovaAula } from "./nova-aula.ts";
import { revisoesPendentesV2 } from "./revisoes.ts";
import { problemasDaAulaV2, validarAulaV2, type AulaV2 } from "./modelo.ts";

const positions: Record<string, Position> = {};

const pedido = {
  titulo: "Peão de torre na sétima",
  tipo: "curso" as const,
  nivel: 2,
  orientacaoPadrao: "white" as const,
  criterioDominio: "D1" as const,
};

/* ------------------------------------------------------------------ *
 * Nova aula
 * ------------------------------------------------------------------ */

test("o identificador sai do título e do nível, com os acentos resolvidos", () => {
  assert.equal(idDaNovaAula(pedido), "N2-PEAO-DE-TORRE-NA-SETIMA");
  assert.equal(idDaNovaAula({ ...pedido, tipo: "extra" }), "EX-PEAO-DE-TORRE-NA-SETIMA", "a extra usa o namespace de §22");
  assert.equal(idDaNovaAula({ ...pedido, titulo: "  " }), "", "sem título não há identificador para mostrar");
});

test("a aula nova nasce vazia e é um documento v2 válido", () => {
  const preparo = prepararNovaAula(pedido, new Set());
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;

  assert.equal(preparo.aula.id, "N2-PEAO-DE-TORRE-NA-SETIMA");
  assert.equal(preparo.aula.titulo, "Peão de torre na sétima");
  assert.deepEqual(preparo.aula.capitulos, []);
  assert.deepEqual(preparo.aula.fluxo, []);
  assert.equal(
    validarAulaV2(preparo.aula, positions).ok,
    true,
    "§7 do plano: o rascunho aceita pendência identificada, e aula vazia é uma delas",
  );
  assert.deepEqual(problemasDaAulaV2(preparo.aula, positions), [], "e não sobra aviso de aula vazia para o professor ignorar");
});

test("a aula extra declara o nível no documento, porque o id dela não o traz", () => {
  const preparo = prepararNovaAula({ ...pedido, tipo: "extra", nivel: 3 }, new Set());
  assert.equal(preparo.ok, true);
  if (!preparo.ok) return;
  assert.equal(preparo.aula.id, "EX-PEAO-DE-TORRE-NA-SETIMA");
  assert.equal(preparo.aula.metadados?.nivel, 3);

  const doCurso = prepararNovaAula(pedido, new Set());
  assert.equal(doCurso.ok, true);
  if (!doCurso.ok) return;
  assert.equal(doCurso.aula.metadados?.nivel, undefined, "o N2 do id já diz o nível: duas fontes seriam duas respostas");
});

test("título vazio, nível fora da escala e id repetido são recusados apontando o campo", () => {
  const semTitulo = prepararNovaAula({ ...pedido, titulo: "   " }, new Set());
  assert.equal(semTitulo.ok, false);
  if (!semTitulo.ok) assert.equal(semTitulo.campo, "titulo");

  const semNivel = prepararNovaAula({ ...pedido, nivel: 9 }, new Set());
  assert.equal(semNivel.ok, false);
  if (!semNivel.ok) assert.equal(semNivel.campo, "nivel");

  const repetido = prepararNovaAula(pedido, new Set(["N2-PEAO-DE-TORRE-NA-SETIMA"]));
  assert.equal(repetido.ok, false);
  if (!repetido.ok) {
    assert.equal(repetido.campo, "titulo");
    assert.match(repetido.mensagem, /já existe/);
  }

  const soPontuacao = prepararNovaAula({ ...pedido, titulo: "??? ---" }, new Set());
  assert.equal(soPontuacao.ok, false);
  if (!soPontuacao.ok) assert.equal(soPontuacao.campo, "titulo");
});

/* ------------------------------------------------------------------ *
 * Revisões pendentes
 * ------------------------------------------------------------------ */

function aulaComMarcas(): AulaV2 {
  return {
    schemaVersion: 2,
    id: "EX-REVISOES",
    titulo: "Ensaio das revisões",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    proveniencia: [],
    excecoes: [],
    analises: [{
      id: "analise-a",
      inicio: { tipo: "fen", fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1" },
      raizId: "no-a-0",
      nos: {
        "no-a-0": { id: "no-a-0", filhos: ["no-a-1"] },
        "no-a-1": { id: "no-a-1", uci: "e2e4", filhos: [], comentario: "O rei branco já está na oposição.", revisao: { motivo: "posicao-inicial-trocada" } },
      },
    }],
    introducoes: [{
      id: "introducao-a",
      titulo: "Antes de começar",
      quadros: [{
        id: "quadro-1",
        texto: "Repare no peão em e2.",
        posicao: { tipo: "fen", fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1" },
        revisao: { motivo: "posicao-inicial-trocada" },
      }],
    }],
    capitulos: [{
      id: "capitulo-a",
      titulo: "O peão anda",
      analiseId: "analise-a",
      inicioNodeId: "no-a-0",
      caminho: ["no-a-1"],
      orientacao: "white",
      narracoes: [{ id: "narracao-1", nodeId: "no-a-1", texto: "Duas casas de uma vez.", pausa: "temporizada", revisao: { motivo: "posicao-inicial-trocada" } }],
    }],
    treinos: [],
    praticas: [],
    fluxo: [
      { id: "etapa-introducao", tipo: "introducao", entidadeId: "introducao-a" },
      { id: "etapa-a", tipo: "capitulo", entidadeId: "capitulo-a" },
    ],
  };
}

test("a lista traz os três tipos de marca, com o trecho e o endereço de cada uma", () => {
  const lista = revisoesPendentesV2(aulaComMarcas());
  assert.deepEqual(lista.map((item) => item.tipo), ["quadro da introdução", "comentário", "narração"]);
  assert.equal(lista[0].onde, "1º quadro de «Antes de começar»");
  assert.equal(lista[0].trecho, "Repare no peão em e2.");
  assert.equal(lista[1].onde, "um lance de «O peão anda»");
  assert.equal(lista[1].trecho, "O rei branco já está na oposição.");
  assert.deepEqual(lista[2].destino, { capituloId: "capitulo-a", analiseId: "analise-a", nodeId: "no-a-1" }, "a narração leva a tela até o lance dela");
});

test("o quadro da introdução, que antes não tinha botão, agora se resolve", () => {
  const aula = aulaComMarcas();
  const depois = executarComando(aula, { tipo: "REVISAO_RESOLVIDA", alvo: { introducaoId: "introducao-a", quadroId: "quadro-1" } }, positions);
  assert.equal(depois.introducoes[0].quadros[0].revisao, undefined);
  assert.equal(revisoesPendentesV2(depois).length, 2, "as outras duas continuam pendentes");
});

test("«Já reli todas» é uma ação só no histórico", () => {
  const aula = aulaComMarcas();
  const alvos = revisoesPendentesV2(aula).map((item) => item.alvo);

  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, { tipo: "REVISOES_RESOLVIDAS", alvos }, positions));
  assert.deepEqual(revisoesPendentesV2(historico.presente), []);
  assert.equal(historico.passados.length, 1, "três marcas, um passo");

  historico = desfazer(historico);
  assert.deepEqual(historico.presente, aula, "e um Ctrl+Z devolve as três");
});

test("o desenho sem comentário também é listado, e diz que o que mudou foi o desenho", () => {
  const aula = aulaComMarcas();
  delete aula.analises[0].nos["no-a-1"].comentario;
  aula.analises[0].nos["no-a-1"].desenhos = { arrows: [{ de: "e2", para: "e4", cor: "verde" }] };
  const lista = revisoesPendentesV2(aula);
  assert.match(lista[1].trecho, /desenhos desta posição/);
});
