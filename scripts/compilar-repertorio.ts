/**
 * Dos PGN revisados para o JSON que o celular baixa.
 *
 * Uso:
 *   node scripts/compilar-repertorio.ts            escreve public/repertorio/
 *   node scripts/compilar-repertorio.ts --check    só confere; sai com erro se algo falha
 *
 * **Um script, não dois.** O plano previa `compilar` e `validar` separados;
 * são o mesmo caminho com uma escrita no fim, e duas cópias divergiriam no dia
 * em que alguém corrigisse só uma.
 *
 * ## O que ele lê
 *
 * `content/repertorio/<cor>-<abertura>.pgn` — os arquivos **revisados à mão**.
 * A pasta `rascunhos/` fica de fora de propósito: rascunho é fonte importada
 * sem revisão, com prosa cortada e sem comentário nosso, e publicar isso seria
 * publicar o curso do outro. Enquanto não houver nenhum arquivo revisado, o
 * script diz isso e sai em paz — é o estado honesto no fim do B2.
 *
 * ## Por que JSON em `public/`
 *
 * O mesmo motivo dos puzzles: o celular baixa o arquivo e o servidor lê os
 * mesmos bytes. Nada de o treinador reexpandir árvore de PGN a cada aluno.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { RAIZ } from "./env-local.ts";
import { expandir } from "../lib/repertorio/arvore.ts";
import { notas } from "../lib/repertorio/conteudo.ts";
import { lerPgns } from "../lib/repertorio/pgn.ts";
import {
  aberturasInchadas,
  CORES,
  NIVEIS,
  validarBanco,
  type Cor,
  type EntradaDoIndice,
  type Linha,
  type Nivel,
} from "../lib/repertorio/linhas.ts";

const SO_CONFERIR = process.argv.includes("--check");
const ORIGEM = path.join(RAIZ, "content", "repertorio");
const DESTINO = path.join(RAIZ, "public", "repertorio");

const arquivos = existsSync(ORIGEM)
  ? readdirSync(ORIGEM)
      .filter((n) => n.toLowerCase().endsWith(".pgn"))
      .sort()
  : [];

if (arquivos.length === 0) {
  console.log(
    "Nenhum PGN revisado em content/repertorio/.\n" +
      "Os rascunhos em content/repertorio/rascunhos/ ainda não são repertório: falta\n" +
      "cortar os ramos raros, fechar as linhas que param no lance do adversário e\n" +
      "escrever o comentário do último lance. Isso é o B3–B5.",
  );
  process.exit(0);
}

const problemas: string[] = [];
const avisos: string[] = [];
const porArquivo = new Map<string, Linha[]>();

for (const nome of arquivos) {
  const texto = readFileSync(path.join(ORIGEM, nome), "utf8");
  const onde = `content/repertorio/${nome}`;

  // Parênteses sem fechar: o leitor não acusa — ele fecha tudo no fim do texto
  // e a árvore sai torta, com ramos pendurados no lugar errado. Contar antes é
  // barato e transforma um bug silencioso numa mensagem.
  const abre = (texto.match(/\(/g) ?? []).length;
  const fecha = (texto.match(/\)/g) ?? []).length;
  if (abre !== fecha) {
    problemas.push(`${onde}: ${abre} parênteses abertos e ${fecha} fechados.`);
    continue;
  }

  const linhas: Linha[] = [];
  for (const [i, jogo] of lerPgns(texto).entries()) {
    const emQual = `${onde} (jogo ${i + 1})`;
    const cor = jogo.tags.Cor as Cor | undefined;
    const nivel = jogo.tags.Nivel as Nivel | undefined;
    const { Abertura: abertura, Nome: nomeDaArvore, Fonte: fonte } = jogo.tags;

    const faltando = [
      !abertura && "Abertura",
      !nomeDaArvore && "Nome",
      !cor && "Cor",
      !nivel && "Nivel",
      !fonte && "Fonte",
    ].filter(Boolean);
    if (faltando.length > 0) {
      problemas.push(`${emQual}: faltam as tags ${faltando.join(", ")}.`);
      continue;
    }
    if (!CORES.includes(cor!)) {
      problemas.push(`${emQual}: [Cor "${cor}"] — tem de ser brancas ou pretas.`);
      continue;
    }
    if (!NIVEIS.includes(nivel!)) {
      problemas.push(`${emQual}: [Nivel "${nivel}"] — tem de ser base ou avancado.`);
      continue;
    }

    const expansao = expandir(jogo, {
      abertura: abertura!,
      nome: nomeDaArvore!,
      cor: cor!,
      nivel: nivel!,
      fonte: fonte!,
    });
    problemas.push(...expansao.problemas.map((p) => `${emQual}: ${p}`));
    for (const aviso of expansao.avisos) {
      // Os avisos do rascunho viram erro aqui: no PGN revisado, uma linha que
      // termina no lance do adversário é trabalho que ficou por fazer.
      if (aviso.tipo === "irmao-sem-marca") avisos.push(`${emQual}: ${aviso.detalhe}`);
    }
    linhas.push(...expansao.linhas);
  }
  porArquivo.set(nome, linhas);
}

const todas = [...porArquivo.values()].flat();

if (problemas.length === 0) {
  try {
    validarBanco(todas, "content/repertorio/");
  } catch (erro) {
    problemas.push(String(erro instanceof Error ? erro.message : erro));
  }
}

avisos.push(...aberturasInchadas(todas).map((a) => `acima da meta do Base — ${a}`));

/* ------------------------------------------------------------------ *
 * O campo `abertura` das páginas de princípios aponta para abertura viva
 *
 * Uma nota com `abertura: "escocesa"` faz a página da Escocesa mostrar o link
 * para ela. Se o slug estiver errado — ou se a abertura sair do repertório num
 * corte futuro —, o link simplesmente **não aparece**: a página não quebra,
 * ninguém vê erro nenhum, e a nota volta a ser invisível fora do rodapé de
 * `/aberturas`. Foi exatamente esse silêncio que a §23 de 7/9/2026 veio
 * consertar, então ele não pode voltar por descuido de slug.
 *
 * É aqui e não no `validate:content` porque o par `cor`+`abertura` só existe
 * depois de compilar: é este script que decide quais aberturas há. E é ANTES do
 * `--check` para o gate valer também quando nada é escrito.
 * ------------------------------------------------------------------ */
