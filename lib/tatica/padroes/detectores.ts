import { Chess, type Square } from "chess.js";
import {
  casa,
  coord,
  distancia,
  fileirasDoRei,
  lerPeca,
  mateFinal,
  naBorda,
  relativa,
  type Mate,
} from "./geometria.ts";

/**
 * Os detectores de padrão: um por tag que **nós** decidimos.
 *
 * São de dois tipos:
 *
 * - **padrões que o Lichess não etiqueta** (Damiano, Lolli, Anderssen, Greco...):
 *   a tag sai só daqui;
 * - **validadores de tags frouxas do Lichess** (`epauletteMate`, `killBoxMate`):
 *   a tag do Lichess só fica se a figura estiver lá.
 *
 * Cada detector de mate recebe a posição final (`mateFinal`) e responde sim ou
 * não. As definições, com as posições do Praticar que as ilustram e a
 * precisão medida em puzzles reais, estão em `docs/TATICA-PADROES.md`; os
 * testes em `detectores.test.ts` usam essas posições.
 */

type DetectorDeMate = (m: Mate) => boolean;

/** O único atacante que dá xeque, ou `null` (nenhum ou xeque duplo). */
function soUmXeque(m: Mate): Square | null {
  return m.xeque.length === 1 ? m.xeque[0] : null;
}

const tipoEm = (m: Mate, c: Square | null) => (c ? m.peca(c)?.tipo : undefined);
const doPerdedor = (m: Mate, c: Square | null) => !!c && m.peca(c)?.cor === m.perdedor;
const vazias = (m: Mate) => m.vizinhas.filter((v) => !v.ocupante);

/**
 * As fugas que **nenhuma peça da figura** fecha: casas em volta do rei que não
 * estão tapadas por peça dele, fora as casas da própria figura, e que nenhuma
 * peça da `figura` ataca. Quando outras peças fecham duas ou mais, o mate é uma
 * rede qualquer com a figura por acaso (auditoria de 16/9: metade das tags de
 * ópera, Morphy e dragonas do Lichess eram isso).
 */
function fugasDeFora(m: Mate, figura: readonly Square[]): number {
  return m.vizinhas.filter(
    (v) => v.ocupante?.cor !== m.perdedor && !figura.includes(v.casa) && !v.atacantes.some((a) => figura.includes(a)),
  ).length;
}

/** As casas das peças do vencedor de um tipo. */
function pecasDo(m: Mate, tipo: "b" | "r"): Square[] {
  const lista: Square[] = [];
  for (let c = 0; c < 8; c++) {
    for (let f = 0; f < 8; f++) {
      const q = casa(c, f)!;
      const p = m.peca(q);
      if (p?.cor === m.vencedor && p.tipo === tipo) lista.push(q);
    }
  }
  return lista;
}

/**
 * **Damiano** — a dama colada na diagonal da frente do rei, na primeira fileira; uma peça
 * dele logo à frente do rei; a dama apoiada por um peão duas casas à frente do
 * rei, ou por um bispo.
 */
export const damianoMate: DetectorDeMate = (m) => {
  const dama = soUmXeque(m);
  if (tipoEm(m, dama) !== "q") return false;
  return fileirasDoRei(m.rei).some(
    (b) =>
      [-1, 1].some((j) => relativa(m.rei, b, 1, j) === dama) &&
      doPerdedor(m, relativa(m.rei, b, 1, 0)) &&
      m
        .atacantes(dama!)
        .some((a) => (a === relativa(m.rei, b, 2, 0) && tipoEm(m, a) === "p") || tipoEm(m, a) === "b"),
  );
};

/** **Lolli** — a dama logo à frente do rei, na primeira fileira, apoiada por um peão na diagonal atrás dela. */
export const lolliMate: DetectorDeMate = (m) => {
  const dama = soUmXeque(m);
  if (tipoEm(m, dama) !== "q") return false;
  return fileirasDoRei(m.rei).some(
    (b) =>
      relativa(m.rei, b, 1, 0) === dama &&
      m.atacantes(dama!).some((a) => tipoEm(m, a) === "p" && [-1, 1].some((j) => relativa(m.rei, b, 2, j) === a)),
  );
};

