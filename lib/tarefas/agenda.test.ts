import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { COMECO_DO_TORNEIO, SABADOS } from "../curso/calendario.ts";
import { validarTarefas } from "./tarefas.ts";
import { diaDe, doQuando, emOrdemDeData, QUANDO, quandoPorExtenso, validarAgenda } from "./agenda.ts";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));

const ler = (arquivo: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, "content", arquivo), "utf8"));

test("o conteúdo da agenda passa no esquema", () => {
  assert.doesNotThrow(() => validarAgenda(ler("agenda.json")));
});

test("a véspera do torneio está na agenda", () => {
  // É a lista mais importante das que existem: lida uma vez, na noite de 10 de
  // outubro, sem segunda chance. Foi por ela que a agenda existe — forçá-la num
  // degrau da escada a teria perdido.
  const vespera = doQuando(validarAgenda(ler("agenda.json")), "vespera-do-torneio");
  assert.equal(vespera.length, 1, "a véspera tem de ter exatamente um item");
  assert.ok(vespera[0].detalhe?.includes("Mochila"), "a lista da mochila é a metade útil dela");
});

test("toda data da agenda sai do calendário, e nenhuma é escrita à mão", () => {
  for (const quando of QUANDO) {
    const dia = diaDe(quando);
    assert.match(dia, /^\d{4}-\d{2}-\d{2}$/, `"${quando}" não devolveu uma data`);
    if (quando === "vespera-do-torneio") continue;
    const numero = Number(quando.slice("sabado-".length));
    assert.equal(dia, SABADOS.find((s) => s.semana === numero)?.data);
  }
});

test("a véspera é o dia anterior ao torneio, e remarcar o torneio a remarca junto", () => {
  const vespera = diaDe("vespera-do-torneio");
  const umDia = 24 * 60 * 60 * 1000;
  assert.equal(Date.parse(`${vespera}T00:00:00Z`) + umDia, Date.parse(`${COMECO_DO_TORNEIO}T00:00:00Z`));
});

test("a agenda em ordem de data é crescente", () => {
  const dias = emOrdemDeData(validarAgenda(ler("agenda.json"))).map((i) => diaDe(i.quando));
  assert.deepEqual(dias, [...dias].sort());
});

test("`quandoPorExtenso` nomeia o dia em português, sem o rótulo cru", () => {
  assert.equal(quandoPorExtenso("sabado-2"), "Sábado 2, 19 de setembro");
  assert.equal(quandoPorExtenso("vespera-do-torneio"), "Véspera do torneio, 10 de outubro");
});

test("id de agenda e id de tarefa nunca colidem", () => {
  // Os dois vivem na mesma coluna do banco (`tarefa_conclusao.tarefa`). Uma
  // colisão faria marcar um item da agenda marcar uma tarefa de nível — e
  // ninguém depuraria isso olhando as duas telas, que pareceriam certas.
  const daAgenda = new Set(validarAgenda(ler("agenda.json")).map((i) => i.id));
  for (const tarefa of validarTarefas(ler("tarefas.json"))) {
    assert.ok(!daAgenda.has(tarefa.id), `"${tarefa.id}" está nos dois arquivos`);
  }
});

test("id sem o prefixo `agenda-` reprova", () => {
  assert.throws(
    () => validarAgenda([{ id: "vespera", quando: "vespera-do-torneio", titulo: "A véspera" }]),
    /content\/agenda\.json/,
  );
});

test("id repetido reprova", () => {
  const um = { id: "agenda-x", quando: "sabado-1", titulo: "Um item qualquer" };
  assert.throws(() => validarAgenda([um, { ...um }]), /aparece duas vezes/);
});

test("rótulo de quando que não existe reprova", () => {
  assert.throws(
    () => validarAgenda([{ id: "agenda-x", quando: "sabado-9", titulo: "Um item qualquer" }]),
    /content\/agenda\.json/,
  );
});
