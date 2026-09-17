/**
 * O grau de cada item (feedback do aluno, 17/9/2026): Novato · Aprendiz · Intermediário · Experiente
 * · Especialista · Mestre. Na escada (linha e aula de finais) é o degrau **atual**; na tática, os
 * acertos pesados pela dificuldade, com o topo exigindo acerto recente — e caindo quando ele piora.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  grauDaAulaDeAbertura,
  grauDaAulaDeFinais,
  grauDaEscada,
  grauDoTema,
  medidaDoTema,
  NOME_DO_GRAU,
  pesoDoPuzzle,
  REGUA_DA_TATICA,
  subiuPara,
  type TentativaDoTema,
} from "./grau.ts";

test("os seis nomes, na ordem", () => {
  assert.deepEqual(Object.values(NOME_DO_GRAU), ["Novato", "Aprendiz", "Intermediário", "Experiente", "Especialista", "Mestre"]);
});

test("escada: o grau é o degrau atual — sobe acertando, desce errando", () => {
  assert.equal(grauDaEscada(null), 0, "nunca treinada é Novato");
  assert.equal(grauDaEscada({ degrau: 0 }), 0);
  assert.equal(grauDaEscada({ degrau: 1 }), 1);
  assert.equal(grauDaEscada({ degrau: 3 }), 3, "aprendida é Experiente");
  assert.equal(grauDaEscada({ degrau: 5 }), 5);
  // A linha de degrau 4 errada cai dois degraus (`QUEDA_POR_ERRO`): o grau acompanha.
  assert.equal(grauDaEscada({ degrau: 2 }), 2, "Especialista que errou volta a Intermediário");
  assert.equal(grauDaEscada({ degrau: 9 }), 5, "nunca passa de Mestre");
});

test("aula de abertura: o menor grau das linhas dela", () => {
  assert.equal(grauDaAulaDeAbertura([3, 1, 4]), 1);
  assert.equal(grauDaAulaDeAbertura([]), 0);
});

test("aula de finais: com prática é o degrau da escada; sem prática, assistida até o fim é Experiente", () => {
  assert.equal(grauDaAulaDeFinais(true, { escada: { degrau: 2 }, lida: true }), 2);
  assert.equal(grauDaAulaDeFinais(true, { escada: { degrau: 0 }, lida: true }), 0, "lida não substitui a prática");
  assert.equal(grauDaAulaDeFinais(false, { escada: { degrau: 0 }, lida: true }), 3);
  assert.equal(grauDaAulaDeFinais(false, { escada: { degrau: 0 }, lida: false }), 0);
});

test("o subiu só fala quando subiu", () => {
  assert.equal(subiuPara(1, 2), 2);
  assert.equal(subiuPara(2, 2), null);
  assert.equal(subiuPara(3, 1), null);
});

// ------------------------------------------------------------------ tática

const DIFICIL = 1600;
let relogio = Date.parse("2026-09-01T12:00:00Z");
function tentativas(n: number, acertou: (i: number) => boolean, rating: number | null = 1200): TentativaDoTema[] {
  return Array.from({ length: n }, (_, i) => ({ acertou: acertou(i), rating, criadaEm: new Date((relogio += 60_000)).toISOString() }));
}
const sempre = () => true;
const nunca = () => false;

test("o peso é a dificuldade: 1500 vale 1,5; sem rating vale 1", () => {
  assert.equal(pesoDoPuzzle(1500), 1.5);
  assert.equal(pesoDoPuzzle(null), 1);
  assert.equal(pesoDoPuzzle(300), REGUA_DA_TATICA.pesoMinimo, "piso");
});

test("tática: sem tentativa é Novato; poucos acertos fáceis dão Aprendiz; meio tema dá Intermediário", () => {
  assert.equal(grauDoTema([], { dificil: DIFICIL }), 0);
  assert.equal(grauDoTema(tentativas(3, sempre, 1000), { dificil: DIFICIL }), 1);
  assert.equal(grauDoTema(tentativas(14, sempre, 1100), { dificil: DIFICIL }), 2);
});

test("tática: errar não dá ponto — mil erros continuam Novato", () => {
  assert.equal(grauDoTema(tentativas(1000, nunca, 2000), { dificil: DIFICIL }), 0);
});

test("tática: a mesma quantidade de acertos em puzzles difíceis vale mais", () => {
  const faceis = medidaDoTema(tentativas(20, sempre, 900), { dificil: DIFICIL });
  const dificeis = medidaDoTema(tentativas(20, sempre, 1800), { dificil: DIFICIL });
  assert.ok(dificeis.pontos > faceis.pontos);
  assert.equal(grauDoTema(tentativas(20, sempre, 900), { dificil: DIFICIL }), 2);
  assert.equal(grauDoTema(tentativas(20, sempre, 1800), { dificil: DIFICIL }), 3, "20 acertos de 1800 já são o tema inteiro");
});

test("tática: Especialista exige acerto recente alto e puzzles difíceis, e cai quando a janela piora", () => {
  const bom = tentativas(60, (i) => i % 10 !== 0, 1700); // 90% de acerto, 54 acertos difíceis
  assert.equal(grauDoTema(bom, { dificil: DIFICIL }), 4, "90% nos últimos 30 e muitos difíceis: Especialista");

  // Os mesmos pontos, mas sem puzzle difícil nenhum: para em Experiente.
  const semDificil = tentativas(80, (i) => i % 10 !== 0, 1000);
  assert.equal(grauDoTema(semDificil, { dificil: DIFICIL }), 3);

  // Depois, 15 erros seguidos: a janela dos últimos 30 cai para 50%, e o grau desce.
  const piorou = [...bom, ...tentativas(15, nunca, 1700)];
  const medida = medidaDoTema(piorou, { dificil: DIFICIL });
  assert.ok(medida.pontos >= REGUA_DA_TATICA.graus[4].pontos, "os pontos não diminuem");
  assert.equal(grauDoTema(piorou, { dificil: DIFICIL }), 2, "50% recente derruba abaixo de Experiente");

  // E volta a subir quando ele acerta de novo.
  const recuperou = [...piorou, ...tentativas(30, sempre, 1700)];
  assert.equal(grauDoTema(recuperou, { dificil: DIFICIL }), 5, "30 acertos seguidos e 80 difíceis: Mestre");
});

test("tática: Mestre exige 90% nos últimos 30 — 85% fica em Especialista", () => {
  const muito = tentativas(200, (i) => i % 20 !== 0 && i % 20 !== 7 && i % 20 !== 13, 1800); // 85%
  assert.equal(grauDoTema(muito, { dificil: DIFICIL }), 4);
});