/** **Anderssen** — torre ou dama colada ao rei ao longo da primeira fileira, apoiada por um peão logo à frente do rei. */
export const anderssenMate: DetectorDeMate = (m) => {
  const peca = soUmXeque(m);
  const tipo = tipoEm(m, peca);
  if (tipo !== "r" && tipo !== "q") return false;
  return fileirasDoRei(m.rei).some((b) => {
    const peao = relativa(m.rei, b, 1, 0);
    return (
      [-1, 1].some((j) => relativa(m.rei, b, 0, j) === peca) &&
      tipoEm(m, peao) === "p" &&
      m.atacantes(peca!).includes(peao!)
    );
  });
};

/**
 * **Cozio** — a cauda de andorinha com a dama do lado da borda. Não vira tema:
 * acrescenta `dovetailMate`, porque é a mesma figura (as duas casas do lado
 * oposto à dama tapadas pelas peças do rei, as outras vazias).
 */
export const cozioMate: DetectorDeMate = (m) => {
  const dama = soUmXeque(m);
  if (tipoEm(m, dama) !== "q" || naBorda(m.rei) || !naBorda(dama!)) return false;
  const [rc, rf] = coord(m.rei);
  const [dc, df] = coord(dama!);
  const sc = dc - rc;
  const sf = df - rf;
  if (Math.abs(sc) !== 1 || Math.abs(sf) !== 1) return false;
  const tapadas = [casa(rc - sc, rf), casa(rc, rf - sf)];
  if (!tapadas.every((c) => doPerdedor(m, c))) return false;
  return m.vizinhas.every((v) => v.casa === dama || tapadas.includes(v.casa) || !v.ocupante);
};

/**
 * **Mate de peão** — quem dá o mate é um peão que acabou de andar (sem promoção
 * e sem xeque descoberto), com ao menos um peão do rei colado a ele.
 */
export const pawnMate: DetectorDeMate = (m) => {
  const peao = soUmXeque(m);
  if (tipoEm(m, peao) !== "p") return false;
  if (m.ultimo.para !== peao || m.ultimo.peca !== "p" || m.ultimo.promocao) return false;
  return m.vizinhas.some((v) => v.ocupante?.cor === m.perdedor && v.ocupante.tipo === "p");
};

/**
 * **Asfixia** — o cavalo dá xeque; as casas vazias em volta do rei (ao menos
 * uma) são cobertas só por bispos; as ocupadas são todas peças do rei. E o mate
 * é de cavalo e bispo: sem as outras peças continua mate. Sem essa trava, 8 em
 * 40 eram mates em que uma torre cravava a peça que tomaria o cavalo.
 */
export const suffocationMate: DetectorDeMate = (m) => {
  const cavalo = soUmXeque(m);
  if (tipoEm(m, cavalo) !== "n") return false;
  const livres = vazias(m);
  if (livres.length === 0) return false;
  if (!m.vizinhas.every((v) => !v.ocupante || v.ocupante.cor === m.perdedor)) return false;
  if (!livres.every((v) => v.atacantes.length > 0 && v.atacantes.every((a) => tipoEm(m, a) === "b"))) return false;
  return m.continuaMate((_, p) => p.tipo === "n" || p.tipo === "b");
};

/**
 * **Greco** — rei no canto; torre ou dama dá xeque **pela coluna** da borda, de
 * longe (duas casas ou mais); a casa da diagonal de dentro tapada por peça dele;
 * a outra casa da fileira, **vazia**, coberta por um bispo.
 *
 * Pela coluna, e não pela fileira: com o xeque pela última fileira, a mesma
 * geometria se lê como mate do corredor (14 em 36 na auditoria de 16/9). Vazia:
 * com um peão dele ali, o bispo não tira fuga nenhuma (4 em 40).
 */
export const grecoMate: DetectorDeMate = (m) => {
  const peca = soUmXeque(m);
  const tipo = tipoEm(m, peca);
  if (tipo !== "r" && tipo !== "q") return false;
  const [rc, rf] = coord(m.rei);
  if ((rc !== 0 && rc !== 7) || (rf !== 0 && rf !== 7)) return false;
  const dc = rc === 0 ? 1 : -1;
  const df = rf === 0 ? 1 : -1;
  const [pc, pf] = coord(peca!);
  if (pc !== rc || Math.abs(pf - rf) < 2) return false;
  const outra = casa(rc + dc, rf);
  if (!outra || m.peca(outra) || !doPerdedor(m, casa(rc + dc, rf + df))) return false;
  return m.atacantes(outra).some((a) => tipoEm(m, a) === "b");
};

