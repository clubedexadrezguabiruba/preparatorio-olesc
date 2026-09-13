import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { conflito, escreverAtomico, lerConteudo, type Conteudo } from "../../editor/rascunhos.ts";

/**
 * O rascunho de um arquivo do repertório: **PGN**, em `.editor/repertorio/<arquivo>.pgn`.
 *
 * §15 do plano final proíbe uma segunda fonte JSON autoral para as mesmas linhas. O
 * rascunho é o próprio texto do `.pgn` com a edição aplicada — o mesmo formato da fonte,
 * fora de `content/` até alguém aplicar. Fica em `.editor/`, que não vai para o Git: o
 * que o aluno recebe só muda com **Aplicar**.
 *
 * As promessas são as do rascunho de aula (`lib/editor/rascunhos.ts`): escrita atômica e
 * `baseHash`. Uma aba que decidiu sobre bytes que não estão mais em disco não grava por
 * cima; recebe o conflito.
 */

/** `brancas-alapin`: a cor e o slug da abertura, que também é o nome do `.pgn`. */
export const ARQUIVO_DO_REPERTORIO = /^(brancas|pretas)-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ehArquivoDoRepertorio = (arquivo: string): boolean => ARQUIVO_DO_REPERTORIO.test(arquivo);

function exigirArquivo(arquivo: string): void {
  // A guarda vem antes de montar qualquer caminho: um `..` aqui escreveria fora da pasta.
  if (!ehArquivoDoRepertorio(arquivo)) throw new Error(`arquivo do repertório inválido: ${JSON.stringify(arquivo)}`);
}

export function caminhoDaFonte(arquivo: string, raiz = process.cwd()): string {
  exigirArquivo(arquivo);
  return path.join(raiz, "content", "repertorio", `${arquivo}.pgn`);
}

export function caminhoDoRascunhoDoRepertorio(arquivo: string, raiz = process.cwd()): string {
  exigirArquivo(arquivo);
  return path.join(raiz, ".editor", "repertorio", `${arquivo}.pgn`);
}

export type AberturaDoArquivo = {
  /** O texto que a tela edita: o rascunho, se há um; senão a fonte. */
  texto: string;
  /** O hash desse texto — o `baseHash` do próximo salvamento. */
  hash: string;
  origem: "rascunho" | "fonte";
  /** A fonte publicada hoje, para o impacto e para "Descartar rascunho". `null` na abertura nova. */
  fonte: Conteudo | null;
};

export function abrirArquivoDoRepertorio(arquivo: string, raiz = process.cwd()): AberturaDoArquivo | null {
  const fonte = lerConteudo(caminhoDaFonte(arquivo, raiz));
  const rascunho = lerConteudo(caminhoDoRascunhoDoRepertorio(arquivo, raiz));
  if (rascunho) return { texto: rascunho.texto, hash: rascunho.hash, origem: "rascunho", fonte };
  if (fonte) return { texto: fonte.texto, hash: fonte.hash, origem: "fonte", fonte };
  return null;
}

export type GravacaoDoRascunho =
  | { ok: true; hash: string }
  | { ok: false; conflito: { hashAtual: string | null; textoAtual: string | null } };

/**
 * Grava o rascunho se o disco ainda é o que a tela abriu.
 *
 * O "disco" é o rascunho, se existe; senão a fonte — a primeira edição de um arquivo sem
 * rascunho parte da fonte, e o `baseHash` dela é o hash da fonte.
 */
export function gravarRascunhoDoRepertorio(arquivo: string, texto: string, baseHash: string | null, raiz = process.cwd()): GravacaoDoRascunho {
  const aberto = abrirArquivoDoRepertorio(arquivo, raiz);
  const atual = aberto ? { texto: aberto.texto, hash: aberto.hash } : null;
  const briga = conflito(atual, baseHash);
  if (briga) return { ok: false, conflito: briga };
  const destino = caminhoDoRascunhoDoRepertorio(arquivo, raiz);
  escreverAtomico(destino, texto);
  return { ok: true, hash: lerConteudo(destino)!.hash };
}

export function apagarRascunhoDoRepertorio(arquivo: string, raiz = process.cwd()): void {
  rmSync(caminhoDoRascunhoDoRepertorio(arquivo, raiz), { force: true });
}

/** Os arquivos com rascunho guardado — a tela da lista marca "rascunho" neles. */
export function arquivosComRascunho(raiz = process.cwd()): string[] {
  const pasta = path.join(raiz, ".editor", "repertorio");
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith(".pgn"))
    .map((nome) => nome.slice(0, -4))
    .filter(ehArquivoDoRepertorio)
    .sort();
}
