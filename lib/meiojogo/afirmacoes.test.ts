import assert from "node:assert/strict";
import test from "node:test";
import {
  conferirAfirmacao,
  corDaCasa,
  problemasDaPosicao,
  type Afirmacao,
} from "./afirmacoes.ts";

/**
 * O juiz das legendas, julgado.
 *
 * **Por que este arquivo é o que mais importa dos dois.** Um verificador que
 * devolve `null` para tudo passa em `dicas.test.ts` com louvor e deixa as 30
 * legendas sem conferência nenhuma — em silêncio, que é o pior jeito de falhar.
 * Então cada afirmação é cobrada nas duas direções: uma posição em que ela é
 * verdade (tem de passar) e uma em que ela é mentira (tem de reprovar).
 *
 * O sinal invertido do peão retardatário, que já custou um bug, tem teste
 * próprio no fim.
 */

const INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Passa quando a afirmação é verdade na posição. */
function verdade(fen: string, a: Afirmacao) {
  assert.equal(conferirAfirmacao(fen, a), null, `deveria ser verdade: ${JSON.stringify(a)}`);
}

/** Passa quando a afirmação é falsa — e devolve o porquê em português. */
function mentira(fen: string, a: Afirmacao) {
  const erro = conferirAfirmacao(fen, a);
  assert.ok(erro, `deveria reprovar: ${JSON.stringify(a)}`);
  assert.ok(erro.length > 3, "o erro tem de explicar, não só negar");
}

test("a cor da casa sai da soma coluna+fileira", () => {
  // a1 escura e h1 clara é o canto que todo tabuleiro impresso confirma.
  assert.equal(corDaCasa("a1"), "escuras");
  assert.equal(corDaCasa("h1"), "claras");
  assert.equal(corDaCasa("a8"), "claras");
  assert.equal(corDaCasa("d4"), "escuras");
  assert.equal(corDaCasa("d5"), "claras");
});

test("vez, peça e rei", () => {
  verdade(INICIAL, { o: "vez", lado: "brancas" });
  mentira(INICIAL, { o: "vez", lado: "pretas" });

  verdade(INICIAL, { o: "peca", casa: "b1", peca: "cavalo", lado: "brancas" });
  mentira(INICIAL, { o: "peca", casa: "b1", peca: "bispo", lado: "brancas" });
  mentira(INICIAL, { o: "peca", casa: "b1", peca: "cavalo", lado: "pretas" });
  mentira(INICIAL, { o: "peca", casa: "e4", peca: "cavalo", lado: "brancas" });

  verdade(INICIAL, { o: "rei-em", lado: "brancas", casa: "e1" });
  mentira(INICIAL, { o: "rei-em", lado: "brancas", casa: "g1" });
});

test("contagens de peões e de peças", () => {
  verdade(INICIAL, { o: "peoes", brancas: 8, pretas: 8 });
  mentira(INICIAL, { o: "peoes", brancas: 7, pretas: 8 });

  verdade(INICIAL, { o: "peoes-nas-colunas", colunas: ["d", "e"], brancas: 2, pretas: 2 });
  mentira(INICIAL, { o: "peoes-nas-colunas", colunas: ["d", "e"], brancas: 3, pretas: 2 });

  verdade(INICIAL, { o: "pecas", peca: "dama", brancas: 1, pretas: 1 });
  verdade("6k1/8/8/8/8/8/8/6K1 w - - 0 1", { o: "pecas", peca: "dama", brancas: 0, pretas: 0 });
  mentira(INICIAL, { o: "pecas", peca: "dama", brancas: 0, pretas: 0 });
});

test("material igual e material a mais", () => {
  verdade(INICIAL, { o: "material-igual" });
  // Uma torre a menos das pretas: a igualdade tem de cair, e a sobra aparecer.
  const semTorre = "1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1";
  mentira(semTorre, { o: "material-igual" });
  verdade(semTorre, { o: "material-a-mais", lado: "brancas", peca: "torre", quantas: 1 });
  mentira(semTorre, { o: "material-a-mais", lado: "brancas", peca: "torre", quantas: 2 });
  mentira(semTorre, { o: "material-a-mais", lado: "pretas", peca: "torre", quantas: 1 });

  // Com dois tipos diferentes de sobra, `material-a-mais` recusa: ela afirma
  // "só isto difere", e é essa a parte que vale.
  const bagunca = "1nbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1";
  mentira(bagunca, { o: "material-a-mais", lado: "brancas", peca: "torre", quantas: 1 });
});