/**
 * **Max Lange** — rei na borda; a dama colada na diagonal, apoiada por um bispo
 * colado nela, e esse bispo também cobre uma casa de fuga.
 *
 * O bispo tem de tirar uma fuga **que a dama não tira**: sem isso, é o mate
 * comum de dama apoiada (Qh7# com o bispo em g6), e a auditoria de 16/9 achou 20
 * desses em 22.
 *
 * Com o rei na primeira fileira e uma peça dele logo à frente, a mesma figura é
 * um **Damiano** apoiado por bispo (Praticar, Damiano #2) — e fica só Damiano.
 */
export const maxLangeMate: DetectorDeMate = (m) => {
  const dama = soUmXeque(m);
  if (tipoEm(m, dama) !== "q" || !naBorda(m.rei) || damianoMate(m)) return false;
  const [rc, rf] = coord(m.rei);
  const [dc, df] = coord(dama!);
  if (Math.abs(dc - rc) !== 1 || Math.abs(df - rf) !== 1) return false;
  const fugas = vazias(m);
  return m
    .atacantes(dama!)
    .some(
      (b) =>
        tipoEm(m, b) === "b" &&
        distancia(b, dama!) === 1 &&
        fugas.some((v) => v.atacantes.includes(b) && !v.atacantes.includes(dama!) && tapadaNoMeio(m, dama!, v.casa)),
    );
};

/**
 * A casa entre `a` e `b`, quando as duas estão a dois passos em linha, tem peça
 * do rei? É o g7 do Max Lange (dama em g8, fuga em g6): a dama não alcança g6
 * **porque o peão dele tapa** — na auditoria de 16/9, os quatro casos em que
 * ali havia peça de quem ataca eram bateria ou muro de peões, e não Max Lange.
 */
function tapadaNoMeio(m: Mate, a: Square, b: Square): boolean {
  const [ac, af] = coord(a);
  const [bc, bf] = coord(b);
  if ((ac - bc) % 2 !== 0 || (af - bf) % 2 !== 0 || distancia(a, b) !== 2) return false;
  return doPerdedor(m, casa((ac + bc) / 2, (af + bf) / 2));
}

/** As peças do vencedor que cobrem as casas vazias em volta do rei e a casa de quem dá xeque. */
function quemCobre(m: Mate, extras: readonly Square[]): Set<Square> {
  const cobre = new Set<Square>();
  for (const v of vazias(m)) for (const a of v.atacantes) cobre.add(a);
  for (const c of extras) for (const a of m.atacantes(c)) cobre.add(a);
  return cobre;
}

/**
 * **Blackburne** — rei na primeira ou última fileira; um bispo dá o mate; quem
 * cobre as casas são só bispos (dois, contando o do mate) e cavalo (ao menos um).
 */
export const blackburneMate: DetectorDeMate = (m) => {
  const bispo = soUmXeque(m);
  if (tipoEm(m, bispo) !== "b") return false;
  const [, rf] = coord(m.rei);
  if (rf !== 0 && rf !== 7) return false;
  const cobre = quemCobre(m, [bispo!]);
  cobre.add(bispo!);
  const tipos = [...cobre].map((c) => tipoEm(m, c));
  if (
    !tipos.every((t) => t === "b" || t === "n") ||
    tipos.filter((t) => t === "b").length < 2 ||
    !tipos.includes("n") ||
    !m.continuaMate((_, p) => p.tipo === "b" || p.tipo === "n")
  ) {
    return false;
  }
  // Os dois bispos e um cavalo são necessários: só com as peças menores, tirar
  // qualquer bispo desfaz o mate, e tirar algum cavalo também. Sem isso, 7 em
  // 40 eram mate de dois bispos com um cavalo de enfeite (auditoria de 16/9).
  const menores = (tirar: Square) => (c: Square, p: { tipo: string }) => c !== tirar && (p.tipo === "b" || p.tipo === "n");
  const bispos = [...cobre].filter((c) => tipoEm(m, c) === "b");
  const cavalos = [...cobre].filter((c) => tipoEm(m, c) === "n");
  return (
    bispos.every((b) => !m.continuaMate(menores(b))) && cavalos.some((n) => !m.continuaMate(menores(n)))
  );
};

