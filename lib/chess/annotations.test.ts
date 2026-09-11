import assert from "node:assert/strict";
import test from "node:test";
import { autoriaDoDesenho, desenhoDaAutoria, desenhoDaAutoriaV2, PINCEL_POR_COR, teachingShapes } from "./annotations.ts";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { desenhoSchema } from "../lesson/schema.ts";

/**
 * Os destaques automáticos, medidos nas posições da aula N0-R-MATE.
 */

const CUT = "paleRed";

function squaresOf(shapes: ReturnType<typeof teachingShapes>, brush: string): string[] {
  return shapes
    .filter((shape) => shape.brush === brush)
    .map((shape) => shape.orig as string)
    .sort();
}

test("depois de h1h4 a 4ª fileira inteira aparece como parede", () => {
  // n1 + h1h4: torre em h4, rei preto em e5, rei branco em e2.
  const shapes = teachingShapes("8/8/8/4k3/7R/8/4K3/8 b - - 1 1", ["h1", "h4"]);
  assert.deepEqual(squaresOf(shapes, CUT), ["a4", "b4", "c4", "d4", "e4", "f4", "g4"]);
});

test("torre em h1 com o rei branco em e2: nenhuma parede desenhada", () => {
  // A 1ª fileira não corta — o rei branco está do mesmo lado que o preto.
  const shapes = teachingShapes("8/8/8/4k3/8/8/4K3/7R w - - 0 1", null);
  assert.deepEqual(squaresOf(shapes, CUT), []);
});

test("h4c4 põe a torre ao alcance do rei preto: círculo vermelho", () => {
  // n2 + h4c4: a torre chega em c4, o rei preto em d5 a come, e o rei branco
  // em e2 está longe demais para defender.
  const shapes = teachingShapes("8/8/8/3k4/2R5/8/4K3/8 b - - 1 2", ["h4", "c4"]);
  assert.deepEqual(squaresOf(shapes, "red"), ["c4"]);
  assert.deepEqual(squaresOf(shapes, "green"), []);
});

test("a mesma torre atacada, mas defendida pelo rei: círculo verde", () => {
  // Rei branco em c3 segurando a torre em c4 — isto é a técnica, não um erro.
  const shapes = teachingShapes("8/8/8/2k5/2R5/2K5/8/8 b - - 1 1", ["c1", "c4"]);
  assert.deepEqual(squaresOf(shapes, "green"), ["c4"]);
  assert.deepEqual(squaresOf(shapes, "red"), []);
});

test("peça que ninguém ataca não ganha círculo nenhum", () => {
  const shapes = teachingShapes("8/8/8/4k3/7R/8/4K3/8 b - - 1 1", ["h1", "h4"]);
  assert.deepEqual(squaresOf(shapes, "red"), []);
  assert.deepEqual(squaresOf(shapes, "green"), []);
});

/**
 * A ida e a volta do desenho do professor.
 *
 * O modo editor recebe do chessground a lista inteira de formas depois de cada
 * traço e precisa gravá-la como `arrows`/`highlights`. O que estes testes
 * protegem é a regra que o gate cobra e que ninguém vê ao desenhar: **lista
 * vazia é inválida no schema** — apagar o último traço tem de sumir com o
 * campo, não deixá-lo como `[]`.
 */

test("ida e volta: o arquivo sobrevive a virar tabuleiro e voltar", () => {
  for (const original of [
    { arrows: [["e7", "c8"]] as [string, string][] },
    { highlights: ["c8", "b8"] },
    { arrows: [["b2", "b4"]] as [string, string][], highlights: ["b8"] },
    { arrows: [["a1", "a8"], ["h1", "h8"]] as [string, string][], highlights: ["d4", "e5", "f6"] },
  ]) {
    const volta = autoriaDoDesenho(desenhoDaAutoria(original));
    assert.deepEqual(volta, original);
    // E o que volta continua sendo aceito pelo schema, que é quem decide.
    assert.equal(desenhoSchema.safeParse(volta).success, true);
  }
});

