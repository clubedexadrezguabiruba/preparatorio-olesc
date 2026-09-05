/**
 * Perguntar ao motor, para escrever as linhas de "livro + motor".
 *
 * Uso:
 *   node scripts/motor-repertorio.ts "1.e4 c5 2.Bc4 Nc6"   as 5 melhores da posição
 *   node scripts/motor-repertorio.ts "e2e4 c7c5 f1c4"      o mesmo, em UCI
 *   node scripts/motor-repertorio.ts --pontas              avalia a ponta de cada
 *                                                          linha já compilada
 *   ... --profundidade 22 --linhas 3                       padrões: 20 e 5
 *
 * ## Por que este script existe
 *
 * Doze pontos do repertório não têm resposta em fonte nenhuma — a lista da §8
 * do `docs/REPERTORIO.md`. Neles a política é **livro + motor**, e "motor" tem
 * de ser número medido, não opinião de quem escreve: o B3 já teve uma escolha
 * derrubada assim. Na Escocesa `5…c5` estavam escritos `7.Nc3` e `8.Bd2`, e o
 * motor põe `7.e5` 33 centésimos à frente — além de repetir um motivo que a
 * criança acabou de ver duas linhas acima.
 *
 * O motor é o **mesmo** Stockfish 18 de `public/engine/` que a etapa 5 da aula
 * serve ao aluno, lido de `lib/engine/build.ts` para não haver dois lugares
 * dizendo qual é a build. Um segundo motor só para a autoria seria uma segunda
 * opinião sobre a mesma posição, e mais 7 MB para versionar.
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
 *    aberto até o último `bestmove`.
 * 3. **Lance ilegal o Stockfish engole em silêncio.** Um SAN impossível em
 *    `position … moves` é descartado sem aviso, e ele responde com convicção
 *    sobre **outra** posição. Aconteceu na autoria do B4, num `Qf3-c5` que não
 *    é lance de dama. Por isso cada lance passa pela `chess.js` antes de ser
 *    mandado, e um lance ruim estoura aqui, nomeado, com a posição em que
 *    quebrou.
 *
 * ## O sinal do número
 *
 * O UCI devolve a avaliação do ponto de vista de **quem tem a vez**. Aqui ela é
 * normalizada para as **brancas**, que é a convenção de qualquer livro, e
 * impressa em palavras — "pretas +0,67" — porque é o que se lê rápido às onze
 * da noite, e porque foi trocar esse sinal de cabeça que quase pôs uma
 * avaliação invertida no documento.
 */

import { spawn, type ChildProcessByStdio } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Readable, Writable } from "node:stream";
import { Chess } from "chess.js";
import { RAIZ } from "./env-local.ts";
import { ENGINE_BUILD } from "../lib/engine/build.ts";

const argv = process.argv.slice(2);

const numero = (bandeira: string, padrao: number): number => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : padrao;
};

const PROFUNDIDADE = numero("--profundidade", 20);
const QUANTAS = numero("--linhas", 5);
const PONTAS = argv.includes("--pontas");

/* ------------------------------------------------------------------ *
 * A cópia executável — armadilha 1
 * ------------------------------------------------------------------ */

