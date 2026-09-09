import assert from "node:assert/strict";
import test from "node:test";
import {
  aberturasInchadas,
  conferirRegras,
  estadoDe,
  fechamentoDe,
  fechamentosAbertos,
  idDaLinha,
  meiosLances,
  placarDeFechamento,
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
    plano: {},
    comentarios: {
      "0": "1.e4 solta o bispo de f1 e a dama de uma vez.",
      "2": "O cavalo ataca e5 e libera o roque.",
      "4": "d4 abre o centro antes de as pretas se organizarem.",
    },
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
  // `boa()` passa em `conferirRegras`, que é onde moram as regras de forma. Ela
  // NÃO passa em `validarBanco` desde 8/9/2026: com três lances nossos ela é
  // curta demais para a régua do término, e quem cobra isso é `fechamentosAbertos`
  // — ver o teste "a régua do término reprova em validarBanco" no fim do arquivo.
  assert.deepEqual(conferirRegras([boa()]), []);
  assert.equal(validarBanco([longa()]).length, 1);
});

test("linha que termina em lance do adversário é reprovada", () => {
  // A regra central: sem ela o aluno vê a posição e não aprende a resposta.
  const torta = boa({ lances: LANCES.slice(0, 4), sans: SANS.slice(0, 4), meus: [0, 2], comentarios: { "0": "x", "2": "y" } });
  assert.match(errosDe(torta), /termina em "Nc6", que é lance do adversário/);
});

test("último lance sem comentário é reprovado", () => {
  assert.match(errosDe(boa({ comentarios: {} })), /está sem comentário/);
  assert.match(errosDe(boa({ comentarios: { "4": "   " } })), /está sem comentário/);
});

test("lance NOSSO no meio da linha sem comentário é reprovado, com a lista", () => {
  // A régua do repertório é o motivo de cada lance, não a sequência. Até
  // 7/9/2026 este gate olhava só o último lance, e 80 dos 149 lances nossos
  // estavam calados sem que nada reprovasse — a §23 de docs/REVISAO-FONTES.md.
  const erro = errosDe(boa({ comentarios: { "2": "só o do meio", "4": "e o último" } }));
  assert.match(erro, /1 lance\(s\) nosso\(s\) sem comentário: 1\.e4\./);
  // Espaço em branco não conta como comentário, aqui como no último lance.
  assert.match(errosDe(boa({ comentarios: { "0": " ", "2": "x", "4": "y" } })), /sem comentário: 1\.e4\./);
  // E o lance DELE segue podendo ser mudo: o aluno não o joga.
  assert.deepEqual(conferirRegras([boa()]), []);
});

