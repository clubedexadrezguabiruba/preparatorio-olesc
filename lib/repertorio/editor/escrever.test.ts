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
 * - **os 41 jogos forçados a reescrever** (eram 23 até a Francesa vir do estudo, 17/9/2026): `expandir` idêntico jogo a jogo, e a
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

test("os onze arquivos abrem como casca sem problema, 130 jogos", () => {
  let jogos = 0;
  for (const { nome, texto } of fontes) {
    const casca = cascaDoArquivo(nome, texto);
    assert.deepEqual(casca.problemas, {}, nome);
    jogos += casca.aula.analises.length;
    assert.equal(casca.intervalos.jogos.length, lerPgns(texto).length, nome);
  }
  // 23 até 17/9/2026; a Francesa gerada do estudo trocou 1 jogo escrito à mão por 19.
  // 41 até 18/9/2026; a Siciliana gerada do estudo trocou 6 jogos escritos à mão por 56.
  // 91 até 18/9/2026; a Escocesa gerada do estudo trocou 3 jogos escritos à mão por 41.
  assert.equal(jogos, 130);
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

test("(b) os 130 jogos reescritos expandem igual ao original — linhas, ids, avisos e problemas", () => {
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
    // O arquivo gerado do estudo (`gerar-do-estudo.ts`) já sai na forma do escritor: reescrever não muda
    // um byte. Os escritos à mão mudam alguma coisa — é o que prova que a reescrita foi forçada.
    if (texto.startsWith("; GERADO")) assert.equal(escrito.texto, texto, `${nome}: gerado já está na forma do escritor`);
    else assert.notEqual(escrito.texto, texto, `${nome}: forçar a reescrita tem de reescrever alguma coisa`);
  }
  // 23 até 17/9/2026; a Francesa gerada do estudo trocou 1 jogo escrito à mão por 19.
  // 41 até 18/9/2026; a Siciliana gerada do estudo trocou 6 jogos escritos à mão por 56.
  // 91 até 18/9/2026; a Escocesa gerada do estudo trocou 3 jogos escritos à mão por 41.
  assert.equal(jogos, 130);
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
    // 311 e 1109 até 17/9/2026, quando a Francesa passou a vir do estudo do Lichess; 298, 1068 e 10
    // até 18/9/2026, quando a Siciliana também passou (os comentários do estudo são de uma linha só, e
    // as três linhas com [%plano] escritas à mão saíram).
    // 234, 835 e 7 até 18/9/2026, quando a Escocesa também passou a vir do estudo (o [%plano] do
    // bispo de f1 da linha do 5...d6 saiu com a escrita à mão).
    comentariosComQuebra: 182,
    quebrasDentroDeComentario: 647,
    blocosDePlano: 6,
    // Eram 6 NAGs e 77 variações até 14/9/2026, quando as marcas das fontes originais
    // voltaram (regra "Símbolos de lance" do AGENTS.md). 45 NAGs e 87 variações até 18/9/2026:
    // a Siciliana gerada do estudo traz os símbolos do Plichta em cada uma das 56 linhas. Desde
    // 18/9/2026 a Escocesa também: os símbolos do Grigoryan e do Krikor em cada uma das 41 linhas.
    nagsNumericos: [
      // 160 "$1" e 19 "$6" até 18/9/2026 (tarde): a Siciliana ganhou 8.f3 Db6! (Golpe 2, hoje Imprecisão 2) e o
      // 3...Cxd4 da Escocesa saiu do mapa B02 para o C17, com o $6 escrito como NAG numérico (Doug, 18/9/2026).
      ...Array(164).fill("$1"),
      ...Array(1).fill("$10"),
      ...Array(3).fill("$14"),
      ...Array(1).fill("$146"),
      ...Array(1).fill("$15"),
      ...Array(7).fill("$16"),
      ...Array(1).fill("$18"),
      ...Array(1).fill("$19"),
      ...Array(32).fill("$2"),
      ...Array(2).fill("$36"),
      ...Array(1).fill("$37"),
      ...Array(8).fill("$4"),
      ...Array(1).fill("$40"),
      ...Array(21).fill("$5"),
      ...Array(20).fill("$6"),
    ],
    // Até 17/9/2026 só um "!"; a Francesa gerada traz os símbolos do estudo colados ao lance.
    // 28 "!" até 18/9/2026; a Siciliana escrita à mão tinha um, que agora sai como $1.
    // Desde 18/9/2026 a Escocesa gerada cola o primeiro símbolo de cada lance (o `?` de 4...Cxd4, o
    // `!?` de 4.d5), e as variações escritas à mão viram irmãos de um lance.
    // Desde 18/9/2026 (manhã) os lances do adversário nas armadilhas levam ?!, ? ou ?? pela perda medida no
    // Stockfish 18 (pedido do Doug): 5...b6?!, 6...Ch5?, 4...Be6?? na Escocesa, e o mesmo na Siciliana e na Francesa.
    simbolosColados: [...Array(55).fill("!"), ...Array(14).fill("!?"), ...Array(43).fill("?"), ...Array(16).fill("?!"), ...Array(4).fill("??")],
    variacoes: 120,
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
