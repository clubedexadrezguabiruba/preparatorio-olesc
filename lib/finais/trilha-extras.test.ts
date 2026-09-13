import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { aulasDoNivel, fechamentoDoNivel, proximoPasso, temasDoNivel, type ProgressoParaONivel } from "../curso/nivel.ts";
import { METAS, type Feitos } from "../tatica/serie.ts";
import { montarMapa } from "../curso/mapa.ts";
import { somarFinais } from "../tarefas/estado.ts";
import { extrasPublicadas, publicadasEmDisco } from "./trilha-em-disco.ts";
import { AULA_ZERADA, aulaDaTrilha, aulasAbertas, extrasDaTrilha, ORDEM_DAS_EXTRAS, TRILHA, trilhaCompleta } from "./trilha.ts";

/**
 * Aulas extras na trilha por dados — §22, parada 8E.
 *
 * A trilha continua sendo as 49 escritas em código; as extras entram por
 * `trilhaCompleta(extras)`, e toda conta que pergunta pela trilha recebe `extras`.
 */

const EXTRA = { id: "EX-OPOSICAO-EXTRA", titulo: "Oposição, com mais exemplos", metadados: { nivel: 2, classe: "D" } };

test("extras da trilha: só EX- com nível 1–5 e classe; ordem depois das 49; sem colidir", () => {
  const extras = extrasDaTrilha([
    EXTRA,
    { id: "EX-SEM-NIVEL", titulo: "x", metadados: { classe: "D" } },
    { id: "EX-SEM-CLASSE", titulo: "x", metadados: { nivel: 3 } },
    { id: "EX-NIVEL-ZERO", titulo: "x", metadados: { nivel: 0, classe: "E" } },
    { id: "N1-KPK", titulo: "colide com a trilha", metadados: { nivel: 2, classe: "D" } },
    { id: "EX-A-PRIMEIRA", titulo: "nível 1", metadados: { nivel: 1, classe: "E" } },
  ]);
  assert.deepEqual(extras.map((a) => a.id), ["EX-A-PRIMEIRA", "EX-OPOSICAO-EXTRA"]);
  assert.ok(extras.every((a) => a.extra === true && a.ordem >= ORDEM_DAS_EXTRAS));
  assert.equal(TRILHA.length, 49);
  assert.equal(trilhaCompleta().length, 49);
  assert.equal(trilhaCompleta(extras).length, 51);
  assert.equal(new Set(trilhaCompleta(extras).map((a) => a.id)).size, 51, "nenhum id repetido");
  assert.equal(aulaDaTrilha("EX-OPOSICAO-EXTRA"), undefined, "sem extras, a extra não é da trilha");
  assert.equal(aulaDaTrilha("EX-OPOSICAO-EXTRA", extras)?.nivel, 2);
  assert.equal(aulaDaTrilha("N1-KPK", extras)?.extra, undefined);
});

test("a extra publicada abre na trilha e soma na classe dela", () => {
  const extras = extrasDaTrilha([EXTRA]);
  const publicadas = new Set(["N1-KPK", "EX-OPOSICAO-EXTRA"]);
  assert.deepEqual(aulasAbertas(publicadas).map((a) => a.id), ["N1-KPK"]);
  assert.deepEqual(aulasAbertas(publicadas, extras).map((a) => a.id), ["N1-KPK", "EX-OPOSICAO-EXTRA"]);
  assert.equal(somarFinais(new Set(["EX-OPOSICAO-EXTRA"]), ["D"]), 0);
  assert.equal(somarFinais(new Set(["EX-OPOSICAO-EXTRA"]), ["D"], extras), 1);
});

function progresso(extras = extrasDaTrilha([EXTRA]), comExtras = true): ProgressoParaONivel {
  return {
    temas: new Map(),
    finais: new Map(),
    publicadas: new Set(["N0-LADDER", "N0-MATING-MATERIAL", "N1-KPK", "EX-OPOSICAO-EXTRA"]),
    comPratica: new Set(["N0-LADDER", "N0-MATING-MATERIAL", "N1-KPK", "EX-OPOSICAO-EXTRA"]),
    linhasAprendidas: 0,
    baseCompleto: false,
    ...(comExtras ? { extras } : {}),
  };
}

test("fechamento do nível: a extra no nível 2 leva as exigidas de 1 para 2", () => {
  const sem = fechamentoDoNivel(2, progresso(undefined, false));
  const com = fechamentoDoNivel(2, progresso());
  assert.deepEqual(sem.finais, { feitos: 0, exigidas: 1, declaradas: 4, publicadas: 1 });
  assert.deepEqual(com.finais, { feitos: 0, exigidas: 2, declaradas: 4, publicadas: 2 });
  assert.deepEqual(fechamentoDoNivel(1, progresso()).finais, fechamentoDoNivel(1, progresso(undefined, false)).finais, "o nível 1 não muda");
  assert.equal(aulasDoNivel(2, progresso().extras).at(-1)?.id, "EX-OPOSICAO-EXTRA", "a extra vem depois das aulas do curso");
});

test("o próximo passo e o mapa enxergam a extra", () => {
  const fechado: Feitos = { aquecimento: METAS.aquecimento, serie: METAS.serie, prova: METAS.prova };
  const kpkAprendida = { ...AULA_ZERADA, praticaOk: true, tentativas: 3, escada: { degrau: 3, tentativas: 3, erros: 0, aprendidaEm: "2026-09-01T00:00:00Z", ultimaEm: "2026-09-10T00:00:00Z", revisarEm: "2026-09-20T00:00:00Z" } };
  const p: ProgressoParaONivel = {
    ...progresso(),
    temas: new Map(temasDoNivel(2).map((tag) => [tag, fechado])),
    finais: new Map([["N1-KPK", kpkAprendida]]),
  };
  assert.deepEqual(proximoPasso(2, { ...p, extras: undefined }, 0).tipo, "linha", "sem a extra, as aulas do nível 2 já fecharam");
  const passo = proximoPasso(2, p, 0);
  assert.equal(passo.tipo === "aula" ? passo.id : passo.tipo, "EX-OPOSICAO-EXTRA");

  const mapa = montarMapa({
    tatica: new Map(),
    temaAberto: () => true,
    finais: new Map(),
    aulasPublicadas: p.publicadas,
    aulasComPratica: p.comPratica,
    nivelDoAluno: 2,
    extras: p.extras,
  });
  const finaisDoNivel2 = mapa.get(2)!.find((m) => m.modulo === "finais")!;
  assert.ok(finaisDoNivel2.itens.some((i) => i.id === "EX-OPOSICAO-EXTRA" && i.href === "/finais/EX-OPOSICAO-EXTRA"));
});

test("em disco: a fixture EX-FIXTURE-V2 é lida como extra, e a trilha passa de 49 para 50", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "trilha-extras-"));
  try {
    cpSync("content/fixtures/aulas-v2/EX-FIXTURE-V2", path.join(raiz, "aulas-v2", "EX-FIXTURE-V2"), { recursive: true });
    cpSync("content/fixtures/aulas-v2/N0-FIXTURE-V2", path.join(raiz, "aulas-v2", "N0-FIXTURE-V2"), { recursive: true });
    const extras = extrasPublicadas(raiz);
    assert.deepEqual(extras.map((a) => [a.id, a.nivel, a.classe]), [["EX-FIXTURE-V2", 1, "E"]]);
    assert.equal(trilhaCompleta(extras).length, 50);
    assert.deepEqual([...publicadasEmDisco(raiz)].sort(), ["EX-FIXTURE-V2", "N0-FIXTURE-V2"]);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});
