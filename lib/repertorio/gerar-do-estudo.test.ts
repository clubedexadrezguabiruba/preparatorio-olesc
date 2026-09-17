/**
 * O PGN do repertório gerado a partir do estudo v1.5 — parada medível da F2b (16/9/2026): as linhas
 * chegam na ordem do estudo, os símbolos não se perdem, e lance sem comentário não reprova (17/9/2026).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lerCursoDeAbertura } from "../editor-v2/curso-de-abertura.ts";
import { compilarRepertorio } from "./compilar.ts";
import { gerarPgnDoEstudo } from "./gerar-do-estudo.ts";
import { conferirMarcasDasFontes } from "./marcas-das-fontes.ts";

const DADOS = { abertura: "francesa", nome: "Francesa 3.Bd3", nivel: "base" } as const;
const LICHESS = readFileSync("e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn", "utf8");

const compilar = (texto: string) => {
  const gerado = gerarPgnDoEstudo(lerCursoDeAbertura(texto, "brancas"), DADOS, new Date("2026-09-16T00:00:00Z"));
  return { gerado, compilacao: compilarRepertorio([{ nome: "brancas-francesa.pgn", texto: gerado.texto }], []) };
};

test("do estudo como está, o repertório compila na ordem do estudo, com categoria", () => {
  // O estudo tem 4 lances nossos sem comentário (1.e4, 11.Nf3, 12.Qxf3, 11.a3). Até 17/9/2026
  // eles reprovavam; desde a decisão do Doug o comentário é opcional e o estudo compila como está.
  const { gerado, compilacao } = compilar(LICHESS);
  assert.equal(gerado.linhas, 19);
  assert.deepEqual(gerado.problemas, []);
  assert.deepEqual(compilacao.problemas, []);
  const linhas = compilacao.linhas;
  assert.equal(linhas.length, 19);
  assert.deepEqual(linhas.map((l) => l.ordem), linhas.map((_, i) => i + 1), "E22A → E22P, na ordem dos capítulos");
  assert.equal(linhas[0].categoria, "arma");
  assert.equal(linhas.at(-1)!.categoria, "se-esquecer");
  assert.equal(linhas[0].nome, "Francesa 3.Bd3 — Arma: 3.Bd3");
  assert.equal(linhas[0].lances.length, 5, "a linha curta da arma é linha própria");
  assert.match(gerado.texto, /^; GERADO — não editar/);

  // Decisão 8: 5.dxc5!? e 5.Nf3!? da B09 valem como «também vale» na linha do 5.c3.
  const c3 = linhas.find((l) => l.lances.join(" ") === "e2e4 e7e6 d2d4 d7d5 f1d3 c7c5 e4d5 e6d5 c2c3")!;
  assert.deepEqual([...c3.alternativas["8"]].sort(), ["d4c5", "g1f3"]);
  assert.equal(c3.marcas?.["8"], "!");
  // E os símbolos de um capítulo valem em todos: 3.Bd3! da A00 marca também o esquema.
  assert.equal(linhas[1].marcas?.["4"], "!");
});

test("marcas-das-fontes: estudo → PGN gerado, nenhum símbolo faltando e nenhum irmão nosso marcado cortado", () => {
  const { gerado } = compilar(LICHESS);
  const conferencia = conferirMarcasDasFontes(
    [{ nome: "estudo-brancas-francesa.pgn", texto: LICHESS }],
    [{ nome: "brancas-francesa.pgn", texto: gerado.texto }],
  );
  assert.deepEqual(conferencia.faltando.map((m) => `${m.lance} ${m.marcas.join(" ")}`), []);
  assert.deepEqual(conferencia.irmaoNossoCortado.map((m) => `${m.lance} ${m.marcas.join(" ")}`), []);
});

test("gerar duas vezes o mesmo estudo dá o mesmo texto", () => {
  assert.equal(compilar(LICHESS).gerado.texto, compilar(LICHESS).gerado.texto);
});
