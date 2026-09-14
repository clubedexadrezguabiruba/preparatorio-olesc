/**
 * Jogar a continuação no fim do percurso estende o capítulo — fatia 10, achado ao preparar a aula do zero.
 *
 * Antes, um capítulo criado do zero ficava com o percurso vazio para sempre: os lances iam para a
 * análise, e o capítulo não tinha lance para narrar, treinar nem mostrar na prévia.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico } from "./comandos.ts";
import type { AulaV2 } from "./modelo.ts";
import { podeNarrar } from "./narracoes.ts";
import { aplicarNovoCapitulo, prepararNovoCapitulo } from "./novo-capitulo.ts";

function aulaDoZero(): AulaV2 {
  const vazia: AulaV2 = {
    schemaVersion: 2, id: "EX-ZERO", titulo: "Zero",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho", nivel: 1, classe: "E" },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  };
  const preparo = prepararNovoCapitulo(vazia, { nome: "O L e a caixa", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", orientacao: "white" });
  assert.ok(preparo.ok);
  const r = aplicarNovoCapitulo(vazia, preparo.novo);
  assert.ok(r.ok);
  return r.aula;
}

test("a linha jogada no fim do percurso entra no capítulo; a variante não", () => {
  const aula = aulaDoZero();
  const capitulo = aula.capitulos[0];
  let h = iniciarHistorico(aula);
  const jogar = (nodeId: string, uci: string, novo: string) => { h = aplicarNoHistorico(h, executarComando(h.presente, { tipo: "ADICIONAR_LANCE", analiseId: capitulo.analiseId, nodeId, uci, novoNodeId: novo, capituloId: capitulo.id }, {})); };
  jogar(capitulo.inicioNodeId, "d1d3", "n-1");
  jogar("n-1", "e5e6", "n-2");
  assert.deepEqual(h.presente.capitulos[0].caminho, ["n-1", "n-2"]);
  assert.equal(podeNarrar(h.presente.capitulos[0], "n-2"), true, "o lance jogado pode ser narrado");

  // Variante: outro lance a partir de n-1 não entra no percurso.
  jogar("n-1", "e5f6", "n-3");
  assert.deepEqual(h.presente.capitulos[0].caminho, ["n-1", "n-2"]);
  // Continuação no meio do percurso também não (o percurso já segue por n-2).
  jogar("n-3", "d3d4", "n-4");
  assert.deepEqual(h.presente.capitulos[0].caminho, ["n-1", "n-2"]);

  h = desfazer(desfazer(desfazer(h)));
  assert.deepEqual(h.presente.capitulos[0].caminho, ["n-1"]);
});
