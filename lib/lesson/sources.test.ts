import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PROTECTED_SOURCE_CAP, sourceSchema, sourceRegistrySchema } from "./schema.ts";

/**
 * O registro de obras (§12.2 e §12.7 do currículo).
 *
 * **Por que isto morde.** O `content/sources.json` é a única coisa que separa
 * "tirei uma posição de um livro" de "copiei o capítulo de um livro". Se ele
 * quebrar de formato, o gate de conteúdo perde as duas guardas que dependem
 * dele — a âncora da proveniência e o teto de citação — e não perde de forma
 * ruidosa: perde deixando passar. Aqui o formato é cobrado a cada `npm test`,
 * antes de qualquer garimpo.
 *
 * O que este teste **não** confere: se o PDF existe em `biblioteca/`. A pasta é
 * gitignorada (o repositório é público e livro comprado não se redistribui),
 * então o CI não tem os arquivos. Essa conferência é do inventário do
 * `biblioteca/README.md`, medida na máquina da autoria.
 */

const registry = sourceRegistrySchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "content", "sources.json"), "utf8")),
);

test("o registro de obras tem o formato que o gate espera", () => {
  assert.ok(registry.sources.length >= 1);
});

test("nenhuma chave citável aparece em duas obras", () => {
  // A proveniência pode citar o nome do PDF ou o slug; se a mesma chave
  // servisse a duas obras, o teto de citação contaria posição na obra errada.
  const vistas = new Map<string, string>();
  for (const source of registry.sources) {
    for (const key of [source.slug, source.file]) {
      if (key === null) continue;
      const antes = vistas.get(key);
      assert.equal(antes, undefined, `a chave "${key}" está em "${source.slug}" e em "${antes}"`);
      vistas.set(key, source.slug);
    }
  }
});

test("o nome do arquivo é um slug de PDF, não um caminho", () => {
  // O campo casa com `provenance.editionFile`, que grava só o nome do arquivo.
  for (const source of registry.sources) {
    if (source.file === null) continue;
    assert.match(source.file, /^[a-z0-9-]+\.pdf$/, `arquivo fora do padrão: ${source.file}`);
  }
});

test("existe obra sem teto, senão nenhuma aula fecha", () => {
  // Uma aula de N0 pede 4 a 6 posições. Com o teto de 2 por obra protegida,
  // um corpus 100% protegido exigiria 3 obras diferentes por aula — e é o
  // domínio público que sustenta o resto.
  const livres = registry.sources.filter((s) => !s.protected);
  assert.ok(livres.length > 0, "nenhuma obra em domínio público ou CC0 registrada");
});

test("o teto de citação é um número pequeno e positivo", () => {
  // Não é um número que a lei diz: é a tradução operacional de "misturar
  // fontes". Mudá-lo é decisão editorial, e o teste existe para que a mudança
  // seja deliberada em vez de silenciosa.
  assert.ok(PROTECTED_SOURCE_CAP >= 1 && PROTECTED_SOURCE_CAP <= 3);
});

test("toda obra do registro aparece no SOURCE-CORPUS.md", () => {
  // Os dois arquivos são a mesma decisão em duas linguagens — o gate lê o JSON,
  // a gente lê o markdown. Obra que entra num e não no outro é a divergência
  // que ninguém nota até alguém garimpar pelo documento errado.
  const doc = readFileSync(path.join(process.cwd(), "docs", "SOURCE-CORPUS.md"), "utf8");
  for (const source of registry.sources) {
    assert.ok(
      doc.includes(`\`${source.slug}\``),
      `a obra "${source.slug}" está no sources.json e não no docs/SOURCE-CORPUS.md`,
    );
  }
});

/* ------------------------------------------------------------------ *
 * Regime integral (§1.1 do SOURCE-CORPUS)
 * ------------------------------------------------------------------ */

/** Uma obra mínima e válida, para variar um campo de cada vez. */
function obra(patch: Record<string, unknown> = {}) {
  return {
    slug: "obra-de-teste",
    title: "Obra de teste",
    author: "Autoria de teste",
    edition: null,
    protected: true,
    didactic: true,
    license: "citação de posição isolada",
    file: "obra-de-teste.pdf",
    role: "livro-base de teste",
    ...patch,
  };
}

const integralValido = {
  since: "2026-09-08",
  reason: "todas as aulas de finais seguem este manual enquanto o curso for gratuito",
  replaceBefore: "2027-09-08",
};

test("o regime integral só existe em obra protegida e didática", () => {
  // As duas regras que o `integral` desliga são exatamente essas duas
  // qualidades: o teto de citação vale para obra protegida, e a rotação de
  // livro-base vale para obra didática. Declarar `integral` em obra que não é
  // as duas coisas promete um desligamento que não existe — e a obra entraria
  // no inventário da dívida sem nada a dever.
  assert.ok(sourceSchema.safeParse(obra({ integral: integralValido })).success);

  const semProtecao = sourceSchema.safeParse(
    obra({ protected: false, integral: integralValido }),
  );
  assert.equal(semProtecao.success, false);

  const semDidatica = sourceSchema.safeParse(
    obra({ didactic: false, integral: integralValido }),
  );
  assert.equal(semDidatica.success, false);
});

test("o prazo do regime integral é posterior ao início", () => {
  // O gate reprova `REGIME_INTEGRAL_VENCIDO` quando `replaceBefore` passa. Um
  // prazo anterior ao início nasceria vencido: o regime seria escrito e
  // reprovado no mesmo commit, e a leitura óbvia — "o gate está quebrado" —
  // seria a errada. Erro de digitação morre no schema.
  const invertido = sourceSchema.safeParse(
    obra({ integral: { ...integralValido, replaceBefore: "2026-01-01" } }),
  );
  assert.equal(invertido.success, false);

  const mesmoDia = sourceSchema.safeParse(
    obra({ integral: { ...integralValido, replaceBefore: integralValido.since } }),
  );
  assert.equal(mesmoDia.success, false);
});

test("as datas do regime integral são YYYY-MM-DD", () => {
  // O gate compara as datas como **texto**, e a comparação só ordena certo
  // nesse formato. "8/9/2026" passaria por qualquer prazo para sempre.
  for (const data of ["08/09/2026", "2026-9-8", "2026-09-08T00:00:00Z", "amanhã"]) {
    const parsed = sourceSchema.safeParse(obra({ integral: { ...integralValido, since: data } }));
    assert.equal(parsed.success, false, `"${data}" deveria ser recusada`);
  }
});