const aberturasVivas = new Set(todas.map((l) => `${l.cor}/${l.abertura}`));
for (const nota of notas()) {
  if (nota.abertura && !aberturasVivas.has(`${nota.cor}/${nota.abertura}`)) {
    problemas.push(
      `a página de princípios "${nota.slug}" aponta para ${nota.cor}/${nota.abertura}, ` +
        "que não é abertura do repertório. O link para ela sumiria calado da tela da abertura.",
    );
  }
}

for (const aviso of avisos) console.log(`  aviso: ${aviso}`);

if (problemas.length > 0) {
  console.error(`\n${problemas.length} problema(s):\n`);
  for (const p of problemas) console.error(`  ${p}`);
  process.exit(1);
}

const resumo = [...porArquivo].map(([nome, linhas]) => {
  const base = linhas.filter((l) => l.nivel === "base").length;
  return `  ${nome}: ${linhas.length} linhas (${base} base, ${linhas.length - base} avançado)`;
});
console.log(`\n${todas.length} linhas em ${arquivos.length} arquivos:\n${resumo.join("\n")}`);

if (SO_CONFERIR) {
  console.log("\n(--check: nada foi escrito.)");
  process.exit(0);
}

rmSync(DESTINO, { recursive: true, force: true });
const indice: EntradaDoIndice[] = [];

const grupos = new Map<string, Linha[]>();
for (const linha of todas) {
  const chave = `${linha.cor}/${linha.abertura}`;
  grupos.set(chave, [...(grupos.get(chave) ?? []), linha]);
}

for (const [chave, linhas] of [...grupos].sort()) {
  const destino = path.join(DESTINO, `${chave}.json`);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, `${JSON.stringify(linhas, null, 2)}\n`, "utf8");
  indice.push({
    cor: linhas[0].cor,
    abertura: linhas[0].abertura,
    nome: linhas[0].nome.split(" — ")[0],
    linhas: linhas.length,
    ids: linhas.map((l) => l.id) as [string, ...string[]],
    // O `nivel` de cada linha só chega à tela por aqui: o índice é o único
    // arquivo que `/aberturas` abre, e sem esta lista marcar uma linha como
    // `avancado` não a esconde de ninguém. Ver o schema em `lib/repertorio/linhas.ts`.
    idsAvancado: linhas.filter((l) => l.nivel === "avancado").map((l) => l.id),
    arquivo: `/repertorio/${chave}.json`,
  });
}

writeFileSync(path.join(DESTINO, "index.json"), `${JSON.stringify(indice, null, 2)}\n`, "utf8");
console.log(`\nEscrito em public/repertorio/: ${indice.length} aberturas + index.json`);
