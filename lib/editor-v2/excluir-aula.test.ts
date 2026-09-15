/**
 * Excluir aula com lixeira (pedido do Doug, 14/9/2026): o que sai, o que fica, e a volta byte a byte.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { excluirAulaV2, impactoDaExclusaoV2, lixeiraV2, restaurarAulaV2 } from "./excluir-aula.ts";
import { prepararNovaAula } from "./nova-aula.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;

function escrever(raiz: string, relativo: string, texto: string) {
  const absoluto = path.join(raiz, relativo);
  mkdirSync(path.dirname(absoluto), { recursive: true });
  writeFileSync(absoluto, texto);
}

/** Uma aula extra vazia que declara usar estas posições (pela proveniência). */
function aula(raiz: string, id: string, titulo: string, posicoes: string[]) {
  const preparo = prepararNovaAula({ titulo, tipo: "extra", nivel: 1, orientacaoPadrao: "white", criterioDominio: "D1", classe: "E" }, new Set());
  assert.ok(preparo.ok);
  const documento = { ...preparo.aula, id, proveniencia: posicoes.map((positionId) => ({ positionId, conteudoHash: "a".repeat(64), estado: "candidate" })) };
  escrever(raiz, `.editor/v2/${id}.json`, `${JSON.stringify(documento, null, 2)}\n`);
}

function projeto() {
  const raiz = mkdtempSync(path.join(tmpdir(), "excluir-aula-"));
  aula(raiz, "EX-DAMA", "Dama", ["pos-ex-dama-1", "pos-ex-comum-1", "pos-n1-kpk-1"]);
  aula(raiz, "EX-OUTRA", "Outra", ["pos-ex-comum-1"]);
  escrever(raiz, "content/positions/EX/pos-ex-dama-1.json", '{"id":"pos-ex-dama-1"}\n');
  escrever(raiz, "content/positions/EX/pos-ex-comum-1.json", '{"id":"pos-ex-comum-1"}\n');
  escrever(raiz, "content/positions/N1/pos-n1-kpk-1.json", '{"id":"pos-n1-kpk-1"}\n');
  escrever(raiz, ".editor/gate/v2/EX-DAMA.json", '{"conferida":true}\n');
  return raiz;
}

test("o impacto diz o que sai e o que fica: a posição só desta aula sai, a compartilhada e a do curso ficam", () => {
  const raiz = projeto();
  try {
    const lido = impactoDaExclusaoV2("EX-DAMA", raiz);
    assert.ok(lido.ok);
    assert.deepEqual(lido.impacto.posicoesQueSaem, ["pos-ex-dama-1"]);
    assert.deepEqual(lido.impacto.posicoesQueFicam, [{ id: "pos-ex-comum-1", motivo: "usada também pela aula EX-OUTRA" }]);
    assert.equal(lido.impacto.publicada, false);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test("aula do curso (série N) não se exclui pela tela", () => {
  const raiz = projeto();
  try {
    const recusa = excluirAulaV2("N1-KPK", { raiz, env: ligada });
    assert.equal(recusa.ok, false);
    assert.match(!recusa.ok ? recusa.motivo : "", /série N/);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test("excluir leva à lixeira, e restaurar devolve cada arquivo ao lugar, byte a byte", () => {
  const raiz = projeto();
  try {
    const antes = {
      aula: readFileSync(path.join(raiz, ".editor/v2/EX-DAMA.json"), "utf8"),
      gate: readFileSync(path.join(raiz, ".editor/gate/v2/EX-DAMA.json"), "utf8"),
      posicao: readFileSync(path.join(raiz, "content/positions/EX/pos-ex-dama-1.json"), "utf8"),
    };
    const excluida = excluirAulaV2("EX-DAMA", { raiz, env: ligada, agora: new Date("2026-09-14T20:00:00.000Z") });
    assert.ok(excluida.ok);
    assert.equal(excluida.nome, "EX-DAMA--20260914T200000Z");
    assert.equal(existsSync(path.join(raiz, ".editor/v2/EX-DAMA.json")), false);
    assert.equal(existsSync(path.join(raiz, "content/positions/EX/pos-ex-dama-1.json")), false);
    assert.equal(existsSync(path.join(raiz, "content/positions/EX/pos-ex-comum-1.json")), true, "a compartilhada fica");
    assert.equal(existsSync(path.join(raiz, "content/positions/N1/pos-n1-kpk-1.json")), true, "a do curso nunca sai");
    assert.deepEqual(lixeiraV2(raiz).map((item) => [item.id, item.titulo, item.arquivos]), [["EX-DAMA", "Dama", 3]]);

    const restaurada = restaurarAulaV2(excluida.nome, raiz);
    assert.ok(restaurada.ok);
    assert.equal(readFileSync(path.join(raiz, ".editor/v2/EX-DAMA.json"), "utf8"), antes.aula);
    assert.equal(readFileSync(path.join(raiz, ".editor/gate/v2/EX-DAMA.json"), "utf8"), antes.gate);
    assert.equal(readFileSync(path.join(raiz, "content/positions/EX/pos-ex-dama-1.json"), "utf8"), antes.posicao);
    assert.deepEqual(lixeiraV2(raiz), []);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test("restaurar recusa sem mexer em nada quando o identificador já foi ocupado por outra aula", () => {
  const raiz = projeto();
  try {
    const excluida = excluirAulaV2("EX-DAMA", { raiz, env: ligada });
    assert.ok(excluida.ok);
    aula(raiz, "EX-DAMA", "Dama nova", []);
    const recusa = restaurarAulaV2(excluida.nome, raiz);
    assert.equal(recusa.ok, false);
    assert.match(!recusa.ok ? recusa.motivo : "", /já existe outra aula/);
    assert.equal(existsSync(path.join(raiz, "content/positions/EX/pos-ex-dama-1.json")), false, "nada restaurado pela metade");
    assert.equal(lixeiraV2(raiz).length, 1);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test("um manifesto adulterado não escreve fora dos lugares da lixeira", () => {
  const raiz = projeto();
  try {
    const excluida = excluirAulaV2("EX-DAMA", { raiz, env: ligada });
    assert.ok(excluida.ok);
    const caminho = path.join(raiz, ".editor/v2/lixeira", excluida.nome, "manifesto.json");
    const manifesto = JSON.parse(readFileSync(caminho, "utf8"));
    manifesto.arquivos[0].de = "content/lessons/N1-KPK.json";
    writeFileSync(caminho, JSON.stringify(manifesto));
    const recusa = restaurarAulaV2(excluida.nome, raiz);
    assert.equal(recusa.ok, false);
    assert.equal(existsSync(path.join(raiz, "content/lessons/N1-KPK.json")), false);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});
