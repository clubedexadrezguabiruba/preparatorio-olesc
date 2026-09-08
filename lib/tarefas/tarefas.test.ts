import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SABADOS, SEMANAS } from "../curso/calendario.ts";
import { CLASSES, TRILHA } from "../finais/trilha.ts";
import { NIVEIS } from "../curso/trilha.ts";
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



test("toda semana do curso tem tarefa dos quatro blocos da rotina", () => {
  // A rotina de 2 h tem quatro blocos — tática, finais, meio-jogo e partida —,
  // e uma semana sem tarefa de um deles é meia hora por dia sem destino. O
  // bloco da partida é sempre `marcar`: não há API do chess.com para conferir.
  //
  // O **bloco** não é o `tipo`, e a diferença apareceu em 2026-09-07: as
  // tarefas de meio-jogo das semanas 1, 3 e 4 viraram `marcar` porque as dicas
  // dos degraus delas ainda não têm exercício. Elas continuam sendo o bloco de
  // meio-jogo da semana; o que mudou foi como o site as fecha. Quem diz o bloco
  // é o sufixo do id, que já era a convenção (`s1-meiojogo`).
  const tarefas = validarTarefas(lerConteudo());
  for (const semana of SEMANAS) {
    const daqui = tarefas.filter((t) => t.semana === semana);
    if (daqui.length === 0) continue; // semana ainda não escrita
    for (const tipo of ["tatica", "finais"] as const) {
      assert.ok(
        daqui.some((t) => t.tipo === tipo),
        `a semana ${semana} não tem tarefa de ${tipo}`,
      );
    }
    assert.ok(
      daqui.some((t) => t.id.endsWith("-meiojogo")),
      `a semana ${semana} não tem tarefa de meio-jogo`,
    );
  }
});

/**
 * As aulas de meio-jogo que já têm exercício escrito, lidas do disco.
 *
 * Lê `content/lessons/` com `fs`, como este arquivo já lê `content/tarefas.json`
 * — e não por `lib/meiojogo/conteudo.ts`, que é `server-only` e não roda no
 * `node --test`. O que se quer aqui é uma pergunta só: existe alguma aula
 * pronta? — e ela não precisa do schema para ser respondida.
 */
function aulasDeMeioJogoComExercicio(): string[] {
  const pasta = path.join(RAIZ, "content/lessons");
  return readdirSync(pasta)
    .filter((f) => f.startsWith("M") && f.endsWith(".json"))
    .filter((f) => {
      const aula = JSON.parse(readFileSync(path.join(pasta, f), "utf8")) as {
        status?: string;
        stages?: { exercises?: { items?: unknown[] } };
      };
      return aula.status === "published" && (aula.stages?.exercises?.items?.length ?? 0) > 0;
    })
    .map((f) => f.replace(/\.json$/, ""));
}

