import assert from "node:assert/strict";
import test from "node:test";
import { temasDoNivel } from "../curso/nivel.ts";
import { TEMAS } from "./blocos.ts";
import { estadoDosTemas, ordemDosTemas, temaLiberado } from "./ordem.ts";
import { METAS, type Feitos } from "./serie.ts";

const FECHADO: Feitos = { aquecimento: METAS.aquecimento, serie: METAS.serie, prova: METAS.prova };
const PELA_METADE: Feitos = { aquecimento: METAS.aquecimento, serie: 3, prova: 0 };
const todos = () => true;

test("a corrente segue a página: nível por nível, sem tema em teste", () => {
  const ordem = ordemDosTemas(todos);
  assert.deepEqual(ordem.slice(0, 3), [...temasDoNivel(1)]);
  assert.deepEqual(ordem.slice(3, 3 + temasDoNivel(2).length), [...temasDoNivel(2)]);
  assert.ok(!ordem.includes("desperado"), "tema em teste fica fora da corrente");
  assert.equal(ordem.length, TEMAS.filter((t) => !t.emTeste).length);
});

test("tema sem texto fica fora da corrente e não segura o seguinte", () => {
  const ordem = ordemDosTemas((tag) => tag !== "mateIn2");
  assert.ok(!ordem.includes("mateIn2"));
  const feitos = new Map([["mateIn1", FECHADO]]);
  assert.equal(temaLiberado("hangingPiece", feitos, false, ordem), true);
});

test("só o primeiro abre; fechar um abre o próximo", () => {
  const ordem = ordemDosTemas(todos);
  const [primeiro, segundo, terceiro] = ordem;
  const nada = new Map<string, Feitos>();
  assert.equal(temaLiberado(primeiro, nada, false, ordem), true);
  assert.equal(temaLiberado(segundo, nada, false, ordem), false);

  const umFechado = new Map([[primeiro, FECHADO]]);
  assert.equal(temaLiberado(segundo, umFechado, false, ordem), true);
  assert.equal(temaLiberado(terceiro, umFechado, false, ordem), false);

  const pelaMetade = new Map([[primeiro, PELA_METADE]]);
  assert.equal(temaLiberado(segundo, pelaMetade, false, ordem), false, "meio tema não abre o seguinte");
});

test("a corrente cruza os níveis: o último tema do nível 1 abre o primeiro do 2", () => {
  const ordem = ordemDosTemas(todos);
  const feitos = new Map(temasDoNivel(1).map((t) => [t, FECHADO]));
  assert.equal(temaLiberado(temasDoNivel(2)[0], feitos, false, ordem), true);
});

test("o professor abre tudo", () => {
  const ordem = ordemDosTemas(todos);
  assert.equal(temaLiberado(ordem.at(-1)!, new Map(), true, ordem), true);
  const estados = estadoDosTemas(new Map(), true, ordem);
  assert.ok(![...estados.values()].includes("trancado"));
});

test("estados: concluído, agora, trancado", () => {
  const ordem = ordemDosTemas(todos);
  const feitos = new Map([[ordem[0], FECHADO], [ordem[1], PELA_METADE]]);
  const estados = estadoDosTemas(feitos, false, ordem);
  assert.equal(estados.get(ordem[0]), "concluido");
  assert.equal(estados.get(ordem[1]), "agora");
  assert.equal(estados.get(ordem[2]), "trancado");
  assert.equal([...estados.values()].filter((e) => e === "agora").length, 1);
  assert.equal(estados.has("desperado"), false);
});
