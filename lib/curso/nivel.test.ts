import assert from "node:assert/strict";
import test from "node:test";
import { AULA_ZERADA, TRILHA, type ProgressoDaAula } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { METAS, type Feitos } from "../tatica/serie.ts";
import {
  aulasDoNivel,
  fechamentoDoNivel,
  LINHAS_POR_NIVEL,
  NIVEIS,
  NIVEL,
  nivelDoAluno,
  nivelDoTema,
  podeAbrir,
  PROVA_DE_NIVEL,
  prontoParaProva,
  proximoPasso,
  REVISAO_ANTES_DO_AVANCO,
  situacaoDoItem,
  temaFechado,
  temasDaProva,
  temasDoNivel,
  type Nivel,
  type ProgressoParaONivel,
} from "./nivel.ts";

/* ------------------------------------------------------------------ *
 * Andaimes
 * ------------------------------------------------------------------ */

const FECHADO: Feitos = { aquecimento: METAS.aquecimento, serie: METAS.serie, prova: METAS.prova };
const PELA_METADE: Feitos = { aquecimento: METAS.aquecimento, serie: METAS.serie - 1, prova: 0 };

/**
 * Uma aula aprendida pelos dois critérios ao mesmo tempo: `lida` para o formato
 * de leitura, e `aprendidaEm` para os outros dois — que é o que `aprendeu` lê,
 * e não o degrau. Assim o andaime serve a qualquer aula da trilha.
 */
const APRENDIDA: ProgressoDaAula = {
  ...AULA_ZERADA,
  lida: true,
  tentativas: 3,
  escada: { ...AULA_ZERADA.escada, degrau: 3, aprendidaEm: "2026-09-09T12:00:00.000Z" },
};

const VAZIO: ProgressoParaONivel = {
  temas: new Map(),
  finais: new Map(),
  publicadas: new Set(),
  linhasAprendidas: 0,
  baseCompleto: false,
};

/** Um progresso com todos os temas dos níveis 1..`ate` fechados. */
function comTaticaAte(ate: Nivel, base = VAZIO): ProgressoParaONivel {
  const temas = new Map(base.temas);
  for (const n of NIVEIS) {
    if (n > ate) break;
    for (const tag of temasDoNivel(n)) temas.set(tag, FECHADO);
  }
  return { ...base, temas };
}

/* ------------------------------------------------------------------ *
 * Cobertura: nada do currículo fica fora da escada
 * ------------------------------------------------------------------ */

test("todo bloco de tática cai num nível de 1 a 5", () => {
  for (const bloco of BLOCOS) {
    assert.ok(NIVEIS.includes(bloco.nivel), `o bloco ${bloco.id} está no nível ${bloco.nivel}`);
  }
});

test("toda aula de finais cai num nível de 1 a 5", () => {
  for (const aula of TRILHA) {
    assert.ok(NIVEIS.includes(aula.nivel), `${aula.id} está no nível ${aula.nivel}`);
  }
});

test("os 36 temas e as 49 aulas se repartem sem sobra e sem repetição", () => {
  // A conta que a escada anterior errava: ela punha os 36 temas todos no nível
  // 1, e ninguém percebia porque nenhum teste somava as partes de volta.
  const temas = NIVEIS.flatMap((n) => temasDoNivel(n));
  assert.equal(temas.length, 36);
  assert.equal(new Set(temas).size, 36, "algum tema caiu em dois níveis");

  const aulas = NIVEIS.flatMap((n) => aulasDoNivel(n).map((a) => a.id));
  assert.equal(aulas.length, 49);
  assert.equal(new Set(aulas).size, 49, "alguma aula caiu em dois níveis");
});

test("a escada tem a forma decidida: 3, 5, 5, 9 e 14 temas", () => {
  assert.deepEqual(
    NIVEIS.map((n) => temasDoNivel(n).length),
    [3, 5, 5, 9, 14],
  );
});

test("o nível 2 é o das táticas fundamentais, na frente dos padrões de mate", () => {
  // A inversão B4 → nível 2. Se alguém devolver B2 para o nível 2 sem discutir,
  // este teste é o que pergunta por quê.
  assert.ok(temasDoNivel(2).includes("fork"), "garfo tem de estar no nível 2");
  assert.ok(temasDoNivel(2).includes("pin"), "cravada tem de estar no nível 2");
  assert.ok(!temasDoNivel(2).includes("backRankMate"), "o mate do corredor não é do nível 2");
});

