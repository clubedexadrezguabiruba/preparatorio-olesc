import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { CURADORIA } from "./curadoria.ts";
import { problemasDasPartidas } from "./conferir.ts";
import type { Ficha } from "./ficha.ts";
import { lerPartidas } from "./ler.ts";
import { julgarResposta } from "./momentos.ts";
import { montarPartida, type Partida } from "./montar.ts";

/**
 * As partidas modelo de `content/partidas/`, cobradas a cada `npm test`.
 *
 * Duas metades. A primeira mede o conteúdo real. A segunda prova que cada trava
 * **morde**: uma partida de mentira, certa, e uma versão quebrada de cada jeito
 * que a trava promete pegar — sem isso, uma trava que nunca reprova passaria
 * por verde.
 */

const raiz = process.cwd();
const fontes = new Set<string>(
  (JSON.parse(readFileSync(path.join(raiz, "content", "sources.json"), "utf8")) as {
    sources: { slug: string }[];
  }).sources.map((s) => s.slug),
);

test("as partidas de content/partidas/ passam na trava inteira", () => {
  const { partidas, problemas } = lerPartidas(raiz);
  const todos = [...problemas, ...problemasDasPartidas(partidas, fontes)];
  assert.ok(todos.length === 0, `${todos.length} problema(s):\n  ${todos.join("\n  ")}`);
});

test("a curadoria tem 15 partidas, 3 por nível, e 80 momentos", () => {
  assert.equal(CURADORIA.length, 15);
  for (const nivel of [1, 2, 3, 4, 5]) {
    assert.equal(CURADORIA.filter((p) => p.nivel === nivel).length, 3, `nível ${nivel}`);
  }
  assert.equal(CURADORIA.reduce((n, p) => n + p.momentos, 0), 80);
});

/* ------------------------------------------------------------------ *
 * A trava morde
 * ------------------------------------------------------------------ */

// Morphy–Isouard até 12.O-O-O, com um momento no 10.Nxb5 (ply 18).
const PGN = `[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[Nome "Morphy × Isouard"]
[Ordem "1"]
[Nivel "1"]
[Cor "brancas"]
[Tema "Rei no centro"]
[FonteSlug "weeramantry-eusebi-1993"]
[Fonte "Weeramantry & Eusebi"]
[Status "rascunho"]

1. e4 e5 2. Nf3 d6 3. d4! Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5! {[%autoria ANÁLISE DO PROJETO] O cavalo abre as linhas.} cxb5
11. Bxb5+ Nbd7 12. O-O-O 1-0`;

const FICHA: Ficha = {
  slug: "morphy-isouard",
  intro: ["Uma partida curta."],
  objetivos: ["Contar as peças em jogo."],
  momentoFinal: ["O rei ficou no centro."],
  resumo: ["Desenvolva primeiro."],
  perguntas: ["Por que o rei sofreu?"],
  fonte: { slug: "weeramantry-eusebi-1993", referencia: "pp. 153–154" },
  marcasDaFonte: [{ lance: "3.d4", simbolo: "!" }, { lance: "10.Nxb5", simbolo: "!" }],
  correcoes: [],
  momentos: [
    {
      n: 1,
      titulo: "Abrir linhas",
      ply: 18,
      fen: "rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10",
      lado: "brancas",
      pergunta: "O bispo foi atacado. O que você faz?",
      san: "Nxb5",
      uci: "c3b5",
      desafioFinal: true,
      ideia: "O sacrifício compra linhas.",
      feedback: "Conte o que você recebe.",
      alternativas: "",
      alternativasBoas: [],
      autoria: "ANÁLISE DO PROJETO",
    },
  ],
};

function montar(pgn: string, ficha: unknown): { partida: Partida; problemas: string[] } {
  const m = montarPartida("morphy-isouard", pgn, ficha);
  assert.ok(m.partida, `a fixture não montou: ${m.problemas.join("; ")}`);
  return { partida: m.partida, problemas: m.problemas };
}

/** Os problemas da fixture que não são sobre a contagem da curadoria. */
function problemas(pgn: string, ficha: unknown): string[] {
  const { partida, problemas: deMontar } = montar(pgn, ficha);
  return [...deMontar, ...problemasDasPartidas([partida], new Set(["weeramantry-eusebi-1993"]))].filter(
    (p) => !p.startsWith("curadoria:") && !/momentos, e a curadoria diz/.test(p),
  );
}

const comMomento = (mudar: Partial<Ficha["momentos"][number]>): Ficha => ({
  ...FICHA,
  momentos: [{ ...FICHA.momentos[0], ...mudar }],
});

test("a fixture certa não tem problema nenhum", () => {
  assert.deepEqual(problemas(PGN, FICHA), []);
});

test("reprova: FEN do momento que não é a da partida no ply", () => {
  const achados = problemas(PGN, comMomento({ ply: 16 }));
  assert.ok(achados.some((p) => p.includes("a FEN não é a da partida")), achados.join("\n"));
});

test("reprova: lance esperado que não foi o jogado", () => {
  const achados = problemas(PGN, comMomento({ san: "Bxb5+", uci: "c4b5" }));
  assert.ok(achados.some((p) => p.includes("na partida foi Nxb5")), achados.join("\n"));
});

