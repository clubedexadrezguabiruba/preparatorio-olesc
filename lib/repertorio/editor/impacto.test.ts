import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { expandir } from "../arvore.ts";
import type { Cor, Linha, Nivel } from "../linhas.ts";
import { cascaDoArquivo, partidaDaAnalise } from "./adaptar.ts";
import { frasesDoImpactoDoRepertorio, impactoDoRepertorio } from "./impacto.ts";
import type { AnaliseV2 } from "../../editor-v2/modelo.ts";

/**
 * O impacto de aplicar, nas linhas reais da Escocesa — parada 8C.
 *
 * As edições são feitas na **árvore** (a casca do editor), e as linhas de antes e de
 * depois saem de `expandir`, como na compilação. Assim o teste mede o que o professor
 * faria pela tela, e não uma lista de linhas fabricada à mão.
 */

// A amostra é um arquivo ESCRITO À MÃO, com um jogo do Avançado. Foi a Escocesa até 18/9/2026, quando
// ela passou a ser gerada do estudo (tudo no Base).
const texto = readFileSync("content/repertorio/brancas-escandinava.pgn", "utf8");

function linhasDe(analises: AnaliseV2[]): Linha[] {
  return analises.flatMap((analise) => {
    const { partida } = partidaDaAnalise(analise);
    return expandir(partida, {
      abertura: partida.tags.Abertura,
      nome: partida.tags.Nome,
      cor: partida.tags.Cor as Cor,
      nivel: partida.tags.Nivel as Nivel,
      fonte: partida.tags.Fonte,
    }).linhas;
  });
}

/** O fim da linha principal de uma análise, e a posição nele. */
function pontaPrincipal(analise: AnaliseV2): { id: string; jogo: Chess } {
  const jogo = new Chess(analise.inicio.tipo === "fen" ? analise.inicio.fen : undefined);
  let id = analise.raizId;
  while (analise.nos[id].filhos.length > 0) {
    id = analise.nos[id].filhos[0];
    const uci = analise.nos[id].uci!;
    jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  }
  return { id, jogo };
}

function acrescentar(analise: AnaliseV2, paiId: string, uci: string, novoId: string): void {
  analise.nos[novoId] = { id: novoId, uci, filhos: [] };
  analise.nos[paiId].filhos.push(novoId);
}

const uciDe = (m: { from: string; to: string; promotion?: string }) => `${m.from}${m.to}${m.promotion ?? ""}`;

test("sem edição: nada muda, e a frase diz isso", () => {
  const casca = cascaDoArquivo("brancas-escandinava", texto);
  const impacto = impactoDoRepertorio(linhasDe(casca.aula.analises), linhasDe(structuredClone(casca.aula.analises)));
  assert.equal(impacto.semMudanca, true);
  assert.deepEqual(frasesDoImpactoDoRepertorio(impacto), ["Nada muda para o aluno: as linhas, os ids e os textos são os mesmos de hoje."]);
});

test("esticar a linha principal mata 1 id e cria 1; o Base fica do mesmo tamanho e mesmo assim re-tranca", () => {
  const casca = cascaDoArquivo("brancas-escandinava", texto);
  const antes = linhasDe(casca.aula.analises);
  const depois = structuredClone(casca.aula.analises);
  const { id, jogo } = pontaPrincipal(depois[0]);
  const dele = jogo.moves({ verbose: true })[0];
  jogo.move(dele);
  const nosso = jogo.moves({ verbose: true })[0];
  acrescentar(depois[0], id, uciDe(dele), "no-teste-1");
  acrescentar(depois[0], "no-teste-1", uciDe(nosso), "no-teste-2");

  const impacto = impactoDoRepertorio(antes, linhasDe(depois));
  assert.equal(impacto.morrem.length, 1);
  assert.equal(impacto.nascem.length, 1);
  assert.equal(impacto.base.antes, impacto.base.depois);
  // O id esticado não tem progresso de ninguém: quem tinha o Base completo deixa de ter. O
  // primeiro rascunho deste teste esperava o contrário — e o código estava certo.
  assert.equal(impacto.retrancaAvancado, true);

  const frases = frasesDoImpactoDoRepertorio(impacto, { registros: 1, alunos: 1 });
  assert.match(frases[0], /1 linha deixa de existir/);
  assert.equal(frases[1], "1 registro de 1 aluno fica guardado no banco, mas nenhuma tela o alcança mais.");
  assert.match(frasesDoImpactoDoRepertorio(impacto, null)[1], /o banco não respondeu/);
});

test("uma resposta nova do adversário no Base cria uma linha e re-tranca o Avançado, o nível 5 e o selo", () => {
  const casca = cascaDoArquivo("brancas-escandinava", texto);
  const antes = linhasDe(casca.aula.analises);
  const depois = structuredClone(casca.aula.analises);
  const analise = depois[0];
  // O primeiro lance do adversário na linha principal: 1...e5. Uma alternativa a ele.
  const e4 = analise.nos[analise.raizId].filhos[0];
  const jogo = new Chess();
  jogo.move("e4");
  const existentes = new Set(analise.nos[e4].filhos.map((f) => analise.nos[f].uci));
  const alternativa = jogo.moves({ verbose: true }).find((m) => !existentes.has(uciDe(m)))!;
  jogo.move(alternativa);
  const nosso = jogo.moves({ verbose: true })[0];
  acrescentar(analise, e4, uciDe(alternativa), "no-teste-a");
  acrescentar(analise, "no-teste-a", uciDe(nosso), "no-teste-b");

  const impacto = impactoDoRepertorio(antes, linhasDe(depois));
  assert.equal(impacto.nascem.length, 1);
  assert.equal(impacto.morrem.length, 0);
  assert.equal(impacto.base.depois, impacto.base.antes + 1);
  assert.equal(impacto.retrancaAvancado, true);
  assert.ok(frasesDoImpactoDoRepertorio(impacto).some((f) => f.includes("o Avançado") && f.includes("nível 5")));
});

test("editar um comentário: mesmo id, texto mudou, progresso fica", () => {
  const casca = cascaDoArquivo("brancas-escandinava", texto);
  const antes = linhasDe(casca.aula.analises);
  const depois = structuredClone(casca.aula.analises);
  const no = Object.values(depois[1].nos).find((n) => n.comentario)!;
  no.comentario = `${no.comentario} E mais uma frase.`;
  const impacto = impactoDoRepertorio(antes, linhasDe(depois));
  assert.deepEqual([impacto.nascem.length, impacto.morrem.length], [0, 0]);
  assert.ok(impacto.textoMudou >= 1);
  assert.equal(impacto.retrancaAvancado, false);
});

test("trocar o nível de um jogo inteiro: os ids ficam e a mudança é dita linha a linha", () => {
  const casca = cascaDoArquivo("brancas-escandinava", texto);
  const antes = linhasDe(casca.aula.analises);
  const depois = structuredClone(casca.aula.analises);
  const avancado = depois.find((a) => a.origemPgn!.tags.Nivel === "avancado")!;
  avancado.origemPgn!.tags.Nivel = "base";
  const impacto = impactoDoRepertorio(antes, linhasDe(depois));
  assert.ok(impacto.mudamDeNivel.length >= 1);
  assert.ok(impacto.mudamDeNivel.every((m) => m.de === "avancado" && m.para === "base"));
  assert.equal(impacto.retrancaAvancado, true);
});