test("par de bispos", () => {
  const par = "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/RNB1KB1R w KQkq - 0 1";
  verdade(par, { o: "par-de-bispos", lado: "brancas" });
  mentira(par, { o: "par-de-bispos", lado: "pretas" });
  mentira(INICIAL, { o: "par-de-bispos", lado: "brancas" }); // os dois têm dois
});

test("coluna aberta e semiaberta", () => {
  const fen = "r2q1rk1/ppp1bppp/2n2n2/4p3/4P3/2N2N2/PPP1BPPP/R3QRK1 w - - 0 11";
  verdade(fen, { o: "coluna-aberta", coluna: "d" });
  mentira(fen, { o: "coluna-aberta", coluna: "e" });

  const semiaberta = "2r3k1/pp3ppp/3p1n2/8/8/2P2N2/PPP2PPP/2R3K1 w - - 0 22";
  verdade(semiaberta, { o: "coluna-semiaberta", coluna: "c", lado: "pretas" });
  // Do outro lado ela não é semiaberta: as brancas têm dois peões ali.
  mentira(semiaberta, { o: "coluna-semiaberta", coluna: "c", lado: "brancas" });
  // E coluna sem peão nenhum é aberta, não semiaberta — a distinção é o ponto,
  // e a mensagem de erro tem de dizer qual das duas ela é.
  assert.match(
    conferirAfirmacao(semiaberta, { o: "coluna-semiaberta", coluna: "e", lado: "brancas" }) ?? "",
    /é aberta/,
  );
});

test("peão isolado, dobrado e passado", () => {
  const isolado = "r2q1rk1/pp3ppp/4bn2/3p4/3N4/4B3/PPP1QPPP/R4RK1 w - - 0 15";
  verdade(isolado, { o: "peao-isolado", casa: "d5" });
  mentira(isolado, { o: "peao-isolado", casa: "b7" }); // tem vizinho em a7
  mentira(isolado, { o: "peao-isolado", casa: "d4" }); // d4 não tem peão

  const dobrado = "2r3k1/pp3ppp/3p1n2/8/8/2P2N2/PPP2PPP/2R3K1 w - - 0 22";
  verdade(dobrado, { o: "peao-dobrado", coluna: "c", lado: "brancas" });
  mentira(dobrado, { o: "peao-dobrado", coluna: "a", lado: "brancas" });
  mentira(dobrado, { o: "peao-dobrado", coluna: "c", lado: "pretas" });

  const passado = "r5k1/pp3ppp/4b3/3p4/3N4/8/PP3PPP/R5K1 w - - 0 28";
  verdade(passado, { o: "peao-passado", casa: "d5" });
  mentira(passado, { o: "peao-passado", casa: "a7" }); // o peão de a2 o barra
});

test("peão retardatário — os dois critérios, e o sentido do peão inimigo", () => {
  const fen = "3r2k1/p3bppp/1p1p1n2/4p3/4P3/2N1B3/PPP2PPP/3R2K1 w - - 0 20";
  verdade(fen, { o: "peao-retardatario", casa: "d6" });

  // Não é retardatário quem tem vizinho atrás capaz de defendê-lo: o peão de
  // b6 tem o de a7 ao lado, uma fileira atrás.
  mentira(fen, { o: "peao-retardatario", casa: "b6" });

  // E não é retardatário quem tem a casa da frente livre. Aqui o peão preto de
  // d6 não tem vizinho nenhum, mas peão branco nenhum vigia d5 — ele anda
  // quando quiser. É este o caso que o sinal invertido deixava passar.
  const semGuarda = "3r2k1/p5pp/1p1p1n2/4p3/8/2N1B3/PPP2PPP/3R2K1 w - - 0 20";
  mentira(semGuarda, { o: "peao-retardatario", casa: "d6" });
});

test("posto: defendido por peão e inatacável por peão", () => {
  const fen = "r2q1rk1/pp1b1ppp/5b2/2pNp3/4P3/2P5/PP3PPP/R1BQ1RK1 w - - 0 15";
  verdade(fen, { o: "posto", casa: "d5", lado: "brancas" });
  // f5 é defendida por e4, mas o peão de g7 ainda pode vir a atacá-la.
  mentira(fen, { o: "posto", casa: "f5", lado: "brancas" });
  // c4 não tem peão branco que a defenda.
  mentira(fen, { o: "posto", casa: "c4", lado: "brancas" });
});