test("as aulas de finais são cortadas pela ordem, e a ordem não se cruza", () => {
  for (const n of NIVEIS) {
    const ordens = aulasDoNivel(n).map((a) => a.ordem);
    const maiorAqui = Math.max(...ordens);
    for (const m of NIVEIS) {
      if (m <= n) continue;
      const menorLa = Math.min(...aulasDoNivel(m).map((a) => a.ordem));
      assert.ok(maiorAqui < menorLa, `o nível ${n} passa por cima do ${m}`);
    }
  }
});

test("`nivelDoTema` acha as 36 tags e recusa o que não é do currículo", () => {
  for (const bloco of BLOCOS) {
    for (const tema of bloco.temas) assert.equal(nivelDoTema(tema.tag), bloco.nivel);
  }
  assert.equal(nivelDoTema("queensideAttack"), undefined);
});

/* ------------------------------------------------------------------ *
 * `temaFechado`
 * ------------------------------------------------------------------ */

test("um tema fecha quando as três etapas acabam, e não antes", () => {
  assert.equal(temaFechado(FECHADO), true);
  assert.equal(temaFechado(PELA_METADE), false);
  assert.equal(temaFechado(undefined), false, "tema nunca aberto não está fechado");
});

test("um tema com muito puzzle e a prova incompleta continua aberto", () => {
  // A revisão e a prova gravam no mesmo tema, então o contador passa da meta
  // sem o aluno ter feito a etapa. Fechar é etapa a etapa, não pelo total.
  const demais: Feitos = { aquecimento: 99, serie: 99, prova: METAS.prova - 1 };
  assert.equal(temaFechado(demais), false);
});

/* ------------------------------------------------------------------ *
 * `fechamentoDoNivel`
 * ------------------------------------------------------------------ */

test("com o disco vazio, o requisito de finais é zero — e os quatro números dizem isso", () => {
  // Sem o clamp o nível 1 seria incompletável: zero aulas dele existem hoje.
  const f = fechamentoDoNivel(1, VAZIO);
  assert.equal(f.finais.publicadas, 0);
  assert.equal(f.finais.declaradas, NIVEL[1].aulasParaFechar);
  assert.equal(f.finais.exigidas, 0, "o clamp tem de zerar o requisito");
  assert.equal(f.finais.feitos, 0);
});

test("o clamp segue o publicado até bater no declarado, e para lá", () => {
  const doNivel4 = aulasDoNivel(4).map((a) => a.id);
  const declaradas = NIVEL[4].aulasParaFechar;

  const duas = fechamentoDoNivel(4, { ...VAZIO, publicadas: new Set(doNivel4.slice(0, 2)) });
  assert.equal(duas.finais.exigidas, 2);

  const todas = fechamentoDoNivel(4, { ...VAZIO, publicadas: new Set(doNivel4) });
  assert.equal(todas.finais.publicadas, 16);
  assert.equal(todas.finais.exigidas, declaradas, "publicar 16 não faz o nível pedir 16");
});

test("o repertório é acumulado: o nível 3 pede 12, e não 4", () => {
  for (const n of [1, 2, 3, 4] as const) {
    assert.equal(fechamentoDoNivel(n, VAZIO).repertorio.exigidas, LINHAS_POR_NIVEL * n);
  }
});

test("o nível 5 cobra o Base inteiro, e não o número 20", () => {
  // Os dois valem o mesmo hoje. O teste existe para o dia em que o Base mudar
  // de tamanho: aí o número mente e a função não.
  const comMuitasLinhas = { ...comTaticaAte(5), linhasAprendidas: 999, baseCompleto: false };
  assert.equal(fechamentoDoNivel(5, comMuitasLinhas).fechado, false, "999 linhas não substituem o Base");

  const comOBase = { ...comMuitasLinhas, baseCompleto: true };
  assert.equal(fechamentoDoNivel(5, comOBase).fechado, true);
});

