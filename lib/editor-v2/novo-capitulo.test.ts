/**
 * O que dá para provar sem tela de "adicionar capítulo" (§8.3 e §9).
 *
 * O arrasto da peça e o foco do diálogo são teste humano (§19 do plano final). O
 * que está aqui é a conta: dado o formulário, que documento sai — e o que o
 * editor recusa antes de mexer na aula.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { aplicarNoHistorico, desfazer, executarComando, iniciarHistorico, refazer } from "./comandos.ts";
import { problemasDaAulaV2, validarAulaV2, type AulaV2 } from "./modelo.ts";
import {
  FEN_DA_POSICAO_INICIAL,
  aplicarNovoCapitulo,
  fenDoMontador,
  prepararNovoCapitulo,
  roquesPossiveis,
} from "./novo-capitulo.ts";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N1-KPK.json", "utf8")));
const position = positionSchema.parse(JSON.parse(readFileSync("content/positions/N1/pos-n1-kpk-dlv-1-3.json", "utf8")));
const positions: Record<string, Position> = { [position.id]: position };

const aulaBase = (): AulaV2 => adaptarLessonV1(lesson, positions);

/** Rei e peão contra rei — uma posição de final de verdade, não um exemplo torto. */
const FEN_KPK = "8/8/8/4k3/8/8/4P3/4K3 w - - 0 1";

function criar(aula: AulaV2, nome: string, fen: string, depoisDoCapituloId?: string) {
  const preparo = prepararNovoCapitulo(aula, { nome, fen, orientacao: "white", ...(depoisDoCapituloId ? { depoisDoCapituloId } : {}) });
  assert.equal(preparo.ok, true, preparo.ok ? "" : preparo.mensagem);
  if (!preparo.ok) throw new Error("inalcançável");
  return preparo.novo;
}

test("o nome vazio é recusado, e a recusa aponta o campo do nome", () => {
  const preparo = prepararNovoCapitulo(aulaBase(), { nome: "   ", fen: FEN_KPK, orientacao: "white" });
  assert.equal(preparo.ok, false);
  if (preparo.ok) return;
  assert.equal(preparo.campo, "nome");
  assert.match(preparo.mensagem, /nome/);
});

test("a posição impossível é recusada em português, e o erro é do campo da posição", () => {
  const casos: Array<[string, RegExp]> = [
    ["não é uma FEN", /seis campos/],
    ["8/8/8/8/8/8/8/8 w - - 0 1", /falta o rei branco/],
    ["8/8/8/8/8/8/4k3/4K3 w - - 0 1", /reis adjacentes/],
    // Roque declarado sem rei e torre em casa: a chess.js aceita, e o projeto não.
    ["8/8/8/4k3/8/8/4P3/4K3 w KQ - 0 1", /roque curto das brancas/],
    // En passant sem o peão que teria passado por ali.
    ["8/8/8/4k3/8/8/4P3/4K3 w - e6 0 1", /não há peão preto em e5/],
  ];
  for (const [fen, esperado] of casos) {
    const preparo = prepararNovoCapitulo(aulaBase(), { nome: "Teste", fen, orientacao: "white" });
    assert.equal(preparo.ok, false, fen);
    if (preparo.ok) continue;
    assert.equal(preparo.campo, "posicao", fen);
    assert.match(preparo.mensagem, esperado, fen);
  }
});

test("preparar não toca na aula: cancelar não tem o que desfazer", () => {
  const aula = aulaBase();
  const antes = JSON.stringify(aula);
  prepararNovoCapitulo(aula, { nome: "A oposição distante", fen: FEN_KPK, orientacao: "black" });
  assert.equal(JSON.stringify(aula), antes);
});

