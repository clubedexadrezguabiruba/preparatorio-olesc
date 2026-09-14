import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarPgnDoLichess, lerEnderecoLichess } from "./lichess-url.ts";

test("os três formatos aceitos viram o endereço oficial da API, e nada mais", () => {
  const estudo = lerEnderecoLichess("https://lichess.org/study/hf09xMzS");
  assert.deepEqual(estudo, { ok: true, endereco: { tipo: "estudo", estudoId: "hf09xMzS", api: "https://lichess.org/api/study/hf09xMzS.pgn?orientation=true&clocks=false" } });
  const capitulo = lerEnderecoLichess("lichess.org/study/hf09xMzS/C79fIsps");
  assert.equal(capitulo.ok && capitulo.endereco.api, "https://lichess.org/api/study/hf09xMzS/C79fIsps.pgn?orientation=true&clocks=false");
  for (const partida of ["https://lichess.org/q7ZvsdUF", "https://lichess.org/q7ZvsdUFabcd", "https://lichess.org/q7ZvsdUF/black#32", "www.lichess.org/q7ZvsdUF?foo=1"]) {
    const lida = lerEnderecoLichess(partida);
    assert.equal(lida.ok && lida.endereco.api, "https://lichess.org/game/export/q7ZvsdUF?clocks=false&evals=false", partida);
  }
});

test("endereço de outro lugar é recusado sem virar requisição", () => {
  for (const ruim of [
    "https://evil.example/study/hf09xMzS",
    "https://lichess.org.evil.example/study/hf09xMzS",
    "https://user:senha@lichess.org/study/hf09xMzS",
    "http://127.0.0.1/study/hf09xMzS",
    "https://lichess.org:8080/study/hf09xMzS",
    "https://lichess.org/study/curto",
    "https://lichess.org/study/hf09xMzS/C79fIsps/extra",
    "https://lichess.org/@/clubexadrezguabiruba",
    "https://lichess.org/api/study/hf09xMzS.pgn",
    "",
  ]) {
    const lida = lerEnderecoLichess(ruim);
    assert.equal(lida.ok, false, ruim);
  }
});

const resposta = (status: number, corpo = "", cabecalhos: Record<string, string> = {}) => new Response(status >= 300 && status < 400 ? null : corpo, { status, headers: cabecalhos });

test("busca: só o endereço montado, PGN devolvido, e as recusas com a frase certa", async () => {
  const pedidos: string[] = [];
  const ok = await buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", { buscar: async (url) => { pedidos.push(url); return resposta(200, '[Event "x"]\n\n1. e4 *\n'); } });
  assert.equal(ok.ok, true);
  assert.deepEqual(pedidos, ["https://lichess.org/api/study/hf09xMzS.pgn?orientation=true&clocks=false"]);

  const privado = await buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", { buscar: async () => resposta(404) });
  assert.match(!privado.ok ? privado.mensagem : "", /privado.*exporte o PGN/);

  const fora = await buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", { buscar: async () => resposta(302, "", { location: "https://evil.example/x.pgn" }) });
  assert.match(!fora.ok ? fora.mensagem : "", /fora do lichess\.org/);

  const dentro: string[] = [];
  const seguido = await buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", {
    buscar: async (url) => { dentro.push(url); return dentro.length === 1 ? resposta(301, "", { location: "/api/study/hf09xMzS.pgn?v=2" }) : resposta(200, "1. e4 *"); },
  });
  assert.equal(seguido.ok, true);
  assert.equal(dentro[1], "https://lichess.org/api/study/hf09xMzS.pgn?v=2");

  const grande = await buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", { limiteDeBytes: 10, buscar: async () => resposta(200, "x".repeat(50)) });
  assert.match(!grande.ok ? grande.mensagem : "", /passou de/);

  const lento = await buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", {
    tempoMaximoMs: 30,
    buscar: (_url, init) => new Promise((_ok, falha) => init.signal.addEventListener("abort", () => falha(new Error("abortado")))),
  });
  assert.match(!lento.ok ? lento.mensagem : "", /não respondeu/);

  const professor = new AbortController();
  const cancelada = buscarPgnDoLichess("https://lichess.org/study/hf09xMzS", {
    sinal: professor.signal,
    buscar: (_url, init) => new Promise((_ok, falha) => init.signal.addEventListener("abort", () => falha(new Error("abortado")))),
  });
  professor.abort();
  assert.match(((r) => (!r.ok ? r.mensagem : ""))(await cancelada), /cancelada/);
});
