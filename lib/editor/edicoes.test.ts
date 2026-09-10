import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  cabeMaisUmPasso,
  comCarimbo,
  comDesenho,
  comFala,
  comFenDoDiagrama,
  comPassoNovo,
  comTecnica,
  passoCru,
} from "./edicoes.ts";
import { serializar } from "./rascunhos.ts";
import {
  MARCA_DE_MOLDE,
  MAX_PASSOS_INTRO,
  MAX_PASSOS_ROTEIRO,
  lessonSchema,
} from "../lesson/schema.ts";
import { derivarTreino } from "../lesson/derivar-treino.ts";

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

/* ------------------------------------------------------------------ *
 * O "+" — acrescentar um diagrama
 * ------------------------------------------------------------------ */

/** O quanto do arquivo, do começo, continua byte a byte igual. */
function iguaisAte(depois: Record<string, unknown>): number {
  const a = AULA.split("\n");
  const b = serializar(depois).split("\n");
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i += 1;
  return i;
}

test("acrescentar um diagrama no meio só acrescenta três linhas", () => {
  const antes = cru();
  const quantos = (antes.stages as { objective: { roteiro: unknown[] } }).objective.roteiro.length;

  const depois = comPassoNovo(antes, "objective", 4);
  const lista = (depois.stages as { objective: { roteiro: Array<Record<string, unknown>> } })
    .objective.roteiro;

  assert.equal(lista.length, quantos + 1);
  assert.deepEqual(lista[4], { fala: MARCA_DE_MOLDE });
  assert.equal(lessonSchema.safeParse(depois).success, true);

  // Três linhas: a abertura da chave, a fala, o fechamento. E nada mais —
  // se um dia isto virar 547, o `git diff` deixou de dizer o que mudou.
  assert.equal(serializar(depois).split("\n").length - AULA.split("\n").length, 3);
});

test("o arquivo diverge no ponto da inserção, e volta a ser o mesmo depois", () => {
  const depois = comPassoNovo(cru(), "objective", 6);
  const a = AULA.split("\n");
  const b = serializar(depois).split("\n");

  // Tudo até o passo novo é byte a byte o arquivo de antes...
  const divergencia = iguaisAte(depois);
  assert.ok(divergencia > 0 && divergencia < a.length, "há um ponto de divergência, e é um só");
  assert.deepEqual(b.slice(0, divergencia), a.slice(0, divergencia));

  // ...e tudo depois das três linhas novas também é, só deslocado. Estas duas
  // asserções juntas são a promessa do editor: o `git diff` mostra UM bloco
  // acrescentado, e não 547 linhas reescritas.
  assert.deepEqual(b.slice(divergencia + 3), a.slice(divergencia));
});

test("acrescentar diagrama no roteiro NÃO muda a etapa 3", () => {
  // É a promessa central do passo sem lance: ele é ignorado pela derivação.
  // Se algum dia deixar de ser, a etapa 3 muda sozinha quando o professor
  // acrescenta um diagrama — e o `--write` reescreveria a aula inteira.
  const original = lessonSchema.parse(cru());
  const comDiagrama = lessonSchema.parse(comPassoNovo(cru(), "objective", 5));
  const posicao = {
    fen: original.stages.guided!.nodes[original.stages.guided!.root].fen,
    expectedResult: "win",
  };
  const a = derivarTreino(original, posicao, () => null);
  const b = derivarTreino(comDiagrama, posicao, () => null);
  assert.deepEqual(b.problemas, []);
  assert.deepEqual(JSON.stringify(b.tree), JSON.stringify(a.tree));
});

test("o passo novo entra na ponta quando o índice está fora da faixa", () => {
  const noComeco = comPassoNovo(cru(), "objective", -3);
  const roteiro = (noComeco.stages as { objective: { roteiro: Array<Record<string, unknown>> } })
    .objective.roteiro;
  assert.deepEqual(roteiro[0], { fala: MARCA_DE_MOLDE });

  const noFim = comPassoNovo(cru(), "objective", 999);
  const outro = (noFim.stages as { objective: { roteiro: Array<Record<string, unknown>> } })
    .objective.roteiro;
  assert.deepEqual(outro[outro.length - 1], { fala: MARCA_DE_MOLDE });
});

test("a apresentação acrescenta em `passos`, e não encosta no roteiro", () => {
  const depois = comPassoNovo(cru(), "intro", 1);
  const passos = (depois.stages as { intro: { passos: Array<Record<string, unknown>> } }).intro
    .passos;
  assert.deepEqual(passos[1], { fala: MARCA_DE_MOLDE });
  assert.equal(lessonSchema.safeParse(depois).success, true);
  assert.deepEqual(passoCru(depois, "objective", 0), passoCru(cru(), "objective", 0));
});

