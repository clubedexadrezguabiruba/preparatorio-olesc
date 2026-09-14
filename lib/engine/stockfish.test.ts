import assert from "node:assert/strict";
import test from "node:test";
import { ENGINE_BUILD } from "./build.ts";
import { criarMotor, isAborted, type AtualizacaoDaAnalise, type WorkerDoMotor } from "./stockfish.ts";

/**
 * A fábrica do motor e a análise contínua do professor (fatia 9, parada 9A).
 *
 * Worker e WebAssembly não existem no `node --test`. O que existe é a **conversa**: o
 * motor manda texto, o worker devolve texto. Um worker falso que responde `uciok` e
 * `readyok` sozinho, e deixa o teste ditar as linhas `info` e o `bestmove`, alcança a
 * parte do `stockfish.ts` que tem lógica — o carimbo de pedido, a fila do `isready`, o
 * descarte da resposta vencida e o encerramento.
 */

class WorkerFalso {
  enviados: string[] = [];
  encerrado = false;
  buscando = false;
  onmessage: ((evento: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;

  postMessage(comando: string): void {
    if (this.encerrado) throw new Error("worker encerrado");
    this.enviados.push(comando);
    if (comando === "uci") this.depois("uciok");
    else if (comando === "isready") this.depois("readyok");
    else if (comando.startsWith("go ")) this.buscando = true;
    else if (comando === "stop" && this.buscando) {
      // `stop` no UCI não cancela: força um `bestmove` imediato.
      this.buscando = false;
      this.depois("bestmove e2e4");
    }
  }

  terminate(): void {
    this.encerrado = true;
  }

  /** Responde na ordem, depois do código que mandou o comando. */
  private fila = Promise.resolve();
  private depois(linha: string): void {
    this.fila = this.fila.then(() => {
      if (!this.encerrado) this.onmessage?.({ data: linha });
    });
  }

  emitir(linha: string): void {
    if (linha.startsWith("bestmove")) this.buscando = false;
    this.onmessage?.({ data: linha });
  }
}

const esperar = () => new Promise((resolve) => setTimeout(resolve, 0));

function fabricar(opcoes: { intervaloMinimoMs?: number } = {}) {
  const workers: WorkerFalso[] = [];
  const motor = criarMotor(ENGINE_BUILD, {
    criarWorker: () => {
      const falso = new WorkerFalso();
      workers.push(falso);
      return falso as unknown as WorkerDoMotor;
    },
    medir: false,
    intervaloMinimoMs: opcoes.intervaloMinimoMs ?? 0,
  });
  return { motor, workers };
}

const FEN_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const FEN_DEPOIS_DE_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

test("duas instâncias: o lance do aluno em voo e a análise do professor não se cancelam", async () => {
  const aluno = fabricar();
  const professor = fabricar();

  aluno.motor.acquire();
  const lance = aluno.motor.handle.bestMove({ fen: FEN_INICIAL, skill: 3, moveTimeMs: 300 });
  await esperar();
  assert.ok(aluno.workers[0].enviados.some((c) => c.startsWith("go movetime")), "o aluno pediu o lance");

  const atualizacoes: AtualizacaoDaAnalise[] = [];
  const analise = professor.motor.analisarContinuo(
    { fen: FEN_DEPOIS_DE_E4, multiPv: 2, profundidade: 22 },
    (a) => atualizacoes.push(a),
  );
  await esperar();

  // Dois workers, duas conversas: nenhum `stop` atravessou para o aluno.
  assert.equal(aluno.workers.length, 1);
  assert.equal(professor.workers.length, 1);
  assert.ok(!aluno.workers[0].enviados.includes("stop"), "o professor não mandou stop no worker do aluno");
  assert.ok(professor.workers[0].enviados.includes("go depth 22"));
  assert.ok(professor.workers[0].enviados.includes("setoption name MultiPV value 2"));
  assert.ok(!aluno.workers[0].enviados.some((c) => c.startsWith("setoption name MultiPV")), "o MultiPV do professor não vaza para o aluno");

  aluno.workers[0].emitir("bestmove d2d4");
  assert.equal(await lance, "d2d4");

  professor.workers[0].emitir("info depth 1 multipv 1 score cp 30 pv e7e5");
  professor.workers[0].emitir("info depth 1 multipv 2 score cp 40 pv c7c5");
  professor.workers[0].emitir("bestmove e7e5");
  const final = await analise;
  assert.equal(final.depth, 1);
  assert.deepEqual(final.linhas.map((l) => l.pv[0]), ["e7e5", "c7c5"]);
  assert.ok(atualizacoes.length >= 1);

  aluno.motor.dispose();
  professor.motor.dispose();
});

test("posição nova cancela a anterior e descarta a resposta obsoleta", async () => {
  const { motor, workers } = fabricar();
  const vistas: AtualizacaoDaAnalise[] = [];
  const primeira = motor.analisarContinuo({ fen: FEN_INICIAL, multiPv: 1, profundidade: 22 }, (a) => vistas.push(a));
  await esperar();
  const [falso] = workers;
  assert.ok(falso.enviados.includes(`position fen ${FEN_INICIAL}`));

  const segunda = motor.analisarContinuo({ fen: FEN_DEPOIS_DE_E4, multiPv: 1, profundidade: 22 }, (a) => vistas.push(a));
  await assert.rejects(primeira, (erro) => isAborted(erro));
  // O `stop` forçou um `bestmove` da posição antiga; ele chega com carimbo vencido.
  await esperar();
  await esperar();

  // Uma `info` atrasada da posição antiga, chegando entre o `stop` e o novo `go`, também morre:
  // só é lida quando o pedido em voo é o de agora.
  const antesDoGo = falso.enviados.lastIndexOf(`position fen ${FEN_DEPOIS_DE_E4}`);
  assert.ok(antesDoGo > falso.enviados.lastIndexOf("stop"), "a posição nova só foi mandada depois do stop");

  falso.emitir("info depth 5 multipv 1 score cp -20 pv c7c5");
  falso.emitir("bestmove c7c5");
  const final = await segunda;
  assert.deepEqual(final.linhas.map((l) => l.pv[0]), ["c7c5"]);
  assert.ok(vistas.every((v) => v.fen === FEN_DEPOIS_DE_E4), "nenhuma atualização da posição antiga chegou");
  motor.dispose();
});

test("atualização parcial por profundidade: só com todas as linhas do MultiPV 2", async () => {
  const { motor, workers } = fabricar();
  const vistas: AtualizacaoDaAnalise[] = [];
  const analise = motor.analisarContinuo({ fen: FEN_INICIAL, multiPv: 2, profundidade: 22 }, (a) => vistas.push(a));
  await esperar();
  const [falso] = workers;

  falso.emitir("info depth 1 multipv 1 score cp 20 pv e2e4");
  assert.equal(vistas.length, 0, "a primeira linha sozinha não é profundidade completa");
  falso.emitir("info depth 1 multipv 2 score cp 10 pv d2d4");
  assert.equal(vistas.length, 1);
  assert.equal(vistas[0].depth, 1);
  assert.deepEqual(vistas[0].linhas.map((l) => l.pv[0]), ["e2e4", "d2d4"]);
  assert.equal(vistas[0].final, false);

  // Janela de aspiração: avaliação parcial não conta.
  falso.emitir("info depth 2 multipv 1 score cp 25 lowerbound pv e2e4");
  falso.emitir("info depth 2 multipv 1 score cp 22 pv e2e4 e7e5");
  assert.equal(vistas.length, 1);
  falso.emitir("info depth 2 multipv 2 score cp 12 pv d2d4 d7d5");
  assert.equal(vistas.length, 2);
  assert.equal(vistas[1].depth, 2);
  assert.equal(vistas[1].linhas[0].cp, 22);

  falso.emitir("bestmove e2e4");
  await analise;
  assert.equal(vistas.at(-1)?.final, true);
  motor.dispose();
});

test("no máximo uma atualização por intervalo, e a mais funda chega", async () => {
  const { motor, workers } = fabricar({ intervaloMinimoMs: 40 });
  const vistas: AtualizacaoDaAnalise[] = [];
  const analise = motor.analisarContinuo({ fen: FEN_INICIAL, multiPv: 1, profundidade: 22 }, (a) => vistas.push(a));
  await esperar();
  const [falso] = workers;
  for (let d = 1; d <= 10; d += 1) falso.emitir(`info depth ${d} multipv 1 score cp ${d} pv e2e4`);
  assert.equal(vistas.length, 1, "a primeira passa; as nove seguintes esperam o intervalo");
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(vistas.length, 2);
  assert.equal(vistas[1].depth, 10, "a atualização adiada é a mais funda");
  falso.emitir("bestmove e2e4");
  await analise;
  motor.dispose();
});

test("dispose manda quit e encerra o worker", async () => {
  const { motor, workers } = fabricar();
  const analise = motor.analisarContinuo({ fen: FEN_INICIAL, multiPv: 2, profundidade: 22 }, () => undefined);
  await esperar();
  const [falso] = workers;
  motor.dispose();
  await assert.rejects(analise, (erro) => isAborted(erro));
  assert.ok(falso.enviados.includes("quit"));
  assert.equal(falso.enviados.at(-1), "quit");
  assert.equal(falso.encerrado, true);
  assert.equal(motor.getStatus(), "loading");
});

test("o motor do aluno continua exportado com a mesma assinatura", async () => {
  const modulo = await import("./stockfish.ts");
  for (const nome of ["acquireEngine", "releaseEngine", "subscribeEngineStatus", "getEngineStatus", "readEngineTimings", "isAborted"]) {
    assert.equal(typeof (modulo as Record<string, unknown>)[nome], "function", nome);
  }
  assert.equal(modulo.getEngineStatus(), "loading");
});