test("bloqueio e cadeia de peões", () => {
  const fen = "r5k1/pp3ppp/4b3/3p4/3N4/8/PP3PPP/R5K1 w - - 0 28";
  verdade(fen, { o: "bloqueio", peao: "d5", por: "brancas" });
  mentira(fen, { o: "bloqueio", peao: "d5", por: "pretas" });
  mentira(fen, { o: "bloqueio", peao: "a7", por: "brancas" }); // a6 está vazia

  const cadeia = "2r3k1/pppnbppp/4p3/3pP3/3P4/2PB1N2/PP3PPP/5RK1 b - - 0 15";
  verdade(cadeia, { o: "corrente-de-peoes", lado: "brancas", casas: ["c3", "d4", "e5"] });
  verdade(cadeia, { o: "corrente-de-peoes", lado: "pretas", casas: ["f7", "e6", "d5"] });
  // A ordem importa: a base vem primeiro. Invertida, ninguém defende ninguém.
  mentira(cadeia, { o: "corrente-de-peoes", lado: "brancas", casas: ["e5", "d4", "c3"] });
  // E a cor importa: essas casas são de peão branco.
  mentira(cadeia, { o: "corrente-de-peoes", lado: "pretas", casas: ["c3", "d4", "e5"] });
});

test("a cor das casas dos peões", () => {
  const fen = "r4rk1/pp2bppp/2p1p3/3pP3/3P4/2P5/PP1B1PPP/R4RK1 w - - 0 18";
  verdade(fen, { o: "peoes-na-cor-do-bispo", bispo: "d2", quantos: 6 });
  verdade(fen, { o: "peoes-na-cor-do-bispo", bispo: "e7", quantos: 2 });
  mentira(fen, { o: "peoes-na-cor-do-bispo", bispo: "d2", quantos: 3 });
  mentira(fen, { o: "peoes-na-cor-do-bispo", bispo: "d4", quantos: 6 }); // não há bispo em d4

  const soClaras = "6k1/1b2qp2/p1p1pnp1/1p1p4/3P4/4BN2/PPPQ1PPP/6K1 w - - 0 22";
  verdade(soClaras, { o: "peoes-na-cor", lado: "pretas", cor: "escuras", quantos: 0 });
  verdade(soClaras, { o: "peoes-na-cor", lado: "pretas", cor: "claras", quantos: 7 });
  mentira(soClaras, { o: "peoes-na-cor", lado: "pretas", cor: "escuras", quantos: 2 });
});

test("atacantes, e a cravada", () => {
  const conta = "r2q1rk1/pp2bppp/2n1pn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 12";
  verdade(conta, { o: "atacantes", casa: "d5", brancas: 1, pretas: 3 });
  mentira(conta, { o: "atacantes", casa: "d5", brancas: 1, pretas: 2 });

  const cravada = "r1bq1rk1/ppp2ppp/2n2n2/3pp3/1b2P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 7";
  verdade(cravada, { o: "cravada", casa: "c3", por: "b4", contra: "e1" });
  // Trocar quem crava por uma casa fora da linha tem de reprovar.
  mentira(cravada, { o: "cravada", casa: "c3", por: "b4", contra: "h1" });
  // E cavalo não crava: ele não anda em linha.
  mentira(cravada, { o: "cravada", casa: "d2", por: "c3", contra: "e1" });
});

test("torres ligadas, torre na sétima", () => {
  const fen = "r2r2k1/ppp1qppp/2np1n2/4p3/4P3/2NP1N2/PPP2PPP/R2Q1RK1 w - - 0 12";
  verdade(fen, { o: "torres-ligadas", lado: "pretas", ligadas: true });
  verdade(fen, { o: "torres-ligadas", lado: "brancas", ligadas: false });
  // A afirmação carrega o booleano justamente para poder dizer "não estão".
  mentira(fen, { o: "torres-ligadas", lado: "pretas", ligadas: false });
  mentira(fen, { o: "torres-ligadas", lado: "brancas", ligadas: true });

  const setima = "r5k1/pp2Rppp/8/8/8/8/PP3PPP/6K1 w - - 0 30";
  verdade(setima, { o: "torre-na-setima", lado: "brancas", casa: "e7" });
  mentira(setima, { o: "torre-na-setima", lado: "pretas", casa: "a8" });
});

