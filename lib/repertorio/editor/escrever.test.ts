import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expandir, type Cabecalho } from "../arvore.ts";
import { compilarRepertorio } from "../compilar.ts";
import { lerFontesDoRepertorio } from "../compilar-em-disco.ts";
import { notas } from "../conteudo.ts";
import type { Cor, Nivel } from "../linhas.ts";
import { lerPgn, lerPgns, lerPgnsComIntervalos, type PartidaPgn } from "../pgn.ts";
import { cascaDoArquivo, partidaDaAnalise, separarDesenhos, juntarDesenhos } from "./adaptar.ts";
import { escreverArquivo, escreverJogo } from "./escrever.ts";

/**
 * O escritor emendador contra os onze `.pgn` do curso — parada 8B da fatia 8.
 *
 * Três camadas de prova, porque leitor e escritor com o mesmo defeito passariam num
 * ciclo ingênuo (§11 do plano final):
 *
 * - **sem edição, os mesmos bytes**: nada é reimpresso sem pedido;
 * - **os 23 jogos forçados a reescrever**: `expandir` idêntico jogo a jogo, e a
 *   compilação dos onze idêntica ao JSON de hoje;
 * - **expectativas contadas no texto, sem o leitor**: quebras de linha dentro de
 *   comentário, blocos `[%plano]`, NAG `$n`, variações e comentário depois de `)`.
 */

const RAIZ = fileURLToPath(new URL("../../..", import.meta.url));
const fontes = lerFontesDoRepertorio(path.join(RAIZ, "content", "repertorio"));

function cabecalho(partida: PartidaPgn): Cabecalho {
  return {
    abertura: partida.tags.Abertura,
    nome: partida.tags.Nome,
    cor: partida.tags.Cor as Cor,
    nivel: partida.tags.Nivel as Nivel,
    fonte: partida.tags.Fonte,
  };
}

/** O movetext sem os comentários: o que um humano contaria olhando os lances. */
const semComentarios = (texto: string): string => texto.replace(/\{[^}]*\}/g, " ").replace(/;[^\n]*/g, " ");

