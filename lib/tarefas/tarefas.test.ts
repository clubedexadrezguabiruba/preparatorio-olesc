import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SABADOS, SEMANAS } from "../curso/calendario.ts";
import { CLASSES, TRILHA } from "../finais/trilha.ts";
import { NIVEIS } from "../curso/trilha.ts";
import { DICAS, dicasDoNivel } from "../meiojogo/conteudo.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { daSemana, problemasDoDetalheDeMeioJogo, validarTarefas } from "./tarefas.ts";

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

test("as metas de meio-jogo apontam para degraus que existem, com dica escrita", () => {
  // O gêmeo do teste acima, e pelo mesmo erro real: pedir "8 dicas do degrau
  // 1400-1600" quando só 6 estão escritas deixaria a barra parada em 6 de 8 e
  // o aluno concluiria que marcar não funciona.
  const degraus = new Set(NIVEIS.map((n) => n.id));
  for (const tarefa of validarTarefas(lerConteudo())) {
    if (tarefa.tipo !== "meiojogo") continue;
    assert.ok(
      degraus.has(tarefa.meta.nivel),
      `a tarefa "${tarefa.id}" pede o degrau "${tarefa.meta.nivel}", que não existe`,
    );
    const escritas = dicasDoNivel(tarefa.meta.nivel).length;
    assert.ok(
      escritas >= tarefa.meta.ler,
      `a tarefa "${tarefa.id}" pede ${tarefa.meta.ler} dicas e só ${escritas} ` +
        `estão escritas no degrau ${tarefa.meta.nivel}`,
    );
  }
});

test("o detalhe do meio-jogo nomeia dicas que existem, e no degrau que ele aponta", () => {
  // O erro real, e ele estava no ar: o `detalhe` de `s1-meiojogo` prometia
  // "a coluna aberta" e "a dama sozinha", que não são dica do degrau `ate-1000`;
  // o de `s2` prometia "melhorar a pior peça" (que é m17, do degrau seguinte) e
  // "trocar quando se está na frente", que não é dica de degrau nenhum; o de
  // `s3` prometia "posto avançado" e "bispo bom e bispo mau", que são m15 e m14,
  // do degrau anterior; e o de `s4`, "ataque de minoria" e "sacrifício de
  // qualidade", que não existem. Quatro de quatro.
  //
  // O teste ao lado — o da contagem — passava nos quatro, porque contagem não
  // é descrição. Este cobra as duas pontas: os ids são do degrau, e o título de
  // cada um aparece **literalmente** na prosa que o aluno lê no painel.
  assert.deepEqual(problemasDoDetalheDeMeioJogo(validarTarefas(lerConteudo()), DICAS), []);
});

test("dica do degrau errado no detalhe reprova, mesmo com a contagem certa", () => {
  // O caso adversarial: seis dicas nomeadas para uma tarefa que pede seis, com
  // uma delas de outro degrau. É a forma exata do erro que estava no ar — e o
  // teste da contagem, ao lado, continua passando neste conteúdo.
  const tarefa = {
    id: "s2-meiojogo",
    semana: 2,
    tipo: "meiojogo",
    titulo: "Ler dicas do degrau 1000–1200",
    detalhe: "Abra uma rota para a pior peça",
    dicas: ["m17"],
    meta: { nivel: "1000-1200", ler: 1 },
  };
  const problemas = problemasDoDetalheDeMeioJogo(validarTarefas([tarefa]), DICAS);
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /é do degrau 1000-1200 e nomeia "m17", que é do degrau 1200-1400/);
});

test("lista certa e prosa desatualizada reprovam — é o par que discorda", () => {
  // A outra metade: os ids passam a estar certos e ninguém reescreve o texto.
  // Sem esta regra, o painel voltaria a prometer uma coisa e a trilha a levar
  // a outra, com o gate verde.
  const tarefa = {
    id: "s1-meiojogo",
    semana: 1,
    tipo: "meiojogo",
    titulo: "Ler dicas do degrau até 1000",
    detalhe: "A coluna aberta e a dama sozinha.",
    dicas: ["m1"],
    meta: { nivel: "ate-1000", ler: 1 },
  };
  const problemas = problemasDoDetalheDeMeioJogo(validarTarefas([tarefa]), DICAS);
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /não escreve "Coloque outra peça no jogo" no detalhe/);
});

test("toda semana do curso tem tarefa dos quatro blocos da rotina", () => {
  // A rotina de 2 h tem quatro blocos — tática, finais, meio-jogo e partida —,
  // e uma semana sem tarefa de um deles é meia hora por dia sem destino. O
  // bloco da partida é sempre `marcar`: não há API do chess.com para conferir.
  const tarefas = validarTarefas(lerConteudo());
  for (const semana of SEMANAS) {
    const daqui = tarefas.filter((t) => t.semana === semana);
    if (daqui.length === 0) continue; // semana ainda não escrita
    for (const tipo of ["tatica", "finais", "meiojogo"] as const) {
      assert.ok(
        daqui.some((t) => t.tipo === tipo),
        `a semana ${semana} não tem tarefa de ${tipo}`,
      );
    }
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