test("o teto do schema é o teto do `+`", () => {
  // A conta é a mesma nos dois lados: `cabeMaisUmPasso` diz não exatamente
  // quando o Zod passaria a recusar. Sem isto o professor pediria um diagrama
  // e receberia a mensagem do Zod no lugar da aula.
  let intro = cru();
  while (cabeMaisUmPasso(intro, "intro")) intro = comPassoNovo(intro, "intro", 0);
  const cheia = (intro.stages as { intro: { passos: unknown[] } }).intro.passos.length;
  assert.equal(cheia, MAX_PASSOS_INTRO);
  assert.equal(lessonSchema.safeParse(intro).success, true);
  assert.equal(lessonSchema.safeParse(comPassoNovo(intro, "intro", 0)).success, false);

  let obj = cru();
  while (cabeMaisUmPasso(obj, "objective")) obj = comPassoNovo(obj, "objective", 0);
  assert.equal(
    (obj.stages as { objective: { roteiro: unknown[] } }).objective.roteiro.length,
    MAX_PASSOS_ROTEIRO,
  );
  assert.equal(lessonSchema.safeParse(comPassoNovo(obj, "objective", 0)).success, false);
});

/* ------------------------------------------------------------------ *
 * A FEN do diagrama da apresentação — a galeria de posições
 * ------------------------------------------------------------------ */

/** Mate de rei e dama, e nada a ver com a posição da N1-KPK. */
const OUTRA_POSICAO = "6k1/6Q1/6K1/8/8/8/8/8 b - - 0 1";

test("dar posição própria a um diagrama da apresentação acrescenta UMA linha", () => {
  const depois = comFenDoDiagrama(cru(), 1, OUTRA_POSICAO);
  const a = AULA.split("\n");
  const b = serializar(depois).split("\n");

  // Uma linha só: a chave `fen`, que não existia neste passo.
  assert.equal(b.length - a.length, 1);
  assert.equal(lessonSchema.safeParse(depois).success, true);

  // E o arquivo diverge num ponto só: tudo antes é byte a byte igual, tudo
  // depois também, deslocado de uma linha. `linhasMudadas` não serve aqui —
  // ele compara por POSIÇÃO, e uma linha inserida desloca as 500 seguintes.
  const divergencia = iguaisAte(depois);
  assert.ok(divergencia > 0 && divergencia < a.length, "há um ponto de divergência, e é um só");
  assert.deepEqual(b.slice(0, divergencia), a.slice(0, divergencia));
  assert.deepEqual(b.slice(divergencia + 1), a.slice(divergencia));
});

test("tirar a posição própria devolve o arquivo ao que era, byte a byte", () => {
  const comFen = comFenDoDiagrama(cru(), 1, OUTRA_POSICAO);
  const semFen = comFenDoDiagrama(comFen, 1, null);
  assert.equal(serializar(semFen), AULA);
});

test("`null` OMITE o campo em vez de deixá-lo vazio", () => {
  const comFen = comFenDoDiagrama(cru(), 1, OUTRA_POSICAO);
  const semFen = comFenDoDiagrama(comFen, 1, null);
  const passo = (semFen.stages as { intro: { passos: Array<Record<string, unknown>> } })
    .intro.passos[1];
  // A diferença que morde: `fen: undefined` sobreviveria a este `in` e morreria
  // no `JSON.stringify`, e `fen: ""` chegaria ao gate como FEN ilegal.
  assert.equal("fen" in passo, false);
});

test("trocar por uma posição igual devolve o MESMO objeto", () => {
  // Sem isto, reabrir a mesma posição marcaria a aula como alterada e mataria
  // o direito de publicar sem que nada tivesse mudado.
  const comFen = comFenDoDiagrama(cru(), 1, OUTRA_POSICAO);
  assert.equal(comFenDoDiagrama(comFen, 1, OUTRA_POSICAO), comFen);
  const semNada = cru();
  assert.equal(comFenDoDiagrama(semNada, 1, null), semNada);
});

test("a galeria inteira: 12 diagramas de posições diferentes é aula válida", () => {
  // A medida do Bloco 2B. Uma apresentação que é galeria — cada clique mostra
  // uma posição nova — passa no schema com o teto novo, e cada diagrama leva a
  // sua própria FEN.
  let g = cru();
  while (cabeMaisUmPasso(g, "intro")) g = comPassoNovo(g, "intro", 0);
  const passos = (g.stages as { intro: { passos: unknown[] } }).intro.passos.length;
  assert.equal(passos, MAX_PASSOS_INTRO);
  // O rei branco anda pela primeira fileira: posições legais e distintas.
  const reiNaFileira = (f: number) =>
    `7k/8/8/8/8/8/8/${f > 0 ? f : ""}K${7 - f > 0 ? 7 - f : ""} w - - 0 1`;
  for (let i = 0; i < passos; i += 1) {
    g = comFenDoDiagrama(g, i, reiNaFileira(i % 8));
    g = comFala(g, "intro", i, `Diagrama ${i + 1} da galeria.`);
  }
  const juizo = lessonSchema.safeParse(g);
  assert.equal(juizo.success, true, JSON.stringify(juizo.error?.issues?.[0]));
});

test("o diagrama fora da faixa não estraga o arquivo", () => {
  const antes = cru();
  assert.equal(serializar(comFenDoDiagrama(antes, 99, OUTRA_POSICAO)), AULA);
  assert.equal(serializar(comFenDoDiagrama(antes, -1, OUTRA_POSICAO)), AULA);
});
