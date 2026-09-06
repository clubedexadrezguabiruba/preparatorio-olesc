import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SABADOS } from "../curso/calendario.ts";
import { CLASSES, TRILHA } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { daSemana, validarTarefas } from "./tarefas.ts";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

function lerConteudo(): unknown {
  return JSON.parse(readFileSync(path.join(RAIZ, "content/tarefas.json"), "utf8"));
}

test("o conteúdo das tarefas passa no esquema", () => {
  assert.doesNotThrow(() => validarTarefas(lerConteudo()));
});

test("a semana 1 tem tarefa escrita", () => {
  // É a entrega da F1. Uma `content/tarefas.json` sem a semana 1 é o aluno
  // abrindo o painel no domingo e achando que não tem nada para fazer.
  const semana1 = daSemana(validarTarefas(lerConteudo()), 1);
  assert.ok(semana1.length >= 4, `só ${semana1.length} tarefa(s) na semana 1`);
  assert.ok(
    semana1.some((t) => t.tipo === "tatica"),
    "a semana 1 tem de ter a tarefa de tática — é a que o site mede sozinho",
  );
});

test("toda tarefa aponta para semana que existe no calendário", () => {
  const semanas = new Set(SABADOS.map((s) => s.semana));
  for (const tarefa of validarTarefas(lerConteudo())) {
    assert.ok(semanas.has(tarefa.semana), `a tarefa "${tarefa.id}" está numa semana sem sábado`);
  }
});

test("as metas de tática apontam para blocos do currículo, já abertos", () => {
  // O erro real é digitar `[1, 9]`: um bloco que não existe não soma puzzle
  // nenhum, e a barra da tarefa ficaria parada no zero para sempre, sem
  // nenhuma mensagem de erro em lugar nenhum.
  const ids = new Set(BLOCOS.map((b) => b.id));
  for (const tarefa of validarTarefas(lerConteudo())) {
    if (tarefa.tipo !== "tatica") continue;
    for (const bloco of tarefa.meta.blocos) {
      assert.ok(ids.has(bloco), `a tarefa "${tarefa.id}" cita o bloco ${bloco}, que não existe`);
      const sabado = BLOCOS.find((b) => b.id === bloco)?.sabado ?? 99;
      assert.ok(
        sabado <= tarefa.semana,
        `a tarefa "${tarefa.id}" (semana ${tarefa.semana}) manda resolver o bloco ${bloco}, ` +
          `que só abre no Sábado ${sabado}`,
      );
    }
  }
});

test("as metas de finais apontam para classes que a trilha tem, com aula a abrir", () => {
  // O erro real é pedir "6 da classe C" numa semana em que nenhuma aula da C
  // abriu: a barra ficaria parada no zero e o aluno concluiria que o site não
  // conta o que ele faz.
  for (const tarefa of validarTarefas(lerConteudo())) {
    if (tarefa.tipo !== "finais") continue;
    for (const classe of tarefa.meta.classes) {
      assert.ok(CLASSES.includes(classe), `a tarefa "${tarefa.id}" pede a classe ${classe}`);
    }
    const disponiveis = TRILHA.filter(
      (aula) => tarefa.meta.classes.includes(aula.classe) && aula.sabado <= tarefa.semana,
    ).length;
    assert.ok(
      disponiveis >= tarefa.meta.dominar,
      `a tarefa "${tarefa.id}" pede ${tarefa.meta.dominar} aulas e só ${disponiveis} ` +
        `estão na trilha até a semana ${tarefa.semana}`,
    );
  }
});

test("a semana 2 manda o aluno aos finais", () => {
  // É a entrega da FN1/B4: o curso de finais só vira tarefa de casa quando
  // alguma tarefa o nomeia. Sem isto, a trilha existe e ninguém é mandado nela.
  const semana2 = daSemana(validarTarefas(lerConteudo()), 2);
  assert.ok(
    semana2.some((t) => t.tipo === "finais"),
    "a semana 2 tem de ter a tarefa de finais",
  );
});

test("tarefa de finais sem classe nenhuma reprova", () => {
  assert.throws(
    () =>
      validarTarefas([
        { id: "s2-finais", semana: 2, tipo: "finais", titulo: "Finais", meta: { classes: [], dominar: 6 } },
      ]),
    /conferência/,
  );
});

test("id repetido reprova", () => {
  const uma = {
    id: "s1-x",
    semana: 1,
    tipo: "marcar",
    titulo: "Uma tarefa qualquer",
  };
  assert.throws(() => validarTarefas([uma, { ...uma }]), /aparece duas vezes/);
});

test("o prefixo do id tem de bater com a semana", () => {
  // `s1-` numa tarefa da semana 2 é o tipo de erro que ninguém vê: a tarefa
  // apareceria na semana certa, mas o id mentiria para quem for depurar a
  // marcação no banco daqui a três semanas.
  assert.throws(
    () => validarTarefas([{ id: "s1-fora", semana: 2, tipo: "marcar", titulo: "Fora do lugar" }]),
    /O prefixo do id e a semana têm de bater/,
  );
});

test("conteúdo quebrado estoura com o caminho do problema", () => {
  assert.throws(
    () => validarTarefas([{ id: "s1-curto", semana: 1, tipo: "marcar", titulo: "curto" }]),
    /content\/tarefas\.json/,
  );
});

test("tarefa de tática sem meta reprova", () => {
  assert.throws(
    () => validarTarefas([{ id: "s1-t", semana: 1, tipo: "tatica", titulo: "Sem meta nenhuma" }]),
    /content\/tarefas\.json/,
  );
});

test("os links que ainda estão em branco ficam listados", () => {
  // Este teste não reprova nada: `url` nula é estado previsto (o clube da OLESC
  // no chess.com e o caderno em PDF ainda não existem). Ele **imprime** o que está
  // pendente, para a lista aparecer no `npm test` de toda quinta-feira em vez
  // de ser lembrada na manhã do sábado.
  const emBranco = validarTarefas(lerConteudo()).filter((t) => t.onde && !t.onde.url);
  for (const tarefa of emBranco) {
    console.log(`  link pendente: ${tarefa.id} — ${tarefa.onde?.rotulo}`);
  }
  assert.ok(true);
});
