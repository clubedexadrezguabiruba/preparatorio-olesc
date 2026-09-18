import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { sanEmPortugues, textoEmPortugues } from "./treino.ts";

/**
 * A regra do Doug de 17/9/2026: **a notação sai em português em toda tela do
 * site.** `R`, `D`, `T`, `B`, `C` — e o lance que aparece no meio de uma frase
 * do professor conta igual ao lance que aparece sozinho num cartão.
 *
 * O arquivo continua em inglês de propósito (ver o cabeçalho de
 * `textoEmPortugues`); quem traduz é a tela. Estes testes cobrem os dois lados:
 * a troca em si, e o corpo de texto real das aulas publicadas.
 */

/* ------------------------------------------------------------------ *
 * A troca
 * ------------------------------------------------------------------ */

test("o lance no meio da frase troca de inicial, e só ele", () => {
  assert.equal(textoEmPortugues("Contra ...Nf6, o peão avança para e5."), "Contra ...Cf6, o peão avança para e5.");
  assert.equal(textoEmPortugues("Isso: 5.Nc3."), "Isso: 5.Cc3.");
  assert.equal(textoEmPortugues("O desenho final é Qxe6+ → ...Qxe6 → Nxa7#."), "O desenho final é Dxe6+ → ...Dxe6 → Cxa7#.");
  assert.equal(textoEmPortugues("Se for seguro, Qe2 e roque grande."), "Se for seguro, De2 e roque grande.");
});

test("palavra portuguesa que começa com inicial de peça não é lance", () => {
  // Estas cinco saíram do texto real das aulas; foram o motivo do formato fechado.
  assert.equal(textoEmPortugues("Nós ocupamos o centro."), "Nós ocupamos o centro.");
  assert.equal(textoEmPortugues("Nosso rei fica seguro."), "Nosso rei fica seguro.");
  assert.equal(textoEmPortugues("Roque grande quando for seguro."), "Roque grande quando for seguro.");
  assert.equal(textoEmPortugues("Quando o golpe não funciona"), "Quando o golpe não funciona");
  assert.equal(textoEmPortugues("Bom lance, mas não é o da linha"), "Bom lance, mas não é o da linha");
});

test("o símbolo do lance não é tocado — regra de 14/9/2026", () => {
  assert.equal(textoEmPortugues("Se aparecer ...Qxg2? nesta posição, procure Be4!"), "Se aparecer ...Dxg2? nesta posição, procure Be4!");
  assert.equal(textoEmPortugues("5.Nf3!? também vale"), "5.Cf3!? também vale");
  assert.equal(textoEmPortugues("25. Tg7?? perde"), "25. Tg7?? perde");
  assert.equal(textoEmPortugues("Nxa7# é mate"), "Cxa7# é mate");
});

test("em prosa, o `R` fica como está — as duas línguas disputam a letra", () => {
  // Rei, já em português: as onze aulas de finais escrevem assim, e 29 tokens dependem disto.
  assert.equal(textoEmPortugues("Comparação: 1... Re6??"), "Comparação: 1... Re6??");
  assert.equal(textoEmPortugues("as Brancas jogavam Re7 e ganhavam"), "as Brancas jogavam Re7 e ganhavam");
  // Torre, ainda em inglês: a tela não adivinha, e o conserto é no estudo.
  assert.equal(textoEmPortugues("[TRAIN] Nbc3, Rg1 e Bf4."), "[TRAIN] Cbc3, Rg1 e Bf4.", "o C entra, o R espera o autor");
});

test("quem tem a peça na mão traduz tudo, inclusive o `R`", () => {
  // `sanEmPortugues` recebe SAN da chess.js — inglês garantido — e não tem a dúvida da prosa.
  assert.equal(sanEmPortugues("Rg1"), "Tg1");
  assert.equal(sanEmPortugues("Ke7"), "Re7");
});

test("a lista de lances destrava o `R`, e só o que está nela", () => {
  const sans = new Set(["Re1", "Bg5", "Kxd7"]);
  assert.equal(textoEmPortugues("Escandinava — 11.Re1 O-O 12.Bg5", sans), "Escandinava — 11.Te1 O-O 12.Bg5");
  assert.equal(textoEmPortugues("13.Bxd7+ Kxd7 14.Qxb7+", sans), "13.Bxd7+ Rxd7 14.Dxb7+", "o rei inglês vira R mesmo sem estar em dúvida");
  assert.equal(textoEmPortugues("o rei foi para Re8", sans), "o rei foi para Re8", "Re8 não está na lista: fica como o professor escreveu");
});

