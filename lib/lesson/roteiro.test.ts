import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonSchema, type Expect, type RoteiroPasso, type TreeNode } from "./schema.ts";
import { duracaoDoRoteiro, montarQuadros, pausaDoPasso } from "./roteiro.ts";
import { lerRegua } from "./voz.ts";

/**
 * A aritmética da etapa 1. Metade dos casos usa um roteiro sintético — é o
 * único jeito de medir o passo sem lance e o mate sem depender de a aula real
 * ter um —, e a outra metade lê o `content/` de verdade, para o dia em que a
 * aula mudar e a conta não mudar junto.
 *
 * A herança está declarada no cabeçalho de `roteiro.ts`: o `montarQuadros` é o
 * `buildFrames` de `aeb5ca1^:lib/lesson/example.ts`, e os dois primeiros casos
 * daqui são os de lá, adaptados à contagem nova (um passo, um quadro).
 */

const lesson = lessonSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "content/lessons/N1-KPK.json"), "utf8")),
);

const passo = (p: Partial<RoteiroPasso>): RoteiroPasso => ({ fala: "fala", ...p });

test("um passo é um quadro, e o passo sem lance repete a posição sem lastMove", () => {
  const inicial = "8/4k3/2K5/8/8/8/1P6/8 w - - 0 1";
  const quadros = montarQuadros(inicial, [
    passo({}),
    passo({ lance: "c6c7" }),
    passo({ lance: "e7e6" }),
  ]);
  assert.equal(quadros.length, 3, "um quadro por passo, sem quadro 0 avulso");
  assert.equal(quadros[0].fen, inicial);
  assert.equal(quadros[0].lastMove, null);
  assert.deepEqual(quadros[1].lastMove, ["c6", "c7"]);
  assert.equal(quadros[1].fen.startsWith("8/2K1k3/8/"), true);
});

test("montarQuadros marca o mate e o lado matado, para o pulso do rei", () => {
  // A mesma linha do teste original de `example.test.ts`: torre corta em g5, o
  // rei preto tem lance único, e Tg8 é mate.
  const quadros = montarQuadros("5k2/8/4K3/3R4/8/8/8/8 w - - 0 1", [
    passo({ lance: "d5g5" }),
    passo({ lance: "f8e8" }),
    passo({ lance: "g5g8" }),
  ]);
  assert.equal(quadros[0].mate, false);
  assert.equal(quadros[2].mate, true);
  assert.equal(quadros[2].matedColor, "black");
});

test("a pausa tem piso, e o `espera` do autor soma por cima", () => {
  const curto = passo({ fala: "Dama." });
  assert.equal(pausaDoPasso(curto), 1000, "cinco caracteres não passam em 225 ms");
  assert.equal(pausaDoPasso({ ...curto, espera: 900 }), 1900);
  const longo = passo({ fala: "x".repeat(100) });
  assert.equal(pausaDoPasso(longo), 4500);
});

test("a etapa 1 da N1-KPK dura o que a régua manda", () => {
  const objective = lesson.stages.objective;
  assert.ok(objective, "a aula piloto precisa ter a etapa 1");
  // A faixa vem de `docs/VOZ-DO-CURSO.md` §3.1b, como todo número desta casa.
  const [piso, teto] = lerRegua().roteiroSegundos;
  const segundos = duracaoDoRoteiro(objective.roteiro) / 1000;
  assert.ok(
    segundos >= piso && segundos <= teto,
    `a etapa 1 dura ${segundos.toFixed(1)} s, fora da faixa de ${piso} a ${teto} s`,
  );
});

test("o roteiro da N1-KPK fecha no tabuleiro e termina com a dama em b8", () => {
  const objective = lesson.stages.objective;
  const guided = lesson.stages.guided;
  assert.ok(objective && guided, "a aula piloto precisa das duas etapas");
  const raiz = guided.nodes[guided.root];
  // Se um lance fosse ilegal a chess.js lançaria aqui, como lança no schema.
  const quadros = montarQuadros(raiz.fen, objective.roteiro);
  assert.equal(quadros.length, objective.roteiro.length);
  assert.equal(quadros.at(-1)?.fen.startsWith("1Q6/2K5/"), true, "a dama nasce em b8");
});

test("a linha do roteiro é a linha que a etapa 2 cobra", () => {
  const objective = lesson.stages.objective;
  const guided = lesson.stages.guided;
  assert.ok(objective && guided);
  const doRoteiro = objective.roteiro.flatMap((p) => (p.lance ? [p.lance] : []));

  // A linha da árvore, andada do nó raiz: lance do método, resposta do
  // defensor, e assim por diante até o nó terminal.
  const daArvore: string[] = [];
  let id: string | undefined = guided.root;
  while (id) {
    const node: TreeNode = guided.nodes[id];
    const expect: Expect = node.expects[0];
    daArvore.push(expect.moves[0]);
    if (!("reply" in expect) || !expect.reply) break;
    daArvore.push(expect.reply);
    id = "next" in expect ? expect.next : undefined;
  }

  assert.deepEqual(
    doRoteiro,
    daArvore,
    "o que a etapa 1 mostra e o que a etapa 2 pede têm de ser a MESMA linha",
  );
});
