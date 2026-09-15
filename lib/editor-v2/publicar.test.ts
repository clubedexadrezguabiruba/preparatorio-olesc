/**
 * Publicar v2 em disco — especificação §20.1, plano §13.
 *
 * O teste que manda é o da interrupção: parar depois de **cada** fase, como se o processo
 * tivesse morrido, recuperar, e conferir que o ponteiro continua íntegro e que nenhum pacote
 * ficou órfão.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { podePublicar as podePublicarV1 } from "../editor/gate.ts";
import { lessonSchema, positionSchema, type Position } from "../lesson/schema.ts";
import { lerRegua } from "../lesson/voz.ts";
import { adaptarLessonV1 } from "./adaptar-v1.ts";
import { conferirAulaV2 } from "./gate.ts";
import { problemasDoPacoteV2 } from "./pacote.ts";
import {
  desativarV2,
  prepararPublicacaoV2,
  publicacoesDaAulaV2,
  publicarAulaV2,
  reativarPublicacaoV2,
  recuperarTransacaoV2,
  type FaseDaPublicacaoV2,
} from "./publicar.ts";
import { lerPonteiroV2, lerPublicacaoCruaV2 } from "./publicacoes.ts";
import { gravarDocumentoV2, lerDocumentoV2 } from "./rascunhos.ts";

const ligada = { NODE_ENV: "development", EDITOR_LOCAL: "1", VERCEL: "" } as NodeJS.ProcessEnv;
const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/N0-LADDER.json", "utf8")));
const ARQUIVO_DA_POSICAO = "content/positions/N0/pos-n0-ladder-silman-yk7.json";
const position = positionSchema.parse(JSON.parse(readFileSync(ARQUIVO_DA_POSICAO, "utf8")));
const positions: Record<string, Position> = { [position.id]: position };
const regua = lerRegua();
const ID = "N0-LADDER";

async function pastaConferida(): Promise<string> {
  const raiz = mkdtempSync(path.join(tmpdir(), "publicar-v2-"));
  mkdirSync(path.join(raiz, "content", "positions", "N0"), { recursive: true });
  cpSync(ARQUIVO_DA_POSICAO, path.join(raiz, ARQUIVO_DA_POSICAO));
  cpSync("content/tablebase-cache", path.join(raiz, "content", "tablebase-cache"), { recursive: true });
  const conferencia = await conferirAulaV2(ID, { raiz, env: ligada, regua, documentoInicial: adaptarLessonV1(lesson, positions) });
  assert.equal(conferencia.verde, true);
  return raiz;
}

const content = (raiz: string) => path.join(raiz, "content");
const pastaDasPublicacoes = (raiz: string) => path.join(raiz, "content", "aulas-v2", ID, "publicacoes");
const publicacoesEmDisco = (raiz: string) => (existsSync(pastaDasPublicacoes(raiz)) ? readdirSync(pastaDasPublicacoes(raiz)) : []);
const restoDeTransacao = (raiz: string) => {
  const pasta = path.join(raiz, ".editor", "v2", "publicacao", ID);
  return existsSync(pasta) ? readdirSync(pasta) : [];
};

async function editarEConferir(raiz: string, titulo: string) {
  const documento = lerDocumentoV2(ID, raiz)!;
  assert.equal(gravarDocumentoV2(ID, { ...documento.aula, titulo }, documento.hash, raiz, ligada).ok, true);
  const conferencia = await conferirAulaV2(ID, { raiz, env: ligada, regua });
  assert.equal(conferencia.verde, true);
}

test("§20.1: publicar instala o pacote, troca o ponteiro e não deixa resto de transação", async () => {
  const raiz = await pastaConferida();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const preparo = await prepararPublicacaoV2(ID, raiz);
  assert.equal(preparo.ok, true);
  const resultado = await publicarAulaV2(ID, { raiz, env: ligada, impactoHash: preparo.ok ? preparo.impactoHash : "" });
  assert.equal(resultado.ok, true, resultado.ok ? "" : resultado.motivo);
  if (!resultado.ok) return;
  assert.deepEqual(lerPonteiroV2(content(raiz), ID)?.publicationId, resultado.publicationId);
  assert.equal(resultado.anterior, null);
  assert.deepEqual(problemasDoPacoteV2(lerPublicacaoCruaV2(content(raiz), ID, resultado.publicationId)), []);
  assert.deepEqual(restoDeTransacao(raiz), []);
  assert.equal(readdirSync(path.join(raiz, ".editor", "v2", "snapshots", ID)).some((nome) => nome.includes("antes-de-publicar")), true);
});

test("§13: o mesmo conteúdo dá o mesmo id, e republicar não cria outro pacote", async () => {
  const raiz = await pastaConferida();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const primeira = await publicarAulaV2(ID, { raiz, env: ligada });
  const segunda = await publicarAulaV2(ID, { raiz, env: ligada });
  assert.ok(primeira.ok && segunda.ok);
  assert.equal(segunda.publicationId, primeira.publicationId);
  assert.equal(segunda.mesmoConteudo, true);
  assert.equal(publicacoesEmDisco(raiz).length, 1);
});

for (const fase of ["candidato", "validado", "instalado", "ativado"] as FaseDaPublicacaoV2[]) {
  test(`§20.1: interrompida depois de "${fase}", a recuperação deixa o ponteiro íntegro e nenhum órfão`, async () => {
    const raiz = await pastaConferida();
    test.after(() => rmSync(raiz, { recursive: true, force: true }));
    // Uma publicação ativa antes, para o ponteiro ter o que proteger.
    const primeira = await publicarAulaV2(ID, { raiz, env: ligada });
    assert.ok(primeira.ok);
    await editarEConferir(raiz, `Título da segunda (${fase})`);

    const interrompida = await publicarAulaV2(ID, { raiz, env: ligada, pararDepoisDe: fase });
    assert.equal(!interrompida.ok && interrompida.interrompidaEm, fase);
    assert.notDeepEqual(restoDeTransacao(raiz), [], "a interrupção deixa a transação em disco");

    const recuperacao = recuperarTransacaoV2(ID, raiz);
    assert.equal(recuperacao.fase, fase);
    assert.deepEqual(restoDeTransacao(raiz), []);
    const ponteiro = lerPonteiroV2(content(raiz), ID)!;
    const emDisco = publicacoesEmDisco(raiz).map((nome) => nome.replace(/\.json$/, ""));
    if (fase === "ativado") {
      assert.equal(recuperacao.acao, "finalizada");
      assert.notEqual(ponteiro.publicationId, primeira.publicationId);
      assert.equal(ponteiro.anterior, primeira.publicationId);
      assert.deepEqual(emDisco.sort(), [primeira.publicationId, ponteiro.publicationId].sort());
    } else {
      assert.equal(recuperacao.acao, "descartada");
      assert.equal(ponteiro.publicationId, primeira.publicationId, "o aluno continua na publicação anterior");
      assert.deepEqual(emDisco, [primeira.publicationId], "nenhum pacote órfão");
    }
    // Todo pacote apontado existe e está inteiro.
    assert.deepEqual(problemasDoPacoteV2(lerPublicacaoCruaV2(content(raiz), ID, ponteiro.publicationId)), []);

    // E a publicação seguinte corre normalmente.
    const depois = await publicarAulaV2(ID, { raiz, env: ligada });
    assert.equal(depois.ok, true, depois.ok ? "" : depois.motivo);
  });
}

test("§13: bytes diferentes sob o mesmo id são recusados, e o ponteiro não muda", async () => {
  const raiz = await pastaConferida();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const primeira = await publicarAulaV2(ID, { raiz, env: ligada });
  assert.ok(primeira.ok);
  const arquivo = path.join(pastaDasPublicacoes(raiz), `${primeira.publicationId}.json`);
  writeFileSync(arquivo, `${readFileSync(arquivo, "utf8")}\n`);
  const segunda = await publicarAulaV2(ID, { raiz, env: ligada });
  assert.equal(segunda.ok, false);
  assert.match(segunda.ok ? "" : segunda.motivo, /bytes diferentes/);
  assert.equal(lerPonteiroV2(content(raiz), ID)?.publicationId, primeira.publicationId);
  assert.deepEqual(restoDeTransacao(raiz), []);
});

test("§20.1: sem conferência verde para o documento de agora, não publica", async () => {
  const raiz = await pastaConferida();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const documento = lerDocumentoV2(ID, raiz)!;
  assert.equal(gravarDocumentoV2(ID, { ...documento.aula, titulo: "Editado depois de conferir" }, documento.hash, raiz, ligada).ok, true);
  const resultado = await publicarAulaV2(ID, { raiz, env: ligada });
  assert.equal(resultado.ok, false);
  assert.match(resultado.ok ? "" : resultado.motivo, /confira de novo/);
  assert.equal(lerPonteiroV2(content(raiz), ID), null);
});

test("§20.1: o impacto mostrado precisa ser o impacto publicado", async () => {
  const raiz = await pastaConferida();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const resultado = await publicarAulaV2(ID, { raiz, env: ligada, impactoHash: "hash-de-outro-impacto" });
  assert.equal(resultado.ok, false);
  assert.match(resultado.ok ? "" : resultado.motivo, /impacto/);
});

test("reativar a anterior e desativar o v2; o v1 não publica por cima de uma aula v2", async () => {
  const raiz = await pastaConferida();
  test.after(() => rmSync(raiz, { recursive: true, force: true }));
  const a = await publicarAulaV2(ID, { raiz, env: ligada });
  await editarEConferir(raiz, "Segunda versão");
  const b = await publicarAulaV2(ID, { raiz, env: ligada });
  assert.ok(a.ok && b.ok);
  assert.equal(b.anterior, a.publicationId);
  assert.deepEqual(publicacoesDaAulaV2(ID, raiz).map((p) => [p.publicationId, p.ativa, p.integra]).sort(), [[a.publicationId, false, true], [b.publicationId, true, true]].sort());

  assert.deepEqual(reativarPublicacaoV2(ID, a.publicationId, { raiz, env: ligada }), { ok: true });
  assert.deepEqual(lerPonteiroV2(content(raiz), ID), { ...lerPonteiroV2(content(raiz), ID)!, publicationId: a.publicationId, anterior: b.publicationId });

  const v1 = podePublicarV1(ID, raiz);
  assert.equal(v1.pode, false);
  assert.match(v1.motivo ?? "", /Editor v2/);

  assert.deepEqual(desativarV2(ID, { raiz, env: ligada }), { ok: true });
  assert.equal(lerPonteiroV2(content(raiz), ID), null);
  assert.equal(publicacoesEmDisco(raiz).length, 2, "desativar não apaga publicação");
});
