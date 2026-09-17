import assert from "node:assert/strict";
import test from "node:test";
import { TRILHA } from "../finais/trilha.ts";
import { BLOCOS, contaNoCurso } from "../tatica/blocos.ts";
import { MINIMO_DA_SEQUENCIA_MIN, diasComOMinimo, maiorSequenciaDeDias, type MinutosDoDia } from "./hoje.ts";
import { NIVEIS } from "./nivel.ts";
import { aberturasDoRepertorio } from "./selos-repertorio.ts";
import type { EntradaDoIndice } from "../repertorio/linhas.ts";
import type { ProgressoDaLinha } from "../repertorio/treino.ts";
import { corDoSelo, DEGRAUS, FAMILIAS_FORA_DA_VITRINE, familiaDoId, ganhos, melhorJanelaDeAcertos, proximos, selos, type AberturaParaOSelo, type ParaOsSelos } from "./selos.ts";

/**
 * O que se cobra de um selo é que ele seja **permanente** e que, quando
 * trancado, diga o que falta. As duas coisas são fáceis de escrever errado e
 * silenciosas quando erradas: um selo que some não estoura nada, e um selo mudo
 * parece um selo.
 */

const ZERADO: ParaOsSelos = {
  temasFechados: 0,
  aulasAprendidas: 0,
  repertorio: {
    aberturas: [],
    baseCompleto: false,
    avancadoCompleto: false,
  },
  conquistado: 0,
  diasComUmaHora: 0,
  maiorSequencia: 0,
  ratingTatica: null,
  puzzles: { resolvidos: 0, tentativas: 0, melhorJanela: null },
  aberturas: { concluidas: 0, cursos: [] },
};

const FRANCESA_REP: AberturaParaOSelo = { cor: "brancas", abertura: "francesa", nome: "Francesa 3.Bd3", base: 3, aprendidas: 0, trancadas: 0 };
const LONDRES_REP: AberturaParaOSelo = { cor: "pretas", abertura: "londres", nome: "Londres 2.Bf4", base: 1, aprendidas: 0, trancadas: 0 };

const com = (mudancas: Partial<ParaOsSelos>): ParaOsSelos => ({ ...ZERADO, ...mudancas });
const acha = (p: ParaOsSelos, id: string) => {
  const s = selos(p).find((x) => x.id === id);
  assert.ok(s, `selo ${id} não existe`);
  return s;
};

const linha = (dia: string, minutos: number): MinutosDoDia => ({
  dia,
  bloco: "tatica",
  tempo_ms: minutos * 60_000,
});

/* ------------------------------------------------------------------ *
 * A armadilha da janela de 30 dias
 * ------------------------------------------------------------------ */

test("um selo ganho há 40 dias continua ganho", () => {
  // **O defeito que este teste existe para impedir.** O painel lia os minutos de
  // apenas 30 dias, e sobre essa janela "Uma hora" ganho no dia 1 sumiria no dia
  // 32 — o site tirando do aluno uma coisa que ele fez.
  const haQuarentaDias = [linha("2026-08-01", 75)];
  assert.equal(diasComOMinimo(haQuarentaDias), 1);
  assert.equal(acha(com({ diasComUmaHora: 1 }), "hora-1").ganho, true);

  // E o mesmo para a constância: o recorde é do histórico, não da janela.
  const semanaDeAgosto = ["01", "02", "03", "04", "05", "06", "07"].map((d) =>
    linha(`2026-08-${d}`, 70),
  );
  assert.equal(maiorSequenciaDeDias(semanaDeAgosto), 7);
  assert.equal(acha(com({ maiorSequencia: 7 }), "constante-7").ganho, true);
});