/**
 * **Réti** — rei fora da borda; um bispo colado dá xeque, apoiado por torre ou
 * dama **em linha reta** (coluna ou fileira); três ou mais casas em volta do rei
 * tapadas pelas peças dele; e o mate é desses dois: só com o bispo e quem o
 * apoia, continua mate.
 *
 * A dama atrás do bispo na mesma diagonal é bateria, e não Réti (11 em 35 na
 * auditoria de 16/9).
 */
export const retiMate: DetectorDeMate = (m) => {
  const bispo = soUmXeque(m);
  if (tipoEm(m, bispo) !== "b" || naBorda(m.rei) || distancia(bispo!, m.rei) !== 1) return false;
  const [bc, bf] = coord(bispo!);
  const apoios = m.atacantes(bispo!).filter((a) => {
    const [ac, af] = coord(a);
    return (tipoEm(m, a) === "r" || tipoEm(m, a) === "q") && (ac === bc || af === bf);
  });
  if (apoios.length === 0) return false;
  if (m.vizinhas.filter((v) => v.ocupante?.cor === m.perdedor).length < 3) return false;
  // Na posição real, toda fuga é fechada pelo bispo ou por quem o apoia, e
  // nenhuma outra peça de quem ataca encosta no rei (3 em 40 na auditoria de
  // 16/9 dependiam do rei atacante ou de um peão dentro do campo do rei).
  const figura = [bispo!, ...apoios];
  const fugasOk = m.vizinhas.every(
    (v) => v.ocupante?.cor === m.perdedor || v.casa === bispo || v.atacantes.some((a) => figura.includes(a)),
  );
  const intrusos = m.vizinhas.some((v) => v.ocupante?.cor === m.vencedor && v.casa !== bispo);
  return fugasOk && !intrusos && m.continuaMate((c) => c === bispo || apoios.includes(c));
};

/**
 * **Légal** — o cavalo dá xeque; um bispo colado ao rei em linha reta, defendido
 * pelo outro cavalo; só peças menores cobrem as casas.
 */
export const legalMate: DetectorDeMate = (m) => {
  const cavalo = soUmXeque(m);
  if (tipoEm(m, cavalo) !== "n") return false;
  const [rc, rf] = coord(m.rei);
  const bispos = [casa(rc + 1, rf), casa(rc - 1, rf), casa(rc, rf + 1), casa(rc, rf - 1)].filter(
    (c): c is Square => !!c && tipoEm(m, c) === "b" && m.peca(c)?.cor === m.vencedor,
  );
  return bispos.some((b) => {
    if (!m.atacantes(b).some((a) => a !== cavalo && tipoEm(m, a) === "n")) return false;
    return [...quemCobre(m, [cavalo!, b])].every((c) => tipoEm(m, c) === "n" || tipoEm(m, c) === "b");
  });
};

/**
 * Validador de **`epauletteMate`** — dama ou torre dá xeque em linha reta, de
 * duas casas ou mais; as duas casas coladas ao rei, dos lados dessa linha,
 * tapadas por peças dele (as "dragonas").
 *
 * Outras peças podem fechar **até duas** fugas: é o que as posições 2 e 3 do
 * Praticar fazem (cavalo e bispo), e exigir menos as reprovaria. Com três ou
 * quatro, a rede é de outras peças e as dragonas estão lá por acaso — 7 em 40
 * na segunda auditoria (16/9), todos com 3 ou 4.
 */
export const epauletteMate: DetectorDeMate = (m) => {
  const peca = soUmXeque(m);
  const tipo = tipoEm(m, peca);
  if (tipo !== "q" && tipo !== "r") return false;
  const [rc, rf] = coord(m.rei);
  const [pc, pf] = coord(peca!);
  if (pc !== rc && pf !== rf) return false;
  if (distancia(peca!, m.rei) < 2) return false;
  const lados = pc === rc ? [casa(rc - 1, rf), casa(rc + 1, rf)] : [casa(rc, rf - 1), casa(rc, rf + 1)];
  return lados.every((c) => doPerdedor(m, c)) && fugasDeFora(m, [peca!]) <= 2;
};

