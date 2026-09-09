import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonSchema } from "../lesson/schema.ts";
import { depoisDaPassada, zerada } from "./escada.ts";
import {
  aprendeu,
  aprendidasDaTrilha,
  aulaDaTrilha,
  aulasAbertas,
  AULA_ZERADA,
  CLASSES,
  estadoDaAula,
  proximaAula,
  TRILHA,
  type AulaDaTrilha,
  type Formato,
  type ProgressoDaAula,
} from "./trilha.ts";

/**
 * A trilha é dado, e o que se cobra dela é o que uma lista escrita à mão erra:
 * id repetido, ordem furada, classe fora de ordem, e — a que dói de verdade —
 * uma aula publicada em `content/` que a trilha não conhece, ou o contrário.
 *
 * Os três critérios de domínio são testados como função pura, sem banco: é para
 * isso que `aprendeu` recebe o formato em vez de perguntá-lo ao Supabase.
 */

function progresso(parcial: Partial<ProgressoDaAula>): ProgressoDaAula {
  return { ...AULA_ZERADA, ...parcial };
}

/** Uma aula subida até o degrau pedido, em dias distintos e vencidos. */
function noDegrau(ate: number): ProgressoDaAula {
  const dias = [
    "2026-09-05T14:00:00.000Z",
    "2026-09-07T14:00:00.000Z",
    "2026-09-12T14:00:00.000Z",
  ];
  let escada = zerada();
  for (let d = 0; d < ate; d++) escada = depoisDaPassada(escada, true, dias[d]);
  return progresso({ tentativas: ate, praticaOk: true, escada });
}

/* ------------------------------------------------------------------ *
 * A lista
 * ------------------------------------------------------------------ */

test("a trilha tem as 49 aulas do documento, sem id repetido", () => {
  assert.equal(TRILHA.length, 49);
  assert.equal(new Set(TRILHA.map((a) => a.id)).size, 49);
});

test("a ordem é 1..49 sem buraco e na ordem da lista", () => {
  assert.deepEqual(
    TRILHA.map((a) => a.ordem),
    Array.from({ length: 49 }, (_, i) => i + 1),
  );
});

test("as classes vêm em blocos, de E para B, com o tamanho do documento", () => {
  // §4 do documento: a distribuição planejada por classe. Se uma aula mudar de
  // classe sem o documento mudar junto, é aqui que aparece.
  const esperado: Record<string, number> = { E: 6, D: 12, C: 16, B: 15 };
  for (const classe of CLASSES) {
    assert.equal(TRILHA.filter((a) => a.classe === classe).length, esperado[classe], classe);
  }
  // Em blocos: a classe de cada aula nunca "volta" na lista.
  const posicao = (a: AulaDaTrilha) => CLASSES.indexOf(a.classe);
  for (let i = 1; i < TRILHA.length; i += 1) {
    assert.ok(posicao(TRILHA[i]) >= posicao(TRILHA[i - 1]), `a aula ${TRILHA[i].id} sai da ordem`);
  }
});

test("os formatos batem com a conta de horas da §6: 8 completas, 39 curtas, 2 leituras", () => {
  const conta = (f: Formato) => TRILHA.filter((a) => a.formato === f).length;
  assert.equal(conta("completa"), 8);
  assert.equal(conta("curta"), 39);
  assert.equal(conta("leitura"), 2);
});

test("o nível de uma aula nunca é menor que o de uma aula anterior", () => {
  // Não é regra de xadrez: é o pré-requisito. Abrir a casa-chave antes da
  // oposição deixaria o aluno numa aula que pressupõe a que ele não tem.
  //
  // A varredura era por classe até 2026-09-09, quando o corte passou a ser a
  // `ordem` — e sobre a lista inteira o teste fica **mais** forte: agora ele
  // cobra que a ordem de pré-requisito e a escada de níveis não se cruzem em
  // lugar nenhum, e não só dentro de cada classe.
  const emOrdem = [...TRILHA].sort((a, b) => a.ordem - b.ordem);
  for (let i = 1; i < emOrdem.length; i += 1) {
    assert.ok(
      emOrdem[i].nivel >= emOrdem[i - 1].nivel,
      `${emOrdem[i].id} (nível ${emOrdem[i].nivel}) vem depois de ` +
        `${emOrdem[i - 1].id} (nível ${emOrdem[i - 1].nivel})`,
    );
  }
});

test("toda aula publicada em content/ está na trilha, e a trilha não inventa arquivo", () => {
  const pasta = path.join(process.cwd(), "content", "lessons");
  for (const aula of TRILHA) {
    const arquivo = path.join(pasta, `${aula.id}.json`);
    if (!existsSync(arquivo)) continue; // ainda não escrita: é a FN2 em diante.
    const lida = lessonSchema.parse(JSON.parse(readFileSync(arquivo, "utf8")));
    assert.equal(lida.id, aula.id);
    // A classe do arquivo e a da trilha são a mesma coisa dita duas vezes; o
    // gate cobra a do arquivo (rotação de livros), o site usa a da trilha.
    if (lida.status === "published") assert.equal(lida.class, aula.classe, aula.id);
  }
});

test("aulaDaTrilha acha pelo id e nega o que não é do curso", () => {
  assert.equal(aulaDaTrilha("N0-R-MATE")?.ordem, 2);
  assert.equal(aulaDaTrilha("N9-INVENTADA"), undefined);
});