test("a maior sequência é o recorde, e não a de agora", () => {
  // Dez dias seguidos em agosto, um buraco, e dois dias em setembro. A sequência
  // corrente é 2; o recorde é 10, e é o recorde que vale o selo.
  const agosto = Array.from({ length: 10 }, (_, i) =>
    linha(`2026-08-${String(i + 1).padStart(2, "0")}`, 65),
  );
  const setembro = [linha("2026-09-08", 65), linha("2026-09-09", 65)];
  assert.equal(maiorSequenciaDeDias([...agosto, ...setembro]), 10);
});

test("um dia curto quebra a sequência, e a partida declarada não a sustenta", () => {
  // A view só tem linhas de tempo medido — a partida não gera linha nenhuma —,
  // então "não sustenta" sai de graça: não há o que excluir. O que este teste
  // cobra é o outro lado: 59 minutos não valem.
  const quaseLa = [linha("2026-09-07", 65), linha("2026-09-08", 59), linha("2026-09-09", 65)];
  assert.equal(maiorSequenciaDeDias(quaseLa), 1);
  assert.ok(59 < MINIMO_DA_SEQUENCIA_MIN);
});

/* ------------------------------------------------------------------ *
 * Os degraus
 * ------------------------------------------------------------------ */

test("os degraus de tática cabem no currículo, e o último é o currículo inteiro", () => {
  const temas = BLOCOS.flatMap((b) => b.temas).filter(contaNoCurso).length;
  assert.equal(DEGRAUS.tatica[DEGRAUS.tatica.length - 1], temas, "o último degrau são os 63");
  for (const d of DEGRAUS.tatica) assert.ok(d <= temas, `o degrau ${d} não existe no currículo`);
});

test("os degraus de finais cabem na trilha, e o último é a trilha inteira", () => {
  assert.equal(DEGRAUS.finais[DEGRAUS.finais.length - 1], TRILHA.length);
  for (const d of DEGRAUS.finais) assert.ok(d <= TRILHA.length, `o degrau ${d} não existe`);
});

test("os degraus sobem, e nunca repetem", () => {
  for (const [nome, lista] of Object.entries(DEGRAUS)) {
    for (let i = 1; i < lista.length; i += 1) {
      assert.ok(lista[i] > lista[i - 1], `${nome}: o degrau ${lista[i]} não sobe`);
    }
  }
});

test("o degrau 14 de tática é a meta da OLESC, e não um número redondo", () => {
  // Se alguém trocar por 10 achando que fica mais bonito, este teste pergunta
  // por quê: 14 é o total de temas dos níveis 1 a 3, que é a meta declarada.
  const ate3 = BLOCOS.filter((b) => b.nivel <= 3).flatMap((b) => b.temas).filter(contaNoCurso).length;
  assert.equal(ate3, 14);
  assert.ok(DEGRAUS.tatica.includes(14));
});

test("o primeiro degrau de finais é alcançável com o que existe hoje", () => {
  // São 49 aulas na taxonomia e 2 publicadas. Um primeiro degrau em 5 seria um
  // selo que nenhum aluno pode ganhar, por um motivo que não é dele.
  assert.equal(DEGRAUS.finais[0], 1);
});

/* ------------------------------------------------------------------ *
 * A forma
 * ------------------------------------------------------------------ */

test("todo selo trancado diz o que falta, e nenhum ganho diz", () => {
  // Selo apagado que não diz o que falta é decoração: mostra que existe coisa
  // boa e esconde como chegar lá.
  const meio = com({
    temasFechados: 5,
    aulasAprendidas: 1,
    conquistado: 1,
    diasComUmaHora: 3,
    maiorSequencia: 4,
    ratingTatica: { maximo: 730, melhorSequencia: 3, inicio: 650, resolvidos: 20 },
  });
  for (const s of selos(meio)) {
    if (s.ganho) assert.equal(s.falta, null, `${s.id} está ganho e ainda diz o que falta`);
    else assert.ok(s.falta && s.falta.length > 8, `${s.id} está trancado e não diz o que falta`);
    assert.ok(s.nome.length > 3, `${s.id} sem nome`);
    assert.ok(s.conta.length > 20, `${s.id} sem explicação`);
  }
});