function contagens(texto: string) {
  const comentarios = texto.match(/\{[^}]*\}/g) ?? [];
  const lances = semComentarios(texto);
  return {
    comentariosComQuebra: comentarios.filter((c) => c.includes("\n")).length,
    quebrasDentroDeComentario: comentarios.reduce((n, c) => n + (c.match(/\n/g) ?? []).length, 0),
    blocosDePlano: comentarios.reduce((n, c) => n + (c.match(/\[%plano/g) ?? []).length, 0),
    nagsNumericos: (lances.match(/\$\d+/g) ?? []).sort(),
    simbolosColados: (lances.match(/[a-h1-8KQRBNO+#](?:!!|\?\?|!\?|\?!|!|\?)/g) ?? []).map((s) => s.slice(1)).sort(),
    variacoes: (lances.match(/\(/g) ?? []).length,
  };
}

function tudoTocado(nome: string, texto: string) {
  const casca = cascaDoArquivo(nome, texto);
  return escreverArquivo(texto, casca.aula, new Set(casca.aula.analises.map((a) => a.id)));
}

test("os onze arquivos abrem como casca sem problema, 23 jogos", () => {
  let jogos = 0;
  for (const { nome, texto } of fontes) {
    const casca = cascaDoArquivo(nome, texto);
    assert.deepEqual(casca.problemas, {}, nome);
    jogos += casca.aula.analises.length;
    assert.equal(casca.intervalos.jogos.length, lerPgns(texto).length, nome);
  }
  assert.equal(jogos, 23);
});

test("(a) sem edição, os onze arquivos saem byte a byte", () => {
  let iguais = 0;
  for (const { nome, texto } of fontes) {
    const casca = cascaDoArquivo(nome, texto);
    const escrito = escreverArquivo(texto, casca.aula, new Set());
    assert.deepEqual(escrito.problemas, []);
    assert.equal(escrito.texto, texto, nome);
    iguais += 1;
  }
  assert.equal(iguais, 11);
});

test("(b) os 23 jogos reescritos expandem igual ao original — linhas, ids, avisos e problemas", () => {
  let jogos = 0;
  for (const { nome, texto } of fontes) {
    const escrito = tudoTocado(nome, texto);
    assert.deepEqual(escrito.problemas, [], nome);
    const antes = lerPgns(texto);
    const depois = lerPgns(escrito.texto);
    assert.equal(depois.length, antes.length, nome);
    for (const [i, partida] of antes.entries()) {
      assert.deepEqual(depois[i].tags, partida.tags, `${nome} jogo ${i + 1}: tags`);
      const e1 = expandir(partida, cabecalho(partida));
      const e2 = expandir(depois[i], cabecalho(depois[i]));
      assert.deepEqual(e2, e1, `${nome} jogo ${i + 1}`);
      jogos += 1;
    }
    assert.notEqual(escrito.texto, texto, `${nome}: forçar a reescrita tem de reescrever alguma coisa`);
  }
  assert.equal(jogos, 23);
});

test("(b) a compilação dos onze reescritos é byte a byte a de hoje", () => {
  const reescritas = fontes.map((f) => ({ nome: f.nome, texto: tudoTocado(f.nome, f.texto).texto }));
  const hoje = compilarRepertorio(fontes, notas());
  const depois = compilarRepertorio(reescritas, notas());
  assert.deepEqual(depois.problemas, []);
  assert.deepEqual(depois.avisos, hoje.avisos);
  assert.deepEqual([...depois.saida], [...hoje.saida]);
});

test("(c) expectativas independentes contadas no texto sobrevivem à reescrita", () => {
  const total = { antes: [] as ReturnType<typeof contagens>[], depois: [] as ReturnType<typeof contagens>[] };
  for (const { nome, texto } of fontes) {
    const reescrito = tudoTocado(nome, texto).texto;
    total.antes.push(contagens(texto));
    total.depois.push(contagens(reescrito));
    // O preâmbulo é o mesmo byte a byte, com as quebras de linha dele.
    const p1 = texto.slice(0, lerPgnsComIntervalos(texto).preambulo.fim);
    assert.equal(reescrito.slice(0, p1.length), p1, `${nome}: preâmbulo`);
    // Comentário depois de ")" volta colado ao lance: nenhum sobra no texto novo.
    assert.equal((reescrito.match(/\)\s*\{/g) ?? []).length, 0, `${nome}: comentário depois de )`);
  }
  const somar = (lista: ReturnType<typeof contagens>[]) => ({
    comentariosComQuebra: lista.reduce((n, c) => n + c.comentariosComQuebra, 0),
    quebrasDentroDeComentario: lista.reduce((n, c) => n + c.quebrasDentroDeComentario, 0),
    blocosDePlano: lista.reduce((n, c) => n + c.blocosDePlano, 0),
    nagsNumericos: lista.flatMap((c) => c.nagsNumericos).sort(),
    simbolosColados: lista.flatMap((c) => c.simbolosColados).sort(),
    variacoes: lista.reduce((n, c) => n + c.variacoes, 0),
  });
  const antes = somar(total.antes);
  const depois = somar(total.depois);
  assert.deepEqual(depois, antes);
  // Os números medidos em 13/9/2026, para o teste não passar calado com um corpus vazio.
  assert.deepEqual(antes, {
    comentariosComQuebra: 311,
    quebrasDentroDeComentario: 1109,
    blocosDePlano: 10,
    // Eram 6 NAGs e 77 variações até 14/9/2026, quando as marcas das fontes originais
    // voltaram (regra "Símbolos de lance" do AGENTS.md): 26 nos lances das linhas e 7
    // irmãos nossos marcados, cada um numa variação nova. Ver `marcas-das-fontes.ts`.
    nagsNumericos: [
      "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1", "$1",
      "$14", "$16", "$16", "$16", "$16", "$2", "$2", "$2", "$2", "$37", "$4",
      "$5", "$5", "$5", "$5", "$5", "$5", "$5", "$6", "$6", "$6", "$6",
    ],
    simbolosColados: ["!"],
    variacoes: 84,
  });
});

test("(c) $5 continua $5, !? continua !?, e NAG novo sai colado", () => {
  const texto = `[Abertura "x"]\n[Result "*"]\n\n1. e4 $5 e5 2. Nf3!? Nc6 *\n`;
  const casca = cascaDoArquivo("brancas-x", texto);
  assert.equal(escreverJogo(casca.aula.analises[0], casca.formas).texto, `[Abertura "x"]\n[Result "*"]\n\n1. e4 $5 e5 2. Nf3!? Nc6 *`);
  const analise = structuredClone(casca.aula.analises[0]);
  analise.nos["no-j1-2"].nags = [2];
  analise.nos["no-j1-1"].nags = [5, 146];
  assert.equal(escreverJogo(analise, casca.formas).texto, `[Abertura "x"]\n[Result "*"]\n\n1. e4!? $146 e5? 2. Nf3!? Nc6 *`);
});

test("(c) tag com aspas e comentário com chave são recusados, não escritos errados", () => {
  const casca = cascaDoArquivo("brancas-x", `[Nome "Ok"]\n\n1. e4 {bom} *\n`);
  const analise = structuredClone(casca.aula.analises[0]);
  analise.origemPgn!.tags.Nome = 'O "melhor"';
  analise.nos["no-j1-1"].comentario = "fecha } no meio";
  const { problemas } = escreverJogo(analise);
  assert.equal(problemas.length, 2, problemas.join("\n"));
  assert.match(problemas[0], /aspas/);
  assert.match(problemas[1], /\}/);
});

test("editar um comentário reescreve só aquele jogo; o resto do arquivo é o original", () => {
  const siciliana = fontes.find((f) => f.nome === "pretas-siciliana.pgn")!;
  const casca = cascaDoArquivo(siciliana.nome, siciliana.texto);
  const alvo = casca.aula.analises[2];
  const no = Object.values(alvo.nos).find((n) => n.comentario)!;
  no.comentario = `${no.comentario} Frase nova do professor.`;
  const escrito = escreverArquivo(siciliana.texto, casca.aula, new Set([alvo.id]));
  assert.deepEqual(escrito.problemas, []);

  const { jogos } = lerPgnsComIntervalos(siciliana.texto);
  const antesDoJogo = siciliana.texto.slice(0, jogos[2].inicio);
  const depoisDoJogo = siciliana.texto.slice(jogos[2].fim);
  assert.ok(escrito.texto.startsWith(antesDoJogo));
  assert.ok(escrito.texto.endsWith(depoisDoJogo));

  const lidos = lerPgns(escrito.texto);
  const originais = lerPgns(siciliana.texto);
  for (const i of [0, 1, 3, 4, 5]) assert.deepEqual(lidos[i], originais[i]);
  const e1 = expandir(originais[2], cabecalho(originais[2]));
  const e2 = expandir(lidos[2], cabecalho(lidos[2]));
  assert.deepEqual(e2.linhas.map((l) => l.id), e1.linhas.map((l) => l.id), "comentário não muda id");
  assert.ok(JSON.stringify(e2.linhas).includes("Frase nova do professor."));
});

test("desenhos: %cal e %csl viram desenho e voltam; cor desconhecida fica no texto", () => {
  const { texto, desenhos } = separarDesenhos("Olhe a diagonal [%cal Gc1h6,Rd1d5] e a casa\nfraca [%csl Yd5]");
  assert.equal(texto, "Olhe a diagonal e a casa\nfraca");
  assert.deepEqual(desenhos, {
    arrows: [{ de: "c1", para: "h6", cor: "verde" }, { de: "d1", para: "d5", cor: "vermelho" }],
    highlights: [{ casa: "d5", cor: "amarelo" }],
  });
  assert.equal(juntarDesenhos(texto!, desenhos), "Olhe a diagonal e a casa\nfraca [%cal Gc1h6,Rd1d5] [%csl Yd5]");
  assert.deepEqual(separarDesenhos("roxo [%cal Xe2e4]"), { texto: "roxo [%cal Xe2e4]" });
  assert.deepEqual(separarDesenhos("com [%plano\nc1>b2: motivo]"), { texto: "com [%plano\nc1>b2: motivo]" });
});

test("partidaDaAnalise devolve a árvore do leitor sem passar por texto", () => {
  const escocesa = fontes.find((f) => f.nome === "brancas-escocesa.pgn")!;
  const casca = cascaDoArquivo(escocesa.nome, escocesa.texto);
  const originais = lerPgnsComIntervalos(escocesa.texto).jogos.map((j) => j.partida);
  for (const [i, analise] of casca.aula.analises.entries()) {
    const { partida, problemas } = partidaDaAnalise(analise, casca.formas);
    assert.deepEqual(problemas, []);
    assert.deepEqual(expandir(partida, cabecalho(partida)), expandir(originais[i], cabecalho(originais[i])));
  }
});

test("D13 (registro): comentário no início de variação é fundido no lance que ela substitui", () => {
  // Não ocorre nos onze arquivos (medido: 0 "( {" no corpus). O leitor junta o texto no
  // dono da variação; o escritor o devolve depois do lance, e o sentido para `expandir`
  // é o mesmo, porque o dono é o lance que carrega o comentário.
  const lido = lerPgn(`1. e4 ( {outra ideia} 1. d4 d5 ) e5 *`);
  assert.equal(lido.lances[0].comentario, "outra ideia");
  const casca = cascaDoArquivo("brancas-x", `1. e4 ( {outra ideia} 1. d4 d5 ) e5 *`);
  assert.equal(escreverJogo(casca.aula.analises[0], casca.formas).texto, "1. e4 {outra ideia} (1. d4 d5) 1... e5 *");
});