/**
 * Validador de **`operaMate`** — rei na borda; a torre dá xeque colada a ele,
 * ao longo da borda, defendida por um bispo; das fugas, no máximo uma fechada
 * por peça que não é a torre nem esse bispo. A tag do Lichess acertava 19 em 40:
 * quase todos os outros tinham o rei fora da borda.
 */
export const operaMate: DetectorDeMate = (m) => {
  const torre = soUmXeque(m);
  if (tipoEm(m, torre) !== "r" || distancia(torre!, m.rei) !== 1) return false;
  const [rc, rf] = coord(m.rei);
  const [tc, tf] = coord(torre!);
  const aoLongoDaBorda = (tf === rf && (rf === 0 || rf === 7)) || (tc === rc && (rc === 0 || rc === 7));
  if (!aoLongoDaBorda) return false;
  const bispos = m.atacantes(torre!).filter((a) => tipoEm(m, a) === "b");
  return bispos.length > 0 && fugasDeFora(m, [torre!, ...bispos]) <= 1;
};

/**
 * Validador de **`pillsburysMate`** — o rei no canto ou colado nele, na última
 * fileira; a torre dá xeque **pela coluna** do rei; um bispo tira sozinho ao
 * menos uma fuga; das fugas, no máximo uma fechada por outra peça. Pela fileira,
 * é o mate do corredor com o bispo tirando a luft — a tag do Lichess acertava 8
 * em 40.
 *
 * E a torre dá o mate **de longe** (duas casas ou mais), como no Praticar: com
 * ela colada ao rei e defendida por outra peça (19 em 40 na segunda auditoria),
 * a figura é outra.
 */
export const pillsburysMate: DetectorDeMate = (m) => {
  const torre = soUmXeque(m);
  if (tipoEm(m, torre) !== "r" || distancia(torre!, m.rei) < 2) return false;
  const [rc, rf] = coord(m.rei);
  if ((rf !== 0 && rf !== 7) || (rc > 1 && rc < 6)) return false;
  if (coord(torre!)[0] !== rc) return false;
  const bispos = pecasDo(m, "b");
  const soDoBispo = vazias(m).some(
    (v) => v.atacantes.some((a) => bispos.includes(a)) && !v.atacantes.includes(torre!),
  );
  // Rei no canto, peça dele na diagonal de dentro e o bispo na outra casa da
  // fileira é Greco (Praticar, Greco #2) — fica só Greco.
  return soDoBispo && fugasDeFora(m, [torre!, ...bispos]) <= 1 && !grecoMate(m);
};

/**
 * Validador de **`morphysMate`** — rei na borda; o bispo dá o mate com o próprio
 * lance, sozinho no xeque; torre (ou torres) prende o rei; das fugas, no máximo
 * uma fechada por peça que não é o bispo nem torre. A tag do Lichess acertava 19
 * em 40.
 *
 * O bispo dá o mate **de longe** (duas casas ou mais), como no Praticar: colado
 * ao rei e defendido pela torre (10 em 40 na segunda auditoria), é outra figura.
 */
export const morphysMate: DetectorDeMate = (m) => {
  const bispo = soUmXeque(m);
  if (tipoEm(m, bispo) !== "b" || m.ultimo.para !== bispo || !naBorda(m.rei)) return false;
  if (distancia(bispo!, m.rei) < 2) return false;
  const torres = pecasDo(m, "r");
  const prende = m.vizinhas.some((v) => v.atacantes.some((a) => torres.includes(a)));
  return prende && fugasDeFora(m, [bispo!, ...torres]) <= 1;
};

/**
 * Validador de **`killBoxMate`** — torre ou dama colada ao rei em linha reta dá
 * xeque, apoiada por uma dama a dois passos na diagonal; as duas fecham um
 * quadrado de 3×3 com o rei dentro.
 */
export const killBoxMate: DetectorDeMate = (m) => {
  const peca = soUmXeque(m);
  const tipo = tipoEm(m, peca);
  if ((tipo !== "r" && tipo !== "q") || distancia(peca!, m.rei) !== 1) return false;
  const [rc, rf] = coord(m.rei);
  const [pc, pf] = coord(peca!);
  if (pc !== rc && pf !== rf) return false;
  return m.atacantes(peca!).some((d) => {
    if (tipoEm(m, d) !== "q") return false;
    const [dc, df] = coord(d);
    if (Math.abs(dc - pc) !== 2 || Math.abs(df - pf) !== 2) return false;
    return rc >= Math.min(dc, pc) && rc <= Math.max(dc, pc) && rf >= Math.min(df, pf) && rf <= Math.max(df, pf);
  });
};