test("reprova: alternativa boa ilegal, ou igual ao lance esperado", () => {
  const ilegal = problemas(PGN, comMomento({ alternativasBoas: ["a1a8"] }));
  assert.ok(ilegal.some((p) => p.includes("não é lance legal")), ilegal.join("\n"));
  const igual = problemas(PGN, comMomento({ alternativasBoas: ["c3b5"] }));
  assert.ok(igual.some((p) => p.includes("é o próprio lance esperado")), igual.join("\n"));
});

test("reprova: zero ou dois Desafios finais", () => {
  const zero = problemas(PGN, comMomento({ desafioFinal: false }));
  assert.ok(zero.some((p) => p.includes("0 Desafios finais")), zero.join("\n"));
  const dois: Ficha = {
    ...FICHA,
    momentos: [
      { ...FICHA.momentos[0], ply: 16, fen: "rn2kb1r/pp2qppp/2p2n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R w KQkq - 0 9", san: "Bg5", uci: "c1g5", n: 1 },
      { ...FICHA.momentos[0], n: 2 },
    ],
  };
  const achados = problemas(PGN, dois);
  assert.ok(achados.some((p) => p.includes("2 Desafios finais")), achados.join("\n"));
});

test("reprova: símbolo da ficha que sumiu do PGN — mesmo em lance que não é momento", () => {
  const achados = problemas(PGN.replace("3. d4!", "3. d4"), FICHA);
  assert.ok(achados.some((p) => p.includes('3.d4 perdeu o símbolo "!"')), achados.join("\n"));
});

test("aceita: `$1` no PGN vale o `!` da ficha", () => {
  assert.deepEqual(problemas(PGN.replace("3. d4!", "3. d4 $1"), FICHA), []);
});

test("reprova: fonte que não está em sources.json", () => {
  const pgn = PGN.replace("weeramantry-eusebi-1993", "livro-inventado");
  const ficha = { ...FICHA, fonte: { ...FICHA.fonte, slug: "livro-inventado" } };
  const achados = problemas(pgn, ficha);
  assert.ok(achados.some((p) => p.includes("não está em content/sources.json")), achados.join("\n"));
});

test("reprova: rótulo de nível antigo e frase errada conhecida", () => {
  const rotulo = problemas(PGN, { ...FICHA, intro: ["[Essencial] Uma partida curta."] });
  assert.ok(rotulo.some((p) => p.includes("rótulo de profundidade")), rotulo.join("\n"));
  const cheque = problemas(PGN.replace("O cavalo abre", "O cheque abre"), FICHA);
  assert.ok(cheque.some((p) => p.includes('é "xeque"')), cheque.join("\n"));
});

test("reprova: notação inglesa na prosa do aluno", () => {
  const achados = problemas(PGN, { ...FICHA, resumo: ["Depois de 10.Nxb5 o rei sofre."] });
  assert.ok(achados.some((p) => p.includes("notação inglesa")), achados.join("\n"));
});

test("lance citado: o jogado e um legal naquele ponto passam; o que não cabe reprova", () => {
  assert.deepEqual(problemas(PGN, { ...FICHA, resumo: ["Depois de 10.Cxb5! cxb5 11.Bxb5+ o rei sofre."] }), []);
  assert.deepEqual(problemas(PGN, { ...FICHA, resumo: ["O 10.Bxb5 também era possível."] }), []);
  const numero = problemas(PGN, { ...FICHA, resumo: ["O 11.Cxb5 abriu tudo."] });
  assert.ok(numero.some((p) => p.includes("lance citado fora da partida — 11.Cxb5")), numero.join("\n"));
});

test("reprova: o campo `nivel` do piloto antigo", () => {
  const m = montarPartida("morphy-isouard", PGN, comMomento({ nivel: "essencial" } as never));
  assert.equal(m.partida, null);
  assert.ok(m.problemas.some((p) => p.includes("nivel")), m.problemas.join("\n"));
});

test("reprova: SAN não canônico, variação e comentário sem autoria", () => {
  const san = problemas(PGN.replace("Nbd7 12.", "Nbd7 12.").replace("5. Qxf3", "5. Qdxf3"), FICHA);
  assert.ok(san.some((p) => p.includes("não é SAN canônico")), san.join("\n"));
  const variacao = problemas(PGN.replace("cxb5\n", "cxb5 (10... Qb4) \n"), FICHA);
  assert.ok(variacao.some((p) => p.includes("só a linha principal")), variacao.join("\n"));
  const autoria = problemas(PGN.replace("[%autoria ANÁLISE DO PROJETO] ", ""), FICHA);
  assert.ok(autoria.some((p) => p.includes("sem [%autoria")), autoria.join("\n"));
});

test("o símbolo `!` do lance do aluno vai para a Linha, e o resto fica em nags", () => {
  const { partida } = montar(PGN.replace("Nbd7", "Nbd7?!"), FICHA);
  assert.equal(partida.linha.marcas?.["18"], "!");
  assert.deepEqual(partida.nags["21"], ["?!"]);
  assert.equal(partida.linha.marcas?.["21"], undefined);
  assert.equal(partida.linha.comentarios["18"], "O cavalo abre as linhas.");
  assert.equal(partida.autorias["18"], "ANÁLISE DO PROJETO");
});

test("julgarResposta: certo, boa e errado", () => {
  const m = { uci: "c3b5", alternativasBoas: ["c4b5"] };
  assert.equal(julgarResposta(m, "c3b5"), "certo");
  assert.equal(julgarResposta(m, "c4b5"), "boa");
  assert.equal(julgarResposta(m, "g5f6"), "errado");
});
