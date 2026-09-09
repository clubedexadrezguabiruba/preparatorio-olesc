/**
 * Dos PGN de curso para os rascunhos do repositório — e o relatório do que
 * cada fonte deixou em aberto.
 *
 * Uso:
 *   node scripts/importar-fontes.ts
 *   node scripts/importar-fontes.ts --relatorio     (só mede, não escreve nada)
 *
 * ## O que entra no repositório, e o que não entra
 *
 * Os PGN originais ficam **fora do Git**, nas pastas que `REPERTORIO_FONTES`
 * aponta (mais de uma, separadas por `;`). São material de curso pago: a prosa
 * do autor não vai para o site nem para o repositório.
 *
 * O que entra é o rascunho: cabeçalho nosso mais os lances, **sem uma palavra
 * de prosa** e com os NAGs mantidos (são a matéria-prima da regra do erro
 * nomeado). Os lances são fato com proveniência — a política que o projeto já
 * segue para posições de livro —, e a proveniência vai na tag `[Fonte]`.
 *
 * ## O rascunho anotado, e por que ele existe
 *
 * Cada rascunho sai **duas vezes**. O de `rascunhos/` é o versionado, sem
 * prosa. O de `rascunhos-anotados/` é o mesmo PGN **com** o comentário do
 * autor, limpo dos artefatos do exportador, e está no `.gitignore`.
 *
 * A causa: até 6/9/2026 o importador só escrevia o primeiro, e por isso quem
 * escreveu os 103 comentários do repertório nunca teve o argumento da fonte na
 * mão — a justificativa de cada lance saiu de olhar o tabuleiro, e só 4 dos 103
 * carregavam o raciocínio do autor. Os lances vêm do curso; o **porquê** vinha
 * junto e estava sendo jogado fora na porta de entrada.
 *
 * A pasta anotada fica fora do Git porque o repositório é público e a prosa é
 * de curso pago. Ela é derivada, não revisada: ao contrário de `rascunhos/`,
 * é **reescrita** a cada importação. Some com um `git clone` e volta com um
 * `npm run repertorio:importar`, desde que `REPERTORIO_FONTES` aponte para os
 * originais — que é a mesma condição que o rascunho versionado já tinha.
 *
 * ## Um rascunho por ARQUIVO de fonte, não por abertura
 *
 * A Escocesa tem dois arquivos, a Alapin das brancas tem três, o do Kushager
 * tem dez jogos que viram quatro aberturas. Um rascunho por abertura, somado à
 * regra "nunca sobrescreve", faria o segundo arquivo ser recusado em silêncio.
 * A fusão é trabalho de revisão humana, no B3–B5.
 *
 * ## Sem poda automática
 *
 * O plano previa podar na profundidade do nível. Medido: só 3 dos 20 arquivos
 * passam de 40 meios-lances, e podar exigiria reimprimir a árvore com
 * parênteses aninhados — código que existiria para formatar. O rascunho sai
 * inteiro, o relatório diz quais linhas estão acima da profundidade, e quem
 * corta é quem revisa, que é quem sabe qual ramo vale.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { carregarEnv, RAIZ } from "./env-local.ts";
import { expandir, type Aviso, type TipoDeAviso } from "../lib/repertorio/arvore.ts";
import {
  apenasLances,
  embrulhar,
  lancesComProsa,
  lerPgns,
  recortarJogos,
} from "../lib/repertorio/pgn.ts";
import { CORES, NIVEIS, type Cor, type Nivel } from "../lib/repertorio/linhas.ts";

carregarEnv();

const SO_RELATORIO = process.argv.includes("--relatorio");
const DESTINO = path.join(RAIZ, "content", "repertorio", "rascunhos");
const DESTINO_ANOTADO = path.join(RAIZ, "content", "repertorio", "rascunhos-anotados");
const MAPA = path.join(RAIZ, "content", "repertorio", "fontes.json");

type Entrada = {
  arquivo: string;
  abertura: string;
  nome: string;
  cor: Cor;
  nivel: Nivel;
  fonte: string;
  nota?: string;
};

type Mapa = {
  excluir: Array<{ alvo: string; porque: string }>;
  arquivos: Entrada[];
};

const mapa = JSON.parse(readFileSync(MAPA, "utf8")) as Mapa;

for (const entrada of mapa.arquivos) {
  if (!CORES.includes(entrada.cor) || !NIVEIS.includes(entrada.nivel)) {
    console.error(`fontes.json: "${entrada.arquivo}" tem cor ou nível inválido.`);
    process.exit(1);
  }
}

const porArquivo = new Map(mapa.arquivos.map((e) => [e.arquivo, e]));
const excluidos = new Set(mapa.excluir.map((e) => e.alvo));

/* ------------------------------------------------------------------ *
 * Achar os arquivos
 * ------------------------------------------------------------------ */

