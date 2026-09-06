import assert from "node:assert/strict";
import test from "node:test";
import { CLASSES, TRILHA } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import {
  NIVEIS,
  nivelDaClasse,
  nivelDoBloco,
  tamanhoDoNivel,
  vocEstaAqui,
  type ItemDoNivel,
  type ModuloDoNivel,
} from "./trilha.ts";

test("todo bloco de tática cai em algum nível, e a ordem sobe", () => {
  // O que se cobra é cobertura e monotonia: um bloco mais difícil nunca pode
  // cair num nível mais baixo que um mais fácil.
  const posicao = (id: string) => NIVEIS.findIndex((n) => n.id === id);
  let anterior = -1;
  for (const bloco of BLOCOS) {
    const nivel = nivelDoBloco(bloco.faixa);
    assert.ok(posicao(nivel) >= 0, `bloco ${bloco.id} caiu fora dos níveis`);
    if (bloco.faixa[0] > (BLOCOS[bloco.id - 2]?.faixa[0] ?? -1)) {
      assert.ok(
        posicao(nivel) >= anterior,
        `bloco ${bloco.id} (${bloco.faixa[0]}) desceu de nível`,
      );
    }
    anterior = Math.max(anterior, posicao(nivel));
  }
});

test("as quatro classes de finais estão em quatro níveis distintos", () => {
  const niveis = CLASSES.map(nivelDaClasse);
  assert.equal(new Set(niveis).size, CLASSES.length);
  // E na ordem: E no mais baixo, B no mais alto.
  assert.equal(niveis[0], NIVEIS[0].id);
  assert.equal(niveis[CLASSES.length - 1], NIVEIS[NIVEIS.length - 1].id);
});

test("os níveis somam as 49 aulas e os 8 blocos, sem sobra", () => {
  const soma = NIVEIS.reduce(
    (acc, n) => {
      const t = tamanhoDoNivel(n.id);
      return { tatica: acc.tatica + t.tatica, finais: acc.finais + t.finais };
    },
    { tatica: 0, finais: 0 },
  );
  assert.equal(soma.finais, TRILHA.length);
  assert.equal(soma.tatica, BLOCOS.length);
});

test('"você está aqui" é o primeiro nível com trabalho aberto', () => {
  const item = (id: string, aberto: boolean, feitos: number, total: number): ItemDoNivel => ({
    id,
    nome: id,
    href: "#",
    total,
    feitos,
    situacao: aberto ? "aberto" : "por-abrir",
    sabado: aberto ? null : 3,
  });

  const mapa = new Map<string, ModuloDoNivel[]>([
    // Nível 1 inteiro concluído.
    [NIVEIS[0].id, [{ modulo: "tatica", itens: [item("a", true, 39, 39)] }]],
    // Nível 2 tem coisa aberta por fazer: é aqui.
    [NIVEIS[1].id, [{ modulo: "finais", itens: [item("b", true, 0, 6)] }]],
    [NIVEIS[2].id, [{ modulo: "finais", itens: [item("c", true, 0, 6)] }]],
  ]);
  assert.equal(vocEstaAqui(mapa), NIVEIS[1].id);

  // Aula fechada não conta como trabalho: ela ainda não existe para o aluno.
  const soFechado = new Map<string, ModuloDoNivel[]>([
    [NIVEIS[0].id, [{ modulo: "finais", itens: [item("a", false, 0, 6)] }]],
  ]);
  assert.equal(vocEstaAqui(soFechado), null);

  assert.equal(vocEstaAqui(new Map()), null);
});