test("o desempate decide uma vez só, e não relê o que acabou de traduzir", () => {
  // A linha tem rei e torre indo para a mesma casa: `Kxd7` (rei) e `Rxd7` (torre).
  // Numa segunda passada, o `Rxd7` recém-nascido do rei seria lido como torre.
  const sans = new Set(["Kxd7", "Rxd7"]);
  assert.equal(textoEmPortugues("primeiro Kxd7, depois Rxd7", sans), "primeiro Rxd7, depois Txd7");
});

test("o bispo não muda, e a promoção muda", () => {
  assert.equal(textoEmPortugues("O bispo vai para Be4 e ataca."), "O bispo vai para Be4 e ataca.");
  assert.equal(textoEmPortugues("O peão chega em e8=Q."), "O peão chega em e8=D.");
  assert.equal(textoEmPortugues("exd8=N+ ganha a dama."), "exd8=C+ ganha a dama.");
  // Na promoção o R volta a ser traduzível: não se promove a rei.
  assert.equal(textoEmPortugues("Promova a torre: e8=R, e não a dama."), "Promova a torre: e8=T, e não a dama.");
});

test("o roque passa inteiro", () => {
  assert.equal(textoEmPortugues("Depois de O-O-O o rei fica seguro."), "Depois de O-O-O o rei fica seguro.");
});

test("rodar duas vezes dá o mesmo texto", () => {
  const prosa = "Contra ...Nf6 jogamos e5; compare com 3. Te2+?! e com 8. Dg3??.";
  const uma = textoEmPortugues(prosa);
  assert.equal(textoEmPortugues(uma), uma, "o texto já traduzido passa inteiro");
  assert.equal(uma, "Contra ...Cf6 jogamos e5; compare com 3. Te2+?! e com 8. Dg3??.");
});

test("`textoEmPortugues` e `sanEmPortugues` concordam em tudo que não é `R`", () => {
  for (const san of ["Nf6", "Bc4", "Qd5", "Kf1", "e4", "e8=Q", "O-O"]) {
    assert.equal(textoEmPortugues(san), sanEmPortugues(san), san);
  }
  assert.notEqual(textoEmPortugues("Rxd8+"), sanEmPortugues("Rxd8+"), "e discordam só no `R`, de propósito");
});

/* ------------------------------------------------------------------ *
 * O texto de verdade das aulas publicadas
 * ------------------------------------------------------------------ */

/** Os campos que o aluno lê na tela. Os outros guardam dado, e dado fica em inglês. */
const CAMPOS_DO_ALUNO = new Set([
  "fala", "texto", "feedback", "titulo", "nome", "comentario", "resumo",
  "dica", "introducao", "objetivo", "rotulo", "explicacaoConclusao",
]);

