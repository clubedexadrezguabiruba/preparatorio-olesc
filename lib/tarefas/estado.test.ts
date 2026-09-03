import assert from "node:assert/strict";
import test from "node:test";
import type { ProgressoDoTema } from "../tatica/progresso.ts";
import { estadoDasTarefas, quantasFeitas, somarBlocos } from "./estado.ts";
import type { Tarefa } from "./tarefas.ts";

/**
 * O progresso é um `Map` montado à mão: estas funções são puras de propósito,
 * e testá-las não precisa de Supabase, de rede, nem de conta de aluno.
 */
function tema(tentativas: number, certos: number): ProgressoDoTema {
  return {
    feitos: { aquecimento: 0, serie: tentativas, prova: 0 },
    acertos: { aquecimento: 0, serie: certos, prova: 0 },
    tentativas,
    certos,
  };
}

const TAREFA_TATICA: Tarefa = {
  id: "s1-tatica",
  semana: 1,
  tipo: "tatica",
  titulo: "60 puzzles dos blocos 1 e 2",
  meta: { blocos: [1, 2], puzzles: 60, acerto: 70 },
  onde: null,
};

const TAREFA_MARCAR: Tarefa = {
  id: "s1-video",
  semana: 1,
  tipo: "marcar",
  titulo: "Assistir ao vídeo da anotação",
  onde: null,
};

test("somar blocos conta só os temas dos blocos pedidos", () => {
  const progresso = new Map([
    ["mateIn1", tema(10, 8)], // bloco 1
    ["backRankMate", tema(6, 3)], // bloco 2
    ["fork", tema(30, 30)], // bloco 4 — não conta
  ]);

  assert.deepEqual(somarBlocos(progresso, [1, 2]), { feitos: 16, certos: 11 });
  assert.deepEqual(somarBlocos(progresso, [4]), { feitos: 30, certos: 30 });
  assert.deepEqual(somarBlocos(progresso, [7]), { feitos: 0, certos: 0 });
});

test("a tarefa de tática fecha pela contagem, não pelo acerto", () => {
  // 60 puzzles com 50% de acerto: a tarefa está feita. A caixa que o aluno não
  // consegue marcar por mais que trabalhe é a caixa que ensina a desistir — o
  // acerto abaixo da meta é conversa do relatório do professor, não tranca.
  const progresso = new Map([["mateIn1", tema(60, 30)]]);
  const [estado] = estadoDasTarefas([TAREFA_TATICA], new Set(), progresso);

  assert.equal(estado.feita, true);
  assert.deepEqual(estado.medida, {
    feitos: 60,
    meta: 60,
    acerto: 50,
    acertoEsperado: 70,
  });
});

test("a tarefa de tática no meio do caminho", () => {
  const progresso = new Map([
    ["mateIn1", tema(20, 15)],
    ["hookMate", tema(4, 3)],
  ]);
  const [estado] = estadoDasTarefas([TAREFA_TATICA], new Set(), progresso);

  assert.equal(estado.feita, false);
  assert.equal(estado.medida?.feitos, 24);
  assert.equal(estado.medida?.acerto, 75);
});

test("sem puzzle nenhum, o acerto é nulo e não zero", () => {
  // Zero por cento é uma afirmação sobre o aluno — a de que ele errou tudo.
  // Quem não começou não errou nada, e a tela mostra um traço.
  const [estado] = estadoDasTarefas([TAREFA_TATICA], new Set(), new Map());
  assert.equal(estado.medida?.acerto, null);
  assert.equal(estado.feita, false);
});

test("a tarefa de marcar depende só da marcação", () => {
  const progresso = new Map([["mateIn1", tema(500, 500)]]);

  const [semMarca] = estadoDasTarefas([TAREFA_MARCAR], new Set(), progresso);
  assert.equal(semMarca.feita, false, "resolver puzzle não assiste vídeo por ninguém");
  assert.equal(semMarca.medida, null);

  const [comMarca] = estadoDasTarefas([TAREFA_MARCAR], new Set(["s1-video"]), new Map());
  assert.equal(comMarca.feita, true);
});

test("marcar a tarefa de tática não a fecha", () => {
  // A ação do servidor recusa marcar tarefa de tática, mas se uma linha velha
  // sobrar no banco (um id que mudou de tipo, por exemplo), a contagem aqui
  // continua sendo a dos puzzles. A marcação não tem voto nesta tarefa.
  const [estado] = estadoDasTarefas([TAREFA_TATICA], new Set(["s1-tatica"]), new Map());
  assert.equal(estado.feita, false);
});

test("quantas feitas conta as duas espécies juntas", () => {
  const progresso = new Map([["mateIn1", tema(60, 42)]]);
  const estados = estadoDasTarefas(
    [TAREFA_TATICA, TAREFA_MARCAR],
    new Set(["s1-video"]),
    progresso,
  );
  assert.equal(quantasFeitas(estados), 2);
});
