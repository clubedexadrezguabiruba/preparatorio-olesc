import assert from "node:assert/strict";
import test from "node:test";
import { escalaDoRating, serieDoGrafico, MINIMO_DE_DIAS } from "./rating-grafico.ts";
import type { TentativaDoRating } from "./rating-historico.ts";

function linha(dia: string, antes: number, depois: number, hora = "15:00"): TentativaDoRating {
  return { puzzle_id: `${dia}-${hora}`, origem: "fork", acertou: depois >= antes, rating_antes: antes, rating_depois: depois, temas: null, criada_em: `${dia}T${hora}:00.000Z` };
}

test("a escala abraça os dados: de 600 a 630 o eixo cobre no máximo 40 pontos, e não 100", () => {
  const e = escalaDoRating([600, 612, 630]);
  assert.ok(e.menor <= 600 && e.maior >= 630, "os dados cabem");
  assert.ok(e.maior - e.menor <= 40, `faixa ${e.maior - e.menor}`);
});

test("as marcas caem dentro do eixo, em passo redondo, entre 2 e 5", () => {
  for (const valores of [[600, 630], [600, 900], [583, 600], [1200, 1450]]) {
    const e = escalaDoRating(valores);
    assert.ok(e.marcas.length >= 2 && e.marcas.length <= 5, `${valores}: ${e.marcas}`);
    for (const m of e.marcas) {
      assert.ok(m >= e.menor && m <= e.maior, `${m} fora de ${e.menor}–${e.maior}`);
      assert.equal(m % 5, 0, `${m} não é redondo`);
    }
  }
});

test("rating parado não vira divisão por zero: a faixa mínima abre o eixo em volta", () => {
  const e = escalaDoRating([600, 600]);
  assert.ok(e.maior - e.menor >= 20);
  assert.ok(e.menor < 600 && e.maior > 600);
});

test("a compacta não tem marcas", () => {
  assert.deepEqual(escalaDoRating([600, 640], { compacto: true }).marcas, []);
});

test(`com menos de ${MINIMO_DE_DIAS} dias de jogo o eixo é por problema, e começa no início`, () => {
  const linhas = [linha("2026-09-14", 600, 616), linha("2026-09-14", 616, 630, "16:00")];
  const serie = serieDoGrafico(linhas);
  assert.equal(serie.eixo, "problema");
  assert.deepEqual(serie.pontos.map((p) => p.rating), [600, 616, 630]);
  assert.deepEqual(serie.pontos.map((p) => p.recorde), [600, 616, 630]);
});

test(`com ${MINIMO_DE_DIAS} dias ou mais o eixo é por dia`, () => {
  const linhas = [linha("2026-09-12", 600, 610), linha("2026-09-13", 610, 620), linha("2026-09-14", 620, 615)];
  const serie = serieDoGrafico(linhas);
  assert.equal(serie.eixo, "dia");
  assert.deepEqual(serie.pontos.map((p) => p.rating), [610, 620, 615]);
});

test("a janela de dias vale também para o eixo por problema: o que caiu fora não entra", () => {
  const linhas = [linha("2026-07-01", 600, 700), linha("2026-09-14", 700, 716)];
  const serie = serieDoGrafico(linhas, { dias: 30, hoje: "2026-09-15" });
  assert.equal(serie.eixo, "problema");
  assert.deepEqual(serie.pontos.map((p) => p.rating), [700, 716]);
  assert.deepEqual(serieDoGrafico([]).pontos, []);
});

test("o recorde dentro da janela conta o pico de antes dela, nos dois eixos", () => {
  const antigas = [linha("2026-07-01", 600, 800), linha("2026-07-02", 800, 700)];
  const porProblema = serieDoGrafico([...antigas, linha("2026-09-14", 700, 716)], { dias: 30, hoje: "2026-09-15" });
  assert.deepEqual(porProblema.pontos.map((p) => p.recorde), [800, 800]);
  const recentes = [linha("2026-09-12", 700, 710), linha("2026-09-13", 710, 720), linha("2026-09-14", 720, 730)];
  const porDia = serieDoGrafico([...antigas, ...recentes], { dias: 30, hoje: "2026-09-15" });
  assert.equal(porDia.eixo, "dia");
  assert.deepEqual(porDia.pontos.map((p) => p.recorde), [800, 800, 800]);
});