const pastas = (process.env.REPERTORIO_FONTES ?? "")
  .split(";")
  .map((p) => p.trim())
  .filter(Boolean);

if (pastas.length === 0) {
  console.error(
    "Falta REPERTORIO_FONTES no .env.local.\n" +
      "É a lista de pastas com os PGN de curso, separadas por `;`. Exemplo:\n" +
      "  REPERTORIO_FONTES=C:\\Users\\…\\Downloads\\repertorio-fontes;C:\\Users\\…\\Downloads\\krikor",
  );
  process.exit(1);
}

/** Varre a pasta, entrando nas subpastas que não estão excluídas. */
function varrer(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    if (excluidos.has(nome)) continue;
    const cheio = path.join(pasta, nome);
    if (statSync(cheio).isDirectory()) achados.push(...varrer(cheio));
    else if (nome.toLowerCase().endsWith(".pgn")) achados.push(cheio);
  }
  return achados;
}

const encontrados: string[] = [];
for (const pasta of pastas) {
  if (!existsSync(pasta)) {
    console.error(`A pasta de fontes não existe: ${pasta}`);
    process.exit(1);
  }
  encontrados.push(...varrer(pasta));
}
encontrados.sort((a, b) => path.basename(a).localeCompare(path.basename(b), "pt-BR"));

/* ------------------------------------------------------------------ *
 * Ler, medir, escrever
 * ------------------------------------------------------------------ */

const slug = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Medida = {
  entrada: Entrada;
  jogos: number;
  linhas: number;
  contagem: Record<TipoDeAviso, number>;
  problemas: string[];
  perguntas: string[];
  armadilhas: string[];
  escrito: string | null;
  /** Quantos `{comentários}` da fonte sobreviveram no rascunho anotado. */
  comentarios: number;
};

const zerado = (): Record<TipoDeAviso, number> => ({
  "irmao-sem-marca": 0,
  "erro-do-adversario-sem-refutacao": 0,
  "termina-no-adversario": 0,
  "termina-em-pergunta": 0,
  "acima-da-profundidade": 0,
});

const medidas: Medida[] = [];
const foraDoMapa: string[] = [];
const naoEncontrados = new Set(porArquivo.keys());

if (!SO_RELATORIO) {
  mkdirSync(DESTINO, { recursive: true });
  mkdirSync(DESTINO_ANOTADO, { recursive: true });
}