test("a semana do piloto mede o meio-jogo assim que houver aula escrita", () => {
  // A semana 2 é a do piloto (19–25/9), e é a semana em que o professor vai
  // olhar o relatório: deixá-la em `marcar` é desperdiçá-la.
  //
  // A cobrança é **condicionada ao conteúdo**, e é de propósito. Em 2026-09-08 o
  // módulo foi reescrito do zero e ficou sem nenhuma aula: cobrar a tarefa
  // medida naquele dia só deixaria a árvore vermelha sem que houvesse o que
  // apontar, e a saída fácil — apagar o teste — perderia a regra. Assim ele
  // dorme enquanto não há conteúdo e **volta a morder no minuto em que a
  // primeira aula for publicada**, que é exatamente quando a conversão passa a
  // ser possível. A dívida fica com gatilho em vez de ficar num documento.
  const semana2 = daSemana(validarTarefas(lerConteudo()), 2);
  const doMeioJogo = semana2.find((t) => t.id.endsWith("-meiojogo"));
  assert.ok(doMeioJogo, "a semana 2 não tem tarefa de meio-jogo");

  const escritas = aulasDeMeioJogoComExercicio();
  if (escritas.length === 0) {
    assert.equal(
      doMeioJogo.tipo,
      "marcar",
      "sem aula escrita, a tarefa do piloto só pode ser de marcar",
    );
    return;
  }
  assert.equal(
    doMeioJogo.tipo,
    "meiojogo",
    `já existem aulas de meio-jogo escritas (${escritas.join(", ")}) — ` +
      "a tarefa da semana do piloto tem de ser medida",
  );
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

/**
 * As aulas de meio-jogo que uma tarefa pode citar, escritas à mão.
 *
 * Não saem de `indiceDeMeioJogo()`: aquele arquivo abre o disco e é
 * `server-only`, e o `npm test` roda sem `--conditions=react-server`. O que se
 * cobra aqui é a **regra** — id que existe, título literal na prosa, aula com
 * exercício —, e a regra não depende de qual capítulo já foi escrito.
 */
const AULAS_CITAVEIS = [
  { id: "M103-PRINCIPIOS-DE-ABERTURA", titulo: "Princípios de abertura", exercicios: 6 },
  { id: "M106-O-VALOR-DAS-PECAS", titulo: "O valor das peças", exercicios: 6 },
];

test("o detalhe do meio-jogo nomeia aulas que existem, e escreve o título delas", () => {
  // O erro real, e ele estava no ar antes de 2026-09-07: os quatro `detalhe` do
  // painel prometiam conceitos que não eram do conteúdo que a tarefa apontava.
  // O teste de contagem, sozinho, passava nos quatro — porque contagem não é
  // descrição. Este cobra as duas pontas: os ids existem, e o título de cada um
  // aparece **literalmente** na prosa que o aluno lê no painel.
  assert.deepEqual(problemasDoDetalheDeMeioJogo(validarTarefas(lerConteudo()), AULAS_CITAVEIS), []);
});

test("aula que não existe no detalhe reprova, mesmo com a contagem certa", () => {
  const tarefa = {
    id: "s2-meiojogo",
    semana: 2,
    tipo: "meiojogo",
    titulo: "Fazer uma aula de meio-jogo",
    detalhe: "Uma aula que ninguém escreveu",
    aulas: ["M199-NAO-EXISTE"],
    meta: { concluir: 1 },
  };
  const problemas = problemasDoDetalheDeMeioJogo(validarTarefas([tarefa]), AULAS_CITAVEIS);
  assert.ok(
    problemas.some((p) => /nomeia a aula "M199-NAO-EXISTE", que não existe/.test(p)),
    problemas.join(" | "),
  );
});

test("a contagem e a lista têm de concordar", () => {
  // Uma tarefa que manda concluir duas aulas e nomeia uma: a barra do painel
  // pararia em 1 de 2 para sempre, e o aluno concluiria que marcar não funciona.
  const tarefa = {
    id: "s2-meiojogo",
    semana: 2,
    tipo: "meiojogo",
    titulo: "Fazer duas aulas de meio-jogo",
    detalhe: "Só uma está escrita aqui",
    aulas: ["M103-PRINCIPIOS-DE-ABERTURA"],
    meta: { concluir: 2 },
  };
  const problemas = problemasDoDetalheDeMeioJogo(validarTarefas([tarefa]), AULAS_CITAVEIS);
  assert.ok(
    problemas.some((p) => /manda concluir 2 aula\(s\) e nomeia 1/.test(p)),
    problemas.join(" | "),
  );
});

test("aula sem exercício escrito numa tarefa medida reprova", () => {
  // A regra que impede a caixa impossível: uma tarefa que conta aula concluída
  // nomeando uma aula que ainda não tem exercício é uma caixa que nada do que o
  // aluno fizer vai marcar. O caso é montado à mão porque o módulo está sendo
  // reescrito e pode não haver, hoje, uma aula nesse estado.
  const semExercicio = { id: "M101-EM-ESCRITA", titulo: "Uma aula em escrita", exercicios: 0 };
  const tarefa = {
    id: "s1-meiojogo",
    semana: 1,
    tipo: "meiojogo",
    titulo: "Fazer uma aula de meio-jogo",
    detalhe: semExercicio.titulo,
    aulas: [semExercicio.id],
    meta: { concluir: 1 },
  };
  const problemas = problemasDoDetalheDeMeioJogo(validarTarefas([tarefa]), [semExercicio]);
  assert.ok(
    problemas.some((p) => p.includes("que não tem exercício escrito")),
    problemas.join(" | "),
  );
});

test("lista certa e prosa desatualizada reprovam — é o par que discorda", () => {
  // A outra metade: os ids passam a estar certos e ninguém reescreve o texto.
  // Sem esta regra, o painel voltaria a prometer uma coisa e a trilha a levar a
  // outra, com o gate verde.
  const aula = { id: "M103-PRINCIPIOS-DE-ABERTURA", titulo: "Princípios de abertura", exercicios: 6 };
  const tarefa = {
    id: "s1-meiojogo",
    semana: 1,
    tipo: "meiojogo",
    titulo: "Fazer uma aula de meio-jogo",
    detalhe: "A coluna aberta e a dama sozinha.",
    aulas: [aula.id],
    meta: { concluir: 1 },
  };
  const problemas = problemasDoDetalheDeMeioJogo(validarTarefas([tarefa]), [aula]);
  assert.ok(
    problemas.some((p) => /não escreve "Princípios de abertura" no detalhe/.test(p)),
    problemas.join(" | "),
  );
});
