/**
 * O escritor de PGN — §14 da especificação funcional e §11 do plano final.
 *
 * ## Por que metade destes testes não usa o leitor
 *
 * §11 é explícito: "corpus semântico usa também expectativas independentes de
 * posições e ramos: **reader e writer com o mesmo defeito podem passar em um
 * round-trip ingênuo**". Um par leitor/escritor que trocasse `!?` por `?!` nos
 * dois sentidos passaria num ciclo e estaria errado.
 *
 * Então há dois tipos de teste aqui, e os dois precisam existir:
 *
 * 1. **Expectativa independente**: o PGN esperado escrito à mão, caractere por
 *    caractere, a partir da regra do formato — numeração, variante, comentário.
 * 2. **Round-trip**: o ciclo PGN → editor → PGN → editor, conferindo que a
 *    segunda árvore é igual à primeira.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Position } from "../lesson/schema.ts";
import { aplicarImportacaoPgn, lerImportacaoPgn } from "./importar-pgn.ts";
import { pgnDaAnalise, pgnDaAula, pgnDaVariante, pgnDoCapitulo } from "./escrever-pgn.ts";
import type { AnaliseV2, AulaV2 } from "./modelo.ts";

const positions: Record<string, Position> = {};

function aulaVazia(): AulaV2 {
  return {
    schemaVersion: 2,
    id: "EX-PGN",
    titulo: "Ensaio do escritor",
    metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
    proveniencia: [],
    excecoes: [],
    analises: [],
    introducoes: [],
    capitulos: [],
    treinos: [],
    praticas: [],
    fluxo: [],
  };
}

/** Importa um PGN e devolve a aula com ele dentro. */
function importar(texto: string): AulaV2 {
  const relatorio = lerImportacaoPgn(texto);
  const resultado = aplicarImportacaoPgn(aulaVazia(), relatorio, relatorio.jogos.map((j) => j.numero));
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.mensagem);
  if (!resultado.ok) throw new Error("inalcançável");
  return resultado.aula;
}

/** A árvore como um objeto comparável: sem ids, que mudam de nome na cópia. */
function forma(analise: AnaliseV2, id = analise.raizId): unknown {
  const no = analise.nos[id];
  return {
    uci: no.uci ?? null,
    comentario: no.comentario ?? null,
    nags: no.nags ?? null,
    desenhos: no.desenhos ?? null,
    diretivas: no.diretivas ?? null,
    filhos: no.filhos.map((filho) => forma(analise, filho)),
  };
}

/* ------------------------------------------------------------------ *
 * Expectativas independentes
 * ------------------------------------------------------------------ */

test("o PGN da posição inicial padrão não escreve FEN nem SetUp, e numera como um livro", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    raizId: "no-0",
    nos: {
      "no-0": { id: "no-0", filhos: ["no-1"] },
      "no-1": { id: "no-1", uci: "e2e4", filhos: ["no-2"] },
      "no-2": { id: "no-2", uci: "e7e5", filhos: ["no-3"] },
      "no-3": { id: "no-3", uci: "g1f3", filhos: [] },
    },
  });
  const { texto } = pgnDaAnalise(aula, "analise-a", positions, { titulo: "Abertura" });
  assert.equal(texto, '[Event "Abertura"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 *\n');
});

test("a variante vem depois do lance que ela substitui, e o lance seguinte é renumerado", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    raizId: "no-0",
    nos: {
      "no-0": { id: "no-0", filhos: ["no-1"] },
      "no-1": { id: "no-1", uci: "e2e4", filhos: ["no-2", "no-4"] },
      "no-2": { id: "no-2", uci: "e7e5", filhos: [] },
      "no-4": { id: "no-4", uci: "c7c5", filhos: ["no-5"] },
      "no-5": { id: "no-5", uci: "g1f3", filhos: [] },
    },
  });
  const { texto } = pgnDaAnalise(aula, "analise-a", positions, { titulo: "Com variante" });
  assert.match(texto, /1\. e4 e5 \( 1\.\.\. c5 2\. Nf3 \) \*/);
});

test("o comentário obriga o número antes do lance das pretas que vem depois dele", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    raizId: "no-0",
    nos: {
      "no-0": { id: "no-0", filhos: ["no-1"] },
      "no-1": { id: "no-1", uci: "e2e4", filhos: ["no-2"], comentario: "O lance do centro." },
      "no-2": { id: "no-2", uci: "e7e5", filhos: [] },
    },
  });
  const { texto } = pgnDaAnalise(aula, "analise-a", positions, { titulo: "Com comentário" });
  assert.match(texto, /1\. e4 \{ O lance do centro\. \} 1\.\.\. e5 \*/);
});