for (const cheio of encontrados) {
  const base = path.basename(cheio);
  const entrada = porArquivo.get(base);
  if (!entrada) {
    foraDoMapa.push(base);
    continue;
  }
  naoEncontrados.delete(base);

  const texto = readFileSync(cheio, "utf8");
  // O relatório é medido no texto ORIGINAL, com a prosa: é ela que diz se a
  // ponta é uma pergunta de homework ou só o fim de uma linha.
  const jogos = lerPgns(texto);

  const contagem = zerado();
  const problemas: string[] = [];
  const perguntas: string[] = [];
  const armadilhas: string[] = [];
  let linhas = 0;

  for (const [i, jogo] of jogos.entries()) {
    const capitulo = jogo.tags.Event ?? jogo.tags.White ?? `jogo ${i + 1}`;
    const expansao = expandir(jogo, {
      abertura: entrada.abertura,
      nome: entrada.nome,
      cor: entrada.cor,
      nivel: entrada.nivel,
      fonte: entrada.fonte,
    });
    linhas += expansao.linhas.length;
    problemas.push(...expansao.problemas.map((p) => `${capitulo}: ${p}`));
    for (const aviso of expansao.avisos as Aviso[]) {
      contagem[aviso.tipo] += 1;
      if (aviso.tipo === "termina-em-pergunta") perguntas.push(aviso.onde);
      if (aviso.tipo === "erro-do-adversario-sem-refutacao") armadilhas.push(aviso.onde);
    }
  }

  // Os dois rascunhos: cabeçalho nosso + os lances de cada jogo, uma vez sem a
  // prosa (o versionado) e uma vez com ela (o anotado, fora do Git).
  const nome = `${slug(path.basename(base, ".pgn"))}.pgn`;
  const destino = path.join(DESTINO, nome);
  let escrito: string | null = null;
  let comentarios = 0;
  if (!SO_RELATORIO) {
    const { pedacos, confere } = recortarJogos(texto, jogos.length);
    if (!confere) {
      problemas.push(
        `o arquivo tem ${jogos.length} jogos para o leitor mas ${pedacos.length} pelo corte ` +
          "no [Event]; o rascunho saiu num bloco só, para separar à mão",
      );
    }
    const montar = (corpo: (pedaco: string) => string): string =>
      pedacos
        .map((pedaco, i) => {
          const jogo = confere ? jogos[i] : jogos[0];
          const capitulo = jogo?.tags.Event ?? jogo?.tags.White ?? `parte ${i + 1}`;
          const cabecalho = [
            `[Abertura "${entrada.abertura}"]`,
            `[Nome "${entrada.nome}"]`,
            `[Cor "${entrada.cor}"]`,
            `[Nivel "${entrada.nivel}"]`,
            `[Fonte "${entrada.fonte}${confere && jogos.length > 1 ? ` — ${capitulo}` : ""}"]`,
            `[Result "*"]`,
          ].join("\n");
          return `${cabecalho}\n\n${embrulhar(corpo(pedaco))}`;
        })
        .join("\n\n");

    // Nunca sobrescreve: o rascunho versionado pode já ter sido revisado à mão.
    if (!existsSync(destino)) {
      writeFileSync(
        destino,
        `${AVISO_DO_RASCUNHO(entrada, nome)}\n${montar(apenasLances)}\n`,
        "utf8",
      );
      escrito = path.relative(RAIZ, destino);
    }

    // O anotado é derivado, não revisado: sai por cima toda vez.
    const anotado = montar(lancesComProsa);
    comentarios = (anotado.match(/\{/g) ?? []).length;
    writeFileSync(
      path.join(DESTINO_ANOTADO, nome),
      `${AVISO_DO_ANOTADO(entrada, nome)}\n${anotado}\n`,
      "utf8",
    );
  }

  medidas.push({
    entrada,
    jogos: jogos.length,
    linhas,
    contagem,
    problemas,
    perguntas,
    armadilhas,
    escrito,
    comentarios,
  });
}

function AVISO_DO_RASCUNHO(entrada: Entrada, nome: string): string {
  return [
    "; RASCUNHO — gerado por `npm run repertorio:importar`. Ainda não é repertório.",
    ";",
    "; O que falta antes de virar content/repertorio/" +
      `${entrada.cor}-${entrada.abertura}.pgn:`,
    ";   1. cortar os ramos que o explorer mostrar como raros;",
    ";   2. fechar toda linha que hoje termina em lance do adversário;",
    ";   3. escrever o comentário do último lance nosso — com as NOSSAS palavras,",
    ";      mas carregando o ARGUMENTO da fonte, que está no arquivo gêmeo:",
    `;      content/repertorio/rascunhos-anotados/${nome} (fora do Git).`,
    ";",
    "; Os lances vieram da fonte (fato com proveniência). A prosa do autor NÃO",
    "; entra no repositório — ela foi descartada aqui, de propósito, porque este",
    "; arquivo é versionado e o repositório é público. Ela não foi jogada fora:",
    "; mora no gêmeo acima, que o `.gitignore` mantém local.",
    "",
  ].join("\n");
}

function AVISO_DO_ANOTADO(entrada: Entrada, nome: string): string {
  return [
    "; RASCUNHO ANOTADO — gerado por `npm run repertorio:importar`. FORA DO GIT.",
    ";",
    `; É o gêmeo, com a prosa da fonte, de:`,
    `;   content/repertorio/rascunhos/${nome}`,
    "; Existe para uma coisa só: quem escreve o comentário de",
    `;   content/repertorio/${entrada.cor}-${entrada.abertura}.pgn`,
    "; precisa do ARGUMENTO do autor na mão, e não de um tabuleiro para olhar",
    "; sozinho.",
    ";",
    "; NÃO copie o texto do autor para o repositório: é curso pago, e a anotação",
    "; é telegráfica de adulto. Leia o porquê, entenda, e escreva com as nossas",
    "; palavras, em português de adolescente de 12 anos — frase curta, sem",
    "; jargão de adulto e sem falar com o aluno como se ele tivesse 8. A turma",
    "; tem de 12 a 15 anos; a régua inteira está na seção 5 do docs/REPERTORIO.md.",
    ";",
    "; Reescrito a cada importação — não edite este arquivo, o seu trabalho some.",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * O relatório
 * ------------------------------------------------------------------ */

const tabela = (linhas: string[][]): string => {
  const largura = linhas[0].map((_, c) => Math.max(...linhas.map((l) => l[c].length)));
  return linhas
    .map((l, i) => {
      const feito = l.map((celula, c) => (c === 0 ? celula.padEnd(largura[c]) : celula.padStart(largura[c])));
      return i === 0
        ? `  ${feito.join("  ")}\n  ${largura.map((w) => "─".repeat(w)).join("  ")}`
        : `  ${feito.join("  ")}`;
    })
    .join("\n");
};

console.log(`\nFontes lidas de:\n${pastas.map((p) => `  ${p}`).join("\n")}\n`);

const cabecalho = ["arquivo", "jogos", "linhas", "no adv.", "pergunta", "armadilha", "s/ marca", "fundo", "ilegal"];
const corpo = medidas.map((m) => [
  m.entrada.arquivo.length > 44 ? `${m.entrada.arquivo.slice(0, 41)}...` : m.entrada.arquivo,
  String(m.jogos),
  String(m.linhas),
  String(m.contagem["termina-no-adversario"]),
  String(m.contagem["termina-em-pergunta"]),
  String(m.contagem["erro-do-adversario-sem-refutacao"]),
  String(m.contagem["irmao-sem-marca"]),
  String(m.contagem["acima-da-profundidade"]),
  String(m.problemas.length),
]);

const soma = (i: number): string =>
  String(corpo.reduce((t, l) => t + Number(l[i]), 0));
corpo.push(["TOTAL", soma(1), soma(2), soma(3), soma(4), soma(5), soma(6), soma(7), soma(8)]);

console.log(tabela([cabecalho, ...corpo]));

console.log(`
  no adv.    linhas que terminam num lance do ADVERSÁRIO — falta a nossa resposta
  pergunta   pontas em que a fonte pergunta ("Do you remember…") em vez de dar o lance
  armadilha  erro DELE marcado ($2/?) sem a punição escrita — material de armadilha por fechar
  s/ marca   irmãos de lance nosso sem marca nenhuma: não viram alternativa aceita, a revisão decide
  fundo      linhas acima da profundidade do nível declarado no fontes.json
  ilegal     SAN que a chess.js recusou (erro de transcrição ou de leitura)`);

const soGrigoryan = medidas.filter((m) => m.entrada.fonte.includes("Grigoryan"));
const total = (ms: Medida[], tipo: TipoDeAviso): number =>
  ms.reduce((t, m) => t + m.contagem[tipo], 0);

console.log(`
Grigoryan (${soGrigoryan.length} arquivos): ${soGrigoryan.reduce((t, m) => t + m.linhas, 0)} linhas, \
${total(soGrigoryan, "termina-no-adversario")} terminam em lance do adversário, \
${total(soGrigoryan, "termina-em-pergunta")} terminam em pergunta de homework.`);

if (foraDoMapa.length > 0) {
  console.log(`\nNa pasta e fora do fontes.json (nada foi feito com eles):`);
  for (const nome of foraDoMapa) console.log(`  ${nome}`);
}
if (naoEncontrados.size > 0) {
  console.log(`\nNo fontes.json e não encontrados na pasta:`);
  for (const nome of naoEncontrados) console.log(`  ${nome}`);
}

const comProblema = medidas.filter((m) => m.problemas.length > 0);
if (comProblema.length > 0) {
  console.log(`\nLances que a chess.js recusou:`);
  for (const m of comProblema) {
    for (const p of m.problemas) console.log(`  ${m.entrada.arquivo}\n    ${p}`);
  }
}

if (SO_RELATORIO) {
  console.log("\n(--relatorio: nenhum rascunho foi escrito.)");
} else {
  const novos = medidas.filter((m) => m.escrito);
  const pulados = medidas.length - novos.length;
  console.log(`\n${novos.length} rascunhos escritos em content/repertorio/rascunhos/.`);
  if (pulados > 0) console.log(`${pulados} já existiam e foram deixados como estão.`);
  const prosa = medidas.reduce((t, m) => t + m.comentarios, 0);
  console.log(
    `${medidas.length} rascunhos anotados reescritos em content/repertorio/rascunhos-anotados/ ` +
      `(fora do Git), com ${prosa} comentários da fonte.`,
  );
}

// Um SAN ilegal é erro de transcrição ou de leitura, e tem de aparecer como
// falha — mas só depois de o relatório inteiro sair, para não esconder o resto.
process.exitCode = comProblema.length > 0 ? 1 : 0;