test("criar traz análise, capítulo e etapa com ids estáveis, e o documento continua válido", () => {
  const aula = aulaBase();
  const novo = criar(aula, "A oposição distante", FEN_KPK);
  assert.deepEqual(
    [novo.analiseId, novo.capituloId, novo.etapaId, novo.raizId],
    ["analise-a-oposicao-distante", "capitulo-a-oposicao-distante", "etapa-capitulo-a-oposicao-distante", "no-a-oposicao-distante-0"],
  );

  const aplicado = aplicarNovoCapitulo(aula, novo);
  assert.equal(aplicado.ok, true);
  if (!aplicado.ok) return;

  const capitulo = aplicado.aula.capitulos.find((item) => item.id === novo.capituloId)!;
  assert.equal(capitulo.titulo, "A oposição distante");
  assert.deepEqual(capitulo.caminho, [], "capítulo de posição parada nasce sem percurso");
  assert.equal(capitulo.inicioNodeId, novo.raizId);
  assert.deepEqual(capitulo.narracoes, []);

  const analise = aplicado.aula.analises.find((item) => item.id === novo.analiseId)!;
  assert.deepEqual(analise.inicio, { tipo: "fen", fen: FEN_KPK });
  assert.deepEqual(Object.keys(analise.nos), [novo.raizId]);

  // Só avisos: a FEN nova ainda não tem revisão de proveniência, e isso é o
  // trabalho que falta — não um defeito da criação.
  const resultado = validarAulaV2(aplicado.aula, positions);
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.problemas.join(" | "));
  const problemas = problemasDaAulaV2(aplicado.aula, positions);
  assert.deepEqual(
    problemas.filter((p) => p.localizacao.analiseId === novo.analiseId).map((p) => [p.codigo, p.severidade]),
    [["FEN_IMPORTADA_SEM_REVISAO", "aviso"]],
  );
});

test("a posição inicial padrão não pede revisão de proveniência", () => {
  const aula = aulaBase();
  const novo = criar(aula, "Do começo", FEN_DA_POSICAO_INICIAL);
  const aplicado = aplicarNovoCapitulo(aula, novo);
  assert.equal(aplicado.ok, true);
  if (!aplicado.ok) return;
  assert.deepEqual(
    problemasDaAulaV2(aplicado.aula, positions).filter((p) => p.localizacao.analiseId === novo.analiseId),
    [],
  );
});

test("a etapa entra depois do capítulo atual, e não no fim do fluxo", () => {
  const aula = aulaBase();
  const antes = aula.fluxo.map((etapa) => etapa.tipo);
  assert.deepEqual(antes, ["introducao", "capitulo", "treino", "pratica"]);

  const atual = aula.capitulos[0].id;
  const novo = criar(aula, "Segundo capítulo", FEN_KPK, atual);
  const aplicado = aplicarNovoCapitulo(aula, novo);
  assert.equal(aplicado.ok, true);
  if (!aplicado.ok) return;
  assert.deepEqual(aplicado.aula.fluxo.map((etapa) => etapa.tipo), ["introducao", "capitulo", "capitulo", "treino", "pratica"]);
  assert.equal(aplicado.aula.fluxo[2].entidadeId, novo.capituloId);

  // Sem ponto de inserção, vai para o fim — o mesmo que a importação faz.
  const noFim = aplicarNovoCapitulo(aula, criar(aula, "No fim", FEN_KPK));
  assert.equal(noFim.ok, true);
  if (!noFim.ok) return;
  assert.equal(noFim.aula.fluxo.at(-1)!.tipo, "capitulo");
});

test("o cadastro de capítulos não é uma segunda ordem: só o fluxo muda de forma", () => {
  const aula = aulaBase();
  const novo = criar(aula, "Segundo capítulo", FEN_KPK, aula.capitulos[0].id);
  const aplicado = aplicarNovoCapitulo(aula, novo);
  assert.equal(aplicado.ok, true);
  if (!aplicado.ok) return;
  // O novo é o último do cadastro, e o segundo do fluxo. As duas coisas são
  // verdadeiras ao mesmo tempo, e é por isso que o fluxo manda na coluna.
  assert.equal(aplicado.aula.capitulos.at(-1)!.id, novo.capituloId);
  assert.equal(aplicado.aula.fluxo.findIndex((etapa) => etapa.entidadeId === novo.capituloId), 2);
});