test("os seis símbolos saem colados no SAN e os outros NAGs como $n", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    raizId: "no-0",
    nos: {
      "no-0": { id: "no-0", filhos: ["no-1"] },
      "no-1": { id: "no-1", uci: "e2e4", filhos: [], nags: [5, 140] },
    },
  });
  const { texto } = pgnDaAnalise(aula, "analise-a", positions, { titulo: "Com símbolo" });
  assert.match(texto, /1\. e4!\? \$140 \*/);
});

test("a FEN escrita é a de agora, e não a que veio no cabeçalho importado", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "4k3/8/8/8/8/4P3/8/4K3 w - - 0 1" },
    origemPgn: { tags: { Event: "Antes da troca", FEN: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", SetUp: "1" }, naoReconhecidos: [] },
    raizId: "no-0",
    nos: { "no-0": { id: "no-0", filhos: [] } },
  });
  const { texto } = pgnDaAnalise(aula, "analise-a", positions);
  assert.match(texto, /\[FEN "4k3\/8\/8\/8\/8\/4P3\/8\/4K3 w - - 0 1"\]/);
  assert.equal(texto.includes("4k3/8/8/8/8/8/4P3/4K3"), false, "a FEN antiga faria o primeiro lance ser ilegal");
  assert.match(texto, /\[SetUp "1"\]/);
});

test("a seta sem cor do material v1 sai em verde, e a perda é declarada", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    raizId: "no-0",
    nos: {
      "no-0": { id: "no-0", filhos: ["no-1"] },
      "no-1": { id: "no-1", uci: "e2e4", filhos: [], desenhos: { arrows: [["e2", "e4"]], highlights: ["d5"] } },
    },
  });
  const exportado = pgnDaAnalise(aula, "analise-a", positions, { titulo: "Material v1" });
  assert.match(exportado.texto, /\[%cal Ge2e4\]/);
  assert.match(exportado.texto, /\[%csl Gd5\]/);
  assert.deepEqual(exportado.perdas.map((p) => p.codigo), ["SETA_SEM_COR", "CASA_SEM_COR"]);
  assert.match(exportado.perdas[0].mensagem, /não declara cor/);
});

