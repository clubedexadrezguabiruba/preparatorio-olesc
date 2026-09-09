import assert from "node:assert/strict";
import test from "node:test";
import { AULA_ZERADA, TRILHA } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { PUZZLES_POR_TEMA } from "../tatica/serie.ts";
import { contarAberto, montarMapa, MODULO, type ProgressoParaOMapa } from "./mapa.ts";
import { NIVEIS, vocEstaAqui } from "./trilha.ts";
import { depoisDaPassada, zerada } from "../finais/escada.ts";

/**
 * O mapa é a única tela que soma os módulos, e por isso a única em que um erro
 * de contagem passa despercebido: 36 temas de tática e 49 aulas de finais dão
 * 85 cartões, e ninguém confere 85 cartões a olho.
 *
 * Os testes de meio-jogo saíram em 2026-09-08, com o módulo — e com eles as 30
 * dicas que faziam a soma passar de cem.
 */

// A semana 4 é a última do preparatório: com ela, nenhum item fica "por-abrir"
// por data, e o que sobra fechado é só o que não tem texto. É a base certa para
// os testes que não são sobre calendário.
const VAZIO: ProgressoParaOMapa = {
  tatica: new Map(),
  temaAberto: () => true,
  finais: new Map(),
  aulasPublicadas: new Set(TRILHA.map((a) => a.id)),
  semana: 4,
};

const TEMAS = BLOCOS.flatMap((b) => b.temas);

function itens(mapa: ReturnType<typeof montarMapa>, modulo: string) {
  return [...mapa.values()].flatMap((ms) => ms.filter((m) => m.modulo === modulo)).flatMap((m) => m.itens);
}

test("o mapa carrega o curso inteiro, sem sobra e sem repetido", () => {
  const mapa = montarMapa(VAZIO);
  assert.equal(itens(mapa, "tatica").length, TEMAS.length);
  assert.equal(itens(mapa, "finais").length, TRILHA.length);
  for (const modulo of ["tatica", "finais"]) {
    const ids = itens(mapa, modulo).map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `${modulo}: item repetido no mapa`);
  }
});

test("os quatro níveis existem, mesmo os que ficarem vazios", () => {
  // Um buraco no meio da escada leria como erro de carregamento.
  const mapa = montarMapa(VAZIO);
  for (const nivel of NIVEIS) {
    assert.ok(mapa.has(nivel.id), `o nível ${nivel.id} sumiu do mapa`);
  }
});

test("os módulos vêm na ordem da rotina: tática e depois finais", () => {
  const mapa = montarMapa(VAZIO);
  for (const modulos of mapa.values()) {
    const nomes = modulos.map((m) => m.modulo);
    assert.deepEqual(nomes, [...nomes].sort(
      (a, b) =>
        ["tatica", "finais"].indexOf(a) - ["tatica", "finais"].indexOf(b),
    ));
  }
});

test("a barra da tática não passa de 100% quando a prova repete puzzle", () => {
  // A prova serve os errados de novo e a revisão grava no mesmo tema: o
  // contador passa de 24 sem o aluno ter feito nada a mais. A decisão da F2 foi
  // documentar em vez de filtrar — mas uma barra em 130% seria a documentação
  // chegando tarde demais.
  const mapa = montarMapa({
    ...VAZIO,
    tatica: new Map([[TEMAS[0].tag, PUZZLES_POR_TEMA + 12]]),
  });
  const item = itens(mapa, "tatica").find((i) => i.id === TEMAS[0].tag);
  assert.equal(item?.feitos, PUZZLES_POR_TEMA);
});

test("aula aprendida conta 1; uma vitória só ainda conta 0", () => {
  // **A segunda metade deste teste é a mudança de 2026-09-08.** `praticaOk`
  // sozinho valia 1 — era o critério antigo, "venceu uma vez, para sempre".
  // Hoje o mapa conta o degrau 3, e uma vitória põe a aula no degrau 1.
  const curta = TRILHA.find((a) => a.formato === "curta");
  assert.ok(curta, "a trilha precisa de pelo menos uma aula curta para este teste");

  const naoFeita = montarMapa(VAZIO);
  assert.equal(itens(naoFeita, "finais").find((i) => i.id === curta.id)?.feitos, 0);

  const umaVitoria = montarMapa({
    ...VAZIO,
    finais: new Map([
      [
        curta.id,
        {
          ...AULA_ZERADA,
          praticaOk: true,
          escada: depoisDaPassada(zerada(), true, "2026-09-05T14:00:00.000Z"),
        },
      ],
    ]),
  });
  assert.equal(itens(umaVitoria, "finais").find((i) => i.id === curta.id)?.feitos, 0);

  let escada = zerada();
  for (const dia of ["2026-09-05", "2026-09-07", "2026-09-12"]) {
    escada = depoisDaPassada(escada, true, `${dia}T14:00:00.000Z`);
  }
  const feita = montarMapa({
    ...VAZIO,
    finais: new Map([[curta.id, { ...AULA_ZERADA, praticaOk: true, escada }]]),
  });
  assert.equal(itens(feita, "finais").find((i) => i.id === curta.id)?.feitos, 1);
});

