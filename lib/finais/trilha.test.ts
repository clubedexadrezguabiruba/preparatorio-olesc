import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { lessonSchema } from "../lesson/schema.ts";
import {
  aulaDaTrilha,
  aulasAbertas,
  AULA_ZERADA,
  CLASSES,
  dominadas,
  dominou,
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
 * isso que `dominou` recebe o formato em vez de perguntá-lo ao Supabase.
 */

function progresso(parcial: Partial<ProgressoDaAula>): ProgressoDaAula {
  return { ...AULA_ZERADA, ...parcial };
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

test("o sábado de uma aula nunca é anterior ao de uma aula anterior da mesma classe", () => {
  // Não é regra de xadrez: é o pré-requisito. Abrir a casa-chave antes da
  // oposição deixaria o aluno numa aula que pressupõe a que ele não tem.
  for (const classe of CLASSES) {
    const daClasse = TRILHA.filter((a) => a.classe === classe);
    for (let i = 1; i < daClasse.length; i += 1) {
      const antes = daClasse.slice(0, i).map((a) => a.sabado);
      assert.ok(
        daClasse[i].sabado >= Math.min(...antes),
        `${daClasse[i].id} abre antes de uma aula anterior da classe ${classe}`,
      );
    }
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

test("aula aberta é a que está na trilha, publicada, e cujo sábado já chegou", () => {
  const publicadas = new Set(["N0-R-MATE", "N1-SQUARE", "N9-FORA-DA-TRILHA"]);

  // Semana 1: só as duas aulas prontas abrem, e só uma delas está publicada.
  assert.deepEqual(
    aulasAbertas(publicadas, 1).map((a) => a.id),
    ["N0-R-MATE"],
  );

  // Semana 2 traz `N1-SQUARE`; o arquivo fora da trilha não entra em semana
  // nenhuma, porque publicar não é o mesmo que fazer parte do curso.
  assert.deepEqual(
    aulasAbertas(publicadas, 2).map((a) => a.id),
    ["N0-R-MATE", "N1-SQUARE"],
  );
});

test("aula na trilha e não publicada continua fechada", () => {
  assert.deepEqual(aulasAbertas(new Set(), 4), []);
});

/* ------------------------------------------------------------------ *
 * Os três critérios de domínio
 * ------------------------------------------------------------------ */

test("aula completa exige as duas metades", () => {
  assert.equal(dominou("completa", progresso({ soloOk: true })), false);
  assert.equal(dominou("completa", progresso({ praticaOk: true })), false);
  assert.equal(dominou("completa", progresso({ soloOk: true, praticaOk: true })), true);
});

test("aula curta exige só a prática, e a etapa sem ajuda não a substitui", () => {
  assert.equal(dominou("curta", progresso({ praticaOk: true })), true);
  assert.equal(dominou("curta", progresso({ soloOk: true })), false);
});

test("aula de leitura é declaração, e tentativa jogada não a fecha", () => {
  assert.equal(dominou("leitura", progresso({ lida: true })), true);
  assert.equal(dominou("leitura", progresso({ soloOk: true, praticaOk: true })), false);
});

test("as duas metades contam mesmo em sessões diferentes", () => {
  // É a diferença deliberada para o selo da tela (`masteryReport`), que cobra a
  // mesma sessão: aqui o banco lembra, e o 4G da criança não custa a etapa 4.
  assert.equal(dominou("completa", progresso({ soloOk: true, praticaOk: true })), true);
});

test("o estado da aula sai do formato e das tentativas", () => {
  assert.equal(estadoDaAula("curta", AULA_ZERADA), "nao-comecou");
  assert.equal(estadoDaAula("curta", progresso({ tentativas: 3 })), "praticando");
  assert.equal(estadoDaAula("curta", progresso({ tentativas: 3, praticaOk: true })), "dominada");
  // Leitura não tem tentativa jogada: ou foi marcada, ou não começou.
  assert.equal(estadoDaAula("leitura", AULA_ZERADA), "nao-comecou");
  assert.equal(estadoDaAula("leitura", progresso({ lida: true })), "dominada");
});

/* ------------------------------------------------------------------ *
 * As contas que o painel e a tarefa fazem
 * ------------------------------------------------------------------ */

test("dominadas conta só entre as aulas dadas", () => {
  const abertas = aulasAbertas(new Set(["N0-Q-MATE", "N0-R-MATE"]), 1);
  const mapa = new Map<string, ProgressoDaAula>([
    ["N0-R-MATE", progresso({ soloOk: true, praticaOk: true })],
    // Dominada num rascunho que não está aberto: não pode virar "1 de 0".
    ["N1-KEY-SQUARES", progresso({ praticaOk: true })],
  ]);
  assert.deepEqual([...dominadas(abertas, mapa)], ["N0-R-MATE"]);
});

test("a próxima aula é a primeira aberta que falta, na ordem da trilha", () => {
  const abertas = aulasAbertas(new Set(["N0-Q-MATE", "N0-R-MATE"]), 1);
  const mapa = new Map<string, ProgressoDaAula>([
    ["N0-Q-MATE", progresso({ soloOk: true, praticaOk: true })],
  ]);
  assert.equal(proximaAula(abertas, mapa)?.id, "N0-R-MATE");

  mapa.set("N0-R-MATE", progresso({ soloOk: true, praticaOk: true }));
  assert.equal(proximaAula(abertas, mapa), undefined);
});
