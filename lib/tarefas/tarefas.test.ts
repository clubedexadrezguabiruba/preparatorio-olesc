import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { NIVEIS } from "../curso/nivel.ts";
import { CLASSES, TRILHA } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { PUZZLES_POR_TEMA } from "../tatica/serie.ts";
import { doNivel, niveisEscritos, validarTarefas } from "./tarefas.ts";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

function lerConteudo(): unknown {
  return JSON.parse(readFileSync(path.join(RAIZ, "content/tarefas.json"), "utf8"));
}

test("o conteúdo das tarefas passa no esquema", () => {
  assert.doesNotThrow(() => validarTarefas(lerConteudo()));
});

test("todo nível da escada tem tarefa escrita", () => {
  // Era "a semana 1 tem tarefa escrita" até 2026-09-09, e a diferença importa:
  // uma semana sem tarefa era um dia sem destino, mas um **nível** sem tarefa é
  // um aluno que chegou lá e encontrou a lista vazia — e ele pode chegar lá
  // hoje, adiantando, porque a trava é mole.
  assert.deepEqual(niveisEscritos(validarTarefas(lerConteudo())), [...NIVEIS]);
});

test("todo nível tem a tarefa de tática, que é a que o site mede sozinho", () => {
  // A rotina tem dois blocos escritos aqui: a tática, que o servidor conta, e a
  // partida, que só o aluno declara. Um nível sem a de tática é tempo de estudo
  // por dia sem destino.
  //
  // **Não há tarefa de finais**, e é decisão: o cartão do nível já cobra finais
  // com o clamp pelo publicado, e um `dominar` escrito em JSON não sabe
  // encolher para o que existe em disco. Ver o cabeçalho de `tarefas.ts`.
  const tarefas = validarTarefas(lerConteudo());
  for (const nivel of NIVEIS) {
    const daqui = doNivel(tarefas, nivel);
    assert.ok(
      daqui.some((t) => t.tipo === "tatica"),
      `o nível ${nivel} não tem tarefa de tática`,
    );
    assert.ok(
      daqui.some((t) => t.tipo === "marcar"),
      `o nível ${nivel} não tem tarefa de marcar`,
    );
  }
});

test("as metas de tática apontam para blocos do currículo, e do nível certo", () => {
  // O erro real é digitar `[1, 9]`: um bloco que não existe não soma puzzle
  // nenhum, e a barra da tarefa ficaria parada no zero para sempre, sem
  // nenhuma mensagem de erro em lugar nenhum.
  //
  // O segundo `assert` substituiu a conferência de sábado: mandar o aluno do
  // nível 2 resolver um bloco do nível 5 seria a lista de casa discordando da
  // escada — e é o tipo de erro que ninguém vê, porque as duas telas parecem
  // certas isoladamente.
  const porId = new Map(BLOCOS.map((b) => [b.id, b]));
  for (const tarefa of validarTarefas(lerConteudo())) {
    if (tarefa.tipo !== "tatica") continue;
    for (const id of tarefa.meta.blocos) {
      const bloco = porId.get(id);
      assert.ok(bloco, `a tarefa "${tarefa.id}" cita o bloco ${id}, que não existe`);
      assert.equal(
        bloco.nivel,
        tarefa.nivel,
        `a tarefa "${tarefa.id}" (nível ${tarefa.nivel}) manda resolver o bloco ${id}, ` +
          `que é do nível ${bloco.nivel}`,
      );
    }
  }
});

test("a meta de puzzles de cada nível é o tamanho real dos blocos dele", () => {
  // Uma meta maior que o conteúdo é uma barra que nunca enche; uma meta menor
  // é a tarefa dizendo "acabou" com o nível ainda aberto. As duas fazem o aluno
  // desconfiar do número, e o número é a única coisa que a tarefa tem.
  for (const tarefa of validarTarefas(lerConteudo())) {
    if (tarefa.tipo !== "tatica") continue;
    const temas = BLOCOS.filter((b) => tarefa.meta.blocos.includes(b.id)).reduce(
      (soma, b) => soma + b.temas.length,
      0,
    );
    assert.equal(
      tarefa.meta.puzzles,
      temas * PUZZLES_POR_TEMA,
      `a tarefa "${tarefa.id}" pede ${tarefa.meta.puzzles} puzzles e os blocos têm ${temas * PUZZLES_POR_TEMA}`,
    );
  }
});