/**
 * Validador de **`balestraMate`** — o bispo dá o mate **de longe** (duas casas
 * ou mais), com o próprio lance, e sozinho no xeque. A auditoria de 16/9 achou
 * 9 em 40 sem isso: bispo colado ao rei defendido por outra peça (o Bxf7# de
 * coice, que é outro mate) e xeque duplo em que quem anda é o cavalo.
 */
export const balestraMate: DetectorDeMate = (m) => {
  const bispo = soUmXeque(m);
  if (tipoEm(m, bispo) !== "b" || m.ultimo.para !== bispo || distancia(bispo!, m.rei) < 2) return false;
  // O mate é de bispo e dama: sem as outras peças, continua mate. Sem isso,
  // Morphy (bispo e torre) e Boden (dois bispos) passavam por balestra.
  return m.continuaMate((c, p) => c === bispo || p.tipo === "q");
};

/**
 * Validador de **`cornerMate`** — o rei **no canto**, e o cavalo dá o mate.
 * Sem o canto, a tag do Lichess acertava 13 em 40 (auditoria de 16/9).
 */
export const cornerMate: DetectorDeMate = (m) => {
  const [rc, rf] = coord(m.rei);
  return (rc === 0 || rc === 7) && (rf === 0 || rf === 7) && tipoEm(m, soUmXeque(m)) === "n";
};

/**
 * Validador de **`blindSwineMate`** — o rei na última fileira dele, e a peça do
 * mate e outra torre ou dama, as duas na fileira logo à frente (a 7ª contra as
 * pretas). A tag do Lichess acertava 4 em 40: a maioria eram torres dobradas
 * numa coluna, que é outro mate.
 */
export const blindSwineMate: DetectorDeMate = (m) => {
  const peca = soUmXeque(m);
  const tipo = tipoEm(m, peca);
  if (tipo !== "r" && tipo !== "q") return false;
  const ultima = m.perdedor === "b" ? 7 : 0;
  const frente = m.perdedor === "b" ? 6 : 1;
  const [, rf] = coord(m.rei);
  if (rf !== ultima || coord(peca!)[1] !== frente) return false;
  for (let c = 0; c < 8; c++) {
    const outra = casa(c, frente)!;
    const p = m.peca(outra);
    if (outra !== peca && p?.cor === m.vencedor && (p.tipo === "r" || p.tipo === "q")) return true;
  }
  return false;
};

/* ------------------------------------------------------------------ *
 * Táticas: olham a linha inteira, não só o fim
 * ------------------------------------------------------------------ */

/**
 * No puzzle do Lichess, `lances[0]` é o erro do adversário; quem resolve joga
 * os de índice ímpar. As táticas abaixo olham os lances de quem resolve.
 */
type DetectorDeLinha = (fen: string, lances: readonly string[]) => boolean;

/** Joga um lance em UCI no jogo e devolve o lance feito, ou `null` se ilegal. */
function jogarUci(jogo: Chess, uci: string) {
  try {
    return jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  } catch {
    return null;
  }
}

/**
 * **Sacrifício grego** — contra o rei rocado em g8/h8 (g1/h1, sem torre dele no
 * canto), o primeiro lance de quem resolve é o bispo tomando em h7 (h2) com
 * xeque; no 2º ou 3º lance dele, o cavalo **salta** para g5 (g4) ou a dama
 * **chega** a h5 (h4); e a linha termina em mate ou colhendo perto do rei.
 *
 * A primeira auditoria (16/9) achou 19 em 40 sem essas travas: Bxh7+ que só
 * descobre outra peça, que tira o defensor de h7 para um mate de dama, com
 * cavalo e dama já postos, ou que termina num garfo longe do rei.
 *
 * E mais três, da segunda (3 em 40): a resposta dele é tomar em h7 (rei ou
 * cavalo) ou fugir para h8; o salto do cavalo e a chegada da dama não são
 * capturas; e tudo o que quem resolve captura depois cai nas colunas f, g ou h —
 * o ataque é ao roque, e não um garfo do outro lado.
 */
