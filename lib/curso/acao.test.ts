import assert from "node:assert/strict";
import test from "node:test";
import { AULA_ZERADA, type ProgressoDaAula } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { METAS, type Feitos } from "../tatica/serie.ts";
import { proximaAcao, type ParaDecidir } from "./acao.ts";
import {
  aulasDoNivel,
  LINHAS_POR_NIVEL,
  NIVEIS,
  proximoPasso,
  REVISAO_ANTES_DO_AVANCO,
  temasDoNivel,
  type Nivel,
  type ProgressoParaONivel,
} from "./nivel.ts";

/**
 * O que se cobra de `proximaAcao` é a **unicidade**, e não a ordem sozinha: a
 * ordem é fácil de escrever certo, e foi a unicidade que faltou por três meses.
 * Por isso o teste central deste arquivo não compara a ação com uma constante —
 * ele compara a ação com **o que o cartão Hoje faria**, no mesmo estado.
 */

/* ------------------------------------------------------------------ *
 * Andaimes — os mesmos de `nivel.test.ts`, e de propósito
 * ------------------------------------------------------------------ */

const FECHADO: Feitos = { aquecimento: METAS.aquecimento, serie: METAS.serie, prova: METAS.prova };

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
  comPratica: new Set(),
  linhasAprendidas: 0,
  baseCompleto: false,
};

function comTaticaAte(ate: Nivel, base = VAZIO): ProgressoParaONivel {
  const temas = new Map(base.temas);
  for (const n of NIVEIS) {
    if (n > ate) break;
    for (const tag of temasDoNivel(n)) temas.set(tag, FECHADO);
  }
  return { ...base, temas };
}

/** O aluno zerado do nível 1, sem nada vencido. É o ponto de partida de todos. */
function zerado(mudancas: Partial<ParaDecidir> = {}): ParaDecidir {
  return {
    nivel: 1,
    conquistado: 0,
    progresso: VAZIO,
    vencidosDeTatica: 0,
    vencidasDeFinais: [],
    ...mudancas,
  };
}

/* ------------------------------------------------------------------ *
 * A divergência que este arquivo veio matar
 * ------------------------------------------------------------------ */

/**
 * O que `app/painel/Hoje.tsx` faz com os mesmos números — copiado da tela, e é
 * essa a graça: se alguém mudar a regra num lado só, este teste reprova.
 *
 * O cartão oferece a revisão de tática a partir de **1** puzzle vencido, e a de
 * finais a partir da **primeira** aula vencida.
 */
function oQueOCartaoHojeAponta(d: ParaDecidir): string | null {
  if (d.vencidosDeTatica > 0) return "/tatica/revisao";
  const primeira = d.vencidasDeFinais[0];
  if (primeira) return `/finais/${primeira.id}?revisao=1`;
  return null;
}

test("com 5 puzzles vencidos, a ação e o cartão Hoje apontam para o mesmo lugar", () => {
  // A divergência nº 1, cravada em número: 5 está **abaixo** do velho limiar de
  // 20, e era exatamente aí que as duas telas discordavam. O `proximoPasso`
  // mandava para o tema do nível; o cartão, para a fila.
  const d = zerado({ vencidosDeTatica: 5 });

  const acao = proximaAcao(d);
  assert.equal(acao.tipo, "revisao-tatica");
  assert.equal(acao.href, oQueOCartaoHojeAponta(d));

  // E a prova de que havia mesmo divergência, para que ninguém apague o teste
  // achando que ele nunca teve motivo:
  assert.equal(proximoPasso(1, VAZIO, 5).tipo, "tema");
  assert.ok(5 < REVISAO_ANTES_DO_AVANCO, "o limiar antigo era maior que 5");
});

test("de 1 a 30 puzzles vencidos, a ação nunca sai da fila de revisão", () => {
  // Uma varredura, e não um caso: o limiar era um número no meio da faixa, e um
  // teste de ponta a ponta é o que impede outro limiar de nascer sem alarde.
  for (let vencidos = 1; vencidos <= 30; vencidos += 1) {
    const d = zerado({ vencidosDeTatica: vencidos });
    const acao = proximaAcao(d);
    assert.equal(acao.tipo, "revisao-tatica", `com ${vencidos} vencidos`);
    assert.equal(acao.href, oQueOCartaoHojeAponta(d));
  }
});

test("a revisão de finais também é a ação, e com o mesmo link do cartão", () => {
  // A divergência nº 2: `proximoPasso` não recebia os finais, então uma aula
  // vencida jamais podia ser o próximo passo.
  const d = zerado({ vencidasDeFinais: [{ id: "N1-KPK", nome: "Rei e peão contra rei" }] });
  const acao = proximaAcao(d);
  assert.equal(acao.tipo, "revisao-finais");
  assert.equal(acao.href, "/finais/N1-KPK?revisao=1");
  assert.equal(acao.href, oQueOCartaoHojeAponta(d));
});

/* ------------------------------------------------------------------ *
 * A ordem
 * ------------------------------------------------------------------ */

test("tática vencida vem antes de finais vencida", () => {
  const acao = proximaAcao(
    zerado({
      vencidosDeTatica: 1,
      vencidasDeFinais: [{ id: "N1-KPK", nome: "Rei e peão contra rei" }],
    }),
  );
  assert.equal(acao.tipo, "revisao-tatica");
});

