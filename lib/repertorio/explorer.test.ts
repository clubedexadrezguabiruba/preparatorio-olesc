import assert from "node:assert/strict";
import test from "node:test";
import {
  aCobrir,
  chaveDoCache,
  consultar,
  enderecoDe,
  resumir,
  type Cache,
} from "./explorer.ts";

/**
 * O explorer — sem tocar na rede.
 *
 * A resposta gravada abaixo é o formato real do endereço do Lichess, com os
 * números da posição depois de `1.e4` na faixa pedida (medidos em 5/9/2026 e
 * arredondados). Teste que chama a rede não é teste: falha no avião, muda de
 * resultado sozinho, e transforma "os números batem" em "o Lichess estava de pé".
 */

const DEPOIS_DE_E4 = {
  white: 180_000_000,
  draws: 20_000_000,
  black: 160_000_000,
  moves: [
    { san: "e5", uci: "e7e5", white: 110_000_000, draws: 12_000_000, black: 94_000_000 },
    { san: "c5", uci: "c7c5", white: 18_000_000, draws: 2_000_000, black: 16_000_000 },
    { san: "d5", uci: "d7d5", white: 16_000_000, draws: 1_500_000, black: 13_500_000 },
    { san: "e6", uci: "e7e6", white: 13_000_000, draws: 1_200_000, black: 10_800_000 },
    { san: "c6", uci: "c7c6", white: 8_500_000, draws: 1_000_000, black: 7_500_000 },
    { san: "d6", uci: "d7d6", white: 5_000_000, draws: 500_000, black: 4_500_000 },
  ],
};

const cacheDeMentira = (): Cache & { gravou: number; leu: number } => {
  const dentro = new Map<string, unknown>();
  const c = {
    leu: 0,
    gravou: 0,
    ler(chave: string) {
      c.leu += 1;
      return dentro.get(chave);
    },
    gravar(chave: string, valor: unknown) {
      c.gravou += 1;
      dentro.set(chave, valor);
    },
  };
  return c;
};

test("a resposta crua vira contagem de jogos, ordenada, com percentual", () => {
  const lido = resumir(DEPOIS_DE_E4);
  assert.equal(lido?.jogos, 360_000_000);
  assert.deepEqual(
    lido?.respostas.map((r) => `${r.san} ${r.pct}%`),
    ["e5 60%", "c5 10%", "d5 8.6%", "e6 6.9%", "c6 4.7%", "d6 2.8%"],
  );
  // Quem ganhou não entra na conta: a pergunta é "o aluno vai ver isto?".
  assert.equal(lido?.respostas[0].jogos, 216_000_000);
});

test("resposta em formato inesperado devolve null em vez de estourar", () => {
  assert.equal(resumir(null), null);
  assert.equal(resumir("não é json"), null);
  assert.equal(resumir({ white: 1 }), null, "sem `moves` não dá para fazer nada");
});

test("o corte cobre 80 % da posição, com teto de 4 respostas", () => {
  const posicao = resumir(DEPOIS_DE_E4)!;
  const { entram, sobram, coberto } = aCobrir(posicao);
  assert.deepEqual(entram.map((r) => r.san), ["e5", "c5", "d5", "e6"]);
  assert.equal(coberto, 85.5);
  assert.deepEqual(sobram.map((r) => r.san), ["c6", "d6"]);
});

test("o teto segura a decoreba mesmo quando a posição é espalhada", () => {
  // Seis respostas de 16 % cada: cobrir 80 % exigiria cinco. "Poucas ideias" é
  // critério pedagógico, então o teto ganha do percentual.
  const espalhada = resumir({
    white: 600,
    draws: 0,
    black: 0,
    moves: "abcdef".split("").map((l, i) => ({ san: `${l}3`, uci: `${l}2${l}3`, white: 100 - i })),
  })!;
  const { entram, coberto } = aCobrir(espalhada);
  assert.equal(entram.length, 4);
  assert.ok(coberto < 80, `cobriu ${coberto}% — e a tabela tem de mostrar isso`);
});

test("no Avançado a fatia é maior e o teto é mais alto", () => {
  const posicao = resumir(DEPOIS_DE_E4)!;
  const { entram } = aCobrir(posicao, { fatia: 0.9, teto: 6 });
  assert.deepEqual(entram.map((r) => r.san), ["e5", "c5", "d5", "e6", "c6"]);
});

test("o cache responde sem rede, e a chave é estável", () => {
  const cache = cacheDeMentira();
  cache.gravar(chaveDoCache(["e2e4"]), DEPOIS_DE_E4);
  assert.equal(chaveDoCache(["e2e4"]), chaveDoCache(["e2e4"]), "rodar de novo dá a mesma chave");
  assert.notEqual(chaveDoCache(["e2e4"]), chaveDoCache(["d2d4"]));

  return consultar(["e2e4"], {
    cache,
    token: "não vai ser usado",
    buscar: () => {
      throw new Error("o cache devia ter respondido antes de qualquer rede");
    },
  }).then((lido) => {
    assert.equal(lido?.jogos, 360_000_000);
  });
});

test("sem token a consulta devolve “sem dados”, e avisa uma vez", async () => {
  // Nunca trava compilar nem validar: medir é uma coisa, provar que os lances
  // são legais é outra.
  const ditos: string[] = [];
  const lido = await consultar(["e2e4"], {
    token: undefined,
    avisar: (m) => ditos.push(m),
    buscar: () => {
      throw new Error("não devia tentar rede sem token");
    },
  });
  assert.equal(lido, null);
  assert.match(ditos[0], /sem LICHESS_TOKEN/);
});

test("401 e rede fora devolvem null, com o aviso dizendo o que houve", async () => {
  const ditos: string[] = [];
  const quatroUm = await consultar(["e2e4"], {
    token: "ruim",
    intervalo: 0,
    avisar: (m) => ditos.push(m),
    buscar: async () => new Response("", { status: 401 }),
  });
  assert.equal(quatroUm, null);
  assert.match(ditos[0], /respondeu 401/);

  const caiu = await consultar(["e2e4"], {
    token: "bom",
    intervalo: 0,
    avisar: (m) => ditos.push(m),
    buscar: async () => {
      throw new Error("ECONNRESET");
    },
  });
  assert.equal(caiu, null);
  assert.match(ditos[1], /não respondeu.*ECONNRESET/);
});

test("a consulta boa grava no cache; a ruim não envenena o cache", async () => {
  const cache = cacheDeMentira();
  await consultar(["e2e4"], {
    cache,
    token: "bom",
    intervalo: 0,
    buscar: async () => Response.json(DEPOIS_DE_E4),
  });
  assert.equal(cache.gravou, 1);

  await consultar(["d2d4"], {
    cache,
    token: "bom",
    intervalo: 0,
    buscar: async () => Response.json({ isto: "não é o explorer" }),
  });
  assert.equal(cache.gravou, 1, "formato inesperado não vira cache");
});

test("o endereço traz as faixas e os ritmos escolhidos", () => {
  const endereco = enderecoDe(["e2e4", "c7c5"]);
  assert.match(endereco, /speeds=rapid%2Cclassical/);
  assert.match(endereco, /ratings=1000%2C1200%2C1400/);
  assert.match(endereco, /play=e2e4%2Cc7c5/);
});
