/**
 * O importador de PGN — leitura, perdas, recusas e o lote transacional (§11).
 *
 * ## Por que as expectativas são escritas à mão, e não colhidas do leitor
 *
 * O plano avisa: "reader e writer com o mesmo defeito podem passar em um round-trip
 * ingênuo". Se o teste perguntasse ao próprio importador quais lances ele achou, um
 * importador que perde metade da partida passaria feliz. Então aqui os lances esperados
 * estão **digitados**, em UCI, e a árvore montada é confrontada com eles.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Chess } from "chess.js";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { mapaDaAnalise } from "./arvore.ts";
import { aplicarImportacaoPgn, lerImportacaoPgn, medirImportacao } from "./importar-pgn.ts";
import { LIMITES_V2 } from "./limites.ts";
import { problemasDaAulaV2, validarAulaV2, type AnaliseV2, type AulaV2 } from "./modelo.ts";

/** Um capítulo no formato que o Lichess exporta: FEN, comentário de abertura e variantes. */
const CAPITULO_LICHESS = `[Event "Estudo de ensaio"]
[Variant "Standard"]
[ChapterName "Afogamento no peão de cavalo"]
[FEN "8/8/8/8/8/5kp1/7K/8 w - - 0 1"]
[SetUp "1"]
[Result "1/2-1/2"]

{ O rei preto quer apoiar o peão. } 1. Kh1 { Oposição diagonal. } (1. Kg1 { Perde. }) (1. Kh3 { Também perde. }) 1... Kf2 { Afogamento. } (1... Kg4 2. Kg2 { O rei volta. }) 1/2-1/2`;

const aulaVazia = (): AulaV2 => ({
  schemaVersion: 2,
  id: "EX-ENSAIO",
  titulo: "aula de ensaio",
  metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" },
  proveniencia: [],
  excecoes: [],
  analises: [],
  introducoes: [],
  capitulos: [],
  treinos: [],
  praticas: [],
  fluxo: [],
});

/** Os lances de uma análise, em UCI, na ordem em que o percurso em profundidade os vê. */
function ucisDaArvore(analise: AnaliseV2): string[] {
  const saida: string[] = [];
  const andar = (id: string) => {
    for (const filhoId of analise.nos[id].filhos) {
      saida.push(analise.nos[filhoId].uci!);
      andar(filhoId);
    }
  };
  andar(analise.raizId);
  return saida;
}

test("um capítulo do Lichess vira análise e capítulo, com a árvore que o PGN descreve", () => {
  const relatorio = lerImportacaoPgn(CAPITULO_LICHESS);
  assert.equal(relatorio.jogos.length, 1);
  const jogo = relatorio.jogos[0];
  assert.equal(jogo.recusa, null);
  assert.equal(jogo.titulo, "Afogamento no peão de cavalo");
  assert.deepEqual(jogo.perdas, []);

  // Expectativa independente: 2 lances na principal, 3 variantes (duas de um lance e
  // uma de dois), 6 lances no total. Contado no texto do PGN, não perguntado ao código.
  assert.equal(jogo.lances, 6);
  assert.equal(jogo.variantes, 3);
  assert.deepEqual(ucisDaArvore(jogo.analise!), ["h2h1", "f3f2", "f3g4", "h1g2", "h2g1", "h2h3"]);

  // A posição de partida veio da tag FEN, não de um arquivo de posição do currículo.
  assert.deepEqual(jogo.analise!.inicio, { tipo: "fen", fen: "8/8/8/8/8/5kp1/7K/8 w - - 0 1" });
  assert.equal(jogo.analise!.origemPgn?.tags.ChapterURL, undefined);
  assert.equal(jogo.analise!.origemPgn?.tags.ChapterName, "Afogamento no peão de cavalo");
  assert.equal(jogo.analise!.origemPgn?.resultado, "1/2-1/2");

  // O comentário antes do primeiro lance é do jogo inteiro: mora na raiz.
  assert.equal(jogo.analise!.nos[jogo.analise!.raizId].comentario, "O rei preto quer apoiar o peão.");
  // O percurso do capítulo é só a linha principal — as variantes ficam de fora dele.
  assert.equal(jogo.capitulo!.caminho.length, 2);
  assert.equal(jogo.capitulo!.orientacao, "white");
});

test("a variante pendura no pai do lance, e não no lance — é o que o parêntese quer dizer", () => {
  // `1. Kh1 (1. Kg1)` quer dizer "em vez de Kh1, Kg1": os dois saem da **mesma**
  // posição. Pendurar Kg1 em Kh1 produziria uma linha `Kh1 Kg1`, que nem é legal.
  const analise = lerImportacaoPgn(CAPITULO_LICHESS).jogos[0].analise!;
  const raiz = analise.nos[analise.raizId];
  assert.equal(raiz.filhos.length, 3, "Kh1, Kg1 e Kh3 são irmãos");
  assert.deepEqual(raiz.filhos.map((id) => analise.nos[id].uci), ["h2h1", "h2g1", "h2h3"]);
});