test("o nível só fecha quando as três trilhas fecham", () => {
  const soTatica = comTaticaAte(1);
  assert.equal(fechamentoDoNivel(1, soTatica).fechado, false, "falta o repertório");

  const comTudo = { ...soTatica, linhasAprendidas: LINHAS_POR_NIVEL };
  assert.equal(fechamentoDoNivel(1, comTudo).fechado, true);
});

test("o requisito de finais é cobrado quando há aula publicada", () => {
  const aula = aulasDoNivel(1)[0];
  const base = { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL };

  const publicada = { ...base, publicadas: new Set([aula.id]) };
  assert.equal(fechamentoDoNivel(1, publicada).fechado, false, "1 aula publicada e 0 aprendidas");

  const aprendida = { ...publicada, finais: new Map([[aula.id, APRENDIDA]]) };
  assert.equal(fechamentoDoNivel(1, aprendida).fechado, true);
});

/* ------------------------------------------------------------------ *
 * `prontoParaProva` e `nivelDoAluno`
 * ------------------------------------------------------------------ */

test("sem nada fechado, nenhuma prova é ofertada", () => {
  assert.equal(prontoParaProva(VAZIO), 0);
});

test("a progressão é sequencial: fechar o 2 sem o 1 não abre prova nenhuma", () => {
  const temas = new Map<string, Feitos>();
  for (const tag of temasDoNivel(2)) temas.set(tag, FECHADO);
  const pulou = { ...VAZIO, temas, linhasAprendidas: 99 };
  assert.equal(prontoParaProva(pulou), 0, "o nível 1 não fechou");
});

test("`prontoParaProva` é monótono conforme o aluno fecha degrau a degrau", () => {
  let anterior = 0;
  for (const n of NIVEIS) {
    const p = { ...comTaticaAte(n), linhasAprendidas: LINHAS_POR_NIVEL * n, baseCompleto: n >= 5 };
    const pronto = prontoParaProva(p);
    assert.ok(pronto >= anterior, `o nível ${n} baixou de ${anterior} para ${pronto}`);
    assert.equal(pronto, n, `fechadas as três trilhas até o ${n}, a prova ofertada é a do ${n}`);
    anterior = pronto;
  }
});

test("publicar uma aula nova pode fechar a prova — e é por isso que o nível é gravado", () => {
  // A prova disto está aqui, e não no banco: `prontoParaProva` **cai** quando
  // uma aula do nível é publicada. Se o nível conquistado fosse derivado desta
  // função, publicar rebaixaria quem já passou.
  const p = { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL };
  assert.equal(prontoParaProva(p), 1);

  const depoisDePublicar = { ...p, publicadas: new Set([aulasDoNivel(1)[0].id]) };
  assert.equal(prontoParaProva(depoisDePublicar), 0, "o requisito subiu de 0 para 1");

  // E o aluno que já conquistou não desce: `nivelDoAluno` lê o log, não isto.
  assert.equal(nivelDoAluno(1), 2);
});

test("`nivelDoAluno` é o degrau seguinte ao conquistado, e para no 5", () => {
  assert.equal(nivelDoAluno(0), 1);
  assert.equal(nivelDoAluno(1), 2);
  assert.equal(nivelDoAluno(4), 5);
  assert.equal(nivelDoAluno(5), 5, "quem conquistou o 5 fica no 5");
});

/* ------------------------------------------------------------------ *
 * A trava mole
 * ------------------------------------------------------------------ */

test("nível antes de texto: um item adiante não anuncia que está em escrita", () => {
  assert.equal(situacaoDoItem(5, 1, false), "adiante");
  assert.equal(situacaoDoItem(5, 1, true), "adiante");
  assert.equal(situacaoDoItem(1, 1, false), "em-escrita");
  assert.equal(situacaoDoItem(1, 3, true), "aberto", "o que ficou para trás continua aberto");
});

test("a trava é mole: `adiante` continua clicável", () => {
  assert.equal(podeAbrir("aberto"), true);
  assert.equal(podeAbrir("adiante"), true, "endurecer é mudar TRANCA_DURA, não este teste");
  assert.equal(podeAbrir("em-escrita"), false, "não há o que abrir num item que não existe");
});

/* ------------------------------------------------------------------ *
 * `proximoPasso`
 * ------------------------------------------------------------------ */