test("linha mais funda que o nível é reprovada, com o número por cor", () => {
  // 14 lances nossos = 27 meios-lances nas brancas, 28 nas pretas. Era 11/12
  // até 8/9/2026; a §24 de docs/REVISAO-FONTES.md conta por que os dois níveis
  // passaram a ter o mesmo teto.
  assert.equal(meiosLances("base", "brancas"), 27);
  assert.equal(meiosLances("base", "pretas"), 28);
  assert.equal(meiosLances("avancado", "brancas"), 27);

  const vinteEOito = Array.from({ length: 28 }, (_, i) => LANCES[i % 5]);
  const funda = boa({
    lances: vinteEOito,
    sans: Array.from({ length: 28 }, (_, i) => SANS[i % 5]),
    meus: Array.from({ length: 14 }, (_, i) => i * 2),
    comentarios: Object.fromEntries(Array.from({ length: 28 }, (_, i) => [String(i), "x"])),
  });
  assert.match(errosDe(funda), /28 meios-lances; o nível base das brancas vai até 27/);
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

/* ------------------------------------------------------------------ *
 * A régua do término — §24 de docs/REVISAO-FONTES.md
 *
 * "A abertura acaba quando o aluno rocou e nenhuma peça menor dele está na casa
 * de origem." Os testes abaixo provam a régua e o bloco `[%plano]`, que é a
 * única saída autorizada quando ela não fecha dentro do teto.
 * ------------------------------------------------------------------ */

test("fechamentoDe lê o roque no SAN e as peças na FEN", () => {
  // A linha `boa()` para no 3.d4: ninguém rocou e três peças menores nossas
  // continuam em casa (b1, c1, f1 — só o cavalo de g1 saiu, para f3).
  assert.deepEqual(fechamentoDe(boa()), { rocou: false, emCasa: ["b1", "c1", "f1"] });
});

test("peça capturada ou trocada conta como resolvida", () => {
  // A régua é "não sobrou peça dormindo", não "cada peça andou". Um bispo que
  // foi trocado em c1 não tem mais o que desenvolver.
  const semBispoDeC1 = boa({
    fenFinal: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RN1QKB1R b KQkq - 0 3",
  });
  assert.deepEqual(fechamentoDe(semBispoDeC1).emCasa, ["b1", "f1"]);
});

test("peça que saiu e voltou continua contando como em casa", () => {
  // De propósito: um cavalo que voltou para b1 está dormindo igual, e o aluno
  // precisa saber o que fazer com ele. A FEN não distingue os dois cavalos, e
  // para a régua tanto faz qual deles é.
  const voltou = boa({
    fenFinal: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 3",
  });
  assert.ok(fechamentoDe(voltou).emCasa.includes("b1"));
});

test("o roque DELE não conta como o nosso", () => {
  // `sans` guarda os dois lados; o filtro é por `meus`, e sem ele uma linha
  // das brancas fecharia porque as pretas rocaram.
  const dele = boa({ sans: [...SANS.slice(0, 4), "O-O"], meus: [0, 2] });
  assert.equal(fechamentoDe(dele).rocou, false);
  assert.equal(fechamentoDe(boa({ sans: [...SANS.slice(0, 4), "O-O"], meus: [0, 2, 4] })).rocou, true);
});

/** Uma linha de 12 lances nossos, para os testes da régua não brigarem com o piso. */
function longa(troca: Partial<Linha> = {}): Linha {
  const lances = ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"];
  const sans = ["e4", "e5", "Nf3", "Nc6", "d4"];
  // 23 meios-lances repetindo a mesma sequência: aqui o que se mede é a régua
  // do término, não a legalidade — de legalidade cuida a `chess.js` no
  // compilador, e `banco.test.ts` a confere no publicado.
  const cheia = Array.from({ length: 23 }, (_, i) => lances[i % 5]);
  const cheiaSan = Array.from({ length: 23 }, (_, i) => sans[i % 5]);
  cheiaSan[16] = "O-O";
  return boa({
    lances: cheia,
    sans: cheiaSan,
    meus: Array.from({ length: 12 }, (_, i) => i * 2),
    comentarios: Object.fromEntries(Array.from({ length: 23 }, (_, i) => [String(i), "porque sim"])),
    // Rei em g1, torre em f1, e as quatro menores fora.
    fenFinal: "r1bq1rk1/pppp1ppp/2n2n2/4p3/1b1PP3/2N2N2/PPPB1PPP/R2Q1RK1 b - - 0 12",
    ...troca,
  });
}

test("uma linha que fecha a régua não vira aviso, e conta no placar", () => {
  const l = longa();
  assert.deepEqual(fechamentoDe(l), { rocou: true, emCasa: [] });
  assert.deepEqual(fechamentosAbertos([l]), []);
  assert.equal(estadoDe(l), "fecha");
  assert.match(placarDeFechamento([l]), /1 de 1 fecham na linha; 0 fecham com \[%plano\]; 0 abertas/);
});

test("linha curta demais é aviso, com o número na cara", () => {
  const curta = boa();
  assert.match(fechamentosAbertos([curta])[0], /3 lances nossos; o mínimo é 12/);
  assert.equal(estadoDe(curta), "aberta");
});

test("peça em casa sem plano é aviso; com plano declarado, deixa de ser", () => {
  const comBispoEmCasa = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
  });
  assert.match(fechamentosAbertos([comBispoEmCasa])[0], /a peça de c1 não saiu/);

  const declarado = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
    plano: { c1: { casa: "g5", motivo: "sai depois do h3, para não levar o …h6 com tempo" } },
  });
  assert.deepEqual(fechamentosAbertos([declarado]), []);
  assert.equal(estadoDe(declarado), "com-plano");
  assert.match(placarDeFechamento([declarado]), /0 de 1 fecham na linha; 1 fecham com \[%plano\]/);
});