test("todo lance importado é jogável — o tabuleiro percorre a árvore inteira", () => {
  const relatorio = lerImportacaoPgn(CAPITULO_LICHESS);
  const resultado = aplicarImportacaoPgn(aulaVazia(), relatorio, [1]);
  assert.ok(resultado.ok);
  const mapa = mapaDaAnalise(resultado.aula, resultado.aula.analises[0].id, {});
  assert.equal(Object.keys(mapa.sans).length, 6);
  assert.equal(mapa.sans[resultado.aula.capitulos[0].caminho[0]], "Kh1");
});

test("lance impossível corta o ramo e deixa os irmãos em pé", () => {
  // `2... Qh8` numa posição sem dama preta: o ramo morre ali, e a variante ao lado entra.
  const torto = `[FEN "8/8/8/8/8/5kp1/7K/8 w - - 0 1"]
[SetUp "1"]

1. Kh1 Qh8 (1... Kf2) *`;
  const jogo = lerImportacaoPgn(torto).jogos[0];
  assert.equal(jogo.recusa, null);
  assert.equal(jogo.lances, 2, "Kh1 e Kf2 entram; Qh8 não");
  assert.equal(jogo.perdas.length, 1);
  assert.equal(jogo.perdas[0].codigo, "LANCE_IMPOSSIVEL");
  assert.match(jogo.perdas[0].mensagem, /"Qh8" não é um lance possível/);
});

test("o que o leitor não reconheceu vira perda anunciada, não silêncio", () => {
  const jogo = lerImportacaoPgn("1. e4 ¿¿ e5 *").jogos[0];
  assert.equal(jogo.perdas.length, 1);
  assert.equal(jogo.perdas[0].codigo, "TOKEN_NAO_RECONHECIDO");
  assert.match(jogo.perdas[0].mensagem, /«¿¿»/);
  assert.equal(jogo.analise!.origemPgn?.naoReconhecidos.length, 1);
});

test("as setas entram, a cor é anunciada como perda, e o texto original fica guardado", () => {
  const jogo = lerImportacaoPgn('1. e4 { ideia central [%cal Ge2e4,Rd1h5] [%csl Yd5] } *').jogos[0];
  const no = jogo.analise!.nos[jogo.capitulo!.caminho[0]];
  assert.equal(no.comentario, "ideia central");
  assert.deepEqual(no.desenhos, { arrows: [["e2", "e4"], ["d1", "h5"]], highlights: ["d5"] });
  // A cor não cabe em `desenhos`, então ela é dita em voz alta **e** preservada crua.
  assert.deepEqual(no.diretivas, ["[%cal Ge2e4,Rd1h5]", "[%csl Yd5]"]);
  assert.equal(jogo.perdas.filter((p) => p.codigo === "COR_DO_DESENHO").length, 1);
});

test("os seis símbolos viram NAG numérico, e o NAG numérico atravessa inteiro", () => {
  const jogo = lerImportacaoPgn("1. e4!? e5 $146 2. Nf3?! *").jogos[0];
  const uci = (n: number) => jogo.analise!.nos[jogo.capitulo!.caminho[n]];
  assert.deepEqual(uci(0).nags, [5], "!? é o NAG 5");
  assert.deepEqual(uci(1).nags, [146]);
  assert.deepEqual(uci(2).nags, [6], "?! é o NAG 6");
  assert.deepEqual(jogo.perdas, []);
});

test("variante que não é xadrez padrão é recusada na porta, com o nome dela", () => {
  const jogo = lerImportacaoPgn('[Variant "Chess960"]\n\n1. e4 e5 *').jogos[0];
  assert.equal(jogo.recusa?.codigo, "VARIANTE_NAO_SUPORTADA");
  assert.match(jogo.recusa!.mensagem, /Chess960/);
  assert.equal(jogo.analise, null);
});

test("jogo sem lance e FEN impossível são recusados, cada um com o seu motivo", () => {
  assert.equal(lerImportacaoPgn('[Event "vazio"]\n\n*').jogos.length, 0, "sem lance nenhum o leitor não devolve jogo");
  const fenTorta = lerImportacaoPgn('[FEN "isto não é uma FEN"]\n[SetUp "1"]\n\n1. e4 *').jogos[0];
  assert.equal(fenTorta.recusa?.codigo, "POSICAO_INICIAL_INVALIDA");
});

