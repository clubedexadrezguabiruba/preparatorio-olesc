import assert from "node:assert/strict";
import test from "node:test";
import {
  aCobrir,
  chaveDoCache,
  consultar,
  enderecoDe,
  RECORTES,
  recuoDe,
  resumir,
  TETO_DO_RECUO,
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

test("outro recorte é outro endereço — e o balde do piso é o 0", () => {
  // O Lichess não tem balde abaixo de 1000: o piso é um só, de 0 a 999. É por
  // isso que "700–1700" não existe como pedido, e o ⚠13 não se resolve
  // traduzindo o número do clube para dentro do `ratings`.
  assert.match(
    enderecoDe(["e2e4"], RECORTES["lichess-0-1799"]),
    /ratings=0%2C1000%2C1200%2C1400%2C1600/,
  );
  assert.match(
    enderecoDe(["e2e4"], RECORTES["lichess-1000-1999"]),
    /ratings=1000%2C1200%2C1400%2C1600%2C1800/,
  );
});

test("um recorte nunca lê o cache do outro", () => {
  // A chave é o hash do endereço inteiro, e o endereço carrega `ratings=`. Sem
  // isto, medir a faixa nova serviria calado o número da faixa velha — que é
  // exatamente o erro que o ⚠13 existe para desfazer.
  const play = ["e2e4", "c7c5"];
  const chaves = Object.values(RECORTES).map((faixas) => chaveDoCache(play, faixas));
  assert.equal(new Set(chaves).size, chaves.length, "três recortes, três chaves");
  assert.equal(chaveDoCache(play), chaveDoCache(play, RECORTES["lichess-1000-1599"]));
});

/* ------------------------------------------------------------------ *
 * Quando o explorer manda esperar
 * ------------------------------------------------------------------ */

/** Um `fetch` de mentira que devolve a fila combinada e conta as chamadas. */
const filaDe = (...respostas: Array<() => Response>) => {
  const f = {
    idas: 0,
    buscar: async () => {
      const proxima = respostas[Math.min(f.idas, respostas.length - 1)];
      f.idas += 1;
      return proxima();
    },
  };
  return f;
};

const recusa = (status: number, retryAfter?: string) =>
  new Response("", { status, ...(retryAfter ? { headers: { "Retry-After": retryAfter } } : {}) });

test("429 é adiamento, não resposta: a consulta espera e insiste", async () => {
  // Antes, o 429 virava `null` e a posição saía "sem dados" — do lado de fora,
  // indistinguível de uma posição que o explorer não conhece. Quem lesse a
  // tabela cortaria conteúdo por causa de um limite de requisições.
  const rede = filaDe(
    () => recusa(429),
    () => Response.json(DEPOIS_DE_E4),
  );
  const ditos: string[] = [];
  const lido = await consultar(["e2e4"], {
    token: "bom",
    intervalo: 0,
    recuo: 0,
    buscar: rede.buscar,
    avisar: (m) => ditos.push(m),
  });
  assert.equal(lido?.jogos, 360_000_000, "a segunda ida é que vale");
  assert.equal(rede.idas, 2);
  assert.match(ditos[0], /429 — esperando .* tentando de novo/);
});

test("o 429 que não passa desiste, e o aviso diz que insistiu", async () => {
  const rede = filaDe(() => recusa(429));
  const ditos: string[] = [];
  const lido = await consultar(["e2e4"], {
    token: "bom",
    intervalo: 0,
    recuo: 0,
    tentativas: 3,
    buscar: rede.buscar,
    avisar: (m) => ditos.push(m),
  });
  assert.equal(lido, null);
  assert.equal(rede.idas, 3, "`tentativas` conta a primeira ida junto");
  assert.match(ditos.at(-1)!, /respondeu 429.*desisti depois de 3 tentativas/);
});

test("o tropeço de servidor também é passageiro; o 401 não", async () => {
  const tropeco = filaDe(
    () => recusa(503),
    () => Response.json(DEPOIS_DE_E4),
  );
  assert.equal(
    (await consultar(["e2e4"], { token: "bom", intervalo: 0, recuo: 0, buscar: tropeco.buscar }))
      ?.jogos,
    360_000_000,
  );
  assert.equal(tropeco.idas, 2);

  // Token ruim não melhora com insistência — repetir daria a mesma coisa, mais
  // devagar, e ainda gastaria a paciência de um serviço gratuito.
  const ruim = filaDe(() => recusa(401));
  assert.equal(
    await consultar(["e2e4"], { token: "ruim", intervalo: 0, recuo: 0, buscar: ruim.buscar }),
    null,
  );
  assert.equal(ruim.idas, 1);
});

test("o `Retry-After` do servidor ganha do palpite, com teto", () => {
  const com = (status: number, cabecalho?: string) => recusa(status, cabecalho);
  assert.equal(recuoDe(com(429, "5"), 1, 60_000), 5_000, "segundos, como o servidor pediu");
  assert.equal(recuoDe(com(429), 1, 60_000), 60_000, "sem cabeçalho, o minuto do Lichess");
  assert.equal(recuoDe(com(503), 1, 60_000), 2_000, "tropeço de servidor não merece o minuto");
  assert.equal(recuoDe(com(503), 3, 60_000), 6_000, "e sobe a cada tentativa");
  assert.equal(recuoDe(com(429, "99999"), 1, 60_000), TETO_DO_RECUO, "nem que ele peça o dia");
  // `Retry-After` também aceita uma data HTTP. `Number` dá `NaN` ali, e a conta
  // tem de cair no padrão em vez de virar espera de tempo indefinido.
  assert.equal(recuoDe(com(429, "Wed, 09 Sep 2026 12:00:00 GMT"), 1, 60_000), 60_000);
});

test("`semRede` é escolha de quem rodou, não falta de token", async () => {
  // O `--sem-rede` do script mandava `token: undefined`, e o aviso saía
  // "sem LICHESS_TOKEN" mesmo com token no `.env.local` — culpa no lugar errado.
  const ditos: string[] = [];
  const lido = await consultar(["e2e4"], {
    semRede: true,
    token: "existe",
    avisar: (m) => ditos.push(m),
    buscar: () => {
      throw new Error("--sem-rede não pode ir à rede");
    },
  });
  assert.equal(lido, null);
  assert.deepEqual(ditos, [], "não é falha: não avisa");
});