test("`contarAberto` ignora o que ainda não abriu", () => {
  const soPrimeiro = TEMAS[0].tag;
  const mapa = montarMapa({
    ...VAZIO,
    temaAberto: (tag) => tag === soPrimeiro,
    tatica: new Map([[soPrimeiro, 6]]),
    aulasPublicadas: new Set(),
  });
  const tatica = [...mapa.values()].flat().find((m) => m.modulo === "tatica");
  assert.ok(tatica);
  const conta = contarAberto(tatica);
  assert.equal(conta.total, PUZZLES_POR_TEMA, "só o tema aberto entra no total");
  assert.equal(conta.feitos, 6);
  assert.ok(conta.emEscrita > 0, "e os fechados são contados à parte, para a tela dizê-lo");

  const finais = [...mapa.values()].flat().find((m) => m.modulo === "finais");
  assert.ok(finais);
  assert.equal(contarAberto(finais).total, 0, "sem aula aberta, a barra de finais não tem denominador");
});

test("os dois motivos de estar fechado não se confundem", () => {
  // O defeito que este teste tranca: a `/trilha` desenhava "abre no Sábado 3" e
  // "em escrita" com a mesma pastilha tracejada. São razões diferentes para o
  // aluno — uma ele espera, a outra não existe —, e `/finais` já as separava.
  const naSemana1 = montarMapa({ ...VAZIO, temaAberto: () => false, aulasPublicadas: new Set(), semana: 1 });
  const aulas = itens(naSemana1, "finais");

  const daSemana1 = TRILHA.filter((a) => a.sabado === 1).map((a) => a.id);
  const depois = TRILHA.filter((a) => a.sabado > 1).map((a) => a.id);
  assert.ok(daSemana1.length > 0 && depois.length > 0, "a trilha precisa de aulas nas duas pontas");

  for (const id of daSemana1) {
    const item = aulas.find((i) => i.id === id);
    assert.equal(item?.situacao, "em-escrita", `${id}: o sábado dela já chegou e o JSON não existe`);
  }
  for (const id of depois) {
    const item = aulas.find((i) => i.id === id);
    assert.equal(item?.situacao, "por-abrir", `${id}: o sábado dela ainda não chegou`);
  }

  // E a data vem antes do texto: uma aula publicada cujo sábado não chegou
  // continua "por-abrir", não "aberta".
  const publicadaCedo = TRILHA.find((a) => a.sabado === 4);
  assert.ok(publicadaCedo);
  const comJson = montarMapa({
    ...VAZIO,
    aulasPublicadas: new Set([publicadaCedo.id]),
    semana: 1,
  });
  assert.equal(
    itens(comJson, "finais").find((i) => i.id === publicadaCedo.id)?.situacao,
    "por-abrir",
  );
});

test("toda pastilha fechada por data sabe dizer que sábado é esse", () => {
  // Sem isto a tela escreveria "Sáb null" — que é pior que não dizer nada.
  const mapa = montarMapa({ ...VAZIO, temaAberto: () => false, aulasPublicadas: new Set(), semana: 1 });
  for (const item of [...mapa.values()].flat().flatMap((m) => m.itens)) {
    if (item.situacao === "por-abrir") {
      assert.ok(item.sabado !== null, `${item.id} abre num sábado que ninguém sabe qual é`);
    }
  }
});

test('"você está aqui" cai no primeiro nível com trabalho aberto por fazer', () => {
  // Aluno zerado com tudo aberto: é o primeiro degrau.
  assert.equal(vocEstaAqui(montarMapa(VAZIO)), NIVEIS[0].id);

  // Nada aberto em lugar nenhum: a tela não pode apontar para um degrau vazio.
  const nadaAberto = montarMapa({
    ...VAZIO,
    temaAberto: () => false,
    aulasPublicadas: new Set(),
  });
  assert.equal(vocEstaAqui(nadaAberto), null);
});

test("todo módulo tem rótulo e diz o que a barra dele conta", () => {
  // A tela põe as duas barras lado a lado, e elas contam coisas diferentes —
  // puzzle medido e aula certificada pela tablebase. Uma barra sem essa frase
  // ao lado vira um percentual que o professor não sabe defender.
  for (const chave of ["tatica", "finais"] as const) {
    assert.ok(MODULO[chave].nome.length > 2);
    assert.ok(MODULO[chave].conta.length > 20);
    assert.ok(MODULO[chave].href.startsWith("/"));
    // A coluna vazia diz por que está vazia — senão a tela promete três
    // colunas no cabeçalho e entrega um buraco branco no degrau 2.
    assert.ok(MODULO[chave].vazio.length > 20, `${chave}: coluna vazia sem explicação`);
  }
});
