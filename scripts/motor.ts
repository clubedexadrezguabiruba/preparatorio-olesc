import { spawn, type ChildProcessByStdio } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Readable, Writable } from "node:stream";
import { ENGINE_BUILD } from "../lib/engine/build.ts";
import type { Variante } from "../lib/repertorio/motor.ts";
import { RAIZ } from "./env-local.ts";

/**
 * O Stockfish 18 offline, falando UCI — a parte que precisa de processo.
 *
 * Saiu de `scripts/motor-repertorio.ts` quando o meio-jogo passou a precisar do
 * mesmo motor: `scripts/escolher-exercicios.ts` roda a porta 2 do funil, e um
 * segundo driver seria uma segunda opinião sobre a mesma posição, com as três
 * armadilhas abaixo para redescobrir do zero.
 *
 * O motor é o **mesmo** de `public/engine/` que a etapa 5 da aula serve ao
 * aluno, lido de `lib/engine/build.ts` para não haver dois lugares dizendo qual
 * é a build.
 *
 * ## As três armadilhas de rodar essa build no node, todas medidas
 *
 * 1. **O `.js` não roda direto.** O `package.json` é `"type": "module"`, então
 *    `node public/engine/…js` lê a cola do stockfish.js como ESM e estoura em
 *    `ERR_AMBIGUOUS_MODULE_SYNTAX`. A cola é CommonJS. Daí a cópia com extensão
 *    `.cjs` — e o `.wasm` vai junto, com o **mesmo nome base**, porque a cola
 *    deriva o caminho dele de `__filename`. A cópia fica no temp do sistema e
 *    só é refeita quando o tamanho não bate.
 * 2. **Não dá para `printf … | node`.** O `readline` da cola chama
 *    `process.exit()` no `close` do stdin, e o stdin de um pipe fecha na hora —
 *    antes de os 7,3 MB de WebAssembly terminarem de carregar. A saída sai
 *    **vazia, sem erro nenhum**. Por isso aqui é `spawn` com o stdin mantido
 *    aberto até `fechar()`.
 * 3. **Lance ilegal o Stockfish engole em silêncio.** Um SAN impossível em
 *    `position … moves` é descartado sem aviso, e ele responde com convicção
 *    sobre **outra** posição. Por isso quem monta a lista de lances passa pela
 *    `chess.js` antes (`paraUci`, em `lib/repertorio/motor.ts`), e quem manda
 *    uma FEN manda a FEN inteira, sem lances soltos atrás.
 */

/** O caminho do `.cjs` pronto para o `node`, copiando o par se preciso. */
export function prepararMotor(): string {
  // As URLs da build são as **servidas**, e o que as serve é `public/`.
  const servido = (url: string): string => path.join(RAIZ, "public", url.replace(/^\//, ""));
  const origemJs = servido(ENGINE_BUILD.scriptUrl);
  const origemWasm = servido(ENGINE_BUILD.wasmUrl);
  const pasta = path.join(os.tmpdir(), "motor-repertorio");
  mkdirSync(pasta, { recursive: true });

  const base = path.basename(origemJs, ".js");
  const destinoCjs = path.join(pasta, `${base}.cjs`);
  const destinoWasm = path.join(pasta, `${base}.wasm`);

  const precisaCopiar = (destino: string, bytes: number): boolean =>
    !existsSync(destino) || statSync(destino).size !== bytes;

  if (precisaCopiar(destinoCjs, ENGINE_BUILD.scriptBytes)) copyFileSync(origemJs, destinoCjs);
  if (precisaCopiar(destinoWasm, ENGINE_BUILD.wasmBytes)) copyFileSync(origemWasm, destinoWasm);
  return destinoCjs;
}

/** Uma linha `info … multipv N … pv …`. */
const LEITURA = /^info depth (\d+) seldepth \d+ multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/;

export class Motor {
  // stderr é `inherit`, e por isso o terceiro parâmetro é `null` e não `Readable`:
  // erro do motor vai direto para o terminal, sem passar por aqui.
  private readonly processo: ChildProcessByStdio<Writable, Readable, null>;
  private resto = "";
  private ouvintes: Array<(linha: string) => void> = [];

  constructor(caminhoCjs: string) {
    // O stdin fica aberto até `fechar()`: ver a armadilha 2 no cabeçalho.
    this.processo = spawn(process.execPath, [caminhoCjs], { stdio: ["pipe", "pipe", "inherit"] });
    this.processo.stdout.on("data", (pedaco: Buffer) => {
      this.resto += pedaco.toString();
      let corte = this.resto.indexOf("\n");
      while (corte >= 0) {
        const linha = this.resto.slice(0, corte).trimEnd();
        this.resto = this.resto.slice(corte + 1);
        for (const ouvinte of [...this.ouvintes]) ouvinte(linha);
        corte = this.resto.indexOf("\n");
      }
    });
  }

  private manda(comando: string): void {
    this.processo.stdin.write(`${comando}\n`);
  }

  private ate(teste: (linha: string) => boolean): Promise<string> {
    return new Promise((resolver) => {
      const ouvinte = (linha: string): void => {
        if (!teste(linha)) return;
        this.ouvintes = this.ouvintes.filter((o) => o !== ouvinte);
        resolver(linha);
      };
      this.ouvintes.push(ouvinte);
    });
  }

  async abrir(quantas: number): Promise<void> {
    this.manda("uci");
    await this.ate((linha) => linha === "uciok");
    this.manda(`setoption name MultiPV value ${quantas}`);
    this.manda("isready");
    await this.ate((linha) => linha === "readyok");
  }

  /**
   * As melhores variantes de uma posição, em ordem.
   *
   * `posicao` é o argumento do comando UCI: `startpos moves e2e4 …` ou
   * `fen <FEN>`. Guarda-se a **maior profundidade vista** de cada linha, e não a
   * profundidade pedida: numa posição com mate curto o Stockfish responde
   * `bestmove` antes de chegar lá, e exigir a profundidade exata devolveria uma
   * lista vazia justamente nas posições que mais importa recusar.
   */
  async pensar(posicao: string, profundidade: number): Promise<Variante[]> {
    const achadas = new Map<number, { profundidade: number; variante: Variante }>();

    const coletar = (linha: string): void => {
      const casou = LEITURA.exec(linha);
      if (!casou) return;
      const profundidadeDaLinha = Number(casou[1]);
      const multipv = Number(casou[2]);
      const anterior = achadas.get(multipv);
      if (anterior && anterior.profundidade > profundidadeDaLinha) return;
      achadas.set(multipv, {
        profundidade: profundidadeDaLinha,
        variante: {
          centesimos: casou[3] === "mate" ? null : Number(casou[4]),
          pv: casou[5],
        },
      });
    };

    this.ouvintes.push(coletar);
    this.manda("ucinewgame");
    this.manda(`position ${posicao}`);
    this.manda(`go depth ${profundidade}`);
    await this.ate((linha) => linha.startsWith("bestmove"));
    this.ouvintes = this.ouvintes.filter((o) => o !== coletar);

    return [...achadas].sort((a, b) => a[0] - b[0]).map(([, achada]) => achada.variante);
  }

  fechar(): void {
    this.manda("quit");
    this.processo.stdin.end();
  }
}
