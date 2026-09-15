import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonSchema } from "../lesson/schema.ts";
import { depoisDaPassada, juntarEscadas, vencida, zerada } from "./escada.ts";
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
  type ProgressoDaAula,
} from "./trilha.ts";
// Os cinco níveis moram no eixo, e não na trilha: ver o cabeçalho de trilha.ts.
import { NIVEIS, NIVEL } from "../curso/nivel.ts";

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

/**
 * Os dois valores que `aprendeu` recebe hoje. Eram os três formatos da trilha;
 * viraram uma pergunta só — **a aula tem prática?** —, respondida pelo arquivo
 * da aula (`aulasComPratica` em `lib/finais/conteudo.ts`).
 */
const COM_PRATICA = true;
const SEM_PRATICA = false;
/** Nas contas do painel, toda aula do recorte tem prática. */
const TODAS_COM_PRATICA = new Set(TRILHA.map((a) => a.id));

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

test("as classes vêm em blocos, de E para B", () => {
  // O tamanho de cada classe deixou de ser cobrado em 2026-09-15, junto com o dos
  // níveis (trava 16 de docs/TRILHA-FINAIS.md). O que fica é a ordem.
  const posicao = (a: AulaDaTrilha) => CLASSES.indexOf(a.classe);
  for (let i = 1; i < TRILHA.length; i += 1) {
    assert.ok(posicao(TRILHA[i]) >= posicao(TRILHA[i - 1]), `a aula ${TRILHA[i].id} sai da ordem`);
  }
});

test("toda aula declara um nível de 1 a 5, e a lista anda em ordem de nível", () => {
  // Trava 16, 2026-09-15: os níveis não têm mais tamanho fixo nem corte por ordem
  // (saíram nivelDaOrdem, os tamanhos 6/6/6/16/15, a meta de 18 e a ordem cravada
  // dos níveis 1 e 3). Cada aula declara o próprio nível; o que continua sendo regra
  // é o pré-requisito — o nível nunca "volta" na lista.
  for (const aula of TRILHA) {
    assert.ok(NIVEIS.includes(aula.nivel), `${aula.id} tem nível ${aula.nivel}`);
  }
  for (let i = 1; i < TRILHA.length; i += 1) {
    assert.ok(TRILHA[i].nivel >= TRILHA[i - 1].nivel, `a aula ${TRILHA[i].id} sai da ordem`);
  }
});

test("todo nível tem cabeçalho em NIVEL, e nenhum sobra", () => {
  assert.deepEqual(Object.keys(NIVEL).map(Number), [...NIVEIS]);
});

/**
 * **Toda aula publicada está na trilha.**
 *
 * Até 2026-09-15 este caso cobrava também as quatro etapas, ou a ausência declarada em
 * `etapasAusentes`. A trava caiu (trava 8 de `docs/TRILHA-FINAIS.md`): a aula publica com
 * as etapas que tiver. Ele continua lendo `content/lessons/` de verdade.
 */
test("toda aula publicada em content/lessons está na trilha", () => {
  const pasta = path.join(process.cwd(), "content/lessons");
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".json"));
  assert.ok(arquivos.length > 0, "o corpus não pode estar vazio");

  const daTrilha = new Set(TRILHA.map((a) => a.id));
  let publicadas = 0;
  for (const arquivo of arquivos) {
    const aula = lessonSchema.parse(JSON.parse(readFileSync(path.join(pasta, arquivo), "utf8")));
    if (aula.status !== "published") continue;
    assert.ok(daTrilha.has(aula.id), `${aula.id} está publicada e não está na trilha`);
    publicadas += 1;
  }
  assert.ok(publicadas > 0, "nenhuma aula publicada — o caso ficaria sem sujeito");
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
  assert.equal(aulaDaTrilha("N0-R-MATE")?.ordem, 4);
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
  assert.equal(aprendeu(COM_PRATICA, noDegrau(1)), false);
  assert.equal(aprendeu(COM_PRATICA, noDegrau(2)), false);
  assert.equal(aprendeu(COM_PRATICA, noDegrau(3)), true);
});

test("`praticaOk` sozinho não aprende nada — ele é histórico, não critério", () => {
  // A coluna continua no banco com as linhas antigas dos alunos, e continua no
  // tipo. O que ela deixou de fazer é decidir.
  assert.equal(aprendeu(COM_PRATICA, progresso({ praticaOk: true })), false);
  assert.equal(aprendeu(COM_PRATICA, progresso({ soloOk: true, praticaOk: true })), false);
});

test("a aula perde posto sem desaprender", () => {
  // Perder depois de aprendida derruba dois degraus com piso no 1, e a data de
  // `aprendidaEm` fica. A aula volta como revisão curta, não como recomeço.
  const caiu = progresso({
    escada: depoisDaPassada(noDegrau(3).escada, false, "2026-10-20T14:00:00.000Z"),
  });
  assert.equal(caiu.escada.degrau, 1);
  assert.equal(aprendeu(COM_PRATICA, caiu), true);
});