test("Desfazer tira o capítulo inteiro; Refazer devolve os mesmos ids", () => {
  const aula = aulaBase();
  const novo = criar(aula, "A oposição distante", FEN_KPK, aula.capitulos[0].id);
  const comando = { tipo: "ADICIONAR_CAPITULO" as const, novo };

  let historico = iniciarHistorico(aula);
  historico = aplicarNoHistorico(historico, executarComando(historico.presente, comando, positions));
  assert.equal(historico.presente.capitulos.length, 2);

  historico = desfazer(historico);
  assert.equal(historico.presente.capitulos.length, 1);
  assert.equal(historico.presente.analises.some((a) => a.id === novo.analiseId), false);
  assert.equal(historico.presente.fluxo.some((e) => e.id === novo.etapaId), false);
  assert.equal(JSON.stringify(historico.presente), JSON.stringify(aula));

  historico = refazer(historico);
  assert.equal(historico.presente.capitulos.at(-1)!.id, novo.capituloId);
  assert.equal(historico.presente.analises.at(-1)!.id, novo.analiseId);
  assert.equal(Object.keys(historico.presente.analises.at(-1)!.nos)[0], novo.raizId);
  assert.equal(historico.presente.fluxo[2].id, novo.etapaId);
});

test("dois capítulos com o mesmo nome não colidem em nenhum dos quatro ids", () => {
  const aula = aulaBase();
  const primeiro = aplicarNovoCapitulo(aula, criar(aula, "Oposição", FEN_KPK));
  assert.equal(primeiro.ok, true);
  if (!primeiro.ok) return;
  const segundo = criar(primeiro.aula, "Oposição", FEN_KPK);
  assert.deepEqual(
    [segundo.analiseId, segundo.capituloId, segundo.etapaId, segundo.raizId],
    ["analise-oposicao-2", "capitulo-oposicao-2", "etapa-capitulo-oposicao-2", "no-oposicao-2-0"],
  );
  const aplicado = aplicarNovoCapitulo(primeiro.aula, segundo);
  assert.equal(aplicado.ok, true);
  if (!aplicado.ok) return;
  assert.equal(validarAulaV2(aplicado.aula, positions).ok, true);
});

test("um nome que não vira id ganha reserva, e o capítulo continua nascendo", () => {
  const aula = aulaBase();
  const novo = criar(aula, "«»", FEN_KPK);
  assert.equal(novo.capituloId, "capitulo-capitulo-2");
  assert.equal(novo.titulo, "«»");
  assert.equal(aplicarNovoCapitulo(aula, novo).ok, true);
});

test("aplicar duas vezes o mesmo pedido é recusado, e a aula não é tocada", () => {
  const aula = aulaBase();
  const novo = criar(aula, "Oposição", FEN_KPK);
  const primeira = aplicarNovoCapitulo(aula, novo);
  assert.equal(primeira.ok, true);
  if (!primeira.ok) return;
  const segunda = aplicarNovoCapitulo(primeira.aula, novo);
  assert.equal(segunda.ok, false);
  if (segunda.ok) return;
  assert.match(segunda.mensagem, /já tem uma parte chamada/);
});

test("a FEN do montador compõe os seis campos, com o roque na ordem canônica", () => {
  assert.equal(
    fenDoMontador({ pecas: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", vez: "w", roques: { K: true, Q: true, k: true, q: true }, enPassant: "", meiosLances: 0, lance: 1 }),
    FEN_DA_POSICAO_INICIAL,
  );
  assert.equal(
    fenDoMontador({ pecas: "8/8/8/4k3/8/8/4P3/4K3", vez: "b", roques: { K: false, Q: false, k: false, q: false }, enPassant: " E3 ", meiosLances: 3, lance: 12 }),
    "8/8/8/4k3/8/8/4P3/4K3 b - E3 3 12",
  );
  // A ordem dos campos de roque não segue a ordem em que o professor marcou.
  assert.match(
    fenDoMontador({ pecas: "8/8/8/8/8/8/8/8", vez: "w", roques: { q: true, K: true, k: false, Q: true }, enPassant: "", meiosLances: 0, lance: 1 }),
    / KQq /,
  );
});

test("o roque só é oferecido quando o rei e a torre estão em casa", () => {
  assert.deepEqual(roquesPossiveis("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"), { K: true, Q: true, k: true, q: true });
  // Torre de h1 fora: o roque curto das brancas deixa de existir.
  assert.deepEqual(roquesPossiveis("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK3"), { K: false, Q: true, k: true, q: true });
  assert.deepEqual(roquesPossiveis("8/8/8/8/8/8/8/8"), { K: false, Q: false, k: false, q: false });
});