test("as metas de finais, se voltarem, apontam para classes que a trilha tem", () => {
  // Nenhuma tarefa é de finais hoje. O teste fica porque o **tipo** fica: no
  // dia em que a escada de finais deixar de ser oca e alguém escrever uma, o
  // erro de digitar uma classe inexistente reprova aqui.
  for (const tarefa of validarTarefas(lerConteudo())) {
    if (tarefa.tipo !== "finais") continue;
    for (const classe of tarefa.meta.classes) {
      assert.ok(CLASSES.includes(classe), `a tarefa "${tarefa.id}" pede a classe ${classe}`);
    }
    const disponiveis = TRILHA.filter(
      (aula) => tarefa.meta.classes.includes(aula.classe) && aula.nivel <= tarefa.nivel,
    ).length;
    assert.ok(
      disponiveis >= tarefa.meta.dominar,
      `a tarefa "${tarefa.id}" pede ${tarefa.meta.dominar} aulas e só ${disponiveis} ` +
        `estão na trilha até o nível ${tarefa.nivel}`,
    );
  }
});

test("tarefa de finais sem classe nenhuma reprova", () => {
  assert.throws(
    () =>
      validarTarefas([
        {
          id: "n2-finais",
          nivel: 2,
          tipo: "finais",
          titulo: "Finais",
          meta: { classes: [], dominar: 6 },
        },
      ]),
    /conferência/,
  );
});

test("id repetido reprova", () => {
  const uma = { id: "n1-x", nivel: 1, tipo: "marcar", titulo: "Uma tarefa qualquer" };
  assert.throws(() => validarTarefas([uma, { ...uma }]), /aparece duas vezes/);
});

test("o prefixo do id tem de bater com o nível", () => {
  // `n1-` numa tarefa do nível 2 é o tipo de erro que ninguém vê: a tarefa
  // apareceria no nível certo, mas o id mentiria para quem for depurar a
  // marcação no banco daqui a três semanas.
  assert.throws(
    () => validarTarefas([{ id: "n1-fora", nivel: 2, tipo: "marcar", titulo: "Fora do lugar" }]),
    /O prefixo do id e o nível têm de bater/,
  );
});

test("o prefixo de semana não é mais aceito", () => {
  // A renomeação de `s<semana>-` para `n<nível>-` foi segura porque
  // `tarefa_conclusao` estava vazia. Este teste é o que impede alguém de
  // reintroduzir o prefixo antigo sem notar que ele já não quer dizer nada.
  assert.throws(
    () => validarTarefas([{ id: "s1-antiga", nivel: 1, tipo: "marcar", titulo: "Do tempo antigo" }]),
    /content\/tarefas\.json/,
  );
});

test("conteúdo quebrado estoura com o caminho do problema", () => {
  assert.throws(
    () => validarTarefas([{ id: "n1-curto", nivel: 1, tipo: "marcar", titulo: "curto" }]),
    /content\/tarefas\.json/,
  );
});

test("tarefa de tática sem meta reprova", () => {
  assert.throws(
    () => validarTarefas([{ id: "n1-t", nivel: 1, tipo: "tatica", titulo: "Sem meta nenhuma" }]),
    /content\/tarefas\.json/,
  );
});

test("os links que ainda estão em branco ficam listados", () => {
  // Este teste não reprova nada: `url` nula é estado previsto (o clube da OLESC
  // no chess.com ainda não existe). Ele **imprime** o que está pendente, para a
  // lista aparecer no `npm test` de toda quinta-feira em vez de ser lembrada na
  // manhã do sábado.
  const emBranco = validarTarefas(lerConteudo()).filter((t) => t.onde && !t.onde.url);
  for (const tarefa of emBranco) {
    console.log(`  link pendente: ${tarefa.id} — ${tarefa.onde?.rotulo}`);
  }
  assert.ok(true);
});
