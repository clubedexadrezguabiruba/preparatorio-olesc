import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { comCarimbo, comDesenho, comFala, comTecnica, passoCru } from "./edicoes.ts";
import { serializar } from "./rascunhos.ts";
import { lessonSchema } from "../lesson/schema.ts";

/**
 * A cirurgia no JSON, cobrada contra o arquivo de verdade.
 *
 * A pergunta que estes testes fazem é sempre a mesma: **quantas linhas
 * mudaram?** Uma edição que reescreve o arquivo inteiro passa em qualquer teste
 * de conteúdo e destrói a única maneira de revisar o trabalho do professor
 * depois — o `git diff`. É um defeito que não aparece na tela.
 */

const AULA = readFileSync(
  path.join(process.cwd(), "content/lessons/N1-KPK.json"),
  "utf8",
);

function cru(): Record<string, unknown> {
  return JSON.parse(AULA) as Record<string, unknown>;
}

/** Quantas linhas do arquivo mudaram, contra o original. */
function linhasMudadas(depois: Record<string, unknown>): number {
  const a = AULA.split("\n");
  const b = serializar(depois).split("\n");
  let mudadas = Math.abs(a.length - b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) mudadas += 1;
  }
  return mudadas;
}

test("trocar uma fala muda uma linha do arquivo", () => {
  const depois = comFala(cru(), "objective", 0, "Uma fala nova, curta.");
  assert.equal(linhasMudadas(depois), 1);
  assert.equal(lessonSchema.safeParse(depois).success, true);
});

test("trocar o nome da técnica muda uma linha", () => {
  const depois = comTecnica(cru(), "name", "O rei na frente do peão");
  assert.equal(linhasMudadas(depois), 1);
});

test("o carimbo entra uma vez e não volta a mudar no mesmo dia", () => {
  const primeiro = comCarimbo(cru());
  assert.equal(lessonSchema.safeParse(primeiro).success, true);

  // O carimbo é uma chave nova, então ela entra no fim do arquivo — e a
  // asserção honesta é essa: **tudo até o fim continua byte a byte igual**.
  // (Contar "linhas mudadas" aqui contaria também o desalinhamento que três
  // linhas novas causam nas últimas, que não é mudança de conteúdo nenhuma.)
  const original = AULA.split("\n");
  const carimbado = serializar(primeiro).split("\n");
  // -3 porque a penúltima chave do arquivo ganha uma vírgula para o bloco
  // novo entrar depois dela. Tudo acima disso é byte a byte igual.
  const ateOFim = original.length - 3;
  assert.deepEqual(carimbado.slice(0, ateOFim), original.slice(0, ateOFim));
  assert.equal(carimbado.length - original.length, 3, "três linhas novas, e só");
  // Carimbar de novo no mesmo dia devolve o MESMO objeto: sem isso, cada
  // salvamento mudaria os bytes e o diff ganharia uma linha de ruído.
  assert.equal(comCarimbo(primeiro), primeiro);
});

test("o desenho novo substitui no lugar da chave, sem empurrar o resto", () => {
  // O passo 0 do roteiro da N1-KPK já tem `arrows`.
  const antes = passoCru(cru(), "objective", 0);
  assert.ok(antes?.arrows, "o teste supõe que este passo já desenha");

  const depois = comDesenho(cru(), "objective", 0, {
    arrows: [["b2", "b5"]],
  });
  const passo = passoCru(depois, "objective", 0);
  assert.deepEqual(passo?.arrows, [["b2", "b5"]]);
  assert.equal(lessonSchema.safeParse(depois).success, true);

  // A ordem das chaves do passo é a de antes: `fala` continua vindo primeiro.
  const chavesAntes = Object.keys(
    (JSON.parse(AULA) as never as { stages: { objective: { roteiro: object[] } } }).stages.objective
      .roteiro[0],
  );
  const chavesDepois = Object.keys(
    (depois as never as { stages: { objective: { roteiro: object[] } } }).stages.objective
      .roteiro[0],
  );
  assert.deepEqual(chavesDepois, chavesAntes.filter((c) => c !== "highlights"));
});

test("apagar todo o desenho tira as chaves — não deixa lista vazia", () => {
  const depois = comDesenho(cru(), "objective", 0, {});
  const passo = passoCru(depois, "objective", 0) as Record<string, unknown>;
  assert.equal("arrows" in passo, false, "`arrows: []` faria o gate recusar");
  assert.equal("highlights" in passo, false);
  assert.equal(lessonSchema.safeParse(depois).success, true);
});

test("desenhar num passo que não desenhava acrescenta as chaves, e só elas", () => {
  // O passo 1 do roteiro é um passo do defensor, sem `arrows`.
  const antes = cru();
  const stages = antes.stages as { objective: { roteiro: Array<Record<string, unknown>> } };
  const semSeta = stages.objective.roteiro.findIndex((p) => !("arrows" in p));
  assert.ok(semSeta >= 0, "o teste supõe que há passo sem seta");

  const depois = comDesenho(antes, "objective", semSeta, { arrows: [["e7", "d6"]] });
  const passo = passoCru(depois, "objective", semSeta);
  assert.deepEqual(passo?.arrows, [["e7", "d6"]]);
  assert.equal(lessonSchema.safeParse(depois).success, true);
});

test("a apresentação usa `passos`, e não `roteiro`", () => {
  const depois = comDesenho(cru(), "intro", 0, { highlights: ["b8"] });
  assert.deepEqual(passoCru(depois, "intro", 0)?.highlights, ["b8"]);
  assert.equal(lessonSchema.safeParse(depois).success, true);
  // E não encostou no roteiro da outra etapa.
  assert.deepEqual(passoCru(depois, "objective", 0), passoCru(cru(), "objective", 0));
});

test("passoCru devolve null no índice que ainda não existe", () => {
  assert.equal(passoCru(cru(), "objective", 999), null);
  assert.equal(passoCru({}, "objective", 0), null);
});