/** O caminho do `.cjs` pronto para o `node`, copiando o par se preciso. */
function prepararMotor(): string {
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

/* ------------------------------------------------------------------ *
 * Os lances — armadilha 3
 * ------------------------------------------------------------------ */

export type Vez = "brancas" | "pretas";

/**
 * De texto para UCI, passando pela `chess.js`.
 *
 * Aceita SAN inglês (`1.e4 c5 2.Bc4`), SAN português (`2.Bc4 Cc6 3.Df3`), UCI
 * (`e2e4 c7c5 f1c4`) e os três misturados, e descarta número de lance, pontos e
 * resultado. Estoura no primeiro lance que a `chess.js` recusar — que é
 * exatamente o contrário do que o Stockfish faz.
 *
 * **O português é tentado só depois de o inglês falhar**, e há um caso em que os
 * dois valem: `R`. Em inglês é torre, em português é rei. Ganha o inglês, que é
 * a língua da `chess.js` e do resto do projeto. Não é armadilha silenciosa: a
 * saída imprime sempre o SAN **canônico** do que foi entendido, então um `Rg1`
 * lido como torre aparece na tela como torre.
 */
/** Só as letras que mudam. Bispo é `B` nas duas línguas. */
const PECAS_EM_PORTUGUES: Record<string, string> = { C: "N", D: "Q", T: "R" };

/** `Cf3` vira `Nf3`. `null` quando não há o que traduzir. */
function emIngles(token: string): string | null {
  const traduzida = PECAS_EM_PORTUGUES[token[0]];
  return traduzida === undefined ? null : traduzida + token.slice(1);
}

export function paraUci(texto: string): { uci: string[]; sans: string[]; vez: Vez } {
  const jogo = new Chess();
  const uci: string[] = [];
  const sans: string[] = [];

  for (const bruto of texto.split(/\s+/).filter(Boolean)) {
    const token = bruto.replace(/^\d+\.+/, "");
    if (token === "" || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;

    const comoUci = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/.exec(token);
    type Pedido = Parameters<Chess["move"]>[0];
    const tentar = (lance: Pedido): ReturnType<Chess["move"]> | null => {
      try {
        return jogo.move(lance);
      } catch {
        return null;
      }
    };

    const feito = comoUci
      ? tentar({ from: comoUci[1], to: comoUci[2], promotion: comoUci[3] || undefined })
      : (tentar(token) ?? tentar(emIngles(token) ?? token));

    if (!feito) {
      throw new Error(
        `"${token}" não é lance legal depois de ${sans.join(" ") || "nada"}.\n` +
          "Tentei em inglês e em português. O Stockfish descartaria este lance em " +
          "silêncio e responderia com convicção sobre outra posição.",
      );
    }
    uci.push(`${feito.from}${feito.to}${feito.promotion ?? ""}`);
    sans.push(feito.san);
  }

  return { uci, sans, vez: jogo.turn() === "w" ? "brancas" : "pretas" };
}

/* ------------------------------------------------------------------ *
 * A conversa UCI — armadilha 2
 * ------------------------------------------------------------------ */

export type Variante = { centesimos: number | null; pv: string };

/** Uma linha `info … multipv N … pv …`. */
const LEITURA = /^info depth (\d+) seldepth \d+ multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/;

class Motor {
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

  /** As melhores variantes da posição, em ordem, na profundidade pedida. */
  async pensar(uci: readonly string[], profundidade: number): Promise<Variante[]> {
    const achadas = new Map<number, Variante>();

    const coletar = (linha: string): void => {
      const casou = LEITURA.exec(linha);
      if (!casou || Number(casou[1]) !== profundidade) return;
      achadas.set(Number(casou[2]), {
        centesimos: casou[3] === "mate" ? null : Number(casou[4]),
        pv: casou[5],
      });
    };

    this.ouvintes.push(coletar);
    this.manda("ucinewgame");
    this.manda(`position startpos${uci.length > 0 ? ` moves ${uci.join(" ")}` : ""}`);
    this.manda(`go depth ${profundidade}`);
    await this.ate((linha) => linha.startsWith("bestmove"));
    this.ouvintes = this.ouvintes.filter((o) => o !== coletar);

    return [...achadas].sort((a, b) => a[0] - b[0]).map(([, variante]) => variante);
  }

  fechar(): void {
    this.manda("quit");
    this.processo.stdin.end();
  }
}

/* ------------------------------------------------------------------ *
 * Apresentação
 * ------------------------------------------------------------------ */

/** Do ponto de vista de quem tem a vez para o das brancas — ver o cabeçalho. */
export function paraBrancas(centesimos: number | null, vez: Vez): number | null {
  if (centesimos === null) return null;
  return vez === "brancas" ? centesimos : -centesimos;
}

/** "pretas +0,67", "igual", "mate à vista". */
export function quemEstaMelhor(brancas: number | null): string {
  if (brancas === null) return "mate à vista";
  if (Math.abs(brancas) < 25) return "igual";
  const lado = brancas > 0 ? "brancas" : "pretas";
  return `${lado} +${(Math.abs(brancas) / 100).toFixed(2).replace(".", ",")}`;
}

/** `e2e4 e7e5` → `1.e4 e5`, para a saída ser legível por quem joga xadrez. */
export function pvEmSan(caminho: readonly string[], pv: string, quantos: number): string {
  const jogo = new Chess();
  const jogar = (lance: string): ReturnType<Chess["move"]> =>
    jogo.move({ from: lance.slice(0, 2), to: lance.slice(2, 4), promotion: lance[4] || undefined });

  for (const lance of caminho) jogar(lance);

  const partes: string[] = [];
  let numeroDoLance = Math.floor(caminho.length / 2) + 1;
  let brancasJogam = caminho.length % 2 === 0;

  for (const lance of pv.split(" ").slice(0, quantos)) {
    let feito;
    try {
      feito = jogar(lance);
    } catch {
      break; // PV truncada pelo motor: mostramos o que deu para ler.
    }
    if (brancasJogam) {
      partes.push(`${numeroDoLance}.${feito.san}`);
    } else {
      partes.push(partes.length === 0 ? `${numeroDoLance}...${feito.san}` : feito.san);
      numeroDoLance += 1;
    }
    brancasJogam = !brancasJogam;
  }

  return partes.join(" ");
}

/* ------------------------------------------------------------------ *
 * As duas perguntas que este script responde
 * ------------------------------------------------------------------ */

type Alvo = { rotulo: string; uci: string[]; vez: Vez };

/** Cada linha já compilada, para ver se alguma ponta ficou ruim para o aluno. */
function pontasCompiladas(): Alvo[] {
  const indice = path.join(RAIZ, "public", "repertorio", "index.json");
  if (!existsSync(indice)) {
    throw new Error(
      "public/repertorio/index.json não existe. Rode `npm run repertorio:compilar` antes.",
    );
  }

  const entradas = JSON.parse(readFileSync(indice, "utf8")) as Array<{ arquivo: string }>;
  const alvos: Alvo[] = [];

  for (const entrada of entradas) {
    const caminho = path.join(RAIZ, "public", entrada.arquivo.replace(/^\//, ""));
    const linhas = JSON.parse(readFileSync(caminho, "utf8")) as Array<{
      abertura: string;
      cor: Vez;
      lances: string[];
      sans: string[];
    }>;
    for (const linha of linhas) {
      alvos.push({
        rotulo: `${linha.abertura} — ${linha.sans.join(" ")}`,
        uci: linha.lances,
        // A ponta é sempre lance nosso, então quem tem a vez é o adversário.
        vez: linha.cor === "brancas" ? "pretas" : "brancas",
      });
    }
  }

  return alvos;
}

function alvosPedidos(): Alvo[] {
  if (PONTAS) return pontasCompiladas();
  const texto = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a)).join(" ");
  const { uci, sans, vez } = paraUci(texto);
  return [{ rotulo: sans.length > 0 ? sans.join(" ") : "posição inicial", uci, vez }];
}

const alvos = alvosPedidos();

if (alvos.length === 0) {
  console.log('Nada a fazer. Exemplo: node scripts/motor-repertorio.ts "1.e4 c5 2.Bc4 Nc6"');
  process.exit(0);
}

const motor = new Motor(prepararMotor());
await motor.abrir(PONTAS ? 1 : QUANTAS);

console.log(`${ENGINE_BUILD.id} — profundidade ${PROFUNDIDADE}\n`);

/** Na varredura: a ponta em que o lado do aluno está pior. */
let pior = { rotulo: "", centesimos: Number.POSITIVE_INFINITY };

for (const alvo of alvos) {
  const variantes = await motor.pensar(alvo.uci, PROFUNDIDADE);

  if (PONTAS) {
    const brancas = paraBrancas(variantes[0]?.centesimos ?? null, alvo.vez);
    // Quem acabou de jogar é o aluno, e é o contrário de quem tem a vez.
    const doAluno = brancas === null ? 0 : alvo.vez === "pretas" ? brancas : -brancas;
    if (doAluno < pior.centesimos) pior = { rotulo: alvo.rotulo, centesimos: doAluno };
    console.log(`  ${quemEstaMelhor(brancas).padEnd(16)} ${alvo.rotulo}`);
    continue;
  }

  console.log(`## ${alvo.rotulo}   — jogam as ${alvo.vez}\n`);
  for (const [i, variante] of variantes.entries()) {
    const brancas = paraBrancas(variante.centesimos, alvo.vez);
    const posicao = String(i + 1).padStart(2);
    console.log(`  ${posicao}. ${quemEstaMelhor(brancas).padEnd(16)} ${pvEmSan(alvo.uci, variante.pv, 12)}`);
  }
  console.log("");
}

if (PONTAS) {
  console.log(
    `\n${alvos.length} pontas. A pior para quem treina está ${pior.centesimos < 0 ? `${(Math.abs(pior.centesimos) / 100).toFixed(2).replace(".", ",")} atrás` : `${(pior.centesimos / 100).toFixed(2).replace(".", ",")} à frente`}:\n  ${pior.rotulo}`,
  );
}

motor.fechar();
