/**
 * Mede o corpus grande do Editor v2 e imprime os números que sustentam os tetos de
 * `lib/editor-v2/limites.ts`.
 *
 *     node scripts/medir-corpus-v2.ts
 *
 * ## Duas decisões de método, e o erro que as motivou
 *
 * **Medir no Node, e não no navegador.** O que se quer saber é o custo do algoritmo,
 * e a página embutida mistura render no cronômetro — um `requestAnimationFrame` duplo
 * vazio custa 392 ms neste ambiente e já inflou uma medida inteira em 10/09/2026.
 *
 * **Um processo por caso, e mediana em vez de média.** A primeira versão media todos
 * os casos no mesmo processo e relatou 176 ms para a árvore de 1.000 nós; a execução
 * seguinte, com mais fixtures vivas na memória, relatou 468 ms para exatamente a mesma
 * conta. A diferença era pressão de memória do próprio medidor, não custo do código.
 * Aqui cada caso roda num processo limpo, com cinco execuções de aquecimento
 * descartadas, e o que sai é mediana e p95 de 20 medidas — números que repetem: duas
 * execuções seguidas da árvore de 2.000 deram 613 e 612 ms.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { mapaDaAnalise } from "../lib/editor-v2/arvore.ts";
import { arvoreLargaV2, linhaLongaV2, POSICOES_DO_CORPUS } from "../lib/editor-v2/corpus.ts";
import { hashDaPosicao } from "../lib/editor-v2/hash.ts";
import { LIMITES_V2, medidasDaAulaV2, problemasDeLimiteV2 } from "../lib/editor-v2/limites.ts";
import { adaptarLessonV1 } from "../lib/editor-v2/adaptar-v1.ts";
import { problemasDaAulaV2, type AulaV2 } from "../lib/editor-v2/modelo.ts";
import { lessonSchema, positionSchema, type Position } from "../lib/lesson/schema.ts";

const AQUECIMENTO = 5;
const MEDIDAS = 20;

function arquivosJson(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    return entrada.isDirectory() ? arquivosJson(caminho) : caminho.endsWith(".json") ? [caminho] : [];
  });
}

function percentis(rodar: () => void): { mediana: number; p95: number } {
  for (let i = 0; i < AQUECIMENTO; i += 1) rodar();
  const tempos: number[] = [];
  for (let i = 0; i < MEDIDAS; i += 1) {
    const inicio = performance.now();
    rodar();
    tempos.push(performance.now() - inicio);
  }
  tempos.sort((a, b) => a - b);
  return { mediana: tempos[Math.floor(MEDIDAS / 2)], p95: tempos[Math.floor(MEDIDAS * 0.95) - 1] };
}

function row(nome: string, aula: AulaV2, positions: Record<string, Position>): string {
  const medidas = medidasDaAulaV2(aula);
  const arvore = percentis(() => {
    for (const analise of aula.analises) mapaDaAnalise(aula, analise.id, positions);
  });
  const validacao = percentis(() => void problemasDaAulaV2(aula, positions, hashDaPosicao));
  const problemas = problemasDaAulaV2(aula, positions, hashDaPosicao);
  return [
    nome.padEnd(20),
    `${String(medidas.nos).padStart(5)} lances`,
    `prof ${String(medidas.profundidade).padStart(4)}`,
    `${String(Math.round(medidas.bytes / 1024)).padStart(4)} KB`,
    `${String(medidas.comentarios).padStart(4)} coment.`,
    `árvore ${String(Math.round(arvore.mediana)).padStart(4)}/${String(Math.round(arvore.p95)).padStart(4)} ms`,
    `validação ${String(Math.round(validacao.mediana)).padStart(4)}/${String(Math.round(validacao.p95)).padStart(4)} ms`,
    `${problemas.length} problema(s)`,
  ].join(" | ");
}

/** As fixtures grandes, uma por processo — ver o cabeçalho para o porquê. */
const CASOS: Record<string, () => string> = {
  "linha-500": () => row("linha de 500", linhaLongaV2(500), POSICOES_DO_CORPUS),
  "arvore-1000": () => row("árvore de 1.000", arvoreLargaV2(1000), POSICOES_DO_CORPUS),
  "linha-no-teto": () => row("linha no teto", linhaLongaV2(LIMITES_V2.profundidade), POSICOES_DO_CORPUS),
  "arvore-no-teto": () => row("árvore no teto", arvoreLargaV2(LIMITES_V2.nosPorAnalise), POSICOES_DO_CORPUS),
};

const caso = process.argv[2];
if (caso) {
  console.log(CASOS[caso]());
} else {
  console.log(`Ambiente: Node ${process.version}, ${process.platform}. Mediana/p95 de ${MEDIDAS} execuções, ${AQUECIMENTO} de aquecimento descartadas.\n`);

  const positions = Object.fromEntries(
    arquivosJson("content/positions").map((arquivo) => {
      const posicao = positionSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
      return [posicao.id, posicao];
    }),
  );
  for (const arquivo of arquivosJson("content/lessons")) {
    const lesson = lessonSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
    console.log(row(path.basename(arquivo, ".json"), adaptarLessonV1(lesson, positions), positions));
  }
  for (const nome of Object.keys(CASOS)) {
    process.stdout.write(execFileSync(process.execPath, [import.meta.filename, nome], { encoding: "utf8" }));
  }

  // O plano (§17) pede corpus também **acima** do teto: um limite que nunca foi
  // exercitado é um número escrito, não um número medido.
  console.log("\nAcima do teto, o que o professor lê na tela:");
  for (const problema of problemasDeLimiteV2(arvoreLargaV2(LIMITES_V2.nosPorAnalise + 100))) console.log(`  ${problema.codigo}: ${problema.mensagem}`);
  for (const problema of problemasDeLimiteV2(linhaLongaV2(LIMITES_V2.profundidade + 1))) console.log(`  ${problema.codigo}: ${problema.mensagem}`);
}
