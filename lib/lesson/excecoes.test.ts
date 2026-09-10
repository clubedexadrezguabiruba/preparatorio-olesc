import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  aceitaExcecao,
  alvoDoOnde,
  hashDoAlvo,
  julgarComExcecoes,
  type Excecao,
} from "./excecoes.ts";
import { lessonSchema, type Lesson } from "./schema.ts";

/**
 * A exceção do professor, e a caducidade dela.
 *
 * O que estes testes protegem é uma frase do plano: **o Doug decidiu sobre o
 * que viu.** Uma exceção que continuasse valendo depois de alguém mudar a
 * posição ou o lance seria um erro perdoado para sempre, e ninguém saberia — o
 * gate ficaria em silêncio sobre exatamente a coisa que ele existe para pegar.
 */

const AULA: Lesson = lessonSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "content/lessons/N1-KPK.json"), "utf8")),
);

const FEN = "8/4k3/2K5/1P6/8/8/8/8 w - - 0 1";
const fens = (id: string) => (id === AULA.stages.objective!.positionId ? FEN : null);

function excecao(sobre: Partial<Excecao> = {}): Excecao {
  return {
    codigo: "RESULTADO_ERRADO",
    alvo: "roteiro[0]",
    hash: hashDoAlvo(AULA, fens, "roteiro[0]")!,
    motivo: "A tablebase mede o final teórico; a aula ensina o método, e aqui eles divergem.",
    em: "2026-09-10",
    ...sobre,
  };
}

test("a exceção que casa rebaixa o erro a aviso, com o motivo escrito", () => {
  const v = julgarComExcecoes(
    [excecao()],
    "RESULTADO_ERRADO",
    "aula N1-KPK / treino / roteiro[0]",
    hashDoAlvo(AULA, fens, "roteiro[0]"),
  );
  assert.equal(v.tipo, "aviso");
  if (v.tipo !== "aviso") return;
  assert.match(v.motivo, /divergem/);
});

test("mudar o lance do passo caduca a exceção — e o erro volta a bloquear", () => {
  const antiga = excecao();

  // O professor muda o lance daquele passo depois de ter decidido.
  const mexida = structuredClone(AULA);
  mexida.stages.objective!.roteiro[0] = {
    ...mexida.stages.objective!.roteiro[0],
    lance: "b5b6",
  };

  const v = julgarComExcecoes(
    [antiga],
    "RESULTADO_ERRADO",
    "aula N1-KPK / treino / roteiro[0]",
    hashDoAlvo(mexida, fens, "roteiro[0]"),
  );
  assert.equal(v.tipo, "caduca");
});

test("mudar a FEN da posição também caduca", () => {
  const outraFen = () => "8/5k2/2K5/1P6/8/8/8/8 w - - 0 1";
  const v = julgarComExcecoes(
    [excecao()],
    "RESULTADO_ERRADO",
    "aula N1-KPK / treino / roteiro[0]",
    hashDoAlvo(AULA, outraFen, "roteiro[0]"),
  );
  assert.equal(v.tipo, "caduca");
});

test("mudar só a fala do passo também caduca — de propósito", () => {
  // Poderia parecer excesso: a fala não muda o xadrez. Mas a decisão do
  // professor foi sobre aquele passo inteiro, e um passo cuja explicação mudou
  // merece um olhar novo. Errar para o lado de perguntar de novo é barato;
  // errar para o lado de perdoar em silêncio é o defeito que isto evita.
  const mexida = structuredClone(AULA);
  mexida.stages.objective!.roteiro[0] = {
    ...mexida.stages.objective!.roteiro[0],
    fala: "Outra explicação.",
  };
  const v = julgarComExcecoes(
    [excecao()],
    "RESULTADO_ERRADO",
    "aula N1-KPK / treino / roteiro[0]",
    hashDoAlvo(mexida, fens, "roteiro[0]"),
  );
  assert.equal(v.tipo, "caduca");
});