test("a chave no meio do comentário vira parêntese, e isso é anunciado", () => {
  const aula = aulaVazia();
  aula.analises.push({
    id: "analise-a",
    inicio: { tipo: "fen", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    raizId: "no-0",
    nos: {
      "no-0": { id: "no-0", filhos: ["no-1"] },
      "no-1": { id: "no-1", uci: "e2e4", filhos: [], comentario: "veja {isto}" },
    },
  });
  const exportado = pgnDaAnalise(aula, "analise-a", positions);
  assert.match(exportado.texto, /\{ veja \(isto\) \}/);
  assert.deepEqual(exportado.perdas.map((p) => p.codigo), ["CHAVE_NO_COMENTARIO"]);
});

/* ------------------------------------------------------------------ *
 * Round-trip
 * ------------------------------------------------------------------ */

const PGN_COMPLETO = `[Event "Estudo do Doug"]
[Site "https://lichess.org"]
[Variant "From Position"]
[SetUp "1"]
[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]
[Result "1-0"]

{ A posição de partida. [%csl Ye4] } 1. e4!? { O avanço duplo. [%cal Ge2e4,Rd1h5] [%clk 0:05:00] }
1... Ke7 (1... Kd7 2. Kd2 $140 { Uma alternativa. }) 2. Kd2 1-0
`;

test("o ciclo PGN → editor → PGN → editor devolve a mesma árvore", () => {
  const primeira = importar(PGN_COMPLETO);
  const exportado = pgnDaAnalise(primeira, primeira.analises[0].id, positions);
  const segunda = importar(exportado.texto);

  assert.deepEqual(forma(segunda.analises[0]), forma(primeira.analises[0]));
  assert.deepEqual(segunda.analises[0].inicio, primeira.analises[0].inicio, "a posição de partida atravessa o ciclo");
});

test("as cores dos desenhos atravessam inteiras, sem passar por annotations.ts", () => {
  const aula = importar(PGN_COMPLETO);
  const analise = aula.analises[0];
  const comDesenho = Object.values(analise.nos).find((no) => no.desenhos?.arrows)!;
  assert.deepEqual(comDesenho.desenhos, {
    arrows: [{ de: "e2", para: "e4", cor: "verde" }, { de: "d1", para: "h5", cor: "vermelho" }],
  });

  const { texto } = pgnDaAnalise(aula, analise.id, positions);
  assert.match(texto, /\[%cal Ge2e4,Rd1h5\]/, "verde continua G e vermelho continua R");
  assert.match(texto, /\[%csl Ye4\]/, "o amarelo da posição inicial também");
});

test("o NAG que a interface não edita e a diretiva opaca sobrevivem ao ciclo", () => {
  const aula = importar(PGN_COMPLETO);
  const { texto } = pgnDaAnalise(aula, aula.analises[0].id, positions);
  assert.match(texto, /\$140/, "um NAG sem botão na tela continua no arquivo");
  assert.match(texto, /\[%clk 0:05:00\]/, "diretiva desconhecida preservável continua opaca, e sai inteira");
  assert.match(texto, /\[Site "https:\/\/lichess\.org"\]/, "as tags do cabeçalho seguem junto");
  assert.match(texto, /\[Result "1-0"\]/);
  assert.match(texto, /1-0\n$/, "o resultado fecha o movetext, como o formato manda");
});

test("a cor que o editor não modela é guardada crua e reemitida — não morre no segundo ciclo", () => {
  const aula = importar(`[Event "Cor estranha"]\n\n1. e4 { [%cal Ce2e4] } *\n`);
  const no = Object.values(aula.analises[0].nos).find((item) => item.uci === "e2e4")!;
  assert.equal(no.desenhos, undefined, "o importador recusa a cor que não conhece, e anuncia a perda");
  assert.deepEqual(no.diretivas, ["[%cal Ce2e4]"]);

  const { texto } = pgnDaAnalise(aula, aula.analises[0].id, positions);
  assert.match(texto, /\[%cal Ce2e4\]/, "quem já perdeu na importação não pode perder de novo, agora em silêncio");
});

test("um desenho apagado pelo professor não ressuscita pela diretiva guardada", () => {
  const aula = importar(`[Event "Desenho apagado"]\n\n1. e4 { [%cal Ge2e4] [%clk 0:01:00] } *\n`);
  const analise = aula.analises[0];
  const id = Object.values(analise.nos).find((item) => item.uci === "e2e4")!.id;
  delete analise.nos[id].desenhos;

  const { texto } = pgnDaAnalise(aula, analise.id, positions);
  assert.equal(texto.includes("%cal"), false, "%cal é sempre reconstruído a partir de desenhos, que é o que o professor edita");
  assert.match(texto, /\[%clk 0:01:00\]/, "a diretiva opaca continua");
});

/* ------------------------------------------------------------------ *
 * As quatro saídas de §14
 * ------------------------------------------------------------------ */

test("copiar o PGN desta variante traz o percurso até o lance e o que nasce dele", () => {
  const aula = importar(PGN_COMPLETO);
  const analise = aula.analises[0];
  const kd7 = Object.values(analise.nos).find((no) => no.uci === "e8d7")!;

  const exportado = pgnDaVariante(aula, analise.id, kd7.id, positions);
  assert.match(exportado.texto, /\[FEN "4k3\/8\/8\/8\/8\/8\/4P3\/4K3 w - - 0 1"\]/, "§11: a variante exportada inclui a FEN do ponto de partida");
  assert.match(exportado.texto, /1\. e4!\?\s[\s\S]*1\.\.\. Kd7 2\. Kd2 \$140/, "a numeração é a da partida, não recomeça do 1");
  assert.equal(exportado.texto.includes("Ke7"), false, "a linha principal irmã fica de fora: o professor pediu esta variante");
});

test("o capítulo usa o título do capítulo no Event", () => {
  const aula = importar(PGN_COMPLETO);
  aula.capitulos[0].titulo = "Oposição distante";
  const { texto } = pgnDoCapitulo(aula, aula.capitulos[0].id, positions);
  assert.match(texto, /\[Event "Estudo do Doug"\]/, "o Event que veio no arquivo é preservado: ele é atribuição");
  assert.equal(texto.includes('[Event "Oposição distante"]'), false);
});

test("a aula inteira sai na ordem do fluxo, um jogo atrás do outro", () => {
  const aula = importar(`[Event "Primeiro"]\n\n1. e4 *\n\n[Event "Segundo"]\n\n1. d4 *\n`);
  // O fluxo manda: invertê-lo inverte o arquivo, sem mexer no cadastro.
  aula.fluxo.reverse();
  const { texto } = pgnDaAula(aula, positions);
  assert.ok(texto.indexOf('[Event "Segundo"]') < texto.indexOf('[Event "Primeiro"]'), "fluxo é a única fonte da ordem");
  assert.equal((texto.match(/\[Event /g) ?? []).length, 2);
});

test("a exportação diz, com número, o que o PGN não leva", () => {
  const aula = importar(PGN_COMPLETO);
  const { naoCabe } = pgnDaAnalise(aula, aula.analises[0].id, positions);
  assert.match(naoCabe[0], /^3 narrações ficam de fora/, "a importação criou uma narração por comentário, e nenhuma delas cabe no PGN");
  assert.match(naoCabe.at(-1)!, /pacote JSON v2/);
});