test("a fila vencida passa na frente, e só acima do limite", () => {
  const noLimite = proximoPasso(1, VAZIO, REVISAO_ANTES_DO_AVANCO);
  assert.equal(noLimite.tipo, "tema", "no limite exato a fila ainda não interrompe");

  const acima = proximoPasso(1, VAZIO, REVISAO_ANTES_DO_AVANCO + 1);
  assert.deepEqual(acima, { tipo: "revisao", vencidos: REVISAO_ANTES_DO_AVANCO + 1 });
});

test("com o nível zerado, o passo é o primeiro tema dele", () => {
  const passo = proximoPasso(1, VAZIO, 0);
  assert.equal(passo.tipo, "tema");
  assert.equal(passo.tipo === "tema" && passo.tag, temasDoNivel(1)[0]);
  assert.equal(passo.tipo === "tema" && passo.href, `/tatica/${temasDoNivel(1)[0]}`);
});

test("fechada a tática, o passo vira a aula publicada que falta", () => {
  const aula = aulasDoNivel(1)[0];
  const p = { ...comTaticaAte(1), publicadas: new Set([aula.id]) };
  const passo = proximoPasso(1, p, 0);
  assert.equal(passo.tipo, "aula");
  assert.equal(passo.tipo === "aula" && passo.id, aula.id);
});

test("fechados tática e finais, o passo vira as linhas que faltam", () => {
  const p = { ...comTaticaAte(1), linhasAprendidas: 1 };
  assert.deepEqual(proximoPasso(1, p, 0), { tipo: "linha", faltam: LINHAS_POR_NIVEL - 1 });
});

test("a prova é a última coisa do nível, e só depois das três trilhas", () => {
  const p = { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL };
  assert.deepEqual(proximoPasso(1, p, 0, 0), { tipo: "prova-de-nivel", nivel: 1 });
});

test("quem já passou na prova do nível não é mandado fazê-la de novo", () => {
  const p = { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL };
  assert.deepEqual(proximoPasso(1, p, 0, 1), { tipo: "nivel-fechado" });
});

test("o aluno que fechou tudo e conquistou o 5 não recebe alvo nenhum", () => {
  const p = { ...comTaticaAte(5), linhasAprendidas: 20, baseCompleto: true };
  assert.deepEqual(proximoPasso(5, p, 0, 5), { tipo: "nivel-fechado" });
});

/* ------------------------------------------------------------------ *
 * A prova de nível
 * ------------------------------------------------------------------ */

test("a prova sorteia do nível e de todos os anteriores, sem repetir tema", () => {
  // Os anteriores entram porque o degrau 3 não pode deixar o aluno esquecer o
  // mate em 1 do degrau 1. E sortear só do degrau de cima entregaria metade da
  // resposta antes de ele olhar o tabuleiro — a prova é a única medida do site
  // que não diz o tema.
  assert.deepEqual(temasDaProva(1), [...temasDoNivel(1)]);

  const doTres = temasDaProva(3);
  assert.equal(doTres.length, 3 + 5 + 5);
  assert.equal(new Set(doTres).size, doTres.length, "algum tema entrou duas vezes");
  for (const tag of temasDoNivel(1)) assert.ok(doTres.includes(tag), `${tag} ficou de fora`);

  assert.equal(temasDaProva(5).length, 36, "a prova do nível 5 alcança o currículo inteiro");
});

test("a prova de um nível contém a do nível abaixo, inteira", () => {
  // A propriedade que garante que a escada não abre buraco: subir de degrau
  // nunca tira um tema do sorteio.
  for (const n of NIVEIS) {
    if (n === 1) continue;
    const abaixo = new Set(temasDaProva((n - 1) as Nivel));
    for (const tag of abaixo) {
      assert.ok(temasDaProva(n).includes(tag), `o nível ${n} perdeu ${tag}`);
    }
  }
});

test("passar é 9 de 12, e o número está num lugar só", () => {
  assert.equal(PROVA_DE_NIVEL.puzzles, 12);
  assert.equal(PROVA_DE_NIVEL.paraPassar, 9);
  assert.ok(PROVA_DE_NIVEL.paraPassar <= PROVA_DE_NIVEL.puzzles);
});