test("apagar o último traço some com o campo — nunca deixa lista vazia", () => {
  const vazio = autoriaDoDesenho([]);
  assert.deepEqual(vazio, {});
  assert.equal("arrows" in vazio, false, "`arrows: []` faria o gate recusar a aula limpa");
  assert.equal("highlights" in vazio, false);
  assert.equal(desenhoSchema.safeParse(vazio).success, true);

  // Sobrando só a seta, o campo das casas some, e vice-versa.
  assert.deepEqual(autoriaDoDesenho([{ orig: "e2", dest: "e4", brush: "green" }]), {
    arrows: [["e2", "e4"]],
  });
  assert.deepEqual(autoriaDoDesenho([{ orig: "e4", brush: "red" }]), { highlights: ["e4"] });
});

test("a cor com que se desenhou não vai para o arquivo", () => {
  // O Lichess troca o pincel com Shift/Alt, e o schema não tem onde guardar
  // isso. Quem decide como o desenho aparece é `desenhoDaAutoria`.
  const emVermelho = autoriaDoDesenho([{ orig: "a1", dest: "a8", brush: "red" }]);
  const emAmarelo = autoriaDoDesenho([{ orig: "a1", dest: "a8", brush: "yellow" }]);
  assert.deepEqual(emVermelho, emAmarelo);
});

test("forma que não é seta nem casa é descartada, e não quebra o arquivo", () => {
  const shapes: DrawShape[] = [
    { orig: "e2", dest: "e4", brush: "blue" },
    // O que o chessground cria durante a interação e não é desenho de autoria.
    { orig: undefined as unknown as Key, brush: "green" },
    { orig: "d4", brush: "green" },
  ];
  assert.deepEqual(autoriaDoDesenho(shapes), {
    arrows: [["e2", "e4"]],
    highlights: ["d4"],
  });
});

/* ------------------------------------------------------------------ *
 * As cores do desenho do Editor v2
 * ------------------------------------------------------------------ */

test("cada cor cai no seu pincel, e o azul vira o roxo do site", () => {
  // O azul é o caso difícil e está documentado em `desenhoDaAutoriaV2`: este projeto
  // tirou o azul da paleta de propósito, porque o tabuleiro é azul e a seta sumia.
  // No arquivo a cor continua sendo "azul"; o que muda é só com o que ela é pintada.
  assert.deepEqual(
    desenhoDaAutoriaV2({
      arrows: [
        { de: "e2", para: "e4", cor: "verde" },
        { de: "d1", para: "h5", cor: "vermelho" },
        { de: "b1", para: "c3", cor: "azul" },
      ],
      highlights: [{ casa: "d5", cor: "amarelo" }],
    }),
    [
      { orig: "e2", dest: "e4", brush: "green" },
      { orig: "d1", dest: "h5", brush: "red" },
      { orig: "b1", dest: "c3", brush: "plano" },
      { orig: "d5", brush: "yellow" },
    ],
  );
});

test("desenho sem cor declarada continua exatamente como era", () => {
  // Esta é a promessa que impede a cor nova de repintar sozinha o conteúdo publicado:
  // as três aulas v1 escrevem a forma curta, e ela cai nos pincéis de sempre.
  assert.deepEqual(
    desenhoDaAutoriaV2({ arrows: [["e2", "e4"]], highlights: ["d5"] }),
    desenhoDaAutoria({ arrows: [["e2", "e4"]], highlights: ["d5"] }),
  );
});

test("as duas formas convivem no mesmo nó", () => {
  assert.deepEqual(
    desenhoDaAutoriaV2({ arrows: [["e2", "e4"], { de: "d1", para: "h5", cor: "vermelho" }] }),
    [
      { orig: "e2", dest: "e4", brush: "blue" },
      { orig: "d1", dest: "h5", brush: "red" },
    ],
  );
});

test("a paleta do autor só nomeia pincéis que a folha de estilo define", () => {
  // `ChessBoard` monta a tabela de pincéis a partir de `PINCEIS`, e um nome que não
  // estiver lá desenha com o padrão do pacote — ou some — **sem erro nenhum**. Este
  // teste fixa os quatro nomes; `ChessBoard` reclama no console se a tabela mudar.
  assert.deepEqual(PINCEL_POR_COR, { verde: "green", vermelho: "red", amarelo: "yellow", azul: "plano" });
});