const LANCE = /(?<![A-Za-z0-9])[NBRQKCTD][a-h1-8]?x?[a-h][1-8](?:=[NBRQKCTD])?[+#]?(?![A-Za-z0-9])/g;

type Trecho = { aula: string; campo: string; lance: string; frase: string };

function prosaDasAulasPublicadas(): Trecho[] {
  const raiz = new URL("../../content/aulas-v2/", import.meta.url);
  const achados: Trecho[] = [];
  const andar = (valor: unknown, campo: string, aula: string): void => {
    if (typeof valor === "string") {
      if (!CAMPOS_DO_ALUNO.has(campo)) return;
      for (const lance of valor.match(LANCE) ?? []) achados.push({ aula, campo, lance, frase: valor.slice(0, 120) });
      return;
    }
    if (Array.isArray(valor)) return valor.forEach((item) => andar(item, campo, aula));
    if (valor && typeof valor === "object") for (const [k, v] of Object.entries(valor)) andar(v, k, aula);
  };
  for (const aula of readdirSync(raiz)) {
    const ativa = new URL(`${aula}/ativa.json`, raiz);
    const pasta = new URL(`${aula}/publicacoes/`, raiz);
    if (!existsSync(ativa) || !existsSync(pasta)) continue;
    const { publicationId } = JSON.parse(readFileSync(ativa, "utf8")) as { publicationId: string };
    const nome = `pub-${publicationId.replace(/^pub-/, "")}.json`;
    const alvo = existsSync(new URL(nome, pasta)) ? new URL(nome, pasta) : new URL(readdirSync(pasta)[0], pasta);
    andar(JSON.parse(readFileSync(alvo, "utf8")), "", aula);
  }
  return achados;
}

test("a tela devolve a prosa das aulas sem nenhum N, Q ou K sobrando", () => {
  const sobrando = [...new Set(
    prosaDasAulasPublicadas()
      .map((t) => ({ ...t, traduzido: textoEmPortugues(t.lance) }))
      .filter((t) => /^[NQK]/.test(t.traduzido))
      .map((t) => `${t.aula} · ${t.campo}: ${t.lance} → ${t.traduzido} — «${t.frase}»`),
  )];
  assert.deepEqual(sobrando, []);
});

/**
 * **O `R` da prosa, contado e deixado à vista** — a decisão está no cabeçalho de
 * `textoEmPortugues`.
 *
 * Este teste não reprova um `R` novo: ele reprova quando a **conta** muda, que é
 * quando a decisão precisa ser relida. Dez torres em inglês nas aulas de
 * abertura contra vinte e nove reis já em português nas de finais (35 desde a
 * Siciliana, 18/9/2026, que nasceu em português) foi o que
 * mandou deixar a letra quieta; se um dia as torres passarem dos reis, a troca
 * automática passa a valer a pena e alguém tem de vir aqui refazer a conta.
 *
 * Quando os dez `Rg1` virarem `Tg1` no estudo e as aulas B e E+F forem
 * republicadas, `torres` cai para zero — e aí este teste é o que avisa que a
 * pendência fechou.
 */
test("o `R` da prosa: dez torres em inglês contra trinta e cinco reis em português", () => {
  const comR = prosaDasAulasPublicadas().filter((t) => t.lance.startsWith("R"));
  // Só a Francesa escreve a prosa em inglês. A Siciliana (18/9/2026) já nasceu em português: o `R`
  // dela é rei (14.Rd2, 10...Rxf7), como nas aulas de finais.
  const torres = comR.filter((t) => t.aula.startsWith("AB-BRANCAS-FRANCESA"));
  const reis = comR.filter((t) => !t.aula.startsWith("AB-BRANCAS-FRANCESA"));

  assert.deepEqual([...new Set(torres.map((t) => t.lance))], ["Rg1"], "a única torre escrita em inglês na prosa");
  assert.equal(torres.length, 10, "pendência: viram Tg1 no estudo, e as aulas B e E+F republicam");
  // 29 até 18/9/2026, só os de finais; mais 6 reis da Siciliana.
  assert.equal(reis.length, 35, "os reis das aulas de finais e da Siciliana já estão em português e passam intactos");
  assert.ok(reis.length > torres.length, "enquanto houver mais rei que torre, a tela não troca o R");

  for (const rei of reis) assert.equal(textoEmPortugues(rei.lance), rei.lance, `${rei.aula}: ${rei.lance} é rei e tem de passar inteiro`);
});

/**
 * `K` é *king* em inglês e sai como `R`. Enquanto não houver `K` na prosa, a
 * troca `K → R` é de mão única e não briga com o `R` que já está lá. Um `K` novo
 * quebraria isso: passaria a existir `R` de rei traduzido convivendo com `R` de
 * rook não traduzido, na mesma frase.
 */
test("nenhum `K` na prosa das aulas", () => {
  const comK = prosaDasAulasPublicadas().filter((t) => t.lance.startsWith("K"));
  assert.deepEqual([...new Set(comK.map((t) => `${t.aula} · ${t.campo}: ${t.lance} — «${t.frase}»`))], []);
});

/* ------------------------------------------------------------------ *
 * Os nomes das linhas do repertório
 * ------------------------------------------------------------------ */

type LinhaCompilada = { nome: string; sans: string[] };

function linhasCompiladas(): Array<{ arquivo: string; linha: LinhaCompilada }> {
  const raiz = new URL("../../public/repertorio/", import.meta.url);
  const saida: Array<{ arquivo: string; linha: LinhaCompilada }> = [];
  for (const cor of ["brancas", "pretas"]) {
    const pasta = new URL(`${cor}/`, raiz);
    if (!existsSync(pasta)) continue;
    for (const arquivo of readdirSync(pasta).filter((n) => n.endsWith(".json"))) {
      const dados = JSON.parse(readFileSync(new URL(arquivo, pasta), "utf8")) as { linhas?: LinhaCompilada[] } | LinhaCompilada[];
      for (const linha of Array.isArray(dados) ? dados : dados.linhas ?? []) saida.push({ arquivo: `${cor}/${arquivo}`, linha });
    }
  }
  return saida;
}

const LANCE_QUALQUER = /(?<![A-Za-z0-9])(?:[NBRQK][a-h1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8]=[NBRQ])[+#]?(?![A-Za-z0-9])/g;

/**
 * O que se cobra na saída é `N`, `Q` e `K` — **não `R`**.
 *
 * Depois da troca, um `R` no resultado é rei em português, e é justamente o que
 * se queria: `Kb1` do Petroff, `Kg8` do Colle e `Kxd7` da Caro-Kann saem `Rb1`,
 * `Rg8` e `Rxd7`. Cobrar "nenhum `R` na saída" reprovaria os três acertos.
 *
 * Quem cobra o `R` que **não** foi traduzido é o teste seguinte, pelo desempate.
 */
test("todo nome de linha do repertório chega ao aluno em português", () => {
  const linhas = linhasCompiladas();
  assert.ok(linhas.length >= 20, `esperava o repertório compilado; achei ${linhas.length} linhas`);

  const sobrando = linhas
    .map(({ arquivo, linha }) => ({ arquivo, nome: textoEmPortugues(linha.nome, new Set(linha.sans)) }))
    .filter(({ nome }) => (nome.match(LANCE_QUALQUER) ?? []).some((l) => /^[NQK]/.test(l)))
    .map(({ arquivo, nome }) => `${arquivo}: «${nome}»`);

  assert.deepEqual(sobrando, [], "nome de linha com cavalo, dama ou rei em inglês");
});

test("os nomes que tinham torre e rei em inglês saem certos, um por um", () => {
  const porNome = new Map(linhasCompiladas().map(({ linha }) => [linha.nome, textoEmPortugues(linha.nome, new Set(linha.sans))]));
  const esperado: Array<[string, string]> = [
    // Torre: o `R` inglês vira `T`.
    ["Escandinava — 11.Re1 O-O 12.Bg5", "Escandinava — 11.Te1 O-O 12.Bg5"],
    ["Escocesa — 13.Rxd6 Rad8 14.Rxd8", "Escocesa — 13.Txd6 Tad8 14.Txd8"],
    ["Escocesa — 3...Cf6 — 11.exd6 Bxd6 12.Rfe1", "Escocesa — 3...Cf6 — 11.exd6 Bxd6 12.Tfe1"],
    // Rei: o `K` inglês vira `R`, e esse `R` fica.
    ["Petroff — 11.Kb1 a4 12.a3", "Petroff — 11.Rb1 a4 12.a3"],
    ["Caro-Kann Trocas — 13.Bxd7+ Kxd7 14.Qxb7+", "Caro-Kann Trocas — 13.Bxd7+ Rxd7 14.Dxb7+"],
  ];
  for (const [antes, depois] of esperado) {
    assert.ok(porNome.has(antes), `o repertório mudou: sumiu a linha «${antes}»`);
    assert.equal(porNome.get(antes), depois);
  }
});

test("o desempate do nome de linha cobre os doze `R` e `K` do repertório", () => {
  const comRouK = linhasCompiladas().flatMap(({ arquivo, linha }) =>
    (linha.nome.match(LANCE_QUALQUER) ?? [])
      .filter((l) => /^[RK]/.test(l))
      .map((lance) => ({ arquivo, lance, nosSans: new Set(linha.sans).has(lance), nome: linha.nome })),
  );

  // 11 em 17/9/2026; 12 desde 18/9/2026, com as 56 linhas da Siciliana. Todos seguem nos lances da própria linha.
  assert.equal(comRouK.length, 12, "a conta de 18/9/2026; mudou, releia o cabeçalho de `textoEmPortugues`");
  assert.deepEqual(
    comRouK.filter((t) => !t.nosSans).map((t) => `${t.arquivo}: ${t.lance} em «${t.nome}»`),
    [],
    "todo R/K de nome de linha tem de estar nos lances da própria linha, senão não há como saber se é torre ou rei",
  );
});