test("aula sem prática fica fora da escada: ela é declaração", () => {
  assert.equal(aprendeu(SEM_PRATICA, progresso({ lida: true })), true);
  // E nem o degrau 3 a fecha: não há partida numa aula sem prática, e um degrau
  // ali seria sinal de que alguma outra coisa gravou no lugar errado.
  assert.equal(aprendeu(SEM_PRATICA, noDegrau(3)), false);
});

/* ------------------------------------------------------------------ *
 * Várias práticas (trava 9 de docs/TRILHA-FINAIS.md, 15/9/2026)
 * ------------------------------------------------------------------ */

const DIAS = ["2026-09-05T14:00:00.000Z", "2026-09-07T14:00:00.000Z", "2026-09-12T14:00:00.000Z"];
/** Uma escada vencida `n` vezes em dias distintos. */
function vencidaVezes(n: number) {
  let escada = zerada();
  for (let d = 0; d < n; d++) escada = depoisDaPassada(escada, true, DIAS[d]);
  return escada;
}
/** A aula com as escadas das práticas juntadas, como `lib/finais/progresso.ts` entrega. */
function comPraticas(...escadas: ReturnType<typeof zerada>[]): ProgressoDaAula {
  const { escada, praticaParaRevisar } = juntarEscadas(escadas.map((e, i) => ({ id: `pratica-${i + 1}`, escada: e })));
  return progresso({ tentativas: escada.tentativas, escada, ...(praticaParaRevisar ? { praticaParaRevisar } : {}) });
}

test("duas práticas: vencer só uma três vezes não torna a aula aprendida", () => {
  assert.equal(aprendeu(COM_PRATICA, comPraticas(vencidaVezes(3), zerada())), false);
  assert.equal(aprendeu(COM_PRATICA, comPraticas(vencidaVezes(3), vencidaVezes(2))), false);
});

test("duas práticas: vencer as duas três vezes torna a aula aprendida", () => {
  assert.equal(aprendeu(COM_PRATICA, comPraticas(vencidaVezes(3), vencidaVezes(3))), true);
  assert.equal(estadoDaAula(COM_PRATICA, comPraticas(vencidaVezes(3), vencidaVezes(3))), "aprendida");
});

test("uma prática só continua exatamente como era", () => {
  const unica = vencidaVezes(2);
  const { escada, praticaParaRevisar } = juntarEscadas([{ id: "pratica-unica", escada: unica }]);
  assert.deepEqual(escada, unica);
  assert.equal(praticaParaRevisar, null, "o cartão abre a prática da aula, sem parâmetro a mais");
});

test("duas práticas: a revisão vence quando qualquer uma vence, e diz qual", () => {
  const cedo = depoisDaPassada(zerada(), true, "2026-09-05T14:00:00.000Z");
  const tarde = depoisDaPassada(zerada(), true, "2026-09-10T14:00:00.000Z");
  const aula = comPraticas(tarde, cedo);
  assert.equal(aula.praticaParaRevisar, "pratica-2");
  assert.equal(aula.escada.revisarEm, cedo.revisarEm);
  assert.equal(vencida(aula.escada, "2026-09-07T12:00:00.000Z"), true, "a prática 2 venceu, e a aula entra na fila");
  // A que nunca foi jogada não segura a revisão da outra.
  const comUmaNova = comPraticas(zerada(), cedo);
  assert.equal(vencida(comUmaNova.escada, "2026-09-07T12:00:00.000Z"), true);
  assert.equal(comUmaNova.praticaParaRevisar, "pratica-2");
});

test("o estado da aula sai da prática, das tentativas e da escada", () => {
  assert.equal(estadoDaAula(COM_PRATICA, AULA_ZERADA), "nao-comecou");
  assert.equal(estadoDaAula(COM_PRATICA, progresso({ tentativas: 3 })), "praticando");
  assert.equal(estadoDaAula(COM_PRATICA, noDegrau(1)), "praticando", "um degrau ainda é praticar");
  assert.equal(estadoDaAula(COM_PRATICA, noDegrau(3)), "aprendida");
  // Aula sem prática não tem tentativa jogada: ou foi marcada, ou não começou.
  assert.equal(estadoDaAula(SEM_PRATICA, AULA_ZERADA), "nao-comecou");
  assert.equal(estadoDaAula(SEM_PRATICA, progresso({ lida: true })), "aprendida");
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
  assert.deepEqual([...aprendidasDaTrilha(abertas, mapa, TODAS_COM_PRATICA)], ["N0-R-MATE"]);
});

test("a próxima aula é a primeira aberta que falta, na ordem da trilha", () => {
  const abertas = aulasAbertas(new Set(["N0-Q-MATE", "N0-R-MATE"]));
  const mapa = new Map<string, ProgressoDaAula>([["N0-Q-MATE", noDegrau(3)]]);
  assert.equal(proximaAula(abertas, mapa, TODAS_COM_PRATICA)?.id, "N0-R-MATE");

  // Uma vitória não basta: a aula continua sendo a próxima até o degrau 3.
  mapa.set("N0-R-MATE", noDegrau(1));
  assert.equal(proximaAula(abertas, mapa, TODAS_COM_PRATICA)?.id, "N0-R-MATE");

  mapa.set("N0-R-MATE", noDegrau(3));
  assert.equal(proximaAula(abertas, mapa, TODAS_COM_PRATICA), undefined);
});
