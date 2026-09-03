import assert from "node:assert/strict";
import test from "node:test";
import { contraste, parseCor } from "../tema/cor.ts";
import { PECAS } from "./pecas.ts";
import {
  BORDA,
  CASA_CLARA,
  CASA_ESCURA,
  diagrama,
  LADO_CASA,
  ladoDaVez,
  MARGEM,
  TINTA,
} from "./tabuleiro.ts";

const INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** Mate do corredor: pretas na vez, e o rei preto no canto escuro do tabuleiro. */
const CORREDOR = "6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1";

/** Encontra o `<rect>` que pinta uma casa, pelo canto de cima e da esquerda. */
function casaEm(svg: string, x: number, y: number): string {
  const achado = svg.match(new RegExp(`<rect x="${x}" y="${y}" width="${LADO_CASA}"[^>]*>`));
  assert.ok(achado, `não achei a casa em (${x}, ${y})`);
  return achado[0];
}

/* ------------------------------------------------------------------ *
 * Geometria — a casa certa, do lado certo
 * ------------------------------------------------------------------ */

test("a1 é escura e h1 é clara, como em todo tabuleiro", () => {
  const svg = diagrama(INICIAL);
  const baixo = MARGEM + LADO_CASA * 7;
  assert.match(casaEm(svg, MARGEM, baixo), new RegExp(`fill="${CASA_ESCURA}"`));
  assert.match(casaEm(svg, MARGEM + LADO_CASA * 7, baixo), new RegExp(`fill="${CASA_CLARA}"`));
});

test("as 32 peças da posição inicial entram, e nada mais", () => {
  // Nada mais é literal: já houve aqui um rei miúdo de marca de lado, e o
  // motivo de ele ter saído está em `tabuleiro.ts`. Este número é o que impede
  // que outro glifo entre no desenho sem alguém decidir.
  const svg = diagrama(INICIAL);
  assert.equal(svg.match(/<g transform="translate\(/g)?.length, 32);
});

test("olhando das pretas, o tabuleiro gira — a torre de a8 troca de canto", () => {
  const alto = `translate(${MARGEM} ${MARGEM})">${PECAS.br}`;
  assert.ok(diagrama(INICIAL, { orientacao: "brancas" }).includes(alto));

  // Das pretas, a8 vai para o canto de baixo à direita.
  const canto = MARGEM + LADO_CASA * 7;
  const outro = `translate(${canto} ${canto})">${PECAS.br}`;
  assert.ok(diagrama(INICIAL, { orientacao: "pretas" }).includes(outro));
});

test("sem orientação pedida, o diagrama se olha do lado de quem tem a vez", () => {
  assert.equal(ladoDaVez(CORREDOR), "pretas");
  assert.equal(diagrama(CORREDOR), diagrama(CORREDOR, { orientacao: "pretas" }));
  assert.notEqual(diagrama(CORREDOR), diagrama(CORREDOR, { orientacao: "brancas" }));
});

test("a caixa é o tabuleiro mais a margem das coordenadas, e é quadrada", () => {
  assert.match(diagrama(INICIAL).slice(0, 120), /viewBox="0 0 404 404"/);
  assert.equal(MARGEM * 2 + LADO_CASA * 8, 404);

  // Sem coordenadas sobra só a moldura, e as oito letras somem junto.
  const nu = diagrama(INICIAL, { coordenadas: false });
  const lado = LADO_CASA * 8 + BORDA * 2;
  assert.match(nu.slice(0, 120), new RegExp(`viewBox="0 0 ${lado} ${lado}"`));
  assert.equal(nu.match(/<text/g), null);
});

test("FEN impossível estoura na geração, não no PDF", () => {
  assert.throws(() => diagrama("nada disso é uma FEN"));
});

/* ------------------------------------------------------------------ *
 * O SVG sobrevive à impressão
 * ------------------------------------------------------------------ */

test("o diagrama é autocontido: nada que precise ser buscado", () => {
  // Uma referência externa (imagem, fonte, script) não falha — ela **some** na
  // hora do `page.pdf()`, e o caderno sai com um quadrado vazio no lugar da
  // peça. Por isso a proibição é medida aqui, e não vista no PDF depois.
  const svg = diagrama(INICIAL);
  for (const proibido of ["<image", "<script", "url(", "href=", "@import"]) {
    assert.ok(!svg.includes(proibido), `o SVG trouxe "${proibido}"`);
  }
});

/* ------------------------------------------------------------------ *
 * A régua de tinta — o diagrama é legível impresso em P&B
 * ------------------------------------------------------------------ */

const razao = (a: string, b: string): number => contraste(parseCor(a), parseCor(b));

test("a peça preta se separa da casa escura", () => {
  // O rei preto em h8, casa escura, é o caso que decide: se este par cair, o
  // aluno perde a peça mais importante do diagrama no canto da folha.
  // Piso 7:1 — bem acima do 4,5:1 de texto, porque aqui não há palavra em volta
  // que ajude a adivinhar o que era.
  const medido = razao(TINTA, CASA_ESCURA);
  assert.ok(medido >= 7, `peça preta sobre casa escura: ${medido.toFixed(2)}:1`);
});

test("o traço das peças se separa das duas casas", () => {
  // A peça **branca** não tem contraste de preenchimento contra a casa clara:
  // as duas são brancas. Quem a desenha é o traço preto de 1,5 do cburnett — e
  // é o traço, então, que tem de aguentar as duas casas.
  for (const casa of [CASA_CLARA, CASA_ESCURA]) {
    const medido = razao(TINTA, casa);
    assert.ok(medido >= 4.5, `traço sobre ${casa}: ${medido.toFixed(2)}:1`);
  }
});

test("as duas casas se separam uma da outra", () => {
  // O mesmo par, com o outro sentido: é ele que faz o quadriculado existir, e
  // é ele que a peça branca usa para não sumir na casa clara.
  // O piso é baixo de propósito. Casa escura mais escura melhoraria o
  // quadriculado e pioraria o par de cima — o rei preto no canto. 21% de
  // cobertura é onde os dois cabem, e é o registro dos livros impressos.
  const medido = razao(CASA_CLARA, CASA_ESCURA);
  assert.ok(medido >= 1.5, `casa clara contra casa escura: ${medido.toFixed(2)}:1`);
  assert.ok(medido <= 2.5, `casa escura escura demais: ${medido.toFixed(2)}:1`);
});

test("a paleta do papel não é a da tela", () => {
  // Guarda contra alguém "unificar" as cores um dia: as casas marrons do site
  // viram dois cinzas parecidos no laser P&B da escola.
  assert.equal(CASA_CLARA, "#ffffff");
  assert.equal(parseCor(CASA_ESCURA).r, parseCor(CASA_ESCURA).b);
});