/* ------------------------------------------------------------------ *
 * A regra da aula aberta
 * ------------------------------------------------------------------ */

test("aula aberta é a que está na trilha e tem JSON publicado", () => {
  // O parâmetro de semana saiu em 2026-09-09: a data não tranca mais nada, e o
  // nível não tranca rota. Sobrou o único motivo que sempre foi de verdade —
  // a aula existir em disco.
  const publicadas = new Set(["N0-R-MATE", "N1-SQUARE", "N9-FORA-DA-TRILHA"]);

  // E o arquivo fora da trilha não entra, porque publicar não é o mesmo que
  // fazer parte do curso.
  assert.deepEqual(
    aulasAbertas(publicadas).map((a) => a.id),
    ["N0-R-MATE", "N1-SQUARE"],
  );
});

test("aula na trilha e não publicada continua fechada", () => {
  assert.deepEqual(aulasAbertas(new Set()), []);
});

/* ------------------------------------------------------------------ *
 * O que conta como aprendida
 *
 * **Isto mudou de significado em 2026-09-08**, e mudou no site inteiro. Era um
 * booleano permanente — `praticaOk`, uma vitória em algum momento —, e passou a
 * ser o degrau 3 da escada: três passadas em dias distintos e espaçados.
 * ------------------------------------------------------------------ */

test("uma vitória não aprende a aula: o degrau 1 é só o começo da escada", () => {
  // O caso que dá nome à mudança. Antes, isto era "dominada".
  assert.equal(aprendeu("curta", noDegrau(1)), false);
  assert.equal(aprendeu("curta", noDegrau(2)), false);
  assert.equal(aprendeu("curta", noDegrau(3)), true);
});

test("`praticaOk` sozinho não aprende nada — ele é histórico, não critério", () => {
  // A coluna continua no banco com as linhas antigas dos alunos, e continua no
  // tipo. O que ela deixou de fazer é decidir.
  assert.equal(aprendeu("curta", progresso({ praticaOk: true })), false);
  assert.equal(aprendeu("completa", progresso({ soloOk: true, praticaOk: true })), false);
});

test("a aula perde posto sem desaprender", () => {
  // Perder depois de aprendida derruba dois degraus com piso no 1, e a data de
  // `aprendidaEm` fica. A aula volta como revisão curta, não como recomeço.
  const caiu = progresso({
    escada: depoisDaPassada(noDegrau(3).escada, false, "2026-10-20T14:00:00.000Z"),
  });
  assert.equal(caiu.escada.degrau, 1);
  assert.equal(aprendeu("curta", caiu), true);
});

test("aula de leitura fica fora da escada: ela é declaração", () => {
  assert.equal(aprendeu("leitura", progresso({ lida: true })), true);
  // E nem o degrau 3 a fecha: não há partida numa aula de leitura, e um degrau
  // ali seria sinal de que alguma outra coisa gravou no lugar errado.
  assert.equal(aprendeu("leitura", noDegrau(3)), false);
});

test("o estado da aula sai do formato, das tentativas e da escada", () => {
  assert.equal(estadoDaAula("curta", AULA_ZERADA), "nao-comecou");
  assert.equal(estadoDaAula("curta", progresso({ tentativas: 3 })), "praticando");
  assert.equal(estadoDaAula("curta", noDegrau(1)), "praticando", "um degrau ainda é praticar");
  assert.equal(estadoDaAula("curta", noDegrau(3)), "aprendida");
  // Leitura não tem tentativa jogada: ou foi marcada, ou não começou.
  assert.equal(estadoDaAula("leitura", AULA_ZERADA), "nao-comecou");
  assert.equal(estadoDaAula("leitura", progresso({ lida: true })), "aprendida");
});

/* ------------------------------------------------------------------ *
 * As contas que o painel e a tarefa fazem
 * ------------------------------------------------------------------ */

test("aprendidasDaTrilha conta só entre as aulas dadas", () => {
  const abertas = aulasAbertas(new Set(["N0-Q-MATE", "N0-R-MATE"]));
  const mapa = new Map<string, ProgressoDaAula>([
    ["N0-R-MATE", noDegrau(3)],
    // Aprendida num rascunho que não está aberto: não pode virar "1 de 0".
    ["N1-KEY-SQUARES", noDegrau(3)],
  ]);
  assert.deepEqual([...aprendidasDaTrilha(abertas, mapa)], ["N0-R-MATE"]);
});

test("a próxima aula é a primeira aberta que falta, na ordem da trilha", () => {
  const abertas = aulasAbertas(new Set(["N0-Q-MATE", "N0-R-MATE"]));
  const mapa = new Map<string, ProgressoDaAula>([["N0-Q-MATE", noDegrau(3)]]);
  assert.equal(proximaAula(abertas, mapa)?.id, "N0-R-MATE");

  // Uma vitória não basta: a aula continua sendo a próxima até o degrau 3.
  mapa.set("N0-R-MATE", noDegrau(1));
  assert.equal(proximaAula(abertas, mapa)?.id, "N0-R-MATE");

  mapa.set("N0-R-MATE", noDegrau(3));
  assert.equal(proximaAula(abertas, mapa), undefined);
});