test("nenhum id se repete", () => {
  const ids = selos(ZERADO).map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("o aluno zerado não tem selo nenhum, e o aluno completo tem todos", () => {
  assert.deepEqual(ganhos(selos(ZERADO)), []);

  const tudo: ParaOsSelos = {
    temasFechados: 63,
    aulasAprendidas: 49,
    repertorio: {
      aberturas: [
        { cor: "brancas", abertura: "francesa", nome: "Francesa 3.Bd3", base: 19, aprendidas: 19, trancadas: 0 },
        { cor: "pretas", abertura: "londres", nome: "Londres 2.Bf4", base: 1, aprendidas: 1, trancadas: 0 },
      ],
      baseCompleto: true,
      avancadoCompleto: true,
    },
    conquistado: 5,
    diasComUmaHora: 40,
    maiorSequencia: 40,
    ratingTatica: { maximo: 1400, melhorSequencia: 10, inicio: 600, resolvidos: 300 },
    puzzles: { resolvidos: 1000, tentativas: 1200, melhorJanela: 95 },
    aberturas: { concluidas: 5, cursos: [{ chave: "brancas/francesa", nome: "Francesa", aulas: 5, concluidas: 5 }] },
  };
  const lista = selos(tudo);
  assert.equal(ganhos(lista).length, lista.length, "sobrou selo trancado no aluno completo");
  assert.deepEqual(proximos(lista), [], "o aluno completo não tem próximo");
});

test("os degraus acendem na ordem, e não pulam", () => {
  const treze = selos(com({ temasFechados: 13 })).filter((s) => s.familia === "tatica");
  assert.deepEqual(
    treze.map((s) => s.ganho),
    [true, true, false, false, false],
    "com 13 temas, os degraus 3 e 7 acendem e o 14 não",
  );
  assert.equal(treze[2].falta, "falta 1 tema", "e o 14 diz que falta um");
});

test("os níveis acendem até o conquistado, e o próximo diz o que fazer", () => {
  const lista = selos(com({ conquistado: 2 }));
  const deNivel = lista.filter((s) => s.familia === "nivel");
  assert.equal(deNivel.length, NIVEIS.length);
  assert.deepEqual(
    deNivel.map((s) => s.ganho),
    [true, true, false, false, false],
  );
  assert.equal(deNivel[2].falta, "feche as três frentes e faça a prova");
  assert.match(deNivel[3].falta ?? "", /conquiste antes o nível 3/);
});

/* ------------------------------------------------------------------ *
 * `proximos`
 * ------------------------------------------------------------------ */

test("os dois próximos vêm de famílias diferentes", () => {
  // Sem isto os dois próximos seriam sempre os dois degraus seguintes de tática,
  // e o aluno nunca ficaria sabendo que existe um selo de constância.
  const dois = proximos(selos(ZERADO));
  assert.equal(dois.length, 2);
  assert.notEqual(dois[0].familia, dois[1].familia);
  assert.ok(dois.every((s) => !s.ganho));
});

test("`proximos` pula a família que já está completa", () => {
  const lista = selos(
    com({
      temasFechados: 63,
      aulasAprendidas: 49,
      diasComUmaHora: 1,
      maiorSequencia: 30,
      ratingTatica: { maximo: 1500, melhorSequencia: 12, inicio: 600, resolvidos: 400 },
      // As famílias de 17/9 entram completas também: o teste é sobre pular o que acabou.
      puzzles: { resolvidos: 1000, tentativas: 1000, melhorJanela: 100 },
    }),
  );
  for (const s of proximos(lista, 4)) {
    assert.ok(["repertorio", "nivel"].includes(s.familia), `${s.id} não devia estar pendente`);
  }
});

test("o repertório: um selo por abertura do índice, e o Base e o Avançado como os dois grandes", () => {
  // 17/9/2026: "o selo repertório de brancas é muito longo — dividir por defesa; pretas também".
  // Os dois selos de cor saíram; cada abertura do índice ganha o seu, por dados.
  const doRepertorio = selos(com({ repertorio: { ...ZERADO.repertorio, aberturas: [FRANCESA_REP, LONDRES_REP] } })).filter(
    (s) => s.familia === "repertorio",
  );
  assert.deepEqual(doRepertorio.map((s) => s.id), [
    "repertorio-brancas-francesa",
    "repertorio-pretas-londres",
    "repertorio-base",
    "repertorio-avancado",
  ]);
  assert.match(acha(ZERADO, "repertorio-base").conta, /abre o Avançado/);
  assert.equal(corDoSelo("repertorio-brancas-francesa"), "brancas");
  assert.equal(corDoSelo("repertorio-pretas-londres"), "pretas");
  assert.equal(corDoSelo("repertorio-base"), null);
  assert.equal(corDoSelo("repertorio-brancas"), null, "o id antigo não é selo de abertura");
});

/* ------------------------------------------------------------------ *
 * A tática rating (15/9)
 * ------------------------------------------------------------------ */

const jogou = (maximo: number, extra: Partial<NonNullable<ParaOsSelos["ratingTatica"]>> = {}) =>
  com({ ratingTatica: { maximo, melhorSequencia: 0, inicio: 600, resolvidos: 10, ...extra } });

test("tática rating: +100 acima do início, 1000, 1200 e 1400 pelo máximo, e 10 seguidos", () => {
  const ids = selos(ZERADO).filter((s) => s.familia === "rating").map((s) => s.id);
  assert.deepEqual(ids, ["rating-mais-100", "rating-1000", "rating-1200", "rating-1400", "rating-seguidos-10"]);
  assert.deepEqual(DEGRAUS.rating, [1000, 1200, 1400]);

  const doRating = selos(jogou(1210.6, { melhorSequencia: 10 })).filter((s) => s.familia === "rating");
  assert.deepEqual(doRating.map((s) => s.ganho), [true, true, true, false, true]);
  assert.equal(acha(jogou(1210.6), "rating-1400").falta, "faltam 189 pontos no seu recorde");
});

test("tática rating: o +100 é contado do início guardado na linha do aluno", () => {
  assert.equal(acha(jogou(699, { inicio: 600 }), "rating-mais-100").ganho, false);
  assert.equal(acha(jogou(700, { inicio: 600 }), "rating-mais-100").ganho, true);
  assert.equal(acha(jogou(1250, { inicio: 1200 }), "rating-mais-100").falta, "faltam 50 pontos no seu recorde");
  assert.equal(acha(jogou(1300, { inicio: 1200 }), "rating-mais-100").ganho, true);
});

test("tática rating: é o máximo que conta — o selo não some quando o rating de agora cai", () => {
  // O painel passa `rating_maximo`, e não o rating atual: um aluno que foi a 1003
  // e hoje está em 940 continua com o selo de 1000.
  assert.equal(acha(jogou(1003), "rating-1000").ganho, true);
  assert.equal(acha(jogou(999.4), "rating-1000").ganho, false);
  assert.equal(acha(jogou(999.6), "rating-1000").ganho, true, "arredonda como a tela");
});

test("tática rating: quem começou alto não ganha selo só por abrir a página", () => {
  // Rating de entrada 1300: a linha nasce com máximo 1300, mas sem problema resolvido.
  const semJogar = jogou(1300, { inicio: 1300, resolvidos: 0 });
  assert.equal(acha(semJogar, "rating-1000").ganho, false);
  assert.equal(acha(semJogar, "rating-1000").falta, "jogue a tática rating");
  assert.equal(acha(jogou(1300, { inicio: 1300, resolvidos: 1 }), "rating-1200").ganho, true);
});

test("tática rating: quem nunca jogou tem os selos trancados e o convite escrito", () => {
  for (const s of selos(ZERADO).filter((x) => x.familia === "rating")) {
    assert.equal(s.ganho, false);
    assert.equal(s.falta, "jogue a tática rating");
  }
  assert.equal(acha(jogou(600, { melhorSequencia: 7 }), "rating-seguidos-10").falta, "acerte 10 em sequência (seu melhor: 7)");
  assert.equal(acha(jogou(999), "rating-1000").falta, "falta 1 ponto no seu recorde");
});

test("tática rating: vem por último, e não tira do painel o próximo selo de finais", () => {
  const lista = selos(ZERADO);
  assert.equal(lista.at(-1)?.id, "rating-seguidos-10");
  assert.deepEqual(proximos(lista).map((s) => s.familia), ["tatica", "finais"]);
});

/* ------------------------------------------------------------------ *
 * Os selos V2 (17/9): puzzles resolvidos e pontaria
 * ------------------------------------------------------------------ */

const puzzles = (resolvidos: number, tentativas: number, melhorJanela: number | null) =>
  com({ puzzles: { resolvidos, tentativas, melhorJanela } });

test("puzzles resolvidos: 100, 250, 500 e 1000, acendendo no número exato", () => {
  assert.deepEqual(DEGRAUS.puzzles, [100, 250, 500, 1000]);
  const ids = selos(ZERADO).filter((s) => s.familia === "puzzles").map((s) => s.id);
  assert.deepEqual(ids, ["puzzles-100", "puzzles-250", "puzzles-500", "puzzles-1000"]);

  for (const degrau of DEGRAUS.puzzles) {
    assert.equal(acha(puzzles(degrau - 1, degrau * 2, null), `puzzles-${degrau}`).ganho, false, `${degrau - 1} não vale ${degrau}`);
    assert.equal(acha(puzzles(degrau, degrau * 2, null), `puzzles-${degrau}`).ganho, true, `${degrau} vale ${degrau}`);
  }
  assert.equal(acha(puzzles(99, 300, null), "puzzles-100").falta, "falta 1 puzzle");
  assert.equal(acha(puzzles(0, 0, null), "puzzles-100").falta, "faltam 100 puzzles");
});

test("pontaria: 80 certos numa janela de 100 seguidos — 79 não vale, e sem 100 tentativas não há janela", () => {
  assert.equal(acha(puzzles(90, 150, 79), "pontaria-80").ganho, false);
  assert.equal(acha(puzzles(90, 150, 80), "pontaria-80").ganho, true);
  assert.equal(acha(puzzles(90, 150, 100), "pontaria-80").ganho, true);

  const semJanela = acha(puzzles(60, 60, null), "pontaria-80");
  assert.equal(semJanela.ganho, false);
  assert.equal(semJanela.falta, "faltam 40 puzzles para a primeira janela de 100");
  assert.equal(acha(puzzles(98, 99, null), "pontaria-80").falta, "falta 1 puzzle para a primeira janela de 100");
  assert.equal(acha(puzzles(90, 150, 71), "pontaria-80").falta, "acerte 80 de 100 seguidos (seu melhor: 71)");
});

/* ------------------------------------------------------------------ *
 * A família das aulas de abertura (17/9) — por dados
 * ------------------------------------------------------------------ */

const FRANCESA = { chave: "brancas/francesa", nome: "Francesa", aulas: 5, concluidas: 0 };
const CARO = { chave: "pretas/caro-kann", nome: "Caro-Kann", aulas: 2, concluidas: 0 };

test("abertura: sem curso publicado não existe selo que ninguém pode ganhar", () => {
  assert.deepEqual(selos(ZERADO).filter((s) => s.familia === "abertura"), []);
});

test("abertura: a primeira aula concluída acende no 1, e cada curso tem o seu selo, lido dos dados", () => {
  const nada = com({ aberturas: { concluidas: 0, cursos: [FRANCESA, CARO] } });
  assert.deepEqual(
    selos(nada).filter((s) => s.familia === "abertura").map((s) => s.id),
    ["abertura-aula-1", "abertura-curso-brancas-francesa", "abertura-curso-pretas-caro-kann"],
  );
  assert.equal(acha(nada, "abertura-aula-1").ganho, false);
  assert.equal(acha(nada, "abertura-curso-brancas-francesa").falta, "faltam 5 aulas da Francesa");

  const uma = com({ aberturas: { concluidas: 1, cursos: [{ ...FRANCESA, concluidas: 1 }, CARO] } });
  assert.equal(acha(uma, "abertura-aula-1").ganho, true);
  assert.equal(acha(uma, "abertura-curso-brancas-francesa").ganho, false);

  const quase = com({ aberturas: { concluidas: 4, cursos: [{ ...FRANCESA, concluidas: 4 }, CARO] } });
  assert.equal(acha(quase, "abertura-curso-brancas-francesa").falta, "falta 1 aula da Francesa");

  const toda = com({ aberturas: { concluidas: 5, cursos: [{ ...FRANCESA, concluidas: 5 }, CARO] } });
  assert.equal(acha(toda, "abertura-curso-brancas-francesa").ganho, true);
  assert.match(acha(toda, "abertura-curso-brancas-francesa").nome, /Francesa/);
  assert.equal(acha(toda, "abertura-curso-pretas-caro-kann").ganho, false, "o curso da outra abertura não acende junto");
});

test("a família de cada id sai do próprio id, e o rating é a única família fora da vitrine", () => {
  const tudo = selos(com({ aberturas: { concluidas: 0, cursos: [FRANCESA] } }));
  for (const s of tudo) assert.equal(familiaDoId(s.id), s.familia, s.id);
  assert.equal(familiaDoId("inventado-1"), null);
  assert.deepEqual([...FAMILIAS_FORA_DA_VITRINE], ["rating"]);
});

test("a janela da pontaria é a melhor de 100 seguidas, e não o total nem as últimas 100", () => {
  // A regra que a view `puzzles_do_aluno` (0018) calcula no banco, escrita aqui para o teste
  // alcançá-la. `npm run selos:ciclo` confere que as duas dão o mesmo número.
  const erros = (n: number) => Array.from({ length: n }, () => false);
  const certos = (n: number) => Array.from({ length: n }, () => true);
  assert.equal(melhorJanelaDeAcertos(certos(99)), null, "99 tentativas não formam janela");
  assert.equal(melhorJanelaDeAcertos([...erros(20), ...certos(80)]), 80);
  // Começou mal (40 erros) e depois acertou 80 seguidos: o total é 80/180 = 44%, mas a melhor
  // janela tem 80 — o selo é dele, e os erros de depois não o tiram.
  assert.equal(melhorJanelaDeAcertos([...erros(40), ...certos(80), ...erros(60)]), 80);
  assert.equal(melhorJanelaDeAcertos([...erros(21), ...certos(79)]), 79);
});

/* ------------------------------------------------------------------ *
 * O repertório por abertura (17/9/2026)
 * ------------------------------------------------------------------ */

const comAbertura = (mudanca: Partial<AberturaParaOSelo>) =>
  com({ repertorio: { ...ZERADO.repertorio, aberturas: [{ ...FRANCESA_REP, ...mudanca }] } });

test("repertório por abertura: todas as linhas Base aprendidas ganham; uma faltando não", () => {
  assert.equal(acha(comAbertura({ aprendidas: 3 }), "repertorio-brancas-francesa").ganho, true);
  const quase = acha(comAbertura({ aprendidas: 2 }), "repertorio-brancas-francesa");
  assert.equal(quase.ganho, false);
  assert.equal(quase.falta, "falta 1 linha");
  assert.equal(acha(comAbertura({ aprendidas: 0 }), "repertorio-brancas-francesa").falta, "faltam 3 linhas");
  // O nome é o do índice, curto: a cor não entra no nome.
  assert.equal(acha(comAbertura({}), "repertorio-brancas-francesa").nome, "Francesa 3.Bd3");
  assert.match(acha(comAbertura({}), "repertorio-brancas-francesa").conta, /brancas/);
});

test("repertório por abertura: linha trancada pela aula impede o selo, mesmo com as abertas aprendidas", () => {
  // Selo gravado não some: um selo ganho com 2 linhas abertas de 19 seria da Francesa para sempre.
  const todasTrancadas = acha(comAbertura({ aprendidas: 0, trancadas: 3 }), "repertorio-brancas-francesa");
  assert.equal(todasTrancadas.ganho, false);
  assert.equal(todasTrancadas.falta, "3 linhas ainda trancadas — conclua as aulas do curso");
  const umaTrancada = acha(comAbertura({ aprendidas: 2, trancadas: 1 }), "repertorio-brancas-francesa");
  assert.equal(umaTrancada.ganho, false);
  assert.equal(umaTrancada.falta, "1 linha ainda trancada — conclua as aulas do curso");
});

const linhaAprendida: ProgressoDaLinha = {
  acertosSeguidos: 3, tentativas: 3, erros: 0, aprendidaEm: "2026-09-10T12:00:00Z", ultimaEm: "2026-09-10T12:00:00Z", degrau: 3, revisarEm: "2026-09-17T12:00:00Z",
};
const linhaEmTreino: ProgressoDaLinha = { ...linhaAprendida, aprendidaEm: null, degrau: 2, acertosSeguidos: 2 };

const ENTRADA: EntradaDoIndice = {
  cor: "brancas",
  abertura: "caro-kann",
  nome: "Caro-Kann Trocas",
  linhas: 3,
  ids: ["brancas-caro-kann-aaaaaaaa", "brancas-caro-kann-bbbbbbbb", "brancas-caro-kann-cccccccc"],
  idsAvancado: ["brancas-caro-kann-cccccccc"],
  arquivo: "/repertorio/brancas/caro-kann.json",
};

test("repertório por abertura, lido do índice: o Avançado não conta, e a trava conta como trancada", () => {
  const progresso = new Map([
    ["brancas-caro-kann-aaaaaaaa", linhaAprendida],
    ["brancas-caro-kann-bbbbbbbb", linhaAprendida],
    // A do Avançado nem começou: não pode segurar o selo da abertura.
  ]);
  const [caro] = aberturasDoRepertorio([ENTRADA], progresso, new Set());
  assert.deepEqual(caro, { cor: "brancas", abertura: "caro-kann", nome: "Caro-Kann Trocas", base: 2, aprendidas: 2, trancadas: 0 });
  assert.equal(acha(com({ repertorio: { ...ZERADO.repertorio, aberturas: [caro] } }), "repertorio-brancas-caro-kann").ganho, true);

  const [emTreino] = aberturasDoRepertorio([ENTRADA], new Map([["brancas-caro-kann-aaaaaaaa", linhaAprendida], ["brancas-caro-kann-bbbbbbbb", linhaEmTreino]]), new Set());
  assert.equal(emTreino.aprendidas, 1);

  const [trancada] = aberturasDoRepertorio([ENTRADA], progresso, new Set(["brancas-caro-kann-bbbbbbbb", "brancas-caro-kann-cccccccc"]));
  assert.equal(trancada.trancadas, 1, "a trancada do Avançado não entra na conta do Base");
  assert.equal(acha(com({ repertorio: { ...ZERADO.repertorio, aberturas: [trancada] } }), "repertorio-brancas-caro-kann").ganho, false);
});

test("repertório por abertura: abertura sem linha Base não tem selo (ninguém poderia ganhar)", () => {
  assert.equal(
    selos(comAbertura({ base: 0 })).some((s) => s.id === "repertorio-brancas-francesa"),
    false,
  );
});
