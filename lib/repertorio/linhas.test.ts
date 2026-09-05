import assert from "node:assert/strict";
import test from "node:test";
import {
  aberturasInchadas,
  conferirRegras,
  idDaLinha,
  meiosLances,
  validarBanco,
  type Linha,
} from "./linhas.ts";

/**
 * A conferência do banco de linhas.
 *
 * Cada regra aqui existe para reprovar uma coisa específica **na build**, antes
 * de o sábado chegar. Um teste por regra, e o teste mostra o que ela recusa.
 */

const LANCES = ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"];
const SANS = ["e4", "e5", "Nf3", "Nc6", "d4"];

/** Uma linha que passa em tudo — o ponto de partida para quebrar de propósito. */
function boa(troca: Partial<Linha> = {}): Linha {
  const base: Linha = {
    id: idDaLinha("brancas", "escocesa", LANCES),
    cor: "brancas",
    abertura: "escocesa",
    nivel: "base",
    nome: "Escocesa — 3.d4",
    fenInicial: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenFinal: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3",
    lances: LANCES,
    sans: SANS,
    meus: [0, 2, 4],
    alternativas: {},
    errosNomeados: {},
    comentarios: { "4": "d4 abre o centro antes de as pretas se organizarem." },
    fonte: "teste",
  };
  const junto = { ...base, ...troca };
  // Trocar os lances sem trocar o id daria um erro que não é o que o teste quer
  // medir; então o id acompanha, a menos que o próprio teste o esteja quebrando.
  if (troca.lances && !troca.id) junto.id = idDaLinha(junto.cor, junto.abertura, junto.lances);
  return junto;
}

const errosDe = (linha: Linha): string => conferirRegras([linha]).map((p) => p.erro).join(" | ");

test("a linha boa passa", () => {
  assert.deepEqual(conferirRegras([boa()]), []);
  assert.equal(validarBanco([boa()]).length, 1);
});

test("linha que termina em lance do adversário é reprovada", () => {
  // A regra central: sem ela o aluno vê a posição e não aprende a resposta.
  const torta = boa({ lances: LANCES.slice(0, 4), sans: SANS.slice(0, 4), meus: [0, 2], comentarios: { "2": "x" } });
  assert.match(errosDe(torta), /termina em "Nc6", que é lance do adversário/);
});

test("último lance sem comentário é reprovado", () => {
  assert.match(errosDe(boa({ comentarios: {} })), /está sem comentário/);
  assert.match(errosDe(boa({ comentarios: { "4": "   " } })), /está sem comentário/);
});

test("linha mais funda que o nível é reprovada, com o número por cor", () => {
  // 8 lances nossos = 15 meios-lances nas brancas, 16 nas pretas.
  assert.equal(meiosLances("base", "brancas"), 15);
  assert.equal(meiosLances("base", "pretas"), 16);
  assert.equal(meiosLances("avancado", "brancas"), 23);

  const dezesseis = Array.from({ length: 16 }, (_, i) => LANCES[i % 5]);
  const funda = boa({
    lances: dezesseis,
    sans: Array.from({ length: 16 }, (_, i) => SANS[i % 5]),
    meus: [0, 2, 4, 6, 8, 10, 12, 14],
    comentarios: { "15": "x" },
  });
  assert.match(errosDe(funda), /16 meios-lances; o nível base das brancas vai até 15/);
});

test("id que não bate com os lances é reprovado", () => {
  assert.match(errosDe(boa({ id: "brancas-escocesa-deadbeef" })), /o id não bate com os lances/);
});

test("id repetido e sequência repetida são reprovados", () => {
  const duas = [boa(), boa()];
  const erros = conferirRegras(duas).map((p) => p.erro).join(" | ");
  assert.match(erros, /é a mesma sequência de lances/);
  assert.match(erros, /id repetido/);
});

test("nível inválido e cor inválida não passam pelo schema", () => {
  assert.throws(() => validarBanco([{ ...boa(), nivel: "medio" }]), /não passou na conferência/);
  assert.throws(() => validarBanco([{ ...boa(), cor: "amarelas" }]), /não passou na conferência/);
});

test("campo a mais no JSON não passa em silêncio", () => {
  // `.strict()`: um campo escrito errado (`comentario` em vez de `comentarios`)
  // seria conteúdo perdido sem ninguém notar.
  assert.throws(() => validarBanco([{ ...boa(), comentario: "x" }]), /não passou na conferência/);
});

test("UCI fora do formato é reprovado pelo schema", () => {
  assert.throws(() => validarBanco([boa({ lances: [...LANCES.slice(0, 4), "e4-d5"] })]), /lances/);
});

test("`meus` ou comentário apontando para meio-lance que não existe é reprovado", () => {
  assert.match(errosDe(boa({ meus: [0, 2, 4, 9] })), /"meus" aponta para o meio-lance 9/);
  assert.match(
    errosDe(boa({ comentarios: { "4": "ok", "9": "fantasma" } })),
    /há comentário no meio-lance 9/,
  );
});

test("UCI e SAN têm de ter o mesmo tamanho", () => {
  assert.match(errosDe(boa({ sans: SANS.slice(0, 4) })), /5 lances em UCI e 4 em SAN/);
});

test("abertura acima de 40 linhas é aviso, não erro", () => {
  // O teto de 40 é meta pedagógica, não limite técnico: quem corta é o
  // professor olhando a frequência, e reprovar a build no meio de uma revisão
  // atrapalharia mais do que ajuda.
  const muitas = Array.from({ length: 41 }, (_, i) =>
    boa({ lances: [...LANCES, `a${(i % 8) + 1}a${((i + 1) % 8) + 1}`], sans: [...SANS, `X${i}`], comentarios: { "5": "x" }, meus: [0, 2, 4] }),
  );
  assert.deepEqual(aberturasInchadas([boa()]), []);
  assert.match(aberturasInchadas(muitas)[0], /escocesa: 41 linhas \(teto 40\)/);
});

test("a mensagem de erro nomeia a linha, para a pessoa saber onde mexer", () => {
  assert.throws(
    () => validarBanco([boa({ comentarios: {} })], "content/repertorio/brancas-escocesa.pgn"),
    /content\/repertorio\/brancas-escocesa\.pgn não passou[\s\S]*Escocesa — 3\.d4/,
  );
});