test("sem roque e sem plano do rei é aviso", () => {
  const semRoque = longa({ sans: Array.from({ length: 23 }, (_, i) => SANS[i % 5]) });
  assert.match(fechamentosAbertos([semRoque])[0], /o rei não rocou/);
  assert.match(placarDeFechamento([semRoque]), /1 abertas \(1 sem roque/);
});

test("plano para peça que já saiu é ERRO, não aviso — é texto velho", () => {
  // Um plano velho promete ao aluno uma coisa que o próprio repertório acabou
  // de fazer. Isso nunca é trabalho em andamento, então reprova na hora.
  const erro = errosDe(longa({ plano: { b1: { casa: "c3", motivo: "o cavalo sai por c3, olhando d5 e e4" } } }));
  assert.match(erro, /a peça de b1 já saiu no fim da linha/);
});

test("plano do rei numa linha que roca é ERRO", () => {
  assert.match(
    errosDe(longa({ plano: { rei: { casa: "g1", motivo: "o roque vem no lance seguinte, com a coluna e fechada" } } })),
    /a linha já roca/,
  );
});

test("motivo curto reprova — plano sem motivo é linha curta com desculpa", () => {
  const l = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
    plano: { c1: { casa: "g5", motivo: "depois" } },
  });
  assert.match(errosDe(l), /o motivo tem 6 caracteres/);
});

test("bispo prometido a casa da outra cor reprova", () => {
  const l = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
    plano: { c1: { casa: "f4", motivo: "sai para f4 assim que o peão de e3 desocupar a casa" } },
  });
  // c1 é escura e f4 é escura — este passa. O que não passa é a promessa clara.
  assert.equal(errosDe(l), "");
  const torto = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
    plano: { c1: { casa: "f5", motivo: "sai para f5 assim que o peão de e4 desocupar a casa" } },
  });
  assert.match(errosDe(torto), /anda em casas escuras e f5 é clara/);
});

test("destino igual à origem, e chave que não é casa de peça menor, reprovam", () => {
  const parada = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
    plano: { c1: { casa: "c1", motivo: "fica onde está, guardando a entrada em g5 e h6" } },
  });
  assert.match(errosDe(parada), /o destino é a própria casa de origem/);

  const inventada = longa({
    plano: { d1: { casa: "e2", motivo: "a dama vai para e2, atrás do peão que ainda não andou" } },
  });
  assert.match(errosDe(inventada), /"d1" não é casa de peça menor das brancas/);
});

/* ------------------------------------------------------------------ *
 * A trava da Fase 4 — 8/9/2026
 *
 * Enquanto a §24 escrevia as caudas, `fechamentosAbertos` era AVISO: reprovar a
 * build em cima da lista de trabalho travaria a própria revisão que vinha
 * consertá-la. No dia em que as 27 linhas passaram a fechar, a escolha se
 * inverteu — e é este par de testes que a mantém invertida.
 * ------------------------------------------------------------------ */

test("a régua do término reprova em validarBanco, e não só em aviso", () => {
  // Uma linha de 3 lances nossos passava em `validarBanco` até 8/9/2026. Hoje o
  // banco inteiro é recusado, com o número na mensagem.
  assert.throws(() => validarBanco([boa()]), /3 lances nossos; o mínimo é 12/);

  // E a mesma coisa quando a linha é longa mas deixa peça em casa sem declarar.
  const semBispo = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
  });
  assert.throws(() => validarBanco([semBispo]), /a peça de c1 não saiu/);
});

test("a linha que fecha, e a que fecha por [%plano], passam as duas", () => {
  // As duas formas de terminar que a §24 autoriza. Se uma delas parasse de
  // passar, metade do repertório publicado deixaria de carregar no servidor.
  assert.equal(validarBanco([longa()]).length, 1);

  const comPlano = longa({
    fenFinal: "r1bqk2r/pppp1ppp/2n2n2/4p3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 12",
    plano: { c1: { casa: "g5", motivo: "sai depois do h3, para não levar o …h6 com tempo" } },
  });
  assert.equal(validarBanco([comPlano]).length, 1);
});
