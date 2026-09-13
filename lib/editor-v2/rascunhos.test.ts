import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { documentoV2Existe, gravarDocumentoV2, idsDeDocumentosV2, lerDocumentoV2 } from "./rascunhos.ts";
import type { AulaV2 } from "./modelo.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const aula: AulaV2 = {
  schemaVersion: 2, id: "N1-KPK", titulo: "Piloto", metadados: { orientacaoPadrao: "white", criterioDominio: "D1", estadoEditorial: "rascunho" }, proveniencia: [{ positionId: "pos-a", conteudoHash: "hash-pos-a", estado: "fixture" }], excecoes: [], introducoes: [], treinos: [], praticas: [],
  analises: [{ id: "analise-a", inicio: { tipo: "posicao", positionId: "pos-a" }, raizId: "raiz-a", nos: { "raiz-a": { id: "raiz-a", filhos: [] } } }],
  capitulos: [{ id: "capitulo-a", titulo: "Capítulo", analiseId: "analise-a", inicioNodeId: "raiz-a", caminho: [], orientacao: "white", narracoes: [] }],
  fluxo: [{ id: "etapa-a", tipo: "capitulo", entidadeId: "capitulo-a" }],
};

test("v2 grava atomically, recusa hash velho e não escreve com editor desligado", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "editor-v2-"));
  try {
    const primeira = gravarDocumentoV2(aula.id, aula, "hash-do-adaptador", raiz, ligada);
    assert.equal(primeira.ok, true);
    const lida = lerDocumentoV2(aula.id, raiz);
    assert.equal(lida?.aula.titulo, "Piloto");
    const alterada = { ...aula, titulo: "Outro título" };
    const conflito = gravarDocumentoV2(aula.id, alterada, "hash-velho", raiz, ligada);
    assert.equal(conflito.ok, false);
    assert.ok(!conflito.ok && conflito.conflito);
    const desligada = gravarDocumentoV2(aula.id, alterada, lida?.hash ?? null, raiz, {} as NodeJS.ProcessEnv);
    assert.deepEqual(desligada, { ok: false, erro: "o editor local está desligado" });
    assert.equal(lerDocumentoV2(aula.id, raiz)?.aula.titulo, "Piloto");
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

/**
 * "Erro impede publicar, não salvar" (`limites.ts`, plano §7).
 *
 * O rascunho aceita pendência editorial identificada: teto estourado, lance ilegal,
 * proveniência por registrar. Só o que impede **montar** o documento — forma do schema,
 * árvore quebrada, referência a entidade que não existe — é recusado ao salvar e ao
 * reabrir. Sem isto, a aula grande demais prenderia o professor num arquivo que ele não
 * consegue nem guardar para encolher.
 */
test("rascunho com teto estourado, lance ilegal e posição sem proveniência grava e reabre", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "editor-v2-pendencia-"));
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const nos: AulaV2["analises"][number]["nos"] = { "raiz-a": { id: "raiz-a", filhos: ["no-ilegal"] }, "no-ilegal": { id: "no-ilegal", uci: "a1a8", filhos: [] } };
  const pendente: AulaV2 = {
    ...structuredClone(aula),
    proveniencia: [],
    analises: [{ id: "analise-a", inicio: { tipo: "posicao", positionId: "pos-a" }, raizId: "raiz-a", nos: { ...nos, "raiz-a": { ...nos["raiz-a"], comentario: "x".repeat(2 * 1024 * 1024 + 10) } } }],
  };
  const gravado = gravarDocumentoV2(pendente.id, pendente, null, raiz, ligada);
  assert.equal(gravado.ok, true, gravado.ok ? "" : `${gravado.erro}: ${gravado.problemas?.join("; ")}`);
  const relido = lerDocumentoV2(pendente.id, raiz);
  assert.equal(relido?.aula.analises[0].nos["no-ilegal"].uci, "a1a8");
});

test("rascunho com a árvore quebrada continua recusado ao salvar", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "editor-v2-forma-"));
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const quebrado = structuredClone(aula);
  quebrado.analises[0].nos["raiz-a"].filhos = ["nao-existe"];
  const gravado = gravarDocumentoV2(quebrado.id, quebrado, null, raiz, ligada);
  assert.equal(gravado.ok, false);
  assert.match(gravado.ok ? "" : gravado.problemas?.join(" ") ?? "", /FILHO_AUSENTE/);
});

/**
 * O id de aula extra atravessa o guardião de caminho.
 *
 * ## O defeito que este teste trava
 *
 * Achado no navegador, e não aqui: "Nova aula" (§5.2) criava um `EX-…`, o
 * `prepararNovaAula` o aprovava, e a gravação estourava dentro de
 * `caminhoDeAula`, que só conhecia `^N[0-9]+-…`. A tela mostrava um erro de
 * servidor sem explicação, e nenhum dos 966 testes tinha chegado perto: todos
 * fabricavam aulas `EX-` **em memória**, e nenhum tinha escrito uma em disco.
 *
 * A lição de método, para quem vier depois: um schema que aceita uma forma nova
 * não prova que o **caminho inteiro** a aceita. O teste que vale é o que leva a
 * forma nova até o disco.
 */
test("uma aula extra pode ser gravada e relida na pasta do v2", () => {
  const raiz = mkdtempSync(path.join(tmpdir(), "editor-v2-extra-"));
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const aula = {
    schemaVersion: 2 as const,
    id: "EX-ENSAIO-DO-DISCO",
    titulo: "Ensaio do disco",
    metadados: { orientacaoPadrao: "white" as const, criterioDominio: "D1" as const, estadoEditorial: "rascunho" as const, nivel: 1 },
    proveniencia: [],
    excecoes: [],
    analises: [],
    introducoes: [],
    capitulos: [],
    treinos: [],
    praticas: [],
    fluxo: [],
  };

  const gravado = gravarDocumentoV2("EX-ENSAIO-DO-DISCO", aula, null, raiz, ligada);
  assert.equal(gravado.ok, true, gravado.ok ? "" : gravado.erro);

  assert.equal(documentoV2Existe("EX-ENSAIO-DO-DISCO", raiz), true);
  assert.deepEqual(idsDeDocumentosV2(raiz), ["EX-ENSAIO-DO-DISCO"]);
  assert.equal(lerDocumentoV2("EX-ENSAIO-DO-DISCO", raiz)?.aula.titulo, "Ensaio do disco");

  // A trava do `../` continua de pé para os dois formatos de id.
  assert.throws(() => documentoV2Existe("../fora", raiz), /id de aula inválido/);
});