test("a exceção vale para o alvo dela, e não para o passo vizinho", () => {
  const v = julgarComExcecoes(
    [excecao({ alvo: "roteiro[0]" })],
    "RESULTADO_ERRADO",
    "aula N1-KPK / treino / roteiro[1]",
    hashDoAlvo(AULA, fens, "roteiro[1]"),
  );
  assert.equal(v.tipo, "erro", "perdoar o vizinho seria um cheque em branco");
});

test("a exceção vale para o código dela, e não para outro erro no mesmo ponto", () => {
  const v = julgarComExcecoes(
    [excecao({ codigo: "RESULTADO_ERRADO" })],
    "LANCE_ILEGAL",
    "aula N1-KPK / treino / roteiro[0]",
    hashDoAlvo(AULA, fens, "roteiro[0]"),
  );
  assert.equal(v.tipo, "erro");
});

test("aula sem exceção nenhuma não muda de comportamento", () => {
  assert.equal(julgarComExcecoes(undefined, "RESULTADO_ERRADO", "roteiro[0]", "x").tipo, "erro");
  assert.equal(julgarComExcecoes([], "RESULTADO_ERRADO", "roteiro[0]", "x").tipo, "erro");
});

test("alvo que sumiu não é perdão — é caducidade", () => {
  // O passo foi apagado: `hashDoAlvo` devolve null.
  assert.equal(hashDoAlvo(AULA, fens, "roteiro[999]"), null);
  const v = julgarComExcecoes([excecao({ alvo: "roteiro[999]" })], "RESULTADO_ERRADO", "roteiro[999]", null);
  assert.equal(v.tipo, "caduca");
});

test("o alvo é extraído do `onde` que o gate escreve", () => {
  assert.equal(alvoDoOnde("aula N1-KPK / treino / roteiro[3]"), "roteiro[3]");
  assert.equal(alvoDoOnde("posição pos-n1-kpk-dlv-1-3"), "pos-n1-kpk-dlv-1-3");
  assert.equal(alvoDoOnde("aula N1-KPK / guided / n3"), null);
});

test("o hash da posição muda com a FEN, e só com ela", () => {
  const a = hashDoAlvo(AULA, () => FEN, "pos-n1-kpk-dlv-1-3");
  const b = hashDoAlvo(AULA, () => FEN, "pos-n1-kpk-dlv-1-3");
  const c = hashDoAlvo(AULA, () => "8/5k2/2K5/1P6/8/8/8/8 w - - 0 1", "pos-n1-kpk-dlv-1-3");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a && a.length >= 8);
});

test("só o juiz externo aceita exceção — erro de digitação, nunca", () => {
  assert.equal(aceitaExcecao("TABLEBASE_FORA_DE_ALCANCE"), true);
  assert.equal(aceitaExcecao("RESULTADO_ERRADO"), true);
  assert.equal(aceitaExcecao("METODO_NAO_GANHA"), true);
  for (const codigo of ["LANCE_ILEGAL", "FEN_ILEGAL", "ROTEIRO_NAO_FECHA", "SCHEMA_AULA"]) {
    assert.equal(aceitaExcecao(codigo), false, `${codigo} não é opinião`);
  }
});

test("o schema recusa motivo curto demais", () => {
  const comExcecao = (motivo: string) => {
    const cru = JSON.parse(
      readFileSync(path.join(process.cwd(), "content/lessons/N1-KPK.json"), "utf8"),
    ) as Record<string, unknown>;
    cru.excecoes = [
      { codigo: "RESULTADO_ERRADO", alvo: "roteiro[0]", hash: "abcdef0123", motivo, em: "2026-09-10" },
    ];
    return lessonSchema.safeParse(cru).success;
  };
  assert.equal(comExcecao("ok"), false);
  assert.equal(comExcecao("eu sei o que estou fazendo"), true);
});