test("o mesmo jogo importado duas vezes não repete um único id", () => {
  // O defeito que o estudo real do Doug encontrou em 11/09/2026: os ids de nó são
  // únicos na **aula**, não na análise, e 12 capítulos numerados `no-1`, `no-2`…
  // produziram 153 colisões. Aqui o arquivo traz o mesmo capítulo duas vezes.
  const relatorio = lerImportacaoPgn(`${CAPITULO_LICHESS}\n\n${CAPITULO_LICHESS}`);
  assert.equal(relatorio.jogos.length, 2);
  const resultado = aplicarImportacaoPgn(aulaVazia(), relatorio, [1, 2]);
  assert.ok(resultado.ok);
  assert.deepEqual(problemasDaAulaV2(resultado.aula).filter((p) => p.codigo === "ID_DUPLICADO"), []);
  assert.equal(validarAulaV2(JSON.parse(JSON.stringify(resultado.aula))).ok, true);
});

test("um jogo recusado na seleção impede o lote inteiro — não existe meia importação", () => {
  const relatorio = lerImportacaoPgn(`${CAPITULO_LICHESS}\n\n[Variant "Chess960"]\n[Event "outro"]\n\n1. e4 e5 *`);
  const antes = aulaVazia();
  const resultado = aplicarImportacaoPgn(antes, relatorio, [1, 2]);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.codigo, "JOGO_RECUSADO");
  assert.match(resultado.ok === false ? resultado.mensagem : "", /Nada foi aplicado/);
  assert.deepEqual(antes.analises, [], "a aula de entrada não foi tocada");

  // E o jogo bom sozinho entra normalmente: a recusa é do lote escolhido, não do arquivo.
  assert.equal(aplicarImportacaoPgn(antes, relatorio, [1]).ok, true);
});

test("lote que estoura o teto de §17 não entra pela metade", () => {
  const relatorio = lerImportacaoPgn(CAPITULO_LICHESS);
  const cheia = aulaVazia();
  // Uma aula já no teto de lances: mais seis não cabem.
  const nos: AnaliseV2["nos"] = { "no-cheia-0": { id: "no-cheia-0", filhos: [] } };
  for (let i = 1; i <= LIMITES_V2.nosPorAula; i += 1) {
    nos[`no-cheia-${i}`] = { id: `no-cheia-${i}`, uci: "e2e4", filhos: [] };
    nos[`no-cheia-${i - 1}`].filhos.push(`no-cheia-${i}`);
  }
  cheia.analises.push({ id: "analise-cheia", inicio: { tipo: "fen", fen: new Chess().fen() }, raizId: "no-cheia-0", nos });

  const resultado = aplicarImportacaoPgn(cheia, relatorio, [1]);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.ok === false && resultado.codigo, "GRANDE_DEMAIS");
  assert.match(resultado.ok === false ? resultado.mensagem : "", /Nada foi aplicado/);
});

test("o tamanho é medido antes de aplicar, que é quando o professor ainda pode escolher menos", () => {
  const relatorio = lerImportacaoPgn(CAPITULO_LICHESS);
  assert.deepEqual(medirImportacao(aulaVazia(), relatorio, [1]), { lances: 6, teto: LIMITES_V2.nosPorAula, cabe: true });
  assert.deepEqual(medirImportacao(aulaVazia(), relatorio, []), { lances: 0, teto: LIMITES_V2.nosPorAula, cabe: true });
});

test("importar para uma aula real não estraga o que já estava lá", () => {
  const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
  const positions: Record<string, Position> = { [position.id]: position };
  const aula = adaptarLessonV1(lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8"))), positions);
  const antesDeCapitulos = aula.capitulos.length;

  const resultado = aplicarImportacaoPgn(aula, lerImportacaoPgn(CAPITULO_LICHESS), [1]);
  assert.ok(resultado.ok);
  assert.equal(resultado.aula.capitulos.length, antesDeCapitulos + 1);
  assert.equal(resultado.aula.treinos.length, aula.treinos.length, "o treino da aula não foi mexido");
  // A única queixa nova é a que o plano manda existir: posição importada não é
  // posição revisada (§12). Nenhum erro bloqueante entra junto.
  const novos = problemasDaAulaV2(resultado.aula, positions);
  assert.deepEqual(novos.map((p) => `${p.severidade}/${p.codigo}`), ["aviso/FEN_IMPORTADA_SEM_REVISAO"]);
});

test("partida que começa do começo não pede revisão de proveniência", () => {
  // A posição inicial do xadrez não é material de ninguém. Avisar sobre ela seria
  // alarme que não pede trabalho — e alarme assim ensina a ignorar os outros.
  const resultado = aplicarImportacaoPgn(aulaVazia(), lerImportacaoPgn("1. e4 e5 2. Nf3 *"), [1]);
  assert.ok(resultado.ok);
  assert.deepEqual(problemasDaAulaV2(resultado.aula), []);
});