export const greekGift: DetectorDeLinha = (fen, lances) => {
  const primeiro = lances[1];
  if (!primeiro || (primeiro.slice(2, 4) !== "h7" && primeiro.slice(2, 4) !== "h2")) return false;
  const jogo = new Chess(fen);
  if (!jogarUci(jogo, lances[0])) return false;
  const vez = jogo.turn();
  const brancas = vez === "w";
  const rei = jogo.findPiece({ type: "k", color: brancas ? "b" : "w" })[0];
  if (!(brancas ? ["g8", "h8"] : ["g1", "h1"]).includes(rei)) return false;
  const canto = lerPeca(jogo, brancas ? "h8" : "h1");
  if (canto?.tipo === "r" && canto.cor !== vez) return false;

  const sac = jogarUci(jogo, primeiro);
  if (!sac || sac.piece !== "b" || !sac.captured || !/[+#]/.test(sac.san)) return false;
  const resposta = lances[2];
  const tomou = resposta?.slice(2, 4) === sac.to;
  const fugiu = resposta?.slice(2, 4) === (brancas ? "h8" : "h1") && resposta.slice(0, 2) === rei;
  if (!tomou && !fugiu) return false;

  let chegou = false;
  let ultimo = sac;
  for (let i = 2; i < lances.length; i++) {
    const m = jogarUci(jogo, lances[i]);
    if (!m) return false;
    if (m.color !== vez) continue;
    ultimo = m;
    if (m.captured && !"fgh".includes(m.to[0])) return false;
    if (
      i <= 5 &&
      !m.captured &&
      ((m.piece === "n" && m.to === (brancas ? "g5" : "g4")) || (m.piece === "q" && m.to === (brancas ? "h5" : "h4")))
    ) {
      chegou = true;
    }
  }
  if (!chegou) return false;
  if (jogo.isCheckmate()) return true;
  const reiNoFim = jogo.findPiece({ type: "k", color: brancas ? "b" : "w" })[0];
  return distancia(ultimo.to, reiNoFim) <= 2;
};

/**
 * **Contra-xeque** — quem resolve **começa** em xeque e o primeiro lance dele,
 * sem mexer o rei, tapa ou captura dando xeque. Fica de fora a troca em que esse
 * lance captura e é retomado na mesma casa sem a linha terminar em mate: ali o
 * xeque é de passagem (a primeira auditoria, 16/9, achou 30 em 40 assim).
 */
export const counterCheck: DetectorDeLinha = (fen, lances) => {
  if (lances.length < 2) return false;
  const jogo = new Chess(fen);
  if (!jogarUci(jogo, lances[0]) || !jogo.inCheck()) return false;
  const resposta = jogarUci(jogo, lances[1]);
  if (!resposta || resposta.piece === "k" || !/[+#]/.test(resposta.san)) return false;
  for (const uci of lances.slice(2)) if (!jogarUci(jogo, uci)) return false;
  const retomada = resposta.captured && lances[2]?.slice(2, 4) === resposta.to;
  return !retomada || jogo.isCheckmate();
};

const VALOR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** A peça em `c` está perdida: atacada, e sem defesa ou atacada por peça que vale menos. */
function perdida(jogo: Chess, c: Square): boolean {
  const quem = jogo.get(c);
  if (!quem || quem.type === "k" || quem.type === "p") return false;
  const atacantes = jogo.attackers(c, quem.color === "w" ? "b" : "w");
  if (atacantes.length === 0) return false;
  return jogo.attackers(c, quem.color).length === 0 || atacantes.some((a) => VALOR[jogo.get(a)!.type] < VALOR[quem.type]);
}

/**
 * **Desperado** — há peças penduradas dos dois lados desde o começo do puzzle.
 * O adversário acaba de deixar uma peça de quem resolve perdida (atacada, e sem
 * defesa ou atacada por peça menor); **no primeiro lance**, em vez de salvá-la,
 * ela captura uma peça que vale menos e é tomada no lance seguinte; quem resolve
 * não retoma na mesma casa; e mais adiante colhe uma peça dele de valor 3 ou
 * mais **que já estava pendurada** — com a mesma peça que já a atacava antes do
 * primeiro lance. A linha não termina em mate.
 *
 * Cada trava saiu das auditorias de 16/9. Na primeira (5 em 40): retomar na
 * mesma casa é troca comum, terminar em mate é sacrifício. Na segunda (15 em
 * 40): a segunda peça colhida aparecia por garfo, desvio ou descoberta — e aí a
 * ideia do puzzle é essa outra tática, e não vender caro a peça perdida.
 */
export const desperado: DetectorDeLinha = (fen, lances) => {
  if (lances.length < 4) return false;
  const jogo = new Chess(fen);
  if (!jogarUci(jogo, lances[0])) return false;
  const inicio = new Chess(jogo.fen());
  const de = lances[1].slice(0, 2) as Square;
  const quem = jogo.get(de);
  if (!quem || !perdida(jogo, de)) return false;
  const anterior = jogo.undo();
  const ameacaNova = !perdida(jogo, de);
  if (anterior) jogo.move(anterior);
  if (!ameacaNova) return false;

  const feitos = [];
  for (const uci of lances.slice(1)) {
    const m = jogarUci(jogo, uci);
    if (!m) return false;
    feitos.push(m);
  }
  if (jogo.isCheckmate()) return false;
  const [vende, toma, depois] = feitos;
  if (!vende.captured || VALOR[vende.captured] >= VALOR[quem.type]) return false;
  if (toma.to !== vende.to || depois.to === vende.to) return false;

  return feitos.some((m, j) => {
    if (j < 2 || j % 2 === 1 || !m.captured || VALOR[m.captured] < 3) return false;
    const alvo = inicio.get(m.to);
    const atacante = inicio.get(m.from);
    return (
      alvo?.type === m.captured &&
      alvo.color !== quem.color &&
      atacante?.type === m.piece &&
      atacante.color === quem.color &&
      inicio.attackers(m.to, quem.color).includes(m.from)
    );
  });
};

/* ------------------------------------------------------------------ *
 * A etiquetagem
 * ------------------------------------------------------------------ */

/** Os detectores de mate que viram tag com o mesmo nome. */
export const PADROES_DE_MATE = {
  damianoMate,
  lolliMate,
  anderssenMate,
  pawnMate,
  suffocationMate,
  grecoMate,
  maxLangeMate,
  blackburneMate,
  retiMate,
  legalMate,
} as const;

export const TATICAS_NOSSAS = { greekGift, counterCheck, desperado } as const;

/** Tags do Lichess que só ficam se o validador confirmar. */
export const VALIDADORES = {
  epauletteMate,
  killBoxMate,
  balestraMate,
  cornerMate,
  blindSwineMate,
  operaMate,
  pillsburysMate,
  morphysMate,
} as const;

/**
 * Todas as tags que a etiquetagem decide — o `# governa:` do arquivo lateral.
 * `dovetailMate` entra porque o Cozio a acrescenta.
 */
export const TAGS_GOVERNADAS: readonly string[] = [
  ...Object.keys(PADROES_DE_MATE),
  ...Object.keys(TATICAS_NOSSAS),
  ...Object.keys(VALIDADORES),
  "dovetailMate",
];

/**
 * As tags governadas que este puzzle leva: as nossas que os detectores acharam,
 * as do Lichess que os validadores confirmaram, e `dovetailMate` se o Lichess a
 * deu ou se é um Cozio.
 */
export function etiquetar(p: { fen: string; lances: readonly string[]; temas: readonly string[] }): string[] {
  const tags: string[] = [];
  const mate = p.temas.includes("mate") ? mateFinal(p.fen, p.lances) : null;

  if (mate) {
    for (const [tag, detector] of Object.entries(PADROES_DE_MATE)) if (detector(mate)) tags.push(tag);
    for (const [tag, validador] of Object.entries(VALIDADORES)) {
      if (p.temas.includes(tag) && validador(mate)) tags.push(tag);
    }
    if (p.temas.includes("dovetailMate") || cozioMate(mate)) tags.push("dovetailMate");
  } else if (p.temas.includes("dovetailMate")) {
    tags.push("dovetailMate");
  }

  for (const [tag, detector] of Object.entries(TATICAS_NOSSAS)) if (detector(p.fen, p.lances)) tags.push(tag);
  return tags;
}
