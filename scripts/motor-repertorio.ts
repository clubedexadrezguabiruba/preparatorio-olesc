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
 * ## O que **não** está aqui
 *
 * A conversa UCI, a cópia executável e as três armadilhas de rodar essa build
 * no node moram em `scripts/motor.ts` — foram para lá quando a porta 2 do funil
 * do meio-jogo (`scripts/escolher-exercicios.ts`) passou a precisar do mesmo
 * motor. Dois drivers seriam duas opiniões sobre a mesma posição.
 *
 * A leitura dos lances (`paraUci`, o portão da armadilha do lance ilegal) e a
 * apresentação (`paraBrancas`, `quemEstaMelhor`, `pvEmSan`) moram em
 * `lib/repertorio/motor.ts`, com teste. Aqui ficou só a linha de comando.
 *
 * Este arquivo tem efeitos no topo — lê `process.argv` e termina num `await`
 * solto. **Nunca o importe**: importá-lo é rodar o Stockfish. Quem quiser as
 * funções puras importa do `lib/`.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./env-local.ts";
import { ENGINE_BUILD } from "../lib/engine/build.ts";
import { Motor, prepararMotor } from "./motor.ts";
import {
  paraBrancas,
  paraUci,
  pvEmSan,
  quemEstaMelhor,
  type Vez,
} from "../lib/repertorio/motor.ts";

const argv = process.argv.slice(2);

const numero = (bandeira: string, padrao: number): number => {
  const onde = argv.indexOf(bandeira);
  return onde >= 0 && argv[onde + 1] ? Number(argv[onde + 1]) : padrao;
};

const PROFUNDIDADE = numero("--profundidade", 20);
const QUANTAS = numero("--linhas", 5);
const PONTAS = argv.includes("--pontas");

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
  const posicao = `startpos${alvo.uci.length > 0 ? ` moves ${alvo.uci.join(" ")}` : ""}`;
  const variantes = await motor.pensar(posicao, PROFUNDIDADE);

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