test("sem nada vencido, a ação é o primeiro tema do nível", () => {
  const acao = proximaAcao(zerado());
  const tag = temasDoNivel(1)[0];
  const nome = BLOCOS.flatMap((b) => b.temas).find((t) => t.tag === tag)?.nome;
  assert.equal(acao.tipo, "tema");
  assert.equal(acao.href, `/tatica/${tag}`);
  assert.equal(acao.titulo, nome);
});

test("fechada a tática, a ação vira a aula publicada que falta", () => {
  const aula = aulasDoNivel(1)[0];
  const acao = proximaAcao(
    zerado({ progresso: { ...comTaticaAte(1), publicadas: new Set([aula.id]) } }),
  );
  assert.equal(acao.tipo, "aula");
  assert.equal(acao.href, `/finais/${aula.id}`);
  assert.equal(acao.titulo, aula.nome);
});

test("fechados tática e finais, a ação vira as linhas que faltam", () => {
  const acao = proximaAcao(
    zerado({ progresso: { ...comTaticaAte(1), linhasAprendidas: 1 } }),
  );
  assert.equal(acao.tipo, "linha");
  assert.equal(acao.href, "/aberturas");
  assert.match(acao.titulo, new RegExp(`${LINHAS_POR_NIVEL - 1} linhas`));
});

test("a prova é a última coisa do nível, e só depois das três trilhas", () => {
  const acao = proximaAcao(
    zerado({ progresso: { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL } }),
  );
  assert.equal(acao.tipo, "prova");
  assert.equal(acao.href, "/nivel/1/prova");
});

test("quem já passou na prova do nível não é mandado fazê-la de novo", () => {
  const acao = proximaAcao(
    zerado({
      conquistado: 1,
      progresso: { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL },
    }),
  );
  assert.equal(acao.tipo, "nada");
  assert.equal(acao.href, null);
});

test("o aluno que percorreu a escada inteira não recebe alvo nenhum", () => {
  const acao = proximaAcao({
    nivel: 5,
    conquistado: 5,
    progresso: { ...comTaticaAte(5), linhasAprendidas: 20, baseCompleto: true },
    vencidosDeTatica: 0,
    vencidasDeFinais: [],
  });
  assert.equal(acao.tipo, "nada");
  assert.equal(acao.href, null);
});

test("mesmo com a escada inteira fechada, a fila vencida volta a ser a ação", () => {
  // O "nada a fazer" é do dia, não do curso: quem terminou os cinco níveis
  // continua tendo puzzles vencendo, e o site tem de dizer isso.
  const acao = proximaAcao({
    nivel: 5,
    conquistado: 5,
    progresso: { ...comTaticaAte(5), linhasAprendidas: 20, baseCompleto: true },
    vencidosDeTatica: 3,
    vencidasDeFinais: [],
  });
  assert.equal(acao.tipo, "revisao-tatica");
});

/* ------------------------------------------------------------------ *
 * As invariantes da forma
 * ------------------------------------------------------------------ */

test("a partida do dia nunca é a ação do site", () => {
  // Decisão registrada: a partida acontece no chess.com e o site não a mede.
  // Mandar o aluno embora do site não pode ser a resposta a "o que faço agora".
  const estados: ParaDecidir[] = [
    zerado(),
    zerado({ vencidosDeTatica: 7 }),
    zerado({ vencidasDeFinais: [{ id: "N1-KPK", nome: "K+P" }] }),
    zerado({ progresso: { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL } }),
    {
      nivel: 5,
      conquistado: 5,
      progresso: { ...comTaticaAte(5), linhasAprendidas: 20, baseCompleto: true },
      vencidosDeTatica: 0,
      vencidasDeFinais: [],
    },
  ];
  for (const d of estados) {
    const acao = proximaAcao(d);
    assert.ok(acao.href === null || !acao.href.includes("chess.com"), acao.titulo);
    assert.ok(!/partida/i.test(acao.titulo), acao.titulo);
  }
});

test("toda ação tem título e motivo, e só a de href nulo fica sem botão", () => {
  const estados: ParaDecidir[] = [
    zerado(),
    zerado({ vencidosDeTatica: 1 }),
    zerado({ vencidasDeFinais: [{ id: "N1-KPK", nome: "K+P" }] }),
    zerado({ progresso: { ...comTaticaAte(1), publicadas: new Set([aulasDoNivel(1)[0].id]) } }),
    zerado({ progresso: { ...comTaticaAte(1), linhasAprendidas: 1 } }),
    zerado({ progresso: { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL } }),
    zerado({
      conquistado: 1,
      progresso: { ...comTaticaAte(1), linhasAprendidas: LINHAS_POR_NIVEL },
    }),
  ];
  for (const d of estados) {
    const acao = proximaAcao(d);
    assert.ok(acao.titulo.length > 3, `título curto em ${acao.tipo}`);
    assert.ok(acao.motivo.length > 20, `motivo curto em ${acao.tipo}: ${acao.motivo}`);
    if (acao.href === null) assert.equal(acao.botao, "");
    else assert.ok(acao.botao.length > 3, `botão sem texto em ${acao.tipo}`);
  }
});

test("uma aula de finais já aprendida não volta como aula nova", () => {
  const aula = aulasDoNivel(1)[0];
  const acao = proximaAcao(
    zerado({
      progresso: {
        ...comTaticaAte(1),
        publicadas: new Set([aula.id]),
        finais: new Map([[aula.id, APRENDIDA]]),
      },
    }),
  );
  assert.notEqual(acao.tipo, "aula");
});
