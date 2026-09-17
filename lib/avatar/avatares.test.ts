import assert from "node:assert/strict";
import test from "node:test";
import { AVATARES, ehAvatar, gravacaoDoAvatar } from "./avatares.ts";

test("são vinte avatares, cada um com id único e nome curto", () => {
  assert.equal(AVATARES.length, 20);
  assert.equal(new Set(AVATARES.map((a) => a.id)).size, 20, "id repetido");
  for (const a of AVATARES) {
    assert.match(a.id, /^[a-z]+(?:-[a-z]+)*$/, `id fora do padrão: ${a.id}`);
    assert.ok(a.nome.length > 0 && a.nome.length <= 24, `nome longo demais: ${a.nome}`);
  }
});

test("a lista do banco é a mesma lista do código", async () => {
  // O `check` do banco é uma cópia da lista, e cópia se desfaz calada: um avatar novo aqui e
  // esquecido lá passaria na tela e explodiria só na gravação. Migração aplicada não se edita,
  // então vale a **última** que redefine `perfis_avatar_valido` (a 0016 criou com 10, a 0017
  // trocou por 20).
  const { readdirSync, readFileSync } = await import("node:fs");
  const pasta = new URL("../../supabase/migrations/", import.meta.url);
  const ultima = readdirSync(pasta)
    .filter((nome) => nome.endsWith(".sql"))
    .sort()
    .map((nome) => readFileSync(new URL(nome, pasta), "utf8"))
    .filter((sql) => /add constraint perfis_avatar_valido/.test(sql))
    .at(-1);
  assert.ok(ultima, "nenhuma migração define perfis_avatar_valido");
  const lista = /avatar in \(([^)]*)\)/.exec(ultima)?.[1] ?? "";
  const doBanco = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(doBanco, AVATARES.map((a) => a.id).sort());
});

test("aceita os vinte ids e recusa qualquer outra coisa", () => {
  for (const a of AVATARES) assert.equal(ehAvatar(a.id), true, a.id);
  for (const outro of ["", "rei", "CAVALO-DJ", " torre-oculos", "torre-oculos ", null, undefined, 3, {}]) {
    assert.equal(ehAvatar(outro), false, String(outro));
  }
});

test("a gravação recusa id desconhecido e nulo", () => {
  assert.deepEqual(gravacaoDoAvatar("dragao"), { ok: false, erro: "Esse avatar não existe." });
  assert.deepEqual(gravacaoDoAvatar(null), { ok: false, erro: "Esse avatar não existe." });
  assert.deepEqual(gravacaoDoAvatar(undefined), { ok: false, erro: "Esse avatar não existe." });
});

test("a gravação leva só o campo `avatar`, por mais que o pedido traga", () => {
  const id = AVATARES[0].id;
  const r = gravacaoDoAvatar(id);
  assert.deepEqual(r, { ok: true, linha: { avatar: id } });

  // O pedido forjado: um objeto com nome, papel e rating no lugar do id. Não vira gravação.
  const forjado = { avatar: id, nome: "Hacker", papel: "professor", rating: 2800 };
  assert.equal(gravacaoDoAvatar(forjado).ok, false);

  // E a linha que sai nunca tem outra chave.
  for (const a of AVATARES) {
    const saida = gravacaoDoAvatar(a.id);
    assert.ok(saida.ok);
    assert.deepEqual(Object.keys(saida.linha), ["avatar"]);
  }
});
