import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { aulaDoAlunoV2 } from "./fluxo-do-aluno.ts";
import type { PacoteV2 } from "./pacote.ts";

/**
 * A contraprova de `naLinguaDoAluno`: a regra do Doug de 17/9/2026 vista **na
 * saída**, e não na lista de campos que a produz.
 *
 * `CAMPOS_QUE_O_ALUNO_LE` é lista de permissão, e lista de permissão erra para o
 * lado silencioso: um campo de prosa esquecido não quebra nada — só chega em
 * inglês na tela do aluno, e ninguém vê. Então aqui a conferência é ao
 * contrário. Varremos a aula publicada inteira e cobramos que **todo** texto
 * esteja em português, menos o que for reconhecidamente dado.
 *
 * Um campo de prosa novo, que o `fluxo-do-aluno` ainda não conheça, reprova
 * aqui — que é o único jeito de esse esquecimento fazer barulho.
 */

/**
 * Os campos que guardam dado, e que por isso continuam em inglês.
 *
 * `lance` e `moves` são UCI e vão ao tabuleiro; `fen` é posição; `positionId`,
 * `entidadeId`, `analiseId`, `nodeId`, `root`, `next` e `id` são chave. Nenhum
 * deles é lido por ninguém.
 */
const DADO = new Set([
  "fen", "fenInicial", "fenAntes", "lance", "moves", "winningMoves", "uci", "san",
  "id", "positionId", "entidadeId", "analiseId", "nodeId", "root", "next", "reply",
  "publicationId", "revisao", "linhaIds", "erroId", "casa", "de", "para", "highlights", "arrows",
]);

/** A mesma forma de lance de `textoEmPortugues`, com as iniciais inglesas que não podem sobrar. */
const INGLES = /(?<![A-Za-z0-9])(?:[NQK][a-h1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8]=[NQ])[+#]?(?![A-Za-z0-9])/;

type Sobra = { aula: string; caminho: string; texto: string };

function pacotesPublicados(): Array<{ id: string; pacote: PacoteV2 }> {
  const raiz = new URL("../../content/aulas-v2/", import.meta.url);
  const saida: Array<{ id: string; pacote: PacoteV2 }> = [];
  for (const id of readdirSync(raiz)) {
    const ativa = new URL(`${id}/ativa.json`, raiz);
    const pasta = new URL(`${id}/publicacoes/`, raiz);
    if (!existsSync(ativa) || !existsSync(pasta)) continue;
    const { publicationId } = JSON.parse(readFileSync(ativa, "utf8")) as { publicationId: string };
    const nome = `pub-${publicationId.replace(/^pub-/, "")}.json`;
    if (!existsSync(new URL(nome, pasta))) continue;
    saida.push({ id, pacote: JSON.parse(readFileSync(new URL(nome, pasta), "utf8")) as PacoteV2 });
  }
  return saida;
}

function ingesNaAula(id: string, aula: unknown): Sobra[] {
  const sobras: Sobra[] = [];
  const andar = (valor: unknown, campo: string, caminho: string): void => {
    if (typeof valor === "string") {
      if (DADO.has(campo)) return;
      if (INGLES.test(valor)) sobras.push({ aula: id, caminho, texto: valor.slice(0, 100) });
      return;
    }
    if (Array.isArray(valor)) return valor.forEach((item, i) => andar(item, campo, `${caminho}[${i}]`));
    if (valor && typeof valor === "object") for (const [k, v] of Object.entries(valor)) andar(v, k, `${caminho}.${k}`);
  };
  andar(aula, "raiz", "aula");
  return sobras;
}

test("as dezesseis aulas publicadas chegam ao aluno sem um lance em inglês", () => {
  const pacotes = pacotesPublicados();
  assert.ok(pacotes.length >= 16, `esperava as aulas publicadas; achei ${pacotes.length}`);

  const sobras = pacotes.flatMap(({ id, pacote }) => ingesNaAula(id, aulaDoAlunoV2(pacote)));
  assert.deepEqual(
    sobras.map((s) => `${s.aula} · ${s.caminho}: «${s.texto}»`),
    [],
    "campo de prosa que `CAMPOS_QUE_O_ALUNO_LE` não conhece — some com ele lá, ou diga aqui que é dado",
  );
});

test("o dado continua em inglês: o que vai ao tabuleiro não foi traduzido", () => {
  const { pacote } = pacotesPublicados().find(({ id }) => id === "AB-BRANCAS-FRANCESA-B") ?? {};
  assert.ok(pacote, "a aula B da Francesa é a que tem cavalo, dama e torre na mesma linha");
  const aula = aulaDoAlunoV2(pacote);

  const lances: string[] = [];
  const fens: string[] = [];
  const andar = (valor: unknown, campo: string): void => {
    if (typeof valor === "string") {
      if (campo === "lance" || campo === "moves" || campo === "winningMoves") lances.push(valor);
      if (campo === "fen" || campo === "fenInicial") fens.push(valor);
      return;
    }
    if (Array.isArray(valor)) return valor.forEach((x) => andar(x, campo));
    if (valor && typeof valor === "object") for (const [k, v] of Object.entries(valor)) andar(v, k);
  };
  andar(aula, "raiz");

  assert.ok(lances.length > 100, `esperava os lances da aula; achei ${lances.length}`);
  const tortos = lances.filter((l) => !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(l));
  assert.deepEqual(tortos, [], "UCI é de a1 a h8 e não passa por tradução nenhuma");

  assert.ok(fens.length > 10, `esperava as posições da aula; achei ${fens.length}`);
  const fenTorto = fens.filter((f) => !/^[1-8pnbrqkPNBRQK/]+ [wb] /.test(f));
  assert.deepEqual(fenTorto, [], "a FEN guarda as iniciais inglesas das peças, e tem de continuar guardando");
});

test("na aula B, o «Isso» do treino sai com cavalo, e não com knight", () => {
  const { pacote } = pacotesPublicados().find(({ id }) => id === "AB-BRANCAS-FRANCESA-B") ?? {};
  assert.ok(pacote);
  const texto = JSON.stringify(aulaDoAlunoV2(pacote));

  assert.ok(texto.includes("Isso: 5.Cc3."), "o feedback gerado pelo `lanceEscrito` chega traduzido");
  assert.ok(!texto.includes("Isso: 5.Nc3."), "e o inglês não sobra");
  assert.ok(texto.includes("...Cf6"), "a prosa do professor também");
  assert.ok(texto.includes("Dxe6+"), "inclusive a dama");
});