test("escudo do rei e janela do rei", () => {
  const fen = "r1bq1rk1/pppnbp2/2np3p/4p1p1/3PP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - - 0 11";
  verdade(fen, { o: "escudo-do-rei", lado: "brancas", intactos: 3 });
  verdade(fen, { o: "escudo-do-rei", lado: "pretas", intactos: 1 });
  mentira(fen, { o: "escudo-do-rei", lado: "pretas", intactos: 3 });

  const semJanela = "3r2k1/pp3ppp/8/8/8/8/PP3PPP/2R3K1 w - - 0 25";
  verdade(semJanela, { o: "janela-do-rei", lado: "brancas", tem: false });
  mentira(semJanela, { o: "janela-do-rei", lado: "brancas", tem: true });

  const comJanela = "3r2k1/pp3pp1/7p/8/8/7P/PP3PP1/2R3K1 w - - 0 25";
  verdade(comJanela, { o: "janela-do-rei", lado: "brancas", tem: true });
  verdade(comJanela, { o: "janela-do-rei", lado: "pretas", tem: true });

  // Rei fora da última fileira: a pergunta não existe, e a resposta é erro —
  // não um `false` silencioso que passaria por afirmação verdadeira.
  const noCentro = "8/8/8/3k4/8/4K3/8/8 w - - 0 1";
  assert.match(
    conferirAfirmacao(noCentro, { o: "janela-do-rei", lado: "brancas", tem: false }) ?? "",
    /fora da última fileira/,
  );
});

test("lances da peça e roque disponível dependem da vez, e dizem isso", () => {
  const fen = "r1bq1rk1/pp2bppp/2n2n2/2pp4/3P4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 11";
  verdade(fen, { o: "lances-da-peca", casa: "c1", quantos: 1 });
  mentira(fen, { o: "lances-da-peca", casa: "c1", quantos: 2 });
  // Peça de quem não tem a vez: a conta nem existe, e a mensagem diz isso.
  assert.match(
    conferirAfirmacao(fen, { o: "lances-da-peca", casa: "c8", quantos: 1 }) ?? "",
    /não é de quem tem a vez/,
  );

  const roque = "r1bqkbnr/1ppp1pp1/p1n4p/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5";
  verdade(roque, { o: "roque-disponivel", lado: "brancas", tipo: "curto" });
  mentira(roque, { o: "roque-disponivel", lado: "brancas", tipo: "longo" });
  assert.match(
    conferirAfirmacao(roque, { o: "roque-disponivel", lado: "pretas", tipo: "curto" }) ?? "",
    /não é a vez/,
  );
});

test("espaço além do meio, e casas negadas", () => {
  const fen = "2r3k1/pp2bppp/1qn1p3/2ppP3/3P1P2/2P1BN2/PP2Q1PP/5RK1 b - - 0 18";
  verdade(fen, { o: "peoes-alem-do-meio", lado: "brancas", quantos: 1 });
  verdade(fen, { o: "peoes-alem-do-meio", lado: "pretas", quantos: 0 });
  mentira(fen, { o: "peoes-alem-do-meio", lado: "brancas", quantos: 3 });

  const centro = "r1bq1rk1/pp2ppbp/2np1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 10";
  verdade(centro, { o: "casas-negadas", casas: ["b5", "d5"], por: "brancas" });
  // c5 é disputada: o peão preto de d6 também a alcança.
  mentira(centro, { o: "casas-negadas", casas: ["b5", "c5"], por: "brancas" });
  // E casa que peão branco nenhum alcança não é negada por eles.
  mentira(centro, { o: "casas-negadas", casas: ["a5"], por: "brancas" });
});

test("a FEN ilegal corta a conferência antes das afirmações", () => {
  // Reis colados: `problemasDaPosicao` devolve **um** problema, o da FEN, em
  // vez de vinte erros derivados que escondem a única causa.
  const problemas = problemasDaPosicao({
    fen: "8/8/8/3kK3/8/8/8/8 w - - 0 1",
    afirma: [
      { o: "vez", lado: "pretas" },
      { o: "peoes", brancas: 8, pretas: 8 },
    ],
  });
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /FEN ilegal/);
});
