/**
 * O PGN do repertório gerado a partir do estudo v1.5 — parada medível da F2b (16/9/2026): as linhas
 * chegam na ordem do estudo, os símbolos não se perdem, e só os 4 lances mudos reprovam.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lerCursoDeAbertura } from "../editor-v2/curso-de-abertura.ts";
import { compilarRepertorio } from "./compilar.ts";
import { gerarPgnDoEstudo } from "./gerar-do-estudo.ts";
import { estudoComOsMudosComentados } from "./estudo-francesa-de-teste.ts";
import { conferirMarcasDasFontes } from "./marcas-das-fontes.ts";

const DADOS = { abertura: "francesa", nome: "Francesa 3.Bd3", nivel: "base" } as const;
const LICHESS = readFileSync("e2e/fixtures/lichess-francesa-v15-qq2xorDl.pgn", "utf8");

const compilar = (texto: string) => {
  const gerado = gerarPgnDoEstudo(lerCursoDeAbertura(texto, "brancas"), DADOS, new Date("2026-09-16T00:00:00Z"));
  return { gerado, compilacao: compilarRepertorio([{ nome: "brancas-francesa.pgn", texto: gerado.texto }], []) };
};

test("do estudo como está: 19 linhas, e só os 4 lances mudos reprovam", () => {
  const { gerado, compilacao } = compilar(LICHESS);
  assert.equal(gerado.linhas, 19);
  assert.deepEqual(gerado.problemas, []);
  const texto = compilacao.problemas.join("\n");
  const noMeio = new Set(texto.match(/\d+\.(?:e4|Nf3|Qxf3)\b/g));
  assert.deepEqual([...noMeio].sort(), ["1.e4", "11.Nf3", "12.Qxf3"]);
  // 11.a3 é o último lance da linha do (10...a6): o compilador o diz com a outra frase.
  assert.match(texto, /o último lance \("a3"\) está sem comentário/);
  assert.equal(texto.match(/o último lance \("[^"]+"\) está sem comentário/g)?.length, 1, "nenhum outro fim de linha mudo");
  assert.doesNotMatch(compilacao.problemas.join("\n"), /termina em|mesma sequência|não é lance legal/);
});

test("com os mudos comentados no Lichess, o repertório compila na ordem do estudo, com categoria", () => {
  const { gerado, compilacao } = compilar(estudoComOsMudosComentados(LICHESS));
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
  const { gerado } = compilar(estudoComOsMudosComentados(LICHESS));
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
